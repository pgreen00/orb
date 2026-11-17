import { closestIn, hasContent, isElement, isolate, selectedTextNodes, spanOf, splitAround, unwrapAround, wrapEach } from "./dom";
import { CLEARABLE_TAGS, InlineStyleProp, markTag, tagsOf } from "./schema";

/** The marks toggled from the toolbar and shortcuts */
export type MarkName = "bold" | "italic" | "underline" | "strike";

/** What pending formats are keyed by: a mark, or `style:` and a style property */
export type FormatKey = MarkName | `style:${InlineStyleProp}`;
/** Whether a mark is on, or a style's value. Null removes the style. */
export type FormatValue = boolean | string | null;

const STYLE_PREFIX = "style:";
const isStyleKey = (key: FormatKey): key is `style:${InlineStyleProp}` => key.startsWith(STYLE_PREFIX);
const styleOfKey = (key: FormatKey) => key.slice(STYLE_PREFIX.length) as InlineStyleProp;

export function isMarkActive(root: HTMLElement, range: Range, name: MarkName) {
  const tags = tagsOf(name);
  if (range.collapsed) return !!closestIn(range.startContainer, root, tags);
  const nodes = selectedTextNodes(root, range);
  return nodes.length > 0 && nodes.every((node) => closestIn(node, root, tags));
}

/** Adds the mark to the selection, or removes it if it's all marked. */
export function toggleMark(root: HTMLElement, range: Range, name: MarkName): Range {
  const tags = tagsOf(name);
  const split = splitAround(range);
  const nodes = selectedTextNodes(root, split);
  if (!nodes.length) return split;
  if (nodes.every((node) => closestIn(node, root, tags))) {
    removeTags(root, nodes, tags);
  } else {
    wrapEach(
      nodes.filter((node) => !closestIn(node, root, tags)),
      () => document.createElement(markTag(name)),
    );
  }
  return spanOf(nodes);
}

/**
 * Formats turned on or off with a collapsed caret. They apply to the next
 * text typed there, and are dropped as soon as the caret moves.
 */
export class PendingFormats {
  private marks = new Map<FormatKey, FormatValue>();
  private at: { node: Node; offset: number } | null = null;

  get size() {
    return this.marks.size;
  }

  formats() {
    return this.marks;
  }

  get(name: FormatKey): FormatValue | undefined {
    return this.marks.get(name);
  }

  set(name: FormatKey, value: FormatValue, range: Range) {
    this.marks.set(name, value);
    this.at = { node: range.startContainer, offset: range.startOffset };
  }

  /** Drops the formats once the caret has moved away from where they were set */
  sync(range: Range) {
    const moved =
      !range.collapsed || range.startContainer !== this.at?.node || range.startOffset !== this.at?.offset;
    if (this.marks.size && moved) this.clear();
  }

  clear() {
    this.marks.clear();
    this.at = null;
  }
}

/**
 * Inserts text at a collapsed range with formats turned on or off, for text
 * typed after pressing a format button with nothing selected.
 */
export function insertFormattedText(
  root: HTMLElement,
  range: Range,
  text: string,
  formats: Map<FormatKey, FormatValue>,
): Range {
  range.deleteContents();
  let at = range;
  for (const [key, value] of formats) {
    if (value !== true) at = splitOut(at, finderOf(root, key));
  }
  // Like the browser, a space at either end of the new text is non-breaking,
  // so it isn't collapsed and the caret stays inside the formatting.
  const textNode = document.createTextNode(text.replace(/^ | $/g, "\u00a0"));
  let node: Node = textNode;
  for (const [key, value] of formats) {
    if (isStyleKey(key)) {
      if (typeof value !== "string") continue;
      const span = styledSpan(styleOfKey(key), value);
      span.append(node);
      node = span;
    } else if (value === true && !closestIn(at.startContainer, root, tagsOf(key))) {
      const wrapper = document.createElement(markTag(key));
      wrapper.append(node);
      node = wrapper;
    }
  }
  at.insertNode(node);
  const caret = document.createRange();
  caret.setStart(textNode, textNode.length);
  return caret;
}

function removeTags(root: HTMLElement, nodes: Text[], tags: string[]) {
  for (const node of nodes) {
    let el: HTMLElement | null;
    while ((el = closestIn(node, root, tags))) unwrapAround(el, node);
  }
}

/** The element a format is kept in, found from a node. Marks are found by tag, styles by property. */
function finderOf(root: HTMLElement, key: FormatKey): (node: Node) => HTMLElement | null {
  if (isStyleKey(key)) return (node) => closestStyled(node, root, styleOfKey(key));
  return (node) => closestIn(node, root, tagsOf(key));
}

