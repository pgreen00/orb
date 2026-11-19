# `orb-channel` implementation plan

The phased plan for building `orb-channel`, a custom element for chat interfaces: direct chats, group chats, and open channels with threads. It starts from the API sketch in `channel-brainstorming.md`, and changes it where the rendering model requires it: styling, slots, and event names.

## Decisions

| Decision | Choice |
|---|---|
| Rendering | The channel renders everything in its own shadow root. Child elements only carry data and settings, and never render anything themselves. |
| Slots | Only for customizing the header (`header-start`, `header-title`, `header-end`) and for custom icons (`slot="icon"`). Everything else comes from a child element or an attribute. |
| Header | Built in and shown by default, from `label`, `description` and the participants. Slots customize it. |
| Icons | Actions, commands and suggestions take a custom icon from a child with `slot="icon"`, and show a basic default icon without one. |
| `/` in rich-text | Reworked to offer only the commands the app provides, in `orb-rich-text` everywhere, not just in the channel. Block formatting stays on the toolbar, the shortcuts and the Markdown typing rules. |
| Composer toolbar | `toolbar="always | toggle | none"` on `orb-channel-composer`, `toggle` by default. Only the rich editor has one. |
| Local echo | Opt-in, with `echo` on the channel. Without it, the app adds sent messages. It uses the same `client-id` matching as optimistic sends (6.2). |
| Moderation | All of it in v1 (2.9): reporting, approval, hiding and removing, muting, slow mode and moderator actions. The channel shows and asks; the server enforces. |
| Kinds and presets | `kind` (`direct`, `group`, `open`) is who's in the conversation. `preset` (`assistant`, `workspace`, `comments`, `live`) is a familiar format, and sets the attributes people would otherwise have to remember, including `kind`. Every setting is its own attribute. An attribute wins over the preset, and the preset over the built-in default. No `broadcast` preset, and no custom presets until someone asks. |
| Branching | The app stores the tree of edited and regenerated versions. The DOM holds only the path on screen, and `<orb-channel-variants>` shows the switcher (3.8). The channel's model stays a list. |
| Child-to-parent updates | Child elements emit one generic bubbling event, `orbChannelDataChange`, when their props change. A `MutationObserver` on the channel covers what events can't: removed elements and text changes. No registry. |
| Inert content | Rich message content goes in `<script>` tags: `text/markdown`, `text/html`, and `application/json` for tool data. Plain text children are read as text. |
| Sanitizing | HTML from `text/html` scripts and from the rich composer is sanitized before it's rendered, with a chat allowlist that's stricter than rich-text's paste cleanup. |
| Typography | The channel has its own lightweight content styles, tuned for chat. It doesn't copy `native.scss`. Design tokens (`--orb-*`) still apply, since custom properties inherit into shadow roots. |
| Composer | `editor="plain"` renders `orb-textbox` with a `textarea`. `editor="rich"` renders `orb-rich-text`. Rich-text is changed to fit chat directly (Phase 0), with no wrapper component. |
| Threads | No thread element. A reply has `thread="id"`, pointing at the message it replies to. Messages are never nested in the DOM, since data arrives flat and nesting it is extra work for apps. The channel shows threads in a panel or inline. |
| Message order | DOM order. `ts` is only displayed. |
| Transport | None until Phase 6. Until then the channel is local, fed by DOM changes. |
| AI protocols | None built in. The core has a protocol-neutral message writer (3.9), and `channel.md` has a short recipe per SDK (6.6). No adapters for now. |

## Conventions

- **Same as `rich-text-phases.md`:** Stencil and shadow DOM, `orb-` tags, JSDoc on every prop, event, method and part, cancelable events for interception, arrays and objects set as JS properties, custom states through `ElementInternals` and `toggleState`, Playwright specs using `mount()` from `tests/utils.ts` in Chromium, Firefox and WebKit.
- **Events are camelCase**, like the rest of the codebase (`orbValueChange`, `orbEditorChange`). The brainstorm's `orb-channel-send` becomes `orbSend` on `orb-channel`.
- **User-facing events fire from `orb-channel`**, since that's where the UI is. Their `detail` includes the child element involved (`message`, `toolCall`, `composer`), so an app can answer by changing that element.
- **Each child element is its own component folder**, like `menu-item` and `wizard-item`: `src/components/channel-message/`, `src/components/channel-participant/`, and so on.
- **Build the UI from existing Orb components** inside the shadow root: `orb-textbox`, `orb-rich-text`, `orb-button`, `orb-menu`, `orb-popover`, `orb-tooltip`, `orb-details`, `orb-pill`, `orb-relative-time`, `orb-copy-button`, `orb-loading`.

## Phases at a glance

| Phase | Contents | Estimate (1 developer) |
|---|---|---|
| 0. Rich-text changes | Enter to send, `/` reworked for app commands, bottom toolbar, utility slots, compact variant | 2–3w |
| 1. Foundation | Child elements and the change event, the model, text messages, participants, grouping, filling in settings from `kind` and `preset`, header, styles, plain composer, local echo | 3.5–4.5w |
| 2. Content | Markdown and HTML messages, sanitizing, rich composer, mentions, commands, reactions, attachments, dividers, unread, message actions, moderation | 4.5–6w |
| 3. AI | Streaming, reasoning, tool calls and approval, stop, citations, suggestions, variants, message writer | 3–4w |
| 4. Scale | Threads, virtualization, paging, jump to latest, receipts, typing, presence | 3.5–5w |
| 5. Formats | Layouts, scrolling options, announcements, votes, sorting, action lists, coalescing, presets | 2.5–3.5w |
| 6. Transports | Transport interface, optimistic sends, declarative transports, participant sources, drafts, AI recipes | 1.5–2.5w |

