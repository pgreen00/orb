import { Component, Event, EventEmitter, Host, Prop, Watch } from "@stencil/core";

/**
 * Follow-up suggestions for the point of view, shown above the message box. Its `orb-channel-suggestion` children are the chips.
 */
@Component({
  tag: "orb-channel-suggestions",
  shadow: true,
})
export class ChannelSuggestions {
  /** The accessible name of the group of suggestions */
  @Prop() label?: string;

  /** Emitted when the suggestions' data changes, so the channel can update */
  @Event({ bubbles: true, composed: false }) orbChannelDataChange: EventEmitter<void>;

  componentDidLoad() {
    this.orbChannelDataChange.emit();
  }

  @Watch("label")
  changed() {
    this.orbChannelDataChange.emit();
  }

  render() {
    return <Host />;
  }
}
