---
title: "OrbPipe | <orb-pipe>"
sidebar_label: "Pipe"
---

## Usage

`<orb-pipe>` takes a unix-like expression, runs it through a chain of transforms, and renders the result as text.

::: live-code-demo

```html
<orb-stack>
  <orb-pipe input="handheldInterfaceDefinition | reverseCase | titlecase"></orb-pipe>
  <orb-pipe input="1200000000 | bytes -bit"></orb-pipe>
  <orb-pipe input="1000 | coalesce 0 | bytes"></orb-pipe>
</orb-stack>
```

:::

An expression reads left to right. The **first segment is a literal seed value**, not a pipe — everything after it is a pipe that receives the previous result:

```
handheldInterfaceDefinition  |  reverseCase  |  titlecase
└─ seed value ────────────┘     └─ pipe ──┘     └─ pipe ─┘
     ↓                               ↓                ↓
"handheldInterfaceDefinition" → "handheld interface definition" → "Handheld Interface Definition"
```

Because the seed is a literal, a single `<orb-pipe>` with no pipes just renders that text — the pipes are where the value comes from.

## Arguments and flags

Pipes take two kinds of arguments, separated by spaces. **Positional arguments** configure the pipe, and **flags** (`-name`) toggle options.

::: live-code-demo

```html
<orb-stack>
  <orb-pipe input="5 | pad 3 0"></orb-pipe>
  <orb-pipe input="1024 | bytes -binary"></orb-pipe>
  <orb-pipe input="0.42 | number -percent"></orb-pipe>
  <orb-pipe input="1234.5 | number 2"></orb-pipe>
  <orb-pipe input="1250000 | currency USD -compact"></orb-pipe>
</orb-stack>
```

:::

Flags may appear in any order and can be combined with positional arguments. A negative number like `-5` is treated as a value, not a flag, so arithmetic still works:

::: live-code-demo

```html
<orb-stack>
  <orb-pipe input="-7.2 | abs | ceil"></orb-pipe>
  <orb-pipe input="-1536 | bytes -binary 2"></orb-pipe>
</orb-stack>
```

:::

## Quoting and escaping

Wrap a value in single or double quotes when it contains spaces, or when it contains a `|` that shouldn't split the expression. Quotes are stripped from the result. Alternatively, escape a single character with a backslash.

::: live-code-demo

```html
<orb-stack>
  <orb-pipe input="'Some Long Sentence Here' | truncate 12"></orb-pipe>
  <orb-pipe input="'a | b' | uppercase"></orb-pipe>
  <orb-pipe input="a \| b | uppercase"></orb-pipe>
  <orb-pipe input="'  spaced out  ' | trim | titlecase"></orb-pipe>
</orb-stack>
```

:::

Quoting matters for arguments too — a suffix or filler containing a space has to be quoted:

::: live-code-demo

```html
<orb-stack>
  <orb-pipe input="'The quick brown fox jumps' | truncate 20 ' →'"></orb-pipe>
  <orb-pipe input="'The quick brown fox jumps' | truncate 20 -words"></orb-pipe>
</orb-stack>
```

:::

Note that `truncate`'s suffix counts toward the length limit, so output never exceeds it. Adding `-words` avoids cutting through the middle of a word.

## Chaining

Pipes compose, and order is significant. The same two pipes in opposite order give different results:

::: live-code-demo

```html
<orb-stack>
  <orb-pipe input="user_profile_settings | reverseCase | titlecase"></orb-pipe>
  <orb-pipe input="user_profile_settings | titlecase | reverseCase"></orb-pipe>
</orb-stack>
```

:::

Chains can be as long as you need. Here `coalesce` supplies a fallback before the value reaches the formatter, which is the usual reason to reach for it:

::: live-code-demo

```html
<orb-stack>
  <orb-pipe input="'' | coalesce 0 | bytes"></orb-pipe>
  <orb-pipe input="0 | coalesce 2048 -zero | bytes -binary"></orb-pipe>
  <orb-pipe input="1 | pluralize file"></orb-pipe>
  <orb-pipe input="4 | pluralize file"></orb-pipe>
  <orb-pipe input="1 | pluralize person people"></orb-pipe>
</orb-stack>
```

:::

## Case pipes

`capitalize` uppercases only the first letter, while `titlecase` uppercases the first letter of every word. `reverseCase` splits an identifier written in camel, pascal, snake, kebab, or dot case into lowercase words — it detects the style automatically, so no argument is needed.

