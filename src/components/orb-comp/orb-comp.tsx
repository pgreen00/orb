import { Component, Host } from "@stencil/core";

@Component({
  tag: "orb-comp",
  styleUrl: "orb-comp.css",
  shadow: true,
})
export class OrbComp {
  render() {
    return (
      <Host>
        <slot></slot>
      </Host>
    );
  }
}
