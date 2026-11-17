import {
  AlignCenterIcon,
  AlignJustifyIcon,
  AlignLeftIcon,
  AlignRightIcon,
  BackgroundIcon,
  BoldIcon,
  ClearFormattingIcon,
  BlockTypeIcon,
  CodeIcon,
  CodeLanguageIcon,
  ColorIcon,
  EmojiIcon,
  FontFamilyIcon,
  FontSizeIcon,
  ImageIcon,
  IndentIcon,
  ItalicIcon,
  LineHeightIcon,
  LinkIcon,
  ListStyleIcon,
  OrderedListIcon,
  OutdentIcon,
  QuoteIcon,
  RedoIcon,
  SeparatorIcon,
  SpecialCharacterIcon,
  StrikethroughIcon,
  TaskListIcon,
  UnderlineIcon,
  UndoIcon,
  UnorderedListIcon,
} from "../icons";
import {
  BlockType,
  blockType,
  changeIndent,
  closestCodeBlock,
  inQuote,
  insertSeparator,
  setBlockStyle,
  setBlockType,
  setQuote,
  styleOf,
  wrapLooseText,
} from "./blocks";
import { languageOf } from "./code";
import type { EditorHost } from "./host";
import type { InlineStyleProp } from "./schema";
import { clearFormatting, insertFormattedText, inlineStyleValue, isMarkActive, MarkName, setInlineStyle, toggleMark } from "./inline";
import {
  indentItems,
  inTaskList,
  listItems,
  listStyleOf,
  listType,
  ListType,
  outdentItems,
  setListStyle,
  toggleList,
  toggleTaskAt,
  toggleTaskList,
} from "./lists";
import { normalizeCodeBlock } from "./normalize";

export interface CommandContext {
  host: EditorHost;
  root: HTMLElement;
  range: Range;
  /** The chosen option, for select controls */
  value?: string;
}

export interface Shortcut {
  /** A letter, a digit, or a key code such as "BracketRight" or "Enter", always with Ctrl or ⌘ */
  key: string;
  shift?: boolean;
  alt?: boolean;
}

export interface Option {
  value: string;
  label: string;
}

export interface Command {
  id: string;
  label: string;
  icon?: (props?: any) => any;
  /** A button, a toggle that shows a pressed state, a select that shows its current option, or a color control that shows its current color */
  control?: "button" | "toggle" | "select" | "color";
  shortcuts?: Shortcut[];
  /** Options for select controls */
  options?: (host: EditorHost) => Option[];
  /** Pressed state for toggles, or the current value of selects. Null when the selection mixes values. */
  state?: (ctx: CommandContext) => boolean | string | null;
  /** Whether the command is listed at all right now, such as a code language picker outside code */
  available?: (ctx: CommandContext) => boolean;
  /** Doesn't apply inside a code block, such as bold or a list */
  noCode?: boolean;
  /** The `inputType` of the `input` event the command fires. Defaults to insertReplacementText. */
  inputType?: string;
  /** Changes content and returns the range to select. Returns null when nothing changed, such as for a command that opens UI. */
  run: (ctx: CommandContext) => Range | null;
}

export const IS_APPLE = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent);

export const COMMANDS = new Map<string, Command>();
export const define = (command: Command) => COMMANDS.set(command.id, command);

/**
 * The toolbar's controls, in order. `|` separates groups. Commands not listed
 * are still available from keyboard shortcuts.
 */
export const DEFAULT_TOOLBAR =
  "undo redo | blockType | quote code | bold italic underline strike | fontFamily fontSize color background | " +
  "bulletList orderedList taskList | outdent indent listStyle | " +
  "justifyLeft justifyCenter justifyRight justifyFull lineHeight | " +
  "link media separator specialCharacter emoji | clearFormatting codeLanguage";

/** Each group of command ids in a toolbar spec. Unknown ids are dropped. */
export function parseToolbar(spec: string): string[][] {
  return spec
    .split("|")
    .map((group) => group.trim().split(/\s+/).filter((id) => COMMANDS.has(id)))
    .filter((group) => group.length);
}

/** Whether a key event is a shortcut. Digits and punctuation match on the key's code, since Alt or Shift changes the key. */
export function matches(ev: KeyboardEvent, shortcut: Shortcut) {
  const mod = IS_APPLE ? ev.metaKey && !ev.ctrlKey : ev.ctrlKey && !ev.metaKey;
  if (!mod || ev.shiftKey !== !!shortcut.shift || ev.altKey !== !!shortcut.alt) return false;
  if (/^[a-z]$/i.test(shortcut.key) && !shortcut.alt) return ev.key.toLowerCase() === shortcut.key.toLowerCase();
  return ev.code === (/^\d$/.test(shortcut.key) ? `Digit${shortcut.key}` : /^[a-z]$/i.test(shortcut.key) ? `Key${shortcut.key.toUpperCase()}` : shortcut.key);
}

