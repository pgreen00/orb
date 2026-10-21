---
title: 'OrbRelativeTime | <orb-relative-time>'
sidebar_label: 'Relative Time'
---

## Usage

Relative times display a date as a localized phrase relative to now, such as "3 hours ago" or "in 2 days". The phrase is rendered with the browser's `Intl.RelativeTimeFormat` API, so no language packs are required.

::: live-code-demo

```html
<orb-relative-time date="2025-12-02T00:00:00-05:00"></orb-relative-time>
```

:::

### Date

The `date` attribute sets the point in time the phrase is calculated from. If it's not set, the current date and time is used.

It accepts any string that `Date.parse()` understands, or a `Date` object set via JavaScript.

**Always use ISO 8601 date strings.** Ambiguous formats like `03/04/2020` can be read as March 4 or April 3 depending on the user's browser and locale. A valid ISO 8601 date-time string parses the same for every client.

::: live-code-demo

```html
<orb-relative-time id="date-demo"></orb-relative-time>
```

```javascript
const relativeTime = document.querySelector("#date-demo");
relativeTime.setAttribute("date", new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString());
```

:::

### Format

Use the `format` attribute to change how the phrase is written. Some locales display the same text for `narrow` and `short`.

::: live-code-demo

```html
<orb-relative-time date="2025-12-02T00:00:00-05:00" format="narrow"></orb-relative-time><br />
<orb-relative-time date="2025-12-02T00:00:00-05:00" format="short"></orb-relative-time><br />
<orb-relative-time date="2025-12-02T00:00:00-05:00" format="long"></orb-relative-time>
```

:::

### Numeric

By default, `numeric="auto"` uses phrases such as "yesterday" and "tomorrow" when they apply. Set `numeric="always"` to always show a number, such as "1 day ago" or "in 1 day".

::: live-code-demo

```html
<orb-relative-time id="numeric-auto-demo"></orb-relative-time><br />
<orb-relative-time id="numeric-always-demo" numeric="always"></orb-relative-time>
```

```javascript
const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
document.querySelector("#numeric-auto-demo").setAttribute("date", oneDayAgo);
document.querySelector("#numeric-always-demo").setAttribute("date", oneDayAgo);
```

:::

### Sync

Add the `sync` attribute to update the displayed phrase automatically as time passes.

::: live-code-demo

```html
<orb-relative-time id="sync-demo" sync></orb-relative-time>
```

```javascript
const relativeTime = document.querySelector("#sync-demo");
relativeTime.setAttribute("date", new Date(Date.now() - 60000).toISOString());
```

:::

### Localization

The phrase uses the browser's default locale. There is currently no way to choose a different locale on the component.
