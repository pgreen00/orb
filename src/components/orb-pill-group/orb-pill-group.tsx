import { Component, Host, h } from '@stencil/core';

@Component({
  tag: 'je-pill-group',
  styleUrl: 'je-pill-group.css',
  shadow: true,
})
export class JePillGroup {
  render() {
    return (
      <Host>
        <slot></slot>
      </Host>
    );
  }
}
