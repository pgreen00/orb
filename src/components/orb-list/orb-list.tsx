import { Component, Host, Prop } from "@stencil/core";

@Component({
  tag: "orb-list",
  styleUrl: "orb-list.css",
  shadow: true,
})
export class OrbList {
  @Prop({ reflect: true }) dense = false;

  render() {
    return (
      <Host role="list">
        <slot></slot>
      </Host>
    );
  }
}
