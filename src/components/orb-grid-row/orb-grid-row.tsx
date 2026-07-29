import { Component, Element, Host, Prop } from "@stencil/core";

@Component({
  tag: "orb-gr",
  styleUrl: "orb-grid-row.css",
  shadow: true,
})
export class OrbGridRow {
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