::: live-code-demo

```html
<orb-stack>
  <orb-pipe input="'hello world' | capitalize"></orb-pipe>
  <orb-pipe input="'hello world' | titlecase"></orb-pipe>
  <orb-pipe input="camelCaseValue | reverseCase"></orb-pipe>
  <orb-pipe input="PascalCaseValue | reverseCase"></orb-pipe>
  <orb-pipe input="snake_case_value | reverseCase"></orb-pipe>
  <orb-pipe input="kebab-case-value | reverseCase"></orb-pipe>
  <orb-pipe input="HTTPServerError | reverseCase | titlecase"></orb-pipe>
  <orb-pipe input="'Hello There, World!' | slugify"></orb-pipe>
</orb-stack>
```

:::

`reverseCase` keeps acronym runs together — `HTTPServerError` becomes `http server error` rather than splitting every capital.

## Byte sizes

`bytes` uses SI (1000-based) units by default. Add `-binary` for IEC (1024-based) units, and `-bit` to render bits instead of bytes. A positional argument sets the maximum decimal places (default `1`); trailing zeros are always trimmed.

::: live-code-demo

```html
<orb-stack>
  <orb-pipe input="1000 | bytes"></orb-pipe>
  <orb-pipe input="1024 | bytes -binary"></orb-pipe>
  <orb-pipe input="1200000000 | bytes -bit"></orb-pipe>
  <orb-pipe input="1536000 | bytes 2"></orb-pipe>
  <orb-pipe input="1536000 | bytes -binary 2"></orb-pipe>
  <orb-pipe input="999 | bytes"></orb-pipe>
  <orb-pipe input="0 | bytes"></orb-pipe>
</orb-stack>
```

:::

## Dates

