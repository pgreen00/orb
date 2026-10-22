import { Component, Host, h } from '@stencil/core';

@Component({
  tag: 'orb-markdown',
  styleUrl: 'markdown.css',
  shadow: true,
})
export class Markdown {
  render() {
    return (
      <Host>
        <slot></slot>
      </Host>
    );
  }
}
