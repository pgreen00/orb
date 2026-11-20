---
title: 'OrbChannel | <orb-channel>'
sidebar_label: 'Channel'
---

Give the channel a height, since its list scrolls. The channel draws everything from its child elements: messages, participants, dividers and the composer.

## Messages

::: live-code-demo

```html
<orb-channel pov="ada" label="Grace" style="height: 600px;">
  <orb-channel-participant id="ada" name="Ada"></orb-channel-participant>
  <orb-channel-participant id="grace" name="Grace"></orb-channel-participant>
  <orb-channel-message from="grace">Did the compiler change land?</orb-channel-message>
  <orb-channel-message from="ada">Yep, merged this morning.</orb-channel-message>
  <orb-channel-composer placeholder="Message Grace"></orb-channel-composer>
</orb-channel>
```

:::

## Kinds

::: live-code-demo

```html
<orb-channel kind="group" pov="ada" style="height: 600px;">
  <orb-channel-participant id="ada" name="Ada"></orb-channel-participant>
  <orb-channel-participant id="grace" name="Grace" accent="#7c3aed"></orb-channel-participant>
  <orb-channel-participant id="lin" name="Lin"></orb-channel-participant>
  <orb-channel-message from="grace" ts="2025-06-01T09:14:00Z">Did the compiler change land?</orb-channel-message>
  <orb-channel-message from="lin" ts="2025-06-01T09:15:00Z">Yes, it's in main.</orb-channel-message>
  <orb-channel-message from="ada" ts="2025-06-01T09:16:00Z">Great, I'll update the docs.</orb-channel-message>
</orb-channel>
```

:::

::: live-code-demo

```html
<orb-channel kind="open" label="#general" description="Release news" pov="u1" style="height: 600px;">
  <orb-channel-participant id="u1" name="Ada"></orb-channel-participant>
  <orb-channel-participant id="u2" name="Grace"></orb-channel-participant>
  <orb-channel-participant id="u3" name="Lin"></orb-channel-participant>
  <orb-channel-message from="u2">Release 2.0 is out!</orb-channel-message>
  <orb-channel-message from="u3">Congrats, team.</orb-channel-message>
</orb-channel>
```

:::

## Names and grouping

Messages from one sender, closer together than `group-within`, are grouped.

::: live-code-demo

```html
<orb-channel pov="ada" show-names group-within="1m" style="height: 600px;">
  <orb-channel-participant id="ada" name="Ada"></orb-channel-participant>
  <orb-channel-participant id="grace" name="Grace"></orb-channel-participant>
  <orb-channel-message from="grace" ts="2025-06-01T09:00:00Z">One</orb-channel-message>
  <orb-channel-message from="grace" ts="2025-06-01T09:00:20Z">Two, in the same group</orb-channel-message>
  <orb-channel-message from="grace" ts="2025-06-01T09:03:00Z">Three, a new group</orb-channel-message>
  <orb-channel-message from="ada" ts="2025-06-01T09:03:10Z">Replying to three</orb-channel-message>
</orb-channel>
```

:::

## Header

::: live-code-demo

```html
<orb-channel label="Design review" description="Thursday, 3 pm" pov="ada" style="height: 600px;">
  <orb-button slot="header-start" fill="clear" size="sm">←</orb-button>
  <orb-button slot="header-end" fill="clear" size="sm">Search</orb-button>
  <orb-channel-participant id="ada" name="Ada"></orb-channel-participant>
  <orb-channel-message from="ada">The agenda is in the doc.</orb-channel-message>
</orb-channel>
```

:::

## Links and mentions

::: live-code-demo

```html
<orb-channel pov="ada" style="height: 600px;">
  <orb-channel-participant id="ada" name="Ada"></orb-channel-participant>
  <orb-channel-participant id="grace" name="Grace"></orb-channel-participant>
  <orb-channel-message from="grace">@Ada, the spec is at https://example.com/spec.</orb-channel-message>
  <orb-channel-message from="ada">Thanks, @Grace. Reading it now.</orb-channel-message>
</orb-channel>
```

:::

## Markdown and HTML

Markdown and HTML go in a `<script>` inside the message. HTML is sanitized, so scripts and event handlers are removed.

::: live-code-demo

```html
<orb-channel pov="ada" style="height: 600px;">
  <orb-channel-participant id="ada" name="Ada"></orb-channel-participant>
  <orb-channel-participant id="grace" name="Grace"></orb-channel-participant>
  <orb-channel-message from="grace"><script type="text/markdown">
    Here's the fix:

    ~~~js
    const total = items.reduce((sum, item) => sum + item.price, 0);
    ~~~
  </script></orb-channel-message>
  <orb-channel-message from="ada"><script type="text/html"><p>Works for <strong>me</strong>. <a href="https://example.com">Merged</a>.</p></script></orb-channel-message>
</orb-channel>
```

:::

## Reactions

Clicking a reaction emits `orbReact`. The app adds or removes the reaction element.

::: live-code-demo

```html
<orb-channel id="reactions-demo" pov="ada" style="height: 600px;">
  <orb-channel-participant id="ada" name="Ada"></orb-channel-participant>
  <orb-channel-participant id="grace" name="Grace"></orb-channel-participant>
  <orb-channel-message id="m1" from="grace">Shipped the 2.0 release!
    <orb-channel-reaction emoji="🎉" by="ada"></orb-channel-reaction>
  </orb-channel-message>
</orb-channel>
```

```javascript
await customElements.whenDefined("orb-channel");
const channel = document.querySelector("#reactions-demo");
channel.addEventListener("orbReact", ({ detail }) => {
  if (detail.on) {
    const reaction = document.createElement("orb-channel-reaction");
    reaction.setAttribute("emoji", detail.emoji);
    reaction.setAttribute("by", channel.pov);
    detail.message.append(reaction);
  } else {
    detail.message.querySelector(`orb-channel-reaction[emoji="${detail.emoji}"][by="${channel.pov}"]`).remove();
  }
});
```

:::

## Attachments

::: live-code-demo

