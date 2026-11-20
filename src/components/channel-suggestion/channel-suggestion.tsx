import { Component, Event, EventEmitter, Host, Prop, Watch } from "@stencil/core";

/**
 * One suggestion, a chip whose text is the suggestion.
 */
@Component({
  tag: "orb-channel-suggestion",
  shadow: true,
})
export class ChannelSuggestion {
  /** Sends the suggestion right away, rather than filling the message box with it */
  @Prop() send = false;

  /** Emitted when the suggestion's data changes, so the channel can update */
  @Event({ bubbles: true, composed: false }) orbChannelDataChange: EventEmitter<void>;

  componentDidLoad() {
    this.orbChannelDataChange.emit();
  }

  @Watch("send")
  changed() {
    this.orbChannelDataChange.emit();
  }

  render() {
    return <Host />;
  }
}
