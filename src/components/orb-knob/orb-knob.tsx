import { Component, Host, h } from '@stencil/core';

@Component({
  tag: 'je-knob',
  styleUrl: 'je-knob.css',
  shadow: true,
})
export class JeKnob {
  render() {
    return (
      <Host>
        <slot></slot>
      </Host>
    );
  }
}
