import {
  Component,
  Prop,
  h,
  Element,
  Listen,
  Host,
  Watch,
  forceUpdate,
} from "@stencil/core";
import { Color } from "../../utils/color";

@Component({
  tag: "orb-button",
  styleUrl: "orb-button.css",
  shadow: true,
})
export class OrbButton {
  @Element() el: HTMLOrbButtonElement;
  private get formEl() {
    return this.form
      ? document.getElementById(this.form)?.closest("form")
      : this.el.closest("form");
  }

  /** Disables button */
  @Prop() disabled = false;

  /** Can set to submit or reset to participate in forms */
  @Prop() type?: "submit" | "reset";

  /**
   * Can set form id to participate in forms. Use this if you need to place
   * submit/reset button outside the form element
   */
  @Prop() form?: string;

  /** Expands the button to the full width of it's container */
  @Prop() expand = false;

  /** Shows a loading spinner and disables the button */
  @Prop() pending = false;

  /** Button fill */
  @Prop({ reflect: true }) fill: "solid" | "outline" | "clear" = "solid";

  /** Button size */
  @Prop({ reflect: true }) size: "md" | "lg" | "sm" = "md";

  /** Predefined colors */
  @Prop({ reflect: true }) color?: Color;

  @Listen("click")
  handleClick() {
    if (this.type == "submit") {
      this.formEl?.requestSubmit();
    } else if (this.type == "reset") {
      this.formEl?.reset();
    }
  }

  @Watch("pending")
  onPendingChange() {
    if (this.pending) {
      this.el.style.setProperty("--pending-width", `${this.el.clientWidth}px`);
    }
  }

  @Listen("keydown")
  onKeyDown(ev: KeyboardEvent) {
    if (
      !this.disabled &&
      !this.pending &&
      (ev.key === "Enter" || ev.key == " ")
    ) {
      ev.preventDefault();
      this.el.click();
    }
  }

  render() {
    return (
      <Host
        role="button"
        aria-disabled={`${this.disabled || this.pending}`}
        tabindex={this.disabled || this.pending ? "-1" : "0"}
      >
        {this.pending ? (
          <orb-loading />
        ) : (
          <slot onSlotchange={() => forceUpdate(this.el)} />
        )}
        <slot name="badge" />
      </Host>
    );
  }
}
