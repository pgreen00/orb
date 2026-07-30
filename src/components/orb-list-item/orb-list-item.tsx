import { Component, Host } from "@stencil/core";

@Component({
  tag: "orb-li",
  styleUrl: "orb-list-item.css",
  shadow: true,
})
export class OrbListItem {
  render() {
    return (
      <Host role="listitem">
        <span part="label">
          <slot />
        </span>
        <slot name="sublist" />
      </Host>
    );
  }
}
