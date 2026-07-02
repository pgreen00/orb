import { Component, Host, Prop, h } from "@stencil/core";

@Component({
  tag: "orb-divider",
  styleUrl: "orb-divider.css",
  shadow: true,
})
export class OrbDivider {
  @Prop({ reflect: true }) type: "horizontal" | "vertical" = "horizontal";
  @Prop({ reflect: true }) spacing: "sm" | "md" | "lg" | "none" = "md";

  render() {
    return <Host role="seperator" />;
  }
}
