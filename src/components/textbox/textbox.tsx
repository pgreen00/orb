import {
  Component,
  Host,
  Prop,
  Element,
  State,
  Watch,
  Listen,
} from "@stencil/core";
import { EyeIcon, EyeOffIcon } from "../../utils/icons";
import { ReadyController } from "../../utils/ready-controller";

/**
 * its a textbox
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
  private formControl: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
  private mutationObs: MutationObserver;
  @Element() hostEl: HTMLElement;
  @State() showPassword = false;
  @State() hasPasswordInput = false;
  @State() hasSearchinput = false;
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
   * Optional debounce of the form controls input event
   */
  @Prop() debounce = 0;

  connectedCallback() {
    this.mutationObs = new MutationObserver(() => this.setSlots());
    this.mutationObs.observe(this.hostEl, { childList: true });
    this.setSlots()
  }

  disconnectedCallback() {
    this.mutationObs.disconnect();
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
  onInput() {
    this.userInvalid = this.formControl.matches(':user-invalid')
    this.validationMessage = this.formControl.validationMessage
  }

  @Listen('change')
  onChange() {
    this.userInvalid = this.formControl.matches(':user-invalid')
    this.validationMessage = this.formControl.validationMessage
  }

  private async setSlots() {
    await this.ready;
    this.formControl = this.hostEl.querySelector('input, select, textarea, orb-output');
    this.hasPasswordInput = !!this.hostEl.querySelector('input[type=password]');
    this.hasSearchinput = !!this.hostEl.querySelector('input[type=search]');
    const children = Array.from(this.hostEl.children)
    this.startSlot.assign(
      ...children.filter(el => el.matches('[slot=start]'))
    )
    this.labelSlot.assign(
      ...children.filter(el => el.tagName === 'ORB-LABEL')
    )
    this.noteSlot.assign(
      ...children.filter(el => el.tagName === 'ORB-NOTE')
    )
    this.controlSlot.assign(
      ...children.filter(el => el.matches('input, select, textarea, orb-output'))
    )
    this.afterSlot.assign(
      ...children.filter(el => el.matches('[slot=after]'))
    )
    this.onLabelChange()
    this.onNoteChange()
  }

  render() {
    return (
      <Host>
        <div part="after-container">
          <div part="container" class={{
            search: this.hasSearchinput,
            error: this.userInvalid
          }}>
            <slot ref={el => this.startSlot = el}></slot>

            <slot
              ref={el => this.labelSlot = el}
              onSlotchange={() => {
                if (!this.formControl) return;
                this.formControl.ariaLabelledByElements = this.labelSlot.assignedElements()
              }}
            >
              {this.label && <orb-label>{this.label}</orb-label>}
            </slot>

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
