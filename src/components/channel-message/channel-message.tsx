import { Component, Event, EventEmitter, Host, Prop, Watch } from "@stencil/core";

/**
 * One message in an `orb-channel`.
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

  /**
   * The `id` of the message this one is a reply to, in its thread. Replies are
   * shown under the message their thread starts from, not in the list.
   */
  @Prop() thread?: string;

  /** Whether the thread the message starts is `collapsed` or `resolved`. The reader can still open it. */
  @Prop() threadState?: "collapsed" | "resolved";

  /** How many replies the thread has, when not every reply is in the DOM. Overrides the count from the replies. */
  @Prop() threadCount?: number;

  /** When the thread's last reply was sent, as an ISO 8601 string */
  @Prop() threadLast?: string;

  /** The message's score, shown next to its vote buttons when the channel's `votes` is on */
  @Prop() score?: number;

  /** The viewer's own vote, which shows its button as pressed */
  @Prop() vote?: "up" | "down";

  /** Set while the message is still being written, such as a streamed answer. It shows a cursor. */
  @Prop() streaming = false;

  /** Why the message failed. It's shown in place of "Not sent" when `status` is `failed`. */
  @Prop() error?: string;

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
  @Watch("streaming")
  @Watch("error")
  @Watch("thread")
  @Watch("threadState")
  @Watch("threadCount")
  @Watch("threadLast")
  @Watch("score")
  @Watch("vote")
  changed() {
    this.orbChannelDataChange.emit();
  }

  render() {
    return <Host />;
  }
}
