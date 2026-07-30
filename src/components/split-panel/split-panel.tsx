import { Component, Host } from "@stencil/core";

@Component({
  tag: "orb-split-panel",
  styleUrl: "split-panel.css",
  shadow: true,
})
export class SplitPanel {
  render() {
    return (
      <Host>
        <slot></slot>
      </Host>
    );
  }
}
