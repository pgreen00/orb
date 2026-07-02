import { Component, Host, h } from '@stencil/core';

@Component({
  tag: 'je-item',
  styleUrl: 'je-item.css',
  shadow: {
    delegatesFocus: true
  },
})
export class JeItem {
  render() {
    return (
      <Host>
        <div>
          <slot name='start'/>
        </div>
        <button type='button'>
          <slot />
        </button>
        <div>
        <slot name='end'/>
        </div>
      </Host>
    );
  }
}