```html
<orb-channel pov="ada" style="height: 600px;">
  <orb-channel-participant id="ada" name="Ada"></orb-channel-participant>
  <orb-channel-participant id="grace" name="Grace"></orb-channel-participant>
  <orb-channel-message from="grace">
    The screenshot and the report
    <orb-channel-attachment href="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" name="screenshot.gif" type="image/gif"></orb-channel-attachment>
    <orb-channel-attachment href="https://example.com/report.pdf" name="report.pdf" type="application/pdf" size="2 MB"></orb-channel-attachment>
  </orb-channel-message>
</orb-channel>
```

:::

## Dividers

Use `type="unread"` to mark where new messages start. The channel counts them in its `unread` attribute. It also adds a date divider whenever the day changes.

::: live-code-demo

```html
<orb-channel pov="ada" style="height: 600px;">
  <orb-channel-participant id="ada" name="Ada"></orb-channel-participant>
  <orb-channel-participant id="grace" name="Grace"></orb-channel-participant>
  <orb-channel-message from="ada" ts="2025-06-01T09:14:00Z">Morning</orb-channel-message>
  <orb-channel-divider type="unread"></orb-channel-divider>
  <orb-channel-message from="grace" ts="2025-06-01T09:20:00Z">Two new ones</orb-channel-message>
  <orb-channel-message from="grace" ts="2025-06-02T08:00:00Z">The next day</orb-channel-message>
  <orb-channel-divider label="Launch day"></orb-channel-divider>
</orb-channel>
```

:::

## Reply and delete

Right-click a message, or press and hold it on a touch screen, to open its actions. The Menu key does the same from the keyboard.

::: live-code-demo

```html
<orb-channel id="actions" pov="ada" style="height: 600px;">
  <orb-channel-participant id="ada" name="Ada"></orb-channel-participant>
  <orb-channel-participant id="grace" name="Grace"></orb-channel-participant>
  <orb-channel-message id="m1" from="grace">Can you review the PR?</orb-channel-message>
  <orb-channel-message id="m2" from="ada">Delete me</orb-channel-message>
</orb-channel>
<p id="status" role="status"></p>
```

```javascript
await customElements.whenDefined("orb-channel");
const channel = document.querySelector("#actions");
const status = document.querySelector("#status");
channel.addEventListener("orbReply", ({ detail }) => (status.textContent = `Replying to: ${detail.message.textContent.trim()}`));
channel.addEventListener("orbDelete", ({ detail }) => detail.message.remove());
```

:::

## Editing

Edit opens an editor in place. Saving emits `orbEditCommit`, which can be canceled to keep the editor open.

::: live-code-demo

```html
<orb-channel id="editing-demo" pov="ada" style="height: 600px;">
  <orb-channel-participant id="ada" name="Ada"></orb-channel-participant>
  <orb-channel-message id="m1" from="ada">Merged this morning</orb-channel-message>
</orb-channel>
```

```javascript
await customElements.whenDefined("orb-channel");
document.querySelector("#editing-demo").addEventListener("orbEditCommit", ({ detail }) => {
  detail.message.textContent = detail.text;
  detail.message.setAttribute("edited", "");
});
```

:::

## Moderation states

::: live-code-demo

```html
<orb-channel pov="ada" style="height: 600px;">
  <orb-channel-participant id="ada" name="Ada"></orb-channel-participant>
  <orb-channel-participant id="grace" name="Grace"></orb-channel-participant>
  <orb-channel-message from="grace" moderation="hidden" moderation-reason="Hidden for low score">Not a great take</orb-channel-message>
  <orb-channel-message from="grace" moderation="removed">Removed text</orb-channel-message>
  <orb-channel-message from="grace" moderation="pending">Waiting for approval</orb-channel-message>
</orb-channel>
```

:::

## Moderator tools

Moderators get Pin, Hide, Remove and Mute buttons. They emit `orbModerate`, and the app changes the message or participant.

::: live-code-demo

```html
<orb-channel id="moderation" pov="ada" style="height: 600px;">
  <orb-channel-participant id="ada" name="Ada" moderator></orb-channel-participant>
  <orb-channel-participant id="grace" name="Grace"></orb-channel-participant>
  <orb-channel-message id="m1" from="grace">Buy now at example.com!</orb-channel-message>
  <orb-channel-message id="m2" from="grace">Pinned announcement</orb-channel-message>
</orb-channel>
```

```javascript
await customElements.whenDefined("orb-channel");
document.querySelector("#moderation").addEventListener("orbModerate", ({ detail }) => {
  const { action, message, participant } = detail;
  if (action === "hide") {
    message.setAttribute("moderation", "hidden");
    message.setAttribute("moderation-reason", "Hidden by a moderator");
  }
  if (action === "remove") message.setAttribute("moderation", "removed");
  if (action === "pin") message.setAttribute("pinned", "");
  if (action === "unpin") message.removeAttribute("pinned");
  if (action === "mute") participant.setAttribute("muted", "");
});
```

:::

## Muted and ignored

A muted point of view can't write. Messages from an ignored participant are collapsed, and can still be shown.

::: live-code-demo

```html
<orb-channel pov="ada" style="height: 600px;">
  <orb-channel-participant id="ada" name="Ada" muted></orb-channel-participant>
  <orb-channel-participant id="grace" name="Grace"></orb-channel-participant>
  <orb-channel-participant id="troll" name="Troll" ignored></orb-channel-participant>
  <orb-channel-message from="grace">Hello from Grace</orb-channel-message>
  <orb-channel-message from="troll">Hello from Troll</orb-channel-message>
  <orb-channel-composer placeholder="You're muted"></orb-channel-composer>
</orb-channel>
```

:::

## Slow mode

::: live-code-demo

```html
<orb-channel pov="ada" slow-mode="10s" echo style="height: 600px;">
  <orb-channel-participant id="ada" name="Ada"></orb-channel-participant>
  <orb-channel-composer placeholder="Send a message, then try again"></orb-channel-composer>
</orb-channel>
```

:::

## Sending

Enter sends. `echo` adds the sent message from the point of view. Cancel `orbSend` to keep the draft.

::: live-code-demo

```html
<orb-channel pov="ada" echo style="height: 600px;">
  <orb-channel-participant id="ada" name="Ada"></orb-channel-participant>
  <orb-channel-composer placeholder="Press Enter to send" send-on="enter"></orb-channel-composer>
</orb-channel>
```

```javascript
await customElements.whenDefined("orb-channel");
document.querySelector("orb-channel").addEventListener("orbSend", (event) => {
  if (event.detail.text.length < 5) event.preventDefault();
});
```

