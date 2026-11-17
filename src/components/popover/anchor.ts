/**
 * Where a popup opens: a pointer event, or anything with `getBoundingClientRect`,
 * such as a Range at a caret. A `contextElement` makes the popup follow that
 * element's scrolling.
 */
export type Anchor =
  | Pick<MouseEvent, "clientX" | "clientY">
  | { getBoundingClientRect(): DOMRect; contextElement?: Element };

/** An `Anchor` that can be measured, which is what positioning needs. */
export type VirtualAnchor = Extract<Anchor, { getBoundingClientRect(): DOMRect }>;

/** Wraps a pointer as a measurable anchor. Anchors that are already measurable are kept as they are. */
export function toVirtualAnchor(at: Anchor): VirtualAnchor {
  if ("getBoundingClientRect" in at) return at;
  const { clientX: x, clientY: y } = at;
  return { getBoundingClientRect: () => new DOMRect(x, y) };
}
