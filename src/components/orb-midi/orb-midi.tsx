import { Component, Host, h } from '@stencil/core';

@Component({
  tag: 'je-midi',
  styleUrl: 'je-midi.css',
  shadow: true,
})
export class JeMidi {
  render() {
    return (
      <Host>
        <slot></slot>
      </Host>
    );
  }
}