**Total: about 20.5–28.5 weeks.** These are rough. Each phase ends with its tests and an update to `channel.md`.

---

## Architecture

### How data flows

```mermaid
flowchart TD
    A[Child elements in the light DOM] -->|orbChannelDataChange, MutationObserver| B[Dirty items]
    B -->|re-read once per frame| C[Channel model]
    C --> D[Render in the channel's shadow root]
    D -->|user actions| E[Cancelable events on orb-channel]
    E -->|app changes child elements| A
```

### Child elements

Each child element:

- Uses `shadow: true` and renders an empty `<Host>`. A shadow root without a slot hides its light-DOM children, so nothing shows, even outside a channel.
- Declares `@Event() orbChannelDataChange: EventEmitter<void>` (bubbles, not composed), and emits it from one `changed()` method that stacks a `@Watch` for each prop, like `handleStateChange` in `orb-file-input`.
- Emits it once from `componentDidLoad`. Stencil loads components lazily, so a child may upgrade after the channel first reads it.

The channel listens for `orbChannelDataChange`, finds what changed with `event.target.closest(...)` (the message, participant, or composer), and marks it dirty.

Events can't cover everything, so the channel also observes itself with `childList`, `characterData` and `subtree`:

- A removed element is already detached, so its event can't reach the channel.
- Streamed text, into a text node or a `<script>`, changes text, not props.

Attributes don't need observing. Every documented attribute is a prop, so a change runs its `@Watch`, which emits the event.

Dirty items are re-read once per animation frame, so a burst of streamed tokens is one render.

The channel writes to its children in only a few places: the composer's form value (1.5), echoed messages (1.5) and optimistic messages (6.2). It ignores the change events its own writes cause.

### Slots

The channel's shadow root has named slots only, and no default slot, so child elements that aren't slotted are never shown.

- **Header slots** take direct children of `orb-channel`, like any slot. Their content is the app's, so page styles apply to it.
- **Icon slots** are on child elements that are deeper down, such as an action inside the composer. A slot can only take the host's direct children, so the channel copies the icon into its shadow root instead. Page styles don't reach the copy, so icons should use `currentColor`. To change an icon, replace the element: the observer sees added and removed children, but not attribute changes inside an SVG.

### The model

```ts
interface ChannelModel {
  participants: Map<string, Participant>;
  /** Messages without `thread`, in DOM order */
  messages: MessageModel[];
  /** Replies, by the id in their `thread`, in DOM order */
  replies: Map<string, MessageModel[]>;
}

interface MessageModel {
  el: HTMLElement;
  id: string;
  from: string;
  ts?: string;
  status?: MessageStatus;
  /** The id of the message this replies to */
  thread?: string;
  /** In DOM order */
  parts: Part[];
  reactions: Reaction[];
  version: number;
}

type Part =
  | { type: "text"; text: string }
  | { type: "markdown"; source: string }
  | { type: "html"; fragment: DocumentFragment } // sanitized
  | { type: "reasoning"; el: HTMLElement; state: string; text: string }
  | { type: "tool-call"; el: HTMLElement; name: string; status: string; args?: unknown; result?: unknown }
  | { type: "attachment"; el: HTMLElement }
  | { type: "citation"; el: HTMLElement };
```

Models are cached in a `WeakMap<Element, MessageModel>`. Only dirty ones are read again.

A message's parts come from its `childNodes`, in order. Text runs become text parts, `<script>` tags become markdown or HTML parts, and child elements become their own typed part. Reactions aren't positional, so they're collected separately. An `orb-channel-message` inside another message is ignored, with a console warning, since replies use `thread`.

### Rendering

Stencil JSX in `channel.tsx`, with rows and parts as functional components in `render/`. If profiling shows long lists re-rendering too much, rows can become an internal `shadow: false` component. That still renders into the channel's shadow tree, so styles and parts keep working.

There are no nested shadow roots, so one stylesheet styles everything and `::part()` reaches every element.

### Module layout

```
src/components/channel/
  channel.tsx            root: props, events, methods, listeners, render
  channel.css            chrome; CSS custom properties documented at the top
  channel.md
  model/
    types.ts
    parse.ts             child elements to model
    content.ts           text, markdown and HTML parts; streaming markdown
    sanitize.ts          chat allowlist, on top of rich-text's sanitize()
  writer.ts              createMessageWriter (3.9), exported from src/index.ts
  render/
    header.tsx  message.tsx  parts.tsx  composer.tsx  thread.tsx  divider.tsx
src/components/channel-participant/  channel-message/  channel-divider/  ...
src/styles/
  _chat-content.scss     chat content styles, shared with orb-rich-text's compact variant
src/utils/
  markdown.ts            the markdown-it loader, moved out of orb-markdown
```

### Styling

Parts live in the channel's shadow root, so they're styled from `orb-channel`, not from the child elements. State goes into part names, and `::part()` with several names matches only elements that have all of them:

