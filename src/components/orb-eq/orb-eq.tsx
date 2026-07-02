import { Component, Host, h } from "@stencil/core";

@Component({
  tag: "orb-eq",
  styleUrl: "orb-eq.css",
  shadow: true,
})
export class OrbEq {
  render() {
    return (
      <Host>
        <slot></slot>
      </Host>
    );
  }
}
