import { Component, Host, Prop } from "@stencil/core";

@Component({
  tag: "orb-divider",
  styleUrl: "divider.css",
  shadow: true,
})
export class Divider {
  @Prop({ reflect: true }) type: "horizontal" | "vertical" = "horizontal";
  @Prop({ reflect: true }) spacing: "sm" | "md" | "lg" | "none" = "md";

  render() {
    return <Host role="separator" />;
  }
}
