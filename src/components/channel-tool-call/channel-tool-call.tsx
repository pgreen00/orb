import { Component, Event, EventEmitter, Host, Prop, Watch } from "@stencil/core";

/**
 * A tool a model called, shown in an `orb-channel-message` with its arguments and result. Its arguments and result go in `<script type="application/json">` children with `data-part="args"` and `data-part="result"`.
 */
@Component({
  tag: "orb-channel-tool-call",
  shadow: true,
})
export class ChannelToolCall {
  /** The name of the tool, such as "fetch_schema" */
  @Prop() name?: string;

  /** Identifies the call, so a result can be matched to it */
  @Prop() callId?: string;

  /**
   * Where the call is. `running` and `done` are shown as they are, and
   * `awaiting-approval` shows approve and deny buttons.
   */
  @Prop() status: "running" | "awaiting-approval" | "done" | "error" | "denied" | string = "running";

  /** Marks a call that needs approval, with a label */
  @Prop() requiresApproval = false;

  /** Emitted when the call's data changes, so the channel can update */
  @Event({ bubbles: true, composed: false }) orbChannelDataChange: EventEmitter<void>;

  componentDidLoad() {
    this.orbChannelDataChange.emit();
  }

  @Watch("name")
  @Watch("callId")
  @Watch("status")
  @Watch("requiresApproval")
  changed() {
    this.orbChannelDataChange.emit();
  }

  render() {
    return <Host />;
  }
}
