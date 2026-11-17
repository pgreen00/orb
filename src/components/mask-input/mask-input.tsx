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
import { selectionOffsets } from "../../utils/composed";
import { toggleState } from "../../utils/custom-states";
import { browserMessage, exposeFormProps } from "../../utils/form";
import { usingKeyboard } from "../../utils/input-modality";
import { onMasksChanged } from "../../utils/masks";
import { applyEdit, diffEdit, offsetForRaw, rawIndexAt } from "./mask";
import type { Edit, Layout, Mask, MaskDefinition } from "./mask";
import { resolveMask } from "./masks";

/** Undo steps kept before the oldest are dropped */
const HISTORY_LIMIT = 100;
/** A pause this long, in milliseconds, ends a run of typing in the undo history */
const TYPING_PAUSE = 1000;

interface Snapshot {
  raw: string;
  caret: number;
}

const clamp = (offset: number, max: number) => Math.min(Math.max(offset, 0), max);

/**
 * Formats and restricts what the user types, such as a phone number or a date.
 * It's the input inside an `orb-textbox`, so it has no border, label, or note
 * of its own.
 *
 * @part field - The row holding the text, the guide, and the placeholder
 * @part input - The editable text
 * @part guide - The unfilled rest of the mask, such as `___-____`
 * @part placeholder - Shown when the field is empty and no guide is showing
 */
@Component({
  tag: "orb-mask-input",
  styleUrl: "mask-input.css",
  shadow: {
    delegatesFocus: true,
  },
  formAssociated: true,
})
export class MaskInput {
  @AttachInternals() internals: ElementInternals;
  @Element() el!: HTMLElement;
  private editable!: HTMLElement;
  private textNode!: Text;
  private engine!: Mask;
  private lastSelection = { start: 0, end: 0 };
  private labelledBy: Element[] = [];
  private describedBy: Element[] = [];
  private interacted = false;
  private customMessage = "";
  private lastChangeValue = "";
  private composing = false;
  private undoStack: Snapshot[] = [];
  private redoStack: Snapshot[] = [];
  private typingGroup?: string;
  private typingTimer?: ReturnType<typeof setTimeout>;
  private attributeObs?: MutationObserver;
  private unsubscribe?: () => void;
  /** Increases with each mask lookup, so a lazy mask that loads late doesn't replace a newer one */
  private maskToken = 0;

  /** What the field shows and what it holds */
  @State() model!: Layout;
  @State() focused = false;
  @State() formDisabled = false;
  @State() userInvalid = false;
  /** While a lazily registered mask loads, the field shows its value but doesn't take edits */
  @State() loading = false;

  /**
   * The mask: the name of a built-in or registered mask, such as `phone`, a
   * pattern such as `(###) ###-####`, or a definition. Without one, the field
   * is plain text.
   */
  @Prop() mask?: string | MaskDefinition;

  /**
   * The formatted text. Setting it also accepts the raw characters, such as
   * `5551234567`, and formats them.
   */
  @Prop({ mutable: true }) value = "";

  /**
   * The value a form reset returns to. Defaults to the initial `value`.
   */
  @Prop() defaultValue?: string;

  /**
   * Submits the unmasked value, such as `5551234567`, instead of the formatted text
   */
  @Prop() unmasked = false;

  /**
   * When the rest of the mask shows in the empty positions. `focus` shows it
   * while the field has focus.
   */
  @Prop() guide: "focus" | "always" | "off" = "focus";

  /**
   * The character shown in each empty position of the guide
   */
  @Prop() placeholderChar = "_";

  /**
   * Shown when the field is empty and the guide isn't showing
   */
  @Prop() placeholder?: string;

  /**
   * The keyboard shown on touch devices. Defaults to the mask's keyboard.
   */
  @Prop() inputmode?: string;

  /**
   * The label of the Enter key on touch keyboards
   */
  @Prop() enterkeyhint: "enter" | "done" | "go" | "next" | "previous" | "search" | "send" = "done";

