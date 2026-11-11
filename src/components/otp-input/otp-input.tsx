import {
  AttachInternals,
  Component,
  Element,
  Event,
  EventEmitter,
  Host,
  Listen,
  Method,
  Prop,
  State,
  Watch,
} from "@stencil/core";
import { toggleState } from "../../utils/custom-states";
import {
  caretAfterFilter,
  overlay,
  parseFormat,
  sanitize,
  segmentCount,
  splice,
} from "./otp";
import type { OtpCase, OtpType } from "./otp";

/**
 * Collects a one-time passcode, PIN, or other fixed-length code, one character per segment.
 *
 * @slot label - Label content, used instead of the `label` attribute
 * @slot note - Note content, used instead of the `note` attribute
 *
 * @part label - The default label
 * @part note - The default note
 * @part segments - The row of segments and separators
 * @part segment - A character segment
 * @part segment-literal - A separator from `format`, such as a dash
 */
@Component({
  tag: "orb-otp-input",
  styleUrl: "otp-input.css",
  shadow: {
    delegatesFocus: true,
  },
  formAssociated: true,
})
export class OtpInput {
  @AttachInternals() internals: ElementInternals;
  @Element() el!: HTMLElement;
  private inputEl!: HTMLInputElement;
  private segmentsEl!: HTMLElement;
  private labelSlot!: HTMLSlotElement;
  private noteSlot!: HTMLSlotElement;
  private errorEl?: HTMLElement | null;
  private pendingClickIndex: number | null = null;
  private lastChangeValue = "";
  private interacted = false;
  private customMessage = "";

  /** Which segment the caret is on. -1 when the field isn't focused. */
  @State() activeIndex = -1;
  /** The other end of a selection, or -1 when nothing is selected */
  @State() selectionAnchor = -1;
  @State() formDisabled = false;
  @State() userInvalid = false;
  @State() validationMessage = "";

  /**
   * Label that shows above the segments
   */
  @Prop() label?: string;

  /**
   * Additional info that shows below the segments
   */
  @Prop() note?: string;

  /**
   * Number of segments. Ignored when `format` is set.
   */
  @Prop() length = 6;

  /**
   * Segment layout. Each `#` is a segment and any other character is a literal
   * separator, so `###-###` shows two groups of three with a dash between them.
   * Overrides `length`.
   */
  @Prop() format = "";

  /**
   * Characters each segment accepts
   */
  @Prop() type: OtpType = "numeric";

  /**
   * Case applied to letters as they're entered
   */
  @Prop() case: OtpCase = "preserve";

  /**
   * Shows the mask character instead of entered characters. The value is still
   * available, and screen readers still announce the characters.
   */
  @Prop({ reflect: true }) mask = false;

  /**
   * Shows the mask character in empty segments, like a password field does
   */
  @Prop({ reflect: true, attribute: "with-mask" }) withMask = false;

  /**
   * Visual style of the segments
   */
  @Prop({ reflect: true }) appearance:
    | "outlined"
    | "filled"
    | "filled-outlined"
    | "contained" = "outlined";

  /**
   * Size of each segment
   */
  @Prop({ reflect: true }) size: "xs" | "sm" | "md" | "lg" = "md";

  /**
   * The `autocomplete` attribute of the input. Browsers offer SMS codes for `one-time-code`.
   */
  @Prop() autocomplete = "one-time-code";

  /**
   * Submits the form once every segment is filled. Cancel `orbComplete` to stop it.
   */
  @Prop() autosubmit = false;

  /**
   * The current value. Characters the `type` doesn't allow are dropped.
   */
  @Prop({ mutable: true }) value = "";

  /**
   * Value the form resets to. Defaults to the initial `value`.
   */
  @Prop() defaultValue?: string;

  /**
   * Disables the control
   */
  @Prop({ reflect: true }) disabled = false;

  /**
   * Shows the value without allowing edits. Still focusable and submitted with the form.
   */
  @Prop({ reflect: true }) readonly = false;

  /**
   * Requires every segment to be filled before the form can be submitted
   */
  @Prop({ reflect: true }) required = false;

  /**
   * Emits the value when the user enters or removes a character
   */
  @Event({ bubbles: false }) orbValueChange: EventEmitter<string>;

  /**
   * Emitted once when every segment is filled. Call `preventDefault()` to stop `autosubmit`.
   */
  @Event({ cancelable: true }) orbComplete: EventEmitter<string>;

  /**
   * Emitted when `clear()` empties the field
   */
  @Event() orbClear: EventEmitter<void>;

