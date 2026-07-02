import { Component, Host, h } from "@stencil/core";

@Component({
  tag: "orb-split-panel",
  styleUrl: "orb-split-panel.css",
  shadow: true,
})
export class OrbSplitPanel {
  render() {
    return (
      <Host>
        <slot></slot>
      </Host>
    );
  }
}
