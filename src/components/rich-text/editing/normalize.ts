import { cleanElement, cleanTree } from "./sanitize";
import { isBlank, isBlock, isElement, isTaskItem, isText } from "./dom";
import { keep, restore, closestBlock, Boundaries } from "./selection";
import { FORMAT_SELECTOR, isAtom, isFormat, isInlineAtom, specOf, TEXT_BLOCK_SELECTOR } from "./schema";

type Container = Element | DocumentFragment;

/** Marks in the order they nest in the saved HTML, outermost first */
const MARK_ORDER = ["A", "STRONG", "EM", "U", "S", "CODE", "SUB", "SUP"];

const isLi = (node: Node) => isElement(node) && node.tagName === "LI";
const isBlankText = (node: Node) => isText(node) && isBlank(node.data);

/** A block with no text and nothing like an image or line break in it */
const isEmptyBlock = (el: Element) => isBlank(el.textContent ?? "") && !el.querySelector("img, br, hr");

/**
 * Brings content that isn't being edited to its canonical form: aliases
 * renamed, unknown elements unwrapped, every line in a text block, pieces
 * marked, no empty inline elements. With `output`, the nesting of formats is
 * also rebuilt and runtime-only markup removed, so equal content always saves
 * the same HTML.
 */
export function normalize(root: Container, { output = false } = {}) {
  cleanTree(root, new Map(), true);
  unwrapBlocksInText(root);
  fixLists(root);
  fixQuotes(root);
  wrapLooseRuns(root);
  ensureEditableAround(root);
  markPieces(root);
  root.querySelectorAll<HTMLElement>("pre").forEach(normalizeCodeBlock);
  root.querySelectorAll(TEXT_BLOCK_SELECTOR).forEach((block) => fillEmptyBlock(block));
  mergeAdjacentInline(root);
  dropEmptyInline(root);
  root.normalize();
  if (output) {
    root.querySelectorAll<HTMLElement>(TEXT_BLOCK_SELECTOR).forEach((block) => {
      if (!block.querySelector(TEXT_BLOCK_SELECTOR)) rebuildInline(block);
    });
    trimCodeNewlines(root);
    stripRuntime(root);
    unwrapBreakOnlyMarks(root);
    dropTrailingBreaks(root);
  }
}

/** A format that holds only a line break is where typing goes. It isn't content, so it's not saved. */
function unwrapBreakOnlyMarks(root: Container) {
  for (const el of Array.from(root.querySelectorAll(FORMAT_SELECTOR))) {
    if (!el.textContent && !el.querySelector("img, hr, input")) el.replaceWith(...Array.from(el.childNodes));
  }
}

/** A line break after text does nothing, so it's not saved. A block with no text keeps its break. */
function dropTrailingBreaks(root: Container) {
  for (const block of Array.from(root.querySelectorAll<HTMLElement>(TEXT_BLOCK_SELECTOR))) {
    if (!block.textContent && !block.querySelector("img, hr, input")) continue;
    let last: Node | null = block.lastChild;
    while (isElement(last) && isFormat(last) && last.lastChild) last = last.lastChild;
    if (isElement(last) && last.tagName === "BR") last.remove();
  }
}

/**
 * The content as it's saved: canonical HTML and its plain text. It works on a
 * copy, so the live editor never changes, and the result is cached by the caller.
 */
export function serialize(root: HTMLElement): { html: string; text: string } {
  const copy = root.cloneNode(true) as HTMLElement;
  normalize(copy, { output: true });
  return { html: copy.innerHTML, text: plainText(copy) };
}

/**
 * Cleans up the blocks a command touched, and keeps the selection in place.
 * It runs after each command, so it only looks at those blocks, never the
 * whole document.
 */
export function normalizeAround(root: HTMLElement, range: Range): Range {
  const saved: Boundaries = keep(range);
  const replaced = new Map<Node, Node>();
  const blocks = new Set([closestBlock(range.startContainer, root), closestBlock(range.endContainer, root)]);
  for (const block of blocks) {
    if (block === root || !root.contains(block)) continue;
    cleanTree(block, replaced, true);
    cleanElement(block, replaced, true);
    const current = (replaced.get(block) ?? block) as HTMLElement;
    markPieces(current);
    if (current.tagName === "PRE") normalizeCodeBlock(current);
    fillEmptyBlock(current);
  }
  ensureEditableAround(root);
  return restore(saved, root, replaced) ?? range;
}

