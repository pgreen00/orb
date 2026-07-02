import { Component, EventEmitter, Host, Listen, Prop, h, Event, Element, AttachInternals } from '@stencil/core';

@Component({
  tag: 'je-toggle',
  styleUrl: 'je-toggle.css',
  shadow: true,
  formAssociated: true
})
export class JeToggle {
  @AttachInternals() internals: ElementInternals;
  @Element() el!: HTMLElement;

  /**
   * Original value form will reset to
   */
  @Prop() originalValue: boolean;

  /**
   * Whether or not the toggle is active
   */
  @Prop({ mutable: true }) value = false;

  /**
   * If the label should be placed at the start or end of the toggle
   */
  @Prop() labelPlacement: 'start' | 'end' = 'end';

  /**
   * Emits the new value whenever toggle is clicked
   */
  @Event({ bubbles: false }) valueChange: EventEmitter<boolean>;

  componentWillLoad() {
    if (this.originalValue === undefined) {
      this.originalValue = this.value;
    }
  }

  formResetCallback() {
    this.value = this.originalValue;
  }

  componentDidLoad() {
    this.internals.role = 'switch'
    this.el.tabIndex = 0
  }

  componentDidRender() {
    this.internals.states.clear()
    this.internals.states.add(this.value ? 'checked' : 'unchecked')
    this.internals.ariaChecked = this.value ? 'true' : 'false'
  }

  @Listen('click', { capture: true })
  onClick() {
    this.value = !this.value;
    this.valueChange.emit(this.value);
  }

  @Listen('keydown', { capture: true })
  onKeyDown(ev: KeyboardEvent) {
    if (ev.key === ' ') {
      ev.preventDefault();
      ev.stopPropagation();
      this.value = !this.value;
      this.valueChange.emit(this.value);
    }
  }

  render() {
    return (
      <Host>
        {this.labelPlacement == 'start' && <slot />}
        <div class='toggle-container'>
          <div class='toggle-thumb'></div>
        </div>
        {this.labelPlacement == 'end' && <slot />}
      </Host>
    );
  }
}
