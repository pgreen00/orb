import { Component, Host } from "@stencil/core";

@Component({
  tag: "orb-range",
  styleUrl: "range.css",
  shadow: true,
})
export class Range {
  render() {
    return (
      <Host>
        <slot></slot>
      </Host>
    );
  }
}