  /**
   * How the browser capitalizes what the user types
   */
  @Prop() autocapitalize: "off" | "none" | "on" | "sentences" | "words" | "characters" = "none";

  /**
   * Requires a complete value before the form can be submitted
   */
  @Prop({ reflect: true }) required = false;

  /**
   * Disables the field
   */
  @Prop({ reflect: true }) disabled = false;

  /**
   * Shows the value without allowing edits. Still focusable and submitted with the form.
   */
  @Prop({ reflect: true }) readonly = false;

  /**
   * Emitted once when the value becomes complete for its mask
   */
  @Event({ bubbles: false }) orbComplete: EventEmitter<string>;

  connectedCallback() {
    // A mask registered after the field loaded, such as from a deferred module, is picked up
    this.unsubscribe = onMasksChanged(() => {
      if (typeof this.mask === "string") this.loadMask();
    });
  }

  componentWillLoad() {
    this.defaultValue ??= this.value;
    // The model comes first, since the value watcher reads it. Until a lazy
    // mask loads, the value is shown as plain text.
    this.engine = resolveMask(undefined) as Mask;
    this.model = this.engine.layout(this.value, this.placeholderChar);
    this.loadMask(true);
    this.value = this.model.display;
    this.lastChangeValue = this.value;
    this.lastSelection = { start: this.value.length, end: this.value.length };
    this.exposeFormProps();
    this.sync();
  }

  componentDidLoad() {
    this.textNode = document.createTextNode("");
    this.writeText();
    this.editable.addEventListener("beforeinput", this.onBeforeInput);
    this.editable.addEventListener("compositionstart", this.onCompositionStart);
    this.editable.addEventListener("compositionend", this.onCompositionEnd);
    this.wireAria();
    this.syncAttributes();
    this.attributeObs = new MutationObserver(this.syncAttributes);
    this.attributeObs.observe(this.el, {
      attributes: true,
      attributeFilter: ["aria-label", "aria-description"],
    });
  }

  disconnectedCallback() {
    this.unsubscribe?.();
    this.attributeObs?.disconnect();
    clearTimeout(this.typingTimer);
  }

  formResetCallback() {
    this.interacted = false;
    this.applyValue(this.defaultValue ?? "");
    this.lastChangeValue = this.model.display;
  }

