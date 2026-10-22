import { Component, Host, h } from '@stencil/core';

@Component({
  tag: 'orb-channel',
  styleUrl: 'channel.css',
  shadow: true,
})
export class Channel {
  render() {
    return (
      <Host>
        <slot></slot>
      </Host>
    );
  }
}
