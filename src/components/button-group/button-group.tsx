import { AttachInternals, Component, Element } from "@stencil/core";

@Component({
  tag: "orb-button-group",
  styleUrl: "button-group.css",
  shadow: true
})
export class ButtonGroup {
  @Element() el: HTMLElement;
  @AttachInternals() internals: ElementInternals

  componentWillLoad() {
    this.internals.role = "group"
  }

  render() {
    return <slot/>;
  }
}
