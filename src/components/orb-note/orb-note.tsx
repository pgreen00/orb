import { Component, Host, Prop, h } from "@stencil/core";

@Component({
  tag: "orb-note",
  styleUrl: "orb-note.css",
  shadow: true,
})
export class OrbNote {
  @Prop({ reflect: true }) invalid?: boolean;

  render() {
    return (
      <Host aria-hidden="true">
        <slot></slot>
      </Host>
    );
  }
}
