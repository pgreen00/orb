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
import {
  Subscription,
  fromEvent,
  debounceTime,
  map,
  merge,
  distinctUntilChanged,
  switchMap,
  timer,
  startWith,
  combineLatest,
  filter,
  takeWhile
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

    const hover$ = merge(
      fromEvent(triggerEl, 'mouseenter').pipe(map(() => true)),
      fromEvent(triggerEl, 'mouseleave').pipe(map(() => false)),
    ).pipe(startWith(false));

    const focus$ = merge(
      fromEvent(triggerEl, 'focusin').pipe(map(() => true)),
      fromEvent(triggerEl, 'focusout').pipe(map(() => false)),
    ).pipe(startWith(false));

    const escape$ = fromEvent<KeyboardEvent>(document, 'keydown').pipe(
      filter(e => e.key === 'Escape'),
    );

    this.sub = combineLatest([hover$, focus$]).pipe(
      debounceTime(10),
      map(([overTrigger, focused]) =>
        focused && triggerEl.matches(':focus-visible, :has(:focus-visible)') ? 'keyboard'
        : overTrigger ? 'pointer'
        : 'idle'
      ),
      distinctUntilChanged(),
      switchMap(mode =>
        mode === 'idle'
          ? timer(100).pipe(map(() => false))
          : merge(
              timer(mode === 'keyboard' ? 0 : this.timeout).pipe(map(() => true)),
              escape$.pipe(map(() => false)),
            ).pipe(takeWhile(open => open, true))
      ),
    ).subscribe(open => (this.open = open));
  }

  disconnectedCallback() {
    this.sub?.unsubscribe();
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