:::

## Rich composer

`editor="rich"` gives the composer formatting. `toolbar` is `toggle` by default, and `always` or `none` set it.

::: live-code-demo

```html
<orb-channel id="rich" pov="ada" style="height: 600px;">
  <orb-channel-participant id="ada" name="Ada"></orb-channel-participant>
  <orb-channel-participant id="grace" name="Grace"></orb-channel-participant>
  <orb-channel-composer editor="rich" placeholder="Write a message"></orb-channel-composer>
</orb-channel>
<p id="rich-output" role="status"></p>
```

```javascript
await customElements.whenDefined("orb-channel");
document.querySelector("#rich").addEventListener("orbSend", ({ detail }) => {
  document.querySelector("#rich-output").textContent = `Sent as ${detail.format}: ${detail.html}`;
});
```

:::

## Commands and mentions

Typing `/` offers the commands, and `@` offers the participants. `orbSend` says which command the message starts with, and who it mentions.

::: live-code-demo

```html
<orb-channel id="commands" pov="ada" style="height: 600px;">
  <orb-channel-participant id="ada" name="Ada"></orb-channel-participant>
  <orb-channel-participant id="grace" name="Grace"></orb-channel-participant>
  <orb-channel-composer placeholder="Type / or @">
    <orb-channel-command name="summarize" description="Summarize the channel" args="prompt"></orb-channel-command>
    <orb-channel-command name="translate" description="Translate the last message" args="language"></orb-channel-command>
  </orb-channel-composer>
</orb-channel>
<p id="commands-output" role="status"></p>
```

```javascript
await customElements.whenDefined("orb-channel");
document.querySelector("#commands").addEventListener("orbSend", ({ detail }) => {
  document.querySelector("#commands-output").textContent = `Command: ${JSON.stringify(detail.command)}. Mentions: ${detail.mentions.join(", ")}`;
});
```

:::

## Attaching files

::: live-code-demo

```html
<orb-channel id="files" pov="ada" style="height: 600px;">
  <orb-channel-participant id="ada" name="Ada"></orb-channel-participant>
  <orb-channel-composer attachments="image/*,.pdf" placeholder="Attach a file"></orb-channel-composer>
</orb-channel>
<p id="files-output" role="status"></p>
```

```javascript
await customElements.whenDefined("orb-channel");
document.querySelector("#files").addEventListener("orbSend", ({ detail }) => {
  document.querySelector("#files-output").textContent = `Sent ${detail.files.length} file(s): ${detail.files.map((file) => file.name).join(", ")}`;
});
```

:::

## Composer buttons

::: live-code-demo

```html
<orb-channel id="buttons" pov="ada" style="height: 600px;">
  <orb-channel-participant id="ada" name="Ada"></orb-channel-participant>
  <orb-channel-composer placeholder="Write a message">
    <orb-channel-action name="gif" label="Add a GIF"></orb-channel-action>
    <orb-channel-action name="poll" label="Start a poll">
      <svg slot="icon" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>
    </orb-channel-action>
  </orb-channel-composer>
</orb-channel>
<p id="buttons-output" role="status"></p>
```

```javascript
await customElements.whenDefined("orb-channel");
document.querySelector("#buttons").addEventListener("orbAction", ({ detail }) => {
  document.querySelector("#buttons-output").textContent = `Clicked ${detail.name}`;
});
```

:::

## AI messages

An AI participant has `role="ai"`, and its messages get a badge with its `ai-label`. The channel doesn't call a model. `orbSend` lists the AI participants that should answer in `respondents`, set by each one's `respond-to`, and the app asks its model. The app writes the answer with `createMessageWriter`, which only changes elements.

### Writing an answer

::: live-code-demo

```html
<orb-channel id="writer" pov="ada" style="height: 600px;">
  <orb-channel-participant id="ada" name="Ada"></orb-channel-participant>
  <orb-channel-participant id="claude" name="Claude" role="ai" ai-label="Assistant"></orb-channel-participant>
  <orb-channel-message id="q1" from="ada">How did the schema change?</orb-channel-message>
</orb-channel>
<button id="ask" type="button">Ask Claude</button>
```

```javascript
await customElements.whenDefined("orb-channel");
const { createMessageWriter } = await import("/build/components/index.js");
const channel = document.querySelector("#writer");
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
document.querySelector("#ask").addEventListener("click", async () => {
  const writer = createMessageWriter(channel, { from: "claude" });
  writer.reasoning("The schema changed twice. I'll fetch both versions.");
  await wait(400);
  writer.toolCall({ callId: "t1", name: "fetch_schema", args: { id: "v2" } });
  await wait(400);
  writer.toolResult("t1", { fields: 12 });
  writer.text("Version 2 has **12** fields, up from 9.");
  writer.finish();
});
```

:::

### Streaming

While an AI message streams, it has a cursor, and the send button becomes a stop button that emits `orbStop`. `while-streaming` on the composer decides what a send does meanwhile: `block` ignores it, `queue` keeps the draft until the answer finishes, and `interrupt` stops the answer first.

::: live-code-demo

```html
<orb-channel id="stream" pov="ada" echo style="height: 600px;">
  <orb-channel-participant id="ada" name="Ada"></orb-channel-participant>
  <orb-channel-participant id="claude" name="Claude" role="ai" ai-label="Assistant"></orb-channel-participant>
  <orb-channel-composer name="body" placeholder="Ask Claude" while-streaming="queue"></orb-channel-composer>
</orb-channel>
```

```javascript
await customElements.whenDefined("orb-channel");
const { createMessageWriter } = await import("/build/components/index.js");
const channel = document.querySelector("#stream");
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let writer;
let stopped = false;
channel.addEventListener("orbStop", () => (stopped = true));
channel.addEventListener("orbSend", async ({ detail }) => {
  if (detail.respondents.length === 0) return;
  // The echo of the question is added after this event, so the answer waits a tick to come after it
  await wait(0);
  stopped = false;
  writer = createMessageWriter(channel, { from: "claude" });
  for (const sentence of ["Three things changed. ", "The compiler is faster. ", "Imports are stricter now."]) {
    if (stopped) break;
    await wait(500);
    writer.text(sentence);
  }
  writer.finish();
});
```

