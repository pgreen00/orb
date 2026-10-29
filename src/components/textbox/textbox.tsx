import {
  Component,
  Host,
  Prop,
  Element,
  State,
  Watch,
  Listen,
  Event,
  EventEmitter,
} from "@stencil/core";
import { EyeIcon, EyeOffIcon } from "../../utils/icons";
import { ReadyController } from "../../utils/ready-controller";
import { debounceEvent, DebouncedEventEmitter } from "../../utils/debounce-event";

const UTILITY_SLOTS = ["top-start", "top-end", "bottom-start", "bottom-end"] as const;

/**
 * Wraps a native `input`, `select`, or `textarea` with a label, a note, and
 * validation messages. A `textarea` grows with its content.
 *
 * @slot - The `input`, `select`, or `textarea`, plus an `orb-label` and `orb-note`
 * @slot start - Content before the control, inside the border, such as an icon
 * @slot after - Content after the box, outside the border, such as a button
 * @slot top-start - Utility content above the control, inside the border, such as attachments or tags
 * @slot top-end - Utility content above the control, aligned to the end
 * @slot bottom-start - Utility content below the control, inside the border, such as buttons
 * @slot bottom-end - Utility content below the control, aligned to the end, such as a send button
 *
 * @part container - The bordered box around the control
 * @part top - The row of `top-start` and `top-end` content
 * @part bottom - The row of `bottom-start` and `bottom-end` content
 */
@Component({
  tag: "orb-textbox",
  styleUrl: "textbox.css",
  shadow: {
    slotAssignment: 'manual'
  }
})
export class Textbox extends ReadyController {
  private startSlot: HTMLSlotElement;
  private controlSlot: HTMLSlotElement;
  private afterSlot: HTMLSlotElement;
  private noteSlot: HTMLSlotElement;
  private labelSlot: HTMLSlotElement;
  private utilitySlots: Partial<Record<(typeof UTILITY_SLOTS)[number], HTMLSlotElement>> = {};
  private formControl: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
  private mutationObs: MutationObserver;
  private valueChange?: DebouncedEventEmitter<string>;
  @Element() hostEl: HTMLElement;
  @State() showPassword = false;
  @State() hasPasswordInput = false;
  @State() hasSearchinput = false;
  @State() hasTextarea = false;
  @State() hasTop = false;
  @State() hasBottom = false;
  @State() userInvalid = false;
  @State() validationMessage?: string;

  /**
   * Text above the control
   */
  @Prop() label?: string;

  /**
   * Informational message directly below the control
   */
  @Prop() note?: string;

  /**
   * Milliseconds to wait after the user stops typing before emitting
   * `orbValueChange`. With 0, it emits on every change. The native `input`
   * event is never delayed.
   */
  @Prop() debounce = 0;

  /**
   * Emits the control's value when the user changes it, after `debounce`
   * milliseconds without another change
   */
  @Event({ bubbles: false }) orbValueChange: EventEmitter<string>;

  connectedCallback() {
    this.mutationObs = new MutationObserver(() => this.setSlots());
    this.mutationObs.observe(this.hostEl, { childList: true });
    this.setSlots()
    this.onDebounceChange()
  }

  disconnectedCallback() {
    this.mutationObs.disconnect();
    this.valueChange?.cancel();
  }

  @Watch('debounce')
  onDebounceChange() {
    this.valueChange?.cancel();
    this.valueChange = debounceEvent(this.orbValueChange, this.debounce);
  }

  @Watch('showPassword')
  handleShowPasswordChange() {
    if (this.formControl instanceof HTMLInputElement) {
      this.formControl.type = this.showPassword ? 'text' : 'password';
    }
  }

  @Watch('label', { immediate: true })
  onLabelChange() {
    if (this.formControl && this.label) {
      this.formControl.ariaLabel = this.label;
    }
  }

  @Watch('note', { immediate: true })
  onNoteChange() {
    if (this.formControl && this.note) {
      this.formControl.ariaDescription = this.note;
    }
  }

  @Listen('invalid', { capture: true })
  onInvalid() {
    this.userInvalid = this.formControl.matches(':user-invalid')
    this.validationMessage = this.formControl.validationMessage
  }

  @Listen('blur', { capture: true })
  onBlur() {
    this.userInvalid = this.formControl.matches(':user-invalid')
    this.validationMessage = this.formControl.validationMessage
  }

  @Listen('input')
  onInput(ev: globalThis.Event) {
    this.userInvalid = this.formControl.matches(':user-invalid')
    this.validationMessage = this.formControl.validationMessage
    this.autogrow()
    // Inputs in the utility slots, such as a filter field, aren't the value.
    if (ev.target === this.formControl) this.valueChange?.emit(this.formControl.value)
  }

