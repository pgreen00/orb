import { Component, Host, h } from '@stencil/core';

@Component({
  tag: 'je-daw',
  styleUrl: 'je-daw.css',
  shadow: true,
})
export class JeDaw {
  render() {
    return (
      <Host>
        <slot></slot>
      </Host>
    );
  }
}
