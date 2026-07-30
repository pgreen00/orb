import { Component, Host, Prop } from "@stencil/core";

@Component({
  tag: "orb-list",
  styleUrl: "list.css",
  shadow: true,
})
export class List {
  @Prop({ reflect: true }) dense = false;

  render() {
    return (
      <Host role="list">
        <slot></slot>
      </Host>
    );
  }
}
