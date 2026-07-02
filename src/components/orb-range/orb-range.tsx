import { Component, Host, h } from '@stencil/core';

@Component({
  tag: 'je-range',
  styleUrl: 'je-range.css',
  shadow: true,
})
export class JeRange {
  render() {
    return (
      <Host>
        <slot></slot>
      </Host>
    );
  }
}