```css
orb-channel::part(bubble) { border-radius: 1rem; }
orb-channel::part(message self) { … }
orb-channel::part(bubble streaming) { … }
orb-channel::part(message ai first-in-group) { … }
```

- **Parts:** `header`, `header-title`, `header-description`, `header-avatars`, `list`, `message`, `bubble`, `avatar`, `name`, `badge`, `time`, `status`, `reactions`, `thread-badge`, `reasoning`, `tool-call`, `variants`, `divider`, `composer`, `toolbar-toggle`, `jump-pill`, `thread-panel`.
- **State names on `message` and `bubble`:** `self`, `ai`, `streaming`, `failed`, `unread`, `first-in-group`, `last-in-group`, `pinned`, `deleted`, `pending`, `hidden`, `removed`.
- **Channel custom states:** `:state(streaming)`, `:state(thread-open)`, `:state(offline)`.
- **Participant colors:** an `accent` attribute on `orb-channel-participant`, copied into `--accent` on that participant's messages. CSS variables set on a child element don't reach the messages rendered in the shadow root.
- **Custom properties** on `orb-channel`, such as `--orb-channel-gap`, `--orb-channel-max-width`, `--orb-channel-bubble-background` and `--orb-channel-self-background`.

### Content styles

`src/styles/_chat-content.scss` holds a small set of styles for paragraphs, lists, links, inline code, code blocks, blockquotes, mentions (`[data-mention]` chips), commands (`[data-command]` chips) and images. Line height and spacing are tighter than in `native.scss`, and everything is built from tokens.

`channel.css` uses it, and so does `orb-rich-text`'s compact variant (0.5), so a message looks the same in the composer and once it's sent.

### Kinds and presets

`kind` is who's in the conversation. `preset` is a familiar format: it sets the attributes people would otherwise have to remember to set for it. Every setting is an attribute of its own, and the first of these that has a value wins:

1. The attribute on the element.
2. The preset. It also sets `kind`, when `kind` isn't set.
3. The built-in default, which can depend on `kind`.

#### Filling in the settings

Props that a preset or `kind` can set have no default in their declaration, so a prop the app hasn't set is `undefined`:

```ts
/** How messages are laid out. The default depends on `preset` and `kind`. */
@Prop({ mutable: true }) layout?: Layout;
```

Their JSDoc points to the tables below, so the generated docs don't claim a default that a preset changes. `componentWillLoad` fills them in before the first render, like `orb-checkbox` sets `defaultChecked`:

```ts
componentWillLoad() {
  const preset = PRESETS[this.preset] ?? {};
  this.kind ??= preset.kind ?? "direct";
  const builtIn = BUILT_IN[this.kind];
  for (const key of SETTINGS) this[key] ??= preset[key] ?? builtIn[key];
}
```

- **Changing `preset` or `kind` later:** the channel remembers which props it filled in, and fills those in again. A prop the app sets is forgotten, so it's never overwritten. The channel ignores the `@Watch` calls caused by its own writes.
- **Props, not attributes:** filled-in values aren't reflected. An htmx or Turbo morph would remove attributes that aren't in the server's HTML, and the channel would take that as the app clearing them.
- **Composer settings** (`editor`, `send-on`, `toolbar`) are on `orb-channel-composer`, which the channel doesn't write to. The channel follows the same order for them when it renders.
- **Custom presets** (`registerChannelPreset`, like `registerPipe`) wait until someone asks for them.

#### Built-in defaults

By `kind`:

| Setting | `direct` | `group` | `open` |
|---|---|---|---|
| `show-names` | off | on | on |
| `avatars` | off | on | on |
| `receipts` | `read` | `delivered` | `none` |
| `typing` | on | on | off |
| `presence` | `full` | `full` | `sampled` |
| `threads` | `none` | `none` | `panel` |

The same for every kind: `layout="bubbles"`, `anchor="bottom"`, `follow="bottom"`, `group-within="5m"`, `date-dividers` on, `announce` on, `jump-to-latest` on, `max-depth="1"`, `votes="none"`, no `sorts`, `actions="react reply copy edit delete"`, no `window`, updates once per frame, `reasoning="collapsed"`, and on the composer, `editor="plain"`, `send-on="enter"` and `toolbar="toggle"`.

Without a preset, a channel is a messaging app with bubbles, like WhatsApp or iMessage.

#### Presets

A blank cell leaves the setting to the built-in default.

| Setting | `assistant` | `workspace` | `comments` | `live` |
|---|---|---|---|---|
| Like | ChatGPT, Claude | Slack, Discord | Article comments, YouTube | Twitch, webinars |
| `kind` | `direct` | `open` | `open` | `open` |
| `layout` | `assistant` | `flat` | `flat` | `compact` |
| `show-names`, `avatars` | off, off | | | on, off |
| `receipts`, `typing`, `presence` | `none`, off, `none` | `none` | `none`, off | `none` |
| `threads` | `none` | `panel` | `inline` | `none` |
| `max-depth` | | | 4 | |
| `anchor` | | | `top` | |
| `follow` | `question` | | | |
| `pause-on-scroll` | | | | on |
| `jump-to-latest` | | | off | off |
| `group-within` | | | 0 | 0 |
| `date-dividers` | off | | off | off |
| `announce` | | | off | off |
| `votes`, `sorts` | | | `up-down`, `top new old` | |
| `actions` | `copy regenerate edit` | `react reply copy edit delete pin` | `reply copy-link edit delete report` | `report` |
| `window`, `coalesce` | | | | 200, 250ms |
| Composer `editor` | | `rich` | `rich` | |
| Composer `send-on` | | | `mod-enter` | |

