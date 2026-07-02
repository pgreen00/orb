import { Component, Prop, h } from "@stencil/core";

@Component({
  tag: "orb-placeholder",
  styleUrl: "orb-placeholder.css",
  shadow: true,
})
export class OrbPlaceholder {
  /**
   * Whether or not the component should have the animated "shimmer" effect
   */
  @Prop({ reflect: true }) animated = true;

  render() {
    return <slot />;
  }
}
