import {
  Component,
  Host,
  Prop,
  Event,
  EventEmitter,
  State,
  Method,
  Element,
  Listen,
} from "@stencil/core";
import {
  Alignment,
  alignment,
  BlockType,
  blockType,
  clearFormatting,
  getRange,
  History,
  InlineFormat,
  insertFormattedText,
  insertFragment,
  insertLink,
  insertNodeAt,
  isInlineActive,
  isSafeUrl,
  ListType,
  listType,
  sanitize,
  selectRange,
  setAlignment,
  setBlockType,
  textToFragment,
  toggleInline,
  toggleList,
  wrapLooseText,
} from "./editing";
import {
  AlignCenterIcon,
  AlignJustifyIcon,
  AlignLeftIcon,
  AlignRightIcon,
  BoldIcon,
  ClearFormattingIcon,
  Heading1Icon,
  Heading2Icon,
  ImageIcon,
  ItalicIcon,
  LinkIcon,
  OrderedListIcon,
  ParagraphIcon,
  RedoIcon,
  StrikethroughIcon,
  UnderlineIcon,
  UndoIcon,
  UnorderedListIcon,
} from "./icons";

interface ToolbarAction {
  command: string;
  label: string;
  icon: (props?: any) => any;
  /** A key pressed with Ctrl, or Command on Apple devices */
  shortcut?: { key: string; shift?: boolean };
  /** Shows a pressed state while the command applies to the selection */
  toggle?: boolean;
}

interface ToolbarGroup {
  label: string;
  actions: ToolbarAction[];
}

const IS_APPLE = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent);

const INLINE_COMMANDS: Record<string, InlineFormat> = {
  bold: "strong",
  italic: "em",
  underline: "u",
  strikeThrough: "s",
};
const BLOCK_COMMANDS: Record<string, BlockType> = { heading1: "h1", heading2: "h2", paragraph: "p" };
const LIST_COMMANDS: Record<string, ListType> = { insertOrderedList: "ol", insertUnorderedList: "ul" };
const ALIGN_COMMANDS: Record<string, Alignment> = {
  justifyLeft: "left",
  justifyCenter: "center",
  justifyRight: "right",
  justifyFull: "justify",
};
/** Native format requests, such as from the iOS text menu */
const FORMAT_INPUTS: Record<string, string> = {
  formatBold: "bold",
  formatItalic: "italic",
  formatUnderline: "underline",
  formatStrikeThrough: "strikeThrough",
};
/** How long typing pauses before it's saved as one undo step */
const TYPING_UNDO_MS = 500;

export interface EditorChangeEvent {
  html: string;
  text: string;
  isEmpty: boolean;
}

@Component({
  tag: "orb-rich-text",
  styleUrl: "rich-text.css",
  shadow: {
    delegatesFocus: true,
  },
})
export class RichText {
  @Element() el: HTMLElement;

  @Prop() placeholder: string = "Start typing...";
  @Prop() value: string = "";
  @Prop() disabled: boolean = false;
  @Prop() readonly: boolean = false;
  @Prop() minHeight: string = "200px";
  @Prop() maxHeight: string = "500px";
  @Prop() showWordCount: boolean = true;

  @State() isFocused: boolean = false;
  @State() wordCount: number = 0;
  @State() characterCount: number = 0;
  @State() selectedLink: string = "";

  /** Which toolbar toggles are pressed, by command */
  @State() pressed: Record<string, boolean> = {};

  @Event() orbEditorChange: EventEmitter<EditorChangeEvent>;
  @Event() orbEditorFocus: EventEmitter<FocusEvent>;
  @Event() orbEditorBlur: EventEmitter<FocusEvent>;