These defaults are a starting point, to be tuned once the channel is in use.

---

## Phase 0: Rich-text changes

These are made in `orb-rich-text` itself, behind props, so document editing doesn't change.

### 0.1 Enter to send

Today `handleKeyDown` always prevents Enter and inserts a paragraph, and whether the trigger menu is open is private. So the channel can't safely take Enter from outside.

- New prop `enterAction: "paragraph" | "submit"`, `paragraph` by default.
- With `submit`, Enter emits a cancelable `orbSubmit` with the same detail as `orbEditorChange` (`html`, `text`, `isEmpty`). It runs after the existing checks: not while an input method is composing, and not while the trigger menu is open, where Enter still picks the item.
- Shift+Enter inserts a line break. Inside a code block, Enter inserts a new line, and Mod+Enter submits.
- Empty content doesn't submit.

### 0.2 `/` for app commands

Today `slashTrigger` offers the editor's own block formatting. That's a mistake: `/` should be for commands the app provides. This changes `orb-rich-text` everywhere, not only in the channel.

- New prop `commands?: (query: string) => TriggerItem[] | Promise<TriggerItem[]>`. `/` at the start of a block offers its items. Without it, `/` is just a character.
- Choosing one inserts a non-editable chip, `<span data-command="id">/name</span>`, then a space, so arguments can be typed after it. Like mentions, the chip is part of the HTML output.
- It emits `orbCommand` with `{ id, label }`.
- It reuses the existing `Trigger` machinery: `items`, `choose`, `async`, `blockStart`.
- Removed: the `SLASH` keyword map in `editing/triggers.ts` and the `slash` field on commands. Block formatting stays on the toolbar, the menubar, the shortcuts and the Markdown typing rules.
- Also changes: the "Menus while typing" section of `rich-text.md` (including the table-cell note), section 4.1 of `rich-text-phases.md`, and the tests that open `/` for block commands in `rich-text-inline.spec.ts` and `rich-text-chrome.spec.ts`. They move to a `commands` lookup.

### 0.3 Toolbar at the bottom

`toolbarPlacement` gets `bottom`. The toggle (2.2) switches between `bottom` and `none`, so rich-text needs nothing more for it. Check that switching keeps focus and the selection in the content, and that the toolbar's overflow is measured again when it reappears.

### 0.4 Utility slots

The same names and behavior as `orb-textbox`: `top-start`, `top-end`, `bottom-start`, `bottom-end`, inside the editor's border. The channel puts attachments in `top-start`, actions in `bottom-start`, and send or stop in `bottom-end`, in the same places for both editors.

These are rich-text's slots, filled by the channel inside its own shadow root.

### 0.5 Compact variant

New prop `variant: "document" | "compact"`, `document` by default. With `compact`:

- Content uses `_chat-content.scss` instead of the document content styles.
- Less shell padding, no word count by default, a minimum height of one line, and no menubar.
- The accessible name can come from `aria-label` without a visible label. Check whether `syncAttributes` already covers this.

### 0.6 Tests

Enter submits and `clear()` empties the editor. Shift+Enter, Enter while composing, Enter with the mention menu open, Enter and Mod+Enter in a code block. `/` with async command items, the chip in the output, and `/` as a plain character without `commands`. Keyboard navigation in the bottom toolbar. Utility slots.

## Phase 1: Foundation

### 1.1 Child element scaffolding

The empty-render, `orbChannelDataChange` pattern, for `orb-channel-participant`, `orb-channel-message`, `orb-channel-divider`, `orb-channel-composer` and `orb-channel-action`.

### 1.2 Model and updates

`parse.ts`, dirty tracking, the once-per-frame flush, and the observer. When two messages have the same id, the later element wins, with a console warning.

### 1.3 Channel attributes

- `kind`: `direct`, `group` or `open`.
- `preset`: `assistant`, `workspace`, `comments` or `live`. Filling in settings from `kind` and `preset` (see Kinds and presets) is built here, with the built-in defaults. The presets themselves come in 5.8.
- `pov`: the id of the participant whose point of view the channel shows. Their messages get the `self` state.
- `readonly`, `disabled`.
- `label`: the header's title, and the accessible name of the message log.
- `description`: the header's second line.
- `show-header`: `true` by default.
- `empty`: text shown when there are no messages.
- `echo`: the channel adds sent messages itself (1.5).

### 1.4 Text messages

- Attributes: `id`, `from`, `ts`, `status`, `edited`.
- Plain text keeps its line breaks, and URLs become links.
- Consecutive messages from one sender are grouped, within `group-within` (5 minutes by default).
- `show-names` and `avatars`, with defaults from `kind`. Times use `orb-relative-time`.
- A `from` with no matching participant shows the id and a generic avatar.

### 1.5 Plain composer

`<orb-channel-composer editor="plain" placeholder="…" max-length="4000" send-on="enter | mod-enter" name="body">`

