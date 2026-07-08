import { Component, Host } from "@stencil/core";

@Component({
  tag: "orb-range",
  styleUrl: "orb-range.css",
  shadow: true,
})
export class OrbRange {
  render() {
    return (
      <Host>
        <slot></slot>
      </Host>
    );
  }
}
