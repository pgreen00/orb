import {
  Component,
  Host,
  Element,
  EventEmitter,
  Listen,
  Prop,
  Event,
  Watch,
  Method,
  State,
} from "@stencil/core";
import {
  arrow,
  autoPlacement,
  autoUpdate,
  computePosition,
  flip,
  offset,
  Placement,
  shift,
  size,
} from "@floating-ui/dom";
import { debounceTime, fromEvent, Subscription } from "rxjs";
import { ReadyController } from "../../utils/ready-controller";
import { composedContains, deepActiveElement } from "../../utils/composed";
import { usingKeyboard } from "../../utils/input-modality";

@Component({
  tag: "orb-popover",
  styleUrl: "popover.css",
  shadow: true,
})
export class Popover extends ReadyController {
  @Element() el!: HTMLOrbPopoverElement;

  private contentEl!: HTMLElement;

  private containerEl!: HTMLElement;

  private arrowEl?: HTMLElement;

  private get triggerElement() {
    if (this.trigger) {
      return this.findExternalTrigger();
    } else {
      return this.el.querySelector(":scope > [slot=trigger]");
    }
  }

  private mouseEvent?: MouseEvent;

  private role?: string;

  private data?: any;

  private cleanup?: () => void;

  private get referenceEl() {
    const { triggerElement, mouseEvent } = this;
    if (triggerElement) {
      return triggerElement;
    } else if (mouseEvent) {
      const { clientX, clientY } = mouseEvent;
      return {
        getBoundingClientRect: () => new DOMRect(clientX, clientY),
      };
    } else {
      console.warn("No reference element found", this.el);
      return null;
    }
  }

  private mouseSub?: Subscription;

  /** Which menu item to focus when a menu is opened from the keyboard. */
  private menuFocus?: "first" | "last";

  /** Whether focus was inside the popover when it started closing. */
  private restoreFocus = false;

  /** The menu this popover shows, if its content is an `orb-menu`. */
  private get menu() {
    return this.el.querySelector<HTMLOrbMenuElement>(":scope > orb-menu");
  }

  @State() open = false;

  /**
   * Where the popover should be placed
   */
  @Prop() placement?: Placement;

  /** Backdrop will dismiss the popover on click when enabled */
  @Prop() hideOnBackdropClick = true;

  /**
   * Popover will automatically dismiss itself when something is
   * clicked in the popover when enabled. Ignored when `showOn` is `hover`.
   */
  @Prop() hideOnContentClick = false;

  /** Horizontal offset used when auto positioning the popover content */
  @Prop() offsetX = 0;

  /** Vertical offset used when auto positioning the popover content */
  @Prop() offsetY = 10;

  /**
   * - **click**: Popover will show on left click or tap on mobile.
   * - **context-menu**: Popover will show on right click or press on mobile.
   * - **hover**: Popover will show on hover or tap on mobile. Clicking the
   *   trigger or the content doesn't dismiss it. It closes when the pointer
   *   leaves, or on a click outside.
   */
  @Prop() showOn: "click" | "context-menu" | "hover" = "click";

  /**
   * If the popover should match the width of the trigger element
   */
  @Prop() matchWidth = false;

  /**
   * Renders an arrow pointing to the trigger
   */
  @Prop() arrow = true;

  /**
   * Execute a callback before the popover starts presenting
   */
  @Prop() init?: () => Promise<void> | void;

  /**
   * Execute a callback after the popover has dismissed
   */
  @Prop() destroy?: () => Promise<void> | void;

  /**
   * The padding between the arrow and the edges of the popover. Useful if you change the border-radius of the popover
   */
  @Prop() arrowPadding = 6;

  /** Id of the element that will trigger the popover to open */
  @Prop() trigger?: string;

  /**
   * Emits before the popover starts opening
   */
  @Event({ bubbles: false }) orbPresentStart: EventEmitter;

  /**
   * Emits when the popover is opened
   */
  @Event({ bubbles: false }) orbPresentEnd: EventEmitter;

  /**
   * Emits before the popover starts dismissing
   */
  @Event({ bubbles: false }) orbDismissStart: EventEmitter;

  /**
   * Emits when the popover is closed
   */
  @Event({ bubbles: false }) orbDismissEnd: EventEmitter;

  componentDidLoad() {
    this.syncTriggerAria();
  }

