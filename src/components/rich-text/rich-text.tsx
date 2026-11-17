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
import { composedContains } from "../../utils/composed";
import { toggleState } from "../../utils/custom-states";
import { browserMessage, exposeFormProps } from "../../utils/form";
import { ReadyController } from "../../utils/ready-controller";
import { looksLikeMarkdown, markdownToHtml } from "./convert/markdown";
import { closestCodeBlock, deleteAcross, insertFragment, wrapLooseText } from "./editing/blocks";
import { clearHighlights, DEFAULT_LANGUAGES, highlightCode } from "./editing/code";
import { COMMANDS, commandForInput, CommandContext, DEFAULT_TOOLBAR, matches, parseToolbar } from "./editing/commands";
import { atBlockEnd, atBlockStart, atomAfter, atomBefore, handleKey } from "./editing/input";
import type { ApplyOptions, EditorHost } from "./editing/host";
import type { Key } from "./editing/input";
import { toggleTask } from "./editing/lists";
import {
  closestLink,
  insertFormattedText,
  insertLink,
  insertNodeAt,
  PendingFormats,
  removeLink,
  removePiece,
} from "./editing/inline";
import { History, Point, samePoint, toPoint } from "./editing/history";
import { markPieces, normalize, normalizeAround, removeBrowserBreaks, serialize } from "./editing/normalize";
import { Plan, planEnter, planTyped } from "./editing/rules";
import { isSafeUrl } from "./editing/schema";
import { sanitize, textToFragment } from "./editing/sanitize";
import {
  caretAfterPiece,
  caretAnchor,
  closestBlock,
  getRange,
  pieceAt,
  selectRange,
  settleCaret,
} from "./editing/selection";
import { MoreIcon } from "./icons";
import { createColorPicker } from "./ui/color-picker";
import { DEFAULT_FONTS, DEFAULT_FONT_SIZES, DEFAULT_PALETTE, FontOption } from "./ui/defaults";
import { createSymbolPicker } from "./ui/symbol-picker";
import { shortcutText, ToolbarButton } from "./ui/toolbar";

/** The text of the elements in a slot, or null when nothing is slotted */
function textOf(slot?: HTMLSlotElement): string | null {
  const text = slot?.assignedElements().map((el) => el.textContent?.trim() ?? "").join(" ").trim();
  return text || null;
}

function textOfLabels(labels: NodeList): string | null {
  const text = Array.from(labels).map((label) => label.textContent?.trim() ?? "").join(" ").trim();
  return text || null;
}

/** Gives an element an id, if it has none, so other elements can refer to it */
function idOf(el: HTMLElement) {
  el.id ||= `orb-rich-text-${Math.random().toString(36).slice(2, 9)}`;
  return el.id;
}

/** How long typing pauses before it's saved as one undo step */
const TYPING_UNDO_MS = 500;
/** How long typing pauses before code blocks are colored again */
const HIGHLIGHT_MS = 150;
/** The input events that are keys, handled by the editing behaviors */
/**
 * Safari reports some Enter presses as a line break, and a line break is only
 * ever Shift+Enter on the keyboard, which keydown handles. So both are Enter here.
 */
const KEY_INPUTS: Record<string, Key> = { insertParagraph: "enter", insertLineBreak: "enter" };

/** Whether two state records hold the same values */
const sameValues = (a: Record<string, unknown>, b: Record<string, unknown>) => {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...keys].every((key) => a[key] === b[key]);
};
/** Used until the More button has been measured */
const MORE_BUTTON_WIDTH = 36;

export interface EditorChangeEvent {
  html: string;
  text: string;
  isEmpty: boolean;
}

/**
 * A rich text editor that's also a form field. The form gets its content as
 * HTML, under the element's `name` attribute.
 *
 * @slot label - The label, instead of the `label` prop
 * @slot note - The note, instead of the `note` prop
 *
 * @part shell - The bordered editor: toolbar, content and footer
 * @part toolbar - The row of formatting controls
 * @part content - The writing area
 * @part footer - The word and character counts
 */
@Component({
  tag: "orb-rich-text",
  styleUrl: "rich-text.css",
  shadow: { delegatesFocus: true },
  formAssociated: true,
})
export class RichText extends ReadyController implements EditorHost {
  @AttachInternals() internals: ElementInternals;
  @Element() el: HTMLElement;

  /** Text above the editor */
  @Prop() label?: string;

  /** Informational message below the editor */
  @Prop() note?: string;

  /** Shown while the editor is empty */
  @Prop() placeholder = "Start typing...";

  /**
   * The content, as HTML. It updates as the user edits: right after commands
   * like Bold, and after each pause in typing. `getContent()` is always current.
   */
  @Prop({ mutable: true }) value = "";

  /** The content a form reset returns to. Defaults to the initial `value`. */
  @Prop() defaultValue?: string;

  /** Requires content before the form can be submitted */
  @Prop({ reflect: true }) required = false;

  /** Disables the editor. It isn't submitted with the form. */
  @Prop({ reflect: true }) disabled = false;

  /** Shows the content without allowing edits. Still focusable and submitted with the form. */
  @Prop({ reflect: true }) readonly = false;

  /** The smallest height of the writing area */
  @Prop() minHeight = "200px";

  /** The largest height of the writing area, after which it scrolls */
  @Prop() maxHeight = "500px";

  /** Shows the word and character counts below the editor */
  @Prop() showWordCount = true;

  /** Underlines misspelled words, using the browser's spell checker */
  @Prop() spellcheck = true;

  /**
   * The toolbar's controls, in order. `|` separates groups. Commands not
   * listed are still available from keyboard shortcuts. Groups that don't fit
   * move into a More menu.
   */
  @Prop() toolbar = DEFAULT_TOOLBAR;

  /**
   * The languages offered for code blocks. Set it as a property. A language the
   * highlighter doesn't know is offered, but its code isn't colored.
   */
  @Prop() codeLanguages: string[] = [...DEFAULT_LANGUAGES];

  /**
   * The fonts the font picker offers. Set it as a property. "Default" is always
   * offered first, and removes the font.
   */
  @Prop() fonts: FontOption[] = DEFAULT_FONTS;

  /** The font sizes in points that the size picker offers, separated by spaces */
  @Prop() fontSizes = DEFAULT_FONT_SIZES;

  /** The swatches in the color pickers. Set it as a property. */
  @Prop() colors: string[] = DEFAULT_PALETTE;

  /**
   * Renders plain text that looks like Markdown when it's pasted, such as a
   * heading, a list or **bold**. When off, such text pastes as it is.
   */
  @Prop() markdownPaste = true;

