import { isBlock } from "./dom";
import { specOf, STYLE_CHECKS, StyleProp } from "./schema";

/** Elements removed with their content, rather than unwrapped. */
const REMOVED_TAGS =
  "script, style, meta, link, title, head, iframe, frame, object, embed, template, noscript, svg, math, form, button, select, textarea";

/** Spaces, tabs and line breaks. Non-breaking spaces stay, since they're kept on purpose. */
const COLLAPSIBLE = /[ \t\r\n\f]+/g;

/**
 * Parses HTML from outside the editor, such as pasted, imported or set from
 * code, and keeps only what the schema allows. The HTML is parsed in an inert
 * document, so nothing in it runs or loads while it's cleaned.
 */
export function sanitize(html: string): DocumentFragment {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const body = doc.body;
  body.querySelectorAll(REMOVED_TAGS).forEach((el) => el.remove());

  const comments = doc.createTreeWalker(body, NodeFilter.SHOW_COMMENT);
  const commentNodes: Node[] = [];
  while (comments.nextNode()) commentNodes.push(comments.currentNode);
  commentNodes.forEach((comment) => comment.parentNode?.removeChild(comment));

  // Word's <o:p> markers only hold spacing.
  Array.from(body.querySelectorAll("*"))
    .filter((el) => el.tagName === "O:P")
    .forEach((el) => el.remove());
  // Google Docs wraps what it copies in a bold element, which would make all of it bold.
  body
    .querySelectorAll('b[id^="docs-internal-guid"]')
    .forEach((el) => el.replaceWith(...Array.from(el.childNodes)));
  rebuildWordLists(body);
  // Bold, italic, underline and strikethrough set by style become the tags they mean,
  // before the styles are dropped.
  body.querySelectorAll<HTMLElement>("[style]").forEach(styleToTags);

  cleanTree(body);
  collapseWhitespace(body);
  const fragment = document.createDocumentFragment();
  fragment.append(...Array.from(body.childNodes));
  return fragment;
}

/** Attributes the editor adds while it runs. They're kept when the editor's own content is cleaned, and never when outside HTML is. */
const RUNTIME_ATTRS = ["contenteditable", "data-orb-trailing", "data-orb-break", "data-selected", "tabindex"];

/** Cleans every element under `root`, deepest first, so an element is renamed or unwrapped after its children. */
export function cleanTree(root: ParentNode, replaced = new Map<Node, Node>(), runtime = false) {
  for (const el of Array.from(root.querySelectorAll("*")).reverse()) cleanElement(el, replaced, runtime);
}

/**
 * Replaces an element with its canonical tag, keeping only the attributes and
 * styles the schema allows. Elements the schema doesn't know are unwrapped.
 */
export function cleanElement(el: Element, replaced = new Map<Node, Node>(), runtime = false) {
  const spec = specOf(el);
  if (!spec) {
    el.replaceWith(...Array.from(el.childNodes));
    return;
  }
  // Such as a task checkbox outside a list item, which has nothing to belong to.
  if (spec.parents && !spec.parents.includes(el.parentElement?.tagName ?? "")) {
    el.remove();
    return;
  }
  const next = el.ownerDocument.createElement(spec.tag);
  for (const [name, check] of Object.entries(spec.attrs ?? {})) {
    const value = el.getAttribute(name);
    const clean = value === null ? null : check(value);
    if (clean !== null) next.setAttribute(name, clean);
  }
  const style = keptStyle(el, spec.styles ?? []);
  // A span with nothing left to style is only wrapping text
  if (spec.kind === "style" && !style) {
    el.replaceWith(...Array.from(el.childNodes));
    return;
  }
  if (style) next.setAttribute("style", style);
  if (runtime) {
    for (const name of RUNTIME_ATTRS) {
      const value = el.getAttribute(name);
      if (value !== null) next.setAttribute(name, value);
    }
  }
  // An image without a usable source has nothing to show.
  if (spec.tag === "IMG" && !next.hasAttribute("src")) {
    el.remove();
    return;
  }
  next.append(...Array.from(el.childNodes));
  el.replaceWith(next);
  replaced.set(el, next);
}

/** Pasted text as text nodes, with line breaks as `<br>`, so it's never read as HTML. */
export function textToFragment(text: string): DocumentFragment {
  const fragment = document.createDocumentFragment();
  text.replace(/\r\n?/g, "\n").split("\n").forEach((line, i) => {
    if (i > 0) fragment.append(document.createElement("br"));
    if (line) fragment.append(document.createTextNode(line));
  });
  return fragment;
}

