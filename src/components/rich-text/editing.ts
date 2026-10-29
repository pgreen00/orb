/**
 * DOM editing for `orb-rich-text`, built on standard APIs instead of the
 * deprecated `document.execCommand`. Selections are read with
 * `getComposedRanges`, so they work inside the shadow root in every browser.
 *
 * Operations take a `Range` and return the `Range` to select afterwards.
 * Elements get moved and replaced, so boundaries are saved before a change
 * and put back after, rather than relying on live ranges.
 */

export type InlineFormat = "strong" | "em" | "u" | "s";
export type BlockType = "p" | "h1" | "h2";
export type ListType = "ol" | "ul";
export type Alignment = "left" | "center" | "right" | "justify";

/** Tags that count as each format, so pasted `<b>` reads as bold. */
const INLINE_TAGS: Record<InlineFormat, string[]> = {
  strong: ["STRONG", "B"],
  em: ["EM", "I"],
  u: ["U", "INS"],
  s: ["S", "STRIKE", "DEL"],
};

/** Inline tags removed by Clear formatting. Links are kept. */
const FORMATTING_TAGS = [
  ...Object.values(INLINE_TAGS).flat(),
  "FONT", "SPAN", "MARK", "SUB", "SUP", "SMALL", "BIG",
];

const BLOCK_TAGS = new Set([
  "P", "DIV", "H1", "H2", "H3", "H4", "H5", "H6", "LI", "UL", "OL",
  "BLOCKQUOTE", "PRE", "HR", "TABLE",
]);

/** Blocks that hold text directly, as opposed to containers like lists. */
const TEXT_BLOCKS = "p, div, h1, h2, h3, h4, h5, h6, li, blockquote, pre";

const SAFE_LINK_PROTOCOLS = ["http:", "https:", "mailto:", "tel:"];

// Selection

/** The selection in `root`, or null when it's somewhere else. */
export function getRange(root: HTMLElement): Range | null {
  const selection = window.getSelection();
  if (!selection) return null;
  const shadowRoot = root.getRootNode();
  const [composed]: StaticRange[] = (selection as any).getComposedRanges({
    shadowRoots: shadowRoot instanceof ShadowRoot ? [shadowRoot] : [],
  });
  if (!composed || !root.contains(composed.startContainer) || !root.contains(composed.endContainer)) {
    return null;
  }
  // A static range isn't updated when content changes, so it can point past
  // the end of a node that was just replaced.
  if (composed.startOffset > length(composed.startContainer) || composed.endOffset > length(composed.endContainer)) {
    return null;
  }
  const range = document.createRange();
  range.setStart(composed.startContainer, composed.startOffset);
  range.setEnd(composed.endContainer, composed.endOffset);
  return range;
}

/**
 * Selects `range`. With `redraw`, the selection is cleared first: Safari only
 * redraws the caret when the selection changes, so after a layout change,
 * such as a new alignment, it would stay in the old spot. Don't redraw while
 * typing, since clearing the selection there loses the typed text.
 */
export function selectRange(range: Range, { redraw = false } = {}) {
  const selection = window.getSelection();
  if (!selection) return;
  if (redraw) selection.removeAllRanges();
  selection.setBaseAndExtent(
    range.startContainer,
    range.startOffset,
    range.endContainer,
    range.endOffset,
  );
}

interface Boundaries {
  sc: Node;
  so: number;
  ec: Node;
  eo: number;
}

function keep(range: Range): Boundaries {
  return { sc: range.startContainer, so: range.startOffset, ec: range.endContainer, eo: range.endOffset };
}

/**
 * Rebuilds a saved range. `replaced` maps elements that were swapped for new
 * ones, such as a `<p>` renamed to `<h1>`.
 */
function restore(b: Boundaries, root: HTMLElement, replaced = new Map<Node, Node>()): Range | null {
  const sc = replaced.get(b.sc) ?? b.sc;
  const ec = replaced.get(b.ec) ?? b.ec;
  if (!root.contains(sc) || !root.contains(ec)) return null;
  try {
    const range = document.createRange();
    range.setStart(sc, Math.min(b.so, length(sc)));
    range.setEnd(ec, Math.min(b.eo, length(ec)));
    return range;
  } catch {
    return null;
  }
}

function length(node: Node) {
  return node.nodeType === Node.TEXT_NODE ? (node as Text).length : node.childNodes.length;
}

// Helpers

const isBlank = (text: string) => !/\S/.test(text);

