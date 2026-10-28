import { Component, Host } from '@stencil/core';

@Component({
  tag: 'orb-floating-button',
  styleUrl: 'floating-button.css',
  shadow: true,
})
export class FloatingButton {
  render() {
    return (
      <Host>
        <slot></slot>
      </Host>
    );
  }
}
