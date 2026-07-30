import { Component, Host, Prop } from "@stencil/core";

@Component({
  tag: "orb-note",
  styleUrl: "note.css",
  shadow: true,
})
export class Note {
  @Prop({ reflect: true }) invalid?: boolean;

  render() {
    return (
      <Host aria-hidden="true">
        <slot></slot>
      </Host>
    );
  }
}
