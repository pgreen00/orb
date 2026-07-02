import { Component, Host, h } from '@stencil/core';

@Component({
  tag: 'je-reorder-item',
  styleUrl: 'je-reorder-item.css',
  shadow: true,
})
export class JeReorderItem {
  render() {
    return (
      <Host>
        <slot></slot>
      </Host>
    );
  }
}
