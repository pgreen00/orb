import { Component, Host, h } from "@stencil/core";

@Component({
  tag: "orb-reorder-item",
  styleUrl: "orb-reorder-item.css",
  shadow: true,
})
export class OrbReorderItem {
  render() {
    return (
      <Host>
        <slot></slot>
      </Host>
    );
  }
}
