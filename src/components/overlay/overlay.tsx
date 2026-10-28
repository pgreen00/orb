import {
  Component,
  Host,
  Prop,
  Element,
  Watch,
  Method,
  EventEmitter,
  Event,
  Listen,
} from "@stencil/core";
import interact from "interactjs";
import { ReadyController } from "../../utils/ready-controller";

export type OverlayData<T = any> = {
  role?: string;
  data?: T;
};

type Side = "left" | "right" | "bottom";

@Component({
  tag: "orb-overlay",
  styleUrl: "overlay.css",
  shadow: true,
})
export class Overlay extends ReadyController {
  private role?: string;
  private data?: any;
  private interact?: any;
  private dialogEl!: HTMLDialogElement;
  private get triggerEl() {
    if (this.trigger) {
      return this.findExternalTrigger();
    } else {
      return this.el.querySelector(":scope > [slot=trigger]");
    }
  }
  @Element() el!: HTMLElement;

  /**
   * Prevents the overlay from closing when clicking the backdrop or
   * pressing the escape key. The overlay can still be closed
   * via the `hide()` method or the `open` property.
   */
  @Prop() manualHide = false;

  /** Opens and closes modal */
  @Prop({ mutable: true, reflect: true }) open = false;

  /** Size of the overlay */
  @Prop({ reflect: true }) size: "sm" | "md" | "lg" = "md";

  /** Side of the screen where the overlay will be displayed */
  @Prop({ reflect: true }) side?: Side;

  /** Optionally execute a promise before presentation begins */
  @Prop() init?: () => void | Promise<void>;

  /** Optionally execute a promise after closing completes */
  @Prop() destroy?: () => void | Promise<void>;

  /** Id of the element that will trigger the overlay to open */
  @Prop() trigger?: string;

  /** Emits whenever the overlay has opened. Does not emit any data */
  @Event() present: EventEmitter;

  /** Emits whenever the overlay has finished closing. Emits the role and optional data object passed to the hide() method. */
  @Event() dismiss: EventEmitter<OverlayData>;

  /** Emits whenever the overlay is about to close. Emits the role and optional data object passed to the hide() method.
   * If the event is canceled, the overlay will not close.
   */
  @Event({
    cancelable: true
  }) hideRequest: EventEmitter<OverlayData>;

  @Method()
  async show() {
    this.open = true;
  }

  @Method()
  async hide(role?: string, data?: any) {
    const ev = this.hideRequest.emit({ role, data });
    if (!ev.defaultPrevented) {
      this.role = role;
      this.data = data;
      this.open = false;
    }
  }

  @Watch("side", { immediate: true })
  async onSideChange(side: Side) {
    await this.ready;
    if (side === "bottom") {
      const snapTargets = [window.innerHeight * 0.5, window.innerHeight * 0.8];
      this.interact = interact(this.dialogEl).resizable({
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
          end: (event) => {
            const currentHeight = event.rect.height;
            const minHeight = window.innerHeight * 0.3;
            if (
              !this.manualHide &&
              (event.swipe?.down || currentHeight < minHeight * 0.7)
            ) {
              this.open = false;
            } else {
              const closest = snapTargets.reduce((prev, curr) => {
                return Math.abs(curr - currentHeight) <
                  Math.abs(prev - currentHeight)
                  ? curr
                  : prev;
              });
              Object.assign(event.target.style, {
                height: `${closest}px`,
              });
            }
          },
        },
      });
    } else if (this.interact) {
      this.interact.unset();
    }
  }

  @Watch("open")
  async onOpenChange(open: boolean) {
    if (open && !this.dialogEl.open) {
      this.resetBottomSheet()
      await this.init?.()
      this.cloneTemplate()
      this.dialogEl.showModal();
      await this.animateDialog(open).finished;
      this.present.emit();
    } else if (!open && this.dialogEl.open) {
      await this.animateDialog(open).finished;
      this.dialogEl.close();
      this.destroyTemplate();
      await this.destroy?.();
      this.dismiss.emit({ role: this.role, data: this.data });
      this.role = undefined;
      this.data = undefined;
    }
  }

  @Watch("trigger", { immediate: true })
  onTriggerChange() {
    const trigger = this.trigger && this.findExternalTrigger();
    if (trigger) {
      trigger.ariaHasPopup = "dialog";
    }
  }

  @Listen("click", { target: "document" })
  onClick(event: MouseEvent) {
    const path = event.composedPath();
    if (!this.open && path.includes(this.triggerEl)) {
      this.open = true;
    } else if (this.open) {
      const closeButton = path.find(el => el instanceof HTMLElement && el.dataset.overlay?.includes('hide')) as HTMLElement
      if (closeButton) {
        event.stopPropagation();
        const role = closeButton.dataset.overlay.match(/(?:^|\s)role--(\S+)/)?.[1]
        const data = closeButton.dataset.overlay.match(/(?:^|\s)data--(\S+)/)?.[1]
        this.hide(role, data)
      }
    }
  }

  render() {
    return (
      <Host>
        <slot
          name="trigger"
          onSlotchange={({ target }) => {
            const slot = target as HTMLSlotElement;
            const trigger = slot.assignedElements()[0];
            if (trigger) {
              trigger.ariaHasPopup = "dialog";
            }
          }}
        />
        <dialog
          ref={(el) => (this.dialogEl = el)}
          part="dialog"
          onMouseDown={this.onMouseDown}
          onKeyDown={this.onKeyDown}
        >
          {this.side === "bottom" && <div class="drag" />}
          <div part="inner-container" class="inner">
            <slot />
          </div>
        </dialog>
      </Host>
    );
  }

  private onMouseDown = (event: MouseEvent) => {
    if (event.target === this.dialogEl && this.manualHide) {
      this.pulse();
    } else if (event.target === this.dialogEl) {
      this.open = false;
    }
  };

  private onKeyDown = (ev: KeyboardEvent) => {
    if (ev.key === "Escape" && this.open) {
      ev.preventDefault();
      if (this.manualHide) {
        this.pulse();
      } else {
        this.open = false;
      }
    }
  };

  private animateBackdrop(enter: boolean) {
    const keyframes = [{ opacity: 0 }, { opacity: 1 }];
    if (!enter) keyframes.reverse();
    this.dialogEl.animate(keyframes, {
      duration: 300,
      pseudoElement: "::backdrop",
      easing: "ease-in-out",
    });
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

  private resetBottomSheet() {
    if (this.side == "bottom")
      this.dialogEl.style.height = window.innerHeight * 0.5 + "px";
    else this.dialogEl.style.height = "";
  }

  private cloneTemplate() {
    const template =
      this.el.querySelector<HTMLTemplateElement>(":scope > template");
    if (template) {
      const root = document.createElement("div");
      root.classList.add("orb--overlay-template-root");
      const clone = document.importNode(template.content, true);
      root.append(clone);
      this.el.append(root);
    }
  }

  private destroyTemplate() {
    this.el.querySelector(":scope > div.orb--overlay-template-root")?.remove();
  }
}
