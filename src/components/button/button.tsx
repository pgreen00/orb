import {
  Component,
  Prop,
  Element,
  Listen,
  Host,
  Watch,
  AttachInternals,
} from "@stencil/core";
import { Color } from "../../utils/color";
import { ReadyController } from "../../utils/ready-controller";

@Component({
  tag: "orb-button",
  styleUrl: "button.css",
  shadow: true,
  formAssociated: true,
})
export class Button extends ReadyController {
  @AttachInternals() internals: ElementInternals;
  @Element() el: HTMLOrbButtonElement;
  private get formEl() {
    return this.form
      ? document.getElementById(this.form)?.closest("form")
      : this.internals.form;
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
  @Prop({ reflect: true }) size: "md" | "lg" | "sm" | "xs" = "md";

  /** Predefined colors */
  @Prop({ reflect: true }) color?: Color;

  /** Will be used as the value if it has a name and is nested in a form */
  @Prop() value?: string | File | FormData;

  componentWillLoad() {
    this.internals.role = "button";
  }

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

  @Watch('value', { immediate: true })
  async onValueChange() {
    await this.ready
    this.internals.setFormValue(this.value ?? null);
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

  @Watch("disabled", { immediate: true })
  @Watch("pending")
  async onDisabledChange() {
    await this.ready
    this.internals.ariaDisabled = this.disabled ? "true" : "false";
    this.el.tabIndex = this.disabled || this.pending ? -1 : 0;
  }

  render() {
    return (
      <Host>
        {this.pending ? <orb-loading /> : <slot />}
        <slot name="badge" />
      </Host>
    );
  }
}