  componentWillLoad() {
    this.defaultValue ??= this.value;
    this.value = this.clean(this.value);
    this.sync();
  }

  componentDidRender() {
    this.writeInput();
    this.syncCursor();
    this.wireAria();
    this.scrollActiveIntoView();
  }

  formResetCallback() {
    this.interacted = false;
    this.value = this.clean(this.defaultValue);
    this.lastChangeValue = this.value;
    this.sync();
  }

  formStateRestoreCallback(state: string | File | FormData | null) {
    if (typeof state === "string") this.value = state;
  }

  formDisabledCallback(disabled: boolean) {
    this.formDisabled = disabled;
    this.sync();
  }

  @Listen("invalid")
  onInvalid() {
    this.interacted = true;
    this.sync();
  }

  @Watch("value")
  @Watch("type")
  @Watch("case")
  @Watch("length")
  @Watch("format")
  onValueChange() {
    const clean = this.clean(this.value);
    if (clean !== this.value) {
      this.value = clean;
      return;
    }
    if (this.activeIndex >= 0) this.setCaret(Math.min(clean.length, this.count - 1));
    this.sync();
  }

  @Watch("required")
  @Watch("disabled")
  @Watch("readonly")
  onFlagChange() {
    this.sync();
  }

  /** Selects all entered characters in the input */
  @Method()
  async select() {
    this.inputEl.select();
  }

  /** Clears the value and returns focus to the field */
  @Method()
  async clear() {
    this.value = "";
    this.orbClear.emit();
    this.inputEl.focus();
  }

  /**
   * Sets a custom validation error. Pass an empty string to clear it.
   */
  @Method()
  async setCustomValidity(message: string) {
    this.customMessage = message;
    this.sync();
  }

  /**
   * Clears custom errors and the user interaction state, so validation styling
   * is hidden until the user interacts with the control again.
   */
  @Method()
  async resetValidity() {
    this.customMessage = "";
    this.interacted = false;
    this.sync();
  }

  private get count() {
    return segmentCount(this.format, this.length);
  }

  private get isDisabled() {
    return this.disabled || this.formDisabled;
  }

  private get hasSelection() {
    return this.selectionAnchor >= 0 && this.selectionAnchor !== this.activeIndex;
  }

  private clean(value: string | null | undefined) {
    return sanitize(value ?? "", this.type, this.case).slice(0, this.count);
  }

  private sync() {
    this.syncFormValue();
    this.syncValidity();
    this.syncStates();
  }

  private syncFormValue() {
    this.internals.setFormValue(this.value, this.value);
  }

  private syncValidity() {
    // Disabled and readonly controls are left out of constraint validation
    const barred = this.isDisabled || this.readonly;
    const length = this.value.length;
    const valueMissing = !barred && this.required && length === 0;
    const tooShort = !barred && length > 0 && length < this.count;
    const customError = !barred && this.customMessage !== "";
    if (valueMissing || tooShort || customError) {
      const message = customError
        ? this.customMessage
        : valueMissing
          ? "Please enter a code."
          : `Enter all ${this.count} characters.`;
      this.internals.setValidity(
        { valueMissing, tooShort, customError },
        message,
        this.segmentsEl,
      );
    } else {
      this.internals.setValidity({});
    }
    this.validationMessage = this.internals.validationMessage;
  }

  private syncStates() {
    const { states, validity } = this.internals;
    const interacted = this.interacted;
    toggleState(states, "--blank", this.value === "");
    toggleState(states, "--filled", this.value.length === this.count);
    toggleState(states, "disabled", this.isDisabled);
    toggleState(states, "readonly", this.readonly);
    toggleState(states, "invalid", !validity.valid);
    toggleState(states, "user-invalid", interacted && !validity.valid);
    toggleState(states, "user-valid", interacted && validity.valid);
    this.userInvalid = interacted && !validity.valid;
  }

  private setCaret(index: number) {
    this.activeIndex = index;
    this.selectionAnchor = -1;
    this.syncCursor();
  }

  /** Puts the input's selection on the caret's segment, so typing replaces that character. */
  private syncCursor() {
    if (!this.inputEl || this.activeIndex < 0 || this.hasSelection) return;
    // Only move the selection while the input has focus. Setting it on an unfocused input can focus it in some browsers.
    if (this.el.shadowRoot?.activeElement !== this.inputEl) return;
    const len = this.value.length;
    const start = Math.min(this.activeIndex, len);
    const end = this.activeIndex < len ? start + 1 : start;
    this.inputEl.setSelectionRange(start, end);
  }

