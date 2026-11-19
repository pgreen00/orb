# `<orb-channel>` API proposal

## Design principles

1. **The DOM is the source of truth.** Messages are real child elements, so you can render them server-side, stream them as HTML, or add them with `append()`.
2. **One element, three modes.** `kind="direct | group | open"` changes the defaults (avatars, receipts, virtualization, thread UI). It doesn't change the API.
3. **A thread is just a channel with a parent.** The same element nests recursively, so there's no separate thread API to learn.
4. **An AI is a participant, not a special mode.** It has an identity, a trigger policy, and message parts (reasoning, tool calls) that any participant could technically emit.
5. **Everything has an attribute form.** Methods and events exist, but you shouldn't need them for the common cases.

## Element family

| Element | Purpose |
|---|---|
| `<orb-channel>` | Root. Owns the message list, transport, and thread routing |
| `<orb-channel-participant>` | Declares a person, bot, or LLM |
| `<orb-channel-message>` | One message |
| `<orb-channel-thread>` | Side thread anchored to a message (a nested channel) |
| `<orb-channel-composer>` | Input and send controls (form-associated) |
| `<orb-channel-reasoning>` | Collapsible "thinking" block |
| `<orb-channel-tool-call>` | Tool invocation with args, status, and result |
| `<orb-channel-attachment>`, `<orb-channel-reaction>`, `<orb-channel-citation>` | Message parts |
| `<orb-channel-divider>` | Date or "unread" markers |
| `<orb-channel-transport>` | Declarative connection config |
| `<orb-channel-command>`, `<orb-channel-mention-source>` | Composer extensions |

## `<orb-channel>` attributes

| Attribute | Values | Notes |
|---|---|---|
| `kind` | `direct` (default), `group`, `open` | Sets defaults for the options below |
| `me` | participant id | Who "self" is. Messages get a `self` state |
| `src` | URL | Initial history, as an HTML fragment or JSON |
| `threads` | `none`, `inline`, `panel` | Default `panel` for open, `none` for direct |
| `receipts` | `none`, `delivered`, `read` | Default `read` for direct, `none` for open |
| `typing` | boolean | Show typing indicators |
| `presence` | `none`, `sampled`, `full` | `sampled` is for large channels |
| `window` | number | Max messages kept in the DOM (virtualization) |
| `anchor` | `bottom` (default), `top` | Scroll anchoring |
| `connection` | read-only: `connecting`, `live`, `offline` | Reflected |
| `unread` | read-only number | Reflected |
| `readonly`, `disabled` | boolean | |

## Scenario 1: two-person chat

```html
<orb-channel kind="direct" me="ada" src="/chats/ada-grace/history">
  <orb-channel-participant id="ada"   name="Ada"   avatar="/a/ada.png"></orb-channel-participant>
  <orb-channel-participant id="grace" name="Grace" avatar="/a/grace.png" presence="online"></orb-channel-participant>

  <orb-channel-divider type="date" datetime="2025-06-01"></orb-channel-divider>

  <orb-channel-message id="m1" from="grace" ts="2025-06-01T09:14Z">
    Did the compiler change land?
  </orb-channel-message>
  <orb-channel-message id="m2" from="ada" ts="2025-06-01T09:15Z" status="read">
    Yep, merged this morning.
    <orb-channel-reaction emoji="🎉" by="grace"></orb-channel-reaction>
  </orb-channel-message>

  <orb-channel-composer placeholder="Message Grace"></orb-channel-composer>
</orb-channel>
```

Defaults here: no names on bubbles, read receipts on, and consecutive messages from the same sender grouped.

## Scenario 2: group chat with an LLM participant

```html
<orb-channel kind="group" me="ada" typing receipts="delivered">
  <orb-channel-participant id="ada"  name="Ada"></orb-channel-participant>
  <orb-channel-participant id="lin"  name="Lin"></orb-channel-participant>

  <orb-channel-participant id="claude" name="Assistant" role="ai"
                    model="claude-sonnet"
                    respond-to="mention"
                    context="channel"
                    reply-in="channel">
  </orb-channel-participant>

  <!-- composer can autocomplete @mentions from participants -->
  <orb-channel-composer>
    <orb-channel-command name="summarize" description="Summarize the last 50 messages"></orb-channel-command>
    <orb-channel-command name="image" description="Generate an image" args="prompt"></orb-channel-command>
  </orb-channel-composer>
</orb-channel>
```

AI participant attributes:

- `role="human | ai | bot | system"`
- `respond-to`: `always` (default in direct chats), `mention` (default in group chats), `manual`, or `never`
- `context`: what the model sees. Values are `channel`, `thread`, `last:20`, or `selection`
- `reply-in`: `channel`, `thread`, or `auto`. In open channels, `thread` keeps the bot from flooding the main feed
- `agent-src` or `<orb-channel-transport for="claude">` points to the backend that runs the model

### An AI message in flight

Streaming is plain DOM growth. The server (or your code) appends text and parts to a message with `streaming`, and removes the attribute when it's done.

