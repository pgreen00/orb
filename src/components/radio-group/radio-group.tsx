import {
  Component,
  Element,
  EventEmitter,
  Prop,
  Event,
  Watch,
  Listen,
  AttachInternals,
  Host,
} from "@stencil/core";

@Component({
  tag: "orb-radio-group",
  styleUrl: "radio-group.css",
  shadow: true,
  formAssociated: true,
})
export class RadioGroup {
  @AttachInternals() internals!: ElementInternals;
  @Element() el!: HTMLOrbRadioGroupElement;

  /**
   * Requires a value before the form can be submitted
   */
  @Prop() required?: boolean;

  /**
   * Disables the controls
   */
  @Prop() disabled = false;

  /**
   * Value the form will reset to. Defaults to initial value if not specified
   */
  @Prop() originalValue?: any;

  /**
   * Label that shows above the control
   */
  @Prop() label?: string;

  /**
   * Additional info that shows below the control
   */
  @Prop() note?: string;

  /**
   * The currently selected value
   */
  @Prop({ mutable: true }) value?: any;

  /**
   * Displays the radios as a group of buttons
   */
  @Prop() buttons = false;

  /**
   * Lays the radios out in a column or a row. Defaults to `column` for radios
   * and `row` when `buttons` is set.
   */
  @Prop() mode?: "row" | "column";

  /**
   * Emits the selected value whenever it changes
   */
  @Event({ bubbles: false }) orbValueChange: EventEmitter<any>;

  componentWillLoad() {
    this.internals.role = "radiogroup";
    this.internals.setFormValue(this.value);
    if (!this.originalValue) this.originalValue = this.value;
  }

  private get direction() {
    return this.mode ?? (this.buttons ? "row" : "column");
  }

  componentWillRender() {
    this.internals.ariaOrientation =
      this.direction === "row" ? "horizontal" : "vertical";
    this.getRadios().forEach(
      (radio) => {
        if ((radio.value || radio.textContent) === this.value) radio.dataset.selected = ''
        else delete radio.dataset.selected;
      },
    );
  }

  componentDidRender() {
    this.internals.ariaInvalid = this.internals.validity.valid
      ? "true"
      : "false";

    this.internals.states.clear();
    if (this.required) {
      this.internals.states.add("--required");
      if (this.getRadios().some((t) => t.dataset.selected === "")) {
        this.internals.states.add("--valid");
      } else {
        this.internals.setValidity(
          { customError: true },
          "Please select an option.",
        );
        this.internals.states.add("--invalid");
      }
    }
  }

  formResetCallback() {
    if (this.value !== this.originalValue) {
      this.value = this.originalValue;
    }
  }

  private getRadios() {
    return Array.from(
      this.el.querySelectorAll("orb-radio")
    );
  }

  private isRadio(
    target: EventTarget | null,
  ): target is HTMLOrbRadioElement {
    return (
      target instanceof HTMLElement &&
      (target.tagName == "ORB-RADIO")
    );
  }

  @Watch("value")
  handleValueChange() {
    this.internals.setFormValue(this.value);
  }

  @Listen("focus")
  onFocus() {
    const radios = this.getRadios();
    (radios.find((radio) => radio.value === this.value) ?? radios[0])?.focus();
  }

  @Listen("click")
  handleNewValue({ target }: Event) {
    if (this.isRadio(target)) {
      this.value = target.value || target.textContent;
      this.orbValueChange.emit(this.value);
    }
  }

  @Listen("keydown", { capture: true })
  handleKeyDown(ev: KeyboardEvent) {
    const { target, key } = ev;
    if (this.isRadio(target) && !this.disabled) {
      if (key === "ArrowDown" || key === "ArrowRight") {
        ev.preventDefault();
        const radios = this.getRadios();
        const index = radios.findIndex((radio) => (radio.value || radio.textContent) === this.value);
        const radio = radios[(index + 1) % radios.length];
        radio.focus();
        this.value = (radio.value || radio.textContent);
        this.orbValueChange.emit(this.value);
      } else if (key === "ArrowUp" || key === "ArrowLeft") {
        ev.preventDefault();
        const radios = this.getRadios();
        const index = radios.findIndex((radio) => (radio.value || radio.textContent) === this.value);
        const radio = radios[(index - 1 + radios.length) % radios.length];
        radio.focus();
        this.value = (radio.value || radio.textContent);
        this.orbValueChange.emit(this.value);
      } else if (ev.key === " ") {
        this.value = (target.value || target.textContent);
        this.orbValueChange.emit(this.value);
      }
    }
  }

  render() {
    return (
      <Host>
        <style>{`:host{--mode:${this.buttons ? 'buttons' : 'radios'};--direction:${this.direction};}`}</style>
        <slot
          name="label"
          ref={el => this.internals.ariaLabelledByElements = [el]}
        >
          {this.label && (
            <orb-label required={this.required}>
              {this.label}
            </orb-label>
          )}
        </slot>
        <div
          class={{
            buttons: this.buttons,
            content: !this.buttons,
            [this.direction]: true,
          }}
        >
          <slot />
        </div>
        <slot
          name="note"
          ref={el => this.internals.ariaDescribedByElements = [el]}
        >
          {this.note && <orb-note>{this.note}</orb-note>}
        </slot>
      </Host>
    );
  }
}
