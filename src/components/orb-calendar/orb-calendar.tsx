import { Component, Host } from "@stencil/core";

@Component({
  tag: "orb-calendar",
  styleUrl: "orb-calendar.css",
  shadow: true,
})
export class OrbCalendar {
  render() {
    return (
      <Host>
        <slot></slot>
      </Host>
    );
  }
}