function isBlock(node: Node): node is HTMLElement {
  return node.nodeType === Node.ELEMENT_NODE && BLOCK_TAGS.has((node as Element).tagName);
}

/** The closest ancestor of `node` with one of `tags`, inside `root`. */
function closestIn(node: Node, root: HTMLElement, tags: string[]): HTMLElement | null {
  for (let n: Node | null = node; n && n !== root; n = n.parentNode) {
    if (n.nodeType === Node.ELEMENT_NODE && tags.includes((n as Element).tagName)) return n as HTMLElement;
  }
  return null;
}

function hasContent(node: Node) {
  if (node.textContent) return true;
  return node instanceof Element || node instanceof DocumentFragment
    ? !!node.querySelector("img, br, hr")
    : false;
}

function rename(el: HTMLElement, tag: string, replaced: Map<Node, Node>) {
  const next = document.createElement(tag);
  for (const attr of Array.from(el.attributes)) next.setAttribute(attr.name, attr.value);
  next.append(...Array.from(el.childNodes));
  el.replaceWith(next);
  replaced.set(el, next);
  return next;
}

/** Splits text nodes at the range's ends, so whole nodes are selected. */
function splitBoundaries(range: Range): Range {
  let { startContainer: sc, startOffset: so, endContainer: ec, endOffset: eo } = range;
  if (ec.nodeType === Node.TEXT_NODE && eo > 0 && eo < (ec as Text).length) {
    (ec as Text).splitText(eo);
  }
  if (sc.nodeType === Node.TEXT_NODE && so > 0 && so < (sc as Text).length) {
    const rest = (sc as Text).splitText(so);
    if (ec === sc) {
      ec = rest;
      eo -= so;
    }
    sc = rest;
    so = 0;
  }
  const split = document.createRange();
  split.setStart(sc, so);
  split.setEnd(ec, eo);
  return split;
}

/** Text nodes with visible text inside the range, in document order. */
function selectedTextNodes(root: HTMLElement, range: Range): Text[] {
  const ancestor = range.commonAncestorContainer;
  const candidates: Text[] = [];
  if (ancestor.nodeType === Node.TEXT_NODE) {
    candidates.push(ancestor as Text);
  } else {
    const walker = document.createTreeWalker(ancestor, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) candidates.push(walker.currentNode as Text);
  }
  return candidates.filter(
    (node) =>
      root.contains(node) &&
      !isBlank(node.data) &&
      range.intersectsNode(node) &&
      !(node === range.startContainer && range.startOffset >= node.length) &&
      !(node === range.endContainer && range.endOffset === 0),
  );
}

/** A range from the start of the first node to the end of the last. */
function spanOf(nodes: Text[]): Range {
  const range = document.createRange();
  range.setStart(nodes[0], 0);
  const last = nodes[nodes.length - 1];
  range.setEnd(last, last.length);
  return range;
}

/**
 * Wraps each node in an element made by `make`, joining it to a matching
 * element right next to it instead of adding another.
 */
function wrapEach(nodes: ChildNode[], make: () => HTMLElement) {
  const template = make();
  const matches = (n: Node | null): n is HTMLElement =>
    n instanceof HTMLElement && n.cloneNode(false).isEqualNode(template);
  for (const node of nodes) {
    let wrapper: HTMLElement;
    if (matches(node.previousSibling)) {
      wrapper = node.previousSibling;
    } else {
      wrapper = make();
      node.before(wrapper);
    }
    wrapper.append(node);
    const next = wrapper.nextSibling;
    if (matches(next)) {
      wrapper.append(...Array.from(next.childNodes));
      next.remove();
    }
  }
}

/**
 * Moves `node` out of `el`: splits `el` before and after the node, then
 * removes `el`, keeping any elements between them.
 */
function unwrapAround(el: HTMLElement, node: Node) {
  const before = document.createRange();
  before.setStart(el, 0);
  before.setEndBefore(node);
  const head = before.extractContents();
  if (hasContent(head)) {
    const copy = el.cloneNode(false);
    copy.appendChild(head);
    el.before(copy);
  }
  const after = document.createRange();
  after.setStartAfter(node);
  after.setEnd(el, el.childNodes.length);
  const tail = after.extractContents();
  if (hasContent(tail)) {
    const copy = el.cloneNode(false);
    copy.appendChild(tail);
    el.after(copy);
  }
  el.replaceWith(...Array.from(el.childNodes));
}