/** The inline `style` declarations of an element. Property names are lowercased, and values keep their case, since font names are saved as typed. */
function declarations(el: Element): Map<string, string> {
  const map = new Map<string, string>();
  for (const part of (el.getAttribute("style") ?? "").split(";")) {
    const colon = part.indexOf(":");
    if (colon < 0) continue;
    map.set(part.slice(0, colon).trim().toLowerCase(), part.slice(colon + 1).trim());
  }
  return map;
}

function keptStyle(el: Element, props: StyleProp[]): string | null {
  const style = declarations(el);
  const kept = props.flatMap((prop) => {
    const value = style.get(prop);
    const clean = value ? STYLE_CHECKS[prop](value) : null;
    return clean ? [`${prop}: ${clean}`] : [];
  });
  return kept.length ? kept.join("; ") : null;
}

/**
 * Word writes each list item as a paragraph with an `mso-list` style, and a
 * marker such as "1." or "o" in a span. Items become real lists, nested by
 * level. A marker that starts with a number or letter makes an ordered list.
 */
function rebuildWordLists(body: HTMLElement) {
  const doc = body.ownerDocument;
  const items = Array.from(body.querySelectorAll<HTMLElement>("p")).filter((p) =>
    /mso-list:\s*l\d/i.test(p.getAttribute("style") ?? ""),
  );
  // Found before anything moves, so a list starts after any element that isn't an item
  const starts = new Set(items.filter((p) => !items.includes(p.previousElementSibling as HTMLElement)));
  const stack: { list: HTMLElement; level: number; type: string }[] = [];

  for (const p of items) {
    const level = Number(/level(\d+)/i.exec(p.getAttribute("style") ?? "")?.[1] ?? 1);
    const marker = p.querySelector<HTMLElement>(':scope > span[style*="mso-list:ignore" i]');
    const type = /^\s*\(?[0-9a-z]+[.)]/i.test(marker?.textContent ?? "") ? "ol" : "ul";
    marker?.remove();

    if (starts.has(p)) stack.length = 0;
    while (stack.length && stack[stack.length - 1].level > level) stack.pop();
    const top = stack[stack.length - 1];
    if (top?.level === level && top.type !== type) {
      // Same level, different kind of marker: a new list next to the old one
      stack.pop();
      const sibling = doc.createElement(type);
      top.list.after(sibling);
      stack.push({ list: sibling, level, type });
    } else if (!top || top.level < level) {
      // A deeper level goes inside the item above it
      const list = doc.createElement(type);
      if (top) top.list.lastElementChild!.append(list);
      else p.before(list);
      stack.push({ list, level, type });
    }

    const item = doc.createElement("li");
    const align = p.style.textAlign;
    item.append(...Array.from(p.childNodes));
    if (align) item.style.textAlign = align;
    stack[stack.length - 1].list.append(item);
    p.remove();
  }
}

/** Word and Google Docs mark formats with styles, not tags. Wraps the content in the tags they mean. */
function styleToTags(el: HTMLElement) {
  const style = declarations(el);
  const weight = style.get("font-weight")?.toLowerCase();
  const decoration = `${style.get("text-decoration") ?? ""} ${style.get("text-decoration-line") ?? ""}`.toLowerCase();
  const tags: string[] = [];
  if (weight === "bold" || Number(weight) >= 600) tags.push("STRONG");
  if (style.get("font-style")?.toLowerCase() === "italic") tags.push("EM");
  if (decoration.includes("underline")) tags.push("U");
  if (decoration.includes("line-through")) tags.push("S");
  for (const tag of tags) {
    const wrapper = el.ownerDocument.createElement(tag);
    wrapper.append(...Array.from(el.childNodes));
    el.append(wrapper);
  }
}

/** Collapses runs of spaces in text, except in preformatted blocks, and drops spaces between blocks. */
function collapseWhitespace(body: HTMLElement) {
  const walker = body.ownerDocument.createTreeWalker(body, NodeFilter.SHOW_TEXT);
  const texts: Text[] = [];
  while (walker.nextNode()) texts.push(walker.currentNode as Text);
  for (const text of texts) {
    if (text.parentElement?.closest("pre")) continue;
    text.data = text.data.replace(COLLAPSIBLE, " ");
    const { previousSibling: prev, nextSibling: next } = text;
    if (text.data === " " && (!prev || isBlock(prev)) && (!next || isBlock(next))) text.remove();
  }
}
