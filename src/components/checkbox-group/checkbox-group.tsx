import { Component, Host, h } from '@stencil/core';

@Component({
  tag: 'orb-checkbox-group',
  styleUrl: 'checkbox-group.css',
  shadow: true,
})
export class CheckboxGroup {
  render() {
    return (
      <Host>
        <slot></slot>
      </Host>
    );
  }
}
