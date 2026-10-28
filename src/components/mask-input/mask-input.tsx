import { Component, Host } from '@stencil/core';

@Component({
  tag: 'orb-mask-input',
  styleUrl: 'mask-input.css',
  shadow: true,
})
export class MaskInput {
  render() {
    return (
      <Host>
        <slot></slot>
      </Host>
    );
  }
}
