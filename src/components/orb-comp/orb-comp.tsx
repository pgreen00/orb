import { Component, Host, h } from '@stencil/core';

@Component({
  tag: 'je-comp',
  styleUrl: 'je-comp.css',
  shadow: true,
})
export class JeComp {
  render() {
    return (
      <Host>
        <slot></slot>
      </Host>
    );
  }
}
