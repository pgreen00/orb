import {
  Component,
  Host,
  Prop,
  h,
  Element,
  State,
  Event as StencilEvent,
  EventEmitter,
  AttachInternals,
  Listen,
  Watch,
  forceUpdate,
} from "@stencil/core";
import { debounceEvent } from "../../utils/debounce-event";
import {
  InputMask,
  InputMaskOptions as MaskOptions,
} from "../../utils/input-mask";
import { BehaviorSubject, filter, Subscription, switchMap } from "rxjs";
import { Masks } from "./masks";

type InputMaskOptions = Omit<MaskOptions, "inputElement">;

@Component({
  tag: "je-textbox",
  styleUrl: "je-textbox.css",
  shadow: {
    delegatesFocus: true,
  },
  formAssociated: true,
})
export class JeTextbox {
  private inputEl: HTMLElement;
  private mask = new BehaviorSubject<InputMask | null>(null);
  private sub?: Subscription;
  private valueSnapshot: any;

  @Element() hostEl: HTMLElement;
  @AttachInternals() internals: ElementInternals;
  @State() touched = false;
  @State() showPassword = false;

  @Prop({ reflect: true }) type:
    | "text"
    | "number"
    | "search"
    | "email"
    | "phone"
    | "url"
    | "money"
    | "date"
    | "time"
    | "datetime"
    | "daterange"
    | "password"
    | "ssn"
    | InputMaskOptions = "text";

  /**
   * Current value of the input
   */
  @Prop({ mutable: true }) value: any;

  /**
   * Text above the control
   */
  @Prop() label?: string;

  /**
   * Informational message directly below the control
   */
  @Prop() note?: string;

  /**
   * Container size
   */
  @Prop() size: "md" | "lg" | "sm" = "md";

  /**
   * Input placeholder text
   */
  @Prop() placeholder?: string;

  /**
   * Optional debounce of the didInput event
   */
  @Prop() debounce = 0;

  /**
   * Renders input as disabled and prevents changes
   */
  @Prop() disabled = false;

  /**
   * Renders input as read only and prevents changes
   */
  @Prop() readonly = false;

  /**
   * Passed to native textarea
   */
  @Prop() wrap?: string;

  /**
   * Whether the control is a multiline textarea
   */
  @Prop() multiline = false;

  /**
   * Passed to native input
   */
  @Prop() min?: any;

  /**
   * Passed to native input
   */
  @Prop() max?: any;

  /**
   * Passed to native input
   */
  @Prop() minlength?: number;

  /**
   * Passed to native input
   */
  @Prop() maxlength?: number;

  /**
   * Passed to native input
   */
  @Prop() pattern?: string;

  /**
   * Marks as required in form and adds asterisk to the end of the label
   */
  @Prop() required = false;

  /**
   * Passed to native input
   */
  @Prop() step?: string;

  /**
   * Emits as the user types
   */
  @StencilEvent() valueChange: EventEmitter<any>;

  componentWillLoad() {
    if (this.debounce)
      this.valueChange = debounceEvent(this.valueChange, this.debounce);
  }

  componentDidLoad() {
    this.valueSnapshot = this.value;
    if (this.value) {
      this.internals.setFormValue(this.value);
      this.inputEl.textContent = this.value;
    }
    if (this.type == "phone") {
      this.mask.next(
        new InputMask({
          inputElement: this.inputEl,
          ...Masks.PHONE,
        }),
      );
    } else if (this.type == "password") {
      this.mask.next(
        new InputMask({
          inputElement: this.inputEl,
          formatter: (raw) => raw,
          masker: (raw) =>
            this.showPassword
              ? raw
              : Array.from({ length: raw.length })
                  .map(() => "·")
                  .join(""),
        }),
      );
    } else if (this.type == "money") {
      this.mask.next(
        new InputMask({
          inputElement: this.inputEl,
          ...Masks.MONEY,
        }),
      );
    } else if (this.type == "ssn") {
      this.mask.next(
        new InputMask({
          inputElement: this.inputEl,
          formatter: (raw) => {
            const digits = raw.replace(/\D/g, "").slice(0, 9);
            if (digits.length <= 3) return digits;
            if (digits.length <= 5)
              return `${digits.slice(0, 3)}-${digits.slice(3)}`;
            return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
          },
          extractor: (formatted) => formatted.replace(/\D/g, ""),
          masker: (rawValue, formattedValue) => {
            if (rawValue.length <= 5) {
              return formattedValue.replace(/\d/g, "X");
            }
            let digitCount = 0;
            return formattedValue
              .split("")
              .map((char) => {
                if (/\d/.test(char)) {
                  digitCount++;
                  return digitCount <= 5 ? "X" : char;
                }
                return char;
              })
              .join("");
          },
        }),
      );
    } else if (this.type == "number") {
      this.mask.next(
        new InputMask({
          inputElement: this.inputEl,
          ...Masks.NUMBER,
        }),
      );
    } else if (this.type == "time") {
      this.mask.next(
        new InputMask({
          inputElement: this.inputEl,
          ...Masks.TIME,
        }),
      );
    } else if (this.type == "date") {
      this.mask.next(
        new InputMask({
          inputElement: this.inputEl,
          ...Masks.DATE,
        }),
      );
    } else if (this.type == "datetime") {
      this.mask.next(
        new InputMask({
          inputElement: this.inputEl,
          ...Masks.DATETIME,
        }),
      );
    } else if (this.type == "daterange") {
      this.mask.next(
        new InputMask({
          inputElement: this.inputEl,
          ...Masks.DATERANGE,
        }),
      );
    }
  }