:::

### Reasoning and tool calls

Reasoning is a block above the answer, shown closed unless the channel's `reasoning` attribute is `show`. A tool call that `awaiting-approval` shows approve and deny buttons. Those emit `orbToolDecision`, and the app runs the tool and sets the call's `status`.

::: live-code-demo

```html
<orb-channel id="tools" pov="ada" reasoning="show" style="height: 600px;">
  <orb-channel-participant id="ada" name="Ada"></orb-channel-participant>
  <orb-channel-participant id="claude" name="Claude" role="ai" ai-label="Assistant"></orb-channel-participant>
  <orb-channel-message id="a1" from="claude">
    <orb-channel-reasoning state="done" duration="2.1s">The branch looks unused. I'll check before removing it.</orb-channel-reasoning>
    <orb-channel-tool-call name="delete_branch" call-id="t1" status="awaiting-approval" requires-approval>
      <script type="application/json" data-part="args">{"branch": "old-api"}</script>
    </orb-channel-tool-call>
    I can delete the old-api branch once you approve.
  </orb-channel-message>
</orb-channel>
```

```javascript
await customElements.whenDefined("orb-channel");
document.querySelector("#tools").addEventListener("orbToolDecision", ({ detail }) => {
  detail.toolCall.setAttribute("status", detail.approved ? "done" : "denied");
});
```

:::

### Citations and suggestions

A citation is a numbered button that opens a popover with its link. Suggestions are chips above the message box. Clicking one fills the box, or sends it with `send`.

::: live-code-demo

```html
<orb-channel pov="ada" style="height: 600px;">
  <orb-channel-participant id="ada" name="Ada"></orb-channel-participant>
  <orb-channel-participant id="claude" name="Claude" role="ai" ai-label="Assistant"></orb-channel-participant>
  <orb-channel-message from="claude">
    The v2 schema drops the legacy id field<orb-channel-citation href="https://example.com/schema-v2" index="1" title="Schema v2 notes"></orb-channel-citation>, and adds a kind field<orb-channel-citation href="https://example.com/changelog" index="2" title="Changelog"></orb-channel-citation>.
  </orb-channel-message>
  <orb-channel-suggestions label="Suggested replies">
    <orb-channel-suggestion>Show me the migration steps</orb-channel-suggestion>
    <orb-channel-suggestion send>Thanks, that helps</orb-channel-suggestion>
  </orb-channel-suggestions>
  <orb-channel-composer name="body"></orb-channel-composer>
</orb-channel>
```

:::

### Versions

A message with `<orb-channel-variants>` has a version switcher. Its arrows emit `orbVariantChange`, and the app shows the version with `replaceFrom()`, which removes the message and every message after it, and puts the new content in their place. Regenerate in an AI message's menu emits a cancelable `orbRegenerate`.

::: live-code-demo

```html
<orb-channel id="versions-demo" pov="ada" style="height: 600px;">
  <orb-channel-participant id="ada" name="Ada"></orb-channel-participant>
  <orb-channel-participant id="claude" name="Claude" role="ai" ai-label="Assistant"></orb-channel-participant>
  <orb-channel-message id="v1" from="claude">
    Porto is best in spring.
    <orb-channel-variants current="1" count="2"></orb-channel-variants>
  </orb-channel-message>
</orb-channel>
```

```javascript
await customElements.whenDefined("orb-channel");
const channel = document.querySelector("#versions-demo");
const versions = ["Porto is best in spring, when the weather is mild.", "Porto is lovely in late September, before the crowds."];
channel.addEventListener("orbVariantChange", ({ detail }) => {
  channel.replaceFrom(
    detail.message,
    `<orb-channel-message id="v-${detail.current}" from="claude">${versions[detail.current - 1]}<orb-channel-variants current="${detail.current}" count="${versions.length}"></orb-channel-variants></orb-channel-message>`,
  );
});
```

:::

## Read tracking

`orbRead` is emitted once for each message that's at least half in view.

::: live-code-demo

```html
<orb-channel id="read" pov="ada" style="height: 600px;">
  <orb-channel-participant id="grace" name="Grace"></orb-channel-participant>
  <orb-channel-message from="grace">Message 1</orb-channel-message>
  <orb-channel-message from="grace">Message 2</orb-channel-message>
  <orb-channel-message from="grace">Message 3</orb-channel-message>
  <orb-channel-message from="grace">Message 4</orb-channel-message>
  <orb-channel-message from="grace">Message 5</orb-channel-message>
  <orb-channel-message from="grace">Message 6</orb-channel-message>
  <orb-channel-message from="grace">Message 7</orb-channel-message>
  <orb-channel-message from="grace">Message 8</orb-channel-message>
  <orb-channel-message from="grace">Message 9</orb-channel-message>
  <orb-channel-message from="grace">Message 10</orb-channel-message>
</orb-channel>
<p id="read-output" role="status"></p>
```

```javascript
await customElements.whenDefined("orb-channel");
let seen = 0;
document.querySelector("#read").addEventListener("orbRead", () => {
  document.querySelector("#read-output").textContent = `Seen ${++seen} message(s)`;
});
```

:::

## Threads

A reply has `thread` set to the `id` of the message it answers. `threads` decides where replies show: `none` puts them in the list, `inline` shows them under their message, and `panel` opens them beside the list. Replies to replies are indented up to `max-depth`. Reply in a panel sends to the thread, and `echo` gives the reply its `thread`.

::: live-code-demo

```html
<orb-channel id="threads-demo" pov="ada" threads="panel" echo style="height: 600px;">
  <orb-channel-participant id="ada" name="Ada"></orb-channel-participant>
  <orb-channel-participant id="grace" name="Grace"></orb-channel-participant>
  <orb-channel-message id="m1" from="grace">Release 2.0 is out!</orb-channel-message>
  <orb-channel-message id="r1" from="ada" thread="m1">Congrats!</orb-channel-message>
  <orb-channel-message id="r2" from="grace" thread="m1">The changelog is in the docs.</orb-channel-message>
  <orb-channel-message id="m2" from="grace">Anyone going to the meetup?</orb-channel-message>
  <orb-channel-composer name="body" placeholder="Message the channel"></orb-channel-composer>
</orb-channel>
```

:::

