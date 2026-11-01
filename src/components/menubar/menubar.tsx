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
import { composedContains, deepActiveElement } from "../../utils/composed";
import { menuOf, ownItems, pointer } from "../menu/menu-registry";
import type { MenuSelectDetail } from "../menu/menu";

/**
 * A horizontal bar of `orb-mi` items, like the menus at the top of a desktop
 * app. Give an item an id and point an `orb-menu` at it with `for` to open a
 * menu from it. Items without a menu are chosen directly.
 *
 * Put the menus inside the menubar, so `orbSelect` from any of them reaches a
 * listener on the menubar.
 *
 * @slot - `orb-mi` items, and the `orb-menu`s they open
 */
@Component({
  tag: "orb-menubar",
  styleUrl: "menubar.css",
  shadow: true,
})
export class Menubar {
  @AttachInternals() internals: ElementInternals;
  @Element() el!: HTMLOrbMenubarElement;
  private observer = new MutationObserver(() => this.syncItems());

  /**
   * Accessible name for the menubar
   */
  @Prop() label?: string;

  /**
   * Emitted when an item without a menu is chosen. Items in the menus emit
   * `orbSelect` from their `orb-menu`, which bubbles up through the menubar
   * when the menu is inside it.
   */
  @Event() orbSelect: EventEmitter<MenuSelectDetail>;

  componentWillLoad() {
    this.syncRole();
  }

  connectedCallback() {
    this.observer.observe(this.el, { childList: true, subtree: true });
  }

  componentDidLoad() {
    this.syncItems();
  }

  disconnectedCallback() {
    this.observer.disconnect();
  }

  @Watch("label")
  syncRole() {
    this.internals.role = "menubar";
    this.internals.ariaOrientation = "horizontal";
    this.internals.ariaLabel = this.label || null;
  }

  /**
   * Moves from the item that opened a menu to its neighbor, opening the
   * neighbor's menu. Used by Left and Right in an open menu.
   * @internal
   */
  @Method()
  async moveFrom(item: HTMLElement, step: 1 | -1) {
    const items = this.items;
    const index = items.indexOf(item as HTMLOrbMiElement);
    if (index < 0) return;
    const target = items[(index + step + items.length) % items.length];
    await menuOf.get(item)?.hide();
    this.focus(target);
    menuOf.get(target)?.openFrom("first");
  }

  private get items() {
    return ownItems(this.el);
  }

  private get openItem() {
    return this.items.find((item) => menuOf.get(item)?.matches(":popover-open"));
  }

  /** Keeps one item in the Tab order. */
  private syncItems() {
    const items = this.items;
    const current = items.find((item) => item.tabIndex === 0) ?? items[0];
    items.forEach((item) => {
      item.tabIndex = item === current ? 0 : -1;
      item.setAttribute("data-bar-item", "");
    });
  }

  private focus(item?: HTMLOrbMiElement) {
    if (!item) return;
    this.items.forEach((other) => (other.tabIndex = other === item ? 0 : -1));
    item.focus();
  }

  private ownItem(target: EventTarget | null) {
    const item = target instanceof HTMLElement ? target.closest("orb-mi") : null;
    return item && this.items.includes(item) ? item : null;
  }

  /** Remembers the focused item as the one in the Tab order. */
  @Listen("focusin")
  onFocusIn(ev: FocusEvent) {
    const item = this.ownItem(ev.target);
    if (item) this.items.forEach((other) => (other.tabIndex = other === item ? 0 : -1));
  }

  /** Clicking an item doesn't leave a focus highlight behind. */
  @Listen("mousedown", { passive: false })
  onMouseDown(ev: MouseEvent) {
    if (this.ownItem(ev.target)) ev.preventDefault();
  }

  /** Items with a menu are opened by the menu. Other items are chosen. */
  @Listen("click")
  onClick(ev: MouseEvent) {
    const item = this.ownItem(ev.target);
    if (!item || item.disabled || menuOf.has(item)) return;
    this.orbSelect.emit({ item, value: item.value, checked: item.checked });
  }

  /** Once a menu is open, hovering another item switches to its menu. */
  @Listen("mousemove")
  onMouseMove(ev: MouseEvent) {
    const item = this.ownItem(ev.target);
    const open = this.openItem;
    if (!item || !open || item === open || !pointer.moved) return;
    menuOf.get(open)?.hide();
    if (composedContains(this.el, deepActiveElement())) this.focus(item);
    menuOf.get(item)?.openFrom();
  }

  @Listen("keydown")
  onKeyDown(ev: KeyboardEvent) {
    const item = this.ownItem(ev.target);
    if (!item) return;
    const items = this.items;
    const index = items.indexOf(item);
    const menu = menuOf.get(item);
    const rtl = getComputedStyle(this.el).direction === "rtl";
    const handled = () => {
      ev.preventDefault();
      ev.stopPropagation();
    };
    const moveTo = (target: HTMLOrbMiElement) => {
      // With a menu open, moving opens the neighbor's menu too.
      const wasOpen = !!this.openItem;
      menu?.hide();
      this.focus(target);
      if (wasOpen) menuOf.get(target)?.openFrom();
    };

    switch (ev.key) {
      case "ArrowRight":
      case "ArrowLeft": {
        handled();
        const step = (ev.key === "ArrowRight") !== rtl ? 1 : -1;
        return moveTo(items[(index + step + items.length) % items.length]);
      }
      case "Home":
        handled();
        return moveTo(items[0]);
      case "End":
        handled();
        return moveTo(items[items.length - 1]);
      case "ArrowDown":
      case "Enter":
      case " ":
        handled();
        if (menu) menu.openFrom("first");
        else if (ev.key !== "ArrowDown") item.click();
        return;
      case "ArrowUp":
        handled();
        menu?.openFrom("last");
        return;
    }
  }

  render() {
    return (
      <Host>
        <slot />
      </Host>
    );
  }
}
