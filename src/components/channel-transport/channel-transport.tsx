import { Component, Event, EventEmitter, Host, Prop, Watch } from "@stencil/core";

/**
 * How an `orb-channel` sends and receives messages over the network, for apps
 * that don't write a transport in JavaScript. The channel reads its attributes
 * when it connects, and reconnects when they change. It renders nothing itself.
 */
@Component({
  tag: "orb-channel-transport",
  shadow: true,
})
export class ChannelTransport {
  /**
   * `form` posts each message to `action`, and shows the HTML the response
   * holds. `sse` receives HTML events from `src`, and posts to `action` when it's
   * set. `websocket` opens `src`, sends each message over the socket, and shows
   * the HTML it receives. `poll` fetches `src` every `interval`.
   */
  @Prop() type: "form" | "sse" | "websocket" | "poll" = "form";

  /** Where incoming HTML comes from: `sse`, `websocket` and `poll` */
  @Prop() src?: string;

  /** Where messages are posted: `form`, and `sse` or `poll` when they should send too. `websocket` sends over the socket instead. */
  @Prop() action?: string;

  /** How often `poll` fetches `src`, such as "5s". Defaults to 5s. */
  @Prop() interval?: string;

  /** Emitted when the transport's data changes, so the channel can reconnect */
  @Event({ bubbles: true, composed: false }) orbChannelDataChange: EventEmitter<void>;

  componentDidLoad() {
    this.orbChannelDataChange.emit();
  }

  @Watch("type")
  @Watch("src")
  @Watch("action")
  @Watch("interval")
  changed() {
    this.orbChannelDataChange.emit();
  }

  render() {
    return <Host />;
  }
}
