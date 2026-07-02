import { Component, Host, h } from "@stencil/core";

@Component({
  tag: "orb-daw",
  styleUrl: "orb-daw.css",
  shadow: true,
})
export class OrbDaw {
  render() {
    return (
      <Host>
        <slot></slot>
      </Host>
    );
  }
}
