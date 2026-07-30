import { Component, Host } from "@stencil/core";

@Component({
  tag: "orb-li",
  styleUrl: "list-item.css",
  shadow: true,
})
export class ListItem {
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