Inline threads open and close under their message, and `thread-state="collapsed"` starts one closed. `thread-count` says how many replies there are, when not all of them are in the DOM. The button for the missing ones emits `orbLoadMore` with the `parent`.

::: live-code-demo

```html
<orb-channel id="inline" pov="ada" threads="inline" max-depth="2" style="height: 600px;">
  <orb-channel-participant id="ada" name="Ada"></orb-channel-participant>
  <orb-channel-participant id="grace" name="Grace"></orb-channel-participant>
  <orb-channel-message id="m1" from="grace" thread-count="5">Who's reviewing the migration?</orb-channel-message>
  <orb-channel-message id="r1" from="ada" thread="m1">I can take the first half.</orb-channel-message>
  <orb-channel-message id="r2" from="grace" thread="r1">Thanks. Start with the schema.</orb-channel-message>
  <orb-channel-message id="m2" from="ada">Lunch at noon?</orb-channel-message>
  <orb-channel-composer name="body" placeholder="Message the channel"></orb-channel-composer>
</orb-channel>
```

:::

## Long lists

A long list draws only the messages near its viewport, and the rest are spacers. Scrolling to the top emits `orbLoadMore` with the oldest message's `id` as `cursor`. Set `loading-more` while the app loads, and the older messages go in the list, where the message in view stays put. `scrollToMessage()` and a `#id` in the URL's hash go to any message. Once the list is above its bottom, a pill counts the messages that arrive and goes back to the newest.

::: live-code-demo

```html
<orb-channel id="long" pov="ada" style="height: 600px;">
  <orb-channel-participant id="ada" name="Ada"></orb-channel-participant>
  <orb-channel-participant id="grace" name="Grace"></orb-channel-participant>
  <orb-channel-composer name="body"></orb-channel-composer>
</orb-channel>
```

```javascript
await customElements.whenDefined("orb-channel");
const channel = document.querySelector("#long");
const make = (id, text) => {
  const message = document.createElement("orb-channel-message");
  message.id = id;
  message.setAttribute("from", "grace");
  message.textContent = text;
  return message;
};
for (let i = 0; i < 500; i++) channel.append(make(`m${i}`, `Message ${i}`));
let older = 0;
channel.addEventListener("orbLoadMore", async () => {
  channel.setAttribute("loading-more", "");
  await new Promise((resolve) => setTimeout(resolve, 600));
  const first = channel.querySelector("orb-channel-message");
  for (let i = 0; i < 20; i++) channel.insertBefore(make(`old${++older}`, `Older message ${older}`), first);
  channel.removeAttribute("loading-more");
});
```

:::

## Page scrolling

By default the list scrolls inside the channel, which needs a height. With `scroll-target="document"`, the page scrolls instead: the channel is as tall as its messages and has no height of its own. The composer stays at the bottom of the screen, and the jump pill sits above it. Following new messages, paging, `scrollToMessage()` and the jump pill work as they do with the list. The page itself has to be what scrolls. A channel inside another scrolling element can't follow the page's position.

```html
<orb-channel pov="ada" scroll-target="document">
  <orb-channel-participant id="ada" name="Ada"></orb-channel-participant>
  <orb-channel-participant id="grace" name="Grace"></orb-channel-participant>
  <orb-channel-message from="grace">The page scrolls, not the list.</orb-channel-message>
  <orb-channel-composer name="body"></orb-channel-composer>
</orb-channel>
```

## Receipts, typing and presence

`receipts` shows Delivered or Read under the viewer's last message. A participant with `typing` shows a line, and the viewer's typing emits `orbTyping`. `presence` counts the people online in the header, or names them.

::: live-code-demo

```html
<orb-channel pov="ada" kind="group" presence="sampled" receipts="read" style="height: 600px;">
  <orb-channel-participant id="ada" name="Ada" presence="online"></orb-channel-participant>
  <orb-channel-participant id="grace" name="Grace" presence="online" typing></orb-channel-participant>
  <orb-channel-participant id="lin" name="Lin" presence="away"></orb-channel-participant>
  <orb-channel-message id="p1" from="ada" status="read">Shipping it now.</orb-channel-message>
  <orb-channel-composer name="body" placeholder="Message the team"></orb-channel-composer>
</orb-channel>
```

:::

## Layouts

`layout` is `bubbles` (the default), `flat`, `assistant` or `compact`. `flat` puts every message at the start with its name, as in a comment section. `assistant` keeps bubbles for the `pov` participant, so other messages get the full width for code and tables. `compact` is one line per message. The buttons switch the layout.

::: live-code-demo

```html
<orb-channel id="layouts-demo" pov="ada" style="height: 600px;">
  <orb-channel-participant id="ada" name="Ada"></orb-channel-participant>
  <orb-channel-participant id="grace" name="Grace"></orb-channel-participant>
  <orb-channel-message from="grace">Shipped the new build.</orb-channel-message>
  <orb-channel-message from="ada">Nice. Did the tests pass?</orb-channel-message>
  <orb-channel-message from="grace">All of them.</orb-channel-message>
</orb-channel>
<button data-layout="bubbles">Bubbles</button>
<button data-layout="flat">Flat</button>
<button data-layout="assistant">Assistant</button>
<button data-layout="compact">Compact</button>
```

```javascript
await customElements.whenDefined("orb-channel");
const channel = document.querySelector("#layouts-demo");
for (const button of document.querySelectorAll("button[data-layout]")) {
  button.addEventListener("click", () => (channel.layout = button.dataset.layout));
}
```

:::

## Scrolling

`anchor="top"` starts the list at the top, with the composer above it. New messages don't move the list, and `orbLoadMore` fires near the bottom with `direction: "after"` and the newest message's `id` as the cursor. `follow="question"` brings the viewer's message to the top when they send it, and the answer grows below it. `pause-on-scroll` stops following while the pointer is over the list. The pill then reads "Chat paused, 3 new", and clicking it resumes. `jump-to-latest="false"` hides the pill.

::: live-code-demo

```html
<orb-channel id="scroll-demo" pov="ada" follow="question" echo style="height: 600px;">
  <orb-channel-participant id="ada" name="Ada"></orb-channel-participant>
  <orb-channel-participant id="grace" name="Grace"></orb-channel-participant>
  <orb-channel-message from="grace">Porto has a new tram line.</orb-channel-message>
  <orb-channel-message from="grace">It goes to the old town.</orb-channel-message>
  <orb-channel-message from="grace">Ask me anything about it.</orb-channel-message>
  <orb-channel-composer name="body" placeholder="Ask a question"></orb-channel-composer>
</orb-channel>
```

