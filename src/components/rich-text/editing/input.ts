import { hasContent, isBlank, isElement, isTaskItem, isText } from "./dom";
import { blockOrder, insertBreak, joinBackward, joinForward, splitBlock } from "./blocks";
import { indentItems, outdentItem, outdentItems } from "./lists";
import { closestBlock } from "./selection";
import { isInlineAtom } from "./schema";
import { tabCell, verticalCell } from "./tables";

/** What the user did, as the editor sees it. The component maps input events to these. */
export type Key =
  | "enter"
  | "shiftEnter"
  | "backspaceAtStart"
  | "deleteAtEnd"
  | "tab"
  | "shiftTab"
  | "arrowUpAtStart"
  | "arrowDownAtEnd";

/**
 * Returns the range to select, null when the key was handled without a
 * change, or undefined to let the browser handle it. A handler that returns
 * undefined must not have changed anything.
 */
export type Handler = (el: HTMLElement, range: Range, root: HTMLElement) => Range | null | undefined;

export interface Behavior {
  /** The element this handles, found by walking out from the caret */
  selector: string;
  on: Partial<Record<Key, Handler>>;
}

const caretIn = (el: Element): Range => {
  const range = document.createRange();
  range.setStart(el, 0);
  range.collapse(true);
  return range;
};

/** Writes a code block's text, and selects [start, end] in it */
function writeCode(code: HTMLElement, text: string, start: number, end = start): Range {
  code.textContent = text;
  const range = document.createRange();
  const node = code.firstChild;
  if (node) {
    range.setStart(node, Math.min(start, text.length));
    range.setEnd(node, Math.min(end, text.length));
  } else {
    range.setStart(code, 0);
    range.collapse(true);
  }
  return range;
}

/** The element holding a code block's text: its `code` child, or the block itself */
const codeOf = (pre: HTMLElement) => (pre.querySelector("code") as HTMLElement | null) ?? pre;

/** The character offsets of a range's ends, counted in the code's text */
function offsetsIn(code: HTMLElement, range: Range): [number, number] {
  const measure = (node: Node, offset: number) => {
    const measured = document.createRange();
    measured.selectNodeContents(code);
    measured.setEnd(node, offset);
    return measured.toString().length;
  };
  return [measure(range.startContainer, range.startOffset), measure(range.endContainer, range.endOffset)];
}

/** An empty paragraph just before or after a block, with the caret in it */
function paragraphBeside(block: HTMLElement, after: boolean): Range {
  const paragraph = document.createElement("p");
  paragraph.append(document.createElement("br"));
  if (after) block.after(paragraph);
  else block.before(paragraph);
  return caretIn(paragraph);
}

/**
 * Enter in a code block adds a newline. At the very end, a second one is
 * added so the new line shows, and cleanup drops it when saving. Enter with
 * the last two lines empty ends the block.
 */
function codeEnter(pre: HTMLElement, range: Range): Range {
  const code = codeOf(pre);
  const text = code.textContent ?? "";
  const [start, end] = offsetsIn(code, range);
  const before = text.slice(0, start);
  const after = text.slice(end);
  const atEnd = after === "" || after === "\n";
  if (atEnd && before.endsWith("\n\n")) {
    writeCode(code, before.slice(0, -2), before.length - 2);
    return paragraphBeside(pre, true);
  }
  return atEnd
    ? writeCode(code, `${before}\n\n`, before.length + 1)
    : writeCode(code, `${before}\n${after}`, start + 1);
}