```html
<orb-channel-message id="m9" from="claude" streaming>
  <orb-channel-reasoning state="thinking" label="Thinking…">
    The user wants the diff between the two schemas. I should fetch both first…
  </orb-channel-reasoning>

  <orb-channel-tool-call name="fetch_schema" status="running" call-id="t1">
    <script type="application/json" slot="args">{"id":"v2"}</script>
  </orb-channel-tool-call>

  <orb-channel-tool-call name="delete_branch" status="awaiting-approval" requires-approval>
    <script type="application/json" slot="args">{"branch":"old-api"}</script>
    <!-- built-in approve/deny buttons fire orb-channel-tool-decision -->
  </orb-channel-tool-call>

  Here's what changed between v1 and v2<orb-channel-citation href="/docs/v2" index="1"></orb-channel-citation>:
</orb-channel-message>
```

After completion, the same message is:

```html
<orb-channel-message id="m9" from="claude" status="sent" tokens="412">
  <orb-channel-reasoning state="done" duration="4.2s" collapsed>…</orb-channel-reasoning>
  <orb-channel-tool-call name="fetch_schema" status="done">…</orb-channel-tool-call>
  Here's what changed…
  <orb-channel-variants current="2" count="3"></orb-channel-variants>   <!-- regenerate / branches -->
</orb-channel-message>
```

AI-related features:

- **Stop button.** It appears in the composer automatically while any AI message has `streaming`. It fires `orb-channel-stop`.
- **Reasoning display.** The `reasoning` attribute on the channel can be `show`, `collapsed` (default), or `hidden`.
- **Tool approvals.** Messages can have `status="awaiting-approval"`. Approving or denying fires a cancelable `orb-channel-tool-decision`.
- **Regenerate and branching.** `<orb-channel-variants>` lets users flip between alternates. Editing an earlier user message forks the conversation, and the `branch` attribute selects the active path.
- **Suggestions.** `<orb-channel-suggestions>` holds follow-up chips that fill the composer or send directly.
- **AI disclosure.** Messages from `role="ai"` participants get an automatic badge, controlled with `ai-label`.

## Scenario 3: open channel with side threads

```html
<orb-channel kind="open" me="u_42" threads="panel"
              window="200" presence="sampled"
              src="/rooms/general/history?limit=50">

  <orb-channel-transport type="sse" href="/rooms/general/stream"
                  resume-from="last-event-id"></orb-channel-transport>

  <!-- Participants are resolved lazily; unknown ids are fetched in batches -->
  <orb-channel-participant-source href="/users?ids={ids}"></orb-channel-participant-source>

  <orb-channel-message id="m100" from="u_7" thread-count="14" thread-last="2025-06-01T10:02Z"
                thread-src="/rooms/general/threads/m100">
    Release 2.0 is out!
  </orb-channel-message>

  <!-- Opened thread: a nested channel bound to a message -->
  <orb-channel-thread for="m100" open>
    <orb-channel-participant id="relbot" name="ReleaseBot" role="ai"
                      respond-to="mention" reply-in="thread"></orb-channel-participant>
    <orb-channel-composer placeholder="Reply in thread"></orb-channel-composer>
  </orb-channel-thread>

  <orb-channel-composer placeholder="Message #general"></orb-channel-composer>
</orb-channel>
```

For large channels:

- **Windowing.** `window="200"` keeps only about 200 messages in the DOM. Older ones are evicted as the user moves, and `<orb-channel-message>` placeholders keep scroll height stable.
- **Paging.** The channel fires `orb-channel-load-more` (with `direction="before|after"`). Setting `before-src="/history?before={id}"` makes it fetch HTML fragments itself.
- **Jump to message.** A URL hash like `#m100` calls `scrollToMessage`, and `jump-to-latest` shows a pill when the user is scrolled away from the bottom.
- **Unread.** `<orb-channel-divider type="unread">` is inserted at the last-read position, and `unread` is reflected on the channel.
- **Sampled presence.** Instead of a member list, you get a count and a handful of avatars.
- **Rate limiting.** With `coalesce="100ms"`, bursts of incoming messages are batched into one render.
- **Threads.** Messages show a reply count, and clicking opens the thread panel. `threads="inline"` expands the thread under the message instead. A thread can be `open`, `collapsed`, or `resolved`.

### Thread targeting from the composer

```html
<orb-channel-composer send-to="thread:m100"></orb-channel-composer>
```

By default `send-to="auto"`. It sends to the open thread if there is one, otherwise to the channel. The composer inside a `<orb-channel-thread>` always targets that thread.

## Transport: declarative and swappable

```html
<orb-channel-transport type="websocket" href="wss://api.example.com/rooms/42"
                protocol="chat.v1" reconnect="exponential"></orb-channel-transport>
<orb-channel-transport type="sse"  href="/stream" post="/send"></orb-channel-transport>
<orb-channel-transport type="poll" href="/messages" interval="3s"></orb-channel-transport>
<orb-channel-transport type="form" action="/send" method="post"></orb-channel-transport>
```

