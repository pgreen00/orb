import {
  Component,
  Host,
  h,
  Prop,
  Element,
  Watch,
  Method,
  EventEmitter,
  Event,
  Listen,
} from "@stencil/core";
import { isFirefox } from "../../utils/is-firefox";
import interact from "interactjs";

export type OverlayData<T = any> = {
  role?: string;
  data?: T;
};

@Component({
  tag: "je-overlay",
  styleUrl: "je-overlay.css",
  shadow: true,
})
export class JeOverlay {
  private role?: string;
  private data?: any;
  private dialogEl!: HTMLDialogElement;
  @Element() el!: HTMLElement;

  /** Backdrop will close the modal on click when enabled */
  @Prop() backdropDismiss = true;

  /** Opens and closes modal */
  @Prop({ mutable: true }) open = false;

  /** Size of the overlay */
  @Prop({ reflect: true }) size: "sm" | "md" | "lg" = "md";

  /** Side of the screen where the drawer will be displayed */
  @Prop({ reflect: true }) side?: "left" | "right" | "bottom" | "top";

  /** Optionally execute a promise before presentation begins */
  @Prop() init?: () => void | Promise<void>;

  /** Optionally execute a promise after closing completes */
  @Prop() destroy?: () => void | Promise<void>;

  /** Emits whenever the overlay has opened. Does not emit any data */
  @Event() present: EventEmitter;

  /** Emits whenever the overlay has finished closing. Emits the role and optional data object passed to the hide() method. */
  @Event() dismiss: EventEmitter<OverlayData>;

  componentDidLoad() {
    const { side } = this;
    if (side === "bottom") {
      interact(this.dialogEl).resizable({
        edges: {
          top: ".drag",
        },
        listeners: {
          move: (event) => {
            let { y } = event.target.dataset;
            y = (parseFloat(y) || 0) + event.deltaRect.top;
            Object.assign(event.target.style, {
              height: `${event.rect.height}px`,
            });
            Object.assign(event.target.dataset, { y });
          },
        },
      });
    }
  }

  private animateBackdrop(enter: boolean) {
    if (!isFirefox()) {
      const keyframes = [{ opacity: 0 }, { opacity: 1 }];
      if (!enter) keyframes.reverse();
      this.dialogEl.animate(keyframes, {
        duration: 300,
        pseudoElement: "::backdrop",
        easing: "ease-in-out",
      });
    }
  }

  private animateDialog(enter: boolean) {
    const to = this.side
      ? { [this.side]: "calc(var(--width) * -1)" }
      : { opacity: 0 };
    const from = this.side ? { [this.side]: "0" } : { opacity: 1 };
    const keyframes = [to, from];
    if (!enter) keyframes.reverse();
    this.animateBackdrop(enter);
    return this.dialogEl.animate(keyframes, {
      duration: 300,
      easing: "ease-in-out",
    });
  }

  private pulse() {
    this.dialogEl.animate({ scale: [1, 1.03, 1] }, 300);
  }

  @Watch("open")
  async onOpenChange(open: boolean) {
    if (open) {
      if (this.init) {
        await this.init();
      }
      this.dialogEl.showModal();
      await this.animateDialog(open).finished;
      this.present.emit();
    } else {
      await this.animateDialog(open).finished;
      this.dialogEl.close();
      if (this.destroy) {
        await this.destroy();
      }
      this.dismiss.emit({ role: this.role, data: this.data });
      this.role = undefined;
      this.data = undefined;
    }
  }

  @Listen("click")
  onClick(event: MouseEvent) {
    if (event.target === this.el.querySelector(":scope > [slot=trigger]")) {
      this.show();
    }
  }

  @Listen("mousedown")
  onMouseDown(event: MouseEvent) {
    if (event.target === this.el) {
      if (this.backdropDismiss) {
        this.hide("backdropDismiss");
      } else {
        this.pulse();
      }
    }
  }

  @Listen("keydown")
  onKeyDown(ev: KeyboardEvent) {
    if (ev.key === "Escape" && this.open) {
      ev.preventDefault();
      if (this.backdropDismiss) {
        this.hide("escapeDismiss");
      } else {
        this.pulse();
      }
    }
  }

  @Method()
  async show() {
    this.open = true;
  }

  @Method()
  async hide(role = "manualClose", data?: any) {
    this.role = role;
    this.data = data;
    this.open = false;
  }

  render() {
    return (
      <Host>
        <slot name="trigger" />
        <dialog ref={(el) => (this.dialogEl = el)} part="dialog">
          {this.side === "bottom" && <div class="drag" />}
          <slot />
        </dialog>
      </Host>
    );
  }
}
