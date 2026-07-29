import { Component, Host } from "@stencil/core";

@Component({
  tag: "orb-li",
  styleUrl: "orb-list-item.css",
  shadow: true,
})
export class OrbListItem {
  render() {
    return (
      <Host>
        <slot></slot>
      </Host>
    );
  }
}
