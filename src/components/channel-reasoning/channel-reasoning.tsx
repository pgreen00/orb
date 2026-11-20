import { Component, Event, EventEmitter, Host, Prop, Watch } from "@stencil/core";

/**
 * A model's reasoning, shown as a collapsible block in an `orb-channel-message`.
 */
@Component({
  tag: "orb-channel-reasoning",
  shadow: true,
})
export class ChannelReasoning {
  /** Whether the reasoning is still being written, or has finished */
  @Prop() state: "thinking" | "done" = "thinking";

  /** The summary's text. Defaults to "Thinking…" while it's thinking, and "Reasoning" after. */
  @Prop() label?: string;

  /** How long the reasoning took, such as "4.2s". Shown after the summary's text. */
  @Prop() duration?: string;

  /** Emitted when the reasoning's data changes, so the channel can update */
  @Event({ bubbles: true, composed: false }) orbChannelDataChange: EventEmitter<void>;

  componentDidLoad() {
    this.orbChannelDataChange.emit();
  }

  @Watch("state")
  @Watch("label")
  @Watch("duration")
  changed() {
    this.orbChannelDataChange.emit();
  }

  render() {
    return <Host />;
  }
}
