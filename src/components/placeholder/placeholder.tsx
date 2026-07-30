import { Component, Host, Prop } from "@stencil/core";

@Component({
  tag: "orb-placeholder",
  styleUrl: "placeholder.css",
  shadow: true,
})
export class Placeholder {
  /**
   * Whether or not the component should have the animated "shimmer" effect
   */
  @Prop({ reflect: true }) animated = true;

  render() {
    return <Host />;
  }
}
