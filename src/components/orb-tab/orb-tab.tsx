import {
  AttachInternals,
  Component,
  Element,
  Host,
  Prop,
  h,
} from "@stencil/core";

@Component({
  tag: "orb-tab",
  styleUrl: "orb-tab.css",
  shadow: true,
  formAssociated: true,
})
export class OrbTab {
  @AttachInternals() internals: ElementInternals;
  @Element() el: HTMLOrbTabElement;
  @Prop() value?: string;
  @Prop() active = false;

  componentDidRender() {
    this.internals.states.clear();
    if (this.active) {
      this.internals.states.add("--active");
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
