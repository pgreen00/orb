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
  shadow: {
    delegatesFocus: true
  },
})
export class Details {
  private contentEl: HTMLElement;
  @Element() el!: HTMLElement;
  @Prop() summary?: string;
  @Prop({ mutable: true }) open = false;
  @Prop({reflect: true}) iconSide: "left" | "right" = "right";
  @Event() orbExpand: EventEmitter;
  @Event() orbCollapse: EventEmitter;

  componentDidLoad() {
    this.contentEl.classList.toggle("open", this.open);
  }

  @Watch("open")
  watchOpen() {
    if (this.open) {
      this.contentEl.classList.toggle("open", this.open);
      this.contentEl.animate(
        {
          padding: ['0', 'var(--content-open-padding)'],
          opacity: [0, 1],
          gridTemplateRows: ['0fr', '1fr'],
        },
        {
          duration: 150,
          easing: "ease-out",
        }
      );
      this.orbExpand.emit();
    } else {
      this.contentEl.animate(
        {
          padding: ['var(--content-open-padding)', '0'],
          opacity: [1, 0],
          gridTemplateRows: ['1fr', '0fr'],
        },
        {
          duration: 150,
          easing: "ease-out",
        }
      ).finished.then(() => this.contentEl.classList.toggle("open", this.open))
      this.orbCollapse.emit();
    }
  }

  render() {
    return (
      <Host>
        <orb-toolbar>
          <slot name="start" />

          {this.iconSide == 'left' && (
            <button tabIndex={0} type="button" part="toggle" onClick={() => (this.open = !this.open)} aria-expanded={this.open}>
              <ChevronRightIcon aria-hidden="true" class={{ open: this.open }} />
              <slot name="summary">{this.summary}</slot>
            </button>
          )}

          {this.iconSide == "right" && (
            <button tabIndex={0} type="button" part="toggle" onClick={() => (this.open = !this.open)} aria-expanded={this.open}>
              <orb-stack mode='row' justify='space-between'>
                <slot name="summary">{this.summary}</slot>
                <ChevronRightIcon aria-hidden="true" class={{ open: this.open }} />
              </orb-stack>
            </button>
          )}

          <slot name="end" slot="end" />
        </orb-toolbar>

        <div ref={el => (this.contentEl = el)} part="content-container">
          <div part="content">
            <slot />
          </div>
        </div>
      </Host>
    );
  }
}
