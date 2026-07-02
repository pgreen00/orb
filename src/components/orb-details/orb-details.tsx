import {
  Component,
  Element,
  Event,
  EventEmitter,
  Host,
  Prop,
  Watch,
  h,
} from "@stencil/core";

@Component({
  tag: "je-details",
  styleUrl: "je-details.css",
  shadow: true,
})
export class JeDetails {
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
    //const icon = <je-icon>chevron_right</je-icon>
    return (
      <Host>
        <button part="toggle" onClick={() => (this.open = !this.open)}>
          <je-toolbar>
            {this.iconSide == "left" && (
              <je-icon class={{ open: this.open }}>chevron_right</je-icon>
            )}
            <slot name="start" />
            <slot name="summary">
              {this.summary && <summary>{this.summary}</summary>}
            </slot>
            <slot name="end" slot="end" />
            {this.iconSide == "right" && (
              <je-icon slot="end" class={{ open: this.open }}>
                chevron_right
              </je-icon>
            )}
          </je-toolbar>
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
