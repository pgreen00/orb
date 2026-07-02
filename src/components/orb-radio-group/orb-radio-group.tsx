import { Component, h, Element, EventEmitter, Prop, Event, Watch, Listen, AttachInternals, State, Host } from '@stencil/core';

@Component({
  tag: 'je-radio-group',
  styleUrl: 'je-radio-group.css',
  shadow: true,
  formAssociated: true
})
export class JeRadioGroup {
  @AttachInternals() internals!: ElementInternals;
  @Element() el!: HTMLJeRadioGroupElement;
  @State() tabindex = 0;

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
   * Emits the selected value whenever it changes
   */
  @Event({ bubbles: false }) valueChange: EventEmitter<any>;

  componentWillLoad() {
    this.internals.setFormValue(this.value);
    if (!this.originalValue) this.originalValue = this.value;
  }

  componentWillRender() {
    this.getRadios().forEach(radio => radio.selected = radio.value === this.value);
  }

  componentDidRender() {
    this.internals.ariaLabel = this.label || this.el.querySelector('[slot=label]')?.textContent
    this.internals.ariaDescription = this.note || this.el.querySelector('[slot=note]')?.textContent
    this.internals.ariaInvalid = this.internals.validity.valid ? 'true' : 'false';

    this.internals.states.clear()
    if (this.required) {
      this.internals.states.add('--required');
      if (this.getRadios().every(t => t.selected)) {
        this.internals.states.add('--valid');
      } else {
        this.internals.setValidity({ customError: true }, 'Please select an option.')
        this.internals.states.add('--invalid');
      }
    }
  }

  componentDidLoad() {
    this.internals.role = 'radiogroup';
  }

  formResetCallback() {
    if (this.value !== this.originalValue) {
      this.value = this.originalValue;
    }
  }

  private getRadios() {
    return Array.from(this.el.querySelectorAll<HTMLJeRadioElement | HTMLJeRadioButtonElement>('je-radio, je-radio-button'));
  }

  private isRadio(target: EventTarget | null): target is (HTMLJeRadioElement | HTMLJeRadioButtonElement) {
    return target instanceof HTMLElement && (target.tagName == 'JE-RADIO' || target.tagName == 'JE-RADIO-BUTTON')
  }

  @Watch('value')
  handleValueChange() {
    this.internals.setFormValue(this.value);
  }

  @Listen('focus')
  onFocus() {
    const radios = this.getRadios();
    (radios.find(radio => radio.value === this.value) ?? radios[0])?.focus();
  }

  @Listen('focusin')
  onFocusIn() {
    this.tabindex = -1;
  }

  @Listen('focusout')
  onFocusOut() {
    this.tabindex = 0;
  }

  @Listen('click')
  handleNewValue(ev: Event) {
    const { target } = ev;
    if (this.isRadio(target)) {
      this.value = target.value;
      this.valueChange.emit(this.value);
    }
  }

  @Listen('keydown', { capture: true })
  handleKeyDown(ev: KeyboardEvent) {
    const { target, key } = ev;
    if (this.isRadio(target) && !this.disabled) {
      if (key === 'ArrowDown' || key === 'ArrowRight') {
        ev.preventDefault();
        const radios = this.getRadios();
        const index = radios.findIndex(radio => radio.value === this.value);
        const radio = radios[(index + 1) % radios.length];
        radio.focus();
        this.value = radio.value;
        this.valueChange.emit(this.value);
      } else if (key === 'ArrowUp' || key === 'ArrowLeft') {
        ev.preventDefault();
        const radios = this.getRadios();
        const index = radios.findIndex(radio => radio.value === this.value);
        const radio = radios[(index - 1 + radios.length) % radios.length];
        radio.focus();
        this.value = radio.value;
        this.valueChange.emit(this.value);
      } else if (ev.key === ' ') {
        this.value = target.value;
        this.valueChange.emit(this.value);
      }
    }
  }

  render() {
    const buttons = this.el.querySelector('je-radio-button') !== null
    return (
      <Host tabindex={this.tabindex}>
        <slot name='label'>
          {this.label && <je-label required={this.required}>{this.label}</je-label>}
        </slot>
        <div class={buttons ? 'buttons' : 'content'}>
          <slot/>
        </div>
        <slot name='note'>
          {this.note && <je-note>{this.note}</je-note>}
        </slot>
      </Host>
    );
  }
}
