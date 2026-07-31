import { Component, Host } from "@stencil/core";

@Component({
  tag: "orb-timer",
  styleUrl: "timer.css",
  shadow: true,
})
export class Timer {
  render() {
    return (
      <Host>
        <slot></slot>
      </Host>
    );
  }
}