function removeTags(root: HTMLElement, nodes: Text[], tags: string[]) {
  for (const node of nodes) {
    let el: HTMLElement | null;
    while ((el = closestIn(node, root, tags))) unwrapAround(el, node);
  }
}

// Inline formats

export function isInlineActive(root: HTMLElement, range: Range, format: InlineFormat) {
  const tags = INLINE_TAGS[format];
  if (range.collapsed) return !!closestIn(range.startContainer, root, tags);
  const nodes = selectedTextNodes(root, range);
  return nodes.length > 0 && nodes.every((node) => closestIn(node, root, tags));
}

/** Adds the format to the selection, or removes it if it's all formatted. */
export function toggleInline(root: HTMLElement, range: Range, format: InlineFormat): Range {
  const tags = INLINE_TAGS[format];
  const split = splitBoundaries(range);
  const nodes = selectedTextNodes(root, split);
  if (!nodes.length) return split;
  if (nodes.every((node) => closestIn(node, root, tags))) {
    removeTags(root, nodes, tags);
  } else {
    wrapEach(
      nodes.filter((node) => !closestIn(node, root, tags)),
      () => document.createElement(format),
    );
  }
  return spanOf(nodes);
}

/**
 * Inserts text at a collapsed range with formats turned on or off, for text
 * typed after pressing a format button with nothing selected.
 */
export function insertFormattedText(
  root: HTMLElement,
  range: Range,
  text: string,
  formats: Map<InlineFormat, boolean>,
): Range {
  range.deleteContents();
  let at = range;
  for (const [format, on] of formats) {
    if (!on) at = splitOut(root, at, INLINE_TAGS[format]);
  }
  // Like the browser, a space at either end of the new text is non-breaking,
  // so it isn't collapsed and the caret stays inside the formatting.
  const textNode = document.createTextNode(text.replace(/^ | $/g, "\u00a0"));
  let node: Node = textNode;
  for (const [format, on] of formats) {
    if (on && !closestIn(at.startContainer, root, INLINE_TAGS[format])) {
      const wrapper = document.createElement(format);
      wrapper.append(node);
      node = wrapper;
    }
  }
  at.insertNode(node);
  const caret = document.createRange();
  caret.setStart(textNode, textNode.length);
  return caret;
}

