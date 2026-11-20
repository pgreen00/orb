import { Component, Event, EventEmitter, Host, Prop, Watch } from "@stencil/core";

/**
 * A file attached to a message in an `orb-channel`.
 */
@Component({
  tag: "orb-channel-attachment",
  shadow: true,
})
export class ChannelAttachment {
  /** Where the file is */
  @Prop() href?: string;

  /** The file's name, shown on a link. Defaults to `href`. */
  @Prop() name?: string;

  /** The file's MIME type, such as `image/png`. Images are shown inline. */
  @Prop() type?: string;

  /** The file's size, such as "2 MB" */
  @Prop() size?: string;

  /** Emitted when the attachment's data changes, so the channel can update */
  @Event({ bubbles: true, composed: false }) orbChannelDataChange: EventEmitter<void>;

  componentDidLoad() {
    this.orbChannelDataChange.emit();
  }

  @Watch("href")
  @Watch("name")
  @Watch("type")
  @Watch("size")
  changed() {
    this.orbChannelDataChange.emit();
  }

  render() {
    return <Host />;
  }
}