  @State() isFocused = false;
  @State() wordCount = 0;
  @State() characterCount = 0;
  /** The URL of the link the link popover is showing */
  @State() selectedLink = "";
  /** The state of each toolbar command, by id */
  @State() states: Record<string, boolean | string | null> = {};
  /** Toolbar controls that don't apply to the selection right now, such as the code language outside code */
  @State() unavailable: Record<string, boolean> = {};
  /** Whether the list of keyboard shortcuts is open */
  @State() helpOpen = false;
  /** How many toolbar groups fit. The rest move into the More menu. */
  @State() fitCount = Infinity;
  @State() formDisabled = false;
  @State() userInvalid = false;
  /** `edit` for adding or changing a link, `view` for a link the caret is in */
  @State() linkMode: "edit" | "view" | null = null;
  /** Whether the link popover asks for the link's text too, for a new link with nothing selected */
  @State() linkTextEdit = false;

  /** Emits after each change, with the saved HTML and text. Both are computed only when read. */
  @Event() orbEditorChange: EventEmitter<EditorChangeEvent>;

  /** Emits when the content area gains focus */
  @Event() orbEditorFocus: EventEmitter<FocusEvent>;

  /** Emits when the content area loses focus, including to the toolbar */
  @Event() orbEditorBlur: EventEmitter<FocusEvent>;

  /** Formats for the next text typed at a collapsed caret */
  readonly pending = new PendingFormats();

  private editorRef: HTMLDivElement;
  private fileInputRef: HTMLInputElement;
  private toolbarEl?: HTMLDivElement;
  private moreEl?: HTMLElement;
  private labelSlot?: HTMLSlotElement;
  private noteEl?: HTMLElement;
  /** Set by a click on a label for the editor, so the focus it gives can be sent to the text */
  private focusFromLabel = false;
  private noteSlot?: HTMLSlotElement;
  private errorEl?: HTMLElement;
  private linkPopEl?: HTMLOrbPopoverElement;
  private linkInput?: HTMLInputElement;
  private linkTextInput?: HTMLInputElement;
  private history?: History;
  private typingTimer?: ReturnType<typeof setTimeout>;
  private highlightTimer?: ReturnType<typeof setTimeout>;
  /** Set by Escape, so the next Tab leaves the editor rather than indenting */
  private tabLeaves = false;
  /** The last selection in the editor, kept while focus is in the toolbar */
  private savedRange: Range | null = null;
  /** Where an image picked in the file dialog goes */
  private imageRange: Range | null = null;
  /** What the link popover edits: a link's text, or the selection */
  private linkRange: Range | null = null;
  /** The link the view popover is showing */
  private linkEl: HTMLAnchorElement | null = null;
  private linkShown = false;
  /** The popover is closing. The caret can't reopen it until it has closed. */
  private linkClosing = false;
  /** The caret moved into a link while the popover was closing */
  private linkWanted = false;
  /** Widths of toolbar groups, by their commands, kept once measured */
  private groupWidths = new Map<string, number>();
  private moreWidth = MORE_BUTTON_WIDTH;
  /** The saved content, until the next change */
  private cached?: { html: string; text: string };
  private interacted = false;
  private customMessage = "";
  /** The HTML last written to `value` and the form, so the watcher can tell it from outside changes */
  private lastValue = "";
  /** The HTML at the last `change` event */
  private lastChangeValue = "";
  private formListeners?: AbortController;
  private attributeObs?: MutationObserver;
  private resizeObs?: ResizeObserver;
  private pickerPopEl?: HTMLOrbPopoverElement;
  private pickerSlot?: HTMLElement;
  /** The command a picker was opened for, and the range its choice goes to */
  private pickerId = "";
  private pickerRange: Range | null = null;
  /** Where a Markdown rule left the caret. Backspace there undoes the rule. */
  private lastRule: Point | null = null;

  get root(): HTMLElement {
    return this.editorRef;
  }

  get editable() {
    return !this.isDisabled && !this.readonly;
  }

  get fontSizeList(): string[] {
    return this.fontSizes.split(/\s+/).filter(Boolean);
  }

  private get isDisabled() {
    return this.disabled || this.formDisabled;
  }

  @Listen("selectionchange", { target: "document" })
  onSelectionChange() {
    // Safari adds line breaks where the caret lands. They're removed before the caret is used.
    if (this.editorRef) removeBrowserBreaks(this.editorRef);
    const range = this.editorRef && getRange(this.editorRef);
    this.markSelectedPiece(range);
    // A rule's undo only applies while the caret is where the rule left it
    if (this.lastRule && !(range?.collapsed && samePoint(toPoint(this.editorRef, range.startContainer, range.startOffset), this.lastRule))) {
      this.lastRule = null;
    }
    if (!range) return;
    // A caret inside a piece, or just before a task checkbox, moves after it.
    const after = caretAfterPiece(range, this.editorRef);
    if (after) {
      selectRange(after);
      return;
    }
    this.savedRange = range.cloneRange();
    this.pending.sync(range);
    this.updateStates();
    this.updateLinkPopover(range);
  }

  @Listen("invalid")
  onInvalid() {
    this.interacted = true;
    this.syncStates();
  }

  /**
   * A click on a `<label for>` focuses the host, and `delegatesFocus` then
   * focuses the first toolbar button. The editor should take the focus instead.
   */
  /** Runs on mousedown, since the browser focuses the label's control before the click */
  @Listen("mousedown", { target: "document" })
  onLabelPress(ev: MouseEvent) {
    const label = (ev.target as Element).closest?.("label");
    this.focusFromLabel = !!label && Array.from(this.internals.labels).includes(label);
  }

  @Listen("focus")
  onHostFocus(ev: FocusEvent) {
    if (ev.target !== this.el || !this.focusFromLabel) return;
    requestAnimationFrame(() => {
      this.focusFromLabel = false;
      const active = this.el.shadowRoot?.activeElement;
      if (!active || active.closest(".editor-toolbar")) this.editorRef.focus({ preventScroll: true });
    });
  }

  /**
   * Moving to the toolbar, a menu or the link popover inside the editor isn't
   * leaving it. Leaving it is the `change` event.
   */
  @Listen("focusout")
  onFocusOut(ev: FocusEvent) {
    if (composedContains(this.el, ev.relatedTarget as Node | null)) return;
    this.saveTyping();
    this.interacted = true;
    this.syncValue();
    if (this.value !== this.lastChangeValue) {
      this.lastChangeValue = this.value;
      // Stencil's `Event` decorator is imported here, so the DOM constructor is named on window.
      this.el.dispatchEvent(new window.Event("change", { bubbles: true, composed: true }));
    }
  }

  @Watch("value")
  onValueChange(value: string) {
    // Values written by syncValue are already in the editor.
    if (value === this.lastValue) return;
    this.replaceContent(value);
  }

  @Watch("required")
  @Watch("readonly")
  onFlagChange() {
    this.syncValidity();
  }

  @Watch("disabled")
  onDisabledChange() {
    this.syncValue();
  }

  @Watch("label")
  @Watch("note")
  onLabelChange() {
    this.syncAttributes();
  }

