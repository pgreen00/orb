import { Component, Host } from "@stencil/core";

@Component({
  tag: "orb-control",
  styleUrl: "control.css",
  shadow: true,
})
export class Control {
  render() {
    return (
      <Host>
        <slot></slot>
      </Host>
    );
  }
}
