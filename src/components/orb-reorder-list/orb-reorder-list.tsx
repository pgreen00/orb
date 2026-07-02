import { Component, Host, h } from "@stencil/core";

@Component({
  tag: "orb-reorder-list",
  styleUrl: "orb-reorder-list.css",
  shadow: true,
})
export class OrbReorderList {
  render() {
    return (
      <Host>
        <slot></slot>
      </Host>
    );
  }
}
