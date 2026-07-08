import { Component, Host } from "@stencil/core";

@Component({
  tag: "orb-synth",
  styleUrl: "orb-synth.css",
  shadow: true,
})
export class OrbSynth {
  render() {
    return (
      <Host>
        <slot></slot>
      </Host>
    );
  }
}
