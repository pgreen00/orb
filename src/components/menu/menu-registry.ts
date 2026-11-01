/**
 * Links between menus and the elements that open them, shared by `orb-menu`
 * and `orb-menubar`. A menu registers itself when it finds its `for` trigger.
 */

/** The menu each trigger opens */
export const menuOf = new WeakMap<Element, HTMLOrbMenuElement>();

/** The trigger each menu opens from */
export const triggerOf = new WeakMap<Element, HTMLElement>();

/** Finds the element with `id` in the same document or shadow root as `el`. */
export function findById(el: HTMLElement, id?: string): HTMLElement | null {
  if (!id) return null;
  const root = el.getRootNode() as Document | ShadowRoot;
  return root.getElementById?.(id) ?? null;
}

/**
 * Whether the latest `mousemove` actually moved the pointer. Browsers also send
 * one when a menu opens under a still pointer, which shouldn't take focus
 * from the keyboard.
 */
export const pointer = { x: NaN, y: NaN, moved: false };
if (typeof window !== "undefined") {
  window.addEventListener(
    "mousemove",
    ({ screenX, screenY }) => {
      pointer.moved = screenX !== pointer.x || screenY !== pointer.y;
      pointer.x = screenX;
      pointer.y = screenY;
    },
    { capture: true, passive: true },
  );
}

/** The `orb-mi` items that belong to `host`, skipping items of nested menus. */
export function ownItems(host: HTMLElement): HTMLOrbMiElement[] {
  const collect = (elements: Element[]): HTMLOrbMiElement[] =>
    elements.flatMap((el) => {
      if (el instanceof HTMLSlotElement) return collect(el.assignedElements({ flatten: true }));
      if (el.tagName === "ORB-MI") return [el as HTMLOrbMiElement];
      if (el.tagName === "ORB-MENU") return [];
      return collect(Array.from(el.children));
    });
  return collect(Array.from(host.children));
}
