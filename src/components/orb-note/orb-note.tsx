import { Component, Host, Prop, h } from '@stencil/core';

@Component({
  tag: 'je-note',
  styleUrl: 'je-note.css',
  shadow: true,
})
export class JeNote {
  @Prop({ reflect: true }) invalid?: boolean;

  render() {
    return (
      <Host aria-hidden='true'>
        <slot></slot>
      </Host>
    );
  }
}
