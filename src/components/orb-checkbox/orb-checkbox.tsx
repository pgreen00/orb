import { AttachInternals, Component, EventEmitter, Host, Prop, h, Element, Event, Listen, Watch } from '@stencil/core';

@Component({
  tag: 'je-checkbox',
  styleUrl: 'je-checkbox.css',
  shadow: true,
  formAssociated: true
})
export class JeCheckbox {
  @AttachInternals() internals: ElementInternals;
  @Element() el!: HTMLElement;

  /**
   * Original value form will reset to
   */
  @Prop() originalValue?: boolean;

  /**
   * By default, it will submit true or false depending on the checked state.
   * Use this property to submit a custom value instead.
   */
  @Prop() data?: string;

  /**
   * Whether or not the checkbox is active
   */
  @Prop({ mutable: true }) value?: boolean;

  /**
   * Whether or not the label should go before or after the checkbox
   */
  @Prop() labelPlacement: 'start' | 'end' = 'end';

  /**
   * If the checkbox should contain a 3rd indeterminate state
   */
  @Prop() indeterminate = false;

  /**
   * Marks the control as required in the form. This will only affect indeterminate checkboxes.
   */
  @Prop() required = false;

  /**
   * Emits the current value whenever it's state changes
   */
  @Event({ bubbles: false }) valueChange: EventEmitter<boolean | undefined>;

  componentWillLoad() {
    if (this.value === undefined && !this.indeterminate) {
      this.value = false;
    }
    this.originalValue = this.value;
  }

  formResetCallback() {
    if (this.value !== this.originalValue) {
      this.value = this.originalValue;
    }
  }

  componentDidLoad() {
    this.internals.role = 'checkbox'
    this.el.tabIndex = 0
  }

  componentDidRender() {
    this.internals.states.clear()
    this.internals.states.add(this.value ? 'checked' : this.value === undefined ? 'indeterminate' : 'unchecked')
    this.internals.ariaChecked = this.value ? 'true' : this.value === undefined ? 'mixed' : 'false'
    this.internals.ariaRequired = this.required ? 'true' : 'false'
    this.internals.ariaInvalid = this.internals.validity.valid ? 'true' : 'false'
  }

  @Listen('click')
  onClick(_ev: MouseEvent) {
    this.value = !this.value;
    this.valueChange.emit(this.value);
  }

  @Listen('keydown')
  onKeyDown(ev: KeyboardEvent) {
    if (ev.key === ' ') {
      ev.preventDefault();
      ev.stopPropagation();
      this.value = !this.value;
      this.valueChange.emit(this.value);
    }
  }

  @Watch('value')
  handleValueChange() {
    this.internals.setFormValue(this.data ? (this.value === true ? this.data : null) : this.value === true ? 'true' : this.value === false ? 'false' : null);
    if (this.value === undefined && this.required) {
      this.internals.setValidity({ valueMissing: true }, 'This field is required');
    } else {
      this.internals.setValidity({});
    }
  }

  render() {
    return (
      <Host>
        {this.labelPlacement == 'start' && <slot />}
        <je-icon aria-hidden="true" fill={this.value}>
          {this.value === true ? 'check_box' : this.value === false ? 'check_box_outline_blank' : 'indeterminate_check_box'}
        </je-icon>
        {this.labelPlacement == 'end' && <slot />}
      </Host>
    );
  }
}
