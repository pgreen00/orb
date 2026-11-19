# `orb-rich-text` implementation plan

The phased plan for growing `orb-rich-text` into a full document editor. It replaces the original feature list (`features.md`); the table below maps each listed feature to the section that covers it.

## Feature map

| Feature (from the original list) | Section |
|---|---|
| Better keyboard features | 1.1 |
| Block quotes | 1.3 |
| Separators | 1.4 |
| Code | 1.5 |
| Indent level | 1.6 |
| Line height | 1.7 |
| Advanced list functionality | 1.8 |
| Font color, family, size, background | 2.1 |
| Auto formatting GitHub-flavored Markdown | 2.2 |
| Special characters and emojis | 2.3 |
| Tables | 3.1 |
| Media | 3.2 |
| Document outline / TOC | 3.3 |
| Inline commands / actions / tags | 4.1 |
| Parameters / placeholders | 4.2 |
| Templates | 4.3 |
| Full screen with menubar | 5.1 |
| Interface modes | 5.2 |
| Pages, page breaks, margins, header, footer | 5.3 (print only) |
| Mainstream import & export options | 5.4 |
| Change tracking → versions and saving | 6.1–6.3 |
| Comments and other collab features | 7.1–7.2 |
| Writing assistants | Shelved. Only the `spellcheck` prop (0.5) is in scope. |

Not on the original list but included: making the editor a form field (0.9).

## Decisions

| Decision | Choice |
|---|---|
| Editing engine | Keep the hand-rolled engine (`editing.ts`), where the live HTML is the document. No ProseMirror or similar. |
| Storage format | Canonical HTML is the lossless format. Every other format (Markdown, DOCX, text, JSON) is import/export only and may lose information. JSON is derived, never the source of truth. |
| Visual formatting | Inline styles for anything visual (alignment, indent, line height, colors, fonts), so saved HTML looks right outside the editor. `data-*` attributes only for meaning the editor alone uses (mentions, placeholders, comments, suggestions, page settings). |
| Block-type controls | A "Text style" select (Paragraph, Heading 1–6). Quote and Code block are their own toolbar toggles, so the select only holds text styles. |
| `orb-popover` / `orb-menu` | May be modified as needed (0.7). |
| Task lists | `<input type="checkbox">` inside the list item. |
| Outline and comments sidebar | Built into the editor, behind props. |
| New dependencies | `prismjs`, `emojibase-data`, `mammoth`, `docx`, `diff` (jsdiff). Dev dependencies, loaded on first use with `import()`, like `markdown-it` in `orb-markdown`. |
| Pages | Print only. No on-screen page layout. Page size, margins, header and footer apply when printing (`@page`) and in DOCX export. |
| Full screen | Popover API (`popover="manual"` on a wrapper inside the shadow root). No Fullscreen API, no CSS fallback. |
| Real-time collaboration | Out of scope. "Collab" means comments and suggested changes. |
| Server-side features | None. The component exposes props, events and function hooks; storage and uploads are the app's job. |
| Undo history across refresh | Opt-in. Requires `history-key` and `persist-history`. |
| Table cells | Hold text directly, like list items (line breaks with `<br>`). No lists or several paragraphs in a cell in v1. |
| Images and video | Always block-level `<figure>`, with an optional `<figcaption>`. |
| Header and footer | Plain text in left, center and right positions, with `{page}`, `{pages}`, `{title}` and `{date}` placeholders. |
| Modes | `edit`, `suggest`, `comment`, `view`, `preview`. |
| Lossy export (Markdown, text) | Suggestions are left out by default (`suggestions: "reject"`). HTML keeps everything. |
| Pasted fonts | Fonts not in the `fonts` prop are dropped when pasting. |
| Inline code shortcut | None. The backtick auto-format rule (2.2) covers it. There's no toolbar button for inline code. |
| Form field | Yes, in Phase 0 (0.9). |

## Conventions

- **Stencil + shadow DOM**, `orb-` tags and `orbSomething` events with typed details. Every prop, event, method, `@slot` and `@part` gets a JSDoc comment, because those feed `docs-json` and the custom-elements manifest. CSS custom properties are documented at the top of the `.css` file.
- **Async hooks are function props**, following `init`/`destroy` on `orb-overlay` and `orb-popover`: `upload`, `loadVersion`, `save`, `mentions`, `tags`.
- **Interception uses cancelable events**, following `orbHideRequest` and `orbSearch`.
- **Arrays and objects are set as JS properties**, like `files` on `orb-file-input`. Simple settings stay usable as HTML attributes.
- **Build the UI from existing Orb components**: `orb-button`/`-group`, `orb-tooltip`, `orb-menu`/`orb-mi`, `orb-popover`, `orb-overlay`, `orb-menubar`, `orb-split-view`/`-panel`, `orb-textbox`, `orb-card`, `orb-relative-time`. Positioning uses `@floating-ui/dom`; dragging and resizing use `interactjs`.
- **Icons specific to the editor** stay in `rich-text/icons.tsx`, in Lucide style.
- **Custom states** go through `ElementInternals` and `toggleState` (`:state(dirty)`, `:state(user-invalid)`).
- **Tests** are Playwright specs using `mount()` from `tests/utils.ts`, run in Chromium, Firefox and WebKit.
- **Comments** follow the codebase's style: short, plain sentences that explain *why*.

## Phases at a glance

| Phase | Contents | Estimate (1 developer) |
|---|---|---|
| 0. Groundwork | Module split, schema, cleanup step, command list, toolbar, `spellcheck`, undo rework, non-editable pieces and caret popups, link popover, form field, test helpers | 4.5–6.5w |
| 1. Input and blocks | Keyboard handling, text style select and h1–h6, quotes, separators, code, indent, line height, lists and task lists | 4–6w |
| 2. Inline styling and typing shortcuts | Fonts and colors, GFM auto-formatting and Markdown paste, special characters and emoji | 2.5–3.5w |
| 3. Structured content | Tables, media, outline and TOC | 5–8w |
| 4. Inline objects | `/` commands, mentions, tags, emoji shortcodes, placeholders, templates | 2.5–3.5w |
| 5. Document chrome and formats | Full screen and menubar, modes, print, page setup, page breaks, import and export | 4–6w |
| 6. Saving and history | Save and unsaved state, versions and compare, undo history across refresh | 2–3.5w |
| 7. Collaboration | Comments, suggested changes | 4–6.5w |

**Total: about 28.5–43.5 weeks (7–10 months).** Each phase ends with its tests and an update to `rich-text.md`, in the same format as `menubar.md`: usage, live demo, manual test steps, keyboard table, accessibility checklist.

---

## Phase 0: Groundwork

### 0.1 Module layout

```
src/components/rich-text/
  rich-text.tsx              component: props, events, methods, layout
  rich-text.css              component chrome (toolbar, panels, sidebar)
  content.css                content styles; also injected into the print iframe
  icons.tsx
  editing/
    host.ts                  the EditorHost interface
    selection.ts             getRange, selectRange, keep/restore, points, caretAnchor
    schema.ts                node definitions (0.2)
    sanitize.ts              parsing, the paste cleanup
    normalize.ts             canonical form (0.3)
    dom.ts                   shared helpers: closestIn, splitAround, wrapEach, hasContent…
    inline.ts                marks, styles, links
    blocks.ts                block types, quotes, separators, block styles, split/join
    lists.ts  tables.ts  media.ts  code.ts  outline.ts
    input.ts                 beforeinput/keydown behaviors (1.1)
    rules.ts                 auto-formatting rules (2.2)
    triggers.ts              / @ # : {{ sessions (4.1)
    annotations.ts           comments and suggestions (Phase 7)
    history.ts               undo (0.6)
    history-store.ts         IndexedDB storage (6.3)
    commands.ts              the command list (0.4)
  ui/
    toolbar.tsx              toolbar controls (JSX function components)
    pickers.tsx              color, emoji, special-character, table-size pickers
    special-characters.ts    curated character list
    sidebar.tsx              comment and suggestion cards
  convert/                   loaded on first use with import()
    markdown.ts  docx.ts  json.ts  diff.ts  print.ts

src/utils/
  form.ts                    browserMessage, exposeFormProps (0.9), shared with orb-mask-input
  files.ts                   isAccepted, moved from orb-file-input (3.2)
  ids.ts                     uid() (6.3)
```

`rich-text.tsx` keeps the Stencil-facing parts. Larger features live in small controller classes that receive an `EditorHost`, so the component doesn't grow into thousands of lines:

```ts
// editing/host.ts
export interface EditorHost {
  readonly root: HTMLElement;          // the contenteditable
  readonly el: HTMLElement;            // <orb-rich-text>
  readonly editable: boolean;
  /** The selection to edit: the live one, the last one, or the end */
  takeRange(): Range;
  /** Runs an edit as one undo step and selects its result. Returns false if nothing changed. */
  apply(edit: (range: Range) => Range | null, options?: { record?: boolean; inputType?: string }): boolean;
  /** Re-renders the component, for controllers that keep their own state */
  update(): void;                       // forceUpdate(this) from @stencil/core
}
```

`apply` is today's `executeCommand` body made reusable:

```ts
apply(edit: (range: Range) => Range | null, { record = true, inputType = "insertReplacementText" } = {}) {
  if (!this.editable) return false;
  const range = this.takeRange();
  if (this.el.shadowRoot?.activeElement !== this.editorRef) {
    this.editorRef.focus({ preventScroll: true });
    selectRange(range);
  }
  this.saveTyping();
  const result = edit(range);
  if (!result) return false;
  const fixed = normalizeAround(this.editorRef, result, this.schema);
  selectRange(fixed, { redraw: true });
  // Again after the next layout, in case Safari measured the caret before
  // the change was laid out.
  requestAnimationFrame(() => {
    const current = getRange(this.editorRef);
    if (current) selectRange(current, { redraw: true });
  });
  this.afterChange(record);
  this.dispatchInput(inputType);       // 0.9
  return true;
}
```

### 0.2 Schema (`editing/schema.ts`)

One table replaces `INLINE_TAGS`, `FORMATTING_TAGS`, `BLOCK_TAGS`, `TEXT_BLOCKS` and `ALLOWED_TAGS`. This also fixes `HR` and `TABLE` being in `BLOCK_TAGS` but dropped on paste.

```ts
export type StyleProp =
  | "text-align" | "margin-inline-start" | "line-height"
  | "color" | "background-color" | "font-family" | "font-size"
  | "list-style-type" | "width";

export type NodeKind =
  | "mark"         // strong, em, u, s, code, a, sub, sup
  | "style"        // span with inline styles
  | "annotation"   // comment anchors, suggestions. Survive Clear formatting.
  | "text-block"   // p, h1–h6, li, td, th, pre, figcaption
  | "container"    // ul, ol, blockquote, table, thead, tbody, tr
  | "atom-inline"  // br, mentions, tags, params, task checkboxes
  | "atom-block";  // hr, page break, figure, TOC, page settings

export interface NodeSpec {
  name: string;
  tag: string;
  kind: NodeKind;
  /** Tells apart specs that share a tag, like a suggestion <ins> and a plain one */
  match?: (el: Element) => boolean;
  /** Tags converted to this one, such as B to STRONG */
  aliases?: string[];
  /** Attributes kept, each with a check that returns the cleaned value or null to drop it */
  attrs?: Record<string, (value: string, options: SchemaOptions) => string | null>;
  styles?: StyleProp[];
  /** Tags it may be directly inside. Normalize fixes anything else. */
  parents?: string[];
}

export interface SchemaOptions {
  fonts: FontOption[];
  embedProviders: EmbedProvider[];
}

const BLOCK_STYLES: StyleProp[] = ["text-align", "margin-inline-start", "line-height"];
const has = (attr: string) => (el: Element) => el.hasAttribute(attr);
const not = (test: (el: Element) => boolean) => (el: Element) => !test(el);

export const NODES: NodeSpec[] = [
  { name: "paragraph", tag: "P", kind: "text-block", aliases: ["DIV"], styles: BLOCK_STYLES },
  ...[1, 2, 3, 4, 5, 6].map((n): NodeSpec => ({
    name: `heading${n}`, tag: `H${n}`, kind: "text-block", styles: BLOCK_STYLES, attrs: { id: slugId },
  })),
  { name: "bold", tag: "STRONG", kind: "mark", aliases: ["B"] },
  { name: "italic", tag: "EM", kind: "mark", aliases: ["I"] },
  { name: "underline", tag: "U", kind: "mark", aliases: ["INS"], match: not(has("data-suggestion")) },
  { name: "strike", tag: "S", kind: "mark", aliases: ["STRIKE", "DEL"], match: not(has("data-suggestion")) },
  { name: "insertion", tag: "INS", kind: "annotation", match: has("data-suggestion"), attrs: SUGGESTION_ATTRS },
  { name: "deletion", tag: "DEL", kind: "annotation", match: has("data-suggestion"), attrs: SUGGESTION_ATTRS },
  { name: "link", tag: "A", kind: "mark", attrs: { href: safeHref } },
  { name: "comment", tag: "SPAN", kind: "annotation", match: has("data-comment"), attrs: { "data-comment": idList } },
  { name: "mention", tag: "SPAN", kind: "atom-inline", match: has("data-mention"), attrs: { "data-mention": id } },
  { name: "style", tag: "SPAN", kind: "style", styles: ["color", "background-color", "font-family", "font-size"] },
  {
    name: "checkbox", tag: "INPUT", kind: "atom-inline", parents: ["LI"],
    match: (el) => el.getAttribute("type") === "checkbox",
    attrs: { type: () => "checkbox", checked: () => "" },
  },
  { name: "separator", tag: "HR", kind: "atom-block", match: not(has("data-page-break")) },
  { name: "pageBreak", tag: "HR", kind: "atom-block", match: has("data-page-break"), attrs: { "data-page-break": () => "" } },
  // …lists, quotes, code, tables, figures, TOC, page settings (added in their phases)
];

/** The spec for an element, or undefined if it isn't allowed */
export function specOf(el: Element): NodeSpec | undefined { /* first tag/alias + match */ }

const tagsOf = (kind: NodeKind) => NODES.filter((n) => n.kind === kind).map((n) => n.tag);
export const TEXT_BLOCK_TAGS = tagsOf("text-block");
export const TEXT_BLOCK_SELECTOR = TEXT_BLOCK_TAGS.map((t) => t.toLowerCase()).join(", ");
```