/** The toggle command for a native input type, such as formatBold from iOS's text menu */
export function commandForInput(inputType: string): Command | undefined {
  return [...COMMANDS.values()].find((c) => c.inputType === inputType && c.control === "toggle");
}

const BLOCK_OPTIONS: Option[] = [
  { value: "p", label: "Paragraph" },
  { value: "h1", label: "Heading 1" },
  { value: "h2", label: "Heading 2" },
  { value: "h3", label: "Heading 3" },
  { value: "h4", label: "Heading 4" },
  { value: "h5", label: "Heading 5" },
  { value: "h6", label: "Heading 6" },
];

const LINE_HEIGHT_OPTIONS: Option[] = [
  { value: "", label: "Default" },
  { value: "1", label: "1" },
  { value: "1.15", label: "1.15" },
  { value: "1.5", label: "1.5" },
  { value: "2", label: "2" },
];

const LIST_STYLE_OPTIONS: Option[] = [
  { value: "", label: "Default" },
  { value: "disc", label: "Disc" },
  { value: "circle", label: "Circle" },
  { value: "square", label: "Square" },
  { value: "decimal", label: "1, 2, 3" },
  { value: "lower-alpha", label: "a, b, c" },
  { value: "upper-alpha", label: "A, B, C" },
  { value: "lower-roman", label: "i, ii, iii" },
  { value: "upper-roman", label: "I, II, III" },
];

/** Whether the selection touches a list item. Other blocks indent by margin instead. */
const inList = (root: HTMLElement, range: Range) => listItems(root, range).some((item) => item.tagName === "LI");

/** A mark toggle. With nothing selected, it sets the format for the text typed next. */
function markCommand(id: string, label: string, icon: any, name: MarkName, inputType: string | undefined, shortcut?: Shortcut) {
  define({
    id,
    label,
    icon,
    control: "toggle",
    inputType,
    noCode: true,
    shortcuts: shortcut ? [shortcut] : undefined,
    state: ({ host, root, range }) => host.pending.get(name) ?? isMarkActive(root, range, name),
    run: ({ host, root, range }) => {
      if (range.collapsed) {
        const current = host.pending.get(name) ?? isMarkActive(root, range, name);
        host.pending.set(name, !current, range);
        host.update();
        return null;
      }
      return toggleMark(root, range, name);
    },
  });
}

/** A block type shortcut. Pressing it on a block of that type turns the block back into a paragraph. */
function headingShortcut(id: string, label: string, tag: BlockType, digit: string) {
  define({
    id,
    label,
    shortcuts: [{ key: digit, alt: true }],
    run: ({ root, range }) => {
      const next = blockType(root, range) === tag ? "p" : tag;
      return setBlockType(root, wrapLooseText(root, range), next);
    },
  });
}

/** A list toggle. Lists don't apply inside a code block. */
function listCommand(id: string, label: string, icon: any, type: ListType, inputType: string, digit: string) {
  define({
    id,
    label,
    icon,
    control: "toggle",
    inputType,
    noCode: true,
    shortcuts: [{ key: digit, shift: true }],
    state: ({ root, range }) => listType(root, range) === type,
    run: ({ root, range }) => toggleList(root, wrapLooseText(root, range), type),
  });
}

function alignCommand(id: string, label: string, icon: any, value: "left" | "center" | "right" | "justify", inputType: string, key: string) {
  define({
    id,
    label,
    icon,
    control: "toggle",
    inputType,
    shortcuts: [{ key, shift: true }],
    state: ({ root, range }) => styleOf(root, range, "text-align") === value || (value === "left" && !styleOf(root, range, "text-align")),
    run: ({ root, range }) => setBlockStyle(root, wrapLooseText(root, range), "text-align", value === "left" ? null : value),
  });
}

/** The value a style control shows: the format pending for the next text, or the style of the selection */
function styleState(host: EditorHost, root: HTMLElement, range: Range, prop: InlineStyleProp): string | null {
  const pending = host.pending.get(`style:${prop}`);
  if (pending === undefined) return inlineStyleValue(root, range, prop);
  return typeof pending === "string" ? pending : "";
}

/** Sets a style on the selection, or on the text typed next when nothing is selected. Null removes it. */
function applyStyle(host: EditorHost, root: HTMLElement, range: Range, prop: InlineStyleProp, value: string | null): Range | null {
  if (range.collapsed) {
    host.pending.set(`style:${prop}`, value, range);
    host.update();
    return null;
  }
  return setInlineStyle(root, range, prop, value);
}

