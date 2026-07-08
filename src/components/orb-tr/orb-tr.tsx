import { Component, Element, Host, Prop } from "@stencil/core";

@Component({
  tag: "orb-tr",
  styleUrl: "orb-tr.css",
  shadow: true,
})
export class OrbTr {
  @Element() host: HTMLElement;
  @Prop({ reflect: true }) type: "header" | "body" | "footer" = "body";

  render() {
    return (
      <Host>
        <slot></slot>
      </Host>
    );
  }
}
