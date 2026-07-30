import { Component, Host } from "@stencil/core";

@Component({
  tag: "orb-daw",
  styleUrl: "daw.css",
  shadow: true,
})
export class Daw {
  render() {
    return (
      <Host>
        <slot></slot>
      </Host>
    );
  }
}
