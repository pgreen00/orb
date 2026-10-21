import { Component, Host, Prop, Element, forceUpdate } from "@stencil/core";

@Component({
  tag: "orb-split-view",
  styleUrl: "split-view.css",
  shadow: true,
})
export class SplitView {
  @Element() el!: HTMLElement
  /**
   * Aligns the panels vertically instead of horizontally
   */
  @Prop({ reflect: true }) vertical = false;

  async componentDidRender() {
    await customElements.whenDefined('orb-split-panel')
    const panels = Array.from(this.el.querySelectorAll<HTMLOrbSplitPanelElement>(':scope > orb-split-panel'))
    const primary = panels.findIndex(t => t.primary)
    for (let i = 0; i < panels.length; i++) {
      const panel = panels[i]
      panel.vertical = this.vertical
      panel.beforePrimary = i < primary
      panel.afterPrimary = i > primary
    }
  }

  render() {
    return (
      <Host>
        <slot onSlotchange={() => forceUpdate(this.el)}/>
      </Host>
    );
  }
}
