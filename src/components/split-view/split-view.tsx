import { Component, Host } from "@stencil/core";

@Component({
  tag: "orb-split-view",
  styleUrl: "split-view.css",
  shadow: true,
})
export class SplitView {
  render() {
    return (
      <Host>
        <slot></slot>
      </Host>
    );
  }
}
