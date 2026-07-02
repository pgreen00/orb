import { Component, Element, Host, Listen, Prop, h } from '@stencil/core';

@Component({
  tag: 'je-pill',
  styleUrl: 'je-pill.css',
  shadow: true,
})
export class JePill {
  @Element() el: HTMLJePillElement
  @Prop({ reflect: true }) outline = false;

  @Listen('keydown', { capture: true })
  onClick(ev: KeyboardEvent) {
    if (this.el.role == 'button' && (ev.key == ' ' || ev.key == 'Enter')) {
      this.el.click()
    }
  }

  render() {
    return (
      <Host>
        <slot></slot>
      </Host>
    );
  }
}
