import { Component, Host } from "@stencil/core";

@Component({
  tag: "orb-relative-time",
  styleUrl: "relative-time.css",
  shadow: true,
})
export class RelativeTime {
  render() {
    return (
      <Host>
        <slot></slot>
      </Host>
    );
  }
}
