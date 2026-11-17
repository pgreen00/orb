import { isElement, length } from "./dom";
import { isAtom, TEXT_BLOCK_SELECTOR } from "./schema";

/**
 * A caret can sit on the editor between two blocks, such as after a click below
 * the last line in Safari. Edits need it inside a block, so it moves to the end
 * of the block before it, or the start of the block after it.
 */
export function settleCaret(root: HTMLElement, range: Range): Range {
  if (!range.collapsed || range.startContainer !== root) return range;
  const isBlock = (node: Node | undefined) => !!node && isElement(node) && node.matches(TEXT_BLOCK_SELECTOR);
  const before = root.childNodes[range.startOffset - 1];
  const after = root.childNodes[range.startOffset];
  const settled = document.createRange();
  if (isBlock(before)) {
    settled.selectNodeContents(before);
    settled.collapse(false);
  } else if (isBlock(after)) {
    settled.setStart(after, 0);
    settled.collapse(true);
  } else {
    return range;
  }
  return settled;
}

/** The non-editable piece, such as an image or rule, that `node` is or is inside of */
export function pieceAt(node: Node, root: HTMLElement): HTMLElement | null {
  for (let n: Node | null = node; n && n !== root; n = n.parentNode) {
    if (isElement(n) && isAtom(n)) return n as HTMLElement;
  }
  return null;
}

/**
 * A caret can't go inside a piece, or sit just before a task checkbox, so it
 * moves to just after that piece. Returns null when the caret is already fine.
 */
export function caretAfterPiece(range: Range, root: HTMLElement): Range | null {
  if (!range.collapsed) return null;
  const node = range.startContainer;
  const ahead = isElement(node) ? node.childNodes[range.startOffset] : undefined;
  const piece = pieceAt(node, root) ?? (ahead && isElement(ahead) && ahead.tagName === "INPUT" ? ahead : null);
  if (!piece) return null;
  const after = document.createRange();
  after.setStartAfter(piece);
  after.collapse(true);
  return after;
}

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

/** The text block around a node, or `root` when there isn't one inside it. */
export function closestBlock(node: Node, root: HTMLElement): HTMLElement {
  const el = isElement(node) ? node : node.parentElement;
  const block = el?.closest(TEXT_BLOCK_SELECTOR) as HTMLElement | null;
  return block && block !== root && root.contains(block) ? block : root;
}

/**
 * A popover anchor at a caret. A collapsed range in an empty block can report
 * an all-zero rectangle, so it falls back to the block's position.
 */
export function caretAnchor(range: Range, root: HTMLElement) {
  return {
    contextElement: root,
    getBoundingClientRect() {
      const rect = range.getClientRects()[0] ?? range.getBoundingClientRect();
      if (rect.width || rect.height) return rect;
      const block = closestBlock(range.startContainer, root);
      const b = block.getBoundingClientRect();
      return new DOMRect(b.left, b.top, 0, b.height);
    },
  };
}

export interface Boundaries {
  sc: Node;
  so: number;
  ec: Node;
  eo: number;
}

export function keep(range: Range): Boundaries {
  return { sc: range.startContainer, so: range.startOffset, ec: range.endContainer, eo: range.endOffset };
}

/**
 * Rebuilds a saved range. `replaced` maps elements that were swapped for new
 * ones, such as a `<p>` renamed to `<h1>`.
 */
export function restore(b: Boundaries, root: HTMLElement, replaced = new Map<Node, Node>()): Range | null {
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
