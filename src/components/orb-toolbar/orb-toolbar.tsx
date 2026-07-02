import { Component, Host, Prop, h } from "@stencil/core";

@Component({
  tag: "je-toolbar",
  styleUrl: "je-toolbar.css",
  shadow: true,
})
export class JeToolbar {
  @Prop({ reflect: true }) flank: boolean | "reverse" = false;
  @Prop() mode: "row" | "column" = "row";
  @Prop() space:
    | "3xs"
    | "2xs"
    | "xs"
    | "sm"
    | "md"
    | "lg"
    | "xl"
    | "2xs"
    | "3xl" = "md";

  render() {
    return (
      <Host>
        <style>{`:host{--gap:var(--je-spacing-${this.space});--direction:${this.mode};}`}</style>
        <div part="main-container" class={{ flank: this.flank === true }}>
          <slot />
        </div>
        <div part="end-container" class={{ flank: this.flank === "reverse" }}>
          <slot name="end" />
        </div>
      </Host>
    );
  }
}
