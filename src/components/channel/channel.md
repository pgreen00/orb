---
title: 'OrbChannel | <orb-channel>'
sidebar_label: 'Channel'
---

Give the channel a height, since its list scrolls. The channel draws everything from its child elements: messages, participants, dividers and the composer.

## Messages

::: live-code-demo

```html
<orb-channel pov="ada" label="Grace" style="height: 260px;">
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
<orb-channel kind="group" pov="ada" style="height: 260px;">
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
<orb-channel kind="open" label="#general" description="Release news" pov="u1" style="height: 260px;">
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
<orb-channel pov="ada" show-names group-within="1m" style="height: 260px;">
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
<orb-channel label="Design review" description="Thursday, 3 pm" pov="ada" style="height: 220px;">
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
<orb-channel pov="ada" style="height: 260px;">
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
<orb-channel pov="ada" style="height: 320px;">
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
<orb-channel id="reactions" pov="ada" style="height: 260px;">
  <orb-channel-participant id="ada" name="Ada"></orb-channel-participant>
  <orb-channel-participant id="grace" name="Grace"></orb-channel-participant>
  <orb-channel-message id="m1" from="grace">Shipped the 2.0 release!
    <orb-channel-reaction emoji="🎉" by="ada"></orb-channel-reaction>
  </orb-channel-message>
</orb-channel>
```

```javascript
await customElements.whenDefined("orb-channel");
const channel = document.querySelector("#reactions");
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
<orb-channel pov="ada" style="height: 320px;">
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
<orb-channel pov="ada" style="height: 320px;">
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
<orb-channel id="actions" pov="ada" style="height: 240px;">
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
<orb-channel id="editing" pov="ada" style="height: 240px;">
  <orb-channel-participant id="ada" name="Ada"></orb-channel-participant>
  <orb-channel-message id="m1" from="ada">Merged this morning</orb-channel-message>
</orb-channel>
```

```javascript
await customElements.whenDefined("orb-channel");
document.querySelector("#editing").addEventListener("orbEditCommit", ({ detail }) => {
  detail.message.textContent = detail.text;
  detail.message.setAttribute("edited", "");
});
```

:::

## Moderation states

::: live-code-demo

```html
<orb-channel pov="ada" style="height: 300px;">
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
<orb-channel id="moderation" pov="ada" style="height: 280px;">
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
<orb-channel pov="ada" style="height: 260px;">
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
<orb-channel pov="ada" slow-mode="10s" echo style="height: 260px;">
  <orb-channel-participant id="ada" name="Ada"></orb-channel-participant>
  <orb-channel-composer placeholder="Send a message, then try again"></orb-channel-composer>
</orb-channel>
```

:::

## Sending

Enter sends. `echo` adds the sent message from the point of view. Cancel `orbSend` to keep the draft.

::: live-code-demo

```html
<orb-channel pov="ada" echo style="height: 260px;">
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
<orb-channel id="rich" pov="ada" style="height: 280px;">
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
<orb-channel id="commands" pov="ada" style="height: 280px;">
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
<orb-channel id="files" pov="ada" style="height: 280px;">
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
<orb-channel id="buttons" pov="ada" style="height: 280px;">
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

## Read tracking

`orbRead` is emitted once for each message that's at least half in view.

::: live-code-demo

```html
<orb-channel id="read" pov="ada" style="height: 200px;">
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

## Methods

::: live-code-demo

```html
<orb-channel id="methods" pov="ada" echo style="height: 240px;">
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
const channel = document.querySelector("#methods");
document.querySelector("#say").addEventListener("click", () => channel.send("Sent from code"));
document.querySelector("#jump").addEventListener("click", () => channel.scrollToMessage("first"));
```

:::
