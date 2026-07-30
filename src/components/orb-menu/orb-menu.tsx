import { Component, Host, Prop } from "@stencil/core";

@Component({
  tag: "orb-menu",
  styleUrl: "orb-menu.css",
  shadow: true,
})
export class OrbMenu {
  @Prop() bar = false;

  render() {
    return (
      <Host role={this.bar ? "menubar" : "menu"}>
        <slot></slot>
      </Host>
    );
  }
}
