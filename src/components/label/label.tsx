import { Component, Prop, Host, Watch, Element } from "@stencil/core";

@Component({
  tag: "orb-label",
  styleUrl: "label.css",
  shadow: true,
})
export class Label {
  @Element() el: HTMLElement;

  @Prop({ reflect: true }) required = false;
  @Prop() for?: string;

  @Watch('for', { immediate: true })
  onForChange() {
    if (this.for) {
      const root = this.el.getRootNode() as ShadowRoot | HTMLDocument
      const target = root.getElementById(this.for)
      if (target) {
        target.ariaLabelledByElements = [this.el]
      }
    }
  }

  render() {
    return (
      <Host>
        <slot/>
      </Host>
    );
  }
}
