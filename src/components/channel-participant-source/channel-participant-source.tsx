import { Component, Event, EventEmitter, Host, Prop, Watch } from "@stencil/core";

/**
 * Where an `orb-channel` gets the people it doesn't have yet. When a message
 * comes from someone who isn't a child of the channel, the channel asks for
 * them, in batches, and shows the `orb-channel-participant` elements in the
 * response. It renders nothing itself.
 */
@Component({
  tag: "orb-channel-participant-source",
  shadow: true,
})
export class ChannelParticipantSource {
  /**
   * The URL to fetch, with `{ids}` where the ids go. They're comma-separated and
   * URL-encoded, such as `/people?ids={ids}`. The response is HTML of
   * `orb-channel-participant` elements.
   */
  @Prop() href?: string;

  /** Emitted when the source's data changes */
  @Event({ bubbles: true, composed: false }) orbChannelDataChange: EventEmitter<void>;

  componentDidLoad() {
    this.orbChannelDataChange.emit();
  }

  @Watch("href")
  changed() {
    this.orbChannelDataChange.emit();
  }

  render() {
    return <Host />;
  }
}