- Renders `orb-textbox` with a `textarea`, and a send button in `bottom-end`. The channel's styles cap the textarea's height.
- Enter sends, unless an input method is composing.
- Emits a cancelable `orbSend` with `{ text, format, to, composer, message }`. If it isn't canceled, the composer is cleared.
- Without `echo`, the app adds the message, and `message` is `null`.
- With `echo`, the channel appends `<orb-channel-message from="{pov}" client-id="…" status="sent">` after the event, and `message` is that element. A message the app adds later with the same `client-id` replaces it. Optimistic sends (6.2) reuse this code, with `status="sending"`.
- `orb-channel-composer` is form-associated. The channel writes its `value`, and the composer calls `setFormValue` under its `name`. A form reset changes the composer's `value`, which emits the change event, and the channel clears the editor.
- `<orb-channel-action name="attach" label="Attach file">` inside the composer becomes a button in `bottom-start`. Clicking it emits `orbAction` with `{ name, composer }`.
- An action's icon comes from a child with `slot="icon"`, which the channel copies (see Slots). Without one, it shows a basic default icon. The `label` is the button's accessible name and tooltip.

```html
<orb-channel-action name="attach" label="Attach file">
  <svg slot="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">…</svg>
</orb-channel-action>
```

### 1.6 Header

Shown unless `show-header="false"`. Its default content follows `kind`:

| `kind` | Title | Second line | Avatars |
|---|---|---|---|
| `direct` | `label`, or the other participant's name | `description`, or their presence | The other participant |
| `group` | `label`, or the participants' names | `description`, or the member count | A few, stacked |
| `open` | `label` | `description`, or the member and online counts | None |

Slots, all direct children of `orb-channel`:

- `header-start`: before the title, such as a back button.
- `header-title`: replaces the default title, second line and avatars.
- `header-end`: after the title, such as call, search or settings buttons.

```html
<orb-channel kind="group" pov="ada" label="Design team">
  <orb-button slot="header-start" fill="clear" aria-label="Back">…</orb-button>
  <orb-button slot="header-end" fill="clear" aria-label="Search">…</orb-button>
  …
</orb-channel>
```

The thread panel (4.1) has its own built-in header, without slots.

### 1.7 Scrolling

The list stays at the bottom while the user is there, and stays put once they've scrolled up, including while content grows. `prefers-reduced-motion` turns off smooth scrolling.

### 1.8 Accessibility baseline

- The list has `role="log"` and `aria-live="polite"`, named by `label`.
- Arrow keys move between messages with a roving tabindex, and Home and End go to the first and last.
- The composer is named from its `placeholder` or `label`.

### 1.9 Styles

The chrome, the first version of `_chat-content.scss`, parts and their state names, custom properties, `light-dark()` for both color schemes, and forced colors.

### 1.10 Methods

`scrollToMessage(id, { behavior })`, `focusComposer()`, and `send(text)`, which goes through the same path as the composer. Apps add, change and remove messages with DOM APIs. Helpers like `append()` are only added if that proves awkward.

### 1.11 Tests

Rendering from markup, updates from prop changes, text changes and removals, grouping, settings filled in from `kind`, attributes overriding them, changing `kind` after loading, the header and its slots, slotted and default icons, sending from the keyboard and the button, `echo` and `client-id` replacement, form association and reset, scroll anchoring, keyboard navigation.

## Phase 2: Content

### 2.1 Markdown and HTML messages

- `<script type="text/markdown">` and `<script type="text/html">` inside a message.
- The markdown-it loader moves to `src/utils/markdown.ts`, and `orb-markdown` uses it from there. Markdown is rendered with `html: false`.
- HTML goes through `model/sanitize.ts`. One decision for this step: whether inline styles from the rich composer, such as colors, are kept.
- Code blocks get an `orb-copy-button`. Syntax coloring can reuse `highlightCode` from rich-text, loaded on first use.

### 2.2 Rich composer

`editor="rich"` renders `orb-rich-text` with `variant="compact"` and `enter-action="submit"`. Its `mentions` come from the participants, and its `commands` from `orb-channel-command` elements. It sends HTML (`format: "html"`).

The composer's `toolbar` attribute sets the formatting toolbar:

- `always`: `toolbar-placement="bottom"`.
- `toggle` (default): a formatting button (part `toolbar-toggle`, `aria-pressed`) in `bottom-start` switches `toolbar-placement` between `bottom` and `none`. The choice is kept while the composer exists, and with `drafts="persist"` (6.5) it's stored with the draft.
- `none`: `toolbar-placement="none"`. Formatting still works from the shortcuts and the Markdown typing rules.

The plain editor has no toolbar, so it ignores `toolbar`.

### 2.3 Mentions

- In rich mode, rich-text's `@` menu, as set up in 2.2.
- In plain mode, an `orb-menu` at the caret. Finding the caret's position in a `textarea` needs a mirror element.
- `orbSend`'s detail gets `mentions: string[]`.
- Mentions show as chips, and a mention of the `pov` participant gets the `mention-self` part.

### 2.4 Commands

`<orb-channel-command name="summarize" description="…" args="prompt">` inside the composer. `/` at the start opens the command menu in both modes. A command's icon comes from a `slot="icon"` child, like actions, with a default icon without one. `orbSend`'s detail gets `command: { name, args }`.

### 2.5 Reactions

`<orb-channel-reaction emoji="🎉" by="grace">` elements are combined into pills with counts. Clicking one emits a cancelable `orbReact` with `{ message, emoji, on }`. The emoji picker reuses rich-text's emoji data loader.

### 2.6 Attachments

