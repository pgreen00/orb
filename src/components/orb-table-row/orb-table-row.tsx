import { Component, Element, Host, Prop } from "@stencil/core";

@Component({
  tag: "orb-tr",
  styleUrl: "orb-table-row.css",
  shadow: true,
})
export class OrbTableRow {
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