  /**
   * Tells assistive technology the trigger opens a popup and whether it's
   * open. Menus get `aria-haspopup="menu"`.
   */
  private syncTriggerAria() {
    const trigger = this.triggerElement;
    if (!trigger) return;
    if (this.menu) trigger.ariaHasPopup = "menu";
    trigger.ariaExpanded = this.open ? "true" : "false";
  }

  componentWillRender() {
    if (this.triggerElement && this.matchWidth) {
      this.el.style.setProperty(
        "--content-width",
        `${this.triggerElement.clientWidth}px`,
      );
    }
  }

  connectedCallback() {
    this.mouseSub = fromEvent(window, "mousemove")
      .pipe(debounceTime(50))
      .subscribe(this.onMouseMove);
  }

  disconnectedCallback() {
    this.mouseSub?.unsubscribe();
    this.cleanup?.();
  }

  @Watch("open")
  async handleOpenChange(open: boolean) {
    this.syncTriggerAria();
    if (open) {
      this.orbPresentStart.emit();
      await this.init?.();
      await this.setPosition();
      this.startPositioning();
      this.containerEl.showPopover();
      // Menus opened from the keyboard focus an item. Mouse users keep focus
      // where it is, since moving the pointer would make it look stale.
      if (this.menu && (this.menuFocus || (this.showOn !== "hover" && usingKeyboard()))) {
        this.menu.focusItem(this.menuFocus ?? "first");
      }
      this.menuFocus = undefined;
      await this.containerEl.animate(
        { opacity: [0, 1] },
        { duration: 150, easing: "ease-in-out" },
      ).finished;
      this.orbPresentEnd.emit();
    } else {
      this.restoreFocus = usingKeyboard() && this.containsFocus();
      // Closes submenus along with their parent menu.
      this.el.querySelectorAll<HTMLOrbPopoverElement>("orb-popover").forEach((popover) => popover.hide());
      this.orbDismissStart.emit();
      await this.containerEl.animate(
        { opacity: [1, 0] },
        { duration: 150, easing: "ease-in-out" },
      ).finished;
      this.containerEl.hidePopover();
      this.cleanup?.();
      // Returns focus to the trigger, unless focus already moved somewhere
      // else, such as the next element after a Tab.
      if (this.restoreFocus && (this.containsFocus() || deepActiveElement() === document.body)) {
        (this.triggerElement as HTMLElement | null)?.focus();
      }
      await this.destroy?.();
      this.orbDismissEnd.emit({
        role: this.role,
        data: this.data,
      });
      this.role = undefined;
      this.data = undefined;
    }
  }

  @Listen("click", { capture: true, target: "window" })
  handleWindowClick(ev: MouseEvent) {
    const trigger = this.triggerElement
    const path = ev.composedPath();
    // Hover popovers are driven by the pointer, so clicks inside don't close
    // them. Otherwise a tap on mobile would open and immediately close one.
    const hover = this.showOn === "hover";
    const clickedBackdrop = this.hideOnBackdropClick && !path.includes(this.containerEl) && !path.includes(trigger);
    const clickedContainer = !hover && this.hideOnContentClick && path.includes(this.containerEl);
    const clickedTrigger = path.includes(trigger);
    if (this.open && (clickedBackdrop || clickedContainer || (clickedTrigger && !hover))) {
      this.open = false;
    } else if (!this.open && clickedTrigger && this.showOn == "click") {
      this.open = true;
    }
  }

  @Listen("contextmenu", { capture: true, target: "window" })
  handleWindowContextMenu(ev: MouseEvent) {
    if (this.showOn == "context-menu" && ev.composedPath().includes(this.triggerElement)) {
      // Also while open, so the browser's menu doesn't cover this one.
      ev.preventDefault();
      this.open = true;
    }
  }

  /**
   * Opens the popover. Without a trigger, it opens at `event`'s pointer
   * position. Calling it again while open moves the popover to the new
   * position, such as for a second right-click on a context menu.
   */
  @Method()
  async show(event: MouseEvent) {
    this.mouseEvent = event;
    if (!this.open) {
      this.open = true;
      return;
    }
    this.startPositioning();
    // Like a fresh open, a menu reopened from the keyboard focuses its first item.
    if (this.menu && usingKeyboard()) this.menu.focusItem("first");
  }

  /**
   * Keeps the popover positioned against the current reference, replacing
   * any earlier positioning. `autoUpdate` positions it right away.
   */
  private startPositioning() {
    this.cleanup?.();
    this.cleanup = autoUpdate(this.referenceEl, this.containerEl, () => this.setPosition());
  }

