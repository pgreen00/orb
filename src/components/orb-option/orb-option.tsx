import { Component, Host, Listen, Prop, h } from '@stencil/core';

@Component({
  tag: 'je-option',
  styleUrl: 'je-option.css',
  shadow: true
})
export class JeOption {
  @Prop() value: any;
  @Prop() selected = false
  @Prop() disabled = false

  @Listen('click', { capture: true })
  onClick(ev: Event) {
    if (this.disabled) {
      ev.stopImmediatePropagation();
    }
  }

  @Listen('keydown', { capture: true })
  onKeyDown(ev: KeyboardEvent) {
    if (this.disabled) {
      ev.stopImmediatePropagation();
    }
  }

  render() {
    return (
      <Host
        role='option'
        aria-selected={this.selected? 'true' : 'false'}
        aria-disabled={this.disabled? 'true' : 'false'}
        tabindex={this.disabled ? -1 : 0}
      >
        <slot></slot>
      </Host>
    );
  }
}
