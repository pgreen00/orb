import { Component, Event, EventEmitter, Host, Prop, Watch } from "@stencil/core";

/**
 * One reaction to a message in an `orb-channel`. Each reaction is one
 * element, and the channel combines those with the same emoji into a button
 * with a count. It renders nothing itself.
 */
@Component({
  tag: "orb-channel-reaction",
  shadow: true,
})
export class ChannelReaction {
  /** The emoji, such as 🎉 */
  @Prop() emoji?: string;

  /** The id of the participant who reacted */
  @Prop() by?: string;

  /** Emitted when the reaction's data changes, so the channel can update */
  @Event({ bubbles: true, composed: false }) orbChannelDataChange: EventEmitter<void>;

  componentDidLoad() {
    this.orbChannelDataChange.emit();
  }

  @Watch("emoji")
  @Watch("by")
  changed() {
    this.orbChannelDataChange.emit();
  }

  render() {
    return <Host />;
  }
}