:::

## Announcements

By default the list is a `log` with `aria-live="polite"`, so each new message is read out. `announce="false"` makes it a `feed` of articles, which doesn't announce each message. Comment sections use it. With `max-depth` above 1 and inline threads, replies are nested in their parent's message, so a screen reader hears how deep each one is. On a message, Right opens its replies and Left closes them. On a reply, Left goes to its parent.

## Votes

`votes="up"` adds an up button, and `votes="up-down"` adds both. The message's `score` is shown between them. Its `vote` is the viewer's own vote. A button emits a cancelable `orbVote` with `{ message, value }`, where `value` is `up`, `down`, or `none` when the vote is taken back. The app sets `score` and `vote`.

::: live-code-demo

```html
<orb-channel id="votes-demo" pov="ada" votes="up-down" style="height: 600px;">
  <orb-channel-participant id="ada" name="Ada"></orb-channel-participant>
  <orb-channel-participant id="grace" name="Grace"></orb-channel-participant>
  <orb-channel-message id="post" from="grace" score="4">Porto has a great bookshop by the river.</orb-channel-message>
</orb-channel>
```

```javascript
await customElements.whenDefined("orb-channel");
const channel = document.querySelector("#votes-demo");
const sign = (value) => (value === "up" ? 1 : value === "down" ? -1 : 0);
channel.addEventListener("orbVote", ({ detail }) => {
  const { message, value } = detail;
  message.score = (message.score ?? 0) + sign(value) - sign(message.vote);
  message.vote = value === "none" ? undefined : value;
});
```

:::

## Sorting

`sorts="top new old"` adds a sort menu above the list. Choosing an option emits a cancelable `orbSortChange` with `{ sort }`, and sets `sort` on the channel. The app puts the messages in order, since the DOM order is the order.

::: live-code-demo

```html
<orb-channel id="sort-demo" pov="ada" sorts="top new old" style="height: 600px;">
  <orb-channel-participant id="ada" name="Ada"></orb-channel-participant>
  <orb-channel-participant id="grace" name="Grace"></orb-channel-participant>
  <orb-channel-message from="grace" ts="2025-06-01T09:00:00Z" score="2">The tram opens in June.</orb-channel-message>
  <orb-channel-message from="ada" ts="2025-06-01T10:00:00Z" score="9">Which stop is closest to the cathedral?</orb-channel-message>
  <orb-channel-message from="grace" ts="2025-06-01T11:00:00Z" score="5">The stop in the old town.</orb-channel-message>
</orb-channel>
```

```javascript
await customElements.whenDefined("orb-channel");
const channel = document.querySelector("#sort-demo");
const messages = Array.from(channel.querySelectorAll("orb-channel-message"));
const time = (message) => Date.parse(message.ts);
const orders = {
  top: (a, b) => b.score - a.score,
  new: (a, b) => time(b) - time(a),
  old: (a, b) => time(a) - time(b),
};
channel.addEventListener("orbSortChange", ({ detail }) => {
  for (const message of [...messages].sort(orders[detail.sort])) channel.append(message);
});
```

:::

## Message actions

`actions` lists the message actions, in order: `react`, `reply`, `copy`, `copy-link`, `edit`, `delete`, `pin`, `regenerate` and `report`. `edit` and `delete` show only on the `pov` participant's messages, `regenerate` only on AI messages, and `report` only on other people's. Without `react`, there's no reaction row.

`copy-link` copies the page's address with the message's `#id`. `permalink="/posts/42#{id}"` sets another address, with `{id}` filled in. `pin` emits a cancelable `orbPin` with `{ message, pinned }`, and the app sets `pinned` on the message.

::: live-code-demo

```html
<orb-channel id="actions-demo" pov="ada" actions="copy-link pin" style="height: 600px;">
  <orb-channel-participant id="ada" name="Ada"></orb-channel-participant>
  <orb-channel-participant id="grace" name="Grace"></orb-channel-participant>
  <orb-channel-message id="a1" from="grace">The tram map is on the city site.</orb-channel-message>
  <orb-channel-message id="a2" from="ada">Thanks, that's what I needed.</orb-channel-message>
</orb-channel>
<p id="actions-status" role="status"></p>
```

```javascript
await customElements.whenDefined("orb-channel");
const channel = document.querySelector("#actions-demo");
channel.addEventListener("orbPin", ({ detail }) => {
  detail.message.pinned = detail.pinned;
  document.querySelector("#actions-status").textContent = `${detail.pinned ? "Pinned" : "Unpinned"}: ${detail.message.textContent.trim()}`;
});
```

:::

## Coalescing

`coalesce="250ms"` waits that long after an update before drawing, so a burst of messages is drawn once. Without it, the channel draws updates once per frame. A fast feed uses it.

::: live-code-demo

```html
<orb-channel id="coalesce-demo" pov="ada" coalesce="250ms" style="height: 600px;">
  <orb-channel-participant id="ada" name="Ada"></orb-channel-participant>
  <orb-channel-participant id="grace" name="Grace"></orb-channel-participant>
</orb-channel>
<button id="coalesce-burst">Send 20 messages</button>
```

```javascript
await customElements.whenDefined("orb-channel");
const channel = document.querySelector("#coalesce-demo");
document.querySelector("#coalesce-burst").addEventListener("click", () => {
  for (let i = 1; i <= 20; i++) {
    const message = document.createElement("orb-channel-message");
    message.setAttribute("from", i % 2 ? "grace" : "ada");
    message.textContent = `Update ${i}`;
    channel.append(message);
  }
});
```

:::

## Presets

`preset` is a familiar format, and it sets the attributes people would otherwise have to remember, including `kind` when `kind` isn't set. An attribute on the element wins over the preset, and the preset wins over the default for the kind. Changing `preset` after loading refills the settings the app hasn't set.

