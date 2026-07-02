import { Component, Prop, h, Element, Host } from "@stencil/core";

@Component({
  tag: "orb-radio",
  styleUrl: "orb-radio.css",
  shadow: true,
})
export class OrbRadio {
  @Element() el!: HTMLElement;

  /**
   * The value of this option and the radio group will compare against
   */
  @Prop() value: any;

  /**
   * If the option is currently selected
   */
  @Prop() selected?: boolean;

  render() {
    return (
      <Host
        role="radio"
        tabindex={-1}
        aria-checked={this.selected ? "true" : "false"}
      >
        <orb-icon aria-hidden="true">
          {this.selected ? "radio_button_checked" : "radio_button_unchecked"}
        </orb-icon>
        <slot />
      </Host>
    );
  }
}
