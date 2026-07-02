import { Component, Element, Host, Prop, State, h } from "@stencil/core";

@Component({
  tag: "orb-tc",
  styleUrl: "orb-tc.css",
  shadow: true,
})
export class OrbTc {
  @Element() host: HTMLElement;
  @Prop() colSpan?: number;
  @Prop() rowSpan?: number;
  @Prop() copy = false;
  @State() hover = false;
  @State() copied = false;
  private to?: any;

  private async copyToClipboard() {
    try {
      if (this.to) clearTimeout(this.to);
      await navigator.clipboard.writeText(this.host.textContent);
      this.copied = true;
      this.to = setTimeout(() => (this.copied = false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }

  render() {
    const style = this.styles();
    return (
      <Host>
        {style}
        {this.copy ? (
          <orb-toolbar
            onMouseEnter={() => (this.hover = true)}
            onMouseLeave={() => (this.hover = false)}
          >
            <slot />
            <orb-button
              slot="end"
              fill="clear"
              size="sm"
              class={{ "icon-only": true, hover: this.hover }}
              onClick={() => this.copyToClipboard()}
            >
              <orb-icon size="sm" class={{ success: this.copied }}>
                {this.copied ? "check" : "content_copy"}
              </orb-icon>
            </orb-button>
          </orb-toolbar>
        ) : (
          <slot />
        )}
      </Host>
    );
  }

  private styles() {
    const styles = {} as Record<string, string>;
    if (this.colSpan != undefined) {
      styles["grid-column"] = "span " + this.colSpan;
    }
    if (this.rowSpan != undefined) {
      styles["grid-row"] = "span " + this.rowSpan;
    }
    return (
      <style>
        {":host{" +
          Object.entries(styles)
            .map(([key, value]) => `${key}:${value}`)
            .join(";") +
          ";}"}
      </style>
    );
  }
}
