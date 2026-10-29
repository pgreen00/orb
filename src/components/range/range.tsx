import {
  AttachInternals,
  Component,
  Event,
  EventEmitter,
  Host,
  Listen,
  Prop,
  State,
  Watch,
} from "@stencil/core";

const HOLD_KEYS = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End"];

/** Pixels dragged to move a knob across its whole range */
const KNOB_PIXELS = 200;
const ARC_RADIUS = 44;
const ARC_CIRCUMFERENCE = 2 * Math.PI * ARC_RADIUS;
/** The knob's arc covers three quarters of the circle */
const ARC_LENGTH = ARC_CIRCUMFERENCE * 0.75;

/**
 * A slider for picking a number in a range. It wraps a native range input, so
 * the keyboard, screen readers, and dragging work the way they do on the
 * platform. The value shows in a tooltip while it's being changed.
 *
 * @slot label - Label content, used instead of the `label` attribute
 * @slot note - Note content, used instead of the `note` attribute
 *
 * @part control - The track and thumb
 * @part knob - The knob, when `knob` is set
 * @part tooltip - The value shown while the control is changing
 */
@Component({
  tag: "orb-range",
  styleUrl: "range.css",
  shadow: true,
  formAssociated: true,
})
export class Range {
  @AttachInternals() internals!: ElementInternals;
  private input!: HTMLInputElement;
  private tooltipEl!: HTMLElement;
  private labelEl!: HTMLSlotElement;
  private noteEl!: HTMLSlotElement;
  private knobEl?: HTMLElement;
  private dragStart?: { y: number; value: number };

  /** Whether the thumb is being dragged with the pointer */
  @State() dragging = false;

  /** Whether an arrow, Home, End, or Page key is held down */
  @State() keyHeld = false;

  /** Whether focus came from a pointer, so the knob doesn't show a focus ring */
  @State() pointerFocus = false;

  /**
   * Label that shows above the control
   */
  @Prop() label?: string;

  /**
   * Additional info that shows below the control
   */
  @Prop() note?: string;

  /**
   * Smallest value
   */
  @Prop() min = 0;

  /**
   * Largest value
   */
  @Prop() max = 100;

  /**
   * Distance between values. Decimals in the step set how many digits the
   * tooltip shows, so a step of `0.1` shows `-10.0`.
   */
  @Prop() step = 1;

  /**
   * Unit shown after the value in the tooltip and to screen readers, such as `dB`
   */
  @Prop() unit?: string;

  /**
   * Colors the track with the accent color, from the start up to the thumb, to
   * show how far along the range the value is. `split` colors from the center
   * instead, so the accent runs between the center and the thumb on either side.
   */
  @Prop() accent?: string;

  /**
   * Makes the range vertical and larger, with a wide thumb and a short notch,
   * for mixer-style controls. The lowest value is at the bottom.
   */
  @Prop({ reflect: true }) boosted = false;

  /**
   * Shows the range as a rotary knob. Drag up to increase and down to decrease.
   * Combine with `boosted` for a larger knob.
   */
  @Prop({ reflect: true }) knob = false;

  /**
   * The current value. Defaults to `min`.
   */
  @Prop({ mutable: true }) value?: number;

  /**
   * Value the form will reset to. Defaults to the initial value.
   */
  @Prop() originalValue?: number;

  /**
   * Disables the control
   */
  @Prop({ reflect: true }) disabled = false;

  /**
   * Emits the new value as it changes, including while dragging
   */
  @Event({ bubbles: false }) orbValueChange: EventEmitter<number>;

  componentWillLoad() {
    if (this.value === undefined) this.value = this.min;
    if (this.originalValue === undefined) this.originalValue = this.value;
    this.syncFormValue();
  }

  componentDidLoad() {
    this.input.ariaLabelledByElements = [this.labelEl];
    this.input.ariaDescribedByElements = [this.noteEl];
  }

  componentDidRender() {
    // The browser snaps the value to the step and clamps it to the range.
    // Keep the prop in line with what's shown.
    const shown = this.input.valueAsNumber;
    if (shown !== this.value) this.value = shown;
    this.syncTooltip();
  }

  formResetCallback() {
    this.value = this.originalValue;
  }

  @Watch("value")
  syncFormValue() {
    this.internals.setFormValue(this.value === undefined ? null : String(this.value));
  }

  @Listen("pointerup", { target: "window" })
  @Listen("pointercancel", { target: "window" })
  endDrag() {
    this.dragging = false;
    this.dragStart = undefined;
  }

  /** The tooltip is in the top layer, so it follows the thumb when the page scrolls. */
  @Listen("scroll", { target: "window", capture: true })
  @Listen("resize", { target: "window" })
  onViewportChange() {
    if (this.tooltipEl.matches(":popover-open")) this.positionTooltip();
  }

  private get decimals() {
    return (String(this.step).split(".")[1] ?? "").length;
  }

  private get formatted() {
    const text = (this.value ?? this.min).toFixed(this.decimals);
    return this.unit ? `${text} ${this.unit}` : text;
  }

  /** How far along the range the value is, from 0 to 1 */
  private get fraction() {
    const span = this.max - this.min;
    if (span <= 0) return 0;
    const fraction = ((this.value ?? this.min) - this.min) / span;
    return Math.min(1, Math.max(0, fraction));
  }

  /** The accent mode for `data-accent`. Missing or `"false"` means no accent. */
  private get accentMode(): "start" | "split" | undefined {
    const value: unknown = this.accent;
    if (value === undefined || value === null || value === false || value === "false") return undefined;
    return value === "split" ? "split" : "start";
  }

