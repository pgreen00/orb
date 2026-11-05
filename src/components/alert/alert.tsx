import {
  Component,
  Listen,
  Prop,
  Element,
  Host,
  State,
  Event,
  EventEmitter,
  Method,
  Watch,
} from "@stencil/core";
import { Color } from "../../utils/color";
import { OverlayData } from "../overlay/overlay";
import { CloseIcon } from "../../utils/icons";

/**
 * A short, prominent message, such as a confirmation or an error. It's hidden
 * until `open` is set, then animates in. Users can dismiss it with a close
 * button when `closable` is set, and it dismisses itself after `duration`.
 *
 * @slot - The message
 * @slot start - Content before the message, such as an icon
 * @slot end - Content after the message, such as an action button
 */
@Component({
  tag: "orb-alert",
  styleUrl: "alert.css",
  shadow: true,
})
export class Alert {
  private role?: string;
  private data?: any;
  @State() paused = true;
  @Element() el!: HTMLOrbAlertElement;
  /** Shows a close button that hides the alert with the `userDismiss` role. */
  @Prop() closable = false;

  /**
   * Accent color: `primary`, `success`, `warning`, or `danger`. Other values,
   * or none, use the neutral accent.
   */
  @Prop({ reflect: true }) color?: Color;

  /**
   * Milliseconds before the alert dismisses itself with the `autoDismiss` role.
   * Shows a progress bar that counts down, and pauses while the pointer is over
   * the alert. `0` turns this off.
   */
  @Prop() duration = 0;

  /**
   * Shows or hides the alert, with its entrance or exit animation. Setting it to
   * `false` directly dismisses with the `manualDismiss` role. Use `hide()` to
   * pass a different role.
   */
  @Prop({ mutable: true, reflect: true }) open = false;

  /** Emits when the entrance animation finishes. */
  @Event() orbPresent: EventEmitter;

  /**
   * Emits when the exit animation finishes. The detail has the `role`
   * (`userDismiss`, `autoDismiss`, `manualDismiss`, or the role passed to
   * `hide()`) and the `data` passed to `hide()`.
   */
  @Event() orbDismiss: EventEmitter<OverlayData>;

  @Watch("open")
  onOpenChange(open: boolean) {
    if (open) {
      const animation = this.el.animate(
        {
          opacity: [0, 1],
          transform: ["scale(0%)", "scale(100%)"],
          display: ["none", "block"],
        },
        600,
      );
      animation.onfinish = () => {
        this.paused = false;
        this.orbPresent.emit();
      };
    } else {
      const animation = this.el.animate(
        {
          opacity: [1, 0],
          transform: ["scale(100%)", "scale(0%)"],
          display: ["block", "none"],
        },
        600,
      );
      animation.onfinish = () => {
        this.paused = true;
        this.orbDismiss.emit({
          role: this.role ?? "manualDismiss",
          data: this.data,
        });
        this.role = undefined;
        this.data = undefined;
      };
    }
  }

  /** Shows the alert. Same as setting `open` to `true`. */
  @Method()
  async show() {
    this.open = true;
  }

  /**
   * Hides the alert. `role` and `data` are passed on to the `orbDismiss` event.
   * Without a role, the event uses `manualDismiss`.
   * @param role - Why the alert was dismissed, such as `"saved"`
   * @param data - Any extra data to pass with the dismissal
   */
  @Method()
  async hide(role?: string, data?: any) {
    this.role = role;
    this.data = data;
    this.open = false;
  }

  /**
   * Resolves once the alert has finished closing, with the same `role` and `data`
   * as `orbDismiss`. It resolves on the next dismissal, so call it before hiding.
   * @returns A promise of the dismissal's `role` and `data`
   */
  @Method()
  didDismiss() {
    return new Promise<OverlayData>((resolve) => {
      this.el.addEventListener("orbDismiss", (e) => resolve(e.detail), {
        once: true,
      });
    });
  }

  @Listen("mouseenter")
  onMouseEnter() {
    if (this.open) this.paused = true;
  }

  @Listen("mouseleave")
  onMouseLeave() {
    if (this.open) this.paused = false;
  }

  render() {
    return (
      <Host>
        {this.duration > 0 && (
          <div
            onAnimationEnd={() => this.hide("autoDismiss")}
            class={{ progress: true, running: this.open && !this.paused }}
            style={{ animationDuration: `${this.duration}ms` }}
          ></div>
        )}
        <orb-toolbar>
          <slot name="start" />
          <div>
            <slot />
          </div>
          <slot slot="end" name="end" />
          {this.closable && (
            <orb-button
              fill="clear"
              class="icon-only"
              slot="end"
              onClick={() => this.hide("userDismiss")}
            >
              <CloseIcon />
            </orb-button>
          )}
        </orb-toolbar>
      </Host>
    );
  }
}
