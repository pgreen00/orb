import { Component, Prop, h } from '@stencil/core';

@Component({
  tag: 'je-link',
  styleUrl: 'je-link.css',
  shadow: {
    delegatesFocus: true
  },
})
export class JeLink {
  /** Underlines the text */
  @Prop() underline = true;

  /** Makes text bold */
  @Prop() bold = false;

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
      <a part='anchor' tabindex={0} href={this.href} target={this.target} rel={this.rel} download={this.download} class={{ underline: this.underline, bold: this.bold }}>
        <slot></slot>
      </a>
    );
  }
}