Each style property has a check on its value:

```ts
const color = (v: string) => (CSS.supports("color", v) && !/var\(|url\(/i.test(v) ? v : null);

export const STYLE_CHECKS: Record<StyleProp, (value: string, o: SchemaOptions) => string | null> = {
  "text-align": (v) => (["center", "right", "justify"].includes(v) ? v : null),
  "margin-inline-start": indentStep,                  // rounds to 2em steps, 1–8 levels
  "line-height": (v) => (/^\d(\.\d+)?$/.test(v) && +v >= 1 && +v <= 3 ? v : null),
  color,
  "background-color": color,
  "font-family": (v, o) => o.fonts.find((f) => sameFamily(f.value, v))?.value ?? null,
  "font-size": toPoints,                              // px → pt (×0.75), clamped to 6–96pt
  "list-style-type": (v) => (LIST_STYLES.includes(v) ? v : null),
  width: (v) => (/^\d{1,3}(\.\d+)?%$/.test(v) ? v : null),
};
```

### 0.3 Sanitize and normalize

**`sanitize.ts`** keeps today's inert `DOMParser` approach and changes these things:

- **Paste cleanup** before checking against the schema:
  - unwrap Google Docs' `b[id^="docs-internal-guid"]` wrapper, which today turns whole pastes bold;
  - remove Word's `o:p` elements and `mso-*` styles;
  - rebuild Word's paragraph-based lists into real lists (5.4).
- **Convert style-based formatting to tags**: `font-weight >= 600` becomes `strong`, `italic` becomes `em`, `underline` becomes `u`, `line-through` becomes `s`. Today Google Docs bold is lost because all styles are stripped.
- **Check every element against the schema**: keep allowed attributes and styles, rename aliases, unwrap anything unknown.
- **Collapse whitespace in text** outside `pre` (`\s+` becomes a single space), since the editor will use `white-space: pre-wrap`.
- **`sanitize(html, options, { paste })`**: comment anchors and suggestion markers are removed when pasting.
- **`value`, `setContent()`, imports and templates go through it as well.** Today `value` and `setContent` insert unsanitized HTML, which is an XSS risk. The `value` watcher is added in 0.9.

**`normalize.ts`** brings content to its one canonical form:

```ts
export interface NormalizeOptions extends SchemaOptions {
  /** Output only: canonical nesting of formats, and runtime-only attributes removed */
  output?: boolean;
}

export function normalize(root: ParentNode, options: NormalizeOptions) {
  renameAliases(root);        // B→STRONG, DIV→P, plain INS→U, plain DEL→S
  fixStructure(root);         // loose text → P, LI outside a list → UL, blocks out of P, cells text-only
  ensureEditableAround(root); // a P after a trailing hr, table or figure, so the caret can get there
  fillEmptyBlocks(root);      // an empty block holds a <br>
  dropEmptyInline(root);
  mergeAdjacentInline(root);  // <strong>a</strong><strong>b</strong> → <strong>ab</strong>
  if (options.output) {
    root.querySelectorAll<HTMLElement>(TEXT_BLOCK_SELECTOR).forEach(rebuildInline);
    stripRuntime(root);       // contenteditable, tabindex, data-selected, data-uploading, trailing hack <br>s
  }
}
```

**`rebuildInline`** is what makes output canonical. It flattens a block into pieces of text, each with its set of formats, then rebuilds them in a fixed nesting order. `<em><strong>x</strong></em>` and `<strong><em>x</em></strong>` therefore produce the same output.

```ts
/** Outermost first */
const MARK_ORDER = ["comment", "insertion", "deletion", "link", "bold", "italic", "underline", "strike", "code", "sub", "sup", "style"];

interface Segment { node: Node; marks: Element[] }   // text, <br>, or a non-editable piece, plus shallow copies of its formats

function rebuildInline(block: HTMLElement) {
  const segments = flatten(block);                    // walk, pushing shallow clones of mark elements
  block.replaceChildren();
  const open: Element[] = [];
  for (const { node, marks } of segments) {
    const wanted = canonicalMarks(marks);             // sorted by MARK_ORDER; style spans merged into one
    let keep = 0;
    while (keep < open.length && keep < wanted.length && open[keep].cloneNode(false).isEqualNode(wanted[keep])) keep++;
    open.length = keep;
    let parent: Node = open[keep - 1] ?? block;
    for (const mark of wanted.slice(keep)) {
      const el = mark.cloneNode(false) as Element;
      parent.appendChild(el);
      open.push(el);
      parent = el;
    }
    appendMergingText(parent, node);
  }
}
```

**When cleanup runs:**

- **On load, `setContent`, paste and import:** the full `normalize` on the content.
- **After each command:** `normalizeAround(root, range)` cleans only the blocks the command touched, and keeps the selection in place with `keep`/`restore`.
- **For output:** `getContent`, events, the form value, saving, versions and history hashes run `normalize(clone, { output: true })` on a copy, cached until the next change. Cleanup never runs on the live content during typing, so the caret never jumps.

**`orbEditorChange` computes its HTML only when read.** The cleanup of the copy then runs only for listeners that actually use it:

```ts
private emitChange() {
  const read = () => this.output();
  this.orbEditorChange.emit({
    get html() { return read().html; },
    get text() { return read().text; },
    get isEmpty() { return !read().text.trim(); },
  });
}
```

**CSS:** add `white-space: pre-wrap` to `.editor-content`. Browsers then insert normal spaces instead of `&nbsp;`, which keeps the output canonical.

### 0.4 Command list and toolbar

```ts
// editing/commands.ts
export interface CommandContext {
  host: EditorHost;
  root: HTMLElement;
  range: Range;
}

export interface Shortcut {
  /** A letter, a digit, or a code such as "BracketRight", always with Ctrl or ⌘ */
  key: string;
  shift?: boolean;
  alt?: boolean;
}

export interface Command {
  id: string;
  label: string;
  icon?: (props?: any) => any;
  shortcuts?: Shortcut[];
  control?: "button" | "toggle" | "select" | "color" | "picker";
  /** Options for select controls */
  options?: (host: EditorHost) => { value: string; label: string; icon?: (p?: any) => any }[];
  /** Pressed state, or the current value. "mixed" when the selection has several. */
  state?: (ctx: CommandContext) => boolean | string | null;
  enabled?: (ctx: CommandContext) => boolean;

  /** The `inputType` of the `input` event the command fires (0.9). Defaults to insertReplacementText. */
  inputType?: string;
  /** Changes content and returns the range to select. UI-only commands return nothing. */
  run: (ctx: CommandContext, value?: string) => Range | null | void;
}

export const COMMANDS = new Map<string, Command>();
export const define = (command: Command) => COMMANDS.set(command.id, command);

define({
  id: "bold", label: "Bold", icon: BoldIcon, control: "toggle",
  shortcuts: [{ key: "b" }],
  inputType: "formatBold",
  state: ({ root, range }) => isMarkActive(root, range, "strong"),
  run: ({ root, range }) => toggleMark(root, range, "strong"),
});
```

This replaces `toolbarGroups`, the `*_COMMANDS` maps, the if-chain in `executeCommand`, the `switch` in `handleKeyDown`, and `updatePressed`.

**Matching shortcuts.** Digits, punctuation and anything with Alt match on `event.code`, because Alt or Shift changes `event.key` (⌥1 is `¡` on a Mac). Plain letters match on `event.key`, so they follow the keyboard layout.

```ts
export function matches(ev: KeyboardEvent, s: Shortcut) {
  const mod = IS_APPLE ? ev.metaKey && !ev.ctrlKey : ev.ctrlKey && !ev.metaKey;
  if (!mod || ev.shiftKey !== !!s.shift || ev.altKey !== !!s.alt) return false;
  if (/^[a-z]$/i.test(s.key) && !s.alt) return ev.key.toLowerCase() === s.key.toLowerCase();
  return ev.code === (/^\d$/.test(s.key) ? `Digit${s.key}` : /^[a-z]$/i.test(s.key) ? `Key${s.key.toUpperCase()}` : s.key);
}
```

**Toolbar prop.** It's a string, so it also works as an HTML attribute:

```ts
/**
 * The toolbar's controls, in order. `|` separates groups. Commands not
 * listed are still available from shortcuts, the menubar and the `/` menu.
 */
@Prop() toolbar =
  "undo redo | blockType | quote code | bold italic underline strike | fontFamily fontSize color background | " +
  "bulletList orderedList taskList outdent indent | align lineHeight | link media table separator specialCharacter | clearFormatting";

const parseToolbar = (spec: string) =>
  spec.split("|").map((group) => group.trim().split(/\s+/).filter((id) => COMMANDS.has(id))).filter((g) => g.length);
```

**Toolbar controls (`ui/toolbar.tsx`).** Toggle and action buttons look as they do today. A dropdown is an `orb-button` with `caret`, plus an `orb-menu` in `single` mode:

```tsx
export const SelectControl = ({ command, value, disabled, onChoose }: SelectProps) => [
  <orb-button id={`action-${command.id}`} fill="outline" size="sm" caret disabled={disabled}
    aria-label={command.label} class="select">
    {labelFor(command, value)}
  </orb-button>,
  <orb-menu for={`action-${command.id}`} mode="single" label={command.label}
    onOrbSelect={(ev) => onChoose(command, ev.detail.value)}>
    {command.options!(host).map((option) => (
      <orb-mi value={option.value} checked={option.value === value}>{option.label}</orb-mi>
    ))}
  </orb-menu>,
];
```

**One Tab stop for the toolbar** (`role="toolbar"`), with arrow keys between controls. The approach matches `orb-menubar`. One catch: `orb-button` resets `tabIndex` whenever its `disabled` prop changes, so the editor re-applies the roving tab index in `componentDidRender`.

```ts
private syncToolbarFocus() {
  const items = this.toolbarItems();                 // orb-button hosts, in order
  const current = items.find((i) => i.tabIndex === 0 && !i.disabled) ?? items.find((i) => !i.disabled);
  items.forEach((i) => (i.tabIndex = i === current ? 0 : -1));
}
// keydown on the toolbar: Left/Right (swapped in RTL), Home, End move focus and the Tab stop
```

**Overflow menu.** A `ResizeObserver` on the toolbar measures each group's width, caching it the first time. Groups that don't fit move into a **More** `orb-menu`:

- toggle buttons become `orb-mi type="checkbox"`;
- dropdowns become submenus.

**`updatePressed`** becomes `updateStates()`. It runs `state()` for every command in the toolbar and stores the results in `@State() states: Record<string, boolean | string | null>`, re-rendering only when something changed (as today).

### 0.5 `spellcheck` prop

```ts
/** Underlines misspelled words, using the browser's spell checker */
@Prop() spellcheck = true;
// <div contenteditable … spellcheck={this.spellcheck ? "true" : "false"}>
```

This overrides the built-in `HTMLElement.spellcheck` property. On the first build, check that Stencil doesn't warn about a reserved name. If it does, use `check-spelling`.

### 0.6 Undo history rework (`editing/history.ts`)

**Store only the changes.** Each step saves the changed slice of HTML; the full HTML is kept once. Images aren't copied into every step, because a step only contains its own changed slice.

```ts
interface Change { at: number; removed: string; added: string }
interface Step { change: Change; before: Selected | null; after: Selected | null }

function diff(a: string, b: string): Change {
  let start = 0;
  const max = Math.min(a.length, b.length);
  while (start < max && a.charCodeAt(start) === b.charCodeAt(start)) start++;
  let endA = a.length, endB = b.length;
  while (endA > start && endB > start && a.charCodeAt(endA - 1) === b.charCodeAt(endB - 1)) { endA--; endB--; }
  return { at: start, removed: a.slice(start, endA), added: b.slice(start, endB) };
}
const revert = (html: string, c: Change) => html.slice(0, c.at) + c.removed + html.slice(c.at + c.added.length);
const reapply = (html: string, c: Change) => html.slice(0, c.at) + c.added + html.slice(c.at + c.removed.length);

export class History {
  private html = "";
  private done: Step[] = [];
  private undone: Step[] = [];
  private selected: Selected | null = null;
  /** Called with each new step, for saving history across a refresh */
  onRecord?: (step: Step, html: string) => void;

  constructor(private root: HTMLElement, private limit = 200) {}

  reset() { /* html = root.innerHTML, clear both stacks */ }

  record() {
    const html = this.root.innerHTML;
    const selected = takeSelected(this.root);
    if (html === this.html) { this.selected = selected; return; }
    const step = { change: diff(this.html, html), before: this.selected, after: selected };
    this.done.push(step);
    if (this.done.length > this.limit) this.done.shift();
    this.undone = [];
    this.html = html;
    this.selected = selected;
    this.onRecord?.(step, html);
  }

  undo() {
    const step = this.done.pop();
    if (!step) return false;
    this.html = revert(this.html, step.change);
    this.undone.push(step);
    this.show(step.before);
    return true;
  }

  redo() { /* mirror of undo, using reapply and step.after */ }
}
```

