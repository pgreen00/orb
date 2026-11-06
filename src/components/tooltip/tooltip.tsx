import {
  autoUpdate,
  computePosition,
  offset,
  autoPlacement,
  flip,
  Placement,
  size,
} from "@floating-ui/dom";
import { Component, Host, Prop, State, Watch, Element, AttachInternals } from "@stencil/core";


@Component({
  tag: "orb-tooltip",
  styleUrl: "tooltip.css",
  shadow: true,
})
export class Tooltip {
  @AttachInternals() internals!: ElementInternals;
  @Element() el!: HTMLElement;
  @State() open = false;
  /** Removes the trigger's listeners */
  private listeners?: AbortController;
  /** Waits for hover and focus changes to settle */
  private settleTimer?: ReturnType<typeof setTimeout>;
  /** A pending open or close */
  private openTimer?: ReturnType<typeof setTimeout>;
  private get referenceEl() {
    return this.findExternalTrigger() ?? {
      getBoundingClientRect: () => new DOMRect(),
    }
  }
  private cleanup?: () => void;

  /** The target element of the tooltip */
  @Prop() for!: string;

  /**
   * - **description**: The tooltip describes the trigger, which keeps its own
   *   name. Use it for extra information, such as "Saves a copy to your drive".
   * - **label**: The tooltip names the trigger. Use it for icon-only buttons,
   *   so the name isn't announced twice. It replaces the trigger's `aria-label`.
   */
  @Prop() type: "description" | "label" = "description";

  /**
   * Where the tooltip should be placed. It flips to the opposite side when
   * there isn't room. Without it, the side with the most room is used.
   */
  @Prop() placement?: Placement;

  /** Horizontal offset used when auto positioning the popover content */
  @Prop() offsetX = 0;

  /** Vertical offset used when auto positioning the popover content */
  @Prop() offsetY = 10;

  /** Time in milliseconds to wait before showing the tooltip */
  @Prop() timeout = 50;

  componentWillLoad() {
    this.internals.role = "tooltip";
    this.el.popover = "manual";
  }

  connectedCallback() {
    const triggerEl = this.findExternalTrigger()
    if (!triggerEl) {
      console.warn("Tooltip trigger not found: ", this.for)
      return;
    }
    this.setAria(triggerEl)
    this.listeners?.abort();
    this.listeners = new AbortController();
    const { signal } = this.listeners;

    let overTrigger = false;
    let focused = false;
    let mode: "idle" | "pointer" | "keyboard" | undefined;
    // Whether Escape can still close it, until the mode changes
    let escapable = false;

    // Shows for keyboard focus right away, and for hover after `timeout`.
    // Hides 100ms after both end. Escape hides it until the mode changes.
    const settle = () => {
      const next =
        focused && triggerEl.matches(':focus-visible, :has(:focus-visible)') ? 'keyboard'
        : overTrigger ? 'pointer'
        : 'idle';
      if (next === mode) return;
      mode = next;
      escapable = next !== 'idle';
      clearTimeout(this.openTimer);
      this.openTimer =
        next === 'idle'
          ? setTimeout(() => (this.open = false), 100)
          : setTimeout(() => (this.open = true), next === 'keyboard' ? 0 : this.timeout);
    };
    // Waits for a burst of changes, such as focus moving within the trigger
    const update = () => {
      clearTimeout(this.settleTimer);
      this.settleTimer = setTimeout(settle, 10);
    };
    const on = (type: string, fn: () => void) => triggerEl.addEventListener(type, () => { fn(); update(); }, { signal });
    on('mouseenter', () => (overTrigger = true));
    on('mouseleave', () => (overTrigger = false));
    on('focusin', () => (focused = true));
    on('focusout', () => (focused = false));
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape' || !escapable) return;
      escapable = false;
      clearTimeout(this.openTimer);
      this.open = false;
    }, { signal });
  }

  disconnectedCallback() {
    this.listeners?.abort();
    this.listeners = undefined;
    clearTimeout(this.settleTimer);
    clearTimeout(this.openTimer);
  }

  @Watch("open")
  async onOpenChange(open: boolean) {
    if (open) {
      await this.setPosition();
      this.cleanup = autoUpdate(this.referenceEl, this.el, () => this.setPosition());
      this.el.showPopover();
      await this.el.animate(
        { opacity: [0, 1] },
        { duration: 150, easing: "ease-in-out" },
      ).finished;
    } else {
      this.cleanup();
      await this.el.animate(
        { opacity: [1, 0] },
        { duration: 150, easing: "ease-in-out" },
      ).finished;
      this.el.hidePopover();
    }
  }

  private setAria(el: Element) {
    if (this.type === "label") el.ariaLabelledByElements = [...(el.ariaLabelledByElements ?? []), this.el]
    else el.ariaDescribedByElements = [...(el.ariaDescribedByElements ?? []), this.el]
  }

  private async setPosition() {
    const { x, y } = await computePosition(this.referenceEl, this.el, {
      placement: this.placement,
      strategy: "fixed",
      middleware: [
        offset({
          mainAxis: this.offsetY,
          crossAxis: this.offsetX,
        }),
        this.placement ? flip() : autoPlacement(),
        size({
          apply: ({ availableHeight, availableWidth }) => {
            this.el.style.setProperty(
              "--available-height",
              `${availableHeight - this.offsetY}px`,
            );
            this.el.style.setProperty(
              "--available-width",
              `${availableWidth - this.offsetX}px`,
            );
          },
        }),
      ],
    })
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
        <slot/>
      </Host>
    );
  }
}