  private get showingTooltip() {
    return !this.disabled && (this.dragging || this.keyHeld);
  }

  private syncTooltip() {
    const open = this.tooltipEl.matches(":popover-open");
    if (!this.showingTooltip) {
      if (open) this.tooltipEl.hidePopover();
      return;
    }
    this.positionTooltip();
    if (!open) this.tooltipEl.showPopover();
  }

  /**
   * Places the tooltip below the knob, or below the input for a slider. The CSS
   * works out the thumb's position from this box and `--fraction`.
   */
  private positionTooltip() {
    const anchor = this.knob && this.knobEl ? this.knobEl : this.input;
    const rect = anchor.getBoundingClientRect();
    this.tooltipEl.style.setProperty("--range-left", `${rect.left}px`);
    this.tooltipEl.style.setProperty("--range-top", `${rect.top}px`);
    this.tooltipEl.style.setProperty("--range-width", `${rect.width}px`);
    this.tooltipEl.style.setProperty("--range-height", `${rect.height}px`);
  }

  /**
   * Where the knob's accent arc starts and how long it is, in arc length. The
   * arc runs from the minimum to the maximum, so a split accent starts at its
   * midpoint and runs to the pointer.
   */
  private get knobArc() {
    const f = this.fraction;
    if (this.accentMode !== "split") return { start: 0, length: f * ARC_LENGTH };
    return {
      start: Math.min(0.5, f) * ARC_LENGTH,
      length: Math.abs(f - 0.5) * ARC_LENGTH,
    };
  }

  private onKnobPointerDown(ev: PointerEvent) {
    if (this.disabled || ev.button !== 0) return;
    this.dragStart = { y: ev.clientY, value: this.value ?? this.min };
    this.knobEl?.setPointerCapture(ev.pointerId);
    this.dragging = true;
    // Focus goes to the input, so the arrow keys work after a drag.
    this.pointerFocus = true;
    this.input.focus({ preventScroll: true });
  }

  private onKnobPointerMove(ev: PointerEvent) {
    if (!this.dragStart) return;
    const perPixel = (this.max - this.min) / KNOB_PIXELS;
    this.setValue(this.dragStart.value + (this.dragStart.y - ev.clientY) * perPixel);
  }

  /** Goes through the input so the value snaps to the step and stays in range. */
  private setValue(next: number) {
    this.input.value = String(next);
    if (this.input.valueAsNumber === this.value) return;
    this.value = this.input.valueAsNumber;
    this.orbValueChange.emit(this.value);
  }

  private onInput() {
    this.value = this.input.valueAsNumber;
    this.orbValueChange.emit(this.value);
  }

  private onKeyDown(ev: KeyboardEvent) {
    this.pointerFocus = false;
    if (HOLD_KEYS.includes(ev.key)) this.keyHeld = true;
  }

  private onKeyUp(ev: KeyboardEvent) {
    if (HOLD_KEYS.includes(ev.key)) this.keyHeld = false;
  }

  private onBlur() {
    this.dragging = false;
    this.keyHeld = false;
    this.pointerFocus = false;
  }

  render() {
    return (
      <Host style={{ "--fraction": String(this.fraction) }} data-accent={this.accentMode}>
        <slot name="label" ref={(el) => (this.labelEl = el)}>
          {this.label && <orb-label>{this.label}</orb-label>}
        </slot>
        <div class="control" part="control">
          {/* min, max, and step come before value so the value isn't clamped to the defaults */}
          <input
            ref={(el) => (this.input = el)}
            type="range"
            min={this.min}
            max={this.max}
            step={this.step}
            value={this.value}
            disabled={this.disabled}
            aria-valuetext={this.formatted}
            onInput={() => this.onInput()}
            onPointerDown={() => (this.dragging = true)}
            onKeyDown={(ev) => this.onKeyDown(ev)}
            onKeyUp={(ev) => this.onKeyUp(ev)}
            onBlur={() => this.onBlur()}
          />
          {this.knob && (
            <div
              class={{ knob: true, "pointer-focus": this.pointerFocus }}
              part="knob"
              aria-hidden="true"
              ref={(el) => (this.knobEl = el)}
              onPointerDown={(ev) => this.onKnobPointerDown(ev)}
              onPointerMove={(ev) => this.onKnobPointerMove(ev)}
              onMouseDown={(ev) => ev.preventDefault()}
            >
              <svg viewBox="0 0 100 100">
                <circle
                  class="track"
                  cx="50"
                  cy="50"
                  r={ARC_RADIUS}
                  stroke-dasharray={`${ARC_LENGTH} ${ARC_CIRCUMFERENCE}`}
                  transform="rotate(135 50 50)"
                />
                <circle
                  class="fill"
                  cx="50"
                  cy="50"
                  r={ARC_RADIUS}
                  stroke-dasharray={`${this.knobArc.length} ${ARC_CIRCUMFERENCE}`}
                  stroke-dashoffset={-this.knobArc.start}
                  transform="rotate(135 50 50)"
                />
              </svg>
              <div class="body">
                <div class="pointer" />
              </div>
            </div>
          )}
        </div>
        <div
          part="tooltip"
          class="tooltip"
          popover="manual"
          aria-hidden="true"
          ref={(el) => (this.tooltipEl = el)}
        >
          {this.formatted}
        </div>
        <slot name="note" ref={(el) => (this.noteEl = el)}>
          {this.note && <orb-note>{this.note}</orb-note>}
        </slot>
      </Host>
    );
  }
}
