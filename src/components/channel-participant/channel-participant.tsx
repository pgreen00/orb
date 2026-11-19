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
  changed() {
    this.orbChannelDataChange.emit();
  }

  render() {
    return <Host />;
  }
}
