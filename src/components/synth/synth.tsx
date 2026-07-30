import { Component, Host } from "@stencil/core";

@Component({
  tag: "orb-synth",
  styleUrl: "synth.css",
  shadow: true,
})
export class Synth {
  render() {
    return (
      <Host>
        <slot></slot>
      </Host>
    );
  }
}
