import { Component, Host } from '@stencil/core';

@Component({
  tag: 'orb-tag-input',
  styleUrl: 'tag-input.css',
  shadow: true,
})
export class TagInput {
  render() {
    return (
      <Host>
        <slot></slot>
      </Host>
    );
  }
}
