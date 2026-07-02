import { Component, Element, Host, h } from '@stencil/core';

@Component({
  tag: 'je-button-group',
  styleUrl: 'je-button-group.css'
})
export class JeButtonGroup {
  @Element() el: HTMLElement;

  componentDidLoad() {
    const buttons = Array.from(this.el.querySelectorAll(':scope > je-button, :scope > * > je-button'));
    buttons.at(0)?.classList.add('__first')
    buttons.at(-1)?.classList.add('__last')
  }

  render() {
    return (
      <Host/>
    );
  }
}
