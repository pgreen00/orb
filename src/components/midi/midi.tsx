import { Component, Host } from "@stencil/core";

@Component({
  tag: "orb-midi",
  styleUrl: "midi.css",
  shadow: true,
})
export class Midi {
  render() {
    return (
      <Host>
        <slot></slot>
      </Host>
    );
  }
}