  formStateRestoreCallback(state: string | File | FormData | null) {
    if (typeof state === "string") this.applyValue(state);
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

  @Listen("selectionchange", { target: "document" })
  onSelectionChange() {
    if (this.focused) this.rememberSelection();
  }

  @Watch("value")
  onValueChange() {
    if (this.value !== this.model.display) this.applyValue(this.value);
  }

  @Watch("mask")
  onMaskChange() {
    this.loadMask();
  }

  @Watch("placeholderChar")
  onPlaceholderCharChange() {
    this.setModel(this.engine.layout(this.model.raw, this.placeholderChar));
  }

  @Watch("unmasked")
  @Watch("required")
  @Watch("disabled")
  @Watch("readonly")
  onFlagChange() {
    this.sync();
  }

  /** Focuses the field and selects all of its text */
  @Method()
  async select() {
    this.editable.focus();
    this.setSelection(0, this.model.display.length);
  }

  /** Selects the characters from `start` to `end` of the formatted text */
  @Method()
  async setSelectionRange(start: number, end: number) {
    this.setSelection(start, end);
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
   * is hidden until the user interacts with the field again.
   */
  @Method()
  async resetValidity() {
    this.customMessage = "";
    this.interacted = false;
    this.sync();
  }

  private get isDisabled() {
    return this.disabled || this.formDisabled;
  }

  private get editing() {
    return !this.isDisabled && !this.readonly && !this.loading;
  }

  /** The text the field shows. It differs from the display when the mask conceals characters. */
  private get shown() {
    return this.engine.conceal?.(this.model) ?? this.model.display;
  }

  /**
   * Looks up the mask and re-formats the value with it. A lazily registered
   * mask loads first, and only the latest lookup is applied.
   */
  private loadMask(initial = false) {
    const token = ++this.maskToken;
    const result = resolveMask(this.mask);
    // Before a lazy mask loads, the field holds plain text, so its raw value
    // includes separators. The text is re-read with the new mask instead.
    const fromText = initial || this.loading;
    if (!(result instanceof Promise)) {
      this.useMask(result, fromText);
      return;
    }
    this.loading = true;
    result.then(
      (mask) => token === this.maskToken && this.useMask(mask, true),
      (error) => {
        if (token !== this.maskToken) return;
        console.error(`orb-mask-input: the mask "${this.mask}" failed to load`, error);
        this.useMask(resolveMask(undefined) as Mask, true);
      },
    );
  }

  private useMask(mask: Mask, fromText: boolean) {
    this.loading = false;
    if (mask === this.engine && !fromText) return;
    this.engine = mask;
    const raw = fromText ? mask.extract(this.model.display) : this.model.raw;
    this.setModel(mask.layout(raw, this.placeholderChar));
  }

  /**
   * Form-associated elements don't get these from the platform, but
   * `orb-textbox` reads them from the element. The ARIA lists are set on the
   * host before this component loads, so their current values are kept.
   */
  private exposeFormProps() {
    const internals = this.internals;
    this.labelledBy = [...(this.el.ariaLabelledByElements ?? [])];
    this.describedBy = [...(this.el.ariaDescribedByElements ?? [])];
    exposeFormProps(this.el, internals, {
      selectionStart: { configurable: true, get: () => this.lastSelection.start },
      selectionEnd: { configurable: true, get: () => this.lastSelection.end },
      ariaLabelledByElements: {
        configurable: true,
        get: () => this.labelledBy,
        set: (elements: Element[]) => {
          this.labelledBy = [...elements];
          this.wireAria();
        },
      },
      ariaDescribedByElements: {
        configurable: true,
        get: () => this.describedBy,
        set: (elements: Element[]) => {
          this.describedBy = [...elements];
          this.wireAria();
        },
      },
    });
  }

  /** The editable is the element with focus, so it carries the names and descriptions the host has */
  private wireAria() {
    if (!this.editable) return;
    this.editable.ariaLabelledByElements = [
      ...(Array.from(this.internals.labels) as Element[]),
      ...this.labelledBy,
    ];
    this.editable.ariaDescribedByElements = this.describedBy;
  }

  /** Copies the host's `aria-label` and `aria-description` attributes to the editable */
  private syncAttributes = () => {
    if (!this.editable) return;
    for (const name of ["aria-label", "aria-description"]) {
      const value = this.el.getAttribute(name);
      if (value === null) this.editable.removeAttribute(name);
      else this.editable.setAttribute(name, value);
    }
  };

  /** Replaces the value from code or a form reset. Undo history starts over, and no input event fires. */
  private applyValue(text: string) {
    this.undoStack = [];
    this.redoStack = [];
    this.endTypingGroup();
    this.setModel(this.engine.layout(this.engine.extract(text), this.placeholderChar));
    this.setSelection(this.model.display.length);
  }

  private setModel(layout: Layout) {
    this.model = layout;
    this.writeText();
    if (this.value !== layout.display) this.value = layout.display;
    this.sync();
  }

  /**
   * Keeps the editable's only child as the one text node, with the display as
   * its text. Browsers can split or add nodes while editing, such as a `<br>`
   * when the field empties in Firefox.
   */
  private writeText() {
    if (!this.editable) return;
    if (this.editable.childNodes.length !== 1 || this.editable.firstChild !== this.textNode) {
      this.editable.replaceChildren(this.textNode);
    }
    const shown = this.shown;
    if (this.textNode.data !== shown) this.textNode.data = shown;
  }

  private sync() {
    this.syncFormValue();
    this.syncValidity();
    this.syncStates();
  }

  private syncFormValue() {
    const { display, raw } = this.model;
    this.internals.setFormValue(this.unmasked ? this.engine.unmask(raw) : display, display);
  }

  private syncValidity() {
    // Disabled and readonly fields are left out of constraint validation
    const barred = this.isDisabled || this.readonly;
    const empty = this.model.raw === "";
    const valueMissing = !barred && this.required && empty;
    const patternMismatch = !barred && !empty && this.model.complete === false;
    const customError = !barred && this.customMessage !== "";
    if (valueMissing || patternMismatch || customError) {
      const message = customError
        ? this.customMessage
        : valueMissing
          ? browserMessage((input) => (input.required = true))
          : browserMessage((input) => {
              input.pattern = "(?!)";
              input.value = "x";
            });
      this.internals.setValidity(
        { valueMissing, patternMismatch, customError },
        message,
        this.editable,
      );
    } else {
      this.internals.setValidity({});
    }
  }

  private syncStates() {
    const { states, validity } = this.internals;
    const interacted = this.interacted;
    const invalid = !validity.valid;
    toggleState(states, "blank", this.model.raw === "");
    toggleState(states, "complete", this.model.complete === true);
    toggleState(states, "disabled", this.isDisabled);
    toggleState(states, "readonly", this.readonly);
    toggleState(states, "invalid", invalid);
    toggleState(states, "user-invalid", interacted && invalid);
    toggleState(states, "user-valid", interacted && !invalid);
    this.userInvalid = interacted && invalid;
  }

  /** The selection inside the editable, or the last one seen while it had focus */
  private currentSelection(): { start: number; end: number } {
    return selectionOffsets(this.editable) ?? this.lastSelection;
  }

  private rememberSelection = () => {
    const offsets = selectionOffsets(this.editable);
    if (offsets) this.lastSelection = offsets;
  };

  /** Sets the selection, moving the caret when the field has focus */
  private setSelection(start: number, end = start) {
    const max = this.model.display.length;
    this.lastSelection = { start: clamp(start, max), end: clamp(end, max) };
    if (this.focused) this.placeSelection(this.lastSelection.start, this.lastSelection.end);
  }

  private placeSelection(start: number, end: number) {
    const selection = window.getSelection();
    if (!selection) return;
    // An empty text node can leave Safari's caret in the wrong place, so an empty field selects its element
    if (this.textNode.data === "") {
      selection.setBaseAndExtent(this.editable, 0, this.editable, 0);
    } else {
      selection.setBaseAndExtent(this.textNode, start, this.textNode, end);
    }
  }

  /**
   * Applies an edit from the user, or from a method. Returns nothing: it
   * commits the new layout, moves the caret, and fires `input` when the text changed.
   */
  private edit(edit: Edit, inputType: string, data: string | null = null, group?: string) {
    const prev = this.model;
    const { layout, caret } = applyEdit(this.engine, prev, edit, this.placeholderChar);
    const changed = layout.display !== prev.display || layout.raw !== prev.raw;
    if (changed) this.remember(prev, edit.start, group);
    this.setModel(layout);
    this.setSelection(caret);
    if (!changed) return;
    this.dispatchInput(inputType, data);
    if (layout.complete && !prev.complete) this.orbComplete.emit(layout.display);
  }

  /** Brings the model in line with text the browser changed itself, such as an IME composition or a drop */
  private reconcile(inputType: string, data: string | null) {
    // Concealed text has the same length as the display, so a change to it
    // maps to the same positions in the display
    const text = this.editable.textContent ?? "";
    const shown = this.shown;
    if (text === shown) {
      this.writeText();
      return;
    }
    this.edit(diffEdit(shown, text), inputType, data);
  }

  private dispatchInput(inputType: string, data: string | null) {
    this.el.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true, inputType, data }));
  }

  /**
   * Records the state before an edit for undo. Consecutive edits in the same
   * group, such as typing, share one step.
   */
  private remember(prev: Layout, at: number, group?: string) {
    const merge = group !== undefined && group === this.typingGroup;
    if (!merge) {
      this.undoStack.push({ raw: prev.raw, caret: rawIndexAt(prev.literal, at) });
      if (this.undoStack.length > HISTORY_LIMIT) this.undoStack.shift();
    }
    this.redoStack = [];
    clearTimeout(this.typingTimer);
    this.typingGroup = group;
    this.typingTimer =
      group === undefined ? undefined : setTimeout(() => this.endTypingGroup(), TYPING_PAUSE);
  }

  private endTypingGroup() {
    clearTimeout(this.typingTimer);
    this.typingGroup = undefined;
  }

  private undo() {
    this.restore(this.undoStack, this.redoStack, "historyUndo");
  }

  private redo() {
    this.restore(this.redoStack, this.undoStack, "historyRedo");
  }

  private restore(from: Snapshot[], to: Snapshot[], inputType: string) {
    if (!this.editing) return;
    const snapshot = from.pop();
    if (!snapshot) return;
    const { literal } = this.model;
    to.push({ raw: this.model.raw, caret: rawIndexAt(literal, this.lastSelection.start) });
    this.endTypingGroup();
    const layout = this.engine.layout(snapshot.raw, this.placeholderChar);
    this.setModel(layout);
    this.setSelection(offsetForRaw(layout.literal, snapshot.caret));
    this.dispatchInput(inputType, null);
  }

  private deleteAt(direction: "backward" | "forward") {
    const { start, end } = this.currentSelection();
    this.edit(
      { start, end, text: "", direction },
      direction === "backward" ? "deleteContentBackward" : "deleteContentForward",
      null,
      "delete",
    );
  }

  /** Deletes a run of characters between separators, so one word-delete removes one group of digits */
  private deleteWord(backward: boolean) {
    const { start, end } = this.currentSelection();
    const { literal } = this.model;
    let from = start;
    let to = end;
    if (start === end) {
      if (backward) {
        while (from > 0 && literal[from - 1]) from--;
        while (from > 0 && !literal[from - 1]) from--;
      } else {
        while (to < literal.length && literal[to]) to++;
        while (to < literal.length && !literal[to]) to++;
      }
    }
    this.edit({ start: from, end: to, text: "" }, backward ? "deleteWordBackward" : "deleteWordForward");
  }

  /** Turns a keypress or a command into an edit. Anything not handled here is left to the browser and picked up on `input`. */
  private onBeforeInput = (ev: InputEvent) => {
    if (ev.isComposing) return;
    if (!this.editing) {
      ev.preventDefault();
      return;
    }
    const type = ev.inputType;
    switch (type) {
      case "historyUndo":
        ev.preventDefault();
        this.undo();
        break;
      case "historyRedo":
        ev.preventDefault();
        this.redo();
        break;
      case "insertText":
        if (!ev.data) break;
        ev.preventDefault();
        this.edit({ ...this.currentSelection(), text: ev.data }, type, ev.data, "typing");
        break;
      case "insertParagraph":
      case "insertLineBreak":
        // Enter submits, as it does in a native input
        ev.preventDefault();
        this.internals.form?.requestSubmit();
        break;
      case "deleteContentBackward":
        ev.preventDefault();
        this.deleteAt("backward");
        break;
      case "deleteContentForward":
        ev.preventDefault();
        this.deleteAt("forward");
        break;
      case "deleteWordBackward":
      case "deleteWordForward":
        ev.preventDefault();
        this.deleteWord(type === "deleteWordBackward");
        break;
      case "deleteSoftLineBackward":
      case "deleteHardLineBackward":
        ev.preventDefault();
        this.edit({ start: 0, end: this.currentSelection().end, text: "" }, type);
        break;
      case "deleteSoftLineForward":
      case "deleteHardLineForward":
        ev.preventDefault();
        this.edit({ start: this.currentSelection().start, end: this.model.display.length, text: "" }, type);
        break;
    }
  };

  private onCompositionStart = () => {
    this.composing = true;
  };

  /** The composed text is in the DOM by now, so it's applied here */
  private onCompositionEnd = (ev: CompositionEvent) => {
    this.composing = false;
    this.reconcile("insertCompositionText", ev.data);
  };

  /** Stops the browser's own input event, which reports unformatted text, and reports the change as the mask's */
  private onInput = (ev: InputEvent) => {
    ev.stopPropagation();
    if (this.composing) return;
    this.reconcile(ev.inputType, ev.data);
  };

  /** Pasted text goes through the mask, so it's filtered and formatted like typing */
  private onPaste = (ev: ClipboardEvent) => {
    ev.preventDefault();
    const text = ev.clipboardData?.getData("text/plain") ?? "";
    if (!this.editing || !text) return;
    this.edit({ ...this.currentSelection(), text }, "insertFromPaste");
  };

  private onKeyDown = (ev: KeyboardEvent) => {
    if (ev.isComposing || !(ev.metaKey || ev.ctrlKey)) return;
    // Covers undo when the browser doesn't send historyUndo
    const key = ev.key.toLowerCase();
    if (key === "z" && !ev.shiftKey) {
      ev.preventDefault();
      this.undo();
    } else if (key === "y" || (key === "z" && ev.shiftKey)) {
      ev.preventDefault();
      this.redo();
    }
  };

  private onFocus = () => {
    this.focused = true;
    const { start, end } = this.lastSelection;
    if (usingKeyboard()) {
      // Tabbing in selects everything, as it does in a native input
      this.setSelection(0, this.model.display.length);
    } else if (!selectionOffsets(this.editable)) {
      this.setSelection(start, end);
    } else {
      this.rememberSelection();
    }
  };

  private onBlur = () => {
    this.focused = false;
    this.interacted = true;
    this.sync();
    if (this.model.display !== this.lastChangeValue) {
      this.lastChangeValue = this.model.display;
      this.el.dispatchEvent(new globalThis.Event("change", { bubbles: true, composed: true }));
    }
  };

  render() {
    const { display, guide } = this.model;
    const rest = guide.startsWith(display) ? guide.slice(display.length) : "";
    const shown = this.shown;
    const showGuide = this.guide === "always" || (this.guide === "focus" && this.focused);
    const showPlaceholder = display === "" && !!this.placeholder && !(showGuide && rest);

    return (
      <Host>
        <div class="field" part="field">
          <span
            ref={(el) => (this.editable = el)}
            part="input"
            class="input"
            role="textbox"
            aria-multiline="false"
            aria-required={this.required ? "true" : undefined}
            aria-readonly={this.readonly ? "true" : undefined}
            aria-disabled={this.isDisabled ? "true" : undefined}
            aria-invalid={this.userInvalid ? "true" : undefined}
            aria-placeholder={this.placeholder}
            aria-busy={this.loading ? "true" : undefined}
            contenteditable={this.editing ? "plaintext-only" : "false"}
            tabindex={this.isDisabled ? -1 : 0}
            inputmode={this.inputmode ?? this.engine.inputMode}
            enterkeyhint={this.enterkeyhint}
            autocapitalize={this.autocapitalize}
            autocorrect="off"
            spellcheck={false}
            onFocus={this.onFocus}
            onBlur={this.onBlur}
            onKeyDown={this.onKeyDown}
            onKeyUp={this.rememberSelection}
            onPointerUp={this.rememberSelection}
            onInput={this.onInput}
            onPaste={this.onPaste}
          />
          {showGuide && (
            <span class="guide" part="guide" aria-hidden="true">
              <span class="typed">{shown}</span>
              {rest}
            </span>
          )}
          {showPlaceholder && (
            <span class="placeholder" part="placeholder" aria-hidden="true">
              {this.placeholder}
            </span>
          )}
        </div>
      </Host>
    );
  }
}
