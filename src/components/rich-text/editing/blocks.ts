import { closestIn, hasContent, isBlock, isElement, rename, selectedTextNodes, unwrapAround } from "./dom";
import { wrapLooseRuns } from "./normalize";
import { closestBlock, keep, restore } from "./selection";
import { INDENT_EM, isFormat, MAX_INDENT, StyleProp, TEXT_BLOCK_SELECTOR, TEXT_BLOCK_TAGS } from "./schema";

export type BlockType = "p" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "pre";
export type Alignment = "left" | "center" | "right" | "justify";

/** Wraps runs of loose text and inline elements at the top of `root` in paragraphs, keeping the range. */
export function wrapLooseText(root: HTMLElement, range: Range): Range {
  const saved = keep(range);
  wrapLooseRuns(root);
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
    const block = el?.closest(TEXT_BLOCK_SELECTOR);
    if (block && block !== root && root.contains(block)) blocks.add(block as HTMLElement);
  };
  add(range.startContainer);
  selectedTextNodes(root, range).forEach(add);
  if (!range.collapsed) add(range.endContainer);
  return Array.from(blocks).sort((a, b) =>
    a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
  );
}

/** Text blocks and separators in document order, for moving between blocks */
export function blockOrder(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(`${TEXT_BLOCK_SELECTOR}, hr`));
}

/** The code block around the caret, if there is one */
export function closestCodeBlock(root: HTMLElement, range: Range): HTMLElement | null {
  return closestIn(range.startContainer, root, ["PRE"]);
}

const isQuoted = (block: HTMLElement) => !!block.parentElement?.closest("blockquote");

/** The shared type of the selected blocks, or null when they differ */
export function blockType(root: HTMLElement, range: Range): BlockType | null {
  const blocks = blocksIn(root, range);
  if (!blocks.length) return null;
  const types = blocks.map((b) => (b.tagName === "PRE" ? "pre" : b.tagName === "LI" || b.tagName === "DIV" ? "p" : b.tagName.toLowerCase()));
  if (!types.every((t) => t === types[0])) return null;
  return types[0] as BlockType;
}

/** The ancestor of `el` that sits directly in `root` */
function topOf(root: HTMLElement, el: HTMLElement): HTMLElement {
  let top = el;
  while (top.parentElement !== root) top = top.parentElement!;
  return top;
}

/** Quotes the selected blocks, or lifts them out of their quote. Blocks already quoted stay as they are. */
export function setQuote(root: HTMLElement, range: Range, on: boolean): Range {
  const saved = keep(range);
  const blocks = blocksIn(root, range);
  if (on && !blocks.every(isQuoted)) {
    // Runs of neighbouring top-level blocks share one quote
    const tops = Array.from(new Set(blocks.map((b) => topOf(root, b))));
    let run: HTMLElement[] = [];
    const flush = () => {
      if (!run.length) return;
      const quote = document.createElement("blockquote");
      run[0].before(quote);
      quote.append(...run);
      run = [];
    };
    for (const top of tops) {
      if (run.length && run[run.length - 1].nextElementSibling !== top) flush();
      run.push(top);
    }
    flush();
  } else if (!on) {
    for (const block of blocks) {
      const quote = block.parentElement?.closest("blockquote");
      if (!quote || !root.contains(quote)) continue;
      let child: HTMLElement = block;
      while (child.parentElement !== quote) child = child.parentElement!;
      unwrapAround(quote as HTMLElement, child);
    }
  }
  return restore(saved, root) ?? range;
}

/** Whether every selected block is inside a quote */
export function inQuote(root: HTMLElement, range: Range): boolean {
  const blocks = blocksIn(root, range);
  return blocks.length > 0 && blocks.every(isQuoted);
}

/** Sets the type of the selected blocks. A quote around them stays as it is. */
export function setBlockType(root: HTMLElement, range: Range, type: BlockType): Range {
  const saved = keep(range);
  const replaced = new Map<Node, Node>();
  for (const block of blocksIn(root, range)) {
    // The `code` in a code block isn't inline code, so it goes when the block changes type
    if (block.tagName === "PRE" && type !== "pre") {
      const code = block.querySelector(":scope > code");
      if (code) code.replaceWith(...Array.from(code.childNodes));
    }
    if (block.tagName === "LI") {
      // A heading or code block in a list item goes inside it, before any sublist, so the list stays intact.
      if (type !== "p") {
        const inner = document.createElement(type);
        inner.append(...Array.from(block.childNodes).filter((n) => !(isElement(n) && (n.tagName === "UL" || n.tagName === "OL"))));
        block.prepend(inner);
      }
    } else if (type === "p" && block.parentElement?.tagName === "LI") {
      block.replaceWith(...Array.from(block.childNodes));
    } else if (block.tagName.toLowerCase() !== type) {
      rename(block, type, replaced);
    }
  }
  return restore(saved, root, replaced) ?? range;
}