- `attachments="image/*,.pdf"` on the composer. Files can be picked, dropped or pasted, and are previewed like in `orb-file-input`.
- `isAccepted` moves to `src/utils/files.ts`, as the rich-text plan already proposes.
- `orbSend`'s detail gets `files: File[]`. Uploading is the app's job.
- `<orb-channel-attachment href name type size>` in a message shows images inline and other files as cards.

### 2.7 Dividers and unread

- `<orb-channel-divider type="date | unread | custom">`. With `date-dividers`, the channel adds date dividers itself.
- `unread` is reflected on the channel as a count.
- `orbRead` is emitted as messages are seen, using an `IntersectionObserver`.

### 2.8 Message actions

- A toolbar on hover and focus: react, reply, copy, and edit and delete for the user's own messages. The `actions` attribute (5.6) makes the list configurable.
- `orbEdit` and `orbDelete` are cancelable. Editing happens in place, with the same editor type as the composer.
- `reply-to` shows a quote of the message it answers.

### 2.9 Moderation

The channel shows moderation states and asks for actions through events. The server enforces everything.

- **Reporting:** a "Report" message action on other people's messages emits `orbReport` with `{ message }`. The app shows its own form or calls its API.
- **Moderation states:** `moderation="pending | hidden | removed"` on a message, with an optional `moderation-reason`. It isn't named `hidden`, which is a global HTML attribute.
  - `pending`: faded, with "Awaiting approval". The app sends these only to the author and moderators.
  - `hidden`: collapsed to a line with the reason, such as "Hidden for low score", and a "Show anyway" button.
  - `removed`: "Removed by a moderator", with no content. Its replies stay.
- **Moderators:** `moderator` on a participant shows a badge (part `badge`). When the `pov` participant is a moderator, the message actions add hide, remove, pin and mute, on anyone's messages. They emit a cancelable `orbModerate` with `{ action, message, participant }`.
- **Muting:** `muted` on a participant, with an optional `muted-until`. When it's the `pov` participant, the composer is disabled and says why, with a countdown when `muted-until` is set.
- **Ignoring:** `ignored` on a participant collapses their messages for this viewer only, with "Show anyway".
- **Slow mode:** `slow-mode="30s"` on the channel. After sending, the composer shows a countdown and stays disabled until it ends. Moderators aren't affected.
- **Accessibility:** collapsed and removed messages stay in the arrow-key order, and say why they're collapsed. The countdowns are announced when they start and end, not every second.

## Phase 3: AI

### 3.1 AI participants

- `role="human | ai | bot | system"`. Messages from `ai` participants get a badge, worded by `ai-label`.
- `respond-to`, `context` and `reply-in` are only data. The channel doesn't call models.
- From them and the mentions, the channel works out which AI participants should answer, and adds `respondents: string[]` to `orbSend`'s detail, so the app knows whom to call.

### 3.2 Streaming

- A message with `streaming` shows a cursor.
- Markdown is re-rendered at most once per frame, from the last complete block on. Unclosed code fences show as open code blocks.
- Screen readers hear streamed text at sentence boundaries, and the full text when it's done.
- `prefers-reduced-motion` hides the cursor.

### 3.3 Reasoning

`<orb-channel-reasoning state="thinking | done" label duration>` is shown with `orb-details`. The channel's `reasoning` attribute is `show`, `collapsed` (default) or `hidden`.

### 3.4 Tool calls

- `<orb-channel-tool-call name call-id status requires-approval>`, with `<script type="application/json" data-part="args">` and `data-part="result"`.
- With `status="awaiting-approval"`, approve and deny buttons emit a cancelable `orbToolDecision` with `{ toolCall, callId, approved }`.

### 3.5 Stop and sending while streaming

- While any AI message is streaming, the stop button takes the send button's place, and emits `orbStop`.
- `while-streaming="queue | block | interrupt"` on the composer controls what sending does meanwhile.

### 3.6 Citations

`<orb-channel-citation href index title>` shows as a numbered link with a popover.

### 3.7 Suggestions

`<orb-channel-suggestions>` with `<orb-channel-suggestion>` children shows chips. Clicking one fills the composer, or sends it right away with `send`. A suggestion can have a `slot="icon"` child. Without one it shows no icon, since text chips don't need one.

### 3.8 Variants

Branching, such as editing an earlier message or regenerating an answer, is a tree, and the app stores it. The DOM only holds the path that's on screen, like everything else in the channel. The channel shows a version switcher and asks the app for changes, and the app swaps the path.

```html
<orb-channel-message id="u1b" from="ada">
  Plan a weekend in Porto
  <orb-channel-variants current="2" count="2"></orb-channel-variants>
</orb-channel-message>
<orb-channel-message id="a4" from="claude">
  <script type="text/markdown">Ribeira…</script>
</orb-channel-message>
```

