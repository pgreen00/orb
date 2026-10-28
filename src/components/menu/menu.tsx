import {
  AttachInternals,
  Component,
  Element,
  Event,
  EventEmitter,
  Host,
  Listen,
  Method,
  Prop,
  Watch,
} from "@stencil/core";
import { composedClosest, composedContains, deepActiveElement } from "../../utils/composed";

export interface MenuSelectDetail {
  /** The chosen `orb-mi` */
  item: HTMLOrbMiElement;
  /** The item's `value` */
  value?: string;
  /** The item's `checked` state after choosing it */
  checked: boolean;
}

const TYPEAHEAD_RESET_MS = 500;

/**
 * Whether the latest `mousemove` actually moved the pointer. Browsers also send
 * one when a menu opens under a still pointer, which shouldn't take focus
 * from the keyboard.
 */
const pointer = { x: NaN, y: NaN, moved: false };
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

/** The text of an item's label, without its icon or details. */
function labelOf(item: HTMLElement) {
  return Array.from(item.childNodes)
    .filter((node) => !(node instanceof HTMLElement && node.slot && node.slot !== "trigger"))
    .map((node) => node.textContent)
    .join("")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * A list of actions or options, made of `orb-mi` items. Put it in an
 * `orb-popover` for a dropdown or context menu, or set `bar` for a horizontal
 * menubar.
 *
 * For a submenu, wrap an item and a nested `orb-menu` in an `orb-popover`,
 * with the item in its `trigger` slot. Choosing an item closes every menu in
 * the chain, and opening a submenu keeps the parent open.
 *
 * @slot - `orb-mi` items, `orb-popover`s for submenus, and `orb-divider`s
 */
@Component({
  tag: "orb-menu",
  styleUrl: "menu.css",
  shadow: true,
})
export class Menu {
  @AttachInternals() internals: ElementInternals;
  @Element() el!: HTMLElement;
  private typeahead = "";
  private typeaheadTimer?: ReturnType<typeof setTimeout>;
  private observer = new MutationObserver(() => this.syncItems());

  /**
   * Lays the items out in a row and uses menubar keyboard behavior. Each item
   * usually opens a menu through an `orb-popover`.
   */
  @Prop({ reflect: true }) bar = false;

  /**
   * Accessible name for the menu
   */
  @Prop() label?: string;

  /**
   * Emitted when an item is chosen. Checkbox and radio items have already
   * toggled. Call `preventDefault()` to keep the menu open.
   */
  @Event({ cancelable: true }) orbSelect: EventEmitter<MenuSelectDetail>;

  componentWillLoad() {
    this.onRoleChange();
  }

  connectedCallback() {
    this.observer.observe(this.el, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["type", "disabled"],
    });
  }

  componentDidLoad() {
    this.syncItems();
  }

  disconnectedCallback() {
    this.observer.disconnect();
  }

  @Watch("bar")
  @Watch("label")
  onRoleChange() {
    this.internals.role = this.bar ? "menubar" : "menu";
    this.internals.ariaOrientation = this.bar ? "horizontal" : "vertical";
    this.internals.ariaLabel = this.label || null;
  }

  /**
   * Focuses the first or last item.
   * @internal
   */
  @Method()
  async focusItem(which: "first" | "last") {
    const items = this.items;
    this.focus(which === "first" ? items[0] : items[items.length - 1]);
  }

  /**
   * This menu's items: direct `orb-mi` children, the triggers of submenu
   * popovers, and items inside other wrappers or slots, but not items of
   * nested menus.
   */
  private get items(): HTMLOrbMiElement[] {
    const collect = (elements: Element[]): HTMLOrbMiElement[] =>
      elements.flatMap((el) => {
        if (el instanceof HTMLSlotElement) return collect(el.assignedElements({ flatten: true }));
        if (el.tagName === "ORB-MI") return [el as HTMLOrbMiElement];
        if (el.tagName === "ORB-POPOVER") {
          const trigger = el.querySelector<HTMLOrbMiElement>(':scope > orb-mi[slot="trigger"]');
          return trigger ? [trigger] : [];
        }
        if (el.tagName === "ORB-MENU") return [];
        return collect(Array.from(el.children));
      });
    return collect(Array.from(this.el.children));
  }

  /** The popover whose trigger is `item`, if it opens a submenu. */
  private submenuOf(item: HTMLElement) {
    const parent = item.parentElement;
    return item.slot === "trigger" && parent?.tagName === "ORB-POPOVER"
      ? (parent as HTMLOrbPopoverElement)
      : null;
  }

  /** The popover this menu is shown in, if any. */
  private get popover() {
    return composedClosest<HTMLOrbPopoverElement>(this.el, "orb-popover");
  }

  /** The menu containing the item that opened this one. */
  private get parentMenu() {
    const popover = this.popover;
    return popover ? composedClosest<HTMLOrbMenuElement>(popover, "orb-menu") : null;
  }

  /**
   * Keeps one item in the Tab order, and marks items when the menu has
   * checkable items so their labels line up.
   */
  private syncItems() {
    const items = this.items;
    const current = items.find((item) => item.tabIndex === 0) ?? items[0];
    const checkable = items.some((item) => item.type !== "normal");
    items.forEach((item) => {
      item.tabIndex = item === current ? 0 : -1;
      item.toggleAttribute("data-checkable-menu", checkable);
      item.toggleAttribute("data-bar-item", this.bar);
      item.toggleAttribute("data-submenu", !this.bar && !!this.submenuOf(item));
    });
  }

  private focus(item?: HTMLOrbMiElement, options?: FocusOptions) {
    if (!item) return;
    this.items.forEach((other) => (other.tabIndex = other === item ? 0 : -1));
    item.focus(options);
  }

  private ownItem(target: EventTarget | null) {
    const item = target instanceof HTMLElement ? target.closest("orb-mi") : null;
    return item && this.items.includes(item) ? item : null;
  }

  /**
   * Stops a click from focusing the item, so mouse users don't see a focus
   * highlight left behind after the pointer moves on.
   */
  @Listen("mousedown", { passive: false })
  onMouseDown(ev: MouseEvent) {
    if (this.ownItem(ev.target)) ev.preventDefault();
  }

  @Listen("click")
  onClick(ev: MouseEvent) {
    const item = this.ownItem(ev.target);
    // `detail` is 0 for clicks from the keyboard, which call `item.click()`.
    if (item) this.activate(item, ev.detail > 0);
  }

  /** Remembers the focused item as the one in the Tab order. */
  @Listen("focusin")
  onFocusIn(ev: FocusEvent) {
    const item = this.ownItem(ev.target);
    if (item) this.items.forEach((other) => (other.tabIndex = other === item ? 0 : -1));
  }

  /**
   * In a menu, hovering an item moves focus to it, so hover and focus don't
   * highlight different items, and closes another item's open submenu. In a
   * menubar, hovering another item switches menus while one is open.
   */
  @Listen("mousemove")
  onMouseMove(ev: MouseEvent) {
    const item = this.ownItem(ev.target);
    if (!item || !pointer.moved) return;
    const open = this.items.find((other) => other.getAttribute("aria-expanded") === "true");
    if (this.bar && (!open || item === open)) return;
    // Hover submenus close themselves once the pointer settles elsewhere,
    // which leaves time to cross other items on the way into the submenu.
    const openSubmenu = open && open !== item ? this.submenuOf(open) : null;
    if (openSubmenu && openSubmenu.showOn !== "hover") openSubmenu.hide();
    // Only moves focus that's already in the menu, such as after opening it
    // from the keyboard, so hovering never steals it from the rest of the page.
    const active = deepActiveElement();
    if (active !== item && composedContains(this.el, active)) {
      this.focus(item, { preventScroll: true });
    }
    if (this.bar) this.submenuOf(item)?.openMenu();
  }

  private activate(item: HTMLOrbMiElement, fromPointer: boolean) {
    if (item.disabled || this.submenuOf(item)) return;

    if (item.type === "checkbox") {
      item.checked = !item.checked;
    } else if (item.type === "radio") {
      item.checked = true;
      Array.from(item.parentElement?.children ?? [])
        .filter((other): other is HTMLOrbMiElement => other !== item && other.tagName === "ORB-MI")
        .filter((other) => other.type === "radio")
        .forEach((other) => (other.checked = false));
    }

    const event = this.orbSelect.emit({ item, value: item.value, checked: item.checked });
    if (!event.defaultPrevented && item.type !== "checkbox") this.closeChain(fromPointer);
  }

  /**
   * Closes this menu's popover and every parent menu's popover above it.
   * After a click, hover popovers are left open, since they close when the
   * pointer leaves.
   */
  private closeChain(fromPointer = false) {
    let menu: HTMLElement | null = this.el;
    while (menu) {
      const popover = composedClosest<HTMLOrbPopoverElement>(menu, "orb-popover");
      if (!popover) return;
      if (!(fromPointer && popover.showOn === "hover")) popover.hide();
      menu = composedClosest<HTMLOrbMenuElement>(popover, "orb-menu");
    }
  }

  @Listen("keydown")
  onKeyDown(ev: KeyboardEvent) {
    const item = this.ownItem(ev.target);
    if (!item) return;
    const items = this.items;
    const index = items.indexOf(item);
    const submenu = this.submenuOf(item);
    const rtl = getComputedStyle(this.el).direction === "rtl";
    const forward = rtl ? "ArrowLeft" : "ArrowRight";
    const backward = rtl ? "ArrowRight" : "ArrowLeft";
    const next = () => items[(index + 1) % items.length];
    const previous = () => items[(index - 1 + items.length) % items.length];
    const handled = () => {
      ev.preventDefault();
      ev.stopPropagation();
    };

    switch (ev.key) {
      case "Home":
      case "PageUp":
        handled();
        return this.focus(items[0]);
      case "End":
      case "PageDown":
        handled();
        return this.focus(items[items.length - 1]);
      case "Enter":
      case " ":
        handled();
        if (submenu) submenu.openMenu("first");
        else item.click();
        return;
      case "Tab":
        // Lets focus move on, then closes the menus.
        setTimeout(() => this.closeChain());
        return;
    }

    if (this.bar) {
      if (ev.key === forward) return handled(), this.focus(next());
      if (ev.key === backward) return handled(), this.focus(previous());
      if (ev.key === "ArrowDown" && submenu) return handled(), void submenu.openMenu("first");
      if (ev.key === "ArrowUp" && submenu) return handled(), void submenu.openMenu("last");
    } else {
      if (ev.key === "ArrowDown") return handled(), this.focus(next());
      if (ev.key === "ArrowUp") return handled(), this.focus(previous());
      if (ev.key === forward && submenu) return handled(), void submenu.openMenu("first");

      const parent = this.parentMenu;
      if (parent?.bar && (ev.key === forward || ev.key === backward)) {
        // In a menubar's menu, Left and Right move to the neighboring menu.
        handled();
        return this.moveInMenubar(parent, ev.key === forward ? 1 : -1);
      }
      if (ev.key === backward && parent) {
        // In a submenu, Left closes it and returns to its item.
        handled();
        this.popover?.hide();
        return;
      }
    }

    if (ev.key.length === 1 && !ev.ctrlKey && !ev.metaKey && !ev.altKey) {
      handled();
      this.typeaheadTo(ev.key, items, index);
    }
  }

  private moveInMenubar(bar: HTMLOrbMenuElement, step: 1 | -1) {
    const popover = this.popover;
    const trigger = popover?.querySelector<HTMLOrbMiElement>(':scope > orb-mi[slot="trigger"]');
    if (!popover || !trigger) return;
    const barItems = Array.from(bar.querySelectorAll<HTMLOrbMiElement>("orb-mi")).filter(
      (item) => item.closest("orb-menu") === bar,
    );
    const target = barItems[(barItems.indexOf(trigger) + step + barItems.length) % barItems.length];
    popover.hide();
    target.focus();
    this.submenuOf(target)?.openMenu("first");
  }

  /** Typing letters moves to the next item whose label starts with them. */
  private typeaheadTo(key: string, items: HTMLOrbMiElement[], index: number) {
    clearTimeout(this.typeaheadTimer);
    this.typeahead += key.toLowerCase();
    this.typeaheadTimer = setTimeout(() => (this.typeahead = ""), TYPEAHEAD_RESET_MS);

    const ordered = [...items.slice(index + 1), ...items.slice(0, index + 1)];
    // A repeated single letter cycles through items starting with it.
    const query = this.typeahead.split("").every((c) => c === this.typeahead[0])
      ? this.typeahead[0]
      : this.typeahead;
    const match = ordered.find((item) => labelOf(item).startsWith(query));
    this.focus(match);
  }

  render() {
    return (
      <Host>
        <slot />
      </Host>
    );
  }
}