  private editorRef: HTMLDivElement;
  private fileInputRef: HTMLInputElement;
  private history?: History;
  private typingTimer?: ReturnType<typeof setTimeout>;
  /** The last selection in the editor, kept while focus is in the toolbar */
  private savedRange: Range | null = null;
  /** Where an image picked in the file dialog goes */
  private imageRange: Range | null = null;
  /**
   * Formats turned on or off with nothing selected. They apply to the next
   * text typed at `pendingAt`, and are dropped if the caret moves.
   */
  private pendingFormats = new Map<InlineFormat, boolean>();
  private pendingAt?: { node: Node; offset: number };

  private toolbarGroups: ToolbarGroup[] = [
    {
      label: "History",
      actions: [
        { command: "undo", label: "Undo", icon: UndoIcon, shortcut: { key: "Z" } },
        { command: "redo", label: "Redo", icon: RedoIcon, shortcut: { key: "Z", shift: true } },
      ],
    },
    {
      label: "Text style",
      actions: [
        { command: "bold", label: "Bold", icon: BoldIcon, shortcut: { key: "B" }, toggle: true },
        { command: "italic", label: "Italic", icon: ItalicIcon, shortcut: { key: "I" }, toggle: true },
        { command: "underline", label: "Underline", icon: UnderlineIcon, shortcut: { key: "U" }, toggle: true },
        { command: "strikeThrough", label: "Strikethrough", icon: StrikethroughIcon, toggle: true },
      ],
    },
    {
      label: "Block type",
      actions: [
        { command: "heading1", label: "Heading 1", icon: Heading1Icon, toggle: true },
        { command: "heading2", label: "Heading 2", icon: Heading2Icon, toggle: true },
        { command: "paragraph", label: "Paragraph", icon: ParagraphIcon, toggle: true },
      ],
    },
    {
      label: "Lists",
      actions: [
        { command: "insertOrderedList", label: "Numbered list", icon: OrderedListIcon, toggle: true },
        { command: "insertUnorderedList", label: "Bulleted list", icon: UnorderedListIcon, toggle: true },
      ],
    },
    {
      label: "Alignment",
      actions: [
        { command: "justifyLeft", label: "Align left", icon: AlignLeftIcon, toggle: true },
        { command: "justifyCenter", label: "Align center", icon: AlignCenterIcon, toggle: true },
        { command: "justifyRight", label: "Align right", icon: AlignRightIcon, toggle: true },
        { command: "justifyFull", label: "Justify", icon: AlignJustifyIcon, toggle: true },
      ],
    },
    {
      label: "Insert",
      actions: [
        { command: "createLink", label: "Insert link", icon: LinkIcon },
        { command: "insertImage", label: "Insert image", icon: ImageIcon },
      ],
    },
    {
      label: "Clear",
      actions: [{ command: "removeFormat", label: "Clear formatting", icon: ClearFormattingIcon }],
    },
  ];

  /** Keeps the saved selection and the pressed states in step with the editor. */
  @Listen("selectionchange", { target: "document" })
  onSelectionChange() {
    const range = this.editorRef && getRange(this.editorRef);
    if (!range) return;
    this.savedRange = range.cloneRange();
    const { node, offset } = this.pendingAt ?? {};
    if (this.pendingFormats.size && (node !== range.startContainer || offset !== range.startOffset || !range.collapsed)) {
      this.pendingFormats.clear();
      this.pendingAt = undefined;
    }
    this.updatePressed(range);
  }

  componentDidLoad() {
    if (this.value) {
      this.editorRef.innerHTML = this.value;
      this.updateWordCount();
    }
    this.history = new History(this.editorRef);
    this.history.reset();
    // Stencil's JSX types don't include onBeforeInput.
    this.editorRef.addEventListener("beforeinput", this.handleBeforeInput);
  }

  disconnectedCallback() {
    clearTimeout(this.typingTimer);
  }

  @Method()
  async getContent(): Promise<string> {
    return this.editorRef.innerHTML;
  }

  @Method()
  async getText(): Promise<string> {
    return this.editorRef.innerText;
  }

  @Method()
  async setContent(html: string): Promise<void> {
    this.replaceContent(html);
  }

