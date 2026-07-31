import { Component, Host, Prop } from "@stencil/core";

@Component({
  tag: "orb-color",
  shadow: true,
})
export class Color {
  /** Fixed color */
  @Prop() color?: string;

  /** Color in light mode */
  @Prop() light?: string;

  /** Color in dark mode */
  @Prop() dark?: string;

  private get cssValue() {
    if (this.color) {
      return this.parseColor(this.color);
    } else {
      return `light-dark(${this.parseColor(this.light ?? "neutral")}, ${this.parseColor(this.dark ?? "neutral")})`;
    }
  }

  private parseColor(color: string) {
    const parts = color.split("-");
    const accent = parts[0];
    const shade = parts.at(1) ?? "500";
    return `var(--orb-${accent}-${shade})`;
  }

  render() {
    return (
      <Host>
        <style>{`:host{display:inline-flex;color:${this.cssValue};}`}</style>
        <slot />
      </Host>
    );
  }
}