| Setting | `assistant` | `workspace` | `comments` | `live` |
|---|---|---|---|---|
| `kind` | `direct` | `group` | `open` | `open` |
| `layout` | `assistant` | `flat` | `flat` | `compact` |
| `show-names` | off | on | on | on |
| `avatars` | off | on | on | on |
| `group-within` | `0` | `5m` | `5m` | `0` |
| `date-dividers` | off | on | on | on |
| `follow` | `question` | `bottom` | `bottom` | `bottom` |
| `anchor` | `bottom` | `bottom` | `top` | `bottom` |
| `threads` | `none` | `panel` | `inline` | `none` |
| `receipts` | `read` | `delivered` | `none` | `none` |
| `presence` | `none` | `sampled` | `none` | `sampled` |
| `announce` | on | on | off | off |
| `pause-on-scroll` | off | off | off | on |
| `votes` | `none` | `none` | `up-down` | `none` |
| `sorts` | none | none | `top new old` | none |
| `max-depth` | `1` | `1` | `3` | `1` |
| `coalesce` | `0` | `0` | `0` | `250ms` |

### Assistant

One person and an AI assistant. The viewer's messages are bubbles, the assistant's answers are full width, and a question scrolls to the top.

::: live-code-demo

```html
<orb-channel id="preset-assistant-demo" preset="assistant" pov="ada" echo style="height: 600px;">
  <orb-channel-participant id="ada" name="Ada"></orb-channel-participant>
  <orb-channel-participant id="claude" name="Claude" role="ai" ai-label="Assistant"></orb-channel-participant>
  <orb-channel-message from="ada">When is the best time to visit Porto?</orb-channel-message>
  <orb-channel-message from="claude">Spring, from April to June, when the weather is mild and the crowds are smaller.</orb-channel-message>
  <orb-channel-composer name="ask" placeholder="Ask Claude"></orb-channel-composer>
</orb-channel>
```

:::

### Workspace

A team chat. Messages are flat, with names, avatars, a thread panel, delivery receipts and presence.

::: live-code-demo

```html
<orb-channel id="preset-workspace-demo" preset="workspace" pov="ada" style="height: 600px;">
  <orb-channel-participant id="ada" name="Ada" presence="online"></orb-channel-participant>
  <orb-channel-participant id="grace" name="Grace" presence="online"></orb-channel-participant>
  <orb-channel-message from="grace" ts="2025-06-02T09:00:00Z">The release notes are ready for review.</orb-channel-message>
  <orb-channel-message from="ada" ts="2025-06-02T09:05:00Z">Thanks, I'll read them after lunch.</orb-channel-message>
  <orb-channel-composer name="body" placeholder="Message the team"></orb-channel-composer>
</orb-channel>
```

:::

### Comments

A comment section. The list starts at the top, with the composer above it. Votes and sorting are on, replies are nested up to three levels, and announcements are off.

::: live-code-demo

```html
<orb-channel id="preset-comments-demo" preset="comments" pov="ada" style="height: 600px;">
  <orb-channel-participant id="ada" name="Ada"></orb-channel-participant>
  <orb-channel-participant id="grace" name="Grace"></orb-channel-participant>
  <orb-channel-message id="c1" from="grace" score="7">The walking tour was the highlight.</orb-channel-message>
  <orb-channel-message id="c2" from="ada" thread="c1" score="2">Which company did you take?</orb-channel-message>
  <orb-channel-message id="c3" from="grace" thread="c2" score="1">The one that starts at the cathedral.</orb-channel-message>
  <orb-channel-message id="c4" from="ada" score="3">Has anyone tried the bookshops by the river?</orb-channel-message>
  <orb-channel-composer name="comment" placeholder="Add a comment"></orb-channel-composer>
</orb-channel>
```

:::

### Live

A fast feed. Messages are one line each, the list doesn't announce each one, updates are drawn every 250 ms, and scrolling up pauses the list.

::: live-code-demo

```html
<orb-channel id="preset-live-demo" preset="live" pov="ada" style="height: 600px;">
  <orb-channel-participant id="ada" name="Ada"></orb-channel-participant>
  <orb-channel-participant id="grace" name="Grace"></orb-channel-participant>
  <orb-channel-message from="grace">Build 1412 is out.</orb-channel-message>
  <orb-channel-message from="ada">Deploying now.</orb-channel-message>
</orb-channel>
<button id="live-burst">Send 20 messages</button>
```

```javascript
await customElements.whenDefined("orb-channel");
const channel = document.querySelector("#preset-live-demo");
document.querySelector("#live-burst").addEventListener("click", () => {
  for (let i = 1; i <= 20; i++) {
    const message = document.createElement("orb-channel-message");
    message.setAttribute("from", i % 2 ? "grace" : "ada");
    message.textContent = `Update ${i}`;
    channel.append(message);
  }
});
```

:::

## Transports

A transport sends the channel's messages, and receives the server's copies. Set it as `transport`. It has three methods:

- `send(message)` sends one message. Resolve when the server has it, or reject with the reason to show the message as failed.
- `subscribe(handlers)` starts receiving. Pass each HTML fragment from the server to `handlers.receive(html)`. It returns a function that stops.
- `history(cursor)` is optional. It resolves to the HTML of the messages before `cursor`, oldest first, or to `""` when there are none. The channel calls it when the list scrolls to the top.

A message shows as sending while it's sent. When the server's copy arrives with the same `client-id`, it replaces the sending message. A failed message has a Retry button, which sends it again. `orbRetry` is cancelable, for an app that sends retries itself. `echo` isn't needed with a transport.

::: live-code-demo

```html
<orb-channel id="transport-demo" pov="ada" style="height: 600px;">
  <orb-channel-participant id="ada" name="Ada"></orb-channel-participant>
  <orb-channel-participant id="grace" name="Grace"></orb-channel-participant>
  <orb-channel-message from="grace">Send a message. Put "fail" in one to see a failed send, then press Retry.</orb-channel-message>
  <orb-channel-composer name="body" placeholder="Write a message"></orb-channel-composer>
</orb-channel>
```