  @Listen('change')
  onChange() {
    this.userInvalid = this.formControl.matches(':user-invalid')
    this.validationMessage = this.formControl.validationMessage
  }

  /**
   * Textareas grow with `field-sizing: content`. Browsers without it, such as
   * Firefox, get the same effect by matching the height to the content.
   */
  private autogrow() {
    if (!(this.formControl instanceof HTMLTextAreaElement)) return;
    if (CSS.supports('field-sizing', 'content')) return;
    const textarea = this.formControl;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }

  /** Clicking empty space in the box focuses the control, like clicking the control. */
  private onContainerClick = (ev: MouseEvent) => {
    const target = ev.target as HTMLElement;
    const empty = target === ev.currentTarget || target.classList?.contains('row');
    if (empty && this.formControl && document.activeElement !== this.formControl) {
      this.formControl.focus();
    }
  }

  private async setSlots() {
    await this.ready;
    const children = Array.from(this.hostEl.children)
    // The control is a direct child without a slot, so an input in a utility
    // slot, such as a filter field, isn't mistaken for it.
    const controls = children.filter(el => !el.slot && el.matches('input, select, textarea, orb-output'))
    this.formControl = controls[0] as typeof this.formControl;
    this.hasPasswordInput = this.formControl?.matches('input[type=password]') ?? false;
    this.hasSearchinput = this.formControl?.matches('input[type=search]') ?? false;
    this.hasTextarea = this.formControl instanceof HTMLTextAreaElement;
    this.startSlot.assign(
      ...children.filter(el => el.matches('[slot=start]'))
    )
    this.labelSlot.assign(
      ...children.filter(el => el.tagName === 'ORB-LABEL')
    )
    this.noteSlot.assign(
      ...children.filter(el => el.tagName === 'ORB-NOTE')
    )
    this.controlSlot.assign(...controls)
    this.afterSlot.assign(
      ...children.filter(el => el.matches('[slot=after]'))
    )
    for (const name of UTILITY_SLOTS) {
      this.utilitySlots[name]?.assign(...children.filter(el => el.slot === name))
    }
    this.hasTop = children.some(el => el.slot === 'top-start' || el.slot === 'top-end')
    this.hasBottom = children.some(el => el.slot === 'bottom-start' || el.slot === 'bottom-end')
    this.onLabelChange()
    this.onNoteChange()
    this.autogrow()
  }

  /** A row of utility content. It's always rendered so its slots can be assigned. */
  private renderRow(position: 'top' | 'bottom', visible: boolean) {
    return (
      <div class={{ row: true, hidden: !visible }} part={position}>
        <slot ref={el => this.utilitySlots[`${position}-start`] = el} />
        <span class="row-end">
          <slot ref={el => this.utilitySlots[`${position}-end`] = el} />
        </span>
      </div>
    )
  }

  render() {
    return (
      <Host>
        <slot
          ref={el => this.labelSlot = el}
          onSlotchange={() => {
            if (!this.formControl) return;
            this.formControl.ariaLabelledByElements = this.labelSlot.assignedElements()
          }}
        >
          {this.label && <orb-label>{this.label}</orb-label>}
        </slot>

        <div part="after-container">
          <div
            part="container"
            class={{
              search: this.hasSearchinput,
              error: this.userInvalid,
              multiline: this.hasTextarea,
              stacked: this.hasTop || this.hasBottom,
            }}
            onClick={this.onContainerClick}
          >
            {this.renderRow('top', this.hasTop)}

            <div class="control">
              <slot ref={el => this.startSlot = el}></slot>

              <slot ref={el => this.controlSlot = el} />

              {this.hasPasswordInput && (
                <orb-button
                  tabindex={-1}
                  class="icon-only"
                  fill="clear"
                  onClick={() => (this.showPassword = !this.showPassword)}
                >
                  {this.showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </orb-button>
              )}
            </div>

            {this.renderRow('bottom', this.hasBottom)}
          </div>

          <slot ref={el => this.afterSlot = el} />
        </div>

        <slot
          ref={el => this.noteSlot = el}
          onSlotchange={() => {
            if (!this.formControl) return;
            this.formControl.ariaDescribedByElements = this.noteSlot.assignedElements()
          }}
        >
          {this.note && <orb-note>{this.note}</orb-note>}
        </slot>

        {this.userInvalid && (
          <orb-note invalid>{this.validationMessage}</orb-note>
        )}
      </Host>
    );
  }
}