/** Splits the elements with `tags` around a collapsed range, leaving it between the halves. */
function splitOut(root: HTMLElement, range: Range, tags: string[]): Range {
  let at = range;
  let el: HTMLElement | null;
  while ((el = closestIn(at.startContainer, root, tags))) {
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
  const split = splitBoundaries(range);
  const nodes = selectedTextNodes(root, split);
  if (!nodes.length) return split;
  removeTags(root, nodes, FORMATTING_TAGS);
  return spanOf(nodes);
}

// Links and inserted content

export function isSafeUrl(url: string) {
  try {
    return SAFE_LINK_PROTOCOLS.includes(new URL(url, document.baseURI).protocol);
  } catch {
    return false;
  }
}

/** Turns the selected text into a link, replacing links already in it. */
export function insertLink(root: HTMLElement, range: Range, href: string): Range {
  const split = splitBoundaries(range);
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

/** Replaces the selection with `node` and puts the caret after it. */
export function insertNodeAt(range: Range, node: Node): Range {
  range.deleteContents();
  range.insertNode(node);
  const caret = document.createRange();
  caret.setStartAfter(node);
  return caret;
}

/** The end of the last text inside `node`, for placing the caret after inserted content. */
function endOf(node: Node): Range {
  const range = document.createRange();
  let last = node;
  while (last.lastChild && !(last as Element).matches?.("img, br, hr")) last = last.lastChild;
  if (last.nodeType === Node.TEXT_NODE) range.setStart(last, (last as Text).length);
  else range.setStartAfter(last);
  return range;
}

/**
 * Inserts pasted content at the range. If it has blocks, such as paragraphs,
 * the block around the caret is split so they aren't nested inside it.
 */
export function insertFragment(root: HTMLElement, range: Range, fragment: DocumentFragment): Range {
  range.deleteContents();
  const last = fragment.lastChild;
  if (!last) return range;
  const block = Array.from(fragment.childNodes).some(isBlock)
    ? closestIn(range.startContainer, root, TEXT_BLOCKS.toUpperCase().split(", "))
    : null;
  if (block) {
    const tail = document.createRange();
    tail.setStart(range.startContainer, range.startOffset);
    tail.setEnd(block, block.childNodes.length);
    const after = block.cloneNode(false) as HTMLElement;
    after.append(tail.extractContents());
    block.after(fragment, after);
    if (!hasContent(block)) block.remove();
    if (!hasContent(after)) after.remove();
  } else {
    range.insertNode(fragment);
  }
  return endOf(last);
}

/** Plain text as text nodes, with line breaks as `<br>`, so it's never read as HTML. */
export function textToFragment(text: string): DocumentFragment {
  const fragment = document.createDocumentFragment();
  text.replace(/\r\n?/g, "\n").split("\n").forEach((line, i) => {
    if (i > 0) fragment.append(document.createElement("br"));
    if (line) fragment.append(document.createTextNode(line));
  });
  return fragment;
}

const ALLOWED_TAGS = new Set([
  "P", "DIV", "BR", "H1", "H2", "H3", "H4", "H5", "H6", "UL", "OL", "LI",
  "BLOCKQUOTE", "PRE", "CODE", "STRONG", "B", "EM", "I", "U", "INS", "S",
  "STRIKE", "DEL", "SUB", "SUP", "A", "IMG",
]);

/** Elements removed with their content, rather than unwrapped. */
const REMOVED_TAGS =
  "script, style, meta, link, title, head, iframe, frame, object, embed, template, noscript, svg, math, form, input, button, select, textarea";

/**
 * Keeps only the tags and attributes the editor supports. The HTML is parsed
 * in an inert document, so nothing in it runs or loads while it's cleaned.
 */
export function sanitize(html: string): DocumentFragment {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.body.querySelectorAll(REMOVED_TAGS).forEach((el) => el.remove());
  const comments = doc.createTreeWalker(doc.body, NodeFilter.SHOW_COMMENT);
  const commentNodes: Node[] = [];
  while (comments.nextNode()) commentNodes.push(comments.currentNode);
  commentNodes.forEach((comment) => comment.parentNode?.removeChild(comment));

  // Deepest first, so unwrapping an element doesn't skip its children.
  for (const el of Array.from(doc.body.querySelectorAll("*")).reverse()) {
    if (!ALLOWED_TAGS.has(el.tagName)) {
      el.replaceWith(...Array.from(el.childNodes));
      continue;
    }
    const href = el.tagName === "A" ? el.getAttribute("href") : null;
    const src = el.tagName === "IMG" ? el.getAttribute("src") : null;
    const alt = el.tagName === "IMG" ? el.getAttribute("alt") : null;
    for (const attr of Array.from(el.attributes)) el.removeAttribute(attr.name);
    if (href && isSafeUrl(href)) el.setAttribute("href", href);
    if (src && (/^https?:/i.test(src) || /^data:image\//i.test(src))) el.setAttribute("src", src);
    if (alt !== null) el.setAttribute("alt", alt);
    if (el.tagName === "IMG" && !el.hasAttribute("src")) el.remove();
  }

  const fragment = document.createDocumentFragment();
  for (const node of Array.from(doc.body.childNodes)) fragment.append(document.importNode(node, true));
  return fragment;
}

// Blocks

/**
 * Wraps runs of loose text and inline elements at the top of `root` in
 * paragraphs, so every line is in a block before block formatting.
 */
export function wrapLooseText(root: HTMLElement, range: Range): Range {
  const saved = keep(range);
  let run: ChildNode[] = [];
  const flush = () => {
    if (run.some((n) => n.nodeType !== Node.TEXT_NODE || !isBlank((n as Text).data))) {
      const paragraph = document.createElement("p");
      run[0].before(paragraph);
      paragraph.append(...run);
    }
    run = [];
  };
  for (const child of Array.from(root.childNodes)) {
    if (isBlock(child)) flush();
    else run.push(child);
  }
  flush();
  let result = restore(saved, root);
  if (!result) {
    result = document.createRange();
    result.selectNodeContents(root);
    result.collapse(false);
  }
  // An empty editor gets a paragraph to format.
  if (!blocksIn(root, result).length) {
    const paragraph = document.createElement("p");
    paragraph.append(document.createElement("br"));
    if (hasContent(root)) result.insertNode(paragraph);
    else root.replaceChildren(paragraph);
    result = document.createRange();
    result.setStart(paragraph, 0);
  }
  return result;
}

/** The text blocks the range touches, in document order. */
export function blocksIn(root: HTMLElement, range: Range): HTMLElement[] {
  const blocks = new Set<HTMLElement>();
  const add = (node: Node) => {
    const el = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
    const block = el?.closest(TEXT_BLOCKS);
    if (block && block !== root && root.contains(block)) blocks.add(block as HTMLElement);
  };
  add(range.startContainer);
  selectedTextNodes(root, range).forEach(add);
  if (!range.collapsed) add(range.endContainer);
  return Array.from(blocks).sort((a, b) =>
    a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
  );
}

/** The selection's block type, if every block has the same one. */
export function blockType(root: HTMLElement, range: Range): BlockType | null {
  const types = blocksIn(root, range).map((b) => (b.tagName === "DIV" ? "p" : b.tagName.toLowerCase()));
  return types.length && types.every((t) => t === types[0]) && ["p", "h1", "h2"].includes(types[0])
    ? (types[0] as BlockType)
    : null;
}

export function setBlockType(root: HTMLElement, range: Range, tag: BlockType): Range {
  const saved = keep(range);
  const replaced = new Map<Node, Node>();
  for (const block of blocksIn(root, range)) {
    if (block.tagName === "LI") {
      // A heading in a list item goes inside it, so the list stays intact.
      if (tag !== "p") {
        const heading = document.createElement(tag);
        heading.append(...Array.from(block.childNodes));
        block.append(heading);
      }
    } else if (tag === "p" && block.parentElement?.tagName === "LI") {
      block.replaceWith(...Array.from(block.childNodes));
    } else if (block.tagName.toLowerCase() !== tag) {
      rename(block, tag, replaced);
    }
  }
  return restore(saved, root, replaced) ?? range;
}

// Lists

function listItems(root: HTMLElement, range: Range): HTMLElement[] {
  const items = blocksIn(root, range).map((block) => closestIn(block, root, ["LI"]) ?? block);
  return Array.from(new Set(items));
}

const inList = (item: HTMLElement, type: ListType) =>
  item.tagName === "LI" && item.parentElement?.tagName === type.toUpperCase();

export function listType(root: HTMLElement, range: Range): ListType | null {
  const items = listItems(root, range);
  if (!items.length) return null;
  if (items.every((i) => inList(i, "ol"))) return "ol";
  if (items.every((i) => inList(i, "ul"))) return "ul";
  return null;
}

/** Joins a list to matching lists right before or after it. */
function mergeAdjacent(list: HTMLElement) {
  const previous = list.previousElementSibling;
  if (previous?.tagName === list.tagName) {
    previous.append(...Array.from(list.childNodes));
    list.remove();
    list = previous as HTMLElement;
  }
  const next = list.nextElementSibling;
  if (next?.tagName === list.tagName) {
    list.append(...Array.from(next.childNodes));
    next.remove();
  }
}

/** Takes an item out of its list as a paragraph, splitting the list around it. */
function unwrapListItem(item: HTMLElement) {
  const list = item.parentElement!;
  const rest: Node[] = [];
  for (let n = item.nextSibling; n; n = n.nextSibling) rest.push(n);
  if (rest.length) {
    const after = list.cloneNode(false) as HTMLElement;
    after.append(...rest);
    list.after(after);
  }
  let replacement: Node[];
  if (Array.from(item.childNodes).some(isBlock)) {
    replacement = Array.from(item.childNodes);
  } else {
    const paragraph = document.createElement("p");
    if (item.style.textAlign) paragraph.style.textAlign = item.style.textAlign;
    paragraph.append(...Array.from(item.childNodes));
    replacement = [paragraph];
  }
  list.after(...replacement);
  item.remove();
  if (!list.children.length) list.remove();
}

/**
 * Puts the selected blocks in a list. If they're all in a list of this type
 * already, takes them out. Lists of the other type switch to this type.
 */
export function toggleList(root: HTMLElement, range: Range, type: ListType): Range {
  const saved = keep(range);
  const replaced = new Map<Node, Node>();
  const items = listItems(root, range);
  if (items.every((item) => inList(item, type))) {
    items.forEach(unwrapListItem);
    return restore(saved, root, replaced) ?? range;
  }
  for (const item of items) {
    const list = item.parentElement;
    if (item.tagName === "LI" && list && !inList(item, type) && root.contains(list)) {
      mergeAdjacent(rename(list, type, replaced));
    }
  }
  const loose = items.filter((item) => item.tagName !== "LI");
  if (loose.length) {
    const list = document.createElement(type);
    loose[0].before(list);
    for (const block of loose) {
      const item = document.createElement("li");
      if (block.style.textAlign) item.style.textAlign = block.style.textAlign;
      // Headings stay headings inside the item. Paragraphs become the item.
      if (/^H\d$/.test(block.tagName)) item.append(block);
      else {
        item.append(...Array.from(block.childNodes));
        replaced.set(block, item);
        block.remove();
      }
      list.append(item);
    }
    mergeAdjacent(list);
  }
  return restore(saved, root, replaced) ?? range;
}

// Alignment

function alignmentOf(el: Element): Alignment {
  const style = getComputedStyle(el);
  const rtl = style.direction === "rtl";
  switch (style.textAlign) {
    case "center":
    case "-webkit-center":
      return "center";
    case "justify":
      return "justify";
    case "right":
    case "-webkit-right":
      return "right";
    case "end":
      return rtl ? "left" : "right";
    case "start":
      return rtl ? "right" : "left";
    default:
      return "left";
  }
}

export function alignment(root: HTMLElement, range: Range): Alignment | null {
  const blocks = blocksIn(root, range);
  if (!blocks.length) return alignmentOf(root);
  const values = blocks.map(alignmentOf);
  return values.every((v) => v === values[0]) ? values[0] : null;
}

/** Sets `text-align` on the selected blocks. Left removes it. */
export function setAlignment(root: HTMLElement, range: Range, value: Alignment): Range {
  for (const block of blocksIn(root, range)) {
    block.style.textAlign = value === "left" ? "" : value;
    if (!block.getAttribute("style")) block.removeAttribute("style");
  }
  return range;
}

// Undo history

interface Snapshot {
  html: string;
  /** The selection as character offsets into the editor's text */
  selection: { start: number; end: number } | null;
}

/** How many characters of text come before a point in `root`. */
function textOffset(root: Node, node: Node, offset: number): number {
  const range = document.createRange();
  range.selectNodeContents(root);
  range.setEnd(node, offset);
  return range.toString().length;
}

/** The point `offset` characters into the text of `root`. */
function pointAt(root: Node, offset: number): [Node, number] {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let remaining = offset;
  let last: Text | null = null;
  while (walker.nextNode()) {
    const text = walker.currentNode as Text;
    if (remaining <= text.length) return [text, remaining];
    remaining -= text.length;
    last = text;
  }
  return last ? [last, last.length] : [root, root.childNodes.length];
}

/**
 * Undo and redo for the editor. The browser's own undo can't reverse changes
 * made through the DOM, so each change is saved as the editor's HTML and the
 * selection. The selection is saved as character offsets, which read the
 * same however the text is split into nodes, so the editor never has to be
 * normalized. Safari loses the caret when text nodes around it are joined.
 */
export class History {
  private entries: Snapshot[] = [];
  private index = -1;

  constructor(private root: HTMLElement, private limit = 100) {}

  /** Starts over with the current content as the only entry. */
  reset() {
    this.entries = [this.take()];
    this.index = 0;
  }

  /** Saves the current content as a new entry, dropping anything to redo. */
  record() {
    const snapshot = this.take();
    if (snapshot.html === this.entries[this.index]?.html) {
      this.entries[this.index] = snapshot;
      return;
    }
    this.entries.splice(this.index + 1);
    this.entries.push(snapshot);
    if (this.entries.length > this.limit) this.entries.shift();
    this.index = this.entries.length - 1;
  }

  undo() {
    if (this.index <= 0) return false;
    this.index--;
    this.apply();
    return true;
  }

  redo() {
    if (this.index >= this.entries.length - 1) return false;
    this.index++;
    this.apply();
    return true;
  }

  private take(): Snapshot {
    const range = getRange(this.root);
    return {
      html: this.root.innerHTML,
      selection: range && {
        start: textOffset(this.root, range.startContainer, range.startOffset),
        end: textOffset(this.root, range.endContainer, range.endOffset),
      },
    };
  }

  private apply() {
    const { html, selection } = this.entries[this.index];
    this.root.innerHTML = html;
    const range = document.createRange();
    if (selection) {
      range.setStart(...pointAt(this.root, selection.start));
      range.setEnd(...pointAt(this.root, selection.end));
    } else {
      range.selectNodeContents(this.root);
      range.collapse(false);
    }
    this.root.focus({ preventScroll: true });
    selectRange(range);
  }
}