```javascript
await customElements.whenDefined("orb-channel");
const channel = document.querySelector("#transport-demo");
const escape = (text) => text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const attempts = new Map();
let handlers;
let count = 0;
channel.transport = {
  async send(message) {
    await sleep(600);
    const tries = (attempts.get(message.clientId) ?? 0) + 1;
    attempts.set(message.clientId, tries);
    if (message.text.includes("fail") && tries === 1) throw new Error("Offline. Check the connection.");
    handlers.receive(`<orb-channel-message id="sent-${++count}" from="ada" client-id="${message.clientId}">${escape(message.text)}</orb-channel-message>`);
    await sleep(800);
    handlers.receive(`<orb-channel-message id="reply-${count}" from="grace">Got it: ${escape(message.text)}</orb-channel-message>`);
  },
  subscribe(next) {
    handlers = next;
    return () => (handlers = undefined);
  },
};
```

:::

### Declared transports

`<orb-channel-transport>` describes a transport in HTML, for an app that doesn't write one in JavaScript. Its `type` decides how messages travel:

| `type` | Sends | Receives |
|---|---|---|
| `form` | POST to `action`. The response's HTML is shown. | Nothing |
| `sse` | POST to `action`, when it's set | Events from `src`. Each event's `data` is HTML. |
| `websocket` | Over the socket at `src`, as JSON | Messages from the socket, each one HTML |
| `poll` | POST to `action`, when it's set | HTML from `src`, fetched every `interval` (5s by default) |

A POST sends the message's fields: `client-id`, `from`, `text`, `format`, `html` and `thread`, with a `mention` or `respondent` field for each id, and a `file` field for each file. A websocket sends the same fields as JSON, without files.

```html
<orb-channel pov="ada" style="height: 600px;">
  <orb-channel-participant id="ada" name="Ada"></orb-channel-participant>
  <orb-channel-transport type="websocket" src="wss://chat.example.com/room/42"></orb-channel-transport>
  <orb-channel-composer name="body"></orb-channel-composer>
</orb-channel>
```

The server sends HTML, in the same markup as the channel's children, and message content still goes in `<script>` tags. A message whose `id` is already shown is replaced, and the others are added at the end. A message that a POST returns with its `client-id` replaces the sending one. The channel reconnects when a transport's attributes change.

### Paging

Without `history`, scrolling to the top still emits `orbLoadMore`, and the app loads the messages. With `history`, the channel calls it with the oldest message's `id` and puts the result above the list, with `loading-more` set while it loads. Cancel `orbLoadMore` to keep the default.

```javascript
channel.transport = {
  send: (message) => api.post("/messages", message),
  subscribe: (handlers) => socket.on("message", (html) => handlers.receive(html)),
  history: (cursor) => fetch(`/messages?before=${cursor}`).then((response) => response.text()),
};
```

## Participant sources

When a message comes from someone the channel doesn't have, it asks for them with an `orb-channel-participant-source`. Requests go out in batches of 50, and each person is asked for once. The `{ids}` in `href` is the ids, comma-separated and URL-encoded. The response is HTML of `orb-channel-participant` elements, which are added to the channel. A failed request is logged, and the people are asked for again on the channel's next change.

```html
<orb-channel pov="ada" style="height: 600px;">
  <orb-channel-participant-source href="/people?ids={ids}"></orb-channel-participant-source>
  <orb-channel-message from="zoe">Hello from Zoe.</orb-channel-message>
</orb-channel>
```

## Drafts

With `drafts="persist"` and a `key`, the composer's draft is kept in `localStorage`, and it comes back when the channel loads. Each thread's reply box keeps its own draft too. Sending clears the draft. Storage that's blocked or full keeps the draft in the page only.

::: live-code-demo

```html
<orb-channel id="drafts-demo" pov="ada" key="docs-drafts" drafts="persist" style="height: 600px;">
  <orb-channel-participant id="ada" name="Ada"></orb-channel-participant>
  <orb-channel-participant id="grace" name="Grace"></orb-channel-participant>
  <orb-channel-message from="grace">Type something, then reload the page. The draft is still in the box.</orb-channel-message>
  <orb-channel-composer name="body" placeholder="Write a message"></orb-channel-composer>
</orb-channel>
```

:::

## AI recipes

The channel doesn't call a model, and there's no adapter for one. Each recipe below turns a model's stream into calls on the message writer. Model SDKs change, so check their current docs.

### Vercel AI SDK

```javascript
import { createMessageWriter } from "orb-style";
import { streamText } from "ai";

const writer = createMessageWriter(channel, { from: "claude" });
try {
  const result = streamText({ model, prompt });
  for await (const text of result.textStream) writer.text(text);
  writer.finish();
} catch (error) {
  writer.fail(error.message);
}
```

### OpenAI

```javascript
import { createMessageWriter } from "orb-style";

const writer = createMessageWriter(channel, { from: "gpt" });
try {
  const stream = await openai.chat.completions.create({ model, messages, stream: true });
  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content;
    if (text) writer.text(text);
  }
  writer.finish();
} catch (error) {
  writer.fail(error.message);
}
```

### Anthropic

```javascript
import { createMessageWriter } from "orb-style";

const writer = createMessageWriter(channel, { from: "claude" });
try {
  const stream = anthropic.messages.stream({ model, max_tokens: 1024, messages });
  stream.on("text", (delta) => writer.text(delta));
  await stream.finalMessage();
  writer.finish();
} catch (error) {
  writer.fail(error.message);
}
```

For reasoning and tool calls, use `writer.reasoning()`, `writer.toolCall()` and `writer.toolResult()`, from the events the SDK gives for them.

## Methods

::: live-code-demo

```html
<orb-channel id="methods-demo" pov="ada" echo style="height: 600px;">
  <orb-channel-participant id="ada" name="Ada"></orb-channel-participant>
  <orb-channel-message id="first" from="ada">The first message</orb-channel-message>
  <orb-channel-message from="ada">2</orb-channel-message>
  <orb-channel-message from="ada">3</orb-channel-message>
  <orb-channel-message from="ada">4</orb-channel-message>
  <orb-channel-message from="ada">5</orb-channel-message>
  <orb-channel-message from="ada">6</orb-channel-message>
  <orb-channel-composer placeholder="Type here"></orb-channel-composer>
</orb-channel>
<button id="say">Send from code</button>
<button id="jump">Jump to the first message</button>
```

```javascript
await customElements.whenDefined("orb-channel");
const channel = document.querySelector("#methods-demo");
document.querySelector("#say").addEventListener("click", () => channel.send("Sent from code"));
document.querySelector("#jump").addEventListener("click", () => channel.scrollToMessage("first"));
```

:::