/** Sets a style on the selected blocks. Null removes it. */
export function setBlockStyle(root: HTMLElement, range: Range, prop: StyleProp, value: string | null): Range {
  for (const block of blocksIn(root, range)) {
    if (value) block.style.setProperty(prop, value);
    else block.style.removeProperty(prop);
    if (!block.getAttribute("style")) block.removeAttribute("style");
  }
  return range;
}

/** The inline value of a style on the selected blocks, or null when they differ */
export function styleOf(root: HTMLElement, range: Range, prop: StyleProp): string | null {
  const values = new Set(blocksIn(root, range).map((b) => b.style.getPropertyValue(prop)));
  return values.size === 1 ? [...values][0] : null;
}

/** Indents the selected blocks that aren't list items. List items nest instead. */
export function changeIndent(root: HTMLElement, range: Range, delta: 1 | -1): Range {
  const saved = keep(range);
  for (const block of blocksIn(root, range)) {
    if (block.tagName === "LI") continue;
    const level = Math.round((parseFloat(block.style.marginInlineStart) || 0) / INDENT_EM) + delta;
    const next = Math.min(MAX_INDENT, Math.max(0, level));
    if (next) block.style.marginInlineStart = `${next * INDENT_EM}em`;
    else block.style.removeProperty("margin-inline-start");
    if (!block.getAttribute("style")) block.removeAttribute("style");
  }
  return restore(saved, root) ?? range;
}

/** Text or a piece, which a line break alone isn't */
export const hasVisible = (node: Element | DocumentFragment) => !!node.textContent || !!node.querySelector("img, hr, input");

/** The formats around a node within its block, outermost first. A link doesn't carry over to a new line. */
function marksAt(block: HTMLElement, node: Node): Element[] {
  const marks: Element[] = [];
  if (!block.contains(node)) return marks;
  for (let n: Node | null = node; n && n !== block; n = n.parentNode) {
    if (isElement(n) && n.tagName !== "A" && isFormat(n)) marks.unshift(n);
  }
  return marks;
}

/**
 * Enter: the block splits at the caret. The new block takes the rest, and a
 * heading split before its end continues as a paragraph. With nothing after
 * the caret, the new line still carries the formats around the caret, so
 * typing there keeps them.
 */
export function splitBlock(root: HTMLElement, range: Range): Range {
  // Taken from where the selection starts, since a selected range is removed first.
  const formats = marksAt(closestBlock(range.startContainer, root), range.startContainer);
  if (!range.collapsed) range = deleteAcross(root, range);
  const at = wrapLooseText(root, range);
  const block = closestBlock(at.startContainer, root);
  if (block === root) return at;
  const tail = document.createRange();
  tail.setStart(at.startContainer, at.startOffset);
  tail.setEnd(block, block.childNodes.length);
  // Only text and pieces move. A line break is a placeholder, so with nothing
  // visible after the caret the block stays as it is, and only the new line is added.
  const visible = hasVisible(tail.cloneContents());
  const moved = visible ? tail.extractContents() : null;
  const heading = /^H[1-6]$/.test(block.tagName) && visible;
  const after = document.createElement(block.tagName === "LI" ? "LI" : heading ? block.tagName : "P");
  for (const prop of ["text-align", "margin-inline-start", "line-height"] as const) {
    const value = block.style.getPropertyValue(prop);
    if (value) after.style.setProperty(prop, value);
  }
  let holder: Element = after;
  if (moved) {
    after.append(moved);
  } else {
    for (const format of formats) {
      const el = format.cloneNode(false) as Element;
      holder.append(el);
      holder = el;
    }
    holder.append(document.createElement("br"));
  }
  block.after(after);
  if (!hasContent(block)) block.append(document.createElement("br"));
  const caret = document.createRange();
  caret.setStart(holder, 0);
  caret.collapse(true);
  return caret;
}

/** Shift+Enter: a line break at the caret, with the caret after it */
export function insertBreak(root: HTMLElement, range: Range): Range {
  if (!range.collapsed) range = deleteAcross(root, range);
  const br = document.createElement("br");
  // Marked, so the editor keeps it rather than treating it as a browser's break
  br.setAttribute("data-orb-break", "");
  range.insertNode(br);
  const caret = document.createRange();
  caret.setStartAfter(br);
  caret.collapse(true);
  return caret;
}