  @Method()
  async clear(): Promise<void> {
    this.replaceContent("");
  }

  /** Content set from code starts a fresh undo history, like setting a field's value. */
  private replaceContent(html: string) {
    clearTimeout(this.typingTimer);
    this.typingTimer = undefined;
    this.pendingFormats.clear();
    this.editorRef.innerHTML = html;
    this.history?.reset();
    this.afterChange(false);
  }

  /**
   * The selection to edit. Focus may be on a toolbar button, so it falls back
   * to the last selection in the editor, or the end of the content.
   */
  private takeRange(): Range {
    const range = getRange(this.editorRef) ?? this.savedRange;
    if (range && this.editorRef.contains(range.startContainer) && this.editorRef.contains(range.endContainer)) {
      return range;
    }
    const end = document.createRange();
    end.selectNodeContents(this.editorRef);
    end.collapse(false);
    return end;
  }

  private executeCommand(command: string) {
    if (this.disabled || this.readonly) return;
    const range = this.takeRange();
    // Only refocuses when focus is in the toolbar from the keyboard. Safari can
    // move the caret to the start when the editor is focused from script.
    if (this.el.shadowRoot?.activeElement !== this.editorRef) {
      this.editorRef.focus({ preventScroll: true });
      selectRange(range);
    }
    this.saveTyping();

    if (command === "undo" || command === "redo") {
      const changed = command === "undo" ? this.history?.undo() : this.history?.redo();
      if (changed) this.afterChange(false);
      return;
    }

    const format = INLINE_COMMANDS[command];
    if (format && range.collapsed) {
      // Nothing selected: the format applies to the next text typed here.
      const current = this.pendingFormats.get(format) ?? isInlineActive(this.editorRef, range, format);
      this.pendingFormats.set(format, !current);
      this.pendingAt = { node: range.startContainer, offset: range.startOffset };
      this.updatePressed(range);
      return;
    }

    let result: Range | null = range;
    if (format) {
      result = toggleInline(this.editorRef, range, format);
    } else if (BLOCK_COMMANDS[command]) {
      // Pressing the current heading again turns it back into a paragraph.
      const tag = this.pressed[command] ? "p" : BLOCK_COMMANDS[command];
      result = setBlockType(this.editorRef, wrapLooseText(this.editorRef, range), tag);
    } else if (LIST_COMMANDS[command]) {
      result = toggleList(this.editorRef, wrapLooseText(this.editorRef, range), LIST_COMMANDS[command]);
    } else if (ALIGN_COMMANDS[command]) {
      result = setAlignment(this.editorRef, wrapLooseText(this.editorRef, range), ALIGN_COMMANDS[command]);
    } else if (command === "removeFormat") {
      result = clearFormatting(this.editorRef, range);
    } else if (command === "createLink") {
      result = this.createLink(range);
    } else if (command === "insertImage") {
      this.imageRange = range.cloneRange();
      this.fileInputRef.click();
      return;
    }
    if (!result) return;
    selectRange(result, { redraw: true });
    // Again after the next layout, in case Safari measured the caret before
    // the change was laid out.
    requestAnimationFrame(() => {
      const current = getRange(this.editorRef);
      if (current) selectRange(current, { redraw: true });
    });
    this.afterChange();
  }