/**
 * Non-editable pieces, which can't hold the caret. A line break follows a
 * piece at the end of a block, so the caret can get past it. Both are
 * runtime-only and left out of the saved HTML.
 */
export function markPieces(root: Container) {
  removeBrowserBreaks(root);
  for (const el of Array.from(root.querySelectorAll("*"))) {
    if (isAtom(el)) el.setAttribute("contenteditable", "false");
  }
  for (const box of Array.from(root.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'))) {
    box.tabIndex = -1;
  }
  // A task item's checkbox stands in for the bullet
  for (const item of Array.from(root.querySelectorAll<HTMLElement>("li"))) {
    if (isTaskItem(item)) item.style.listStyleType = "none";
    else if (item.style.listStyleType === "none") {
      item.style.removeProperty("list-style-type");
      if (!item.getAttribute("style")) item.removeAttribute("style");
    }
  }
  const blocks = Array.from(root.querySelectorAll(TEXT_BLOCK_SELECTOR));
  if (isElement(root) && root.matches(TEXT_BLOCK_SELECTOR)) blocks.push(root);
  for (const block of blocks) trailingBreak(block);
}

function trailingBreak(block: Element) {
  const content = Array.from(block.childNodes).filter(
    (n) => !(isElement(n) && n.hasAttribute("data-orb-trailing")),
  );
  const last = content[content.length - 1];
  // A piece at the end of a line needs a break after it, so the caret can sit after it. A
  // break the editor made after text (Shift+Enter) gets one too, so its empty line shows.
  const needed =
    !!last &&
    isElement(last) &&
    (isInlineAtom(last) || (last.tagName === "BR" && last.hasAttribute("data-orb-break") && !!block.textContent));
  const existing = block.querySelector(":scope > br[data-orb-trailing]");
  if (needed && !existing) {
    const br = block.ownerDocument.createElement("br");
    br.setAttribute("data-orb-trailing", "");
    block.append(br);
  } else if (!needed && existing) {
    existing.remove();
  }
}

/** Paragraphs and headings can't hold blocks, so one that does is unwrapped */
function unwrapBlocksInText(root: Container) {
  for (const el of Array.from(root.querySelectorAll("p, h1, h2, h3, h4, h5, h6"))) {
    if (Array.from(el.children).some(isBlock)) el.replaceWith(...Array.from(el.childNodes));
  }
}

/** Items go in a list, and a list holds only items */
function fixLists(root: Container) {
  const doc = root.ownerDocument;
  const parents: Node[] = [root, ...Array.from(root.querySelectorAll("*"))];
  for (const parent of parents) {
    const inList = isElement(parent) && (parent.tagName === "UL" || parent.tagName === "OL");
    if (inList) wrapRuns(parent, (n) => !isLi(n), () => doc.createElement("li"));
    else wrapRuns(parent, isLi, () => doc.createElement("ul"));
  }
}

/** Wraps runs of loose text and inline elements at the top of `root` in paragraphs */
export function wrapLooseRuns(root: Container) {
  wrapRuns(root, (n) => !isBlock(n), () => root.ownerDocument.createElement("p"));
}

/**
 * Wraps each run of consecutive children that match `wanted` in a new element.
 * A run that's only blank text is removed instead.
 */
function wrapRuns(parent: Node, wanted: (node: ChildNode) => boolean, make: () => HTMLElement) {
  let run: ChildNode[] = [];
  const flush = () => {
    if (run.length && run.every(isBlankText)) {
      run.forEach((n) => n.remove());
    } else if (run.length) {
      const wrapper = make();
      run[0].before(wrapper);
      wrapper.append(...run);
    }
    run = [];
  };
  for (const child of Array.from(parent.childNodes)) {
    if (wanted(child)) run.push(child);
    else flush();
  }
  flush();
}

/** Blockquotes hold blocks, so loose text inside one is wrapped in a paragraph */
function fixQuotes(root: Container) {
  for (const quote of Array.from(root.querySelectorAll<HTMLElement>("blockquote"))) {
    wrapRuns(quote, (n) => !isBlock(n), () => quote.ownerDocument.createElement("p"));
  }
}

/**
 * A code block holds one `code` element with all of its text, which carries
 * the language. Line breaks become newlines, and formatting is removed.
 */
export function normalizeCodeBlock(pre: HTMLElement) {
  const doc = pre.ownerDocument;
  for (const br of Array.from(pre.querySelectorAll("br"))) {
    if (br.hasAttribute("data-orb-trailing")) br.remove();
    else br.replaceWith(doc.createTextNode("\n"));
  }
  for (const el of Array.from(pre.querySelectorAll("*"))) {
    if (el.tagName !== "CODE" && isFormat(el)) el.replaceWith(...Array.from(el.childNodes));
  }
  const code = pre.querySelector<HTMLElement>(":scope > code") ?? doc.createElement("code");
  code.append(...Array.from(pre.childNodes).filter((n) => n !== code));
  pre.replaceChildren(code);
}

/** The code's final newline is only there so the caret can sit on a new line, so it isn't saved */
function trimCodeNewlines(root: Container) {
  for (const pre of Array.from(root.querySelectorAll("pre"))) {
    const walker = pre.ownerDocument.createTreeWalker(pre, NodeFilter.SHOW_TEXT);
    let last: Text | null = null;
    while (walker.nextNode()) last = walker.currentNode as Text;
    if (last?.data.endsWith("\n")) last.data = last.data.slice(0, -1);
  }
}

/** A paragraph after a trailing rule, so the caret can get below it */
function ensureEditableAround(root: Container) {
  const last = Array.from(root.childNodes).reverse().find((n) => !isBlankText(n));
  if (last && isElement(last) && specOf(last)?.kind === "atom-block") {
    const paragraph = root.ownerDocument.createElement("p");
    paragraph.append(root.ownerDocument.createElement("br"));
    root.append(paragraph);
  }
}

/** An empty block holds a line break, so it has a height and the caret can go in it */
function fillEmptyBlock(block: Element) {
  if (isEmptyBlock(block)) block.append(block.ownerDocument.createElement("br"));
}

/** Joins adjacent marks that match, such as two bold runs with nothing between them */
function mergeAdjacentInline(root: Container) {
  for (const el of Array.from(root.querySelectorAll(FORMAT_SELECTOR))) {
    let next = el.nextSibling;
    while (next && isElement(next) && sameMark(el, next)) {
      el.append(...Array.from(next.childNodes));
      next.remove();
      next = el.nextSibling;
    }
  }
}

const sameMark = (a: Element, b: Element) =>
  a.tagName === b.tagName && a.cloneNode(false).isEqualNode(b.cloneNode(false));

function dropEmptyInline(root: Container) {
  for (const el of Array.from(root.querySelectorAll(FORMAT_SELECTOR))) {
    if (!el.textContent && !el.querySelector("img, br, hr")) el.remove();
  }
}

/** The last node of a block's content, going into formats and skipping the runtime break */
function lastContent(block: Element): Node | null {
  let node: Node | null = block.lastChild;
  for (;;) {
    while (isElement(node) && node.hasAttribute("data-orb-trailing")) node = node.previousSibling;
    if (isElement(node) && isFormat(node) && node.lastChild) node = node.lastChild;
    else return node;
  }
}

/**
 * Removes line breaks the editor didn't make: a break at the end of a line of
 * text. Safari adds these when the caret lands at the end of a line, and draws
 * each one as an extra line. Breaks the editor makes on purpose are marked.
 * Placeholders in empty blocks are kept.
 */
export function removeBrowserBreaks(root: Container) {
  for (const block of Array.from(root.querySelectorAll<HTMLElement>(TEXT_BLOCK_SELECTOR))) {
    if (!block.textContent) continue;
    const last = lastContent(block);
    if (isElement(last) && last.tagName === "BR" && !last.hasAttribute("data-orb-break")) last.remove();
    // The runtime break is only kept where a piece or an intentional break needs it
    const keepsTrailing = isElement(last) && (isInlineAtom(last) || last.hasAttribute("data-orb-break"));
    const trailing = block.querySelector(":scope > br[data-orb-trailing]");
    if (trailing && !keepsTrailing) trailing.remove();
  }
}

function stripRuntime(root: Container) {
  root.querySelectorAll("br[data-orb-trailing]").forEach((el) => el.remove());
  root.querySelectorAll("[data-orb-break]").forEach((el) => el.removeAttribute("data-orb-break"));
  root.querySelectorAll('input[type="checkbox"]').forEach((el) => el.removeAttribute("tabindex"));
  root.querySelectorAll("[contenteditable]").forEach((el) => el.removeAttribute("contenteditable"));
  root.querySelectorAll("[data-selected]").forEach((el) => el.removeAttribute("data-selected"));
}

/**
 * Rebuilds a block's inline content in one nesting order, so each piece of text
 * gets the same marks however they were nested before. `<em><strong>x</strong></em>`
 * and `<strong><em>x</em></strong>` save the same HTML.
 */
function rebuildInline(block: HTMLElement) {
  const segments: { node: Node; marks: Element[] }[] = [];
  const walk = (parent: Node, marks: Element[]) => {
    for (const child of Array.from(parent.childNodes)) {
      if (isText(child)) {
        if (child.data) segments.push({ node: child, marks });
      } else if (isElement(child) && isFormat(child)) {
        walk(child, [...marks, child]);
      } else {
        segments.push({ node: child, marks });
      }
    }
  };
  walk(block, []);
  block.replaceChildren();

  const open: Element[] = [];
  for (const { node, marks } of segments) {
    const wanted = canonicalMarks(marks);
    let keepCount = 0;
    while (
      keepCount < open.length &&
      keepCount < wanted.length &&
      open[keepCount].cloneNode(false).isEqualNode(wanted[keepCount])
    ) {
      keepCount++;
    }
    open.length = keepCount;
    let parent: Node = open[keepCount - 1] ?? block;
    for (const mark of wanted.slice(keepCount)) {
      const el = mark.cloneNode(false) as Element;
      parent.appendChild(el);
      open.push(el);
      parent = el;
    }
    appendMerged(parent, node);
  }
}

/**
 * One copy of each mark, outermost first. A repeat, such as STRONG inside
 * STRONG, is dropped. Spans come after the marks, and spans with different
 * styles are all kept.
 */
function canonicalMarks(marks: Element[]): Element[] {
  const shell = (m: Element) => m.cloneNode(false) as Element;
  const keyOf = (m: Element) => (m.tagName === "SPAN" ? shell(m).outerHTML : m.tagName);
  const rank = (m: Element) => (m.tagName === "SPAN" ? MARK_ORDER.length : MARK_ORDER.indexOf(m.tagName));
  const unique = marks.filter((m, i) => marks.findIndex((o) => keyOf(o) === keyOf(m)) === i);
  return unique
    .sort((a, b) => rank(a) - rank(b) || keyOf(a).localeCompare(keyOf(b)))
    .map(shell);
}

function appendMerged(parent: Node, node: Node) {
  const last = parent.lastChild;
  if (isText(node) && last && isText(last)) last.data += node.data;
  else parent.appendChild(node);
}

/** The text as readers see it: a line per block, and line breaks kept */
function plainText(root: Element): string {
  let text = "";
  const newline = () => {
    if (text && !text.endsWith("\n")) text += "\n";
  };
  const walk = (node: Node) => {
    if (isText(node)) {
      text += node.data;
      return;
    }
    if (!isElement(node)) return;
    if (node.tagName === "BR") {
      text += "\n";
      return;
    }
    const block = isBlock(node);
    if (block) newline();
    for (const child of Array.from(node.childNodes)) walk(child);
    if (block) newline();
  };
  for (const child of Array.from(root.childNodes)) walk(child);
  return text.replace(/\n+$/, "");
}
