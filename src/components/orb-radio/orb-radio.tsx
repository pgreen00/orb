import { Component, Prop, Element, Host } from "@stencil/core";
import { RadioEmpty, RadioFill } from "../../utils/icons";

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
        {this.selected ? <RadioFill /> : <RadioEmpty />}
        <slot />
      </Host>
    );
  }
}
