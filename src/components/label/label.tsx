import { Component, Prop, Host } from "@stencil/core";

@Component({
  tag: "orb-label",
  styleUrl: "label.css",
  shadow: true,
})
export class Label {
  @Prop({ reflect: true }) required?: boolean;

  render() {
    return (
      <Host aria-hidden="true">
        <slot></slot>
      </Host>
    );
  }
}