/** A font or size select. Its "" option removes the style. */
function styleSelect(id: string, label: string, icon: any, prop: InlineStyleProp, options: (host: EditorHost) => Option[]) {
  define({
    id,
    label,
    icon,
    control: "select",
    noCode: true,
    options,
    state: ({ host, root, range }) => styleState(host, root, range, prop),
    run: ({ host, root, range, value }) => (value === undefined ? null : applyStyle(host, root, range, prop, value || null)),
  });
}

/** A color control. Clicking it opens a picker, which runs the command again with the chosen color. */
function colorCommand(id: string, label: string, icon: any, prop: InlineStyleProp) {
  define({
    id,
    label,
    icon,
    control: "color",
    noCode: true,
    state: ({ host, root, range }) => styleState(host, root, range, prop),
    run: ({ host, root, range, value }) => {
      if (value === undefined) {
        host.openPicker(id, range);
        return null;
      }
      return applyStyle(host, root, range, prop, value || null);
    },
  });
}

/** A picker that inserts text, such as a special character. The text takes the formats set for typing. */
function insertCommand(id: string, label: string, icon: any) {
  define({
    id,
    label,
    icon,
    inputType: "insertText",
    run: ({ host, root, range, value }) => {
      if (value === undefined) {
        host.openPicker(id, range);
        return null;
      }
      const formats = closestCodeBlock(root, range) ? new Map() : new Map(host.pending.formats());
      host.pending.clear();
      return insertFormattedText(root, wrapLooseText(root, range), value, formats);
    },
  });
}

styleSelect("fontFamily", "Font", FontFamilyIcon, "font-family", (host) => [
  { value: "", label: "Default" },
  ...host.fonts.map((font) => ({ value: font.value, label: font.label })),
]);
styleSelect("fontSize", "Font size", FontSizeIcon, "font-size", (host) => [
  { value: "", label: "Default" },
  ...host.fontSizeList.map((size) => ({ value: `${size}pt`, label: size })),
]);
colorCommand("color", "Text color", ColorIcon, "color");
colorCommand("background", "Background color", BackgroundIcon, "background-color");
insertCommand("specialCharacter", "Special characters", SpecialCharacterIcon);
insertCommand("emoji", "Emoji", EmojiIcon);

define({
  id: "undo",
  label: "Undo",
  icon: UndoIcon,
  shortcuts: [{ key: "z" }],
  run: ({ host }) => {
    host.undo();
    return null;
  },
});

define({
  id: "redo",
  label: "Redo",
  icon: RedoIcon,
  shortcuts: [{ key: "z", shift: true }, { key: "y" }],
  run: ({ host }) => {
    host.redo();
    return null;
  },
});

markCommand("bold", "Bold", BoldIcon, "bold", "formatBold", { key: "b" });
markCommand("italic", "Italic", ItalicIcon, "italic", "formatItalic", { key: "i" });
markCommand("underline", "Underline", UnderlineIcon, "underline", "formatUnderline", { key: "u" });
markCommand("strike", "Strikethrough", StrikethroughIcon, "strike", "formatStrikeThrough", { key: "x", shift: true });


define({
  id: "clearFormatting",
  label: "Clear formatting",
  icon: ClearFormattingIcon,
  inputType: "formatRemove",
  noCode: true,
  shortcuts: [{ key: "Backslash" }],
  run: ({ root, range }) => clearFormatting(root, range),
});

define({
  id: "link",
  label: "Insert link",
  icon: LinkIcon,
  noCode: true,
  shortcuts: [{ key: "k" }],
  run: ({ host, range }) => {
    host.openLink(range);
    return null;
  },
});

define({
  id: "media",
  label: "Insert image",
  icon: ImageIcon,
  noCode: true,
  run: ({ host, range }) => {
    host.pickImage(range);
    return null;
  },
});

define({
  id: "blockType",
  label: "Text style",
  icon: BlockTypeIcon,
  control: "select",
  options: () => BLOCK_OPTIONS,
  state: ({ root, range }) => blockType(root, range),
  run: ({ root, range, value }) => {
    if (!value) return null;
    return setBlockType(root, wrapLooseText(root, range), value as BlockType);
  },
});

define({
  id: "code",
  label: "Code block",
  icon: CodeIcon,
  control: "toggle",
  state: ({ root, range }) => blockType(root, range) === "pre",
  run: ({ root, range }) => {
    const next = blockType(root, range) === "pre" ? "p" : "pre";
    return setBlockType(root, wrapLooseText(root, range), next);
  },
});

