import { Component, Host, h } from "@stencil/core";

@Component({
  tag: "orb-control",
  styleUrl: "orb-control.css",
  shadow: true,
})
export class OrbControl {
  render() {
    return (
      <Host>
        <slot></slot>
      </Host>
    );
  }
}
