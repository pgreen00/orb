import { Component, Host, Prop } from "@stencil/core";
import { CheckIcon } from "../../utils/icons";

@Component({
  tag: "orb-mi",
  styleUrl: "menu-item.css",
  shadow: true,
})
export class MenuItem {
  @Prop() checked = false;
  render() {
    return (
      <Host role="menuitem">
        <div part="left-gutter">
          {this.checked && <CheckIcon class="check" />}
        </div>
        <span part="main">
          <slot name="icon"></slot>
          <slot></slot>
          <slot name="details"></slot>
        </span>
        <div part="left-gutter" />
      </Host>
    );
  }
}
