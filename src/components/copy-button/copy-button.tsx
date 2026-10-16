import { Component, Element, Host, Prop, State } from "@stencil/core";
import { CheckIcon, CopyIcon } from "../../utils/icons";

/**
 * A button that copies text to the clipboard, swapping to a checkmark to
 * confirm. Copies the `value` prop when set, otherwise its own text content.
 */
@Component({
  tag: "orb-copy-button",
  styleUrl: "copy-button.css",
  shadow: true,
})
export class CopyButton {
  @Element() host: HTMLElement;

  /**
   * The text to copy. Falls back to the element's text content when omitted,
   * which is how it behaves when wrapped around the content it copies.
   */
  @Prop() value?: string;

  /** Accessible label for the button. */
  @Prop() label = "Copy";

  @Prop({ reflect: true }) size: "md" | "lg" | "sm" | "xs" = "sm";

  @State() copied = false;
  private to?: ReturnType<typeof setTimeout>;

  disconnectedCallback() {
    if (this.to) clearTimeout(this.to);
  }

  private async copyToClipboard() {
    try {
      await navigator.clipboard.writeText(this.value ?? this.host.textContent);
      if (this.to) clearTimeout(this.to);
      this.copied = true;
      this.to = setTimeout(() => (this.copied = false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }

  render() {
    return (
      <Host>
        <slot />
        <orb-button
          fill="clear"
          size={this.size}
          class="icon-only"
          aria-label={this.copied ? `${this.label} — copied` : this.label}
          onClick={() => this.copyToClipboard()}
        >
          {this.copied ? <CheckIcon class="success" /> : <CopyIcon />}
        </orb-button>
      </Host>
    );
  }
}