**Saving the selection.** A plain path of child indexes breaks: the live content often has split text nodes (from `splitText`), which come back merged after saving and reloading the HTML. Counting characters (today's approach) fails wherever there's no text, such as empty cells and non-editable pieces. So a point is stored as a path where each **run of adjacent text nodes counts as one child**, plus an offset within that run:

```ts
export interface Point { path: number[]; offset: number }
export interface Selected { anchor: Point; focus: Point }

/** Children with empty text skipped and adjacent text grouped, the way they'll parse back */
function runs(parent: Node): Node[][] {
  const result: Node[][] = [];
  for (const child of Array.from(parent.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE && !(child as Text).length) continue;
    const last = result[result.length - 1];
    if (child.nodeType === Node.TEXT_NODE && last?.[0].nodeType === Node.TEXT_NODE) last.push(child);
    else result.push([child]);
  }
  return result;
}

export function toPoint(root: Node, node: Node, offset: number): Point {
  const path: number[] = [];
  if (node.nodeType === Node.TEXT_NODE) {
    const siblings = runs(node.parentNode!);
    const index = siblings.findIndex((run) => run.includes(node));
    const run = siblings[index] ?? [];
    for (const text of run) { if (text === node) break; offset += (text as Text).length; }
    path.push(index);
    node = node.parentNode!;
  } else {
    const children = Array.from(node.childNodes);
    offset = runs(node).filter((run) => children.indexOf(run[0] as ChildNode) < offset).length;
  }
  for (let n = node; n !== root; n = n.parentNode!) {
    path.unshift(runs(n.parentNode!).findIndex((run) => run[0] === n));
  }
  return { path, offset };
}
// fromPoint walks the same runs back down; a text run resolves to (textNode, offset within it)
```

`utils/composed.ts` `selectionOffsets` stays as it is for other components. The rich-text `History` no longer uses character counts.

### 0.7 Non-editable pieces and caret popups

**Non-editable pieces (`kind: "atom-*"`)** are used by mentions, tags, placeholders, the TOC, figures and task checkboxes:

- **Load:** cleanup adds `contenteditable="false"`; it's removed from output.
- **Caret fixes in `onSelectionChange`:**
  - a caret inside a piece moves after it;
  - a caret before a task checkbox moves after it;
  - an inline piece at the end of a block gets a runtime-only `<br data-orb-trailing>` after it, so Safari can place the caret there. Removed from output.
- **Deleting:** Backspace or Delete next to a piece removes the whole piece (handled in 1.1).
- **Clicking** a piece selects all of it and sets `data-selected` (runtime only) for styling. Delete then removes it.

**`orb-popover` changes.** `show(event)` already opens at a point and moves the popover when called again. For popups that follow the caret, it needs a wider anchor type:

```ts
export type Anchor =
  | Pick<MouseEvent, "clientX" | "clientY">
  | { getBoundingClientRect(): DOMRect; contextElement?: Element };

/**
 * Opens the popover. Pass a pointer event, or anything with
 * `getBoundingClientRect`, such as a Range, to open it there. Calling it
 * again while open moves it.
 */
@Method()
async show(at?: Anchor) {
  this.anchor = !at ? undefined
    : "getBoundingClientRect" in at ? at
    : { getBoundingClientRect: () => new DOMRect(at.clientX, at.clientY) };
  if (!this.open) { this.open = true; return; }
  this.startPositioning();
}

private get referenceEl() {
  return this.anchor ?? this.triggerEl ?? { getBoundingClientRect: () => new DOMRect(0, 0) };
}
```

Two more changes to `orb-popover`:

- **Without `for`, it doesn't log a warning.** While open, it closes on an outside `pointerdown` or on Escape (the same listeners as click mode, registered in `handleOpenChange`).
- **A Range anchor passes `contextElement: editorRef`**, so Floating UI's `autoUpdate` watches the editor's scroll position and the popup follows the caret instead of drifting.

**`orb-menu` changes:**

- **`show(at?: Anchor)`** gets the same wider anchor type.
- **`attachInput(el: HTMLElement | null)`** lets another element drive the menu while keeping focus. It reuses the search field's existing logic (`setActive` and `onSearchKeyDown`):
  - Up and Down move the highlight, Enter chooses, and Escape closes (that already works through the menu's document-level key listener);
  - it sets `el.ariaActiveDescendantElement`, `ariaExpanded` and `ariaControlsElements = [this.el]`;
  - while an input is attached, the items use listbox roles (`orb-mi` already has a `listbox` prop), as the ARIA combobox pattern requires;
  - `show()` never moves focus while an input is attached. Today it moves focus into the menu when the user is on the keyboard.

**Caret position helper.** A collapsed range in an empty block can report an all-zero rectangle, so it falls back to the block's position:

```ts
export function caretAnchor(range: Range, root: HTMLElement) {
  return {
    contextElement: root,
    getBoundingClientRect() {
      const rect = range.getClientRects()[0] ?? range.getBoundingClientRect();
      if (rect.width || rect.height) return rect;
      const block = closestBlock(range.startContainer, root) ?? root;
      const b = block.getBoundingClientRect();
      return new DOMRect(b.left, b.top, 0, b.height);
    },
  };
}
```

### 0.8 Link popover

This replaces `prompt()` and `alert()`:

- `Mod+K` or the toolbar opens an `orb-popover` at the selection.
- It contains an `orb-textbox` with a URL input (validated with `isSafeUrl`, error shown through `setCustomValidity`), **Apply**, **Remove** and **Open**.
- Placing the caret inside a link shows a small popover with the URL, **Edit**, **Remove** and **Open**. That finally uses the `selectedLink` state.
- With nothing selected, you can enter the link text in the popover too.

### 0.9 Form field

This follows `orb-mask-input`, the existing contenteditable form field, built on the same form APIs as `orb-checkbox` and `orb-file-input`.

#### Shared helpers (`utils/form.ts`)

Two pieces of `orb-mask-input` move into a shared file so both components use them. `orb-mask-input` switches to the shared versions; its behavior doesn't change.

```ts
// utils/form.ts

/**
 * Browsers word their built-in messages in the user's language, so the
 * messages come from a probe input rather than from strings here.
 */
export function browserMessage(configure: (input: HTMLInputElement) => void): string {
  const probe = document.createElement("input");
  configure(probe);
  return probe.validationMessage;
}

/**
 * Form-associated elements don't get these from the platform, but forms
 * and `orb-textbox` read them from the element.
 */
export function exposeFormProps(el: HTMLElement, internals: ElementInternals, extra: PropertyDescriptorMap = {}) {
  Object.defineProperties(el, {
    form: { configurable: true, get: () => internals.form },
    labels: { configurable: true, get: () => internals.labels },
    validity: { configurable: true, get: () => internals.validity },
    validationMessage: { configurable: true, get: () => internals.validationMessage },
    willValidate: { configurable: true, get: () => internals.willValidate },
    checkValidity: { configurable: true, value: () => internals.checkValidity() },
    reportValidity: { configurable: true, value: () => internals.reportValidity() },
    ...extra,
  });
}
```

#### Component changes

```ts
/**
 * A rich text editor that's also a form field. The form gets its content as
 * HTML, under the element's `name` attribute.
 *
 * @slot label - The label, instead of the `label` prop
 * @slot note - The note, instead of the `note` prop
 *
 * @part shell - The bordered editor: menubar, toolbar, content and footer
 */
@Component({
  tag: "orb-rich-text",
  styleUrl: "rich-text.css",
  shadow: { delegatesFocus: true },
  formAssociated: true,
})
export class RichText extends ReadyController {
  @AttachInternals() internals: ElementInternals;

  /** Text above the editor */
  @Prop() label?: string;

  /** Informational message below the editor */
  @Prop() note?: string;

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

  /** Set while a disabled `fieldset` contains the editor */
  @State() formDisabled = false;
  @State() userInvalid = false;

  private interacted = false;
  private customMessage = "";
  /** The HTML last written to `value` and the form, so the watcher can tell it from outside changes */
  private lastValue = "";
  /** The HTML at the last `change` event */
  private lastChangeValue = "";
  private formListeners?: AbortController;
```

- **No `name` prop.** The browser reads the host's `name` attribute itself, as with `orb-mask-input`.
- **`RichText` now extends `ReadyController`**, like `checkbox`, `file-input` and `button`. Its `componentDidLoad` must call `super.componentDidLoad()`.

#### Lifecycle and keeping the value in sync

```ts
componentWillLoad() {
  this.defaultValue ??= this.value;
  exposeFormProps(this.el, this.internals);
}

componentDidLoad() {
  super.componentDidLoad();
  // …existing setup (history, beforeinput listener)
  this.replaceContent(this.value);          // sanitized and normalized
  this.lastChangeValue = this.value;
  this.wireAria();
}

/**
 * Writes the content to `value` and the form. Runs after commands, after a
 * pause in typing, and when focus leaves the editor.
 */
private syncValue() {
  const html = this.output().html;
  if (html !== this.lastValue) {
    this.lastValue = html;
    this.value = html;
  }
  this.internals.setFormValue(html, html);
  this.syncValidity();
}

@Watch("value")
onValueChange(value: string) {
  // Values written by syncValue are already in the editor.
  if (value === this.lastValue) return;
  this.replaceContent(value);
}
```

- **Where `syncValue` runs:**
  - in `afterChange`, which covers commands, undo and redo;
  - in `saveTyping`, so the form value updates at the same moment an undo step is saved for typing;
  - in the focus-out handler below;
  - in `replaceContent`.
- **Why typing waits for the pause.** Each sync runs the full cleanup on a copy of the document, which is too costly on every keystroke for long documents.
- **Validity doesn't wait.** The blank check is cheap, so `syncValidity()` and `syncStates()` also run on every `input`. Submitting straight after typing never sees a stale `valueMissing`.

#### Validation and states

```ts
private get isDisabled() {
  return this.disabled || this.formDisabled;
}

/** No text, and nothing like an image or table that counts as content */
private isBlank() {
  return !this.editorRef.textContent?.trim() && !this.editorRef.querySelector("img, video, iframe, table");
}

private syncValidity() {
  // Disabled and readonly fields are left out of constraint validation.
  // Phase 5.2 adds the view, comment and preview modes here.
  const barred = this.isDisabled || this.readonly;
  const valueMissing = !barred && this.required && this.isBlank();
  const customError = !barred && this.customMessage !== "";
  if (valueMissing || customError) {
    const message = customError ? this.customMessage : browserMessage((input) => (input.required = true));
    this.internals.setValidity({ valueMissing, customError }, message, this.editorRef);
  } else {
    this.internals.setValidity({});
  }
  this.syncStates();
}

private syncStates() {
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

@Listen("invalid")
onInvalid() {
  this.interacted = true;
  this.syncStates();
}
```

**Validation scope:** only `required` and custom validity. `minlength` and `maxlength` are left out: browsers only produce their messages after real typing in a native field, so a hidden probe input can't get them, and the messages would have to be hardcoded in English. Apps can enforce lengths with `setCustomValidity`.

#### Form lifecycle callbacks

```ts
formAssociatedCallback(form: HTMLFormElement | null) {
  this.formListeners?.abort();
  if (!form) return;
  this.formListeners = new AbortController();
  const { signal } = this.formListeners;
  // Typing reaches the form after a pause, so submitting during one would send older content.
  form.addEventListener("submit", () => this.saveTyping(), { capture: true, signal });
  // new FormData(form) doesn't fire submit, so the entry is corrected here instead.
  form.addEventListener("formdata", (ev) => {
    if (this.typingTimer === undefined) return;
    this.saveTyping();
    const name = this.el.getAttribute("name");
    if (name && !this.isDisabled) ev.formData.set(name, this.value);
  }, { signal });
}

formResetCallback() {
  this.interacted = false;
  this.replaceContent(this.defaultValue ?? "");     // fresh undo history, like setContent
  this.lastChangeValue = this.value;
}

formStateRestoreCallback(state: string | File | FormData | null) {
  if (typeof state === "string") this.ready.then(() => this.replaceContent(state));
}

formDisabledCallback(disabled: boolean) {
  this.formDisabled = disabled;
  this.syncValidity();
}

disconnectedCallback() {
  // …existing cleanup
  this.formListeners?.abort();
}
```

**Caveat:** `formData.set` replaces every entry with that name, so it would overwrite other fields sharing the editor's `name`. This only happens with `new FormData(form)` during a typing pause. Document it.

#### `input` and `change` events

The events match a native field, like `orb-mask-input`. The content area's own `input` event is stopped and replaced by one from the host, so commands like Bold fire `input` too, not just typing.

```ts
private dispatchInput(inputType: string, data: string | null = null) {
  this.el.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true, inputType, data }));
}

private handleInput = (ev: InputEvent) => {
  ev.stopPropagation();
  // …existing: word count, orbEditorChange, saveTypingLater
  this.syncValidity();
  this.dispatchInput(ev.inputType, ev.data);
};
```

- **Commands report a standard input type** through `Command.inputType` (0.4), using the standard names where they exist: `formatBold`, `formatItalic`, `formatUnderline`, `formatStrikeThrough`, `formatJustifyCenter`, `formatIndent`, `formatFontColor`, `formatBackColor`, `formatFontName`, `insertOrderedList`, `insertUnorderedList`, `insertHorizontalRule`, `insertLink`, `formatRemove`, `historyUndo` and `historyRedo`. Commands without one fall back to `insertReplacementText`. `apply()` dispatches the event after `afterChange`.
- **`change` fires when focus leaves the whole component**, not when it moves to the toolbar, a menu or a dialog inside the editor. When focus moves within the shadow root, the browser reports `relatedTarget` as the host, which `composedContains` counts as inside.

  ```ts
  @Listen("focusout")
  onFocusOut(ev: FocusEvent) {
    // Moving to the toolbar, a menu or a dialog in the editor isn't leaving it.
    if (composedContains(this.el, ev.relatedTarget as Node | null)) return;
    this.saveTyping();
    this.interacted = true;
    this.syncValue();
    if (this.value !== this.lastChangeValue) {
      this.lastChangeValue = this.value;
      this.el.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
    }
  }
  ```

- **`orbEditorChange`, `orbEditorFocus` and `orbEditorBlur` stay** as they are.

#### Label, note, error message and accessibility

This follows `file-input`'s label and note slots and `mask-input`'s `wireAria`:

```tsx
render() {
  return (
    <Host>
      <slot name="label" ref={(el) => (this.labelSlot = el)} onSlotchange={() => this.wireAria()}>
        {this.label && <orb-label required={this.required}>{this.label}</orb-label>}
      </slot>
      <div class="shell" part="shell" /* …rest from 5.1 */>
        {/* …menubar, toolbar, content, footer */}
      </div>
      <slot name="note" ref={(el) => (this.noteSlot = el)} onSlotchange={() => this.wireAria()}>
        {this.note && <orb-note>{this.note}</orb-note>}
      </slot>
      {this.userInvalid && (
        <orb-note invalid ref={(el) => (this.errorEl = el)}>{this.internals.validationMessage}</orb-note>
      )}
    </Host>
  );
}

/** The content area has focus, so it carries the label and descriptions */
private wireAria() {
  if (!this.editorRef) return;
  this.editorRef.ariaLabelledByElements = [
    ...(this.label || this.labelSlot?.assignedElements().length ? [this.labelSlot] : []),
    ...(Array.from(this.internals.labels) as Element[]),
  ];
  this.editorRef.ariaDescribedByElements = [this.noteSlot, this.errorEl].filter(Boolean) as Element[];
}
```

- **The content area gets** `aria-required`, `aria-readonly`, `aria-disabled` and `aria-invalid` (from `userInvalid`), and `tabindex={this.isDisabled ? -1 : 0}`.
- **`label`, `note` and the error message sit outside `.shell`**, so the border wraps only the editor, as in `orb-textbox`.
- **Clicking an outside `<label for="…">`** focuses the host, and `delegatesFocus` passes focus to the content.
- **Host `aria-label` and `aria-description`** are copied to the content area by the same attribute observer `mask-input` uses.
- **The hardcoded `aria-label="Rich text editor"`** is now only a fallback, used when nothing else names the editor.

#### CSS

```css
/**
 * @prop --editor-invalid-color: Border color after a failed validation
 */
:host(:state(user-invalid)) .shell {
  border-color: var(--editor-invalid-color, /* the danger color orb-textbox uses for .error */);
}

:host(:state(disabled)) .shell {
  opacity: 0.5;
  pointer-events: none;
}
```

`:state(disabled)` replaces the `.editor-disabled` host class. It also covers a disabled `fieldset`, which the class didn't. The other host classes stay.

#### Tests (`tests/rich-text-form.spec.ts`)

- `FormData` has the editor's normalized HTML under its `name`, including right after typing (both the `submit` and the `new FormData()` paths).
- `required` blocks submission, focuses the content area, and turns on `:state(user-invalid)` and the error note.
- A form reset restores `defaultValue` and clears the undo history.
- A disabled `fieldset` disables the editor and leaves it out of `FormData`.
- `readonly` content is still submitted.
- Clicking a `<label for>` focuses the content area.
- In Chromium's accessibility tree, the name comes from `label` and the description from `note`.
- `input` fires for typing and for toolbar commands, with matching `inputType`s.
- `change` fires once when focus leaves the component, and not when focus moves to the toolbar.
- Setting `value` from code replaces the content. The value the editor writes back doesn't re-trigger that replacement.

#### Docs

Add a **Forms** section to `rich-text.md` with a live `<form>` demo (required editor, submit, reset), the `name`/`value`/`defaultValue` behavior, the typing-pause note, and the form states in the accessibility checklist.

### 0.10 Test helpers (`tests/rich-text-utils.ts`)

```ts
export async function editor(page: Page, html = "", attrs = "") {
  await mount(page, `<orb-rich-text ${attrs}></orb-rich-text>`);
  const el = page.locator("orb-rich-text");
  await el.evaluate((e: any, h) => e.setContent(h), html);
  return el;
}

/** Selects the nth occurrence of `text` in the editor */
export const selectText = (page: Page, text: string, nth = 0) =>
  page.locator("orb-rich-text").evaluate((host, [text, nth]) => { /* TreeWalker in shadowRoot, setBaseAndExtent */ }, [text, nth] as const);

export const content = (page: Page) =>
  page.locator("orb-rich-text").evaluate((e: any) => e.getContent());
```

**Spec files** stay flat, matching the existing naming: `tests/rich-text-*.spec.ts`, one per phase area. They run in all three Playwright projects; WebKit matters most.

**Phase 0 is done when:**

- the current features behave as they do today;
- the toolbar is built from the command list;
- undo works with changes stored as slices;
- pasting from Google Docs keeps bold and doesn't turn everything bold;
- `value` and `setContent` are sanitized;
- the editor submits with a form and validates `required`.

---

## Phase 1: Input and blocks

### 1.1 Better keyboard features (`editing/input.ts`)

**The principle:** let the browser handle typing and deleting *inside* a block, which is fast and works with input methods (IME) and spellcheck. Take over at block boundaries, at non-editable pieces, and for Enter and Tab.

```ts
export type Key =
  | "enter" | "shiftEnter" | "backspaceAtStart" | "deleteAtEnd"
  | "tab" | "shiftTab" | "arrowUpAtStart" | "arrowDownAtEnd";

/** Returns the range to select, null when handled without a change, or undefined to pass to the next behavior out */
export type Handler = (el: HTMLElement, range: Range, root: HTMLElement) => Range | null | undefined;

export interface Behavior {
  /** The element this handles, found by walking out from the caret */
  selector: string;
  on: Partial<Record<Key, Handler>>;
}

/** Most specific first; added to as features land */
export const BEHAVIORS: Behavior[] = [codeBlock, tableCell, taskItem, listItem, figcaption, quote, heading, paragraph];

export function handleKey(root: HTMLElement, range: Range, key: Key): Range | null | undefined {
  for (let node: Node | null = range.startContainer; node && node !== root; node = node.parentNode) {
    if (!(node instanceof HTMLElement)) continue;
    for (const behavior of BEHAVIORS) {
      if (!node.matches(behavior.selector)) continue;
      const result = behavior.on[key]?.(node, range, root);
      if (result !== undefined) return result;
    }
  }
  return DEFAULTS[key]?.(root, range);   // splitBlock, insertBreak, joinBackward, joinForward
}
```

**In the component:**

```ts
private handleBeforeInput = (event: InputEvent) => {
  if (!this.editable || event.isComposing || event.inputType === "insertCompositionText") return;
  const range = getRange(this.editorRef);
  if (!range) return;
  let key: Key | undefined;
  switch (event.inputType) {
    case "insertParagraph": key = "enter"; break;
    case "insertLineBreak": key = "shiftEnter"; break;
    case "deleteContentBackward":
    case "deleteWordBackward":
    case "deleteSoftLineBackward":
      if (!range.collapsed) return this.deleteSelection(event, range);
      if (atomBefore(range)) return this.deleteAtom(event, "backward");
      if (atBlockStart(this.editorRef, range)) key = "backspaceAtStart";
      break;
    // …forward mirrors backward; insertText runs auto-format rules, pending formats and triggers;
    // format* and history* inputs are handled as today
  }
  if (!key) return;
  event.preventDefault();
  this.apply(() => handleKey(this.editorRef, range, key!) ?? null);
};
```

**Default behaviors (`blocks.ts`):**

- **`splitBlock` (Enter):**
  - `Range.extractContents()` splits the formatting around the caret automatically;
  - the new block copies alignment, indent and line height, but not `id`;
  - a heading split at its end continues as a paragraph;
  - empty halves get a `<br>`.
- **`joinBackward` (Backspace at the start of a block):**
  - after a paragraph or heading: merges into it;
  - after a non-editable block (hr, figure, table): the first press selects it and the second removes it;
  - at the start of the document: turns a heading into a paragraph.
- **`deleteSelection`:** deleting across blocks keeps the structure valid. Tables are emptied cell by cell, never cut apart. Then everything left is joined into the first block.

**Shortcuts.** All matched from the command list. Mod is Ctrl or ⌘.

| Shortcut | Action |
|---|---|
| Mod+Z, Mod+Shift+Z, Mod+Y | Undo, redo |
| Mod+B / I / U | Bold, italic, underline |
| Mod+Shift+X | Strikethrough |
| Mod+K | Link |
| Mod+Alt+0–6 | Paragraph, headings 1–6 |
| Mod+Shift+7 / 8 / 9 | Numbered, bulleted, task list |
| Mod+Shift+L / E / R / J | Align left, center, right, justify (the Google Docs set) |
| Mod+\ | Clear formatting |
| Mod+] / Mod+[ | Indent, outdent |
| Mod+Enter | Page break |
| Mod+Alt+Enter | Toggle a task |
| Mod+S | Save |
| Mod+P | Print |
| Mod+Alt+M | Comment |
| Mod+/ | Shortcut help |

**Other keyboard features:**

- **Alt+F10** focuses the toolbar.
- **Shortcut help:** Mod+/ opens an `orb-overlay` listing the shortcuts, built from the command list.
- **Tab escape** (outside full screen only; see 5.1): Escape with no popup open sets `tabLeaves = true` until the next key. Tab then moves focus out instead of being handled. Tab is only taken over inside lists, tables and code blocks, so it never traps focus (WCAG 2.1.2). The help dialog explains this.
- **Android:** rely on `beforeinput`, not `keydown`, for Enter and Backspace. On Android, `keydown` often reports `key: "Unidentified"`.

### 1.2 Text style select and h1–h6

- **Types:** `BlockType = "p" | "h1" | … | "h6" | "pre"`. `blockType()` returns the shared type, or `null` when the selection mixes types.
- **One `blockType` select command**, labeled Text style, replaces the three heading and paragraph buttons. Options: Paragraph and Heading 1–6. Quote and code block have their own toggles (1.3, 1.5), so the select doesn't offer them. Setting a paragraph or heading keeps any quote around the block.
- **CSS:** h3–h6 sizes go in `content.css`.

### 1.3 Block quotes

- **HTML:** `<blockquote><p>…</p></blockquote>`. `BLOCKQUOTE` moves from text blocks to containers, so a quote can hold several paragraphs.
- **`setQuote(root, range, on)`**, called by the `quote` toolbar toggle:
  - if every selected block is already in the same quote, lift those blocks out, splitting the quote around them;
  - otherwise, wrap the selected blocks' outermost ancestors under a shared parent in a new `blockquote`.
- **`quote` behavior:**
  - Enter on an empty last paragraph leaves the quote;
  - Backspace at the start of the first paragraph removes the quote.

### 1.4 Separators

- **Insert:** `insertBlockAt(root, range, document.createElement("hr"))`. It splits the current block at the caret, inserts the separator between the halves, and makes sure an editable block follows.
- **CSS:** an `hr[data-selected]` outline.

### 1.5 Code

- **Inline:** the `code` mark stays in the schema for pasted content and code blocks. There's no toolbar toggle for inline code. Clear formatting removes it.
- **Toolbar:** the `code` toggle makes the caret's block a code block. Clicking it again turns the block back into a paragraph, and the `code` inside it is unwrapped so it doesn't become inline code.
- **HTML for blocks:** `<pre><code class="language-ts">…</code></pre>`, the form markdown-it produces. Inside `pre`, cleanup turns `<br>` into `\n` and unwraps all formatting.
- **`codeBlock` behavior:**
  - **Enter** inserts `\n`. When the caret is at the very end, a second `\n` is added so the new empty line shows; cleanup removes that extra newline from output.
  - **Leaving the block:** Enter when the last two lines are empty removes them and creates a paragraph after the block. ArrowDown on the last line creates a paragraph after it if none exists.
  - **Tab and Shift+Tab** indent or outdent the selected lines by two spaces.
  - **Backspace** at the start of an empty block turns it into a paragraph.
  - **Paste** inside is always plain text.
  - **Formatting commands** are disabled inside.
- **Language picker:** the `codeLanguage` select, shown in the toolbar only while the caret is in a code block. The languages come from the `codeLanguages` property, set as a property rather than an attribute.
- **Syntax highlighting (`editing/code.ts`)** uses the CSS Custom Highlight API, so the content itself never changes and undo, the caret and the stored HTML aren't affected:

  ```ts
  let prism: Promise<any> | undefined;
  const loadPrism = () => (prism ??= (async () => {
    (globalThis as any).Prism = { manual: true };     // don't highlight the page on load
    return (await import("prismjs")).default;
  })());

  /** Ranges this editor added, by highlight name, so it only removes its own */
  const owned = new Map<string, Set<Range>>();

  export async function highlightCode(root: HTMLElement) {
    if (!("highlights" in CSS)) return;
    const Prism = await loadPrism();
    for (const set of owned.values()) for (const r of set) CSS.highlights.get(nameOf(set))?.delete(r);
    for (const code of root.querySelectorAll<HTMLElement>("pre > code")) {
      const grammar = Prism.languages[languageOf(code)];
      if (!grammar) continue;
      addTokenRanges(code, Prism.tokenize(code.textContent ?? "", grammar));   // walk tokens → Ranges per type
    }
  }
  ```

  - **When it runs:** 150ms after the last change, only for code blocks that changed.
  - **Styling:** `content.css` maps `::highlight(orb-code-keyword) { color: var(--editor-code-keyword) }` and so on. Each color is a documented CSS custom property.
  - **Loading languages:** Prism's language files expect the global `Prism`, so they're loaded on demand with `import("prismjs/components/prism-python")`.
  - **Highlight names are global**, so each editor instance manages only its own ranges within them.
  - **Verify** that `::highlight()` styles inside a shadow root apply in all three engines.

### 1.6 Indent level

One generic block-style function also replaces `setAlignment`:

```ts
/** Sets a style on the selected blocks. Null removes it. */
export function setBlockStyle(root: HTMLElement, range: Range, prop: StyleProp, value: string | null): Range {
  for (const block of blocksIn(root, range)) {
    if (value) block.style.setProperty(prop, value);
    else block.style.removeProperty(prop);
    if (!block.getAttribute("style")) block.removeAttribute("style");
  }
  return range;
}

const INDENT_EM = 2, MAX_INDENT = 8;
export function changeIndent(root: HTMLElement, range: Range, delta: 1 | -1): Range {
  // List items nest instead (1.8). Other blocks step margin-inline-start in 2em steps.
}
```

### 1.7 Line height

- **Command:** a `lineHeight` select with Default, 1, 1.15, 1.5 and 2, using `setBlockStyle(…, "line-height", v)`.
- **CSS:** `.editor-content { line-height: var(--editor-line-height, 1.6) }`, replacing the hardcoded `1.6`, documented with `@prop`.

### 1.8 Advanced lists

**HTML:**

```html
<ol start="3" style="list-style-type: lower-alpha">
  <li>Item<ul><li>Child</li></ul></li>
</ol>
<ul>
  <li style="list-style-type: none"><input type="checkbox" checked> Done task</li>
</ul>
```

- List items keep holding text directly, as today.
- A task item is an `li` that starts with a checkbox. Cleanup adds `list-style-type: none` so it shows correctly anywhere.
- GitHub's `class="task-list-item"` and `disabled` attributes are removed when importing.

**Nesting (`lists.ts`):**

```ts
/** Moves each selected item into a list at the end of the item before it */
export function indentItems(root: HTMLElement, range: Range): Range {
  const saved = keep(range);
  for (const item of outermostItems(root, range)) {
    const previous = item.previousElementSibling as HTMLElement | null;
    if (previous?.tagName !== "LI") continue;         // the first item can't go deeper
    const tag = item.parentElement!.tagName;
    let sublist = previous.lastElementChild;
    if (sublist?.tagName !== tag) previous.append((sublist = document.createElement(tag)));
    sublist.append(item);                             // its own children come along
  }
  return restore(saved, root) ?? range;
}

/** Moves an item out one level. Items after it become its children, so nothing changes order. */
export function outdentItem(root: HTMLElement, item: HTMLElement) {
  const list = item.parentElement!;
  const parentItem = list.parentElement;
  if (parentItem?.tagName !== "LI") return unwrapListItem(item);   // top level: becomes a paragraph
  const following = siblingsAfter(item);
  if (following.length) {
    let sub = item.querySelector<HTMLElement>(`:scope > ${list.tagName}`);
    if (!sub) item.append((sub = document.createElement(list.tagName)));
    sub.append(...following);
  }
  parentItem.after(item);
  if (!list.children.length) list.remove();
}
```

**Updates to existing functions:** `listItems`, `listType` and `toggleList` must handle nesting. Toggling between list types changes only the innermost list.

**`listItem` behavior:**

| Key | Action |
|---|---|
| Enter | On an empty item, outdents it; otherwise `splitBlock`. Content after the caret, including a sublist, moves into the new item. |
| Backspace at start | Outdents |
| Tab / Shift+Tab | Indent / outdent the selected items |

**`taskItem` behavior:**

| Key | Action |
|---|---|
| Enter | The new item gets an unchecked checkbox |
| Backspace right after the checkbox | Removes the checkbox, leaving a regular list item |

**Toggling a checkbox:**

```ts
// A canceled click restores the checkbox's previous state after the event,
// so the toggle runs afterward. Some browsers don't let you click form
// controls inside editable content at all, so this always toggles itself.
private onEditorClick = (ev: MouseEvent) => {
  const box = (ev.target as Element).closest?.("input[type=checkbox]");
  if (!(box instanceof HTMLInputElement) || !this.editorRef.contains(box)) return;
  ev.preventDefault();
  if (!this.editable) return;
  setTimeout(() => this.apply(() => toggleTask(box)));
};

export function toggleTask(box: HTMLInputElement): Range {
  const on = !box.hasAttribute("checked");
  box.toggleAttribute("checked", on);                 // the attribute is what innerHTML saves
  box.checked = on;
  return afterNode(box);
}
```

- **Mousedown on a checkbox** is prevented, so the caret doesn't move.
- **Checkboxes get `tabIndex = -1` at runtime**, removed from output. Mod+Alt+Enter toggles the task the caret is in.
- **The sanitizer** currently removes every `input`; the schema (0.2) allows checkboxes inside list items only.
- **List styles:** a `listStyle` select applies `list-style-type` to the list containing the caret, and the `start` attribute is editable from it. Continuing numbering from the list above is left out of v1.

**Phase 1 tests:**

- Enter, Backspace and Tab in each context;
- nesting round-trips;
- checkbox state survives undo and `getContent`;
- input-method (IME) composition isn't interrupted (`page.keyboard.insertText` during composition);
- Tab escape;
- one Tab stop in the toolbar.

---

## Phase 2: Inline styling and typing shortcuts

### 2.1 Font color, family, size, background

```ts
/** Splits `el` so `node` is alone in it. Content before and after goes into copies on either side. */
export function splitAround(el: HTMLElement, node: Node): HTMLElement { /* today's unwrapAround, minus the unwrap */ }
export function unwrapAround(el: HTMLElement, node: Node) {
  const own = splitAround(el, node);
  own.replaceWith(...Array.from(own.childNodes));
}

export function setInlineStyle(root: HTMLElement, range: Range, prop: StyleProp, value: string | null): Range {
  const split = splitBoundaries(range);
  const nodes = selectedTextNodes(root, split);
  if (!nodes.length) return split;
  for (const node of nodes) {
    let span: HTMLElement | null;
    while ((span = closestWithStyle(node, root, prop))) {
      const own = splitAround(span, node);
      own.style.removeProperty(prop);
      if (!own.getAttribute("style")) own.replaceWith(...Array.from(own.childNodes));
    }
  }
  if (value) {
    wrapEach(nodes, () => {
      const span = document.createElement("span");
      span.style.setProperty(prop, value);
      return span;
    });
  }
  return spanOf(nodes);
}

/** The value across the selection: one value, null for none, or "mixed" */
export function inlineStyleValue(root: HTMLElement, range: Range, prop: StyleProp): string | null { /* … */ }
```

- **Typing with nothing selected.** Today `pendingFormats` is `Map<InlineFormat, boolean>`. It becomes `Map<string, string | boolean | null>`, keyed by `"strong"` or `"style:color"`, and `insertFormattedText` learns to wrap text in style spans.
- **Props:**

  ```ts
  /** Font families to choose from. The value is the CSS font stack. */
  @Prop() fonts: FontOption[] = DEFAULT_FONTS;            // { label, value }
  /** Font sizes to choose from, in points */
  @Prop() fontSizes = "8 9 10 11 12 14 18 24 30 36 48";
  /** Swatches in the color pickers */
  @Prop() colors: string[] = DEFAULT_PALETTE;
  ```

  Colors are stored as real color values (portable), not theme variables. Font sizes in `pt` map cleanly to DOCX and print.
- **Commands:** `fontFamily` and `fontSize` are selects; `color` and `background` are color controls. Each shows the current value, or a mixed state when the selection has several.
- **Color picker** (`ui/pickers.tsx`): an `orb-popover` with a swatch grid (arrow-key navigation, one Tab stop), **Default** (removes the color), and **Custom…** using `<input type="color">`.
- **Clear formatting** removes style spans and marks. Annotations and non-editable pieces stay (decided by `kind` in the schema). Today `FORMATTING_TAGS` includes `SPAN` and `MARK`, which would have deleted comment markers.

### 2.2 GFM auto-formatting and Markdown paste (`editing/rules.ts`)

```ts
interface BlockRule {
  /** The paragraph's text before the caret, when space is typed */
  match: RegExp;
  apply: (root: HTMLElement, block: HTMLElement, m: RegExpMatchArray) => Range;
}

export const SPACE_RULES: BlockRule[] = [
  { match: /^(#{1,6})$/, apply: (root, b, m) => setBlockType(root, startOf(b), `h${m[1].length}` as BlockType) },
  { match: /^[-*+]$/, apply: (root, b) => toggleList(root, startOf(b), "ul") },
  { match: /^(\d+)[.)]$/, apply: (root, b, m) => setListStart(toggleList(root, startOf(b), "ol"), +m[1]) },
  { match: /^(?:[-*+] )?\[( |x)\]$/i, apply: (root, b, m) => makeTask(root, b, m[1] !== " ") },
  { match: /^>$/, apply: (root, b) => setQuote(root, startOf(b), true) },
];

export const ENTER_RULES: BlockRule[] = [
  { match: /^```([\w+-]*)$/, apply: (root, b, m) => toCodeBlock(root, b, m[1]) },
  { match: /^(?:---|\*\*\*|___)$/, apply: (root, b) => replaceWithSeparator(root, b) },
];

