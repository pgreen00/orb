import {
  Component,
  Prop,
  Element,
  Listen,
  Host,
  Watch,
  AttachInternals,
  Fragment,
} from "@stencil/core";
import { Color } from "../../utils/color";
import { ReadyController } from "../../utils/ready-controller";
import { toggleState } from "../../utils/custom-states";
import { ChevronDownIcon } from "../../utils/icons";

/**
 * Buttons represent actions the user can take, such as submitting a form, opening a dialog, or navigating to another page.
 * @slot - Button content
 * @slot badge - Badge content
 * @part loading - The `orb-loading` element displayed when pending
 */
@Component({
  tag: "orb-button",
  styleUrl: "button.css",
  shadow: true,
  formAssociated: true,
})
export class Button extends ReadyController {
  @AttachInternals({
    states: {
      /** Whenever the button is pending */
      pending: false
    }
  }) internals: ElementInternals;
  @Element() el: HTMLOrbButtonElement;
  private get formEl() {
    return this.form
      ? document.getElementById(this.form)?.closest("form")
      : this.internals.form;
  }
  private pendingWidth = 0;

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

  /** Button corners */
  @Prop({ reflect: true }) radius: "default" | "circle" | "pill" = "default";

  /** Predefined colors */
  @Prop({ reflect: true }) color?: Color;

  /** Will be used as the value if it has a name and is nested in a form */
  @Prop() value?: string | File | FormData;

  /** If true, the button will have a caret */
  @Prop() caret = false;

  /** If true, the button's content will be spaced apart */
  @Prop() spaceBetween = false;

  componentWillLoad() {
    this.internals.role = "button";
    this.internals.ariaPressed = "false";
  }

  @Watch('value', { immediate: true })
  async onValueChange() {
    await this.ready
    this.internals.setFormValue(this.value ?? null);
  }

  @Watch("disabled", { immediate: true })
  async onDisabledChange() {
    await this.ready
    this.internals.ariaDisabled = this.disabled ? "true" : "false";
    this.el.tabIndex = this.disabled ? -1 : 0;
  }

  @Watch("pending", { immediate: true })
  async onPendingChange() {
    await this.ready
    this.internals.ariaBusy = this.pending ? "true" : "false";
    this.pendingWidth = this.el.clientWidth;
    toggleState(this.internals.states, 'pending', this.pending)
  }

  @Listen("click")
  handleClick() {
    if (this.type == "submit") {
      this.formEl?.requestSubmit();
    } else if (this.type == "reset") {
      this.formEl?.reset();
    }
  }

  @Listen("keydown")
  onKeyDown(ev: KeyboardEvent) {
    if (ev.key === "Enter" || ev.key == " ") {
      ev.preventDefault();
      this.el.click();
    }
  }

  @Listen("pointerdown")
  onPointerDown() {
    this.internals.ariaPressed = "true";
  }

  @Listen("pointerup")
  onPointerUp() {
    this.internals.ariaPressed = "false";
  }

  render() {
    return (
      <Host disabled={this.pending || null}>
        {this.pending ? (
          <Fragment>
            <style>{`:host{--pending-width:${this.pendingWidth}px;}`}</style>
            <orb-loading part="loading" />
          </Fragment>
        ) : (
          <Fragment>
            <slot />
            {this.caret && <ChevronDownIcon/>}
          </Fragment>
        )}
        <slot name="badge" />
      </Host>
    );
  }
}
