import { closestIn, selectedTextNodes, splitAround, wrapEach } from "./dom";
import { BlockType, closestCodeBlock, insertSeparator, setBlockType, setQuote } from "./blocks";
import { insertLink } from "./inline";
import { toggleList, toggleTaskAt, toggleTaskList } from "./lists";
import { normalizeCodeBlock } from "./normalize";
import { closestBlock } from "./selection";

/**
 * What a typed character or Enter does, once it has matched. The typed
 * character goes in first, as its own undo step, and then `run` converts the
 * text around the caret, as a second step.
 */
export interface Plan {
  /** Whether the Enter is used up, so no new block follows. Only block rules do this. */
  replacesEnter: boolean;
  run: (root: HTMLElement, caret: Range) => Range | null;
}

interface BlockRule {
  /** Matched against the whole text of a paragraph, from its start to the caret */
  match: RegExp;
  apply: (root: HTMLElement, at: Range, m: RegExpMatchArray) => Range | null;
}

interface InlineRule {
  /** Ends with the closing marker, which is the character just typed */
  match: RegExp;
  marker: string;
  tag: string;
}

/** Typed with a space, at the start of a paragraph */
const TYPED_BLOCK_RULES: BlockRule[] = [
  { match: /^(#{1,6})$/, apply: (root, at, m) => setBlockType(root, at, `h${m[1].length}` as BlockType) },
  { match: /^[-*+]$/, apply: (root, at) => toggleList(root, at, "ul") },
  { match: /^(\d+)[.)]$/, apply: (root, at, m) => startAt(root, toggleList(root, at, "ol"), +m[1]) },
  { match: /^(?:[-*+] )?\[( |x)\]$/i, apply: (root, at, m) => makeTask(root, at, m[1] !== " ") },
  { match: /^>$/, apply: (root, at) => setQuote(root, at, true) },
];

/** Entered with Enter, at the start of a paragraph */
const ENTER_BLOCK_RULES: BlockRule[] = [
  { match: /^```([\w+-]*)$/, apply: (root, at, m) => toCodeBlock(root, at, m[1]) },
  { match: /^(?:---|\*\*\*|___)$/, apply: (root, at) => insertSeparator(root, at) },
];

/** Typed closing markers, such as the second * of **bold** */
const INLINE_RULES: InlineRule[] = [
  { match: /(?:^|[^*])\*\*([^*\s](?:[^*]*[^*\s])?)\*\*$/, marker: "**", tag: "STRONG" },
  { match: /(?:^|[^\w_])__([^_\s](?:[^_]*[^_\s])?)__$/, marker: "__", tag: "STRONG" },
  { match: /(?:^|[^*])\*([^*\s](?:[^*]*[^*\s])?)\*$/, marker: "*", tag: "EM" },
  { match: /(?:^|[^\w_])_([^_\s](?:[^_]*[^_\s])?)_$/, marker: "_", tag: "EM" },
  { match: /~~([^~\s](?:[^~]*[^~\s])?)~~$/, marker: "~~", tag: "S" },
  { match: /`([^`]+)`$/, marker: "`", tag: "CODE" },
];

/** A web address at the end of the text, which a space or Enter turns into a link */
const AUTOLINK = /(https?:\/\/[^\s<]+[^\s<.,:;"')\]])$/;

/** The text block the caret is in, unless there's none or it's code, where no rule applies */
function textBlock(root: HTMLElement, range: Range): HTMLElement | null {
  const block = closestBlock(range.startContainer, root);
  return block === root || block.tagName === "PRE" ? null : block;
}

/** The range from the start of a block to the caret */
function rangeBefore(block: HTMLElement, caret: Range): Range {
  const range = document.createRange();
  range.setStart(block, 0);
  range.setEnd(caret.startContainer, caret.startOffset);
  return range;
}

/** The range over characters `from` to `to` of a block's text, counted from its start */
function textRange(block: HTMLElement, from: number, to: number): Range {
  const range = document.createRange();
  range.setStart(block, 0);
  range.setEnd(block, 0);
  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
  let pos = 0;
  let started = false;
  for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
    const end = pos + node.length;
    if (!started && from <= end) {
      range.setStart(node, from - pos);
      started = true;
    }
    if (started && to <= end) {
      range.setEnd(node, to - pos);
      break;
    }
    pos = end;
  }
  return range;
}

function blockPlan(rule: BlockRule, m: RegExpMatchArray, replacesEnter: boolean): Plan {
  return {
    replacesEnter,
    run(root, caret) {
      const marker = rangeBefore(closestBlock(caret.startContainer, root), caret);
      marker.deleteContents();
      return rule.apply(root, marker, m);
    },
  };
}

/** Wraps the text the marker matched in `tag`, and removes the markers. `end` is the block's text length. */
function inlinePlan(rule: InlineRule, m: RegExpMatchArray, end: number): Plan {
  return {
    replacesEnter: false,
    run(root, caret) {
      const block = closestBlock(caret.startContainer, root);
      const width = rule.marker.length;
      const closeStart = end - width;
      const contentStart = closeStart - m[1].length;
      const openStart = contentStart - width;
      textRange(block, closeStart, end).deleteContents();
      textRange(block, openStart, contentStart).deleteContents();
      const nodes = selectedTextNodes(root, splitAround(textRange(block, openStart, openStart + m[1].length)));
      if (!nodes.length) return null;
      wrapEach(nodes, () => document.createElement(rule.tag));
      const wrapper = closestIn(nodes[nodes.length - 1], root, [rule.tag]);
      const after = document.createRange();
      if (wrapper) after.setStartAfter(wrapper);
      else after.setStart(nodes[nodes.length - 1], nodes[nodes.length - 1].length);
      after.collapse(true);
      return after;
    },
  };
}

/** Links the address that ends at `end`. The caret goes to `caretAt`, after the typed space if there is one. */
function linkPlan(url: string, end: number, caretAt: number, replacesEnter: boolean): Plan {
  return {
    replacesEnter,
    run(root, caret) {
      const block = closestBlock(caret.startContainer, root);
      insertLink(root, textRange(block, end - url.length, end), url);
      const at = textRange(block, caretAt, caretAt);
      at.collapse(true);
      return at;
    },
  };
}

/** Puts the ordered list at `n`, when it doesn't start at 1 */
function startAt(root: HTMLElement, range: Range, n: number): Range {
  if (n !== 1) closestIn(range.startContainer, root, ["OL"])?.setAttribute("start", String(n));
  return range;
}

function makeTask(root: HTMLElement, at: Range, checked: boolean): Range {
  const range = toggleTaskList(root, at);
  return checked ? toggleTaskAt(root, range) ?? range : range;
}

/** Makes the block a code block, with the language from the fence */
function toCodeBlock(root: HTMLElement, at: Range, language: string): Range {
  const range = setBlockType(root, at, "pre");
  const pre = closestCodeBlock(root, range);
  if (!pre) return range;
  normalizeCodeBlock(pre);
  const code = pre.querySelector("code")!;
  if (language) code.className = `language-${language}`;
  const caret = document.createRange();
  caret.setStart(code, 0);
  caret.collapse(true);
  return caret;
}

/**
 * The rule a typed character completes, if any. `range` is the caret before
 * the character is inserted.
 */
export function planTyped(root: HTMLElement, range: Range, data: string): Plan | null {
  if (data.length !== 1 || !range.collapsed) return null;
  const block = textBlock(root, range);
  if (!block) return null;
  const before = rangeBefore(block, range).toString();
  const text = before + data;
  // Block rules need the paragraph to hold only what's before the caret
  if (data === " " && block.tagName === "P" && block.textContent === before) {
    for (const rule of TYPED_BLOCK_RULES) {
      const m = rule.match.exec(before);
      if (m) return blockPlan(rule, m, false);
    }
  }
  for (const rule of INLINE_RULES) {
    const m = rule.match.exec(text);
    if (m) return inlinePlan(rule, m, text.length);
  }
  const link = data === " " ? AUTOLINK.exec(before) : null;
  if (link) return linkPlan(link[1], before.length, before.length + 1, false);
  return null;
}

/** The rule Enter completes, if any. Block rules replace the new block, and a link leaves the Enter to split as usual. */
export function planEnter(root: HTMLElement, range: Range): Plan | null {
  if (!range.collapsed) return null;
  const block = textBlock(root, range);
  if (!block) return null;
  const before = rangeBefore(block, range).toString();
  if (block.tagName === "P" && block.textContent === before) {
    for (const rule of ENTER_BLOCK_RULES) {
      const m = rule.match.exec(before);
      if (m) return blockPlan(rule, m, true);
    }
  }
  const link = AUTOLINK.exec(before);
  if (link) return linkPlan(link[1], before.length, before.length, false);
  return null;
}