/** Removes a block whose content has moved elsewhere, and its list if that's now empty */
function removeBlock(block: HTMLElement) {
  const parent = block.parentElement;
  block.remove();
  if (parent && (parent.tagName === "UL" || parent.tagName === "OL") && !parent.children.length) parent.remove();
}

/** Moves the content of `source` to the end of `target`, and removes `source`. Returns the caret at the join. */
function joinInto(target: HTMLElement, source: HTMLElement): Range {
  // A line break only holds an empty line open, so it's dropped when there's text to join to
  if (!hasVisible(target)) target.replaceChildren();
  const join = document.createRange();
  join.selectNodeContents(target);
  join.collapse(false);
  if (hasVisible(source)) target.append(...Array.from(source.childNodes));
  removeBlock(source);
  return join;
}

/** Selects a rule, which the next Backspace or Delete removes */
function selectRule(rule: HTMLElement): Range {
  rule.setAttribute("data-selected", "");
  const range = document.createRange();
  range.selectNode(rule);
  return range;
}

function endOfBlock(block: HTMLElement): Range {
  const range = document.createRange();
  range.selectNodeContents(block);
  range.collapse(false);
  return range;
}

/** Backspace at the start of a block: joins it to the block before, or selects a rule. */
export function joinBackward(root: HTMLElement, range: Range): Range | null {
  const block = closestBlock(range.startContainer, root);
  if (block === root) return null;
  const order = blockOrder(root);
  const prev = order.slice(0, order.indexOf(block)).reverse().find((el) => !el.contains(block));
  if (!prev) return null;
  if (prev.tagName === "HR") return selectRule(prev);
  // Text can't be joined into a code block, so the caret goes to its end.
  if (prev.tagName === "PRE") return endOfBlock(prev);
  return joinInto(prev, block);
}

/** Delete at the end of a block: joins the block after it, or selects a rule. */
export function joinForward(root: HTMLElement, range: Range): Range | null {
  const block = closestBlock(range.startContainer, root);
  if (block === root) return null;
  const order = blockOrder(root);
  const next = order.slice(order.indexOf(block) + 1).find((el) => !block.contains(el));
  if (!next) return null;
  if (next.tagName === "HR") return selectRule(next);
  if (next.tagName === "PRE") return null;
  return joinInto(block, next);
}

/** Deletes a selection that spans blocks. The blocks it covers go, and what's left of the last one joins the first. */
export function deleteAcross(root: HTMLElement, range: Range): Range {
  const first = closestBlock(range.startContainer, root);
  const last = closestBlock(range.endContainer, root);
  range.deleteContents();
  if (first !== last && first !== root && last !== root && last.isConnected) {
    first.append(...Array.from(last.childNodes));
    removeBlock(last);
  }
  return range;
}

/** Puts a rule in place of the caret's block, with a paragraph after it to keep typing in. */
export function insertSeparator(root: HTMLElement, range: Range): Range {
  if (!range.collapsed) range.deleteContents();
  const at = wrapLooseText(root, range);
  const block = closestBlock(at.startContainer, root);
  const rule = document.createElement("hr");
  const next = document.createElement("p");
  if (block === root) {
    root.append(rule, next);
  } else if (block.tagName === "LI") {
    // A rule inside an item would split it, so it goes after the list.
    topOf(root, block).after(rule, next);
  } else {
    const tail = document.createRange();
    tail.setStart(at.startContainer, at.startOffset);
    tail.setEnd(block, block.childNodes.length);
    next.append(tail.extractContents());
    block.after(rule, next);
    if (!hasContent(block)) block.remove();
  }
  if (!hasContent(next)) next.append(document.createElement("br"));
  const caret = document.createRange();
  caret.setStart(next, 0);
  caret.collapse(true);
  return caret;
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
    ? closestIn(range.startContainer, root, TEXT_BLOCK_TAGS)
    : null;
  if (block) {
    const tail = document.createRange();
    tail.setStart(range.startContainer, range.startOffset);
    tail.setEnd(block, block.childNodes.length);
    const after = block.cloneNode(false) as HTMLElement;
    after.append(tail.extractContents());
    block.after(fragment, after);
    // A line break alone is only a placeholder, so an empty block is replaced by what's pasted
    if (!hasVisible(block)) block.remove();
    if (!hasVisible(after)) after.remove();
  } else {
    range.insertNode(fragment);
  }
  return endOf(last);
}
