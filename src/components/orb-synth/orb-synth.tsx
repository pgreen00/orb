import { Component, Host, h } from '@stencil/core';

@Component({
  tag: 'je-synth',
  styleUrl: 'je-synth.css',
  shadow: true,
})
export class JeSynth {
  render() {
    return (
      <Host>
        <slot></slot>
      </Host>
    );
  }
}