  /**
   * Opens the popover and focuses the first or last item of its menu.
   * Without `focus`, an item is only focused when using the keyboard.
   * @internal
   */
  @Method()
  async openMenu(focus?: "first" | "last") {
    if (this.open) {
      if (focus) this.menu?.focusItem(focus);
      return;
    }
    this.menuFocus = focus;
    this.open = true;
  }

  private containsFocus() {
    return composedContains(this.el, deepActiveElement());
  }

  /** Escape closes the innermost open popover. */
  private onContainerKeyDown = (ev: KeyboardEvent) => {
    if (ev.key === "Escape" && this.open) {
      ev.preventDefault();
      ev.stopPropagation();
      this.open = false;
    }
  };

  /**
   * Escape closes the popover when focus is outside it, such as after
   * opening it with the mouse. Escape inside is handled by the container, so
   * only the innermost popover closes. Preventing the default stops a
   * surrounding dialog from closing too.
   */
  @Listen("keydown", { target: "window" })
  onWindowKeyDown(ev: KeyboardEvent) {
    if (ev.key !== "Escape" || !this.open || ev.defaultPrevented) return;
    ev.preventDefault();
    this.open = false;
  }

  /**
   * Up and Down on a button that opens a menu open it and focus the first or
   * last item, which also moves into a menu opened with the mouse. Menu
   * items that open submenus are handled by `orb-menu`.
   */
  @Listen("keydown")
  onTriggerKeyDown(ev: KeyboardEvent) {
    const trigger = this.triggerElement;
    if (!this.menu || !trigger || trigger.tagName === "ORB-MI") return;
    if (!ev.composedPath().includes(trigger)) return;
    if (ev.key === "ArrowDown" || ev.key === "ArrowUp") {
      ev.preventDefault();
      this.openMenu(ev.key === "ArrowDown" ? "first" : "last");
    }
  }

  @Method()
  async hide(role?: string, data?: any) {
    this.role = role;
    this.data = data;
    this.open = false;
  }

  private async setPosition() {
    const {
      x,
      y,
      middlewareData,
      placement,
    } = await computePosition(this.referenceEl, this.containerEl, {
      placement: this.placement,
      strategy: "fixed",
      middleware: [
        offset({
          mainAxis: this.offsetY,
          crossAxis: this.offsetX,
        }),
        shift(),
        this.placement ? flip() : autoPlacement(),
        size({
          apply: ({ availableHeight, availableWidth }) => {
            this.contentEl.style.setProperty(
              "--available-height",
              `${availableHeight - this.offsetY}px`,
            );
            this.contentEl.style.setProperty(
              "--available-width",
              `${availableWidth - this.offsetX}px`,
            );
          },
        }),
        this.arrowEl
          ? arrow({
              element: this.arrowEl,
              padding: this.arrowPadding,
            })
          : false,
      ],
    })
    if (middlewareData.arrow) {
      this.arrowEl.removeAttribute("class");
      this.arrowEl.classList.add(placement);
      if (middlewareData.arrow.x) {
        this.arrowEl.style.left = `${middlewareData.arrow.x}px`;
      } else if (middlewareData.arrow.y) {
        this.arrowEl.style.top = `${middlewareData.arrow.y}px`;
      }
    }
    this.containerEl.style.left = `${x}px`;
    this.containerEl.style.top = `${y}px`;
  };

  private onMouseMove = ({ target }: MouseEvent) => {
    const node = target as Node;
    const { showOn, triggerElement, el } = this;
    if (showOn === "hover") {
      if (el.contains(node) || triggerElement?.contains(node)) {
        this.open = true;
      } else {
        this.open = false;
      }
    }
  };

  private findExternalTrigger() {
    const root = this.el.getRootNode();
    if (
      root instanceof ShadowRoot ||
      root instanceof HTMLDocument ||
      root instanceof DocumentFragment
    )
      return root.getElementById(this.trigger);
    else if (root instanceof HTMLElement) {
      return root.querySelector(`#${this.trigger}`);
    } else {
      return null;
    }
  }

  render() {
    return (
      <Host>
        <slot name="trigger" />
        <div
          part="content-container"
          ref={(el) => (this.containerEl = el)}
          popover="manual"
          onKeyDown={this.onContainerKeyDown}
        >
          <div ref={(el) => (this.contentEl = el)} part="content">
            <slot />
          </div>
          {this.arrow && (
            <div ref={(el) => (this.arrowEl = el)} part="arrow"></div>
          )}
        </div>
      </Host>
    );
  }
}
