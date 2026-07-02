import { Component, Host, Prop, h } from "@stencil/core";

@Component({
  tag: "je-divider",
  styleUrl: "je-divider.css",
  shadow: true,
})
export class JeDivider {
  @Prop({ reflect: true }) type: "horizontal" | "vertical" = "horizontal";
  @Prop({ reflect: true }) spacing: "sm" | "md" | "lg" | "none" = "md";

  render() {
    return <Host role="seperator" />;
  }
}
