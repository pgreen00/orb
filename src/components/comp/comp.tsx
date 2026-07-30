import { Component, Host } from "@stencil/core";

@Component({
  tag: "orb-comp",
  styleUrl: "comp.css",
  shadow: true,
})
export class Comp {
  render() {
    return (
      <Host>
        <slot></slot>
      </Host>
    );
  }
}
