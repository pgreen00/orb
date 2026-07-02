import { Component, Element, Host, Prop, h } from "@stencil/core";

@Component({
  tag: "orb-view",
  styleUrl: "orb-view.css",
  shadow: true,
})
export class OrbView {
  @Element() el: HTMLElement;
  @Prop() label?: string;
  @Prop() closable = true;

  private get overlay() {
    return this.el.closest("orb-overlay");
  }

  render() {
    return (
      <Host>
        <header>
          <orb-toolbar>
            <slot name="label">
              {this.label && <h2 part="label">{this.label}</h2>}
            </slot>
            <div class="end" slot="end">
              <slot name="actions" />
              {this.closable && (
                <orb-button size="lg" onClick={() => this.overlay.hide()}>
                  <orb-icon>close</orb-icon>
                </orb-button>
              )}
            </div>
          </orb-toolbar>
        </header>
        <slot name="body" />
        <footer>
          <slot name="footer" />
        </footer>
      </Host>
    );
  }
}
