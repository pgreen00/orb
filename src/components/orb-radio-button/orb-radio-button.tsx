import { Component, Prop, h, Host } from "@stencil/core";

@Component({
  tag: "orb-radio-button",
  styleUrl: "orb-radio-button.css",
  shadow: true,
})
export class OrbRadioButton {
  /** The value for this option that bw-card-group will compare against */
  @Prop() value?: string;

  /** Changes the styling of the card to indicate it is selected */
  @Prop() selected = false;

  render() {
    return (
      <Host
        role="radio"
        tabindex={-1}
        aria-checked={this.selected ? "true" : "false"}
      >
        <slot />
      </Host>
    );
  }
}