interface InlineRule { match: RegExp; mark: MarkName }
/** Checked against the text before the caret plus the character being typed */
export const INLINE_RULES: InlineRule[] = [
  { match: /(?:^|[^*])\*\*([^*\s](?:[^*]*[^*\s])?)\*\*$/, mark: "bold" },
  { match: /(?:^|[^\w_])__([^_\s](?:[^_]*[^_\s])?)__$/, mark: "bold" },
  { match: /(?:^|[^*])\*([^*\s](?:[^*]*[^*\s])?)\*$/, mark: "italic" },
  { match: /(?:^|[^\w_])_([^_\s](?:[^_]*[^_\s])?)_$/, mark: "italic" },
  { match: /~~([^~\s](?:[^~]*[^~\s])?)~~$/, mark: "strike" },
  { match: /`([^`]+)`$/, mark: "code" },
];
// Autolinks: on space or Enter after /(https?:\/\/[^\s<]+[^\s<.,:;"')\]])$/
```

- **Rules apply in two undo steps.** When a rule matches, the typed character is inserted and recorded as its own step; then the conversion is applied and recorded as a second step. The caret position is saved as `lastRule`. Backspace while the caret is still there runs `history.undo()`, which brings back the literal text. Any selection change clears `lastRule`.
- **Inline rules stay within one block.** Code blocks and inline code are skipped.
- **Markdown paste:** when the clipboard has only `text/plain` and the text looks like Markdown, `convert/markdown.ts` renders it with markdown-it (loaded on first use, as in `orb-markdown`), then sanitizes and inserts it. Controlled by the `markdown-paste` prop, default `true`.

  ```ts
  const MARKDOWN_HINTS = /^(#{1,6}\s|[-*+]\s|\d+[.)]\s|>\s|```|\|.*\|\s*$|[-*_]{3,}\s*$)|\*\*[^*\n]+\*\*|\[[^\]\n]+\]\([^)\s]+\)/m;
  ```

### 2.3 Special characters and emoji

- **Pickers** are `orb-popover`s opened from the toolbar `picker` control:
  - a search field (`orb-textbox`);
  - category tabs;
  - a grid with `role="grid"` and arrow-key navigation (one Tab stop);
  - recently used items in `localStorage` (`orb-rich-text:recent-characters`, `…:recent-emoji`).
- **Data:**
  - **Special characters:** a hand-curated list in `ui/special-characters.ts` (punctuation, currency, math, arrows, Latin letters with accents, Greek, symbols), each with a name for search.
  - **Emoji:** `emojibase-data`, loaded on first use:

    ```ts
    let emoji: Promise<EmojiEntry[]> | undefined;
    const loadEmoji = () => (emoji ??= import("emojibase-data/en/compact.json").then((m) => m.default));
    ```

    Check that Stencil's build can import JSON. Skin tones are left out of v1.
- **Inserting** uses `insertText(root, range, text)`, which also applies pending formats. The pickers keep the editor's selection the same way the toolbar does (`savedRange`).
- **Shortcodes** (`:smile`) are a trigger in 4.1.

---

## Phase 3: Structured content

### 3.1 Tables (`editing/tables.ts`)

**HTML:**

```html
<table>
  <colgroup><col style="width: 30%"><col style="width: 70%"></colgroup>
  <thead><tr><th>Name</th><th>Notes</th></tr></thead>
  <tbody><tr><td>Ada</td><td>Line one<br>Line two</td></tr></tbody>
