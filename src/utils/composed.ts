/**
 * Helpers for walking the flattened (composed) tree: through slots into the
 * shadow roots they render in, and out of shadow roots to their hosts.
 */

/** The parent in the flattened tree: the assigned slot, the parent, or the shadow host. */
function composedParent(node: Node): Node | null {
  if (node instanceof Element && node.assignedSlot) return node.assignedSlot;
  if (node.parentNode instanceof ShadowRoot) return node.parentNode.host;
  return node.parentNode;
}

/** The focused element, looking inside open shadow roots. */
export function deepActiveElement(): Element | null {
  let active = document.activeElement;
  while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
  return active;
}

/** Whether `node` renders inside `ancestor`, counting slotted and shadow content. */
export function composedContains(ancestor: Node, node: Node | null): boolean {
  for (let current = node; current; current = composedParent(current)) {
    if (current === ancestor) return true;
  }
  return false;
}

/**
 * The selection inside `root`, as character offsets from its start. Null when
 * the selection is elsewhere. `getSelection()` alone reports the host for a
 * selection in a shadow root, so this reads the composed ranges instead.
 */
export function selectionOffsets(root: HTMLElement): { start: number; end: number } | null {
  const selection = window.getSelection();
  if (!selection) return null;
  const top = root.getRootNode();
  const [range] = selection.getComposedRanges({
    shadowRoots: top instanceof ShadowRoot ? [top] : [],
  });
  if (!range || !root.contains(range.startContainer) || !root.contains(range.endContainer)) {
    return null;
  }
  return {
    start: offsetWithin(root, range.startContainer, range.startOffset),
    end: offsetWithin(root, range.endContainer, range.endOffset),
  };
}

function offsetWithin(root: Node, node: Node, offset: number): number {
  const range = document.createRange();
  range.selectNodeContents(root);
  range.setEnd(node, offset);
  return range.toString().length;
}

/** Like `closest()`, but crosses slots and shadow roots. */
export function composedClosest<T extends Element>(start: Element, selector: string): T | null {
  for (let current = composedParent(start); current; current = composedParent(current)) {
    if (current instanceof Element && current.matches(selector)) return current as T;
  }
  return null;
}
