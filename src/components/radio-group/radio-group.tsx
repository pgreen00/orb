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
   * Emits the selected value whenever it changes
   */
  @Event({ bubbles: false }) valueChange: EventEmitter<any>;

  componentWillLoad() {
    this.internals.role = "radiogroup";
    this.internals.setFormValue(this.value);
    if (!this.originalValue) this.originalValue = this.value;
  }

  componentWillRender() {
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
      this.valueChange.emit(this.value);
    }
  }

  @Listen("keydown", { capture: true })
  handleKeyDown(ev: KeyboardEvent) {
    const { target, key } = ev;
    if (this.isRadio(target) && !this.disabled) {
      if (key === "ArrowDown" || key === "ArrowRight") {
        ev.preventDefault();
        const radios = this.getRadios();
        const index = radios.findIndex((radio) => radio.value === this.value);
        const radio = radios[(index + 1) % radios.length];
        radio.focus();
        this.value = radio.value;
        this.valueChange.emit(this.value);
      } else if (key === "ArrowUp" || key === "ArrowLeft") {
        ev.preventDefault();
        const radios = this.getRadios();
        const index = radios.findIndex((radio) => radio.value === this.value);
        const radio = radios[(index - 1 + radios.length) % radios.length];
        radio.focus();
        this.value = radio.value;
        this.valueChange.emit(this.value);
      } else if (ev.key === " ") {
        this.value = target.value;
        this.valueChange.emit(this.value);
      }
    }
  }

  render() {
    return (
      <Host>
        <style>{`:host{--mode:${this.buttons ? 'buttons' : 'radios'};}`}</style>
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
        <div class={this.buttons ? "buttons" : "content"}>
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
