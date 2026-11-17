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
import { toggleState } from "../../utils/custom-states";
import { CloseIcon, SearchIcon } from "../../utils/icons";
import { usingKeyboard } from "../../utils/input-modality";
import { findById, menuOf, ownElements, ownItems, pointer, triggerOf } from "./menu-registry";

export interface MenuSelectDetail {
  /** The chosen `orb-mi` */
  item: HTMLOrbMiElement;
  /** The item's `value` */
  value?: string;
  /** The item's `checked` state after choosing it */
  checked: boolean;
}

export interface MenuSearchDetail {
  /** The text in the search field */
  query: string;
}

const TYPEAHEAD_RESET_MS = 500;
/** How long the pointer rests on an item before its submenu opens */
const SUBMENU_OPEN_MS = 100;
/** How long a submenu stays open after the pointer moves to another item */
const SUBMENU_CLOSE_MS = 300;
/** Menus with `search` fill the screen on small touch screens */
const FULLSCREEN_QUERY = "(max-width: 767px) and (pointer: coarse)";

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

/** Whether a slot has any elements assigned to it. */
const hasContent = (ev: Event) => (ev.target as HTMLSlotElement).assignedElements().length > 0;

/**
 * A list of actions or options, made of `orb-mi` items.
 *
 * @slot - `orb-mi` items, `orb-divider`s, and submenus
 * @slot search-end - Controls at the end of the search field, such as a filter menu
 * @slot footer - Content below the items, such as a button
 *
 * @part mobile-bar - The title and close button, shown when the menu fills the screen
 * @part close-button - The close button in the mobile bar
 * @part search - The row with the search field
 * @part search-input - The search field
 * @part list - The scrolling items, which have the menu or listbox role
 * @part footer - The footer, shown when it has content
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
  private listEl?: HTMLElement;
  private inputEl?: HTMLInputElement;
  private anchorPoint?: DOMRect;
  private pendingFocus?: "first" | "last";
  private disposers: (() => void)[] = [];
  private stopPositioning?: () => void;
  private typeahead = "";
  private typeaheadTimer?: ReturnType<typeof setTimeout>;
  private openTimer?: ReturnType<typeof setTimeout>;
  private closeTimer?: ReturnType<typeof setTimeout>;
  private hoveredItem?: HTMLOrbMiElement;
  private fadeAnimation?: Animation;
  /** The highlighted result of a search, which keeps focus in the search field */
  private activeItem?: HTMLOrbMiElement;
  /** The search text, and whether `orbSearch` replaced the built-in filter */
  private query = "";
  private customFilter = false;
  private fullscreenQuery = matchMedia(FULLSCREEN_QUERY);
  private observer = new MutationObserver(() => this.syncItems());

  @State() open = false;
  @State() hasFooter = false;
  @State() fullscreen = false;

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
   * - **actions**: A menu of commands. Items use their `type` to be checkable.
   * - **single**: A listbox where one option is selected. Choosing an option
   *   selects it and closes the menu.
   * - **multi**: A listbox where any number of options are selected. Choosing
   *   an option toggles it and keeps the menu open.
   */
  @Prop() mode: "actions" | "single" | "multi" = "actions";

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
   * Shows a search field above the items that filters them by label. Typing
   * highlights the first match, and Enter chooses it. On small touch screens
   * the menu fills the screen.
   */
  @Prop() search = false;

  /**
   * The search field's accessible name and placeholder
   */
  @Prop() searchLabel = "Search";

  /**
   * Emitted when the search text changes. The built-in filter hides items
   * whose label doesn't contain the text. Call `preventDefault()` to filter
   * yourself, such as by setting `hidden` on items.
   */
  @Event({ cancelable: true }) orbSearch: EventEmitter<MenuSearchDetail>;

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
      attributeFilter: ["type", "disabled", "id", "hidden"],
    });
    this.fullscreenQuery.addEventListener("change", this.onFullscreenQueryChange);
    this.connectTrigger();
  }

  componentDidLoad() {
    // The trigger may come after the menu in the document.
    if (this.for && !this.triggerEl) this.connectTrigger();
    this.keepOneSelected();
    this.syncItems();
    this.syncRole();
  }

  disconnectedCallback() {
    this.observer.disconnect();
    this.fullscreenQuery.removeEventListener("change", this.onFullscreenQueryChange);
    this.disconnectTrigger();
    this.open = false;
  }

  @Watch("for")
  @Watch("showOn")
  onTriggerChange() {
    this.disconnectTrigger();
    this.connectTrigger();
    this.syncItems();
  }

  /**
   * Names the list and gives the menu its role. The list has the menu or
   * listbox role. A menu with a footer or search is a dialog, which holds the
   * list and those controls.
   */
  @Watch("label")
  @Watch("mode")
  @Watch("search")
  @Watch("hasFooter")
  @Watch("fullscreen")
  syncRole() {
    const dialog = !!this.triggerEl && this.popupRole === "dialog";
    this.internals.role = dialog ? "dialog" : null;
    this.internals.ariaModal = dialog && this.fullscreen ? "true" : null;
    this.internals.ariaLabel = dialog ? this.label || null : null;
    this.el.ariaLabelledByElements = dialog && !this.label && this.triggerEl ? [this.triggerEl] : null;

    if (this.listEl) {
      this.listEl.ariaLabelledByElements = this.label || !this.triggerEl ? null : [this.triggerEl];
    }
    if (this.triggerEl && this.showOn === "click") this.triggerEl.ariaHasPopup = this.popupRole;
  }

  @Watch("fullscreen")
  onFullscreenChange(fullscreen: boolean) {
    toggleState(this.internals.states, "fullscreen", fullscreen);
  }

  /** Switching modes changes which options are selected. */
  @Watch("mode")
  onModeChange() {
    this.keepOneSelected();
    this.syncItems();
  }

  @Watch("search")
  onSearchChange() {
    this.resetSearch();
    this.syncItems();
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
      this.focusFrom(focus);
      return;
    }
    this.pendingFocus = focus;
    this.open = true;
  }

  /**
   * The menu whose item opens this one, if this is a submenu. Popups from
   * other controls, such as a filter in the search field, aren't submenus.
   */
  private get parentMenu(): HTMLOrbMenuElement | null {
    if (this.triggerEl?.tagName !== "ORB-MI") return null;
    return composedClosest<HTMLOrbMenuElement>(this.triggerEl, "orb-menu");
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

  /** Items that can be reached with the keyboard, which excludes hidden and filtered-out items. */
  private get navigableItems() {
    return this.items.filter((item) => !item.hidden && !item.hasAttribute("data-search-hidden"));
  }

  private get rtl() {
    return getComputedStyle(this.el).direction === "rtl";
  }

  /** Whether the menu is a `single` or `multi` listbox rather than a list of actions. */
  private get listbox() {
    return this.mode !== "actions";
  }

  /** The role of the list. Search needs a listbox, which the search field's highlight points into. */
  private get listRole(): "listbox" | "menu" {
    return this.search || this.listbox ? "listbox" : "menu";
  }

  /** The role the trigger reports for the popup */
  private get popupRole(): "dialog" | "listbox" | "menu" {
    return this.search || this.hasFooter ? "dialog" : this.listRole;
  }

  /** The type an item acts as. Items in `single` and `multi` menus act as radio and checkbox items. */
  private typeOf(item: HTMLOrbMiElement): "normal" | "checkbox" | "radio" {
    if (this.mode === "single") return "radio";
    if (this.mode === "multi") return "checkbox";
    return item.type;
  }

  /** The checked option that a listbox focuses when it opens. */
  private get selectedItem() {
    return this.listbox ? this.navigableItems.find((item) => item.checked) : undefined;
  }

  // Trigger

  private connectTrigger() {
    this.bindTrigger();
    this.syncRole();
  }

  private bindTrigger() {
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
      trigger.ariaExpanded = "false";
      this.listen(trigger, "click", this.onTriggerClick);
      // Items in menus and menubars handle their own keys. Other controls in
      // a menu, such as a filter button, open their menu with the arrow keys.
      const isItem = trigger.tagName === "ORB-MI" && !!composedClosest(trigger, "orb-menu, orb-menubar");
      if (!isItem) this.listen(trigger, "keydown", this.onTriggerKeyDown);
    }
    trigger.toggleAttribute("data-submenu", this.isSubmenu);
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
      this.fullscreen = this.search && this.fullscreenQuery.matches;
      if (this.fullscreen) {
        // Full-screen menus don't use the position they'd measure for an anchor.
        this.clearPlacement();
        this.showPopoverOnce();
      } else {
        // Measured while hidden, so it doesn't flash in the wrong spot.
        this.el.style.visibility = "hidden";
        this.showPopoverOnce();
        await this.position();
        this.el.style.visibility = "";
        this.startPositioning();
      }
      this.fade(true);
      document.addEventListener("pointerdown", this.onDocumentPointerDown, true);
      document.addEventListener("keydown", this.onDocumentKeyDown);
      this.focusFrom(this.pendingFocus);
      this.pendingFocus = undefined;
    } else {
      clearTimeout(this.openTimer);
      clearTimeout(this.closeTimer);
      this.el.querySelectorAll<HTMLOrbMenuElement>("orb-menu").forEach((menu) => menu.hide());
      // Returns focus to the trigger if it was in the menu, such as after
      // Escape or choosing an item with the keyboard.
      if (composedContains(this.el, deepActiveElement())) this.triggerEl?.focus();
      document.removeEventListener("pointerdown", this.onDocumentPointerDown, true);
      document.removeEventListener("keydown", this.onDocumentKeyDown);
      this.stopPositioning?.();
      this.stopPositioning = undefined;
      if (this.showOn !== "context-menu") this.anchorPoint = undefined;
      this.resetSearch();
      const fading = this.el.matches(":popover-open") ? this.fade(false) : Promise.resolve(true);
      fading.then((done) => {
        // Reopening during the fade cancels it, so the menu stays open.
        if (!done) return;
        if (this.el.matches(":popover-open")) this.el.hidePopover();
        this.fullscreen = false;
      });
    }
  }

  /** A reopened menu may still be showing while it fades out. */
  private showPopoverOnce() {
    if (!this.el.matches(":popover-open")) this.el.showPopover();
  }

  /** Fades the menu in or out, as `orb-popover` does. Resolves false if another fade cancels it. */
  private fade(show: boolean): Promise<boolean> {
    this.fadeAnimation?.cancel();
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const keyframes = show ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 1 }, { opacity: 0 }];
    this.fadeAnimation = this.el.animate(keyframes, { duration: reduce ? 0 : 150, easing: "ease-in-out" });
    return this.fadeAnimation.finished.then(() => true, () => false);
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
    if (ev.key !== "Escape" || ev.defaultPrevented || this.hasOpenPopup()) return;
    ev.preventDefault();
    this.open = false;
  };

  /** Whether a submenu or another popup opened from inside this menu is open. */
  private hasOpenPopup() {
    return Array.from(this.el.querySelectorAll("orb-menu")).some((menu) => menu.matches(":popover-open"));
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

  /**
   * After Tab, closes this menu and each menu above it that focus has left.
   * Stops at the first menu that still holds focus.
   */
  private closeLeftBehind() {
    const focus = deepActiveElement();
    for (let menu: HTMLOrbMenuElement | null = this.el; menu && !composedContains(menu, focus); ) {
      const trigger = triggerOf.get(menu);
      const parent = trigger ? composedClosest<HTMLOrbMenuElement>(trigger, "orb-menu") : null;
      menu.hide();
      menu = parent;
    }
  }

  // Positioning

  private get reference() {
    const point = this.anchorPoint;
    return point ? { getBoundingClientRect: () => point } : this.triggerEl!;
  }

  private startPositioning() {
    this.stopPositioning?.();
    this.stopPositioning = undefined;
    if (this.fullscreen || (!this.triggerEl && !this.anchorPoint)) return;
    this.stopPositioning = autoUpdate(this.reference, this.el, () => this.position());
  }

  private clearPlacement() {
    this.el.style.left = "";
    this.el.style.top = "";
    this.el.style.maxHeight = "";
  }

  /** Full screen when a search menu opens on a small touch screen, and anchored otherwise. */
  private onFullscreenQueryChange = () => {
    if (!this.open) return;
    this.fullscreen = this.search && this.fullscreenQuery.matches;
    if (this.fullscreen) {
      this.stopPositioning?.();
      this.stopPositioning = undefined;
      this.clearPlacement();
    } else {
      this.startPositioning();
    }
  };

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
   * Keeps one item in the Tab order, marks items when the menu has checkable
   * items so their labels line up, and tells items which mode and role the
   * menu uses. In a menu with search, the search field is the tab stop instead.
   */
  private syncItems() {
    const items = this.items;
    const navigable = this.navigableItems;
    const current = navigable.find((item) => item.tabIndex === 0) ?? this.selectedItem ?? navigable[0];
    const checkable = items.some((item) => this.typeOf(item) !== "normal");
    const isListbox = this.listRole === "listbox";
    items.forEach((item) => {
      item.tabIndex = !this.search && item === current ? 0 : -1;
      item.toggleAttribute("data-checkable-menu", checkable);
      item.menuMode = this.mode;
      item.listbox = isListbox;
    });
    // Listboxes can't contain separators, so dividers are hidden from screen readers.
    ownElements(this.el, "ORB-DIVIDER").forEach((divider) => (divider.ariaHidden = isListbox ? "true" : null));
    this.applyFilter();
    this.warnIfUnsupported();
  }

  /** A single-select menu has one selection, so extra checked options are cleared. */
  private keepOneSelected() {
    if (this.mode !== "single") return;
    this.items.filter((item) => item.checked).slice(1).forEach((item) => (item.checked = false));
  }

  /** Hides the items and dividers that don't match the search text, unless `orbSearch` filters. */
  private applyFilter() {
    const query = this.query.trim().toLowerCase();
    const filtering = !!query && !this.customFilter;
    this.items.forEach((item) =>
      item.toggleAttribute("data-search-hidden", filtering && !labelOf(item).includes(query)),
    );
    ownElements(this.el, "ORB-DIVIDER").forEach((divider) => divider.toggleAttribute("data-search-hidden", filtering));
  }

  /** Submenus, menubars, and context menus don't work in a listbox or with search, so warn about them. */
  private warnIfUnsupported() {
    const name = this.listbox ? `Menu mode "${this.mode}"` : "A menu with search";
    if (this.listbox && this.triggerEl && this.showOn === "context-menu") {
      console.warn(`Menu mode "${this.mode}" doesn't support show-on="context-menu".`);
    }
    if ((this.listbox || this.search) && (this.isSubmenu || this.menubar)) {
      console.warn(`${name} doesn't support submenus or menubars.`);
    }
    if ((this.listbox || this.search) && this.items.some((item) => menuOf.has(item))) {
      console.warn(`${name} doesn't support items that open submenus.`);
    }
  }

  /**
   * Focuses the first or last item, or the selected option. In a menu with
   * `search`, focuses the search field and highlights that item instead.
   */
  @Method()
  async focusItem(which: "first" | "last") {
    this.focusFrom(which);
  }

  /**
   * Focuses the search field in a menu with `search`, which takes focus when the
   * menu opens, except full screen, where the keyboard would cover the list. Otherwise
   * focuses the selected option, or the first or last item. Without `which`,
   * focus stays where it is.
   */
  private focusFrom(which?: "first" | "last") {
    if (this.search) {
      if (which || !this.fullscreen) this.focusSearch(which);
    } else if (which) {
      this.focus(this.selectedItem ?? this.edgeItem(which));
    }
  }

  private focusSearch(which?: "first" | "last") {
    this.inputEl?.focus();
    const target = this.selectedItem ?? (which ? this.edgeItem(which) : undefined);
    this.setActive(target, which ? "keyboard" : "pointer");
  }

  private edgeItem(which: "first" | "last") {
    const items = this.navigableItems;
    return which === "first" ? items[0] : items[items.length - 1];
  }

  /**
   * Highlights an item in a menu with search. Focus stays in the search field,
   * which points at the highlighted item with `aria-activedescendant`.
   */
  private setActive(item?: HTMLOrbMiElement, source: "keyboard" | "pointer" = "keyboard") {
    this.activeItem?.removeAttribute("data-active");
    this.activeItem = item;
    item?.setAttribute("data-active", source);
    if (item && source === "keyboard") item.scrollIntoView({ block: "nearest" });
    if (this.inputEl) this.inputEl.ariaActiveDescendantElement = item ?? null;
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
   * highlight left behind after the pointer moves on. In a menu with search,
   * a press keeps focus in the search field.
   */
  @Listen("mousedown", { passive: false })
  onMouseDown(ev: MouseEvent) {
    const keepFocus = this.search ? !ev.composedPath().includes(this.inputEl!) : !!this.ownItem(ev.target);
    if (keepFocus) ev.preventDefault();
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
   * submenus of other items once the pointer settles. Hover also highlights
   * the item: in a menu with search, the highlight moves while focus stays in
   * the search field. Otherwise focus moves to the item if it's already on an
   * item, so hover and focus don't highlight different items.
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

    if (this.search) {
      this.setActive(item, "pointer");
      return;
    }
    // Focus follows the pointer only when it's on an item, so hovering doesn't pull it out of a footer control.
    const active = deepActiveElement();
    if (active !== item && active?.tagName === "ORB-MI" && composedContains(this.el, active)) {
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

    const type = this.typeOf(item);
    if (type === "checkbox") {
      item.checked = !item.checked;
    } else if (type === "radio") {
      item.checked = true;
      // A single-select menu has one selection, so it clears every option.
      const peers =
        this.mode === "single"
          ? this.items
          : Array.from(item.parentElement?.children ?? []).filter(
              (other): other is HTMLOrbMiElement => other.tagName === "ORB-MI",
            );
      peers
        .filter((other) => other !== item && this.typeOf(other) === "radio")
        .forEach((other) => (other.checked = false));
    }

    const event = this.orbSelect.emit({ item, value: item.value, checked: item.checked });
    if (!event.defaultPrevented && type !== "checkbox") this.closeChain();
  }

  /** The search text changed, so filter the items, unless `orbSearch` handles it. */
  private onSearchInput = () => {
    this.query = this.inputEl?.value ?? "";
    this.customFilter = this.orbSearch.emit({ query: this.query }).defaultPrevented;
    this.applyFilter();
    // The top match is highlighted, so Enter chooses it.
    this.setActive(this.query.trim() ? this.navigableItems[0] : this.selectedItem, "keyboard");
  };

  /** Arrow keys move the highlight, and Enter chooses it. Other keys edit the text. */
  private onSearchKeyDown = (ev: KeyboardEvent) => {
    const items = this.navigableItems;
    const index = this.activeItem ? items.indexOf(this.activeItem) : -1;
    switch (ev.key) {
      case "ArrowDown":
      case "ArrowUp": {
        ev.preventDefault();
        if (!items.length) return;
        const step = ev.key === "ArrowDown" ? 1 : -1;
        const next =
          index < 0
            ? items[step > 0 ? 0 : items.length - 1]
            : items[(index + step + items.length) % items.length];
        this.setActive(next, "keyboard");
        return;
      }
      case "Enter":
        // A search field isn't part of a form, so Enter never submits one.
        ev.preventDefault();
        if (this.activeItem && !ev.isComposing) this.activate(this.activeItem);
        return;
    }
  };

  /** Clears the search text and highlight, so the next open starts fresh. */
  private resetSearch() {
    const hadQuery = this.query !== "";
    this.query = "";
    if (this.inputEl) this.inputEl.value = "";
    this.customFilter = false;
    this.applyFilter();
    this.setActive(undefined);
    // Tells `orbSearch` listeners that filtering over, so they can reset their own filter.
    if (hadQuery) this.orbSearch.emit({ query: "" });
  }

  @Listen("keydown")
  onKeyDown(ev: KeyboardEvent) {
    // Lets focus move on, then closes the menus that focus has left.
    if (ev.key === "Tab") {
      setTimeout(() => this.closeLeftBehind());
      return;
    }
    const item = this.ownItem(ev.target);
    if (!item) return;
    const items = this.navigableItems;
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
        {this.fullscreen && (
          <div part="mobile-bar" class="mobile-bar">
            {this.label && <span class="title">{this.label}</span>}
            <orb-button
              part="close-button"
              class="icon-only"
              fill="clear"
              aria-label="Close"
              onClick={() => this.hide()}
            >
              <CloseIcon aria-hidden="true" />
            </orb-button>
          </div>
        )}
        {this.search && (
          <div part="search" class="search">
            <SearchIcon class="search-icon" aria-hidden="true" />
            <input
              part="search-input"
              ref={(el) => (this.inputEl = el)}
              type="search"
              aria-label={this.searchLabel}
              placeholder={this.searchLabel}
              autoComplete="off"
              spellcheck={false}
              inputMode="search"
              onInput={this.onSearchInput}
              onKeyDown={this.onSearchKeyDown}
              enterkeyhint="enter"
            />
            <slot name="search-end" />
          </div>
        )}
        <div
          part="list"
          id="list"
          class="list"
          ref={(el) => (this.listEl = el)}
          role={this.listRole}
          aria-orientation="vertical"
          aria-multiselectable={this.mode === "multi" ? "true" : undefined}
          aria-label={this.label}
        >
          <slot />
        </div>
        <div part="footer" class="footer" hidden={!this.hasFooter}>
          <slot name="footer" onSlotchange={(e) => (this.hasFooter = hasContent(e))} />
        </div>
      </Host>
    );
  }
}
