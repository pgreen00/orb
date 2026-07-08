import { Component, Prop, Host } from "@stencil/core";

@Component({
  tag: "orb-label",
  styleUrl: "orb-label.css",
  shadow: true,
})
export class OrbLabel {
  @Prop({ reflect: true }) required?: boolean;

  render() {
    return (
      <Host aria-hidden="true">
        <slot></slot>
      </Host>
    );
  }
}
