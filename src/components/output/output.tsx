import { Component, Host } from '@stencil/core';

@Component({
  tag: 'orb-output',
  styleUrl: 'output.css',
  shadow: true,
})
export class Output {
  render() {
    return (
      <Host>
        <slot></slot>
      </Host>
    );
  }
}
