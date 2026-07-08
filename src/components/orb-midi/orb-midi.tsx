import { Component, Host } from "@stencil/core";

@Component({
  tag: "orb-midi",
  styleUrl: "orb-midi.css",
  shadow: true,
})
export class OrbMidi {
  render() {
    return (
      <Host>
        <slot></slot>
      </Host>
    );
  }
}
