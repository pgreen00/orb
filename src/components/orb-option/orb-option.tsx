import { Component, Host, Listen, Prop } from "@stencil/core";

@Component({
  tag: "orb-option",
  styleUrl: "orb-option.css",
  shadow: true,
})
export class OrbOption {
  @Prop() value: any;
  @Prop() selected = false;
  @Prop() disabled = false;

  @Listen("click", { capture: true })
  onClick(ev: Event) {
    if (this.disabled) {
      ev.stopImmediatePropagation();
    }
  }

  @Listen("keydown", { capture: true })
  onKeyDown(ev: KeyboardEvent) {
    if (this.disabled) {
      ev.stopImmediatePropagation();
    }
  }

  render() {
    return (
      <Host
        role="option"
        aria-selected={this.selected ? "true" : "false"}
        aria-disabled={this.disabled ? "true" : "false"}
        tabindex={this.disabled ? -1 : 0}
      >
        <slot></slot>
      </Host>
    );
  }
}
