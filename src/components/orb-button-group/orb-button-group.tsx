import { Component, Element, Host } from "@stencil/core";

@Component({
  tag: "orb-button-group",
  styleUrl: "orb-button-group.css",
})
export class OrbButtonGroup {
  @Element() el: HTMLElement;

  componentDidLoad() {
    const buttons = Array.from(
      this.el.querySelectorAll(":scope > orb-button, :scope > * > orb-button"),
    );
    buttons.at(0)?.classList.add("__first");
    buttons.at(-1)?.classList.add("__last");
  }

  render() {
    return <Host />;
  }
}