/** Splits the elements `find` returns around a collapsed range, leaving it between the halves. */
function splitOut(range: Range, find: (node: Node) => HTMLElement | null): Range {
  let at = range;
  let el: HTMLElement | null;
  while ((el = find(at.startContainer))) {
    const tail = document.createRange();
    tail.setStart(at.startContainer, at.startOffset);
    tail.setEnd(el, el.childNodes.length);
    const after = el.cloneNode(false) as HTMLElement;
    after.append(tail.extractContents());
    el.after(after);
    const parent = el.parentNode!;
    let index = Array.prototype.indexOf.call(parent.childNodes, el) + 1;
    if (!hasContent(after)) after.remove();
    if (!hasContent(el)) {
      el.remove();
      index--;
    }
    at = document.createRange();
    at.setStart(parent, index);
  }
  return at;
}

/** Removes inline formatting, but not links, from the selection. */
export function clearFormatting(root: HTMLElement, range: Range): Range {
  const split = splitAround(range);
  const nodes = selectedTextNodes(root, split);
  if (!nodes.length) return split;
  removeTags(root, nodes, CLEARABLE_TAGS);
  return spanOf(nodes);
}

/** The link around a caret or in a selection, if any */
export function closestLink(root: HTMLElement, range: Range): HTMLAnchorElement | null {
  return closestIn(range.startContainer, root, ["A"]) as HTMLAnchorElement | null;
}

/** Turns the selected text into a link, replacing links already in it. */
export function insertLink(root: HTMLElement, range: Range, href: string): Range {
  const split = splitAround(range);
  const nodes = selectedTextNodes(root, split);
  if (!nodes.length) return split;
  removeTags(root, nodes, ["A"]);
  wrapEach(nodes, () => {
    const link = document.createElement("a");
    link.href = href;
    return link;
  });
  return spanOf(nodes);
}

/** Removes the link from the selected text, keeping the text. */
export function removeLink(root: HTMLElement, range: Range): Range {
  const split = splitAround(range);
  const nodes = selectedTextNodes(root, split);
  if (!nodes.length) return split;
  removeTags(root, nodes, ["A"]);
  return spanOf(nodes);
}

/** Removes a piece, such as a selected image, and puts the caret where it was. */
export function removePiece(piece: Element): Range {
  const parent = piece.parentNode!;
  const index = Array.prototype.indexOf.call(parent.childNodes, piece);
  piece.remove();
  const caret = document.createRange();
  caret.setStart(parent, index);
  caret.collapse(true);
  return caret;
}

/** Replaces the selection with `node` and puts the caret after it. */
export function insertNodeAt(range: Range, node: Node): Range {
  range.deleteContents();
  range.insertNode(node);
  const caret = document.createRange();
  caret.setStartAfter(node);
  return caret;
}

/** A span that sets one style */
export function styledSpan(prop: InlineStyleProp, value: string): HTMLElement {
  const span = document.createElement("span");
  span.style.setProperty(prop, value);
  return span;
}

/** The closest span inside `root` that sets `prop` */
export function closestStyled(node: Node, root: HTMLElement, prop: InlineStyleProp): HTMLElement | null {
  for (let n: Node | null = node; n && n !== root; n = n.parentNode) {
    if (isElement(n) && n.tagName === "SPAN" && (n as HTMLElement).style.getPropertyValue(prop)) {
      return n as HTMLElement;
    }
  }
  return null;
}

/**
 * Sets a style on the selected text, or removes it when `value` is null. The
 * other styles on that text stay.
 */
export function setInlineStyle(root: HTMLElement, range: Range, prop: InlineStyleProp, value: string | null): Range {
  const split = splitAround(range);
  const nodes = selectedTextNodes(root, split);
  if (!nodes.length) return split;
  for (const node of nodes) {
    let span: HTMLElement | null;
    while ((span = closestStyled(node, root, prop))) {
      const own = isolate(span, node);
      own.style.removeProperty(prop);
      if (!own.getAttribute("style")) own.replaceWith(...Array.from(own.childNodes));
    }
  }
  if (value) {
    // A span holding only this text takes the style itself, rather than nesting another span
    const wrapped = nodes.filter((node) => {
      const parent = node.parentElement;
      if (parent?.tagName !== "SPAN" || parent.childNodes.length !== 1) return true;
      parent.style.setProperty(prop, value);
      return false;
    });
    wrapEach(wrapped, () => styledSpan(prop, value));
  }
  return spanOf(nodes);
}

/**
 * A style's value across the selection: "" where it isn't set, or null when
 * the selection has several values. A collapsed caret reads the text around it.
 */
export function inlineStyleValue(root: HTMLElement, range: Range, prop: InlineStyleProp): string | null {
  const targets: Node[] = range.collapsed ? [range.startContainer] : selectedTextNodes(root, range);
  if (!targets.length) return "";
  const values = new Set(targets.map((node) => closestStyled(node, root, prop)?.style.getPropertyValue(prop) ?? ""));
  return values.size === 1 ? [...values][0] : null;
}