  componentWillLoad() {
    this.defaultValue ??= this.value;
    exposeFormProps(this.el, this.internals);
  }

  componentDidLoad() {
    super.componentDidLoad();
    this.history = new History(this.editorRef);
    // Stencil's JSX types don't include onBeforeInput.
    this.editorRef.addEventListener("beforeinput", this.handleBeforeInput);
    this.replaceContent(this.value);
    this.syncAttributes();
    this.attributeObs = new MutationObserver(this.syncAttributes);
    this.resizeObs = new ResizeObserver(() => this.measureToolbar());
    this.observe();
  }

  componentDidRender() {
    this.wireAria();
    this.syncToolbarFocus();
    this.measureToolbar();
  }

  connectedCallback() {
    this.observe();
  }

  disconnectedCallback() {
    clearTimeout(this.typingTimer);
    clearTimeout(this.highlightTimer);
    if (this.editorRef) clearHighlights(this.editorRef);
    this.formListeners?.abort();
    this.attributeObs?.disconnect();
    this.resizeObs?.disconnect();
  }

  /** Watches the host's ARIA attributes and the toolbar's size. Starts again on reconnect. */
  private observe() {
    this.attributeObs?.observe(this.el, { attributes: true, attributeFilter: ["aria-label", "aria-description"] });
    if (this.toolbarEl) this.resizeObs?.observe(this.toolbarEl);
  }

  formAssociatedCallback(form: HTMLFormElement | null) {
    this.formListeners?.abort();
    if (!form) return;
    this.formListeners = new AbortController();
    const { signal } = this.formListeners;
    // Typing reaches the form after a pause, so submitting during one would send older content.
    form.addEventListener("submit", () => this.saveTyping(), { capture: true, signal });
    // new FormData(form) doesn't fire submit, so the entry is corrected here instead.
    form.addEventListener(
      "formdata",
      (ev) => {
        if (this.typingTimer === undefined) return;
        this.saveTyping();
        const name = this.el.getAttribute("name");
        if (name && !this.isDisabled) ev.formData.set(name, this.value);
      },
      { signal },
    );
  }

  formResetCallback() {
    this.interacted = false;
    this.replaceContent(this.defaultValue ?? "");
  }

  formStateRestoreCallback(state: string | File | FormData | null) {
    if (typeof state === "string") this.ready.then(() => this.replaceContent(state));
  }

  formDisabledCallback(disabled: boolean) {
    this.formDisabled = disabled;
    this.syncValue();
  }

  /** The content as canonical HTML, the form of the saved value */
  @Method()
  async getContent(): Promise<string> {
    return this.output().html;
  }

  /** The content as plain text, with a line per block */
  @Method()
  async getText(): Promise<string> {
    return this.output().text;
  }

  /**
   * Replaces the content with `html`, which is cleaned before it's shown. The
   * undo history starts over, and no `input` event fires.
   */
  @Method()
  async setContent(html: string): Promise<void> {
    this.replaceContent(html);
  }

  /** Removes all content. The undo history starts over. */
  @Method()
  async clear(): Promise<void> {
    this.replaceContent("");
  }

  /** Sets a custom validation error. Pass an empty string to clear it. */
  @Method()
  async setCustomValidity(message: string) {
    this.customMessage = message;
    this.syncValidity();
  }

  /**
   * Clears custom errors and the user interaction state, so validation styling
   * is hidden until the user interacts with the editor again.
   */
  @Method()
  async resetValidity() {
    this.customMessage = "";
    this.interacted = false;
    this.syncValidity();
  }

  // EditorHost

  takeRange(): Range {
    const range = getRange(this.editorRef) ?? this.savedRange;
    if (range && this.editorRef.contains(range.startContainer) && this.editorRef.contains(range.endContainer)) {
      return settleCaret(this.editorRef, range);
    }
    const end = document.createRange();
    end.selectNodeContents(this.editorRef);
    end.collapse(false);
    return end;
  }

  focusAt(range: Range) {
    // Only refocuses when focus is elsewhere. Safari can move the caret to the
    // start when the editor is focused from script.
    if (this.el.shadowRoot?.activeElement === this.editorRef) return;
    this.editorRef.focus({ preventScroll: true });
    selectRange(range);
  }

  /**
   * Runs an edit as one undo step, selects its result and fires `input`.
   * Returns false if nothing changed.
   */
  apply(
    edit: (range: Range) => Range | null | undefined,
    { inputType = "insertReplacementText", range }: ApplyOptions = {},
  ): boolean {
    if (!this.editable) return false;
    const target = range ?? this.takeRange();
    this.focusAt(target);
    this.saveTyping();
    const before = this.editorRef.innerHTML;
    const result = edit(target);
    if (!result) return false;
    const fixed = normalizeAround(this.editorRef, result);
    selectRange(fixed, { redraw: true });
    // Again after the next layout, in case Safari measured the caret before
    // the change was laid out.
    requestAnimationFrame(() => {
      const current = getRange(this.editorRef);
      if (current) selectRange(current, { redraw: true });
    });
    if (this.editorRef.innerHTML === before) return false;
    this.afterChange(true);
    this.dispatchInput(inputType);
    return true;
  }

  undo(): boolean {
    if (!this.history?.undo()) return false;
    this.afterChange(false);
    this.dispatchInput("historyUndo");
    return true;
  }

  redo(): boolean {
    if (!this.history?.redo()) return false;
    this.afterChange(false);
    this.dispatchInput("historyRedo");
    return true;
  }

  pickImage(range: Range) {
    this.imageRange = range.cloneRange();
    this.fileInputRef.click();
  }

  openLink(range: Range) {
    const link = closestLink(this.editorRef, range);
    if (link) {
      const text = document.createRange();
      text.selectNodeContents(link);
      this.showLinkPopover("edit", text, link.getAttribute("href") ?? "", link);
    } else {
      this.showLinkPopover("edit", range.cloneRange(), "https://", null, range.collapsed);
    }
  }

  update() {
    this.updateStates();
  }

  /** Runs a command from the toolbar, the keyboard, or the More menu. A select passes its chosen value. */
  private runCommand(id: string, value?: string, range?: Range) {
    const command = COMMANDS.get(id);
    if (!command || !this.editable) return;
    if (command.noCode && closestCodeBlock(this.editorRef, this.takeRange())) return;
    this.apply((target) => command.run({ host: this, root: this.editorRef, range: target, value }), {
      inputType: command.inputType,
      range,
    });
  }

  /** Opens a picker at the caret. A color or special character is chosen there, and runs the command again with it. */
  openPicker(id: string, range: Range) {
    this.pickerId = id;
    this.pickerRange = range.cloneRange();
    const current = this.states[id];
    const picker =
      id === "color" || id === "background"
        ? createColorPicker({
            colors: this.colors,
            current: typeof current === "string" && current ? current : null,
            onPick: (value) => this.pickFromPicker(value ?? ""),
          })
        : createSymbolPicker({
            mode: id === "emoji" ? "emoji" : "characters",
            onPick: (text) => this.pickFromPicker(text),
          });
    this.pickerSlot?.replaceChildren(picker);
    this.pickerPopEl?.show(caretAnchor(range, this.editorRef));
  }

