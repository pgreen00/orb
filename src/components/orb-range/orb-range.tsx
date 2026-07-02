import { Component, Host, h } from "@stencil/core";

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
