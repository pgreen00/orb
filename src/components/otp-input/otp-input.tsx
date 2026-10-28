import { Component, Host } from '@stencil/core';

@Component({
  tag: 'orb-otp-input',
  styleUrl: 'otp-input.css',
  shadow: true,
})
export class OtpInput {
  render() {
    return (
      <Host>
        <slot></slot>
      </Host>
    );
  }
}
