import { Component, Host, h } from '@stencil/core';

@Component({
  tag: 'je-calendar',
  styleUrl: 'je-calendar.css',
  shadow: true,
})
export class JeCalendar {
  render() {
    return (
      <Host>
        <slot></slot>
      </Host>
    );
  }
}
