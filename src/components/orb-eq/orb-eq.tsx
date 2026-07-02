import { Component, Host, h } from '@stencil/core';

@Component({
  tag: 'je-eq',
  styleUrl: 'je-eq.css',
  shadow: true,
})
export class JeEq {
  render() {
    return (
      <Host>
        <slot></slot>
      </Host>
    );
  }
}