define({
  id: "quote",
  label: "Quote",
  icon: QuoteIcon,
  control: "toggle",
  noCode: true,
  state: ({ root, range }) => inQuote(root, range),
  run: ({ root, range }) => {
    const on = !inQuote(root, range);
    return setQuote(root, wrapLooseText(root, range), on);
  },
});

headingShortcut("paragraph", "Paragraph", "p", "0");
headingShortcut("heading1", "Heading 1", "h1", "1");
headingShortcut("heading2", "Heading 2", "h2", "2");
headingShortcut("heading3", "Heading 3", "h3", "3");
headingShortcut("heading4", "Heading 4", "h4", "4");
headingShortcut("heading5", "Heading 5", "h5", "5");
headingShortcut("heading6", "Heading 6", "h6", "6");

listCommand("bulletList", "Bulleted list", UnorderedListIcon, "ul", "insertUnorderedList", "8");
listCommand("orderedList", "Numbered list", OrderedListIcon, "ol", "insertOrderedList", "7");

define({
  id: "taskList",
  label: "Task list",
  icon: TaskListIcon,
  control: "toggle",
  noCode: true,
  shortcuts: [{ key: "9", shift: true }],
  state: ({ root, range }) => inTaskList(root, range),
  run: ({ root, range }) => toggleTaskList(root, wrapLooseText(root, range)),
});

define({
  id: "toggleTask",
  label: "Check or uncheck task",
  shortcuts: [{ key: "Enter", alt: true }],
  run: ({ root, range }) => toggleTaskAt(root, range),
});

define({
  id: "indent",
  label: "Indent",
  icon: IndentIcon,
  inputType: "formatIndent",
  shortcuts: [{ key: "BracketRight" }],
  run: ({ root, range }) =>
    inList(root, range) ? indentItems(root, range) : changeIndent(root, wrapLooseText(root, range), 1),
});

define({
  id: "outdent",
  label: "Outdent",
  icon: OutdentIcon,
  inputType: "formatOutdent",
  shortcuts: [{ key: "BracketLeft" }],
  run: ({ root, range }) =>
    inList(root, range) ? outdentItems(root, range) : changeIndent(root, wrapLooseText(root, range), -1),
});

define({
  id: "listStyle",
  label: "List style",
  icon: ListStyleIcon,
  control: "select",
  options: () => LIST_STYLE_OPTIONS,
  available: ({ root, range }) => listType(root, range) !== null,
  state: ({ root, range }) => listStyleOf(root, range),
  run: ({ root, range, value }) => (value === undefined ? null : setListStyle(root, range, value || null)),
});

alignCommand("justifyLeft", "Align left", AlignLeftIcon, "left", "formatJustifyLeft", "l");
alignCommand("justifyCenter", "Align center", AlignCenterIcon, "center", "formatJustifyCenter", "e");
alignCommand("justifyRight", "Align right", AlignRightIcon, "right", "formatJustifyRight", "r");
alignCommand("justifyFull", "Justify", AlignJustifyIcon, "justify", "formatJustifyFull", "j");

define({
  id: "lineHeight",
  label: "Line height",
  icon: LineHeightIcon,
  control: "select",
  options: () => LINE_HEIGHT_OPTIONS,
  state: ({ root, range }) => styleOf(root, range, "line-height"),
  run: ({ root, range, value }) => (value === undefined ? null : setBlockStyle(root, wrapLooseText(root, range), "line-height", value || null)),
});

define({
  id: "separator",
  label: "Horizontal line",
  icon: SeparatorIcon,
  inputType: "insertHorizontalRule",
  noCode: true,
  run: ({ root, range }) => insertSeparator(root, range),
});

define({
  id: "codeLanguage",
  label: "Code language",
  icon: CodeLanguageIcon,
  control: "select",
  options: (host) => host.codeLanguages.map((language) => ({ value: language, label: language })),
  available: ({ root, range }) => !!closestCodeBlock(root, range),
  state: ({ root, range }) => {
    const pre = closestCodeBlock(root, range);
    return pre ? languageOf(pre.querySelector("code") ?? pre) ?? "" : null;
  },
  run: ({ root, range, value }) => {
    const pre = closestCodeBlock(root, range);
    if (!pre || value === undefined) return null;
    normalizeCodeBlock(pre);
    const code = pre.querySelector("code")!;
    if (value) code.className = `language-${value}`;
    else code.removeAttribute("class");
    return range;
  },
});

define({
  id: "shortcutHelp",
  label: "Keyboard shortcuts",
  shortcuts: [{ key: "Slash" }],
  run: ({ host }) => {
    host.showHelp();
    return null;
  },
});
