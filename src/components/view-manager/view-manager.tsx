import { Component, Host } from "@stencil/core";

@Component({
  tag: "orb-view-manager",
  styleUrl: "view-manager.css",
  shadow: true,
})
export class ViewManager {
  render() {
    return (
      <Host>
        <slot></slot>
      </Host>
    );
  }
}
