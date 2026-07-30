import { Component, Host } from "@stencil/core";

@Component({
  tag: "orb-calendar",
  styleUrl: "calendar.css",
  shadow: true,
})
export class Calendar {
  render() {
    return (
      <Host>
        <slot></slot>
      </Host>
    );
  }
}
