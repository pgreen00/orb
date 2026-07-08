import { Component, Host } from "@stencil/core";

@Component({
  tag: "orb-discard-form",
  styleUrl: "orb-discard-form.css",
  shadow: true,
})
export class OrbDiscardForm {
  render() {
    return (
      <Host>
        <slot></slot>
      </Host>
    );
  }
}
