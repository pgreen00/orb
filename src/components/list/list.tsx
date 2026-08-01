import { AttachInternals, Component, Host, Prop } from "@stencil/core";

@Component({
  tag: "orb-list",
  styleUrl: "list.css",
  shadow: true,
})
export class List {
  @Prop({ reflect: true }) dense = false;
  @AttachInternals() internals: ElementInternals;

  componentWillLoad() {
    this.internals.role = "list";
  }

  render() {
    return (
      <Host>
        <slot></slot>
      </Host>
    );
  }
}
