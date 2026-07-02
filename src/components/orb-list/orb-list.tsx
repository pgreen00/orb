import { Component, Host, h } from "@stencil/core";

@Component({
  tag: "orb-list",
  styleUrl: "orb-list.css",
  shadow: true,
})
export class OrbList {
  render() {
    return (
      <Host>
        <slot></slot>
      </Host>
    );
  }
}
