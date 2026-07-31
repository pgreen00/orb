import { Component, Prop } from "@stencil/core";

@Component({
  tag: "orb-link",
  styleUrl: "link.css",
  shadow: {
    delegatesFocus: true,
  },
})
export class Link {
  /** Underlines the text */
  @Prop() underline = false;

  /** Makes text bold */
  @Prop() bold = false;

  /** Makes text the current color, rather than the primary color */
  @Prop() accent = false;

  /** Passed to anchor */
  @Prop() href?: string;

  /** Passed to anchor */
  @Prop() target?: string;

  /** Passed to anchor */
  @Prop() rel?: string;

  /** Passed to anchor */
  @Prop() download?: string;

  render() {
    return (
      <a
        part="anchor"
        tabindex={0}
        href={this.href}
        target={this.target}
        rel={
          this.target !== undefined && this.rel === undefined
            ? "noreferrer noopener"
            : this.rel
        }
        download={this.download}
        class={{
          underline: this.underline,
          bold: this.bold,
          accent: this.accent,
        }}
      >
        <slot></slot>
      </a>
    );
  }
}
