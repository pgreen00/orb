import { Component, Host, h } from "@stencil/core";

@Component({
  tag: "orb-pill-group",
  styleUrl: "orb-pill-group.css",
  shadow: true,
})
export class OrbPillGroup {
  render() {
    return (
      <Host>
        <slot></slot>
      </Host>
    );
  }
}