/** Tab and Shift+Tab move the selected lines by two spaces */
function shiftLines(pre: HTMLElement, range: Range, dir: 1 | -1): Range {
  const code = codeOf(pre);
  const text = code.textContent ?? "";
  const [start, end] = offsetsIn(code, range);
  const first = start > 0 ? text.lastIndexOf("\n", start - 1) + 1 : 0;
  let lineEnd = text.indexOf("\n", end);
  if (lineEnd < 0) lineEnd = text.length;
  const lines = text.slice(first, lineEnd).split("\n");
  let removedFirst = 0;
  let removedTotal = 0;
  const changed = lines.map((line, i) => {
    if (dir > 0) return `  ${line}`;
    const strip = /^ {1,2}/.exec(line)?.[0].length ?? 0;
    if (i === 0) removedFirst = strip;
    removedTotal += strip;
    return line.slice(strip);
  });
  const next = text.slice(0, first) + changed.join("\n") + text.slice(lineEnd);
  if (dir > 0) return writeCode(code, next, start + 2, end + 2 * lines.length);
  return writeCode(code, next, Math.max(first, start - removedFirst), Math.max(first, end - removedTotal));
}

/** A code block empty of text turns into a paragraph on Backspace */
function emptyCodeToParagraph(pre: HTMLElement): Range {
  const paragraph = document.createElement("p");
  paragraph.append(document.createElement("br"));
  pre.replaceWith(paragraph);
  return caretIn(paragraph);
}

const codeBlock: Behavior = {
  selector: "pre",
  on: {
    enter: (pre, range) => codeEnter(pre, range),
    shiftEnter: (pre, range) => codeEnter(pre, range),
    // Text doesn't join a code block, so Backspace at its start only removes an empty one.
    backspaceAtStart: (pre) => (codeOf(pre).textContent ? null : emptyCodeToParagraph(pre)),
    deleteAtEnd: () => null,
    tab: (pre, range) => shiftLines(pre, range, 1),
    shiftTab: (pre, range) => shiftLines(pre, range, -1),
    arrowDownAtEnd: (pre, range) => {
      const code = codeOf(pre);
      const rest = (code.textContent ?? "").slice(offsetsIn(code, range)[1]).replace(/\n$/, "");
      return rest.includes("\n") || pre.nextElementSibling ? undefined : paragraphBeside(pre, true);
    },
    arrowUpAtStart: (pre, range) => {
      const code = codeOf(pre);
      const before = (code.textContent ?? "").slice(0, offsetsIn(code, range)[0]);
      return before.includes("\n") || pre.previousElementSibling ? undefined : paragraphBeside(pre, false);
    },
  },
};

/** A list item with no text of its own. Nested lists don't count. */
function isEmptyItem(item: HTMLElement) {
  return Array.from(item.childNodes).every(
    (n) =>
      (isText(n) && isBlank(n.data)) ||
      (isElement(n) && (n.tagName === "UL" || n.tagName === "OL" || n.tagName === "BR" || n.tagName === "INPUT")),
  );
}

const taskItem: Behavior = {
  selector: "li",
  on: {
    // The new item gets an unchecked checkbox, unless the item was empty, which outdents instead.
    enter: (item, range, root) => {
      if (!isTaskItem(item) || isEmptyItem(item)) return undefined;
      const caret = splitBlock(root, range);
      const next = caret.startContainer as HTMLElement;
      const box = document.createElement("input");
      box.type = "checkbox";
      next.prepend(box);
      const after = document.createRange();
      after.setStartAfter(box);
      after.collapse(true);
      return after;
    },
  },
};

const listItem: Behavior = {
  selector: "li",
  on: {
    enter: (item) => (isEmptyItem(item) ? caretIn(outdentItem(item)) : undefined),
    backspaceAtStart: (item) => caretIn(outdentItem(item)),
    tab: (_item, range, root) => indentItems(root, range),
    shiftTab: (_item, range, root) => outdentItems(root, range),
  },
};

const quote: Behavior = {
  selector: "p",
  on: {
    // Enter on the empty last paragraph of a quote leaves the quote.
    enter: (p) => {
      const quoteEl = p.parentElement;
      if (quoteEl?.tagName !== "BLOCKQUOTE" || p.nextElementSibling || !isBlank(p.textContent ?? "")) return undefined;
      if (p.querySelector("img")) return undefined;
      quoteEl.after(p);
      if (!quoteEl.children.length && !quoteEl.textContent) quoteEl.remove();
      if (!hasContent(p)) p.append(document.createElement("br"));
      return caretIn(p);
    },
    // Backspace at the start of the first paragraph removes the quote.
    backspaceAtStart: (p) => {
      const quoteEl = p.parentElement;
      if (quoteEl?.tagName !== "BLOCKQUOTE" || p.previousElementSibling) return undefined;
      quoteEl.replaceWith(...Array.from(quoteEl.childNodes));
      return caretIn(p);
    },
  },
};

