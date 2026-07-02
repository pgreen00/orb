import { Component, Host, Prop, h } from "@stencil/core";
import { Color } from "../../utils/color";

@Component({
  tag: "je-card",
  styleUrl: "je-card.css",
  shadow: true,
})
export class JeCard {
  @Prop({ reflect: true }) color?: Color;

  render() {
    return (
      <Host>
        <slot />
      </Host>
    );
  }
}
