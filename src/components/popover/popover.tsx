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
import { map, merge, takeWhile, filter, tap, scan, distinctUntilChanged, switchMap, combineLatest, timer, startWith, fromEvent, Subscription } from "rxjs";

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

  private sub?: Subscription;

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

    switch (this.showOn) {
      case 'click':
        this.sub = this.clickFlow(this.triggerEl).subscribe(open => this.setOpen(this.triggerEl, open));
        break;
      case 'context-menu':
        this.sub = this.contextMenuFlow(this.triggerEl).subscribe(({ open, point }) => {
          if (open) this.anchorPoint = point;
          this.setOpen(this.triggerEl, open);
        });
        break;
      case 'hover':
        this.sub = this.hoverFlow(this.triggerEl).subscribe(open => this.setOpen(this.triggerEl, open));
        break;
      default:
        console.warn(`Popover: unknown showOn value "${this.showOn}"`);
    }
  }

  disconnectedCallback() {
    this.sub?.unsubscribe();
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

  private escape$() {
    return fromEvent<KeyboardEvent>(document, 'keydown').pipe(
      filter(e => e.key === 'Escape'),
    );
  }

  private clickFlow(triggerEl: HTMLElement) {
    const toggle$ = fromEvent(triggerEl, 'click').pipe(
      map(() => 'toggle' as const),
    );

    const outside$ = fromEvent<PointerEvent>(document, 'pointerdown').pipe(
      filter(e => !this.isInside(e, triggerEl) && !this.isInside(e, this.el)),
      map(() => 'close' as const),
    );

    const escape$ = this.escape$().pipe(
      filter(() => this.open),
      tap(() => triggerEl.focus()), // return focus to the trigger
      map(() => 'close' as const),
    );

    return merge(toggle$, outside$, escape$).pipe(
      scan((open, action) => (action === 'toggle' ? !open : false), false),
      distinctUntilChanged(),
    );
  }

  private contextMenuFlow(triggerEl: HTMLElement) {
    const open$ = fromEvent<MouseEvent>(triggerEl, 'contextmenu').pipe(
      tap(e => e.preventDefault()),
      map(e => {
        // Keyboard-invoked (Menu key / Shift+F10) reports 0,0 → fall back to the trigger
        const fromKeyboard = e.clientX === 0 && e.clientY === 0;
        const rect = triggerEl.getBoundingClientRect();
        const point = fromKeyboard
          ? new DOMRect(rect.left, rect.bottom)
          : new DOMRect(e.clientX, e.clientY);
        return { open: true, point };
      }),
    );

    const close$ = merge(
      // Any press outside the popover, except the right-click that's about to reopen it
      fromEvent<PointerEvent>(document, 'pointerdown').pipe(
        filter(e => !this.isInside(e, this.el) && !(e.button === 2 && this.isInside(e, triggerEl))),
      ),
      // Native context menu requested somewhere else
      fromEvent<MouseEvent>(document, 'contextmenu').pipe(
        filter(e => !this.isInside(e, triggerEl)),
      ),
      // Scrolling anywhere but inside the popover
      fromEvent(document, 'scroll', { capture: true }).pipe(
        filter(e => !this.isInside(e, this.el)),
      ),
      fromEvent(window, 'resize'),
      fromEvent(window, 'blur'),
      this.escape$(),
    ).pipe(
      filter(() => this.open),
      map(() => ({ open: false, point: new DOMRect })),
    );

    return merge(open$, close$);
  }

  private hoverFlow(triggerEl: HTMLElement) {
    const hovering = (el: Element) =>
      merge(
        fromEvent(el, 'mouseenter').pipe(map(() => true)),
        fromEvent(el, 'mouseleave').pipe(map(() => false)),
      ).pipe(startWith(false));

    const escape$ = this.escape$();

    return combineLatest([hovering(triggerEl), hovering(this.el)]).pipe(
      map(([overTrigger, overPopover]) => overTrigger || overPopover),
      distinctUntilChanged(),
      switchMap(inZone =>
        inZone
          ? merge(
              // If the popover is already open, the false→true flip cancels the pending close
              // and the stream never emits false, so it stays open with no flicker
              timer(this.open ? 0 : 100).pipe(map(() => true)),
              escape$.pipe(map(() => false)),
            ).pipe(takeWhile(open => open, true))
          // Grace period so the pointer can cross the gap between trigger and popover
          : timer(300).pipe(map(() => false)),
      ),
      distinctUntilChanged(),
    );
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
