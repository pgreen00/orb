import { Component, Host } from "@stencil/core";

@Component({
  tag: "orb-menu",
  styleUrl: "orb-menu.css",
  shadow: true,
})
export class OrbMenu {
  render() {
    return (
      <Host>
        <slot></slot>
      </Host>
    );
  }
}