</table>
```

**Styling:** add `table`, `colgroup`, `col`, `thead`, `tbody`, `tr`, `th` and `td` to the schema. Cells are text blocks. Reuse the shared table styles: `content.css` imports the generated `_tables.scss` output, the same way `grid.tsx` imports `tables.generated.css`.

**Cleaning up pasted tables** (including from Excel and Sheets):

- paragraphs inside a cell become lines separated by `<br>`;
- `colspan`/`rowspan` cells are split into separate cells, since merging isn't supported in v1;
- short rows get padded with empty cells;
- tables with no rows are dropped.

**Commands:**

```ts
export function insertTable(root: HTMLElement, range: Range, rows: number, cols: number): Range {
  const table = document.createElement("table");
  const head = table.createTHead().insertRow();
  for (let c = 0; c < cols; c++) head.append(emptyCell("th"));
  const body = table.createTBody();
  for (let r = 1; r < rows; r++) {
    const row = body.insertRow();
    for (let c = 0; c < cols; c++) row.append(emptyCell("td"));
  }
  insertBlockAt(root, range, table);
  return startOf(table.querySelector("th, td")!);
}

const emptyCell = (tag: "td" | "th") => {
  const cell = document.createElement(tag);
  cell.append(document.createElement("br"));
  return cell;
};

export function addRow(table: HTMLTableElement, rowIndex: number, where: "before" | "after"): Range { /* clone shape, empty cells */ }
export function addColumn(table: HTMLTableElement, colIndex: number, where: "before" | "after"): Range { /* per row + <col> */ }
export function deleteRows(table: HTMLTableElement, rows: number[]): Range { /* deletes the table when none are left */ }
export function deleteColumns(table: HTMLTableElement, cols: number[]): Range { /* same */ }
export function toggleHeaderRow(table: HTMLTableElement): Range { /* first row moves between thead (th) and tbody (td) */ }
```

`blocksIn` understands cells, so block commands work inside them.

**`tableCell` behavior:**

| Key | Action |
|---|---|
| Tab / Shift+Tab | Next or previous cell. Tab in the last cell adds a row. |
| Enter | Line break (`<br>`) |
| ArrowUp at the first line / ArrowDown at the last line | Same column in the row above or below; leaves the table at its edges |
| Backspace at start / Delete at end | Does nothing, so cells never merge |

**Selecting several cells:**

```ts
interface CellSelection { table: HTMLTableElement; anchor: HTMLTableCellElement; head: HTMLTableCellElement }

