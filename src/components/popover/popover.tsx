import {
  Component,
  Host,
  Element,
  EventEmitter,
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


@Component({
  tag: "orb-popover",
  styleUrl: "popover.css",
  shadow: true,
})
export class Popover {
  @Element() el!: HTMLOrbPopoverElement;

  private contentEl!: HTMLElement;

  private arrowEl?: HTMLElement;

  private triggerEl?: HTMLElement

  private anchorPoint?: DOMRect

  private get referenceEl() {
    return this.triggerEl ?? {
      getBoundingClientRect: () => this.anchorPoint ?? new DOMRect(0, 0)
    }
  }

  private role?: string;

  private data?: any;

  private cleanup?: () => void;

  /** Removes the trigger's listeners */
  private listeners?: AbortController;

  /** A pending hover open or close */
  private hoverTimer?: ReturnType<typeof setTimeout>;

  @State() open = false;

  /**
   * Where the popover should be placed
   */
  @Prop() placement?: Placement;

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
  @Prop() for?: string;

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

  componentWillLoad() {
    this.el.popover = 'manual'
  }

  connectedCallback() {
    this.triggerEl = this.findExternalTrigger() as HTMLElement
    if (!this.triggerEl) {
      console.warn("Popover trigger not found: ", this.for)
      return;
    }
    this.triggerEl.ariaHasPopup ??= 'dialog'
    this.triggerEl.ariaExpanded = 'false'

    this.listeners?.abort();
    this.listeners = new AbortController();
    const { signal } = this.listeners;
    switch (this.showOn) {
      case 'click':
        this.listenForClick(this.triggerEl, signal);
        break;
      case 'context-menu':
        this.listenForContextMenu(this.triggerEl, signal);
        break;
      case 'hover':
        this.listenForHover(this.triggerEl, signal);
        break;
      default:
        console.warn(`Popover: unknown showOn value "${this.showOn}"`);
    }
  }

  disconnectedCallback() {
    this.listeners?.abort();
    this.listeners = undefined;
    clearTimeout(this.hoverTimer);
  }

  @Watch("open")
  async handleOpenChange(open: boolean) {
    if (open) {
      this.orbPresentStart.emit();
      await this.init?.();
      await this.setPosition();
      this.startPositioning();
      this.el.showPopover();
      await this.el.animate(
        { opacity: [0, 1] },
        { duration: 150, easing: "ease-in-out" },
      ).finished;
      this.orbPresentEnd.emit();
    } else {
      this.orbDismissStart.emit();
      await this.el.animate(
        { opacity: [1, 0] },
        { duration: 150, easing: "ease-in-out" },
      ).finished;
      this.el.hidePopover();
      this.cleanup?.();
      await this.destroy?.();
      this.orbDismissEnd.emit({
        role: this.role,
        data: this.data,
      });
      this.role = undefined;
      this.data = undefined;
    }
  }

  /**
   * Opens the popover. Without a trigger, it opens at `event`'s pointer
   * position. Calling it again while open moves the popover to the new
   * position, such as for a second right-click on a context menu.
   */
  @Method()
  async show({ clientX, clientY, }: MouseEvent) {
    this.anchorPoint = new DOMRect(clientX, clientY)
    if (!this.open) {
      this.open = true;
      return;
    }
    this.startPositioning();
  }

  @Method()
  async hide(role?: string, data?: any) {
    this.role = role;
    this.data = data;
    this.open = false;
  }

  private setOpen(triggerEl: Element, open: boolean) {
    this.open = open;
    triggerEl.ariaExpanded = `${open}`;
  }

  private isInside(e: Event, el: Element) {
    return e.composedPath().includes(el);
  }

  /** Opens or closes from the trigger, only when it changes */
  private request(triggerEl: Element, open: boolean) {
    if (open !== this.open) this.setOpen(triggerEl, open);
  }

  /** Click toggles. A press outside, or Escape, closes. */
  private listenForClick(triggerEl: HTMLElement, signal: AbortSignal) {
    triggerEl.addEventListener('click', () => this.request(triggerEl, !this.open), { signal });
    document.addEventListener('pointerdown', (e) => {
      if (!this.isInside(e, triggerEl) && !this.isInside(e, this.el)) this.request(triggerEl, false);
    }, { signal });
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape' || !this.open) return;
      triggerEl.focus(); // return focus to the trigger
      this.request(triggerEl, false);
    }, { signal });
  }

  /**
   * A right-click on the trigger opens it at the pointer. A press elsewhere,
   * another context menu, scrolling, resizing, leaving the window, or Escape
   * closes it.
   */
  private listenForContextMenu(triggerEl: HTMLElement, signal: AbortSignal) {
    triggerEl.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      // Keyboard-invoked (Menu key / Shift+F10) reports 0,0 → fall back to the trigger
      const fromKeyboard = e.clientX === 0 && e.clientY === 0;
      const rect = triggerEl.getBoundingClientRect();
      this.anchorPoint = fromKeyboard ? new DOMRect(rect.left, rect.bottom) : new DOMRect(e.clientX, e.clientY);
      this.setOpen(triggerEl, true);
    }, { signal });

    const close = () => this.request(triggerEl, false);
    // Any press outside the popover, except the right-click that's about to reopen it
    document.addEventListener('pointerdown', (e) => {
      if (!this.isInside(e, this.el) && !(e.button === 2 && this.isInside(e, triggerEl))) close();
    }, { signal });
    // Native context menu requested somewhere else
    document.addEventListener('contextmenu', (e) => {
      if (!this.isInside(e, triggerEl)) close();
    }, { signal });
    // Scrolling anywhere but inside the popover
    document.addEventListener('scroll', (e) => {
      if (!this.isInside(e, this.el)) close();
    }, { signal, capture: true });
    window.addEventListener('resize', close, { signal });
    window.addEventListener('blur', close, { signal });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
    }, { signal });
  }

  /**
   * Opens while the pointer is over the trigger or the popover. Entering
   * waits 100ms to open, unless it's already open. Leaving waits 300ms to
   * close, so the pointer can cross the gap between them. Escape closes it
   * until the pointer leaves and comes back.
   */
  private listenForHover(triggerEl: HTMLElement, signal: AbortSignal) {
    let overTrigger = false;
    let overPopover = false;
    let inZone = false;
    // Whether Escape can still close it, until the pointer leaves
    let escapable = false;
    const update = () => {
      const next = overTrigger || overPopover;
      if (next === inZone) return;
      inZone = next;
      escapable = next;
      clearTimeout(this.hoverTimer);
      // If it's already open, entering again cancels the pending close, with no flicker
      this.hoverTimer = setTimeout(() => this.request(triggerEl, next), next ? (this.open ? 0 : 100) : 300);
    };
    const track = (el: Element, set: (over: boolean) => void) => {
      el.addEventListener('mouseenter', () => { set(true); update(); }, { signal });
      el.addEventListener('mouseleave', () => { set(false); update(); }, { signal });
    };
    track(triggerEl, (over) => (overTrigger = over));
    track(this.el, (over) => (overPopover = over));
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape' || !inZone || !escapable) return;
      escapable = false;
      clearTimeout(this.hoverTimer);
      this.request(triggerEl, false);
    }, { signal });
  }

  private startPositioning() {
    this.cleanup?.();
    this.cleanup = autoUpdate(this.referenceEl, this.el, () => this.setPosition());
  }

  private async setPosition() {
    const {
      x,
      y,
      middlewareData,
      placement,
    } = await computePosition(this.referenceEl, this.el, {
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
    this.el.style.left = `${x}px`;
    this.el.style.top = `${y}px`;
  };

  private findExternalTrigger() {
    const root = this.el.getRootNode();
    if (
      root instanceof ShadowRoot ||
      root instanceof HTMLDocument ||
      root instanceof DocumentFragment
    )
      return root.getElementById(this.for);
    else if (root instanceof HTMLElement) {
      return root.querySelector(`#${this.for}`);
    } else {
      return null;
    }
  }

  render() {
    return (
      <Host>
        <div ref={(el) => (this.contentEl = el)} part="content">
          <slot />
        </div>
        {this.arrow && (
          <div ref={(el) => (this.arrowEl = el)} part="arrow"/>
        )}
      </Host>
    );
  }
}
