import { Component, Host, Prop, h } from "@stencil/core";

@Component({
  tag: "je-grid",
  styleUrl: "je-grid.css",
  shadow: true,
})
export class JeGrid {
  @Prop() space?:
    | "3xs"
    | "2xs"
    | "xs"
    | "sm"
    | "md"
    | "lg"
    | "xl"
    | "2xs"
    | "3xl";

  render() {
    return (
      <Host>
        {this.space && (
          <style>{`:host{gap:var(--je-spacing-${this.space});}`}</style>
        )}
        <slot></slot>
      </Host>
    );
  }
}