- **The switcher:** `<orb-channel-variants current count>` in a message shows "‹ 2 / 2 ›" (part `variants`). Like reactions, it isn't positional. The buttons are named "Previous version" and "Next version", and the switcher reads as "Version 2 of 2".
- **Switching:** a button emits `orbVariantChange` with `{ message, current }`, where `current` is the version asked for, counting from 1. The channel changes nothing itself. The app fetches that path and replaces the messages from this one on. While it does, it can set `busy` on the switcher, which disables the buttons and shows `orb-loading`.
- **Regenerating:** the `regenerate` action (5.6) emits a cancelable `orbRegenerate` with `{ message }`. The app replaces the message and writes the new version with the message writer (3.9), which takes `variants: { current, count }`.
- **Editing:** the app decides in its `orbEdit` handler (2.8). It can change the message in place, or fork: store the new version and replace the path from that message on. The `assistant` preset's docs show forking.
- **`replaceFrom(message, content)`:** a method that removes the message and every top-level message after it, with their replies, and then adds `content`. That can be an HTML string, an element or a fragment. HTML is parsed in a `<template>`, as in 6.3. Every app using branching needs this, and it's easy to get wrong with replies and dividers.
- **Keeping the place:** after a switch, the first new message takes the old one's place on screen, rather than the list jumping to the bottom. Focus moves to its switcher, and the new version is announced.

```js
channel.addEventListener("orbVariantChange", async (e) => {
  const { message, current } = e.detail;
  channel.replaceFrom(message, await api.path(chatId, message.id, current));
});

channel.addEventListener("orbEdit", async (e) => {
  e.preventDefault(); // fork instead of changing the message
  const { message, html } = e.detail;
  channel.replaceFrom(message, await api.fork(chatId, message.id, html));
  streamAnswer(createMessageWriter(channel, { from: "claude" }));
});

channel.addEventListener("orbRegenerate", async (e) => {
  const { message } = e.detail;
  const { current, count } = await api.newVersion(chatId, message.id);
  channel.replaceFrom(message, "");
  streamAnswer(createMessageWriter(channel, { from: "claude", variants: { current, count } }));
});
```

### 3.9 Message writer

`createMessageWriter`, exported from `src/index.ts`, writes a streaming message into the DOM without knowing any SDK. It only changes elements, so everything it does could be written by hand, and the channel batches its changes like any other.

```ts
const writer = createMessageWriter(channel, { from: "claude" }); // appends <orb-channel-message streaming>
writer.reasoning("The user wants…");  // starts or continues the reasoning block
writer.toolCall({ callId: "t1", name: "fetch_schema", args: { id: "v2" }, status: "running" });
writer.toolResult("t1", { fields: 12 });
writer.text("Here's what changed");  // appends to the message's markdown script
writer.finish();                       // removes streaming, and marks reasoning done with its duration
writer.fail("Connection lost");        // status="failed"
```

`writer.message` is the element, so apps can add anything the writer doesn't cover.

## Phase 4: Scale

### 4.1 Threads

There's no thread element. A reply points at the message it replies to with `thread`, and all messages are siblings in the DOM:

```html
<orb-channel kind="open" pov="u_42" open-thread="m100">
  <orb-channel-message id="m100" from="u_7">Release 2.0 is out!</orb-channel-message>
  <orb-channel-message id="m101" from="u_9" thread="m100">Congrats!</orb-channel-message>
  <orb-channel-message id="m102" from="u_3">Anyone going to the meetup?</orb-channel-message>
  <orb-channel-message id="m103" from="relbot" thread="m100">Changelog: …</orb-channel-message>
</orb-channel>
```

- **Order:** replies can be anywhere among the other messages. Within a thread, DOM order is the order.
- **Missing parents:** a reply whose parent isn't in the DOM is kept but not shown, until the parent arrives.
- **Depth:** a reply can point at another reply. `max-depth` (1 by default) sets how many levels are indented. Replies past it show at the deepest level, in DOM order. So with the default, a reply to a reply shows in the same thread, like Slack.
- **Counts:** the parent shows how many replies it has and when the last one came, from the replies in the DOM. `thread-count` and `thread-last` on the parent override them, for when not every reply is loaded. If replies are missing, "View 14 replies" emits `orbLoadMore` with `{ parent }`.
- **State:** `thread-state="collapsed | resolved"` on the parent.
- **Showing:** `threads="none | inline | panel"`.
  - The panel is beside the list when there's room, and over it when there isn't, using a container query.
  - Inline threads show under their parent. They're expanded unless `thread-state="collapsed"`, and the user can collapse and expand them. The channel keeps that itself, without changing the attribute.
- **The open thread:** `open-thread="m100"` on the channel is the thread in the panel. It's reflected, so the channel changes its own attribute, not a child's. Opening and closing emit cancelable `orbThreadOpen` and `orbThreadClose`, with `{ parent }`. Opening moves focus into the panel, and closing returns it.
- **Replying:** the panel, and each inline thread, has a reply composer with the main composer's settings. A second `<orb-channel-composer scope="replies">` overrides them, such as its `placeholder`. Sending emits `orbSend` with `to` set to the parent message, and with `echo`, the echoed message gets `thread`.
- **The reply action (2.8):** opens the thread when `threads` isn't `none`, and quotes the message with `reply-to` when it is.
- **Removed parents:** a parent with `moderation="removed"` (2.9) keeps its replies.

### 4.2 Virtualization

- The channel renders only the rows near the viewport, from the model. The app's light DOM is left alone.
- `content-visibility: auto` first, and full windowing when it's needed.
- Spacers use measured row heights (`ResizeObserver`), and estimates for rows not yet seen.
- The scroll position holds when rows above change height.

### 4.3 Paging

Near the top, the channel emits `orbLoadMore` with `{ direction, cursor }` and shows a loading row while `loading-more` is set. The app adds older messages, and the scroll position holds. In a thread, the event also has `parent`.

