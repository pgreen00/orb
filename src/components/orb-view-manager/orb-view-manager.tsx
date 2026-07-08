import { Component, Host } from "@stencil/core";

@Component({
  tag: "orb-view-manager",
  styleUrl: "orb-view-manager.css",
  shadow: true,
})
export class OrbViewManager {
  render() {
    return (
      <Host>
        <slot></slot>
      </Host>
    );
  }
}