function cellsIn({ table, anchor, head }: CellSelection): HTMLTableCellElement[] {
  const [r1, r2] = [rowOf(anchor), rowOf(head)].sort((a, b) => a - b);
  const [c1, c2] = [anchor.cellIndex, head.cellIndex].sort((a, b) => a - b);
  return Array.from(table.rows).slice(r1, r2 + 1).flatMap((row) => Array.from(row.cells).slice(c1, c2 + 1));
}
```

- **Detecting it:** in `onSelectionChange`, when the two ends of the selection are in different cells of the same table, the editor switches to cell selection. The composed range doesn't say which end is the anchor; `selection.direction` does (supported in current Chrome, Firefox and Safari).
- **Showing it:** cells get `data-selected` (runtime only), and `.cell-selecting ::selection { background: transparent }` hides the browser's own selection.
- **Commands** run once per selected cell, using `selectNodeContents(cell)`. Delete empties the selected cells. Copy writes a `<table>` fragment.

**UI:**

- **Insert:** a toolbar `picker` with a size grid that expands as you hover, up to 10×10, and also works with arrow keys.
- **While the caret is in a table:** the toolbar shows an extra group (rows, columns, header row, delete).
- **Right-click** inside a table opens an `orb-menu` with the same commands, via `menu.show(event)`.
- **Resizing columns:** `interactjs` handles in a layer over the content (`.editor-overlay`, positioned absolutely in `.editor-content-wrapper`). When a drag ends, the editor sets `col` widths in `%` and records one undo step.

### 3.2 Media (`editing/media.ts`)

**HTML:**

```html
<figure style="text-align: center">
  <img src="…" alt="…" width="480">
  <figcaption>Optional caption</figcaption>
</figure>
<figure><video src="…" controls></video></figure>
<figure data-embed="youtube">
  <iframe src="https://www.youtube-nocookie.com/embed/ID" sandbox="allow-scripts allow-same-origin allow-presentation"
    allowfullscreen loading="lazy"></iframe>
</figure>
```

- `figure` is a non-editable block. Its `figcaption` is an editable text block nested inside it.
- **Images pasted inside a paragraph** are moved into their own `figure`, splitting the paragraph.
- **Embeds:** only from the `embed-providers` list. The sanitizer rebuilds the `iframe` `src` from the provider's parsed ID, never trusting the pasted URL.

**API:**

```ts
/** Uploads a file and returns its URL. Without it, images are embedded as data URLs. */
@Prop() upload?: (file: File) => Promise<string>;
/** File types that can be inserted, like the `accept` attribute */
@Prop() mediaAccept = "image/*";
/** Sites whose videos can be embedded by URL */
@Prop() embedProviders: EmbedProvider[] = [YOUTUBE, VIMEO];
/** Emitted when `upload` fails. The placeholder is removed. */
@Event() orbUploadError: EventEmitter<{ file: File; error: unknown }>;
```

**Inserting files:**

```ts
private async insertFiles(files: File[], range: Range) {
  for (const file of files.filter((f) => isAccepted(f, this.mediaAccept))) {   // moved from file-input to utils/files.ts
    const preview = URL.createObjectURL(file);
    const figure = createMediaFigure(file, preview);                         // media has data-uploading
    this.apply(() => insertBlockAt(this.editorRef, range, figure), { record: false });
    try {
      const src = this.upload ? await this.upload(file) : await readAsDataUrl(file);
      const media = figure.querySelector("img, video")!;
      media.setAttribute("src", src);
      media.removeAttribute("data-uploading");
      this.history.record();
      this.afterChange(false);
    } catch (error) {
      figure.remove();
      this.orbUploadError.emit({ file, error });
    } finally {
      URL.revokeObjectURL(preview);
    }
  }
}
```

**Sources of files:**

- the toolbar button (the existing hidden file input);
- pasted files (`clipboardData.files`, e.g. screenshots);
- dropped files. For drops, the editor converts the drop point to a caret position with `document.caretPositionFromPoint(x, y, { shadowRoots: [root] })`, falling back to `caretRangeFromPoint`. Check that WebKit handles the shadow root correctly.

**Embeds:** **Insert > Video by URL** asks for a link, and pasting a bare provider link on an empty line converts it.

**Selecting media:**

- clicking selects the whole figure;
- `interactjs` resize handles appear in the overlay layer, keeping the aspect ratio, and set `width` when the drag ends;
- a popover offers alt text, a caption toggle, alignment, Replace and Remove.

An embedded `iframe` would swallow clicks, so a transparent cover sits over it until the figure is selected.

### 3.3 Document outline and TOC (`editing/outline.ts`)

- **Heading IDs:** `assignHeadingIds(root)` runs in `afterChange` before history records. It keeps an existing `id` if it's unique; otherwise it creates a slug from the heading text and appends `-2`, `-3`… for duplicates.
- **Outline panel:**

  ```ts
  /** Shows a panel listing the document's headings */
  @Prop({ reflect: true }) outline = false;
  ```

  - **Layout:** the editor body becomes `orb-split-view` > [`orb-split-panel` outline] [`orb-split-panel primary` content] [`orb-split-panel` comments (Phase 7)].
  - **Contents:** a `nav` with nested lists of buttons, rebuilt after changes with a short delay. The current section is highlighted using an `IntersectionObserver` on headings within the editor's scroll area.
- **TOC block:**
  - **HTML:** `<nav data-toc><ol><li><a href="#id">…</a><ol>…</ol></li></ol></nav>`, a non-editable block.
  - **Updating:** in `afterChange`, if a TOC exists and the headings' signature (level, text and id of each) changed, its contents are rebuilt before the undo step is recorded, so the change and the rebuild are one step.
- **Clicking a heading link** in the outline or the TOC is handled in JavaScript, because URL fragments can't reach into a shadow root: `heading.scrollIntoView({ block: "start" })` and the caret moves to the heading's start.

---

## Phase 4: Inline objects

### 4.1 `/` commands, mentions, tags and emoji shortcodes (`editing/triggers.ts`)

```ts
export interface TriggerItem {
  id: string;
  label: string;
  details?: string;
  icon?: (props?: any) => any;
}

export interface Trigger {
  text: string;                  // "/", "@", "#", ":", "{{"
  label: string;                 // the menu's accessible name
  /** Only at the start of a block, like the "/" menu */
  blockStart?: boolean;
  /** Whether the search text may contain spaces */
  spaces?: boolean;
  items(query: string): TriggerItem[] | Promise<TriggerItem[]>;
  /** Replaces the trigger and search text with the result. Returns the caret. */
  choose(item: TriggerItem, root: HTMLElement, range: Range): Range;
}

interface Session {
  trigger: Trigger;
  start: Point;                  // where the trigger text begins
  query: string;
  items: TriggerItem[];
  request: number;               // ignores stale async results, like orb-markdown's renderId
}
```

**How a session runs:**

1. **Starting:** on `insertText`, if the text before the caret now ends with a trigger's text, and it's at the start of a line or after a space (and at the start of a block, for `blockStart` triggers), a session starts.
2. **On each change:** the search text is the text from the end of the trigger text to the caret. The session ends if the caret moves before the trigger, leaves the block, or the search text gets a space (unless `spaces`) or exceeds 50 characters.
3. **Fetching items:** async item lists wait 150ms after the last keystroke.

**Rendering, in the editor's shadow root:**

```tsx
<orb-menu ref={(el) => (this.triggerMenu = el)} label={session?.trigger.label}
  onOrbSelect={(ev) => this.chooseTriggerItem(ev.detail.value)}>
  {session?.items.map((item) => (
    <orb-mi value={item.id}>
      {item.icon && <span slot="icon">{item.icon()}</span>}
      {item.label}
      {item.details && <span slot="details">{item.details}</span>}
    </orb-mi>
  ))}
</orb-menu>
```

The editor calls `triggerMenu.attachInput(this.editorRef)` and `triggerMenu.show(caretAnchor(range, root))` (0.7). Escape closes the menu and leaves the typed text as it is.

**Built-in triggers:**

| Trigger | Items | Inserts |
|---|---|---|
| `/` | Items from the host's `commands` lookup (0.2 of `channel-phases.md`). Without it, `/` is a plain character. | A command chip, such as `<span data-command="id">/Label</span>`, then `orbCommand` |
| `@` | `mentions?: (query: string) => Promise<MentionItem[]>` | `<span data-mention="id">@Label</span>`, then emits `orbMention` |
| `#` | `tags?: (query: string) => Promise<TagItem[]>`, plus a "Create #query" item | `<span data-tag="id">#label</span>` |
| `:` | Emoji data, matched on shortcode (needs at least 2 characters) | The emoji character |
| `{{` | `params` (4.2) | A placeholder |

### 4.2 Parameters and placeholders

```ts
export interface ParamDef { key: string; label: string; sample?: string; description?: string }

/** Placeholders that can be inserted, such as a customer's name in a template */
@Prop() params: ParamDef[] = [];

/** Keys of the placeholders in the document, in order, without repeats */
@Method() async getParams(): Promise<string[]> { /* … */ }

/** The document's HTML with each placeholder replaced by its value, as text. Unknown keys are left as is. */
@Method() async fill(values: Record<string, string>): Promise<string> { /* runs on the output copy */ }
```

- **HTML:** `<span data-param="customer.name">Customer name</span>`, a non-editable piece. Its text is the label, so it's readable anywhere. Text and Markdown export write `{{customer.name}}`; DOCX export writes merge-field text.
- **Unknown keys:** placeholders whose key isn't in `params` get `data-unknown` (runtime only) for a warning style.
- **Insert:** a toolbar `param` select and the `{{` trigger.
- **Preview mode** (5.2) shows `sample` values using `fill`'s replacement on a read-only copy.

### 4.3 Templates

```ts
export interface TemplateInfo {
  id: string;
  label: string;
  description?: string;
  html?: string;
  load?: () => Promise<string>;
}

/** Templates offered by File > New from template */
@Prop() templates: TemplateInfo[] = [];

/** Replaces the document with a template, or inserts it at the caret. Undoable. */
@Method() async applyTemplate(id: string, how: "replace" | "insert" = "replace") { /* … */ }
```

- **Picker:** an `orb-overlay` listing templates as `orb-card`s.
- **Replacing with unsaved changes** (Phase 6): the editor asks for confirmation in the overlay first.
- **Applying** goes through `sanitize` and `normalize`, then `apply()`, so it's a single undo step, unlike `setContent`, which starts a fresh undo history. Templates can contain placeholders.

---

## Phase 5: Document chrome and formats

### 5.1 Full screen with menubar

Full screen uses the Popover API. Setting `fullscreen` doesn't need a click or keypress, and nothing depends on browser-specific full screen support. Safari has supported popovers since version 17, iPhone included.

**Tradeoff:** a popover doesn't make the rest of the page inert the way a modal `<dialog>` would. The editor makes up for that by keeping focus inside the full-screen view and covering the whole screen. Screen readers in browse mode can still reach content behind it; `aria-modal` asks them not to, but support varies. If that matters later, `showModal()` on a `<dialog>` works the same way and makes the page behind inert automatically.

**How it works:**

- **Wrapper element.** Everything the editor renders goes in a `.shell` element inside the shadow root. That includes the menubar, toolbar, split view, content, sidebar, footer, and the editor's own menus and tooltips. The label, note and error message (0.9) stay outside it.
- **Going full screen:**
  1. The editor sets `popover="manual"` on the shell and calls `showPopover()`.
  2. The shell moves to the browser's top layer, above everything else on the page, with no z-index needed.
  3. `manual` means the browser doesn't close it on outside clicks or Escape; the editor handles that itself.
- **The attribute is only set while full screen.** An element with `popover` set is hidden whenever it isn't showing, so leaving it on would hide the editor normally.
- **The host keeps its height.** A top-layer element no longer takes up space in its original spot, so without this the page would shift and lose its scroll position.

```ts
/** Fills the window, above the rest of the page */
@Prop({ mutable: true, reflect: true }) fullscreen = false;

/** When the menubar shows */
@Prop() menubar: "always" | "fullscreen" | "never" = "fullscreen";

private shellEl!: HTMLElement;
private viewportListeners?: AbortController;

@Method()
async toggleFullscreen() {
  this.fullscreen = !this.fullscreen;
}

@Watch("fullscreen")
onFullscreenChange(on: boolean) {
  const shell = this.shellEl;
  const range = this.takeRange();
  if (on && !shell.matches(":popover-open")) {
    // The shell leaves the page's layout, so the host holds its place.
    this.el.style.setProperty("--editor-placeholder-height", `${this.el.offsetHeight}px`);
    shell.popover = "manual";
    shell.showPopover();
    this.watchViewport();
  } else if (!on && shell.matches(":popover-open")) {
    shell.hidePopover();
    // With the attribute left on, the shell would stay hidden.
    shell.removeAttribute("popover");
    this.el.style.removeProperty("--editor-placeholder-height");
    this.viewportListeners?.abort();
  }
  // Safari only redraws the caret when the selection changes.
  this.editorRef.focus({ preventScroll: true });
  selectRange(range, { redraw: true });
}

disconnectedCallback() {
  // …existing cleanup
  this.viewportListeners?.abort();
}
```

**Following the on-screen keyboard (iPhone).** On iOS the on-screen keyboard covers the page instead of resizing it, and `100dvh` doesn't shrink when it opens. The shell follows `visualViewport` so the toolbar and caret stay visible:

```ts
/** Sizes the shell to the visible part of the window, which shrinks when the on-screen keyboard opens */
private watchViewport() {
  const viewport = window.visualViewport;
  if (!viewport) return;
  this.viewportListeners?.abort();
  this.viewportListeners = new AbortController();
  const sync = () => {
    this.shellEl.style.setProperty("--editor-viewport-height", `${viewport.height}px`);
    this.shellEl.style.setProperty("--editor-viewport-top", `${viewport.offsetTop}px`);
  };
  const { signal } = this.viewportListeners;
  viewport.addEventListener("resize", sync, { signal });
  viewport.addEventListener("scroll", sync, { signal });
  sync();
}
```

**Escape and focus.** Full screen acts like a modal. Focus stays inside the shell, and Escape exits full screen when no popup is open:

