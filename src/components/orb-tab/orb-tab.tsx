import { AttachInternals, Component, Element, Host, Prop, h } from '@stencil/core';

@Component({
  tag: 'je-tab',
  styleUrl: 'je-tab.css',
  shadow: true,
  formAssociated: true
})
export class JeTab {
  @AttachInternals() internals: ElementInternals;
  @Element() el: HTMLJeTabElement;
  @Prop() value?: string;
  @Prop() active = false;

  componentDidRender() {
    this.internals.states.clear()
    if (this.active) {
      this.internals.states.add('--active')
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