### 4.4 Jumping

`scrollToMessage`, a URL hash such as `#m100`, and a jump-to-latest pill that counts new messages.

### 4.5 Receipts, typing and presence

- `receipts="none | delivered | read"`.
- `typing`: a `typing` attribute on a participant shows the indicator, and the local user's typing emits `orbTyping`.
- `presence="none | sampled | full"`. `sampled` shows a count and a few avatars.

## Phase 5: Formats

The attributes the presets set, and the presets themselves. Every attribute works on its own, with or without a preset.

### 5.1 Layouts

`layout="bubbles | flat | assistant | compact"`:

- `bubbles`: messaging apps. The `pov` participant's messages are on the end side.
- `flat`: Slack, Discord and comment sections. Every message is on the start side, with its avatar and name, and no bubble.
- `assistant`: the `pov` participant's messages are bubbles on the end side. Everyone else's are full width, without a bubble, so code blocks and tables have room.
- `compact`: one line per message, `name: text`, for fast feeds.

The message content keeps the `bubble` part in every layout, so styles aimed at it still apply.

### 5.2 Scrolling

- `anchor="bottom | top"`. With `top`, the list starts at the top, the composer is above it, and `orbLoadMore` fires near the bottom, with `direction: "after"`. New messages don't move the scroll position.
- `follow="bottom | question"`. With `question`, sending scrolls the user's message to the top of the list, and the answer grows below it without the list following it.
- `pause-on-scroll`: following stops while the pointer is over the list or the user has scrolled up. A "Chat paused, 12 new" button resumes it.
- `jump-to-latest`: shows the pill from 4.4.

### 5.3 Announcements

- `announce` (on by default): the list is a `role="log"` with `aria-live="polite"`, as in 1.8.
- Off: the list is a `role="feed"` of articles, and new messages aren't announced. Comment sections and fast feeds use this.
- With `max-depth` above 1, replies are rendered as a list inside their parent's article, so screen readers announce the nesting level and the number of replies. ARIA 1.3's `comment` role would fit, but 1.3 is still a draft, so it isn't used.
- Virtualization (4.2) has to keep that nesting, so with nested replies it windows top-level messages, each with its replies.
- Left and Right collapse, expand, and move to the parent.

### 5.4 Votes

- `votes="none | up | up-down"` on the channel.
- `score` on a message, and `vote="up | down"` for the `pov` participant's own vote.
- The buttons emit a cancelable `orbVote` with `{ message, value }`, where `value` is `up`, `down` or `none`. The app updates `score` and `vote`.

### 5.5 Sorting

- `sorts="top new old"`: the options in a sort menu above the list. Without it, there's no menu.
- `sort` on the channel is the current option, and it's reflected. Choosing one emits a cancelable `orbSortChange` with `{ sort }`, and the app reorders the messages, since DOM order is the order.

### 5.6 Message actions

`actions` lists the message actions (2.8), in order. The names are `react`, `reply`, `copy`, `copy-link`, `edit`, `delete`, `pin`, `regenerate` and `report`.

- `edit` and `delete` only show on the `pov` participant's messages, `regenerate` only on AI messages, and `report` only on other people's. Moderator actions (2.9) are added for moderators.
- `copy-link` copies the page's URL with the message's `#id` (4.4). `permalink="/posts/42#{id}"` on the channel sets another URL.
- `pin` emits a cancelable `orbPin` with `{ message, pinned }`. The app sets `pinned` on the message, and pinned messages are listed in the header.

### 5.7 Coalescing

`coalesce="250ms"` batches updates over that time, instead of once per frame. Fast feeds use it.

### 5.8 Presets

`preset="assistant | workspace | comments | live"`, filled in as described in Kinds and presets. `channel.md` gets the tables from that section, and an example of each preset.

### 5.9 Tests

Each layout, `anchor="top"` with loading at the bottom, `follow="question"`, pausing and resuming, `announce` off, votes, sorting, action lists, coalescing. For presets: the settings each one fills in, an attribute overriding a preset, `preset` setting `kind`, and changing `preset` and `kind` after loading.

## Phase 6: Transports

### 6.1 Transport interface

An object set as `channel.transport`, with `send(message)`, `subscribe(handlers)` and `history(cursor)`.

### 6.2 Optimistic sending

With a transport, the channel inserts `<orb-channel-message status="sending" client-id="…">` itself, and matches the server's message to it by `client-id`. A failed send gets `status="failed"` and a retry button.

### 6.3 Declarative transports

- `<orb-channel-transport type="form | sse | websocket | poll">`.
- Servers can send HTML fragments. A message with an id that's already there replaces it.
- Fragments are parsed in a `<template>`, so they're inert until they're added, and message content still has to use `<script>` tags.

### 6.4 Participant sources

`<orb-channel-participant-source href="/users?ids={ids}">` fetches unknown participants in batches.

### 6.5 Drafts

`drafts="persist"` keeps a draft per channel and thread in `localStorage`, under the channel's `key` attribute.

### 6.6 AI recipes

A section in `channel.md` with a short recipe per SDK, such as the Vercel AI SDK, OpenAI and Anthropic, mapping its stream events onto the message writer (3.9). There are no adapter modules. If the recipes get copied a lot, adapters can come later as a separate package, so SDK changes don't need an `orb-style` release.

## Open questions

None at the moment.