  /** A value chosen in a picker runs its command on the range the picker opened at */
  private pickFromPicker(value: string) {
    const range = this.pickerRange;
    this.pickerRange = null;
    this.pickerPopEl?.hide();
    if (range) this.runCommand(this.pickerId, value, range);
  }

  /** Closing a picker without a choice returns the focus to the text */
  private finishPicker() {
    const range = this.pickerRange;
    this.pickerRange = null;
    if (range) this.focusAt(range);
  }

  /**
   * A typed character that completes a Markdown rule goes in first, then the rule
   * converts the text. They're separate undo steps, so undo brings back the typed text.
   */
  private applyTypedRule(data: string, plan: Plan) {
    const formats = new Map(this.pending.formats());
    this.pending.clear();
    this.apply((range) => insertFormattedText(this.editorRef, range, data, formats), { inputType: "insertText" });
    if (this.apply((range) => plan.run(this.editorRef, range))) this.rememberRule();
  }

  private rememberRule() {
    const range = getRange(this.editorRef);
    this.lastRule = range ? toPoint(this.editorRef, range.startContainer, range.startOffset) : null;
  }

  /** A choice from the More menu. A select's submenu sends "id:option". */
  private runOverflow(value: string) {
    const separator = value.indexOf(":");
    if (separator < 0) this.runCommand(value);
    else this.runCommand(value.slice(0, separator), value.slice(separator + 1));
  }

  /** The label of a select: the option that's current, or the command's own label */
  private labelOf(id: string): string {
    const command = COMMANDS.get(id)!;
    const value = this.states[id];
    return command.options?.(this).find((option) => option.value === value)?.label ?? command.label;
  }

  /** The toolbar's groups, minus the controls that don't apply right now */
  private visibleGroups(): string[][] {
    return parseToolbar(this.toolbar)
      .map((group) => group.filter((id) => !this.unavailable[id]))
      .filter((group) => group.length);
  }

  /** Alt+F10 moves focus to the toolbar */
  private focusToolbar() {
    const items = this.toolbarItems();
    (items.find((item) => item.tabIndex === 0) ?? items[0])?.focus();
  }

  /** Backspace and Delete. Pieces go whole, blocks join at their edges, and a selection across blocks is cleared together. */
  private handleDelete(prevent: () => void, inputType: string, range: Range) {
    const backward = inputType.includes("Backward");
    if (!range.collapsed) {
      // Within one block the browser deletes the text itself
      const crosses =
        closestBlock(range.startContainer, this.editorRef) !== closestBlock(range.endContainer, this.editorRef);
      if (!crosses) return;
      prevent();
      this.apply((r) => deleteAcross(this.editorRef, r), { inputType });
      return;
    }
    const piece = backward ? atomBefore(range) : atomAfter(range);
    if (piece) {
      prevent();
      this.apply(() => removePiece(piece), { inputType });
      return;
    }
    let key: Key | null = null;
    if (backward && atBlockStart(this.editorRef, range)) key = "backspaceAtStart";
    else if (!backward && atBlockEnd(this.editorRef, range)) key = "deleteAtEnd";
    if (!key) return;
    prevent();
    this.apply((r) => handleKey(this.editorRef, r, key!) ?? null, { inputType });
  }

  /** Colors the code blocks after a pause in typing, so typing isn't slowed */
  private scheduleHighlight() {
    clearTimeout(this.highlightTimer);
    this.highlightTimer = setTimeout(() => highlightCode(this.editorRef, this.codeLanguages), HIGHLIGHT_MS);
  }

  /** Opens the list of keyboard shortcuts */
  showHelp() {
    this.helpOpen = true;
  }

  /** Content set from code or a form reset starts a fresh undo history, and isn't a change from the user. */
  private replaceContent(html: string) {
    clearTimeout(this.typingTimer);
    this.typingTimer = undefined;
    this.pending.clear();
    const fragment = sanitize(html);
    normalize(fragment);
    this.editorRef.replaceChildren(fragment);
    this.history?.reset();
    this.afterChange(false);
    this.lastChangeValue = this.value;
  }

  /** Runs after each change: a command, undo, redo, or new content. */
  private afterChange(record: boolean) {
    this.cached = undefined;
    if (record) this.history?.record();
    this.updateWordCount();
    this.emitChange();
    this.updateStates();
    this.syncValue();
    this.scheduleHighlight();
  }

  /** The content as it's saved. Cached until the next change. */
  private output() {
    this.cached ??= serialize(this.editorRef);
    return this.cached;
  }

  /**
   * Writes the content to `value` and the form. Runs after commands, after a
   * pause in typing, and when focus leaves the editor.
   */
  private syncValue() {
    // A form can report the disabled state before the editor has rendered.
    if (!this.editorRef) return;
    const html = this.output().html;
    if (html !== this.lastValue) {
      this.lastValue = html;
      this.value = html;
    }
    // A disabled editor is left out of the form, as a disabled fieldset does it.
    this.internals.setFormValue(this.isDisabled ? null : html, html);
    this.syncValidity();
  }

  /** A change from typing or the browser. The value waits for a pause, but validity doesn't. */
  private contentChanged(inputType: string, data: string | null = null) {
    this.cached = undefined;
    this.updateWordCount();
    this.emitChange();
    this.syncValidity();
    this.saveTypingLater();
    this.scheduleHighlight();
    this.dispatchInput(inputType, data);
  }

  /** Saves a burst of typing as one undo step once it pauses. */
  private saveTypingLater() {
    clearTimeout(this.typingTimer);
    this.typingTimer = setTimeout(() => this.saveTyping(), TYPING_UNDO_MS);
  }

  private saveTyping() {
    if (this.typingTimer === undefined) return;
    clearTimeout(this.typingTimer);
    this.typingTimer = undefined;
    this.history?.record();
    this.syncValue();
  }

