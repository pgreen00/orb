import { Component, Host, Prop, h } from "@stencil/core";
import { Color } from "../../utils/color";

@Component({
  tag: "orb-card",
  styleUrl: "orb-card.css",
  shadow: true,
})
export class OrbCard {
  @Prop({ reflect: true }) color?: Color;

  render() {
    return (
      <Host>
        <slot />
      </Host>
    );
  }
}
