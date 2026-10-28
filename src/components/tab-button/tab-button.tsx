import {
  AttachInternals,
  Component,
  Element,
  Event,
  EventEmitter,
  Host,
  Prop,
  State,
  Watch,
} from "@stencil/core";
import { CloseIcon } from "../../utils/icons";

export interface TabCloseDetail {
  panel?: string;
}

/**
 * The host is a plain wrapper. The element with `role="tab"` is inside the
 * shadow root, and the close button sits beside it rather than inside it,
 * because a tab can't contain other interactive controls.
 *
 * @slot - The tab label
 * @slot icon - An icon shown before the label
 *
 * @part tab - The element with `role="tab"`, which wraps the icon and label
 * @part close-button - The close button
 */
@Component({
  tag: "orb-tab-button",
  styleUrl: "tab-button.css",
  // Lets orb-tabs move focus with `button.focus()`, which lands on the tab.
  shadow: { delegatesFocus: true },
})
export class TabButton {
  @AttachInternals({
    states: {
      /**
       * The panel is currently being displayed
       */
      active: false,
    },
  })
  internals: ElementInternals;
  @Element() el: HTMLElement;
  @State() active = false;

  @Prop() panel?: string;
  @Prop({ reflect: true }) closable = false;

  /**
   * Accessible name for the tab. Use it for icon-only tabs, which have no
   * text to name them.
   */
  @Prop() label?: string;

  /**
   * Emitted when the close button is clicked, or Delete is pressed on the tab. Call `preventDefault()` to keep
   * the tab open. Otherwise the tab button and its panel are removed.
   */
  @Event({ cancelable: true }) orbTabClose: EventEmitter<TabCloseDetail>;

  private onCloseClick = (e: MouseEvent) => {
    // Keeps orb-tabs from treating the click as selecting this tab.
    e.stopPropagation();
    this.requestClose();
  };

  /** Delete closes a closable tab. Arrow keys are handled by orb-tabs. */
  private onTabKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Delete" && this.closable) {
      e.preventDefault();
      this.requestClose();
    }
  };

  private requestClose() {
    const event = this.orbTabClose.emit({ panel: this.panel });
    if (event.defaultPrevented) return;

    const tabs = this.el.closest("orb-tabs");
    if (tabs && this.panel) tabs.closeTab(this.panel);
    else this.el.remove();
  }

  componentWillLoad() {
    this.onSelectedChange(this.el.dataset.selected);
  }

  /** `orb-tabs` sets `data-selected` on the button for the active panel. */
  @Watch("data-selected")
  onSelectedChange(selected?: string) {
    this.active = selected === "";
    this.internals.states[this.active ? "add" : "delete"]("active");
  }

  render() {
    return (
      <Host>
        <div
          part="tab"
          class="tab"
          role="tab"
          aria-selected={this.active ? "true" : "false"}
          aria-label={this.label}
          tabindex={this.active ? 0 : -1}
          onKeyDown={this.onTabKeyDown}
        >
          <slot name="icon"></slot>
          <span class="label">
            <slot></slot>
          </span>
        </div>
        {this.closable && (
          <orb-button
            part="close-button"
            size="xs"
            class="icon-only"
            aria-label="Close tab"
            onClick={this.onCloseClick}
          >
            <CloseIcon />
          </orb-button>
        )}
      </Host>
    );
  }
}
