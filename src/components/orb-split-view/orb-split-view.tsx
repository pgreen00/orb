import { Component, Host, h } from "@stencil/core";

@Component({
  tag: "orb-split-view",
  styleUrl: "orb-split-view.css",
  shadow: true,
})
export class OrbSplitView {
  render() {
    return (
      <Host>
        <slot></slot>
      </Host>
    );
  }
}
