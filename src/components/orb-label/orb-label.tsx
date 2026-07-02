import { Component, h, Prop, Host } from '@stencil/core';

@Component({
  tag: 'je-label',
  styleUrl: 'je-label.css',
  shadow: true,
})
export class JeLabel {
  @Prop({ reflect: true }) required?: boolean;

  render() {
    return (
      <Host aria-hidden='true'>
        <slot></slot>
      </Host>
    );
  }
}
