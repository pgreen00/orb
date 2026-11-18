import { BLOCK_TAGS } from "./schema";

export const isElement = (node: Node): node is Element => node.nodeType === Node.ELEMENT_NODE;
export const isText = (node: Node): node is Text => node.nodeType === Node.TEXT_NODE;
export const isBlank = (text: string) => !/\S/.test(text);

/** A paragraph, heading, list, rule and the like */
export const isBlock = (node: Node): node is HTMLElement =>
  isElement(node) && BLOCK_TAGS.has(node.tagName);

/** A list item that starts with a task checkbox */
export function isTaskItem(el: Element): boolean {
  const first = Array.from(el.childNodes).find((n) => !(isText(n) && isBlank(n.data)));
  return !!first && isElement(first) && first.tagName === "INPUT";
}

/** Characters in a text node, or child nodes in any other node */
export function length(node: Node) {
  return isText(node) ? node.length : node.childNodes.length;
}

/** The closest ancestor of `node` with one of `tags`, inside `root`. */
export function closestIn(node: Node, root: HTMLElement, tags: string[]): HTMLElement | null {
  for (let n: Node | null = node; n && n !== root; n = n.parentNode) {
    if (isElement(n) && tags.includes(n.tagName)) return n as HTMLElement;
  }
  return null;
}

export function hasContent(node: Node) {
  if (node.textContent) return true;
  return isElement(node) || node instanceof DocumentFragment
    ? !!node.querySelector("img, br, hr")
    : false;
}

/** A table cell with a line break as its placeholder, so it has a height and the caret can go in it */
export function emptyCell(doc: Document, tag: "td" | "th"): HTMLElement {
  const cell = doc.createElement(tag);
  cell.append(doc.createElement("br"));
  return cell;
}

export function rename(el: HTMLElement, tag: string, replaced: Map<Node, Node>) {
  const next = document.createElement(tag);
  for (const attr of Array.from(el.attributes)) next.setAttribute(attr.name, attr.value);
  next.append(...Array.from(el.childNodes));
  el.replaceWith(next);
  replaced.set(el, next);
  return next;
}

/** Splits text nodes at the range's ends, so whole nodes are selected. */
export function splitAround(range: Range): Range {
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
export function selectedTextNodes(root: HTMLElement, range: Range): Text[] {
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
export function spanOf(nodes: Text[]): Range {
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
export function wrapEach(nodes: ChildNode[], make: () => HTMLElement) {
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
 * Splits `el` around `node`, so `node` is alone in `el`. The parts before and
 * after keep `el`'s attributes, such as its style.
 */
export function isolate(el: HTMLElement, node: Node): HTMLElement {
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
  return el;
}

/**
 * Moves `node` out of `el`: splits `el` before and after the node, then
 * removes `el`, keeping any elements between them.
 */
export function unwrapAround(el: HTMLElement, node: Node) {
  isolate(el, node).replaceWith(...Array.from(el.childNodes));
}
