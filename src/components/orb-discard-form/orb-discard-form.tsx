import { Component, Host, h } from '@stencil/core';

@Component({
  tag: 'je-discard-form',
  styleUrl: 'je-discard-form.css',
  shadow: true,
})
export class JeDiscardForm {
  render() {
    return (
      <Host>
        <slot></slot>
      </Host>
    );
  }
}
