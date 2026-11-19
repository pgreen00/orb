import { Component, Event, EventEmitter, Host, Prop, Watch } from "@stencil/core";

/**
 * One message in an `orb-channel`. It renders nothing itself: the channel
 * draws it from its text, its children and its attributes.
 */
@Component({
  tag: "orb-channel-message",
  shadow: true,
})
export class ChannelMessage {
  /** Who sent the message, by the id of a participant */
  @Prop() from?: string;

  /** When the message was sent, as an ISO 8601 string */
  @Prop() ts?: string;

  /** Where the message is in its delivery. `failed` shows it as not sent. */
  @Prop() status?: "sending" | "sent" | "delivered" | "read" | "failed";

  /** Whether the message was edited after it was sent */
  @Prop() edited = false;

  /** Identifies an optimistic message, so the server's copy replaces it */
  @Prop() clientId?: string;

  /** Whether the message is pinned */
  @Prop() pinned = false;

  /**
   * Moderation state. `pending` waits for approval, `hidden` is collapsed
   * with `moderationReason`, and `removed` shows only that it was removed.
   */
  @Prop() moderation?: "pending" | "hidden" | "removed";

  /** Why the message is hidden, such as "Hidden for low score" */
  @Prop() moderationReason?: string;

  /** The `id` of the message this one replies to. It's shown as a quote. */
  @Prop() replyTo?: string;

  /** Emitted when the message's data changes, so the channel can update */
  @Event({ bubbles: true, composed: false }) orbChannelDataChange: EventEmitter<void>;

  componentDidLoad() {
    this.orbChannelDataChange.emit();
  }

  @Watch("from")
  @Watch("ts")
  @Watch("status")
  @Watch("edited")
  @Watch("clientId")
  @Watch("pinned")
  @Watch("moderation")
  @Watch("moderationReason")
  @Watch("replyTo")
  changed() {
    this.orbChannelDataChange.emit();
  }

  render() {
    return <Host />;
  }
}
