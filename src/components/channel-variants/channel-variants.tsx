import { Component, Event, EventEmitter, Host, Prop, Watch } from "@stencil/core";

/**
 * The version switcher of a message, such as "‹ 2 / 3 ›".
 */
@Component({
  tag: "orb-channel-variants",
  shadow: true,
})
export class ChannelVariants {
  /** The version on screen, counting from 1 */
  @Prop() current = 1;

  /** How many versions there are */
  @Prop() count = 1;

  /** Set while the app fetches a version. The buttons are off and a spinner shows. */
  @Prop() busy = false;

  /** Emitted when the switcher's data changes, so the channel can update */
  @Event({ bubbles: true, composed: false }) orbChannelDataChange: EventEmitter<void>;

  componentDidLoad() {
    this.orbChannelDataChange.emit();
  }

  @Watch("current")
  @Watch("count")
  @Watch("busy")
  changed() {
    this.orbChannelDataChange.emit();
  }

  render() {
    return <Host />;
  }
}
