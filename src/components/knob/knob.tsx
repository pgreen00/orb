import { Component, Host } from "@stencil/core";

@Component({
  tag: "orb-knob",
  styleUrl: "knob.css",
  shadow: true,
})
export class Knob {
  render() {
    return (
      <Host>
        <slot></slot>
      </Host>
    );
  }
}
