import { Component, Host, Prop, Watch, Element } from "@stencil/core";

@Component({
  tag: "orb-note",
  styleUrl: "note.css",
  shadow: true,
})
export class Note {
  @Element() el: HTMLElement;

  @Prop({ reflect: true }) invalid = false;
  @Prop() for?: string;

  @Watch('for', { immediate: true })
  onForChange() {
    if (this.for) {
      const root = this.el.getRootNode() as ShadowRoot | HTMLDocument
      const target = root.getElementById(this.for)
      if (target) {
        target.ariaDescribedByElements = [this.el]
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
