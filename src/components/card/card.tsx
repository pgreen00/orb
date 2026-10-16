import { Component, Host, Prop } from "@stencil/core";
import { Color } from "../../utils/color";

@Component({
  tag: "orb-card",
  styleUrl: "card.css",
  shadow: {
    delegatesFocus: true
  },
})
export class Card {
  @Prop({ reflect: true }) color?: Color;

  render() {
    return (
      <Host>
        <slot />
      </Host>
    );
  }
}
