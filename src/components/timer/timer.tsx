import {
  Component,
  Event,
  EventEmitter,
  Host,
  Method,
  Prop,
  State,
  Watch,
} from "@stencil/core";

/**
 * A countdown that displays the time remaining and emits `countdownComplete`
 * when it reaches zero.
 */
@Component({
  tag: "orb-timer",
  styleUrl: "timer.css",
  shadow: true,
})
export class Timer {
  /** The length of the countdown in milliseconds. Changing it resets the time remaining unless the timer is running. */
  @Prop() duration = 60_000;

  /** Start counting down as soon as the timer loads. */
  @Prop() autostart = false;

  /** Emitted when the countdown reaches zero. */
  @Event() countdownComplete: EventEmitter;

  @State() remaining = 0;
  private endAt = 0;
  private interval?: ReturnType<typeof setInterval>;

  componentWillLoad() {
    this.remaining = this.duration;
    if (this.autostart) this.startTimer();
  }

  disconnectedCallback() {
    this.pauseTimer();
  }

  @Watch("duration")
  handleDurationChange() {
    if (!this.running) this.remaining = this.duration;
  }

  private get running() {
    return this.interval !== undefined;
  }

  private startTimer() {
    if (this.running) return;
    if (this.remaining <= 0) this.remaining = this.duration;
    this.endAt = Date.now() + this.remaining;
    this.interval = setInterval(() => this.tick(), 100);
  }

  private pauseTimer() {
    if (!this.running) return;
    clearInterval(this.interval);
    this.interval = undefined;
    this.remaining = Math.max(0, this.endAt - Date.now());
  }

  private tick() {
    this.remaining = Math.max(0, this.endAt - Date.now());
    if (this.remaining === 0) {
      clearInterval(this.interval);
      this.interval = undefined;
      this.countdownComplete.emit();
    }
  }

  /** Starts or resumes the countdown. Starts from the full duration if the timer has already completed. */
  @Method()
  async start() {
    this.startTimer();
  }

  /** Pauses the countdown, keeping the time remaining so it can be resumed. */
  @Method()
  async pause() {
    this.pauseTimer();
  }

  /** Resets the countdown to the full duration and starts it again. */
  @Method()
  async restart() {
    this.pauseTimer();
    this.remaining = this.duration;
    this.startTimer();
  }

  private format(ms: number) {
    const total = Math.ceil(ms / 1000);
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;
    const pad = (n: number) => String(n).padStart(2, "0");

    return hours > 0
      ? `${hours}:${pad(minutes)}:${pad(seconds)}`
      : `${pad(minutes)}:${pad(seconds)}`;
  }

  render() {
    return <Host role="timer">{this.format(this.remaining)}</Host>;
  }
}