  private createLink(range: Range): Range | null {
    if (range.collapsed) {
      alert("Please select text to create a link");
      return null;
    }
    const url = prompt("Enter URL:", "https://");
    if (!url) return null;
    if (!isSafeUrl(url)) {
      alert("Links must start with http, https, mailto, or tel");
      return null;
    }
    // The prompt took focus, so put the selection back before changing it.
    this.editorRef.focus({ preventScroll: true });
    return insertLink(this.editorRef, range, url);
  }

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
      const range = this.imageRange ?? this.takeRange();
      this.editorRef.focus({ preventScroll: true });
      selectRange(insertNodeAt(range, img));
      this.imageRange = null;
      this.afterChange();
    };
    reader.readAsDataURL(file);
  }

  /**
   * Saves the change as an undo step, unless `record` is false, such as for
   * undo itself. Then updates the counts, the toolbar, and listeners.
   */
  private afterChange(record = true) {
    if (record) this.history?.record();
    this.updateWordCount();
    this.emitChange();
    this.updatePressed(getRange(this.editorRef));
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
  }

  private updatePressed(range: Range | null) {
    if (!range) return;
    const root = this.editorRef;
    const pressed: Record<string, boolean> = {};
    for (const [command, format] of Object.entries(INLINE_COMMANDS)) {
      pressed[command] = range.collapsed && this.pendingFormats.has(format)
        ? this.pendingFormats.get(format)!
        : isInlineActive(root, range, format);
    }
    const block = blockType(root, range);
    for (const [command, tag] of Object.entries(BLOCK_COMMANDS)) pressed[command] = block === tag;
    const list = listType(root, range);
    for (const [command, type] of Object.entries(LIST_COMMANDS)) pressed[command] = list === type;
    const align = alignment(root, range);
    for (const [command, value] of Object.entries(ALIGN_COMMANDS)) pressed[command] = align === value;

    const changed = Object.keys(pressed).some((key) => pressed[key] !== this.pressed[key]);
    if (changed) this.pressed = pressed;
  }

  private handleBeforeInput = (event: InputEvent) => {
    if (this.disabled || this.readonly) return;
    if (event.inputType === "historyUndo" || event.inputType === "historyRedo") {
      event.preventDefault();
      this.executeCommand(event.inputType === "historyUndo" ? "undo" : "redo");
      return;
    }
    const command = FORMAT_INPUTS[event.inputType];
    if (command) {
      event.preventDefault();
      this.executeCommand(command);
      return;
    }
    if (event.inputType === "insertText" && event.data && this.pendingFormats.size) {
      const range = getRange(this.editorRef);
      if (!range) return;
      event.preventDefault();
      const caret = insertFormattedText(this.editorRef, range, event.data, this.pendingFormats);
      this.pendingFormats.clear();
      this.pendingAt = undefined;
      selectRange(caret);
      this.handleInput();
    }
  };

  private handleInput = () => {
    this.updateWordCount();
    this.emitChange();
    this.saveTypingLater();
  };

  private handleKeyDown = (event: KeyboardEvent) => {
    // Handle keyboard shortcuts
    if (event.ctrlKey || event.metaKey) {
      // Lowercased, since Caps Lock and some browsers report capital letters.
      switch (event.key.toLowerCase()) {
        case "b":
          event.preventDefault();
          this.executeCommand("bold");
          break;
        case "i":
          event.preventDefault();
          this.executeCommand("italic");
          break;
        case "u":
          event.preventDefault();
          this.executeCommand("underline");
          break;
        case "z":
          event.preventDefault();
          this.executeCommand(event.shiftKey ? "redo" : "undo");
          break;
        case "y":
          event.preventDefault();
          this.executeCommand("redo");
          break;
      }
    }
  };

  private handlePaste = (event: ClipboardEvent) => {
    if (this.disabled || this.readonly) {
      event.preventDefault();
      return;
    }

    event.preventDefault();
    const html = event.clipboardData?.getData("text/html");
    const text = event.clipboardData?.getData("text/plain");
    // HTML is cleaned of scripts, styles, and unsafe links. Plain text is
    // inserted as text, so markup in it is never parsed.
    const fragment = html ? sanitize(html) : text ? textToFragment(text) : null;
    if (!fragment?.childNodes.length) return;
    this.saveTyping();
    const range = this.takeRange();
    selectRange(insertFragment(this.editorRef, range, fragment));
    this.afterChange();
  };

  private updateWordCount() {
    const text = this.editorRef.innerText || "";
    this.characterCount = text.length;
    this.wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  }

  private emitChange() {
    const html = this.editorRef.innerHTML;
    const text = this.editorRef.innerText || "";
    const isEmpty = !text.trim();

    this.orbEditorChange.emit({
      html,
      text,
      isEmpty,
    });
  }

  private handleFocus = (event: FocusEvent) => {
    this.isFocused = true;
    this.orbEditorFocus.emit(event);
  };

  private handleBlur = (event: FocusEvent) => {
    this.isFocused = false;
    this.orbEditorBlur.emit(event);
  };

  /** How a shortcut is written in a tooltip, such as ⌘B or Ctrl+B */
  private shortcutText({ key, shift }: NonNullable<ToolbarAction["shortcut"]>) {
    return IS_APPLE ? `${shift ? "⇧" : ""}⌘${key}` : `Ctrl+${shift ? "Shift+" : ""}${key}`;
  }

  /** The shortcut for `aria-keyshortcuts`, such as Meta+B */
  private shortcutAria({ key, shift }: NonNullable<ToolbarAction["shortcut"]>) {
    return `${IS_APPLE ? "Meta" : "Control"}+${shift ? "Shift+" : ""}${key}`;
  }


  render() {
    return (
      <Host
        class={{
          "editor-container": true,
          "editor-focused": this.isFocused,
          "editor-disabled": this.disabled,
          "editor-readonly": this.readonly,
        }}
      >
        <div
          class="editor-toolbar"
          part="toolbar"
          role="toolbar"
          aria-label="Formatting"
          // Pressing a button with the mouse doesn't take focus from the editor,
          // so its selection stays put.
          onMouseDown={(ev) => ev.preventDefault()}
        >
          {this.toolbarGroups.map((group) => (
            <orb-button-group aria-label={group.label}>
              {group.actions.map((action) => {
                const pressed = action.toggle ? !!this.pressed[action.command] : undefined;
                return (
                  <orb-button
                    id={`action-${action.command}`}
                    fill="outline"
                    size="sm"
                    class={{ pressed: !!pressed }}
                    disabled={this.disabled || this.readonly}
                    aria-label={action.label}
                    aria-pressed={pressed === undefined ? undefined : String(pressed)}
                    aria-keyshortcuts={action.shortcut && this.shortcutAria(action.shortcut)}
                    onClick={() => this.executeCommand(action.command)}
                  >
                    {action.icon()}
                  </orb-button>
                );
              })}
            </orb-button-group>
          ))}
        </div>
        {this.toolbarGroups.flatMap((group) =>
          group.actions.map((action) => (
            <orb-tooltip for={`action-${action.command}`} type="label" placement="top">
              {action.label}
              {/* Drawn by CSS with empty alt text, so it isn't part of the button's
                  name. Screen readers get it from aria-keyshortcuts instead. */}
              {action.shortcut && <kbd data-shortcut={this.shortcutText(action.shortcut)} />}
            </orb-tooltip>
          )),
        )}

        <div class="editor-content-wrapper">
          <div
            tabindex={0}
            ref={(el) => (this.editorRef = el)}
            class="editor-content"
            contenteditable={!this.disabled && !this.readonly}
            onInput={this.handleInput}
            onKeyDown={this.handleKeyDown}
            onPaste={this.handlePaste}
            onFocus={this.handleFocus}
            onBlur={this.handleBlur}
            role="textbox"
            aria-multiline="true"
            aria-label="Rich text editor"
            aria-placeholder={this.placeholder}
            data-placeholder={this.placeholder}
            style={{
              minHeight: this.minHeight,
              maxHeight: this.maxHeight,
            }}
          ></div>
        </div>

        {this.showWordCount && (
          <div class="editor-footer">
            <span class="word-count">
              Words: {this.wordCount} | Characters: {this.characterCount}
            </span>
          </div>
        )}

        <input
          ref={(el) => (this.fileInputRef = el)}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={this.handleImageUpload.bind(this)}
        />
      </Host>
    );
  }
}
