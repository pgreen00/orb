import { Component, Host, Prop } from "@stencil/core";

@Component({
  tag: "orb-mesh",
  styleUrl: "orb-mesh.css",
  shadow: true,
})
export class OrbMesh {
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
          <style>{`:host{gap:var(--orb-spacing-${this.space});}`}</style>
        )}
        <slot></slot>
      </Host>
    );
  }
}
