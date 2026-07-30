import { Component, Host, Prop } from "@stencil/core";
import { shade, Color as ColorValue } from "../../utils/color";

@Component({
  tag: "orb-color",
  shadow: true,
})
export class Color {
  /** Fixed color */
  @Prop({ reflect: true }) color?: ColorValue;

  /** Color in light mode */
  @Prop() light?: ColorValue;

  /** Color in dark mode */
  @Prop() dark?: ColorValue;

  private get cssValue() {
    if (this.color) {
      return shade(this.color, 500);
    } else {
      return `light-dark(${this.light ? shade(this.light, 500) : shade("neutral", 900)}, ${this.dark ? shade(this.dark, 500) : shade("neutral", 50)})`;
    }
  }

  render() {
    return (
      <Host>
        <style>{`:host{display:contents;color:${this.cssValue};}`}</style>
        <slot />
      </Host>
    );
  }
}
