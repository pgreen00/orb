import { Component, Host } from '@stencil/core';

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