  /** Fires `input` on the host, for typing and commands alike, so listeners see one event type. */
  private dispatchInput(inputType: string, data: string | null = null) {
    this.el.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true, inputType, data }));
  }

  private updateStates() {
    const range = this.editorRef && (getRange(this.editorRef) ?? this.savedRange);
    if (!range) return;
    const ctx: CommandContext = { host: this, root: this.editorRef, range };
    const states: Record<string, boolean | string | null> = {};
    const unavailable: Record<string, boolean> = {};
    for (const id of parseToolbar(this.toolbar).flat()) {
      const command = COMMANDS.get(id);
      if (!command) continue;
      if (command.state) states[id] = command.state(ctx);
      if (command.available) unavailable[id] = !command.available(ctx);
    }
    if (!sameValues(states, this.states)) this.states = states;
    if (!sameValues(unavailable, this.unavailable)) this.unavailable = unavailable;
  }

  private updateWordCount() {
    const text = this.editorRef.innerText || "";
    this.characterCount = text.length;
    this.wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  }

  private emitChange() {
    // The saved content is only computed for listeners that read it.
    const read = () => this.output();
    this.orbEditorChange.emit({
      get html() {
        return read().html;
      },
      get text() {
        return read().text;
      },
      get isEmpty() {
        return !read().text.trim();
      },
    });
  }

  private handleBeforeInput = (event: InputEvent) => {
    if (!this.editable || event.isComposing) return;
    if (event.inputType === "historyUndo" || event.inputType === "historyRedo") {
      event.preventDefault();
      this.runCommand(event.inputType === "historyUndo" ? "undo" : "redo");
      return;
    }
    // Native format requests, such as from the iOS text menu
    const command = commandForInput(event.inputType);
    if (command) {
      event.preventDefault();
      this.runCommand(command.id);
      return;
    }
    const current = getRange(this.editorRef);
    if (!current) return;
    const range = settleCaret(this.editorRef, current);
    if (event.inputType.startsWith("delete")) {
      this.handleDelete(() => event.preventDefault(), event.inputType, range);
      return;
    }
    const key = KEY_INPUTS[event.inputType];
    if (key) {
      event.preventDefault();
      this.apply((r) => handleKey(this.editorRef, r, key) ?? null, { inputType: event.inputType });
      return;
    }
    // Text typed where no block exists yet, such as in an empty editor, starts a paragraph, so rules have one to work on
    if (event.inputType === "insertText" && event.data && range.collapsed && closestBlock(range.startContainer, this.editorRef) === this.editorRef) {
      event.preventDefault();
      const formats = new Map(this.pending.formats());
      this.pending.clear();
      const data = event.data;
      this.apply((r) => insertFormattedText(this.editorRef, wrapLooseText(this.editorRef, r), data, formats), { inputType: "insertText" });
      return;
    }
    // The character that completes a rule, such as the closing * of **bold**, or a space after #
    if (event.inputType === "insertText" && event.data && range.collapsed) {
      const plan = planTyped(this.editorRef, range, event.data);
      if (plan) {
        event.preventDefault();
        this.applyTypedRule(event.data, plan);
        return;
      }
    }
    // Formats don't apply to text typed inside a code block
    if (event.inputType === "insertText" && event.data && this.pending.size && !closestCodeBlock(this.editorRef, range)) {
      event.preventDefault();
      const caret = insertFormattedText(this.editorRef, range, event.data, this.pending.formats());
      this.pending.clear();
      selectRange(caret);
      this.contentChanged(event.inputType, event.data);
    }
  };

  private handleInput = (event: InputEvent) => {
    // The host fires its own input event, so typing and commands look the same to listeners.
    event.stopPropagation();
    this.contentChanged(event.inputType, event.data);
  };

  /**
   * Clicking a piece selects all of it, so Delete or Backspace can remove it.
   * Clicking a task checkbox checks or unchecks it.
   */
  private handleContentClick = (event: MouseEvent) => {
    const box = event.target;
    if (box instanceof HTMLInputElement && box.type === "checkbox" && this.editorRef.contains(box)) {
      // A canceled click restores the checkbox after the event, so the change runs after it.
      event.preventDefault();
      if (this.editable) setTimeout(() => this.apply(() => toggleTask(box)));
      return;
    }
    const piece = pieceAt(event.target as Node, this.editorRef);
    if (!piece) return;
    const range = document.createRange();
    range.selectNode(piece);
    selectRange(range);
    piece.setAttribute("data-selected", "");
  };

  /** Only a selection that covers a piece marks it. A collapsed caret clears the mark. */
  private markSelectedPiece(range: Range | null) {
    this.editorRef?.querySelectorAll("[data-selected]").forEach((el) => {
      if (!range || range.collapsed || !range.intersectsNode(el)) el.removeAttribute("data-selected");
    });
  }

  private handleKeyDown = (event: KeyboardEvent) => {
    // Keys typed while an input method is composing text belong to the input method.
    if (event.isComposing) return;
    // Only the key right after Escape can let Tab leave the editor
    const tabLeaves = this.tabLeaves;
    this.tabLeaves = event.key === "Escape";
    if (event.altKey && event.key === "F10") {
      event.preventDefault();
      this.focusToolbar();
      return;
    }
    if (!this.editable) return;
    const selected = this.editorRef.querySelector<HTMLElement>("[data-selected]");
    if (selected && (event.key === "Backspace" || event.key === "Delete")) {
      event.preventDefault();
      this.apply(() => removePiece(selected), { inputType: "deleteContentBackward" });
      return;
    }
    // Backspace right after a Markdown rule undoes it, so the typed text comes back
    if (this.lastRule && event.key === "Backspace") {
      const current = getRange(this.editorRef);
      if (current && samePoint(toPoint(this.editorRef, current.startContainer, current.startOffset), this.lastRule)) {
        event.preventDefault();
        this.lastRule = null;
        this.undo();
        return;
      }
    }
    const command = [...COMMANDS.values()].find((c) => c.shortcuts?.some((s) => matches(event, s)));
    if (command) {
      event.preventDefault();
      this.runCommand(command.id);
      return;
    }
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    // Backspace and Delete are handled here, since browsers don't send beforeinput when there's nothing to delete before the caret.
    if (event.key === "Backspace" || event.key === "Delete") {
      const current = getRange(this.editorRef);
      if (current) {
        const range = settleCaret(this.editorRef, current);
        const inputType = event.key === "Backspace" ? "deleteContentBackward" : "deleteContentForward";
        this.handleDelete(() => event.preventDefault(), inputType, range);
      }
      return;
    }
    // Enter is handled here, rather than from beforeinput, since browsers differ in what
    // they insert for it. Preventing the keydown stops the browser from inserting anything.
    if (event.key === "Enter") {
      event.preventDefault();
      const key: Key = event.shiftKey ? "shiftEnter" : "enter";
      let ruled = false;
      const changed = this.apply(
        (range) => {
          const plan = event.shiftKey ? null : planEnter(this.editorRef, range);
          if (plan?.replacesEnter) {
            ruled = true;
            return plan.run(this.editorRef, range);
          }
          // A link is made first, and the Enter then splits the block after it
          const caret = plan?.run(this.editorRef, range) ?? range;
          return handleKey(this.editorRef, caret, key) ?? (plan ? caret : null);
        },
        { inputType: event.shiftKey ? "insertLineBreak" : "insertParagraph" },
      );
      if (changed && ruled) this.rememberRule();
      return;
    }
    let key: Key | undefined;
    if (event.key === "Tab" && !tabLeaves) key = event.shiftKey ? "shiftTab" : "tab";
    else if (!event.shiftKey && event.key === "ArrowDown") key = "arrowDownAtEnd";
    else if (!event.shiftKey && event.key === "ArrowUp") key = "arrowUpAtStart";
    if (!key) return;
    // Only a key the editing behaviors take is prevented. Others keep their default.
    this.apply((range) => {
      const result = handleKey(this.editorRef, range, key!);
      if (result !== undefined) event.preventDefault();
      return result ?? null;
    });
  };

  private handlePaste = (event: ClipboardEvent) => {
    event.preventDefault();
    if (!this.editable) return;
    const html = event.clipboardData?.getData("text/html");
    const text = event.clipboardData?.getData("text/plain");
    // HTML is cleaned of scripts, styles, and unsafe links. Plain text is
    // inserted as text, so markup in it is never parsed. A code block takes plain text only.
    const range = this.takeRange();
    const inCode = !!closestCodeBlock(this.editorRef, range);
    // Plain text that reads as Markdown is rendered, then cleaned like HTML
    if (!html && text && this.markdownPaste && !inCode && looksLikeMarkdown(text)) {
      void markdownToHtml(text).then((rendered) => this.insertPasted(sanitize(rendered), range));
      return;
    }
    const fragment = html && !inCode ? sanitize(html) : text ? textToFragment(text) : null;
    if (fragment) this.insertPasted(fragment, range);
  };

  private insertPasted(fragment: DocumentFragment, range: Range) {
    if (!fragment.childNodes.length) return;
    markPieces(fragment);
    this.apply((target) => insertFragment(this.editorRef, target, fragment), { inputType: "insertFromPaste", range });
  }

  private handleFocus = (event: FocusEvent) => {
    this.isFocused = true;
    this.orbEditorFocus.emit(event);
  };

  private handleBlur = (event: FocusEvent) => {
    this.isFocused = false;
    this.orbEditorBlur.emit(event);
  };

  private handleImageUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = document.createElement("img");
      img.src = String(reader.result);
      img.alt = file.name;
      const range = this.imageRange;
      this.imageRange = null;
      if (range) this.apply((r) => insertNodeAt(wrapLooseText(this.editorRef, r), img), { range });
    };
    reader.readAsDataURL(file);
  }

  /** The link popover, which opens at the caret. It edits a link, or shows one the caret is in. */
  private showLinkPopover(
    mode: "edit" | "view",
    range: Range,
    href: string,
    link: HTMLAnchorElement | null = null,
    textEdit = false,
  ) {
    this.linkRange = range;
    this.linkEl = link;
    this.linkMode = mode;
    this.linkTextEdit = textEdit;
    this.selectedLink = href;
    if (mode === "edit") {
      this.linkInput.value = href;
      this.linkInput.setCustomValidity("");
      this.linkTextInput.value = "";
    }
    this.linkPopEl?.show(caretAnchor(range, this.editorRef));
    // A popover that's still opening focuses its field when it has finished opening.
    if (mode === "edit" && this.linkShown) this.linkInput.focus();
  }

  /** Shows the view popover while the caret is in a link, and hides it when the caret leaves */
  private updateLinkPopover(range: Range) {
    if (this.linkClosing) {
      this.linkWanted = true;
      return;
    }
    const inEditor = this.el.shadowRoot?.activeElement === this.editorRef;
    const link = range.collapsed && inEditor ? closestLink(this.editorRef, range) : null;
    if (link) {
      if (this.linkMode === "edit" || (this.linkMode === "view" && this.linkEl === link)) return;
      const text = document.createRange();
      text.selectNodeContents(link);
      this.showLinkPopover("view", text, link.getAttribute("href") ?? "", link);
    } else if (this.linkMode === "view") {
      this.closeLinkPopover();
    }
  }

  private closeLinkPopover(refocus = false) {
    this.linkPopEl?.hide();
    if (refocus && this.linkRange) this.focusAt(this.linkRange);
  }

  /** Once the popover has closed, the caret may reopen it if it moved into a link meanwhile. */
  private finishLinkClose() {
    this.linkClosing = false;
    this.linkMode = null;
    this.linkRange = null;
    this.linkEl = null;
    if (this.linkWanted) {
      this.linkWanted = false;
      const range = getRange(this.editorRef);
      if (range) this.updateLinkPopover(range);
    }
  }

  private applyLink() {
    const url = this.linkInput.value.trim();
    if (!isSafeUrl(url)) {
      this.linkInput.setCustomValidity("Links must start with http, https, mailto, or tel");
      this.linkInput.reportValidity();
      return;
    }
    const range = this.linkRange;
    if (!range) return;
    const text = this.linkTextEdit ? this.linkTextInput.value.trim() : "";
    this.apply(
      (r) => {
        if (this.linkTextEdit) {
          const link = document.createElement("a");
          link.href = url;
          link.textContent = text || url;
          return insertNodeAt(wrapLooseText(this.editorRef, r), link);
        }
        return insertLink(this.editorRef, wrapLooseText(this.editorRef, r), url);
      },
      { range, inputType: "insertLink" },
    );
    this.closeLinkPopover();
  }

  private removeCurrentLink() {
    const range = this.linkRange;
    if (range) this.apply((r) => removeLink(this.editorRef, r), { range, inputType: "formatRemove" });
    this.closeLinkPopover();
  }

  private openCurrentLink() {
    const href = this.linkMode === "view" ? this.selectedLink : this.linkInput.value.trim();
    if (isSafeUrl(href)) window.open(href, "_blank", "noopener");
  }

  private editLink() {
    if (this.linkRange) this.showLinkPopover("edit", this.linkRange, this.selectedLink, this.linkEl);
  }

  private handleLinkKeys = (ev: KeyboardEvent) => {
    if (ev.key === "Enter") {
      ev.preventDefault();
      this.applyLink();
    } else if (ev.key === "Escape") {
      // Stops the popover's own Escape handling, so focus can go back to the text.
      ev.stopPropagation();
      this.closeLinkPopover(true);
    }
  };

  /**
   * The content area's name and description. They come from text, since a
   * slotted label or note is in the light DOM, and browsers don't reliably
   * follow element references into it. The host's ARIA attributes win.
   */
  private syncAttributes = () => {
    if (!this.editorRef) return;
    const named =
      this.el.getAttribute("aria-label") ??
      textOf(this.labelSlot) ??
      this.label ??
      textOfLabels(this.internals.labels) ??
      "Rich text editor";
    this.editorRef.setAttribute("aria-label", named);
    const description = this.el.getAttribute("aria-description") ?? textOf(this.noteSlot);
    if (description) this.editorRef.setAttribute("aria-description", description);
    else this.editorRef.removeAttribute("aria-description");
  };

  /** The note and error message are in the shadow root, so they're referenced by id */
  private wireAria() {
    if (!this.editorRef) return;
    const described = [this.noteEl, this.errorEl].filter(Boolean) as HTMLElement[];
    if (described.length) this.editorRef.setAttribute("aria-describedby", described.map(idOf).join(" "));
    else this.editorRef.removeAttribute("aria-describedby");
  }

  private onSlotChange = () => {
    this.wireAria();
    this.syncAttributes();
  };

  /** No text, and nothing like an image or table that counts as content */
  private isBlank() {
    return !this.editorRef.textContent?.trim() && !this.editorRef.querySelector("img, video, iframe, table");
  }

  private syncValidity() {
    if (!this.editorRef) return;
    // Disabled and readonly fields are left out of constraint validation.
    const barred = this.isDisabled || this.readonly;
    const valueMissing = !barred && this.required && this.isBlank();
    const customError = !barred && this.customMessage !== "";
    if (valueMissing || customError) {
      const message = customError
        ? this.customMessage
        : browserMessage((input) => (input.required = true));
      this.internals.setValidity({ valueMissing, customError }, message, this.editorRef);
    } else {
      this.internals.setValidity({});
    }
    this.syncStates();
  }

  private syncStates() {
    if (!this.editorRef) return;
    const { states, validity } = this.internals;
    const invalid = !validity.valid;
    toggleState(states, "blank", this.isBlank());
    toggleState(states, "disabled", this.isDisabled);
    toggleState(states, "readonly", this.readonly);
    toggleState(states, "invalid", invalid);
    toggleState(states, "user-invalid", this.interacted && invalid);
    toggleState(states, "user-valid", this.interacted && !invalid);
    this.userInvalid = this.interacted && invalid;
  }

  private toolbarItems(): HTMLElement[] {
    return Array.from(this.toolbarEl?.querySelectorAll<HTMLElement>("orb-button") ?? []).filter(
      (item) => !(item as HTMLElement & { disabled?: boolean }).disabled,
    );
  }

  /** One Tab stop for the toolbar, so the roving focus stays on the last control used */
  private syncToolbarFocus() {
    const items = Array.from(this.toolbarEl?.querySelectorAll<HTMLElement>("orb-button") ?? []);
    const enabled = this.toolbarItems();
    const current = enabled.find((item) => item.tabIndex === 0) ?? enabled[0];
    items.forEach((item) => (item.tabIndex = item === current ? 0 : -1));
  }

  /** Left and Right move between controls (swapped in RTL), and Home and End go to the ends */
  private handleToolbarKeys = (ev: KeyboardEvent) => {
    const items = this.toolbarItems();
    const index = items.indexOf(ev.target as HTMLElement);
    if (index < 0) return;
    const rtl = getComputedStyle(this.toolbarEl).direction === "rtl";
    const step = ev.key === "ArrowRight" ? (rtl ? -1 : 1) : ev.key === "ArrowLeft" ? (rtl ? 1 : -1) : 0;
    let target: HTMLElement | undefined;
    if (step) target = items[(index + step + items.length) % items.length];
    else if (ev.key === "Home") target = items[0];
    else if (ev.key === "End") target = items[items.length - 1];
    if (!target) return;
    ev.preventDefault();
    items.forEach((item) => (item.tabIndex = item === target ? 0 : -1));
    target.focus();
  };

  /**
   * Caches each visible group's width, then works out how many groups fit.
   * The rest move into the More menu.
   */
  private measureToolbar() {
    const bar = this.toolbarEl;
    if (!bar) return;
    const groups = this.visibleGroups();
    const shown = Array.from(bar.querySelectorAll<HTMLElement>(":scope > orb-button-group"));
    shown.forEach((el, i) => this.groupWidths.set(groups[i].join(" "), el.getBoundingClientRect().width));
    if (this.moreEl) this.moreWidth = this.moreEl.getBoundingClientRect().width;

    const style = getComputedStyle(bar);
    const gap = parseFloat(style.columnGap) || 0;
    const inner = bar.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    let used = 0;
    let fit = 0;
    for (let i = 0; i < groups.length; i++) {
      const width = this.groupWidths.get(groups[i].join(" "));
      // A group never measured can't be placed, so everything shows once to measure it.
      if (width === undefined) {
        fit = groups.length;
        break;
      }
      const gapBefore = i ? gap : 0;
      const moreAfter = i + 1 < groups.length ? gap + this.moreWidth : 0;
      if (used + gapBefore + width + moreAfter > inner) break;
      used += gapBefore + width;
      fit = i + 1;
    }
    if (fit !== this.fitCount) this.fitCount = fit;
  }

  render() {
    const groups = this.visibleGroups();
    const shown = groups.slice(0, this.fitCount);
    const overflow = groups.slice(this.fitCount).flat();
    const isToggle = (id: string) => COMMANDS.get(id)?.control === "toggle";
    const isSelect = (id: string) => COMMANDS.get(id)?.control === "select";
    const shortcutOf = (id: string) => COMMANDS.get(id)?.shortcuts?.[0];
    const selects = shown.flat().filter(isSelect);

    return (
      <Host
        class={{
          "editor-container": true,
          "editor-focused": this.isFocused,
          "editor-readonly": this.readonly,
        }}
      >
        <slot
          name="label"
          ref={(el) => (this.labelSlot = el)}
          onSlotchange={this.onSlotChange}
        >
          {this.label && (
            <orb-label required={this.required}>
              {this.label}
            </orb-label>
          )}
        </slot>

        <div class="shell" part="shell">
          <div
            class="editor-toolbar"
            part="toolbar"
            role="toolbar"
            aria-label="Formatting"
            ref={(el) => (this.toolbarEl = el)}
            // Pressing a button with the mouse doesn't take focus from the editor,
            // so its selection stays put.
            onMouseDown={(ev) => ev.preventDefault()}
            onKeyDown={this.handleToolbarKeys}
          >
            {shown.map((group) => (
              <orb-button-group>
                {group.map((id) =>
                  isSelect(id) ? (
                    <orb-button
                      id={`action-${id}`}
                      fill="outline"
                      size="sm"
                      caret
                      class="select"
                      disabled={!this.editable}
                      aria-label={`${COMMANDS.get(id)!.label}: ${this.labelOf(id)}`}
                    >
                      {COMMANDS.get(id)!.icon?.()}
                    </orb-button>
                  ) : (
                    <ToolbarButton
                      command={COMMANDS.get(id)!}
                      pressed={!!this.states[id]}
                      color={typeof this.states[id] === "string" ? (this.states[id] as string) : null}
                      disabled={!this.editable}
                      onRun={() => this.runCommand(id)}
                    />
                  ),
                )}
              </orb-button-group>
            ))}
            {overflow.length > 0 && (
              <orb-button
                id="action-more"
                ref={(el) => (this.moreEl = el)}
                fill="outline"
                size="sm"
                aria-label="More formatting"
                disabled={!this.editable}
              >
                {MoreIcon({})}
              </orb-button>
            )}
          </div>

          <div class="editor-content-wrapper">
            <div
              tabindex={this.isDisabled ? -1 : 0}
              ref={(el) => (this.editorRef = el)}
              class="editor-content"
              part="content"
              contenteditable={this.editable}
              spellcheck={this.spellcheck}
              onInput={this.handleInput}
              onKeyDown={this.handleKeyDown}
              onClick={this.handleContentClick}
              onPaste={this.handlePaste}
              onFocus={this.handleFocus}
              onBlur={this.handleBlur}
              role="textbox"
              aria-multiline="true"
              aria-required={this.required ? "true" : undefined}
              aria-readonly={this.readonly ? "true" : undefined}
              aria-disabled={this.isDisabled ? "true" : undefined}
              aria-invalid={this.userInvalid ? "true" : undefined}
              aria-placeholder={this.placeholder}
              data-placeholder={this.placeholder}
              style={{
                minHeight: this.minHeight,
                maxHeight: this.maxHeight,
              }}
            ></div>
          </div>

          {this.showWordCount && (
            <div class="editor-footer" part="footer">
              <span class="word-count">
                Words: {this.wordCount} | Characters: {this.characterCount}
              </span>
            </div>
          )}
        </div>

        <slot name="note" ref={(el) => (this.noteSlot = el)} onSlotchange={this.onSlotChange}>
          {this.note && (
            <orb-note ref={(el) => (this.noteEl = el)}>{this.note}</orb-note>
          )}
        </slot>
        {this.userInvalid && (
          <orb-note invalid ref={(el) => (this.errorEl = el)}>
            {this.internals.validationMessage}
          </orb-note>
        )}

        {shown.flat().map((id) => (
          <orb-tooltip for={`action-${id}`} type="label" placement="top">
            {COMMANDS.get(id)!.label}
            {/* Drawn by CSS with empty alt text, so it isn't part of the button's
                name. Screen readers get it from aria-keyshortcuts instead. */}
            {shortcutOf(id) && <kbd data-shortcut={shortcutText(shortcutOf(id))} />}
          </orb-tooltip>
        ))}

        {selects.map((id) => (
          <orb-menu
            for={`action-${id}`}
            mode="single"
            label={COMMANDS.get(id)!.label}
            onOrbSelect={(ev) => this.runCommand(id, ev.detail.value)}
          >
            {COMMANDS.get(id)!.options!(this).map((option) => (
              <orb-mi value={option.value} checked={option.value === this.states[id]}>
                {option.label}
              </orb-mi>
            ))}
          </orb-menu>
        ))}

        {overflow.length > 0 && (
          <orb-menu for="action-more" label="More formatting" onOrbSelect={(ev) => this.runOverflow(ev.detail.value)}>
            {overflow.flatMap((id) => {
              const command = COMMANDS.get(id)!;
              // A select in the More menu is a submenu of its options. Its values are "id:option".
              if (isSelect(id)) {
                return [
                  <orb-mi id={`sub-${id}`}>{command.label}</orb-mi>,
                  <orb-menu for={`sub-${id}`} mode="single" label={command.label}>
                    {command.options!(this).map((option) => (
                      <orb-mi value={`${id}:${option.value}`} checked={option.value === this.states[id]}>
                        {option.label}
                      </orb-mi>
                    ))}
                  </orb-menu>,
                ];
              }
              return [
                <orb-mi
                  value={id}
                  type={isToggle(id) ? "checkbox" : "normal"}
                  checked={isToggle(id) && !!this.states[id]}
                >
                  {command.label}
                </orb-mi>,
              ];
            })}
          </orb-menu>
        )}

        <orb-overlay open={this.helpOpen} size="sm" onOrbDismiss={() => (this.helpOpen = false)}>
          <div class="help">
            <h2>Keyboard shortcuts</h2>
            <dl>
              {[...COMMANDS.values()]
                .filter((command) => command.shortcuts?.length)
                .map((command) => (
                  <div class="help-row">
                    <dt>{command.label}</dt>
                    <dd>
                      <kbd>{shortcutText(command.shortcuts![0])}</kbd>
                    </dd>
                  </div>
                ))}
            </dl>
            <p>In a list or code block, Tab indents. Press Escape, then Tab, to move focus out of the editor.</p>
          </div>
        </orb-overlay>

        <orb-popover
          class="link-popover"
          ref={(el) => (this.linkPopEl = el)}
          onOrbPresentEnd={() => {
            this.linkShown = true;
            if (this.linkMode === "edit") this.linkInput.focus();
          }}
          onOrbDismissStart={() => {
            this.linkShown = false;
            this.linkClosing = true;
          }}
          onOrbDismissEnd={() => this.finishLinkClose()}
        >
          <div class="link-panel">
            <div class="link-edit" hidden={this.linkMode !== "edit"}>
              <orb-textbox label="URL" class="link-field">
                <input
                  ref={(el) => (this.linkInput = el)}
                  type="url"
                  inputmode="url"
                  autocomplete="off"
                  onKeyDown={this.handleLinkKeys}
                />
              </orb-textbox>
              <div hidden={!this.linkTextEdit}>
                <orb-textbox label="Text" class="link-field">
                  <input
                    ref={(el) => (this.linkTextInput = el)}
                    type="text"
                    autocomplete="off"
                    onKeyDown={this.handleLinkKeys}
                  />
                </orb-textbox>
              </div>
              <div class="link-actions">
                <orb-button size="sm" onClick={() => this.applyLink()}>
                  Apply
                </orb-button>
                <orb-button size="sm" fill="outline" onClick={() => this.removeCurrentLink()}>
                  Remove
                </orb-button>
                <orb-button size="sm" fill="outline" onClick={() => this.openCurrentLink()}>
                  Open
                </orb-button>
              </div>
            </div>
            <div class="link-view" hidden={this.linkMode !== "view"}>
              <span class="link-url">{this.selectedLink}</span>
              <div class="link-actions">
                <orb-button size="sm" fill="outline" onClick={() => this.editLink()}>
                  Edit
                </orb-button>
                <orb-button size="sm" fill="outline" onClick={() => this.removeCurrentLink()}>
                  Remove
                </orb-button>
                <orb-button size="sm" fill="outline" onClick={() => this.openCurrentLink()}>
                  Open
                </orb-button>
              </div>
            </div>
          </div>
        </orb-popover>

        <orb-popover
          class="picker-popover"
          ref={(el) => (this.pickerPopEl = el)}
          onOrbPresentEnd={() => this.pickerSlot?.querySelector<HTMLElement>("input, button")?.focus()}
          onOrbDismissEnd={() => this.finishPicker()}
        >
          <div ref={(el) => (this.pickerSlot = el)}></div>
        </orb-popover>

        <input
          ref={(el) => (this.fileInputRef = el)}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(ev) => this.handleImageUpload(ev)}
        />
      </Host>
    );
  }
}
