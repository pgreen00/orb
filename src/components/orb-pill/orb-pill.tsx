import { Component, Element, Host, Listen, Prop, h } from "@stencil/core";

@Component({
  tag: "orb-pill",
  styleUrl: "orb-pill.css",
  shadow: true,
})
export class OrbPill {
  @Element() el: HTMLOrbPillElement;
  @Prop({ reflect: true }) outline = false;

  @Listen("keydown", { capture: true })
  onClick(ev: KeyboardEvent) {
    if (this.el.role == "button" && (ev.key == " " || ev.key == "Enter")) {
      this.el.click();
    }
  }

  render() {
    return (
      <Host>
        <slot></slot>
      </Host>
    );
  }
}
