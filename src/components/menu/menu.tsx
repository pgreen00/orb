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
  State,
  Watch,
} from "@stencil/core";
import { autoUpdate, computePosition, flip, offset, Placement, shift, size } from "@floating-ui/dom";
import { composedClosest, composedContains, deepActiveElement } from "../../utils/composed";
import { usingKeyboard } from "../../utils/input-modality";
import { findById, menuOf, ownItems, pointer, triggerOf } from "./menu-registry";

export interface MenuSelectDetail {
  /** The chosen `orb-mi` */
  item: HTMLOrbMiElement;
  /** The item's `value` */
  value?: string;
  /** The item's `checked` state after choosing it */
  checked: boolean;
}

const TYPEAHEAD_RESET_MS = 500;
/** How long the pointer rests on an item before its submenu opens */
const SUBMENU_OPEN_MS = 100;
/** How long a submenu stays open after the pointer moves to another item */
const SUBMENU_CLOSE_MS = 300;

/** The text of an item's label, without its icon or details. */
function labelOf(item: HTMLElement) {
  return Array.from(item.childNodes)
    .filter((node) => !(node instanceof HTMLElement && node.slot))
    .map((node) => node.textContent)
    .join("")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * A list of actions or options, made of `orb-mi` items.
 *
 * Set `for` to the id of a button and the menu opens from it, as a dropdown.
 * With `show-on="context-menu"`, it opens where the element is right-clicked
 * instead. Without `for`, the menu shows inline.
 *
 * For a submenu, give an item an id and point a nested `orb-menu` at it with
 * `for`. Choosing an item closes every menu in the chain, and opening a
 * submenu keeps its parent open. For a menubar, use `orb-menubar`.
 *
 * @slot - `orb-mi` items, `orb-divider`s, and submenus
 */
@Component({
  tag: "orb-menu",
  styleUrl: "menu.css",
  shadow: true,
})
export class Menu {
  @AttachInternals() internals: ElementInternals;
  @Element() el!: HTMLOrbMenuElement;

  private triggerEl?: HTMLElement;
  private anchorPoint?: DOMRect;
  private pendingFocus?: "first" | "last";
  private disposers: (() => void)[] = [];
  private stopPositioning?: () => void;
  private typeahead = "";
  private typeaheadTimer?: ReturnType<typeof setTimeout>;
  private openTimer?: ReturnType<typeof setTimeout>;
  private closeTimer?: ReturnType<typeof setTimeout>;
  private hoveredItem?: HTMLOrbMiElement;
  private observer = new MutationObserver(() => this.syncItems());

  @State() open = false;

  /**
   * Id of the element that opens the menu, in the same document or shadow
   * root. Without it, the menu shows inline.
   */
  @Prop() for?: string;

  /**
   * - **click**: Opens when the trigger is clicked, or pressed with Enter,
   *   Space, or Down.
   * - **context-menu**: Opens where the trigger is right-clicked, or with the
   *   context menu key or Shift+F10.
   */
  @Prop() showOn: "click" | "context-menu" = "click";

  /**
   * Where the menu opens. Defaults to below the trigger, or beside the item
   * for a submenu. It flips to the other side when there isn't room.
   */
  @Prop() placement?: Placement;

  /**
   * Accessible name for the menu. Defaults to the trigger's name.
   */
  @Prop() label?: string;

  /**
   * Emitted when an item is chosen, from this menu or a submenu. Checkbox and
   * radio items have already toggled. Call `preventDefault()` to keep the menu
   * open.
   */
  @Event({ cancelable: true }) orbSelect: EventEmitter<MenuSelectDetail>;

  componentWillLoad() {
    this.syncRole();
  }

  connectedCallback() {
    this.observer.observe(this.el, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["type", "disabled", "id"],
    });
    this.connectTrigger();
  }

  componentDidLoad() {
    // The trigger may come after the menu in the document.
    if (this.for && !this.triggerEl) this.connectTrigger();
    this.syncItems();
  }

  disconnectedCallback() {
    this.observer.disconnect();
    this.disconnectTrigger();
    this.open = false;
  }

  @Watch("for")
  @Watch("showOn")
  onTriggerChange() {
    this.disconnectTrigger();
    this.connectTrigger();
  }

  @Watch("label")
  syncRole() {
    this.internals.role = "menu";
    this.internals.ariaOrientation = "vertical";
    this.internals.ariaLabel = this.label || null;
  }

  /**
   * Opens the menu. Pass the event from a right-click to open it at the
   * pointer. Calling it again while open moves it to the new spot.
   */
  @Method()
  async show(event?: MouseEvent) {
    if (event) this.anchorPoint = new DOMRect(event.clientX, event.clientY);
    if (this.open) {
      this.startPositioning();
      return;
    }
    this.openFrom(usingKeyboard() ? "first" : undefined);
  }

  /**
   * Closes the menu and its submenus.
   */
  @Method()
  async hide() {
    this.open = false;
  }

  /**
   * Opens the menu and focuses the first or last item. Without `focus`, focus
   * stays where it is.
   * @internal
   */
  @Method()
  async openFrom(focus?: "first" | "last") {
    if (this.open) {
      if (focus) this.focusItem(focus);
      return;
    }
    this.pendingFocus = focus;
    this.open = true;
  }

  /** The menu whose item opens this one, if this is a submenu */
  private get parentMenu(): HTMLOrbMenuElement | null {
    return this.triggerEl ? composedClosest<HTMLOrbMenuElement>(this.triggerEl, "orb-menu") : null;
  }

  /** The menubar this menu opens from, if any */
  private get menubar(): HTMLOrbMenubarElement | null {
    return this.triggerEl ? composedClosest<HTMLOrbMenubarElement>(this.triggerEl, "orb-menubar") : null;
  }

  private get isSubmenu() {
    return !!this.parentMenu;
  }

  private get items() {
    return ownItems(this.el);
  }

  private get rtl() {
    return getComputedStyle(this.el).direction === "rtl";
  }

  // Trigger

  private connectTrigger() {
    if (!this.for) {
      this.el.removeAttribute("popover");
      return;
    }
    const trigger = findById(this.el, this.for);
    if (!trigger) {
      console.warn("Menu trigger not found:", this.for);
      return;
    }
    this.el.popover = "manual";
    this.triggerEl = trigger;
    menuOf.set(trigger, this.el);
    triggerOf.set(this.el, trigger);

    if (this.showOn === "context-menu") {
      this.listen(trigger, "contextmenu", this.onTriggerContextMenu);
    } else {
      trigger.ariaHasPopup = "menu";
      trigger.ariaExpanded = "false";
      (trigger as any).ariaControlsElements = [this.el];
      if (!this.label) this.el.ariaLabelledByElements = [trigger];
      this.listen(trigger, "click", this.onTriggerClick);
      // Items in menus and menubars handle their own keys.
      if (!composedClosest(trigger, "orb-menu, orb-menubar")) {
        this.listen(trigger, "keydown", this.onTriggerKeyDown);
      }
    }
    trigger.toggleAttribute("data-submenu", trigger.tagName === "ORB-MI" && this.isSubmenu);
  }

  private disconnectTrigger() {
    this.disposers.forEach((dispose) => dispose());
    this.disposers = [];
    const trigger = this.triggerEl;
    if (!trigger) return;
    if (menuOf.get(trigger) === this.el) menuOf.delete(trigger);
    trigger.removeAttribute("aria-haspopup");
    trigger.removeAttribute("aria-expanded");
    trigger.removeAttribute("data-submenu");
    this.triggerEl = undefined;
  }

  private listen<T extends Event>(target: EventTarget, type: string, handler: (ev: T) => void, options?: AddEventListenerOptions) {
    target.addEventListener(type, handler as EventListener, options);
    this.disposers.push(() => target.removeEventListener(type, handler as EventListener, options));
  }

  private onTriggerClick = () => {
    const focus = usingKeyboard() ? "first" : undefined;
    // Items that open submenus only open them, like desktop menus.
    if (this.open && !this.isSubmenu) this.open = false;
    else this.openFrom(focus);
  };

  /** Down and Up on the button open the menu on the first or last item. */
  private onTriggerKeyDown = (ev: KeyboardEvent) => {
    if (ev.key === "ArrowDown" || ev.key === "ArrowUp") {
      ev.preventDefault();
      this.openFrom(ev.key === "ArrowDown" ? "first" : "last");
    }
  };

  private onTriggerContextMenu = (ev: MouseEvent) => {
    ev.preventDefault();
    const trigger = this.triggerEl!;
    // The context menu key and Shift+F10 report 0,0, so open at the trigger.
    if (ev.clientX === 0 && ev.clientY === 0) {
      const rect = trigger.getBoundingClientRect();
      this.anchorPoint = new DOMRect(rect.left, rect.bottom);
    } else {
      this.anchorPoint = new DOMRect(ev.clientX, ev.clientY);
    }
    if (this.open) this.startPositioning();
    else this.openFrom(usingKeyboard() ? "first" : undefined);
  };

  // Opening and closing

  @Watch("open")
  async onOpenChange(open: boolean) {
    if (this.triggerEl && this.showOn === "click") this.triggerEl.ariaExpanded = String(open);
    if (open) {
      if (!this.el.isConnected || !this.el.popover) return;
      // Measured while hidden, so it doesn't flash in the wrong spot.
      this.el.style.visibility = "hidden";
      this.el.showPopover();
      await this.position();
      this.el.style.visibility = "";
      this.startPositioning();
      document.addEventListener("pointerdown", this.onDocumentPointerDown, true);
      document.addEventListener("keydown", this.onDocumentKeyDown);
      if (this.pendingFocus) this.focusItem(this.pendingFocus);
      this.pendingFocus = undefined;
    } else {
      clearTimeout(this.openTimer);
      clearTimeout(this.closeTimer);
      this.items.forEach((item) => menuOf.get(item)?.hide());
      // Returns focus to the trigger if it was in the menu, such as after
      // Escape or choosing an item with the keyboard.
      if (composedContains(this.el, deepActiveElement())) this.triggerEl?.focus();
      document.removeEventListener("pointerdown", this.onDocumentPointerDown, true);
      document.removeEventListener("keydown", this.onDocumentKeyDown);
      this.stopPositioning?.();
      this.stopPositioning = undefined;
      if (this.el.matches(":popover-open")) this.el.hidePopover();
      if (this.showOn !== "context-menu") this.anchorPoint = undefined;
    }
  }

  /** Whether the event happened in this menu, its trigger, or one of its submenus. */
  private inChain(ev: Event) {
    for (const node of ev.composedPath()) {
      if (!(node instanceof HTMLElement) || node.tagName !== "ORB-MENU") continue;
      for (let menu: Element | null = node; menu; menu = triggerOf.get(menu) ? composedClosest(triggerOf.get(menu)!, "orb-menu") : null) {
        if (menu === this.el) return true;
      }
    }
    return false;
  }

  private onDocumentPointerDown = (ev: PointerEvent) => {
    if (this.inChain(ev)) return;
    const onTrigger = !!this.triggerEl && ev.composedPath().includes(this.triggerEl);
    // A press on the trigger toggles it through the click instead, except for
    // context menus, where a right-click there moves the menu.
    if (onTrigger && (this.showOn === "click" || ev.button === 2)) return;
    this.open = false;
  };

  /** Escape closes the innermost open menu, even when focus is on the trigger. */
  private onDocumentKeyDown = (ev: KeyboardEvent) => {
    if (ev.key !== "Escape" || ev.defaultPrevented || this.hasOpenSubmenu()) return;
    ev.preventDefault();
    this.open = false;
  };

  private hasOpenSubmenu() {
    return this.items.some((item) => menuOf.get(item)?.matches(":popover-open"));
  }

  /** Closes this menu and every menu above it. */
  private closeChain() {
    const parent = this.parentMenu;
    this.open = false;
    // Parents close after, so focus steps back to each trigger in turn.
    if (parent?.matches(":popover-open")) parent.hide().then(() => this.closeParents(parent));
  }

  private closeParents(menu: HTMLElement) {
    const trigger = triggerOf.get(menu);
    const parent = trigger ? composedClosest<HTMLOrbMenuElement>(trigger, "orb-menu") : null;
    if (parent?.matches(":popover-open")) parent.hide().then(() => this.closeParents(parent));
  }

  // Positioning

  private get reference() {
    const point = this.anchorPoint;
    return point ? { getBoundingClientRect: () => point } : this.triggerEl!;
  }

  private startPositioning() {
    this.stopPositioning?.();
    if (!this.triggerEl && !this.anchorPoint) return;
    this.stopPositioning = autoUpdate(this.reference, this.el, () => this.position());
  }

  private async position() {
    if (!this.triggerEl && !this.anchorPoint) return;
    const submenu = this.isSubmenu;
    const placement: Placement =
      this.placement ?? (submenu ? (this.rtl ? "left-start" : "right-start") : "bottom-start");
    const { x, y } = await computePosition(this.reference, this.el, {
      placement,
      strategy: "fixed",
      middleware: [
        // Lines a submenu's first item up with the item that opened it.
        offset(submenu ? { mainAxis: 2, crossAxis: -5 } : this.anchorPoint ? 2 : 4),
        flip(),
        shift({ padding: 4 }),
        size({
          padding: 4,
          apply: ({ availableHeight }) => {
            this.el.style.maxHeight = `${Math.max(availableHeight, 120)}px`;
          },
        }),
      ],
    });
    this.el.style.left = `${x}px`;
    this.el.style.top = `${y}px`;
  }

  // Items

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
    });
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
    if (item) this.activate(item);
  }

  /** Remembers the focused item as the one in the Tab order. */
  @Listen("focusin")
  onFocusIn(ev: FocusEvent) {
    const item = this.ownItem(ev.target);
    if (item) this.items.forEach((other) => (other.tabIndex = other === item ? 0 : -1));
  }

  /**
   * Hovering an item opens its submenu after a short pause, and closes the
   * submenus of other items once the pointer settles. It also moves focus to
   * the item if focus is already in the menu, so hover and focus don't
   * highlight different items.
   */
  @Listen("mousemove")
  onMouseMove(ev: MouseEvent) {
    const item = this.ownItem(ev.target);
    if (!item || !pointer.moved || item === this.hoveredItem) return;
    this.hoveredItem = item;

    clearTimeout(this.openTimer);
    const submenu = menuOf.get(item);
    if (submenu && !item.disabled) {
      this.openTimer = setTimeout(() => submenu.openFrom(), SUBMENU_OPEN_MS);
    }
    clearTimeout(this.closeTimer);
    this.closeTimer = setTimeout(() => {
      for (const other of this.items) {
        const menu = menuOf.get(other);
        // Left open while the pointer is on its way into it.
        if (other !== this.hoveredItem && menu?.matches(":popover-open:not(:hover)")) menu.hide();
      }
    }, SUBMENU_CLOSE_MS);

    const active = deepActiveElement();
    if (active !== item && composedContains(this.el, active)) {
      this.focus(item, { preventScroll: true });
    }
  }

  @Listen("mouseleave")
  onMouseLeave() {
    this.hoveredItem = undefined;
    clearTimeout(this.openTimer);
  }

  private activate(item: HTMLOrbMiElement) {
    // Items that open submenus are handled by the submenu.
    if (item.disabled || menuOf.has(item)) return;

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
    if (!event.defaultPrevented && item.type !== "checkbox") this.closeChain();
  }

  @Listen("keydown")
  onKeyDown(ev: KeyboardEvent) {
    const item = this.ownItem(ev.target);
    if (!item) return;
    const items = this.items;
    const index = items.indexOf(item);
    const submenu = menuOf.get(item);
    const forward = this.rtl ? "ArrowLeft" : "ArrowRight";
    const backward = this.rtl ? "ArrowRight" : "ArrowLeft";
    const handled = () => {
      ev.preventDefault();
      ev.stopPropagation();
    };

    switch (ev.key) {
      case "ArrowDown":
        handled();
        return this.focus(items[(index + 1) % items.length]);
      case "ArrowUp":
        handled();
        return this.focus(items[(index - 1 + items.length) % items.length]);
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
        if (submenu) submenu.openFrom("first");
        else item.click();
        return;
      case "Escape":
        if (!this.el.popover) return;
        handled();
        this.open = false;
        return;
      case "Tab":
        // Lets focus move on, then closes the menus.
        setTimeout(() => this.closeChain());
        return;
    }

    if (ev.key === forward && submenu) {
      handled();
      submenu.openFrom("first");
      return;
    }
    if ((ev.key === forward || ev.key === backward) && this.menubar && this.triggerEl) {
      // In a menubar's menu, Left and Right move to the neighboring menu.
      handled();
      this.menubar.moveFrom(this.triggerEl, ev.key === forward ? 1 : -1);
      return;
    }
    if (ev.key === backward && this.isSubmenu) {
      // In a submenu, Left closes it and returns to its item.
      handled();
      this.open = false;
      return;
    }

    if (ev.key.length === 1 && !ev.ctrlKey && !ev.metaKey && !ev.altKey) {
      handled();
      this.typeaheadTo(ev.key, items, index);
    }
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
    this.focus(ordered.find((item) => labelOf(item).startsWith(query)));
  }

  render() {
    return (
      <Host>
        <slot />
      </Host>
    );
  }
}
