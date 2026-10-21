import {
  autoUpdate,
  computePosition,
  offset,
  autoPlacement,
  size,
} from "@floating-ui/dom";
import { Component, Host, Prop, State, Watch, Element, AttachInternals } from "@stencil/core";
import {
  Subscription,
  fromEvent,
  debounceTime,
  map,
  merge,
  debounce,
} from "rxjs";

@Component({
  tag: "orb-tooltip",
  styleUrl: "tooltip.css",
  shadow: true,
})
export class Tooltip {
  @AttachInternals() internals!: ElementInternals;
  @Element() el!: HTMLElement;
  @State() open = false;
  private sub?: Subscription;
  private get referenceEl() {
    return this.findExternalTrigger() ?? {
      getBoundingClientRect: () => new DOMRect(),
    }
  }
  private cleanup?: () => void;

  /** The target element of the tooltip */
  @Prop() for!: string;

  /** Horizontal offset used when auto positioning the popover content */
  @Prop() offsetX = 0;

  /** Vertical offset used when auto positioning the popover content */
  @Prop() offsetY = 10;

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
    const mouseMoveDebounce = fromEvent(window, "mousemove").pipe(
      debounceTime(50),
    );
    this.sub = merge(
      fromEvent(triggerEl, "mouseenter").pipe(
        map(() => "enter" as const),
      ),
      fromEvent(triggerEl, "mouseleave").pipe(
        map(() => "leave" as const),
      ),
    )
      .pipe(debounce(() => mouseMoveDebounce))
      .subscribe((res) => (this.open = res == "enter"));
  }

  disconnectedCallback() {
    this.sub?.unsubscribe();
  }

  @Watch('for', { immediate: true })
  onForChange() {
    const el = this.findExternalTrigger()
    if (el) el.ariaDescribedByElements = [...(el.ariaDescribedByElements ?? []), this.el]
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

  private async setPosition() {
    const { x, y } = await computePosition(this.referenceEl, this.el, {
      strategy: "fixed",
      middleware: [
        offset({
          mainAxis: this.offsetY,
          crossAxis: this.offsetX,
        }),
        autoPlacement(),
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
