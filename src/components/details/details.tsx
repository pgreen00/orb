import {
  Component,
  Element,
  Event,
  EventEmitter,
  Host,
  Prop,
  Watch,
} from "@stencil/core";
import { ChevronRightIcon } from "../../utils/icons";

@Component({
  tag: "orb-details",
  styleUrl: "details.css",
  shadow: true,
})
export class Details {
  @Element() el!: HTMLElement;
  @Prop() summary?: string;
  @Prop({ mutable: true }) open = false;
  @Prop() iconToggle = false;
  @Prop() iconSide: "left" | "right" = "right";
  @Event() orbExpand: EventEmitter;
  @Event() orbCollapse: EventEmitter;

  @Watch("open")
  watchOpen() {
    if (this.open) {
      this.orbExpand.emit();
    } else {
      this.orbCollapse.emit();
    }
  }

  render() {
    return (
      <Host>
        <button part="toggle" onClick={() => (this.open = !this.open)}>
          <orb-toolbar>
            {this.iconSide == "left" && (
              <ChevronRightIcon class={{ open: this.open }} />
            )}
            <slot name="start" />
            <slot name="summary">
              {this.summary && <summary>{this.summary}</summary>}
            </slot>
            <slot name="end" slot="end" />
            {this.iconSide == "right" && (
              <ChevronRightIcon slot="end" class={{ open: this.open }} />
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
