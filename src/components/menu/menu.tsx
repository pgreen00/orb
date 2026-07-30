import { Component, Host, Prop } from "@stencil/core";

@Component({
  tag: "orb-menu",
  styleUrl: "menu.css",
  shadow: true,
})
export class Menu {
  @Prop() bar = false;

  render() {
    return (
      <Host role={this.bar ? "menubar" : "menu"}>
        <slot></slot>
      </Host>
    );
  }
}
