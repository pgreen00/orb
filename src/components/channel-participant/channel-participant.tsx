import { Component, Event, EventEmitter, Host, Prop, Watch } from "@stencil/core";

/**
 * A person in an `orb-channel`, identified by the element's `id`. Messages
 * refer to them with `from`. It renders nothing itself.
 */
@Component({
  tag: "orb-channel-participant",
  shadow: true,
})
export class ChannelParticipant {
  /** The name shown above their messages and in the header */
  @Prop() name?: string;

  /** The URL of their picture. Without one, their first letter is shown. */
  @Prop() avatar?: string;

  /** A color for their name and avatar */
  @Prop() accent?: string;

  /** Shows a moderator badge, and gives the point of view moderation buttons */
  @Prop() moderator = false;

  /** Mutes the participant. When they're the point of view, the composer is off. */
  @Prop() muted = false;

  /** When the mute ends, as an ISO 8601 string. Without one, the mute lasts until it's removed. */
  @Prop() mutedUntil?: string;

  /** Collapses the participant's messages, for the point of view only */
  @Prop() ignored = false;

  /**
   * What the participant is. `ai` marks a model: its messages get a badge, and
   * it can answer messages (see `respondTo`). The others are shown as people.
   */
  @Prop() role: "human" | "ai" | "bot" | "system" = "human";

  /** Whether they're online, away or offline. Without it, the channel doesn't show presence for them. */
  @Prop() presence?: "online" | "away" | "offline";

  /** Shows that they're typing. The channel shows a line for it. */
  @Prop() typing = false;

  /** The label of an AI participant's badge, such as "Assistant" */
  @Prop() aiLabel?: string;

  /**
   * When an AI participant answers a message the point of view sends.
   * `always` answers every message, and `mention` answers when it's
   * `@`-mentioned. `manual` and `never` don't answer on their own. The channel
   * lists the ones that should answer in `orbSend`'s `respondents`. The default
   * is `always` in a `direct` chat, and `mention` otherwise.
   */
  @Prop() respondTo?: "always" | "mention" | "manual" | "never";

  /**
   * What an AI participant sees of the conversation: `channel`, `thread`,
   * `last:20` for the last 20 messages, or `selection`. The channel doesn't read
   * it. It's for the app, which sends the context to its model.
   */
  @Prop() context?: string;

  /**
   * Where an AI participant's answers go: `channel`, `thread`, or `auto`. The
   * channel doesn't read it. It's for the app, which writes the answer there.
   */
  @Prop() replyIn?: "channel" | "thread" | "auto";

  /** Emitted when the participant's data changes, so the channel can update */
  @Event({ bubbles: true, composed: false }) orbChannelDataChange: EventEmitter<void>;

  componentDidLoad() {
    this.orbChannelDataChange.emit();
  }

  @Watch("name")
  @Watch("avatar")
  @Watch("accent")
  @Watch("moderator")
  @Watch("muted")
  @Watch("mutedUntil")
  @Watch("ignored")
  @Watch("role")
  @Watch("aiLabel")
  @Watch("presence")
  @Watch("typing")
  @Watch("respondTo")
  @Watch("context")
  @Watch("replyIn")
  changed() {
    this.orbChannelDataChange.emit();
  }

  render() {
    return <Host />;
  }
}
