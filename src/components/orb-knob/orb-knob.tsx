import { Component, Host } from "@stencil/core";

@Component({
  tag: "orb-knob",
  styleUrl: "orb-knob.css",
  shadow: true,
})
export class OrbKnob {
  render() {
    return (
      <Host>
        <slot></slot>
      </Host>
    );
  }
}