  componentWillRender() {
    const requiredError = this.required && this.value === "";
    const minLengthError =
      this.minlength && (this.value ?? "").length < this.minlength;
    const maxLengthError =
      this.maxlength && (this.value ?? "").length > this.maxlength;
    const patternError =
      this.pattern && !new RegExp(this.pattern).test(this.value ?? "");
    const hasError =
      requiredError || maxLengthError || minLengthError || patternError;
    if (hasError) {
      const errorMessage = requiredError
        ? "This field is required"
        : minLengthError
          ? `This field must be at least ${this.minlength} characters long`
          : maxLengthError
            ? `This field must be less than ${this.maxlength} characters long`
            : patternError
              ? `Invalid pattern`
              : undefined;
      this.internals.setValidity(
        {
          valueMissing: requiredError,
          tooShort: minLengthError,
          tooLong: maxLengthError,
          patternMismatch: patternError,
          //customError: customErrors.length > 0,
        },
        errorMessage,
        this.inputEl,
      );
    } else {
      this.internals.setValidity({});
    }
  }

  componentDidRender() {
    this.internals.role = "textbox";
    if (this.label) {
      this.internals.ariaLabel = this.label;
    } else {
      const label = this.hostEl.querySelector("[slot=label]");
      if (label) (this.internals as any).ariaLabelledByElements = [label];
    }
    this.internals.ariaDescription =
      this.note || this.hostEl.querySelector("[slot=note]")?.textContent;
    this.internals.ariaInvalid = this.internals.validity.valid
      ? "true"
      : "false";
    this.internals.ariaRequired = this.required ? "true" : "false";
    this.internals.ariaDisabled = this.disabled ? "true" : "false";
    this.internals.ariaReadOnly = this.readonly ? "true" : "false";
    this.internals.ariaMultiLine = this.multiline ? "true" : "false";
    this.internals.ariaPlaceholder = this.placeholder;
    this.internals.ariaValueText = this.value;
    //this.internals.ariaAutoComplete = this.autoComplete

    this.internals.states.clear();
    this.internals.states.add(
      !this.internals.validity.valid ? "--invalid" : "--valid",
    );
    if (this.touched)
      this.internals.states.add(
        !this.internals.validity.valid ? "--user-invalid" : "--user-valid",
      );
    this.internals.states.add(this.required ? "--required" : "--optional");
    this.internals.states.add(this.disabled ? "--disabled" : "--enabled");
    this.internals.states.add(this.readonly ? "--readonly" : "--readwrite");
    this.internals.states.add(this.multiline ? "--multiline" : "--singleline");
    this.internals.states.add(this.value ? "--filled" : "--empty");
  }

  formResetCallback() {
    this.touched = false;
    this.value = this.valueSnapshot;
    this.valueChange.emit(this.value);
  }

  connectedCallback() {
    this.sub = this.mask
      .pipe(
        filter((mask) => !!mask),
        switchMap((mask) => mask["rawValue"].asObservable()),
      )
      .subscribe((value) => {
        this.value = value;
        this.valueChange.emit(value);
      });
  }

  disconnectedCallback() {
    this.sub?.unsubscribe();
  }

  @Watch("value")
  handleValueChange() {
    this.internals.setFormValue(this.value || null);
    if (!this.mask.value && this.inputEl.textContent !== this.value) {
      this.inputEl.textContent = this.value;
    } else if (
      this.mask.value &&
      this.mask.value["rawValue"].value !== this.value
    ) {
      //this.mask.value.textContent = this.value;
      this.inputEl.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }

  @Watch("showPassword")
  onShowPasswordChange() {
    this.inputEl.dispatchEvent(new Event("input", { bubbles: true }));
  }

  @Listen("blur")
  onBlur() {
    this.touched = true;
  }

  @Listen("invalid")
  onInvalid() {
    this.touched = true;
  }

  private onKeydown = (ev: KeyboardEvent) => {
    if (this.multiline && ev.key === "Enter" && ev.shiftKey)
      ev.stopPropagation();
    else if (ev.key === "Enter") ev.preventDefault();
  };

  private onInput = () => {
    this.inputEl.querySelectorAll("br").forEach((b) => b.remove());
    if (!this.mask.value) {
      this.value = this.inputEl.textContent;
      this.valueChange.emit(this.value);
    }
  };

  render() {
    return (
      <Host data-error={this.internals.validationMessage || null}>
        <div part="after-container">
          <div
            part="container"
            class={{
              [this.size]: true,
              disabled: this.disabled,
              multiline: this.multiline,
            }}
          >
            <slot name="label" onSlotchange={() => forceUpdate(this.hostEl)}>
              {this.label && (
                <je-label part="label" required={this.required}>
                  {this.label}
                </je-label>
              )}
            </slot>

            <div
              ref={(el) => (this.inputEl = el)}
              part="input"
              tabindex={0}
              contenteditable="plaintext-only"
              onKeyDown={this.onKeydown}
              onInput={this.onInput}
              data-placeholder={this.placeholder}
            />

            {this.type === "password" && (
              <je-button
                class="icon-only"
                fill="clear"
                onClick={() => (this.showPassword = !this.showPassword)}
              >
                {this.showPassword ? eyeOff : eye}
              </je-button>
            )}

            <slot name="end" />
          </div>

          <slot name="after" />
        </div>

        <slot name="note" onSlotchange={() => forceUpdate(this.hostEl)}>
          {this.note && <je-note part="note">{this.note}</je-note>}
        </slot>
      </Host>
    );
  }
}

const eye = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="lucide lucide-eye-icon lucide-eye"
  >
    <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const eyeOff = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="lucide lucide-eye-off-icon lucide-eye-off"
  >
    <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
    <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
    <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
    <path d="m2 2 20 20" />
  </svg>
);