  private writeInput() {
    if (this.inputEl && this.inputEl.value !== this.value) {
      this.inputEl.value = this.value;
    }
  }

  /**
   * Applies a change from the user. Returns false when the value didn't change,
   * such as when a letter is typed into a numeric field.
   */
  private edit(next: string, caret: number) {
    const previous = this.value;
    this.value = next;
    this.writeInput();
    this.setCaret(caret);
    if (next === previous) return false;
    this.orbValueChange.emit(next);
    if (next.length === this.count && previous.length < this.count) {
      const event = this.orbComplete.emit(next);
      if (this.autosubmit && !event.defaultPrevented) {
        // Deferred, since requestSubmit() doesn't reliably fire from inside an input event
        setTimeout(() => this.internals.form?.requestSubmit());
      }
    }
    return true;
  }

  /** Removes a range and moves the caret. Dispatches `input` for the keys that don't fire one natively. */
  private remove(start: number, end: number, caret: number) {
    if (this.edit(splice(this.value, start, end), caret)) this.dispatchInput();
  }

  private dispatchInput() {
    this.el.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true }));
  }

  private segmentIndexAt(target: EventTarget | null): number | null {
    const segment = (target as Element | null)?.closest?.(".segment");
    if (!segment) return null;
    const index = Array.from(this.segmentsEl.querySelectorAll(".segment")).indexOf(segment);
    return index >= 0 ? Math.min(index, this.value.length) : null;
  }

  private onSegmentsPointerDown = (ev: PointerEvent) => {
    if (this.isDisabled) return;
    // Focus runs before click, so the caret needs the clicked segment at focus time
    this.pendingClickIndex = this.segmentIndexAt(ev.target);
  };

  private onSegmentsClick = (ev: MouseEvent) => {
    if (this.isDisabled) return;
    this.inputEl.focus();
    const index = this.segmentIndexAt(ev.target);
    if (index !== null) this.setCaret(index);
    this.pendingClickIndex = null;
  };

  private onInput = (ev: globalThis.Event) => {
    if (this.readonly) return;
    const raw = this.inputEl.value;
    const cursor = this.inputEl.selectionStart ?? raw.length;
    const caret = Math.min(
      caretAfterFilter(raw, cursor, this.type, this.case),
      this.count - 1,
    );
    // The native input event already bubbles. Stop it when nothing changed, so
    // a rejected character doesn't look like an edit.
    if (!this.edit(this.clean(raw), caret)) ev.stopPropagation();
  };

  private onKeyDown = (ev: KeyboardEvent) => {
    if (ev.isComposing) return;
    if (ev.key === "Enter") {
      this.internals.form?.requestSubmit();
      return;
    }
    if (this.readonly) {
      // Readonly inputs aren't editable, so WebKit would treat Backspace as "go back"
      if (ev.key === "Backspace" || ev.key === "Delete") ev.preventDefault();
      return;
    }

    const last = this.count - 1;
    const hasSelection = this.hasSelection;
    const start = Math.min(this.selectionAnchor, this.activeIndex);
    const end = Math.max(this.selectionAnchor, this.activeIndex);
    const idx = this.activeIndex;

    switch (ev.key) {
      case "ArrowRight":
        ev.preventDefault();
        this.setCaret(hasSelection ? Math.min(end, last) : Math.min(idx + 1, last));
        break;
      case "ArrowLeft":
        ev.preventDefault();
        this.setCaret(hasSelection ? Math.max(start, 0) : Math.max(idx - 1, 0));
        break;
      case "Backspace":
        ev.preventDefault();
        if (hasSelection) this.remove(start, end, Math.min(start, last));
        else this.remove(idx, idx + 1, Math.max(idx - 1, 0));
        break;
      case "Delete":
        ev.preventDefault();
        if (hasSelection) this.remove(start, end, Math.min(start, last));
        else this.remove(idx, idx + 1, idx);
        break;
    }
  };

  private onPaste = (ev: ClipboardEvent) => {
    ev.preventDefault();
    if (this.readonly) return;
    const text = sanitize(ev.clipboardData?.getData("text/plain") ?? "", this.type, this.case);
    if (!text) return;

    // With a selection, the pasted text replaces it. Otherwise it overwrites from the caret.
    const hasSelection = this.hasSelection;
    const start = hasSelection
      ? Math.min(this.selectionAnchor, this.activeIndex)
      : Math.max(this.activeIndex, 0);
    const base = hasSelection
      ? splice(this.value, start, Math.max(this.selectionAnchor, this.activeIndex))
      : this.value;
    const next = overlay(base, text, start, this.count);
    if (this.edit(next, Math.min(start + text.length, this.count - 1))) this.dispatchInput();
  };

  private onFocus = () => {
    this.setCaret(this.pendingClickIndex ?? Math.min(this.value.length, this.count - 1));
  };

  private onBlur = () => {
    this.interacted = true;
    this.setCaret(-1);
    this.sync();
    if (this.value !== this.lastChangeValue) {
      this.lastChangeValue = this.value;
      this.el.dispatchEvent(new globalThis.Event("change", { bubbles: true, composed: true }));
    }
  };

  /** Mirrors a multi-character selection, such as from Cmd/Ctrl+A, into the segments */
  private onSelect = () => {
    const start = this.inputEl.selectionStart ?? 0;
    const end = this.inputEl.selectionEnd ?? start;
    if (end - start > 1) {
      this.selectionAnchor = start;
      this.activeIndex = end;
    } else if (this.selectionAnchor !== -1) {
      this.selectionAnchor = -1;
    }
  };

  private wireAria() {
    if (!this.inputEl) return;
    this.inputEl.ariaLabelledByElements = [this.labelSlot];
    const described: HTMLElement[] = [];
    if (this.noteSlot) described.push(this.noteSlot);
    if (this.errorEl) described.push(this.errorEl);
    this.inputEl.ariaDescribedByElements = described;
  }

  /** Keeps the active or selected segment in view when the row scrolls */
  private scrollActiveIntoView() {
    const active = this.segmentsEl?.querySelector<HTMLElement>(".segment.active, .segment.selected");
    if (!active) return;
    const view = this.segmentsEl;
    const left = active.offsetLeft;
    const right = left + active.offsetWidth;
    if (left < view.scrollLeft) view.scrollLeft = left;
    else if (right > view.scrollLeft + view.clientWidth) view.scrollLeft = right - view.clientWidth;
  }

  render() {
    const chars = [...this.value];
    const hasSelection = this.hasSelection;
    const from = Math.min(this.selectionAnchor, this.activeIndex);
    const to = Math.max(this.selectionAnchor, this.activeIndex);
    let index = 0;

    return (
      <Host>
        <slot
          name="label"
          ref={(el) => (this.labelSlot = el)}
          onSlotchange={() => this.wireAria()}
        >
          {this.label && (
            <orb-label part="label" required={this.required}>
              {this.label}
            </orb-label>
          )}
        </slot>

        <div
          part="segments"
          class="segments"
          ref={(el) => (this.segmentsEl = el)}
          onPointerDown={this.onSegmentsPointerDown}
          onClick={this.onSegmentsClick}
        >
          {parseFormat(this.format, this.length).map((part) => {
            if (part.type === "literal") {
              return (
                <span part="segment-literal" class="literal" aria-hidden="true">
                  {part.char}
                </span>
              );
            }
            const i = index++;
            const char = chars[i] ?? "";
            const active = !this.readonly && !hasSelection && i === this.activeIndex;
            const selected = !this.readonly && hasSelection && i >= from && i < to;
            // Masked characters are drawn by CSS, so they never reach the DOM as text
            const masked = char !== "" && this.mask;
            return (
              <div
                part="segment"
                aria-hidden="true"
                class={{
                  segment: true,
                  active,
                  selected,
                  masked,
                  "mask-hint": char === "" && this.withMask,
                }}
              >
                {masked ? "" : char}
                {active && char === "" && <span class="caret" />}
              </div>
            );
          })}

          <input
            ref={(el) => (this.inputEl = el)}
            class="hidden-input"
            type="text"
            autocomplete={this.autocomplete}
            inputmode={this.type === "numeric" ? "numeric" : "text"}
            autocapitalize={this.case === "upper" ? "characters" : "none"}
            spellcheck={false}
            enterkeyhint="done"
            required={this.required}
            readonly={this.readonly}
            disabled={this.isDisabled}
            aria-invalid={this.userInvalid ? "true" : "false"}
            onInput={this.onInput}
            onKeyDown={this.onKeyDown}
            onPaste={this.onPaste}
            onFocus={this.onFocus}
            onBlur={this.onBlur}
            onSelect={this.onSelect}
          />
        </div>

        <slot
          name="note"
          ref={(el) => (this.noteSlot = el)}
          onSlotchange={() => this.wireAria()}
        >
          {this.note && <orb-note part="note">{this.note}</orb-note>}
        </slot>

        {this.userInvalid && (
          <orb-note invalid ref={(el) => (this.errorEl = el)}>
            {this.validationMessage}
          </orb-note>
        )}
      </Host>
    );
  }
}
