import { Component, Host, Prop, h } from "@stencil/core";

@Component({
  tag: "je-stack",
  styleUrl: "je-stack.css",
  shadow: true,
})
export class JeStack {
  @Prop() mode: "row" | "column" = "column";
  @Prop() align?: string;
  @Prop() justify?: string;
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
    const styles = [
      `--gap:var(--je-spacing-${this.space});`,
      `--direction:${this.mode};`,
    ];
    if (this.align || (this.mode == "row" && !this.align))
      styles.push(`align-items:${this.align ?? "center"};`);
    if (this.justify) styles.push(`justify-content:${this.justify};`);
    return (
      <Host>
        <style>{`:host{${styles.join("")}}`}</style>
        <slot />
      </Host>
    );
  }
}
