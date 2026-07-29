import { Component, Host } from "@stencil/core";

@Component({
  tag: "orb-mi",
  styleUrl: "orb-menu-item.css",
  shadow: true,
})
export class OrbMenuItem {
  render() {
    return (
      <Host>
        <slot></slot>
      </Host>
    );
  }
}
