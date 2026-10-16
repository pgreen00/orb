import {
  AttachInternals,
  Component,
  EventEmitter,
  Host,
  Prop,
  Element,
  Event,
  Listen,
  Watch,
} from "@stencil/core";
import {
  SquareMinusIcon,
  SquareCheckIcon,
  SquareIcon,
} from "../../utils/icons";
import { ReadyController } from "../../utils/ready-controller";

@Component({
  tag: "orb-checkbox",
  styleUrl: "checkbox.css",
  shadow: true,
  formAssociated: true,
})
export class Checkbox extends ReadyController {
  @AttachInternals({
    states: {
      required: false,
      optional: true,
    },
  })
  internals: ElementInternals;
  @Element() el!: HTMLElement;

  /**
   * Original value form will reset to
   */
  @Prop() defaultChecked?: "true" | "false" | "mixed";

  /**
   * By default, it will submit true or false depending on the checked state.
   * Use this property to submit a custom value instead.
   */
  @Prop() value?: string;

  /**
   * Whether or not the checkbox is active
   */
  @Prop({ mutable: true, reflect: true }) checked: "true" | "false" | "mixed" =
    "false";

  /**
   * Whether or not the label should go before or after the checkbox
   */
  @Prop() labelPlacement: "start" | "end" = "end";

  /**
   * Marks the control as required in the form. This will only affect indeterminate checkboxes.
   */
  @Prop() required = false;

  /**
   * Emits the current value whenever it's state changes
   */
  @Event({ bubbles: false }) checkedChange: EventEmitter<
    "true" | "false" | "mixed"
  >;

  componentWillLoad() {
    this.internals.role = "checkbox";
    this.el.tabIndex = 0;
    this.defaultChecked = this.checked;
  }

  formResetCallback() {
    if (this.checked !== this.defaultChecked) {
      this.checked = this.defaultChecked;
    }
  }

  @Listen("click")
  onClick(_ev: MouseEvent) {
    this.toggle();
  }

  @Listen("keydown")
  onKeyDown(ev: KeyboardEvent) {
    if (ev.key === " ") {
      ev.preventDefault();
      ev.stopPropagation();
      this.toggle();
    }
  }

  @Watch("required", { immediate: true })
  async onRequiredChange() {
    await this.ready;
    this.internals.ariaRequired = this.required ? "true" : "false";
    this.internals.states.add(this.required ? "required" : "optional");
    this.internals.states.delete(!this.required ? "required" : "optional");
  }

  @Watch("checked", { immediate: true })
  async handleValueChange() {
    await this.ready;
    this.internals.ariaChecked = this.checked;
    this.internals.setFormValue(
      this.checked === "true" ? (this.value ?? "on") : null,
    );
    if (this.checked !== "true" && this.required) {
      this.internals.setValidity(
        { valueMissing: true },
        "This field must be checked",
      );
    } else {
      this.internals.setValidity({});
    }
    this.internals.ariaInvalid = !this.internals.validity.valid
      ? "true"
      : "false";
  }

  private toggle() {
    if (this.checked == "mixed" || this.checked == "false") {
      this.checked = "true";
    } else {
      this.checked = "false";
    }
    this.checkedChange.emit(this.checked);
  }

  render() {
    return (
      <Host>
        {this.labelPlacement == "start" && <slot />}
        {this.checked === "true" ? (
          <SquareCheckIcon aria-hidden="true" />
        ) : this.checked === "mixed" ? (
          <SquareMinusIcon aria-hidden="true" />
        ) : (
          <SquareIcon aria-hidden="true" />
        )}
        {this.labelPlacement == "end" && <slot />}
      </Host>
    );
  }
}
