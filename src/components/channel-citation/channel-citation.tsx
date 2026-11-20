import { Component, Event, EventEmitter, Host, Prop, Watch } from "@stencil/core";

/**
 * A source a message refers to. It shows as a numbered button in the text, and
 * the button opens a popover with the source's link. It renders nothing itself.
 */
@Component({
  tag: "orb-channel-citation",
  shadow: true,
})
export class ChannelCitation {
  /** Where the source is */
  @Prop() href?: string;

  /** The number shown in the text. Defaults to the citation's place in its message. */
  @Prop() index?: number;

  /** The source's title, shown in the popover. Set with the `title` attribute. */
  @Prop({ attribute: "title" }) citationTitle?: string;

  /** Emitted when the citation's data changes, so the channel can update */
  @Event({ bubbles: true, composed: false }) orbChannelDataChange: EventEmitter<void>;

  componentDidLoad() {
    this.orbChannelDataChange.emit();
  }

  @Watch("href")
  @Watch("index")
  @Watch("citationTitle")
  changed() {
    this.orbChannelDataChange.emit();
  }

  render() {
    return <Host />;
  }
}
