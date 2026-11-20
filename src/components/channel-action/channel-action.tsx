import { Component, Event, EventEmitter, Host, Prop, Watch } from "@stencil/core";

/**
 * A button in an `orb-channel-composer`.
 */
@Component({
  tag: "orb-channel-action",
  shadow: true,
})
export class ChannelAction {
  /** Names the action in `orbAction`, such as "attach" */
  @Prop() name?: string;

  /** The button's accessible name and tooltip */
  @Prop() label?: string;

  /** Emitted when the action's data changes, so the channel can update */
  @Event({ bubbles: true, composed: false }) orbChannelDataChange: EventEmitter<void>;

  componentDidLoad() {
    this.orbChannelDataChange.emit();
  }

  @Watch("name")
  @Watch("label")
  changed() {
    this.orbChannelDataChange.emit();
  }

  render() {
    return <Host />;
  }
}
