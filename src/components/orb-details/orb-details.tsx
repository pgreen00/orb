import {
  Component,
  Element,
  Event,
  EventEmitter,
  Host,
  Prop,
  Watch,
} from "@stencil/core";

@Component({
  tag: "orb-details",
  styleUrl: "orb-details.css",
  shadow: true,
})
export class OrbDetails {
  @Element() el!: HTMLElement;
  @Prop() summary?: string;
  @Prop({ mutable: true }) open = false;
  @Prop() iconToggle = false;
  @Prop() iconSide: "left" | "right" = "right";
  @Event() expand: EventEmitter;
  @Event() collapse: EventEmitter;

  @Watch("open")
  watchOpen() {
    if (this.open) {
      this.expand.emit();
    } else {
      this.collapse.emit();
    }
  }

  render() {
    //const icon = <orb-icon>chevron_right</orb-icon>
    return (
      <Host>
        <button part="toggle" onClick={() => (this.open = !this.open)}>
          <orb-toolbar>
            {this.iconSide == "left" && (
              <orb-icon class={{ open: this.open }}>chevron_right</orb-icon>
            )}
            <slot name="start" />
            <slot name="summary">
              {this.summary && <summary>{this.summary}</summary>}
            </slot>
            <slot name="end" slot="end" />
            {this.iconSide == "right" && (
              <orb-icon slot="end" class={{ open: this.open }}>
                chevron_right
              </orb-icon>
            )}
          </orb-toolbar>
        </button>
        <div part="content-container" class={{ open: this.open }}>
          <div part="content">
            <slot />
          </div>
        </div>
      </Host>
    );
  }
}
