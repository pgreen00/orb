import { Component, Host } from "@stencil/core";

@Component({
  tag: "orb-discard-form",
  styleUrl: "discard-form.css",
  shadow: true,
})
export class DiscardForm {
  render() {
    return (
      <Host>
        <slot></slot>
      </Host>
    );
  }
}
