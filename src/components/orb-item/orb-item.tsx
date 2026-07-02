import { Component, Host, h } from "@stencil/core";

@Component({
  tag: "orb-item",
  styleUrl: "orb-item.css",
  shadow: {
    delegatesFocus: true,
  },
})
export class OrbItem {
  render() {
    return (
      <Host>
        <div>
          <slot name="start" />
        </div>
        <button type="button">
          <slot />
        </button>
        <div>
          <slot name="end" />
        </div>
      </Host>
    );
  }
}
