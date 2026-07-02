import { Component, Element, Host, Prop, h } from "@stencil/core";

@Component({
  tag: "je-tr",
  styleUrl: "je-tr.css",
  shadow: true,
})
export class JeTr {
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