```ts
private onShellKeyDown = (ev: KeyboardEvent) => {
  if (!this.fullscreen || ev.key !== "Escape") return;
  // Dialogs and menus inside the shell handle their own Escape first.
  if (ev.defaultPrevented || this.hasOpenPopup()) return;
  ev.preventDefault();
  this.fullscreen = false;
};

/** Menus, popovers and dialogs the editor opened, not counting tooltips */
private hasOpenPopup() {
  const root = this.el.shadowRoot!;
  return (
    Array.from(root.querySelectorAll("orb-menu, orb-popover")).some((el) => el.matches(":popover-open")) ||
    Array.from(root.querySelectorAll("orb-overlay")).some((el) => (el as HTMLOrbOverlayElement).open)
  );
}

/** Tab past either end of the shell wraps to the other end */
private onSentinelFocus = (at: "start" | "end") => {
  if (at === "start") this.focusLast();   // the content, or the sidebar when it's shown
  else this.focusFirst();                 // the menubar, or the toolbar
};
```

- **The "Escape, then Tab to leave" rule from 1.1 doesn't apply in full screen.** In full screen, Escape exits full screen, and Tab can't leave the shell. Leaving would move focus to page content the shell is covering.
- **Rendering** (outline; the label, note and error slots from 0.9 surround the shell):

  ```tsx
  <div
    ref={(el) => (this.shellEl = el)}
    class="shell"
    part="shell"
    role={full ? "dialog" : undefined}
    aria-modal={full ? "true" : undefined}
    aria-label={full ? "Editor" : undefined}
    onKeyDown={this.onShellKeyDown}
  >
    {full && <span tabindex={0} class="sentinel" onFocus={() => this.onSentinelFocus("start")} />}
    {this.showMenubar && this.renderMenubar()}
    {this.toolbarPlacement === "top" && this.renderToolbar()}
    {/* split view: outline | content | comments */}
    {this.showWordCount && this.renderFooter()}
    {/* tooltips, menus, popovers, overlays */}
    {full && <span tabindex={0} class="sentinel" onFocus={() => this.onSentinelFocus("end")} />}
  </div>
  ```

  ```ts
  private get showMenubar() {
    return this.menubar === "always" || (this.menubar === "fullscreen" && this.fullscreen);
  }
  ```

- **Exiting** puts the caret back in the editor and scrolls the host into view with `scrollIntoView({ block: "nearest" })`. The menubar's **View > Full screen** item and its toolbar button both call `toggleFullscreen()`. There's no default shortcut.

**CSS (`rich-text.css`).** The border, radius and background move from `:host` to `.shell`, so the full-screen view doesn't inherit the inline editor's border:

```css
/**
 * @prop --editor-fullscreen-bg: Background of the editor while it fills the window
 * @prop --editor-fullscreen-width: Width of the writing column while it fills the window
 */

:host([fullscreen]) {
  height: var(--editor-placeholder-height);
}

.shell {
  display: flex;
  flex-direction: column;
  border: 2px solid var(--editor-border-color);
  border-radius: var(--editor-border-radius);
  background: var(--editor-bg);
  overflow: hidden;
}

/* Overrides the browser's popover styles, which center a box that fits its content. */
.shell:popover-open {
  position: fixed;
  inset: auto 0;
  top: var(--editor-viewport-top, 0);
  width: 100vw;
  max-width: none;
  height: var(--editor-viewport-height, 100dvh);
  max-height: none;
  margin: 0;
  padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
  border: 0;
  border-radius: 0;
  background: var(--editor-fullscreen-bg, Canvas);
  color: var(--editor-text-color);
}

.shell:popover-open .editor-content {
  max-height: none;
  flex: 1;
  width: min(100%, var(--editor-fullscreen-width, 816px));
  margin-inline: auto;
  /* Scrolling past the end doesn't scroll the page behind. */
  overscroll-behavior: contain;
}

.sentinel {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
}
```

**Other notes:**

- **Safe-area padding** only takes effect if the page's viewport meta tag includes `viewport-fit=cover`. Mention that in the docs.
- **Stacking:**
  - the editor's menus, popovers and tooltips open after the shell, so they stack above it;
  - `orb-overlay` uses `showModal()`, which also stacks above it, and focus stays inside its dialog;
  - a popover opened by another component on the page also stacks above it, which is the right behavior for things like toasts.

**Menubar:** `<orb-menubar label="Editor">` built from the command list:

| Menu | Items |
|---|---|
| File | New from template, Open…, Save, Versions ▸, Download as ▸, Page setup…, Print |
| Edit | Undo, Redo, Select all |
| View | Outline, Comments, Word count, Show suggestions, Full screen, HTML source |
| Insert | Image, Video, Table, Separator, Page break, Special character, Emoji, Parameter, TOC |
| Format | Text ▸, Text style ▸, Quote, Code block, Align ▸, Line height ▸, Lists ▸, Clear formatting |
| Table | Shown while in a table |
| Tools | Word count, Spellcheck (toggle) |
| Help | Keyboard shortcuts |

Shortcut text goes in `<kbd slot="details">`, as the `orb-menubar` docs do. One `orbSelect` listener on the menubar runs `COMMANDS.get(value)`. Cut, copy and paste are left out of the menu, because pasting from a menu needs clipboard permission.

**Tests for 5.1:**

- setting `fullscreen` from code works without a click;
- the page's scroll position is the same after exiting;
- Escape closes an open menu first, and exits full screen on the second press;
- Tab wraps inside the shell;
- selection and undo history survive entering and exiting.

Check the on-screen keyboard behavior on a real iPhone; Playwright's WebKit doesn't emulate `visualViewport` and the iOS keyboard.

### 5.2 Interface modes

```ts
/**
 * - **edit**: Changes apply directly.
 * - **suggest**: Changes are marked as suggestions to accept or reject.
 * - **comment**: Can add comments, but not edit.
 * - **view**: Read-only.
 * - **preview**: Read-only, with placeholders showing sample values.
 */
@Prop({ reflect: true }) mode: "edit" | "suggest" | "comment" | "view" | "preview" = "edit";

/** Where the formatting controls appear */
@Prop() toolbarPlacement: "top" | "floating" | "none" = "top";

private get editable() {
  return !this.isDisabled && !this.readonly && (this.mode === "edit" || this.mode === "suggest");
}
```

- **`readonly` stays** as a standard form attribute (0.9). `mode="view"` and `readonly` behave the same for editing. `view`, `comment` and `preview` are left out of validation in `syncValidity`, as `readonly` is.
- **Floating toolbar:** an `orb-popover` at `caretAnchor(selection)`, shown while text is selected. It uses the same control rendering as the top toolbar.
- **HTML source view:** **View > HTML source** swaps the content for a `<textarea>` with the normalized output. Switching back sanitizes, normalizes and applies it as one undo step.
- **Commands** have `enabled()` checks against the mode: for example, comment commands only in `comment`, `edit` or `suggest`.

### 5.3 Print, page setup, page breaks, margins, header and footer

Pages are print only. There is no on-screen page layout.

**HTML: page settings** are a hidden, non-editable block kept first in the content, so undo, saving and versions include them automatically:

```html
<div hidden data-orb-page data-size="letter" data-orientation="portrait"
  data-margins="1in 1in 1in 1in"
  data-header-center="{title}" data-footer-right="Page {page} of {pages}"></div>
```

- The component keeps the settings in a `@State() page: PageSettings`, read from that block after load and after undo or redo.
- Cleanup re-creates the block from state if a delete removes it.
- Default settings produce no block at all.

**HTML: page breaks:** `<hr data-page-break style="break-after: page">`. The inline style makes it work outside the editor too. In the editor, CSS draws a dashed line labeled "Page break". Mod+Enter inserts one. Handling otherwise matches separators (1.4).

**Page setup:** an `orb-overlay` with paper size (Letter, Legal, A4, A5), orientation, four margins, and left, center and right text for the header and footer. A note explains `{page}`, `{pages}`, `{title}` and `{date}`. Applying is one undo step.

**Printing (`convert/print.ts`).** It prints from a hidden iframe because `@page` rules don't work inside a shadow root, and printing the whole page would include everything else on it:

```ts
@Method()
async print() {
  const html = this.output().html;
  const frame = Object.assign(document.createElement("iframe"), { title: "Print" });
  frame.style.cssText = "position:fixed;width:0;height:0;border:0;visibility:hidden";
  frame.srcdoc = `<!doctype html><html><head><title>${escapeHtml(this.docTitle)}</title>
    <style>${contentStyles}${pageRules(this.page, this.docTitle)}</style></head><body>${html}</body></html>`;
  document.body.append(frame);
  await new Promise((resolve) => frame.addEventListener("load", resolve, { once: true }));
  await Promise.all(Array.from(frame.contentDocument!.images, (img) => img.decode().catch(() => {})));
  frame.contentWindow!.addEventListener("afterprint", () => frame.remove(), { once: true });
  frame.contentWindow!.print();
}
```

- `contentStyles` is `import contentStyles from "./content.css"`, following `grid.tsx`.
- Mod+P inside the editor calls `print()`.
- A new `doc-title` prop provides `{title}`.

**Page rules:**

```ts
function pageRules(p: PageSettings, title: string) {
  const box = (text?: string) => (text ? `content: ${toCssContent(text, title)};` : "");
  return `@page {
    size: ${p.size} ${p.orientation};
    margin: ${p.margins};
    @top-left { ${box(p.headerLeft)} } @top-center { ${box(p.headerCenter)} } @top-right { ${box(p.headerRight)} }
    @bottom-left { ${box(p.footerLeft)} } @bottom-center { ${box(p.footerCenter)} } @bottom-right { ${box(p.footerRight)} }
  }`;
}
// toCssContent("Page {page} of {pages}") → "\"Page \" counter(page) \" of \" counter(pages)"
```

Recent Chrome supports `@page` margin boxes. Check Firefox and Safari. Where they're unsupported, pages print without a header and footer; margins and size still apply.

### 5.4 Import and export

```ts
export type ExportFormat = "html" | "text" | "markdown" | "docx" | "json";
export type ImportFormat = "html" | "text" | "markdown" | "docx";

export interface ExportOptions {
  /** For formats that can't store suggestions. HTML and DOCX keep them. */
  suggestions?: "accept" | "reject";
}

/** The document in another format. DOCX is a Blob, JSON is an object, the rest are strings. */
@Method()
async exportAs(format: ExportFormat, options: ExportOptions = {}): Promise<string | Blob | DocNode> {
  const doc = this.outputDocument(options);           // normalized copy, suggestions resolved if asked
  switch (format) {
    case "html": return doc.innerHTML;
    case "text": return toText(doc);
    case "markdown": return (await import("./convert/markdown")).toMarkdown(doc);
    case "json": return (await import("./convert/json")).toJSON(doc);
    case "docx": return (await import("./convert/docx")).toDocx(doc, this.page);
  }
}

/** Replaces the document, or inserts at the caret, from another format. Undoable. */
@Method()
async importFrom(format: ImportFormat, data: string | Blob, { replace = true } = {}) { /* … */ }

/** Emitted by File > Download as. Call preventDefault() to handle the file yourself. */
@Event({ cancelable: true }) orbExport: EventEmitter<{ format: ExportFormat; data: string | Blob | DocNode }>;
```

- **Markdown (`convert/markdown.ts`):**
  - **Import:** markdown-it with GFM tables and strikethrough (both built in). Task-list items are found after rendering: list items starting with `[ ]` or `[x]` become checkboxes.
  - **Export:** a hand-written converter that walks the schema:
    - paragraphs, headings, quotes, nested lists and tasks, fenced code with its language, `---`, images, links and the bold/italic/strike/code marks;
    - tables become GFM tables, using `<br>` inside cells;
    - Markdown special characters in text are escaped;
    - underline, colors, fonts, alignment, indent, line height, page settings and comments are dropped (lossy, documented).
- **DOCX:**
  - **Import:** mammoth to HTML, then sanitize and normalize. mammoth keeps structure (headings, lists, tables, images) and drops direct formatting such as colors; document this.
  - **Export:** the `docx` library, walking the schema:
    - paragraphs and headings with `HeadingLevel`;
    - text runs with bold, italics, underline, strike, color, size (in half-points), font and shading;
    - lists through a numbering configuration;
    - tables, images (`ImageRun` from data URLs or fetched URLs; failures become alt text), hyperlinks and page breaks;
    - section page size and margins;
    - headers and footers with `PageNumber` fields.

    Comments and suggestions map to `docx` comments and to inserted/deleted text runs. Verify the library supports both when building Phase 7.
- **JSON:** a plain tree of `{ type, attrs?, marks?, text?, children? }` derived from the schema. `getJSON()` is shorthand for it.
- **PDF:** **File > Download as > PDF** calls `print()`.
- **Pasting from Word (`sanitize.ts`):** `p.MsoListParagraph*` with `mso-list: lN levelM` styles become real nested lists. The `span[style*="mso-list:Ignore"]` bullet text is removed.
- **File > Open…** accepts `.md`, `.markdown`, `.docx`, `.html`, `.htm` and `.txt` through the existing hidden file input, choosing the format from the extension.
- **Optional `form-format="html" | "markdown" | "text"` prop** chooses what the form submits (0.9). Markdown needs its converter loaded before the first sync. HTML stays the default.
- **Dependencies:** `markdown-it` is already there. Add `mammoth`, `docx`, `prismjs`, `emojibase-data` and `diff` (jsdiff). Like `markdown-it`, they're dev dependencies, imported with `import()` so each becomes its own chunk.

---

## Phase 6: Saving and history

### 6.1 Save and unsaved state