- The `form` type posts the composer like a normal `<form>`, which works with htmx, Turbo, and so on.
- The server can send HTML fragments directly: `<orb-channel-message id="…">` replaces a message with that id (upsert by id), and a `client-id` reconciles optimistic messages.
- With no `<orb-channel-transport>`, the channel is purely local. You feed it with `append()` or by mutating the DOM.
- A custom transport is an object assigned to `channel.transport`, with `send()`, `subscribe()`, and `history()`.

## Composer

```html
<orb-channel-composer name="body" send-on="enter" multiline max-length="4000"
               attachments="image/*,.pdf" drafts="persist" rich="markdown">
  <orb-channel-mention-source for="participants"></orb-channel-mention-source>
  <orb-channel-mention-source trigger="#" href="/channels?q={query}"></orb-channel-mention-source>
  <orb-channel-command name="summarize"></orb-channel-command>
  <button slot="actions">📎</button>
</orb-channel-composer>
```

- **Form-associated.** It works inside a `<form>` and participates in `FormData`.
- **Optimistic send.** On submit it inserts a `<orb-channel-message status="sending" client-id="…">`. If the transport fails, the status becomes `failed` and a retry affordance appears.
- **Drafts.** `drafts="persist"` stores per-channel and per-thread drafts.
- **Streaming guard.** `while-streaming="queue | block | interrupt"` controls what happens if the user sends while an AI is responding.

## Message attributes

`id`, `from`, `ts`, `client-id`, `reply-to` (inline quote), `status` (`sending`, `sent`, `delivered`, `read`, `failed`, `streaming`, `awaiting-approval`), `edited`, `deleted`, `pinned`, `thread-count`, `format` (`text`, `markdown`, `html`). Rich HTML is sanitized unless `trusted` is set on the channel.

## Events (all bubble, with `detail` payloads)

| Event | Cancelable | Notes |
|---|---|---|
| `orb-channel-send` | yes | Before the message is sent. You can mutate or cancel it |
| `orb-channel-message` | no | Incoming message was added |
| `orb-channel-stop` | yes | User pressed stop |
| `orb-channel-regenerate`, `orb-channel-edit`, `orb-channel-delete`, `orb-channel-react` | yes | |
| `orb-channel-thread-open`, `orb-channel-thread-close` | yes | |
| `orb-channel-tool-decision` | yes | `detail: {callId, approved}` |
| `orb-channel-load-more` | no | `detail: {direction, cursor}` |
| `orb-channel-read` | no | Messages scrolled into view |
| `orb-channel-typing` | no | The local user started or stopped typing |
| `orb-channel-connection` | no | State change |

## Methods

`send(content, {to})`, `append(messageOrHTML)`, `update(id, patch)`, `remove(id)`, `scrollToMessage(id, {behavior})`, `openThread(id)`, `closeThread()`, `stop(messageId?)`, `regenerate(id)`, `markRead(id?)`, `clear()`. Properties: `messages` (read-only list), `participants`, `transport`, `activeThread`.

## Styling and slots

```html
<style>
  orb-channel-message::part(bubble)  { border-radius: 1rem; }
  orb-channel-message:state(self)::part(bubble) { background: var(--accent); }
  orb-channel-message:state(streaming)::part(cursor) { display: inline-block; }
  orb-channel-participant[role="ai"] { --orb-channel-accent: violet; }
  orb-channel { --orb-channel-gap: .5rem; --orb-channel-max-width: 70ch; }
</style>
```

- **Custom states** (`:state()`): `self`, `streaming`, `first-in-group`, `last-in-group`, `unread`, `failed`, `ai`.
- **Parts:** `list`, `bubble`, `avatar`, `name`, `time`, `status`, `thread-badge`, `reasoning`, `tool-call`, `composer`, `jump-pill`.
- **Channel slots:** `header`, `empty`, `typing`, `thread-panel`, `footer`, `jump-pill`.
- **Message slots:** `avatar`, `actions`, `meta`, plus the default slot for content.

## Accessibility

- The list uses `role="log"` with `aria-live="polite"`. Streaming AI messages are announced in chunks (at sentence boundaries, not per token), and the full text is announced on completion.
- Messages are navigable with arrow keys. `Enter` opens a thread, `E` edits, and `R` replies.
- The thread panel moves focus on open and restores it on close.
- Reasoning blocks use native `<details>` semantics.
- `prefers-reduced-motion` disables the streaming cursor and smooth scroll.

## Open questions

1. Should `<orb-channel-thread>` live inside its parent message or beside it? Inside is cleaner semantically, but it complicates virtualization.
2. Do you want a built-in AI protocol (for example mapping to the Vercel AI SDK, OpenAI, or Anthropic stream events) via `<orb-channel-transport type="ai-sdk">`, or keep the element protocol-agnostic with adapters?
3. Should edits and branching use a message tree (`parent-id`) as the canonical model, with linear chat as the degenerate case?
4. Do you want moderation primitives (`<orb-channel-report>`, slow-mode, `muted` participants) for open channels in v1?

I can also write the TypeScript interface definitions, a sample server-sent HTML stream format, or a minimal reference implementation of the streaming and thread routing.