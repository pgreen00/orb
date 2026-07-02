import { Component, Host, h } from '@stencil/core';

@Component({
  tag: 'je-split-panel',
  styleUrl: 'je-split-panel.css',
  shadow: true,
})
export class JeSplitPanel {
  render() {
    return (
      <Host>
        <slot></slot>
      </Host>
    );
  }
}
