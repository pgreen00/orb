import { Component, Event, EventEmitter, Host, Prop, Watch } from "@stencil/core";

/**
 * A line across an `orb-channel`, with a label, placed between messages.
 */
@Component({
  tag: "orb-channel-divider",
  shadow: true,
})
export class ChannelDivider {
  /** `unread` marks the start of new messages. `custom` is any other label. */
  @Prop() type: "custom" | "unread" = "custom";

  /** The text in the middle of the line. Defaults to "New messages" for `unread`. */
  @Prop() label?: string;

  /** A date or time for the label, used when `label` isn't set */
  @Prop() datetime?: string;

  /** Emitted when the divider's data changes, so the channel can update */
  @Event({ bubbles: true, composed: false }) orbChannelDataChange: EventEmitter<void>;

  componentDidLoad() {
    this.orbChannelDataChange.emit();
  }

  @Watch("type")
  @Watch("label")
  @Watch("datetime")
  changed() {
    this.orbChannelDataChange.emit();
  }

  render() {
    return <Host />;
  }
}
