import { Component, Host } from "@stencil/core";

@Component({
  tag: "orb-eq",
  styleUrl: "eq.css",
  shadow: true,
})
export class Eq {
  render() {
    return (
      <Host>
        <slot></slot>
      </Host>
    );
  }
}
