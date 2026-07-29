import { Component, Element, Host, Prop, State } from "@stencil/core";
import { CloseIcon, EllipsisIcon } from "../../utils/icons";

@Component({
  tag: "orb-view",
  styleUrl: "orb-view.css",
  shadow: true,
})
export class OrbView {
  @Element() el: HTMLElement;
  @Prop() label?: string;
  @Prop() closable = false;
  @Prop() header: "none" | "minimal" | "prominent" = "minimal";
  @Prop() headingLevel: "1" | "2" | "3" | "4" | "5" | "6" = "1";
  @State() hasActions = false;
  @State() hasFooter = false;

  private setHasActions = (ev: Event) => {
    this.hasActions =
      (ev.target as HTMLSlotElement).assignedElements().length > 0;
  };

  private setHasFooter = (ev: Event) => {
    this.hasFooter =
      (ev.target as HTMLSlotElement).assignedElements().length > 0;
  };

  render() {
    return (
      <Host>
        {this.header !== "none" && (
          <header class={{ [this.header]: true }}>
            <orb-toolbar>
              <slot name="label">
                {this.label && (
                  <span
                    part="label"
                    role="heading"
                    aria-level={this.headingLevel}
                  >
                    {this.label}
                  </span>
                )}
              </slot>
              <div class="end" slot="end">
                <slot name="header-end" />
                <orb-popover class={{ hide: !this.hasActions }}>
                  <orb-button slot="trigger" class="icon-only" fill="clear">
                    <EllipsisIcon />
                  </orb-button>
                  <orb-list>
                    <slot name="actions" onSlotchange={this.setHasActions} />
                  </orb-list>
                </orb-popover>
                {this.closable && (
                  <orb-button
                    class="icon-only"
                    fill="clear"
                    data-overlay="hide"
                  >
                    <CloseIcon />
                  </orb-button>
                )}
              </div>
            </orb-toolbar>
          </header>
        )}
        <div part="main-content">
          <slot />
        </div>
        <footer>
          <slot name="footer" onSlotchange={this.setHasFooter} />
        </footer>
      </Host>
    );
  }
}
