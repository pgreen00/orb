import { Component, Host, h } from '@stencil/core';

@Component({
  tag: 'je-list',
  styleUrl: 'je-list.css',
  shadow: true,
})
export class JeList {
  render() {
    return (
      <Host>
        <slot></slot>
      </Host>
    );
  }
}
