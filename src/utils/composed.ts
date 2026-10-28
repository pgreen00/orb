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

/** Like `closest()`, but crosses slots and shadow roots. */
export function composedClosest<T extends Element>(start: Element, selector: string): T | null {
  for (let current = composedParent(start); current; current = composedParent(current)) {
    if (current instanceof Element && current.matches(selector)) return current as T;
  }
  return null;
}