```ts
/** Shows a Save button in the toolbar */
@Prop() showSave = false;

/**
 * Saves the document. While its promise is pending, the button shows a loading
 * state. The document is marked saved only if it resolves. Without it, the
 * document is marked saved as soon as `orbSave` is emitted.
 */
@Prop() save?: (content: SaveDetail) => Promise<void> | void;

/** Emitted when the user saves, from the button or Mod+S. Call preventDefault() to cancel. */
@Event({ cancelable: true }) orbSave: EventEmitter<SaveDetail>;

/** Emitted when the document becomes saved or unsaved */
@Event() orbDirtyChange: EventEmitter<boolean>;

@State() saving = false;
private savedHtml = "";

/** Marks the current content as saved, such as after saving it yourself */
@Method()
async markSaved() {
  this.savedHtml = this.output().html;
  this.syncDirty();
}

private async runSave() {
  if (this.saving) return;
  const detail = { html: this.output().html, text: this.output().text };
  if (this.orbSave.emit(detail).defaultPrevented) return;
  if (!this.save) return this.markSaved();
  this.saving = true;
  try {
    await this.save(detail);
    this.savedHtml = detail.html;                     // what was saved, even if typing continued
  } finally {
    this.saving = false;
    this.syncDirty();
  }
}

private syncDirty() {
  const dirty = this.output().html !== this.savedHtml;
  if (dirty === this.internals.states.has("dirty")) return;
  toggleState(this.internals.states, "dirty", dirty);
  this.orbDirtyChange.emit(dirty);
}
```

- The Save button is an `orb-button` with `pending={this.saving}`. A dot shows while there are unsaved changes.
- `savedHtml` starts as the output after loading `value` or `setContent`.
- `orbEditorChange` keeps firing on every edit; `orbSave` is the separate save event.
- A form reset (0.9) doesn't mark the document saved; unsaved state is still compared against the last save.

### 6.2 Versions and compare

```ts
export interface VersionInfo { id: string; label: string; date?: string; author?: string }

/** Earlier versions, newest first, shown in the toolbar's Versions menu */
@Prop() versions: VersionInfo[] = [];

/** Returns a version's HTML */
@Prop() loadVersion?: (id: string) => Promise<string>;

/** Emitted after a version is restored into the editor */
@Event() orbVersionRestore: EventEmitter<{ id: string }>;

@State() preview?: { version: VersionInfo; html: string; compare: boolean };
```

- **Versions menu:** an `orb-menu` listing versions, each with an `orb-relative-time` in `slot="details"`.
- **Previewing a version:**
  - the editing area is replaced by a read-only view of that version (sanitized and normalized);
  - the toolbar is replaced by a bar: "Viewing *label*" with **Restore**, **Compare with current**, and **Back**;
  - undo history and the live content aren't touched.
- **Restore** brings the version in as one undo step through `apply()`, and emits `orbVersionRestore`. The document becomes unsaved.
- **Compare (`convert/diff.ts`, using jsdiff loaded on first use):**
  1. flatten both documents into blocks, each with a signature (tag, attributes, inline HTML);
  2. use `diffArrays` to find added, removed and changed blocks;
  3. for changed text blocks, use `diffWordsWithSpace` on the text for word-level changes;
  4. render with the same styling as suggestions. A changed block with the same text is marked "formatting changed".

### 6.3 Undo history across refresh (`editing/history-store.ts`)

```ts
/** Identifies the document, so its undo history can be restored after a refresh. Unique per document. */
@Prop() historyKey?: string;

/**
 * Keeps undo history in IndexedDB while this tab is open, so it survives a
 * refresh. Requires `history-key`. The history is written to disk; leave this
 * off for sensitive documents on shared computers.
 */
@Prop() persistHistory = false;

/** Deletes this document's saved undo history, such as on logout */
@Method() async clearHistory() { /* … */ }
```

The prop is `history-key`, not `key`, because React and Stencil reserve `key` in JSX and never pass it to the element. If two editors on the same page share a `history-key`, log a warning.

**Storage layout:** database `orb-rich-text`, with two stores:

- **`docs`**, keyed by `${session}:${historyKey}`: `{ session, lastSeen, base, baseIndex, headHash, index }`;
- **`steps`**, keyed by `[docKey, index]`: one change step each.

New steps are written one at a time, so each write is small. When steps fall past the limit, they're applied into `base` in batches of 50. The whole history is loaded when the editor starts, so undo stays synchronous.

**Tab sessions and cleanup.** IndexedDB is shared by every tab on the site, but sessionStorage belongs to a single tab, so cleanup can't rely on sessionStorage alone or it would delete other tabs' history. Each tab holds a Web Lock named after its session ID; locks are released automatically when a tab closes.

```ts
const SESSION = "orb-rich-text:session";
const GRACE_MS = 5 * 60_000;

/** This tab's id. Survives a refresh, but not a closed tab. A duplicated tab gets a new one. */
async function claimSession(): Promise<string> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const id = (attempt === 0 && sessionStorage.getItem(SESSION)) || uid();
    const got = await new Promise<boolean>((resolve) =>
      navigator.locks.request(`orb-rich-text:${id}`, { ifAvailable: true }, (lock) => {
        resolve(!!lock);
        return lock ? new Promise(() => {}) : undefined;   // held until the tab closes
      }),
    );
    if (got) { sessionStorage.setItem(SESSION, id); return id; }
  }
  throw new Error("No session");
}

/** Deletes histories whose tab is closed. The grace period covers the gap during a refresh. */
async function collectGarbage(db: IDBDatabase) {
  const held = new Set((await navigator.locks.query()).held?.map((lock) => lock.name));
  // delete docs (and their steps) where !held.has(`orb-rich-text:${doc.session}`) && Date.now() - doc.lastSeen > GRACE_MS
}
```

- **Duplicated tabs:** Chrome copies sessionStorage when duplicating a tab. The copy finds its ID's lock already held and creates a new ID.
- **Restoring:** on load, rebuild the HTML from `base` plus the steps. If its hash doesn't match the normalized `value` the editor was given, throw the stored history away. Content restored by the browser (`formStateRestoreCallback`, 0.9) goes through the same check.
- **`uid()`** in `utils/ids.ts` uses `crypto.randomUUID`, with a `getRandomValues` fallback for pages not served over HTTPS.
- **Fallbacks:** if IndexedDB or Web Locks aren't available, or storage is full, history stays in memory. The editor warns once in the console.
- **Writes** happen from `History.onRecord`, plus `lastSeen` updates when the page is hidden or closed (`visibilitychange` and `pagehide`).
- **Tests:** Playwright can test the multi-tab cases with several pages in one browser context.

---

## Phase 7: Collaboration

Comments and suggested changes only. No real-time collaboration.

### 7.1 Comments

```ts
export interface Author { id: string; name: string; color?: string }

export interface CommentThread {
  id: string;
  author: Author;
  date: string;
  body: string;
  resolved?: boolean;
  replies?: { id: string; author: Author; date: string; body: string }[];
}

/** Who's editing. Used for comments and suggestions. */
@Prop() author?: Author;

/** Comment threads. Their anchors are stored in the HTML. */
@Prop({ mutable: true }) comments: CommentThread[] = [];

/** Shows the comments sidebar */
@Prop({ reflect: true }) commentsPanel = true;

@Event({ cancelable: true }) orbCommentAdd: EventEmitter<CommentThread>;
@Event({ cancelable: true }) orbCommentReply: EventEmitter<{ threadId: string; reply: CommentReply }>;
@Event({ cancelable: true }) orbCommentResolve: EventEmitter<{ threadId: string; resolved: boolean }>;
@Event({ cancelable: true }) orbCommentDelete: EventEmitter<{ threadId: string }>;
```

- **Data flow:** the editor updates `comments` itself and emits an event; if the event is canceled, it reverts. The app stores the thread data; the anchors live in the HTML.
- **HTML:** `<span data-comment="c1 c2">`. A list of IDs handles overlapping comments:

  ```ts
  export function addAnchor(root: HTMLElement, range: Range, id: string): Range {
    const split = splitBoundaries(range);
    const nodes = selectedTextNodes(root, split);
    for (const node of nodes) {
      const existing = closestMatching(node, root, "span[data-comment]");
      if (existing) {
        const own = splitAround(existing, node);
        own.dataset.comment = `${own.dataset.comment} ${id}`;
      } else {
        wrapEach([node], () => Object.assign(document.createElement("span"), { dataset: { comment: id } }));
      }
    }
    mergeAdjacentAnchors(root);
    return spanOf(nodes);
  }

  export function removeAnchor(root: HTMLElement, id: string) {
    // remove id from each list; unwrap spans left without ids
  }
  ```

- **Typing at the end of a comment** inserts outside it, using the same `splitOut` as pending formats, so comments don't grow as you type.
- **Clear formatting** leaves comment anchors alone (`kind: "annotation"`). Anchors are stripped from pasted content.
- **Highlighting:**
  - `content.css` styles `span[data-comment]` with `--editor-comment-bg`;
  - the active thread's anchors get `data-active`, and resolved ones `data-resolved`; both are runtime-only attributes set from `comments`.
- **Sidebar (`ui/sidebar.tsx`):** in the right `orb-split-panel`.
  - **Positioning:** each card's top matches its anchor's position in the scrolling content. Overlapping cards are pushed down, and the active card is pulled level with its text. Recalculated on change, scroll and resize.
  - **Card contents:** author, `orb-relative-time`, body, replies, a reply `orb-textbox` (textarea), Resolve, and Delete (own comments only).
  - **Narrow editors** (under 600px): no sidebar. Clicking highlighted text opens the thread in a popover.
  - **Orphaned comments** (anchor text deleted) show in a "Detached" section.
- **Adding a comment:** the `comment` command (Mod+Alt+M) needs selected text. It anchors a draft id and focuses a draft card; submitting emits `orbCommentAdd`, and canceling removes the anchor.
- **Comment mode:** the content is read-only, but text can still be selected, and `getRange` works on read-only content.

### 7.2 Suggested changes

**HTML:**

```html
<ins data-suggestion="s1" data-author="u1" data-author-name="Ada" data-date="2026-11-17T10:00:00Z">new text</ins>
<del data-suggestion="s2" data-author="u1" data-author-name="Ada" data-date="…">old text</del>
```

Underline and strikethrough are identified as `u` and `s` only. Plain `ins` and `del` from outside sources are converted to `u` and `s` when pasted (0.2–0.3).

**Editing in `mode="suggest"`** (in the `beforeinput` handler):

```ts
export function suggestInsert(root: HTMLElement, range: Range, text: string, author: Author): Range {
  if (!range.collapsed) range = suggestDelete(root, range, author, "forward");
  const own = ownInsertionAt(root, range, author);     // an <ins> by this author the caret is in or right after
  if (own) return insertTextAt(range, text);
  const at = splitOut(root, range, ["DEL"]);           // never type inside a deletion
  const ins = suggestionElement("ins", author);
  ins.textContent = text;
  at.insertNode(ins);
  return endOf(ins);
}

export function suggestDelete(root: HTMLElement, target: Range, author: Author, direction: "backward" | "forward"): Range {
  const split = splitBoundaries(target);
  const nodes = selectedTextNodes(root, split);
  for (const node of nodes) {
    const ins = closestMatching(node, root, "ins[data-suggestion]");
    if (ins?.dataset.author === author.id) { node.remove(); removeIfEmpty(ins); continue; }   // your own insert: really delete
    if (closestMatching(node, root, "del[data-suggestion]")) continue;                         // already deleted
    wrapSuggestion(node, "del", author);                // joins an adjacent deletion by the same author
  }
  return direction === "backward" ? startOf(nodes[0]) : endOf(nodes[nodes.length - 1]);
}
```

- **What's being deleted** comes from `event.getTargetRanges()`. It already covers word and line deletes, so the editor doesn't work out ranges itself.
- **Joining adjacent suggestions:** `wrapSuggestion` merges with a neighboring suggestion when the author matches, keeping that suggestion's ID. `wrapEach`'s exact-attribute comparison would never match, because IDs and dates differ.
- **Paste** marks the selection as deleted, then wraps the pasted text in `ins`.
- **Input methods (IME):** text being composed can't be intercepted (`insertCompositionText` isn't cancelable). On `compositionend`, the editor wraps the composed text in `ins`, using the position saved at `compositionstart`.
- **v1 scope:** paragraph splits and formatting commands apply directly. This is documented.

**Accepting and rejecting:**

```ts
export function resolveSuggestion(root: HTMLElement, id: string, accept: boolean) {
  for (const el of root.querySelectorAll<HTMLElement>(`[data-suggestion="${CSS.escape(id)}"]`)) {
    const keep = (el.tagName === "INS") === accept;
    if (keep) el.replaceWith(...Array.from(el.childNodes));
    else el.remove();
  }
}
```

- **Commands:** accept or reject the suggestion at the caret, accept all, reject all. They also appear on sidebar cards ("Ada suggested: Delete 'old text'" with ✓ and ✗).
- **Events:** `orbSuggestionAccept` and `orbSuggestionReject` (`{ id }`), after the change.
- **Display:**
  - `ins` is underlined and `del` struck through, in the author's color;
  - author colors come from `author.color` or a hue derived from a hash of the author's id;
  - **View > Show suggestions** off hides `del` and removes the `ins` styling.
- **Counts and text export:** word count, `getText()` and lossy exports respect `ExportOptions.suggestions`, defaulting to `"reject"`.

---

## Testing and docs, in every phase

- **Playwright:** `tests/rich-text-*.spec.ts` in Chromium, Firefox and WebKit. Each feature gets:
  - output tests through `getContent` (normalized);
  - keyboard tests with `page.keyboard`;
  - undo round-trips (do something, undo, compare the HTML; redo, compare again);
  - a paste test (`ClipboardEvent` with a `DataTransfer`) for anything with a paste path.
- **Accessibility:** roles checked through the Chromium accessibility-tree helper in `menu.spec.ts`.
- **`rich-text.md`** gets a section and a live demo per feature, a **Manual test** list, a keyboard table, and an accessibility checklist, in the `menubar.md` format.
- **CSS custom properties** each feature adds are documented at the top of `rich-text.css` or `content.css`.

## Not in this plan

- writing assistants (only `spellcheck` is included); shelved for now;
- on-screen page layout;
- merging table cells;
- real-time collaboration;
- recording formatting changes and paragraph splits as suggestions;
- `minlength` / `maxlength` validation (apps can use `setCustomValidity`);
- a `labels` prop for translating the UI (all strings are English today; worth planning separately).

## Where to start

A good first slice is the module split (0.1) plus the schema and cleanup step (0.2–0.3). It's mostly moving existing code around, and it fixes the paste bugs right away.
