import { Component, Host, h } from '@stencil/core';

@Component({
  tag: 'je-view-manager',
  styleUrl: 'je-view-manager.css',
  shadow: true,
})
export class JeViewManager {
  render() {
    return (
      <Host>
        <slot></slot>
      </Host>
    );
  }
}