const heading: Behavior = {
  selector: "h1, h2, h3, h4, h5, h6",
  on: {
    // A heading at the top of the document becomes a paragraph, rather than joining into nothing.
    backspaceAtStart: (h, _range, root) => {
      if (blockOrder(root)[0] !== h) return undefined;
      const paragraph = document.createElement("p");
      paragraph.append(...Array.from(h.childNodes));
      const style = h.getAttribute("style");
      if (style) paragraph.setAttribute("style", style);
      h.replaceWith(paragraph);
      return caretIn(paragraph);
    },
  },
};

/** A table cell holds lines rather than paragraphs, and cells never merge, so Backspace and Delete stop at their edges. */
const tableCell: Behavior = {
  selector: "td, th",
  on: {
    enter: (_cell, range, root) => insertBreak(root, range),
    tab: (cell) => tabCell(cell as HTMLTableCellElement, 1),
    shiftTab: (cell) => tabCell(cell as HTMLTableCellElement, -1),
    backspaceAtStart: () => null,
    deleteAtEnd: () => null,
    arrowUpAtStart: (cell, range) => verticalCell(cell as HTMLTableCellElement, range, -1),
    arrowDownAtEnd: (cell, range) => verticalCell(cell as HTMLTableCellElement, range, 1),
  },
};

/** Most specific first. The walk from the caret takes the first behavior that acts. */
const BEHAVIORS: Behavior[] = [tableCell, codeBlock, taskItem, listItem, quote, heading];

/** What each key does when no behavior takes it */
const DEFAULTS: Partial<Record<Key, (root: HTMLElement, range: Range) => Range | null>> = {
  enter: splitBlock,
  shiftEnter: insertBreak,
  backspaceAtStart: joinBackward,
  deleteAtEnd: joinForward,
};

export function handleKey(root: HTMLElement, range: Range, key: Key): Range | null | undefined {
  for (let node: Node | null = range.startContainer; node && node !== root; node = node.parentNode) {
    if (!isElement(node)) continue;
    for (const behavior of BEHAVIORS) {
      if (!node.matches(behavior.selector)) continue;
      const result = behavior.on[key]?.(node as HTMLElement, range, root);
      if (result !== undefined) return result;
    }
  }
  return DEFAULTS[key]?.(root, range);
}

/** The inline piece just before a collapsed caret, which Backspace removes whole */
export function atomBefore(range: Range): Element | null {
  const { startContainer: node, startOffset: offset } = range;
  const el = isText(node) ? (offset === 0 ? node.previousSibling : null) : (node.childNodes[offset - 1] ?? null);
  return el && isElement(el) && isInlineAtom(el) ? el : null;
}

/** The inline piece just after a collapsed caret, which Delete removes whole */
export function atomAfter(range: Range): Element | null {
  const { startContainer: node, startOffset: offset } = range;
  const el = isText(node) ? (offset === node.length ? node.nextSibling : null) : (node.childNodes[offset] ?? null);
  return el && isElement(el) && isInlineAtom(el) ? el : null;
}

/** Whether the caret has no content before it in its block */
export function atBlockStart(root: HTMLElement, range: Range): boolean {
  const block = closestBlock(range.startContainer, root);
  if (block === root) return false;
  const before = document.createRange();
  before.selectNodeContents(block);
  before.setEnd(range.startContainer, range.startOffset);
  return !hasContent(before.cloneContents());
}

/** Whether the caret has no content after it in its block */
export function atBlockEnd(root: HTMLElement, range: Range): boolean {
  const block = closestBlock(range.startContainer, root);
  if (block === root) return false;
  const after = document.createRange();
  after.selectNodeContents(block);
  after.setStart(range.startContainer, range.startOffset);
  return !hasContent(after.cloneContents());
}
