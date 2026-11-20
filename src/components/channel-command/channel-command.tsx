import { Component, Event, EventEmitter, Host, Prop, Watch } from "@stencil/core";

/**
 * A command in an `orb-channel-composer`.
 */
@Component({
  tag: "orb-channel-command",
  shadow: true,
})
export class ChannelCommand {
  /** The name typed after `/`, such as "summarize" */
  @Prop() name?: string;

  /** What the command does, shown beside its name in the menu */
  @Prop() description?: string;

  /** The arguments the command takes, such as "prompt". Shown as a hint. */
  @Prop() args?: string;

  /** Emitted when the command's data changes, so the channel can update */
  @Event({ bubbles: true, composed: false }) orbChannelDataChange: EventEmitter<void>;

  componentDidLoad() {
    this.orbChannelDataChange.emit();
  }

  @Watch("name")
  @Watch("description")
  @Watch("args")
  changed() {
    this.orbChannelDataChange.emit();
  }

  render() {
    return <Host />;
  }
}