`date` accepts a [date-fns format string](https://date-fns.org/docs/format) (default `PP`). Input may be an ISO string or a unix timestamp — timestamps small enough to predate 1973 are read as seconds, larger ones as milliseconds.

::: live-code-demo

```html
<orb-stack>
  <orb-pipe input="2026-03-14T12:00:00Z | date"></orb-pipe>
  <orb-pipe input="2026-03-14T12:00:00Z | date 'yyyy-MM-dd'"></orb-pipe>
  <orb-pipe input="2026-03-14T12:00:00Z | date 'EEEE, MMMM do'"></orb-pipe>
  <orb-pipe input="1773489600 | date 'MMM d, yyyy'"></orb-pipe>
</orb-stack>
```

:::

There is deliberately no relative ("3 months ago") pipe. Its output depends on the
current time, so it would be correct at render and quietly wrong minutes later.
Pipes are pure transforms of their input — anything that has to update itself over
time needs a component lifecycle to tear down and refresh, so that belongs in a
dedicated component rather than a pipe.

## Built-in pipes

| Pipe | Arguments | Flags | Description |
| --- | --- | --- | --- |
| `uppercase` | — | — | Uppercases the whole string. |
| `lowercase` | — | — | Lowercases the whole string. |
| `capitalize` | — | — | Uppercases the first letter only. |
| `titlecase` | — | — | Uppercases the first letter of every word. |
| `reverseCase` | — | — | Splits camel, pascal, snake, kebab or dot case into lowercase words. |
| `slugify` | — | — | Converts text to a url-friendly slug. |
| `truncate` | `length`, `suffix` | `-words` | Shortens to a max length, suffix included in the count. |
| `pad` | `length`, `filler` | `-end` | Pads to a length, at the start by default. |
| `trim` | — | — | Removes surrounding whitespace. |
| `coalesce` | `fallback` | `-zero` | Substitutes a fallback for empty input. |
| `pluralize` | `singular`, `plural` | `-bare` | Adds a plural suffix based on the count. |
| `number` | `minDigits`, `maxDigits` | `-percent`, `-compact`, `-nogroup` | `Intl` number formatting. |
| `decimal` | — | — | Alias of `number`. |
| `currency` | ISO code | `-compact`, `-round` | Currency formatting, defaults to `USD`. |
| `bytes` | decimal places | `-bit`, `-binary` | Byte and bit sizes. |
| `date` | format string | — | Formats a date or timestamp. |
| `ceil` | — | — | Rounds up. |
| `floor` | — | — | Rounds down. |
| `abs` | — | — | Absolute value. |
| `round` | decimal places | — | Rounds to the nearest value. |

Built-in pipes are **loaded on demand** — only the pipes an expression actually uses are fetched at runtime. Adding more built-ins doesn't grow the startup cost, so an app that only uses `bytes` never downloads the date formatting code.

## Registering custom pipes

Import `registerPipe` and pass either a function or a lazy loader. A pipe receives the previous value plus any arguments as strings:

::: live-code-demo

```html
<orb-stack>
  <orb-pipe input="hello | shout"></orb-pipe>
  <orb-pipe input="'Ada Lovelace' | initials"></orb-pipe>
  <orb-pipe input="'Grace Hopper' | initials | shout"></orb-pipe>
  <orb-pipe input="racecar | repeat 3 ' · '"></orb-pipe>
</orb-stack>
```

```javascript
import { registerPipe, registerPipes } from "orb-style";

registerPipe("shout", (input) => `${input ?? ""}!`);

registerPipes({
  initials: (input) =>
    String(input ?? "")
      .split(/\s+/)
      .map((word) => word.charAt(0).toUpperCase())
      .join(""),
  repeat: (input, times, separator = "") =>
    Array.from({ length: Number(times) || 1 }, () => input).join(separator),
});
```

:::

A custom pipe may return a string, a number, `null`, or a promise of one. Async pipes are awaited before the next pipe runs, so a pipe can fetch:

```javascript
registerPipe("username", async (id) => {
  const res = await fetch(`/api/users/${id}`);
  return (await res.json()).name;
});
```

Registering a name that already exists **overrides** it, which is how you'd swap a built-in for your own implementation:

```javascript
// Use IEC units everywhere without passing -binary each time.
registerPipe("bytes", { load: () => import("./pipes/my-bytes.js") });
```

### Keeping custom pipes out of the initial bundle

Passing a function registers it eagerly, so it ships in whatever bundle the `registerPipe` call lands in. That's the right choice for small pipes. For anything heavier, register `{ load: () => import(...) }` instead — the pipe is then code-split and fetched the first time an expression uses it:

```javascript
// Bundled eagerly — fine, it's three lines.
registerPipe("shout", (input) => `${input ?? ""}!`);

// Code-split — the markdown parser is only downloaded if something uses it.
registerPipe("markdown", { load: () => import("./pipes/markdown.js") });
```

The loaded module may export the pipe as its `default`, or be the function itself:

```javascript
// pipes/markdown.js
import { marked } from "marked";
export default (input) => marked.parseInline(String(input ?? ""));
```

Because the `load` callback contains a static `import()`, bundlers can see it and split it automatically. Registration lives in your own module graph, so pipes you never register are never shipped at all. Resolved pipes are cached, and several elements using the same pipe on one render share a single load.

## Error handling

`<orb-pipe>` never throws into your application. An unknown pipe name, a malformed expression, or a pipe that throws logs a warning to the console and renders the last successful value in the chain.

::: live-code-demo

```html
<orb-stack>
  <orb-pipe input="1000 | doesNotExist"></orb-pipe>
  <orb-pipe input="1000 | bytes | doesNotExist"></orb-pipe>
  <orb-pipe input="'unterminated | uppercase"></orb-pipe>
</orb-stack>
```

:::

The first renders `1000` (the seed survived), the second renders `1 kB` (the successful `bytes` result survived), and the third fails to parse so the whole expression is abandoned.

Failed evaluations set `data-error` on the host element. Once evaluation finishes — successfully or not — `data-resolved` is set, which is useful for hiding content while lazy pipes load:

```css
orb-pipe:not([data-resolved]) {
  visibility: hidden;
}

orb-pipe[data-error] {
  color: var(--orb-color-danger);
}
```

Updating the `input` property re-runs the chain. If a slow chain is still resolving when `input` changes again, the stale result is discarded rather than overwriting the newer one.

## Accessibility

`<orb-pipe>` renders plain text with no implicit semantics or ARIA role, so it inherits the context it's placed in and can be used anywhere a text node would be. Treat it as text: give surrounding elements whatever labelling they need.

Content arrives asynchronously when a lazily-loaded pipe is involved. If a value updates in response to user action and the change needs announcing, put the element inside your own live region rather than relying on the component:

```html
<p aria-live="polite">
  Uploaded <orb-pipe input="1536000 | bytes"></orb-pipe> of 10 MB
</p>
```

Because the output is text rather than markup, pipes cannot inject elements or attributes into the page — a value containing something like `<script>` renders as literal characters.
