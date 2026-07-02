import {
  Component,
  Host,
  h,
  Element,
  EventEmitter,
  Listen,
  Prop,
  Event,
  Watch,
  Method,
} from "@stencil/core";
import {
  arrow,
  autoPlacement,
  autoUpdate,
  computePosition,
  ComputePositionReturn,
  flip,
  offset,
  Placement,
  shift,
  size,
} from "@floating-ui/dom";
import { debounceTime, fromEvent, Subscription } from "rxjs";

@Component({
  tag: "je-popover",
  styleUrl: "je-popover.css",
  shadow: true,
})
export class JePopover {
  @Element() el!: HTMLJePopoverElement;

  private contentEl!: HTMLElement;

  private containerEl!: HTMLElement;

  private arrowEl?: HTMLElement;

  private get triggerElement() {
    return this.el.querySelector(":scope > [slot=trigger]");
  }

  private mouseEvent?: MouseEvent;

  private role?: string;

  private data?: any;

  private cleanup?: () => void;

  private get referenceEl() {
    return {
      getBoundingClientRect: () => {
        if (this.positionStrategy === "element") {
          return (
            this.triggerElement ?? (this.mouseEvent?.target as Element)
          ).getBoundingClientRect();
        } else {
          return new DOMRect(
            this.mouseEvent?.clientX,
            this.mouseEvent?.clientY,
          );
        }
      },
    };
  }

  private mouseSub?: Subscription;

  /**
   * Opens/closes the popover
   */
  @Prop({ mutable: true }) open = false;

  /**
   * Where the popover should be placed
   */
  @Prop() placement?: Placement;

  /** Backdrop will dismiss the popover on click when enabled */
  @Prop() backdropDismiss = true;

  /**
   * Popover will automatically dismiss itself when something is
   * clicked in the popover when enabled
   */
  @Prop() dismissOnClick = false;

  /**
   * If the popover should position itself using the mouse event or
   * the triggerElement.
   */
  @Prop() positionStrategy: "click" | "element" = "element";

  /** Horizontal offset used when auto positioning the popover content */
  @Prop() offsetX = 0;

  /** Vertical offset used when auto positioning the popover content */
  @Prop() offsetY = 10;

  /**
   * @click Popover will show on left click or tap on mobile.
   * @context-menu Popover will show on right click or press on mobile.
   * @hover Popover will show on hover or tap on mobile.
   */
  @Prop() triggerAction: "click" | "context-menu" | "hover" = "click";

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

  /**
   * Emits before the popover starts opening
   */
  @Event({ bubbles: false }) presentStart: EventEmitter;

  /**
   * Emits when the popover is opened
   */
  @Event({ bubbles: false }) presentEnd: EventEmitter;

  /**
   * Emits before the popover starts dismissing
   */
  @Event({ bubbles: false }) dismissStart: EventEmitter;

  /**
   * Emits when the popover is closed
   */
  @Event({ bubbles: false }) dismissEnd: EventEmitter;

  /**
   * Emits when the popover has completed it's initial render
   */
  @Event({ bubbles: false }) ready: EventEmitter;

  componentDidLoad() {
    this.ready.emit();
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
  }

  @Watch("open")
  async handleOpenChange(open: boolean) {
    if (open) {
      this.presentStart.emit();
      if (this.init) {
        await this.init();
      }
      this.setPosition(await this.computePosition());
      this.cleanup = autoUpdate(this.referenceEl, this.containerEl, () =>
        this.computePosition().then(this.setPosition),
      );
      this.containerEl.showPopover();
      await this.containerEl.animate(
        { opacity: [0, 1] },
        { duration: 150, easing: "ease-in-out" },
      ).finished;
      this.presentEnd.emit();
    } else {
      this.dismissStart.emit();
      await this.containerEl.animate(
        { opacity: [1, 0] },
        { duration: 150, easing: "ease-in-out" },
      ).finished;
      this.containerEl.hidePopover();
      this.cleanup?.();
      if (this.destroy) {
        await this.destroy();
      }
      this.dismissEnd.emit({
        role: this.role ?? "manualClose",
        data: this.data,
      });
      this.role = undefined;
      this.data = undefined;
    }
  }

  @Listen("click", { capture: true, target: "window" })
  handleWindowClick(ev: MouseEvent) {
    const path = ev.composedPath();
    if (this.triggerAction == "click") {
      if (this.open) {
        if (this.backdropDismiss && !path.includes(this.containerEl)) {
          this.hide("backdropDismiss");
          this.open = false;
        }

        if (this.dismissOnClick && path.includes(this.containerEl)) {
          this.open = false;
          this.hide("clickDismiss");
        }
      } else {
        this.mouseEvent = ev;
        if (path.includes(this.triggerElement)) {
          this.open = true;
        }
      }
    }
  }

  @Listen("contextmenu", { capture: true, target: "window" })
  handleWindowContextMenu(ev: MouseEvent) {
    const path = ev.composedPath();
    if (this.triggerAction == "context-menu" && !this.open) {
      this.mouseEvent = ev;
      if (path.includes(this.triggerElement)) {
        ev.preventDefault();
        this.open = true;
      }
    }
  }

  @Method()
  async show() {
    this.open = true;
  }

  @Method()
  async hide(role?: string, data?: any) {
    this.role = role;
    this.data = data;
    this.open = false;
  }

  private setPosition = ({
    x,
    y,
    middlewareData,
    placement,
  }: ComputePositionReturn) => {
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

  private onMouseMove = (ev: MouseEvent) => {
    const node = ev.target as Node;
    const { triggerAction, triggerElement, el } = this;
    if (triggerAction === "hover") {
      if (
        triggerAction === "hover" &&
        (el.contains(node) || triggerElement?.contains(node))
      ) {
        this.mouseEvent = ev;
        this.open = true;
      } else {
        this.hide("hoverDismiss");
      }
    }
  };

  private computePosition() {
    return computePosition(this.referenceEl, this.containerEl, {
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
    });
  }

  render() {
    return (
      <Host>
        <slot name="trigger" />
        <div
          part="content-container"
          ref={(el) => (this.containerEl = el)}
          popover="manual"
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
