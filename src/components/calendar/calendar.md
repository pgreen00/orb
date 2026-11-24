---
title: 'OrbCalendar | <orb-calendar>'
sidebar_label: 'Calendar'
wide: true
---

## Usage

`orb-calendar` is a full calendar with day, week, and month views, named calendars, all-day and recurring events, drag and resize, and ICS export. It manages its own scrolling, so give it a height.

Its events and calendars are child elements: `orb-calendar-event` and `orb-calendar-source`. Write them in markup, as you would list items. They don't render anything. The calendar draws them.

Changes are saved into those children for you. When the user creates, edits, drags, resizes, or deletes an event, the calendar writes the change into its children, so no listener is needed. To copy changes to your server, listen for the change events, as described under [Saving Changes](#saving-changes).

Click an empty slot to add an event, click an event to edit it, and drag to move it. The demos use fixed dates, so they open on the week of June 8, 2026. Today jumps away from them, which is fine.

::: live-code-demo

```html
<orb-calendar view="week" date="2026-06-08" style="height: 32rem;">
  <orb-calendar-source id="usage-work" name="Work" color="primary"></orb-calendar-source>
  <orb-calendar-source id="usage-home" name="Home" color="success"></orb-calendar-source>
  <orb-calendar-event id="usage-standup" calendar-id="usage-work" start="2026-06-08T09:00" end="2026-06-08T09:30" recurrence="FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR">Standup</orb-calendar-event>
  <orb-calendar-event id="usage-lunch" calendar-id="usage-home" start="2026-06-09T12:00" end="2026-06-09T13:00">Lunch</orb-calendar-event>
  <orb-calendar-event id="usage-conference" calendar-id="usage-work" start="2026-06-10" end="2026-06-13" all-day>Conference</orb-calendar-event>
</orb-calendar>
```

:::

## Events and Calendars

### Events

Each `orb-calendar-event` is one event. Its title is its text:

```html
<orb-calendar-event id="standup" calendar-id="work" start="2026-06-08T09:00" end="2026-06-08T09:30">Standup</orb-calendar-event>
```

| Attribute | Notes |
| --- | --- |
| `id` | Unique on the page. Needed to change the event. See [Ids](#ids). |
| `start` | When it starts. Required. An event without a usable `start` is skipped. |
| `end` | When it ends, exclusive. Optional: a timed event lasts an hour and an all-day event a day. |
| `all-day` | Present when the event lasts whole days, from `start` to `end`. |
| `calendar-id` | The `id` of an `orb-calendar-source`. Without it, the first calendar is used. |
| `location`, `notes`, `url` | Shown in the editor. `notes` can span lines. |
| `color` | Overrides the calendar's color. A token, a token and shade, or any CSS color. |
| `readonly` | Present when the event can't be dragged, resized, or edited. |
| `recurrence` | An [RRULE](https://icalendar.org/iCalendar-RFC-5545/3-8-5-3-recurrence-rule.html) without the `RRULE:` prefix, on a repeating event. See [Recurring Events](#recurring-events). |
| `recurrence-exceptions` | Start times to skip, separated by spaces. |
| `recurrence-parent-id`, `recurrence-id` | On an override only: the master's `id`, and the start of the occurrence it replaces. The calendar writes these, see [One Occurrence or the Whole Series](#one-occurrence-or-the-whole-series). |

Times can be written in any of these forms:

| Written as | Means |
| --- | --- |
| `2026-06-08T09:00-04:00` | An exact time, with its offset |
| `2026-06-08T09:00Z` | An exact time in UTC |
| `2026-06-08T09:00` | A local time, in the browser's time zone |
| `2026-06-08` | Local midnight. An all-day `start` or `end` is written this way too, and `end` is still exclusive. |
| `1780923600000` | Epoch milliseconds |

The calendar writes times as local time with the offset, and a date alone for all-day events. That keeps the wall-clock time across a daylight saving change. Seconds are written only when they're not zero.

You can also set these from JavaScript, as properties with camelCase names, such as `el.allDay = true` or `el.start = Date.now()`. A property doesn't change the markup, so the attributes keep what the page wrote.

#### Ids

An event's `id` must be unique on the page, not just within one calendar. If two events share an id, the later one is drawn, with a console warning.

An event without an `id` is drawn, but it's read-only: it can't be dragged, edited, or deleted, and the calendar logs a warning that names it. Give every event an `id` if users should be able to change it.

A new event that the user creates gets an id of its own, such as `event-mwu14dfv-1`. Overrides and series splits are named after the event they came from. See [One Occurrence or the Whole Series](#one-occurrence-or-the-whole-series).

### Calendars

Group events into named calendars, each with its own color. The sidebar lists them with checkboxes to show and hide them.

```html
<orb-calendar-source id="work" name="Work" color="primary"></orb-calendar-source>
```

| Attribute | Notes |
| --- | --- |
| `id` | Required. The name events use in `calendar-id`. A calendar without one is skipped, with a console warning. |
| `name` | Shown in the sidebar. |
| `color` | An orb color token (`primary`, `success`, `warning`, `danger`, `neutral`), a token and shade (`primary-600`), or any CSS color (`#f5871f`, `tomato`). |
| `hidden` | Present when the calendar starts hidden. The sidebar's checkbox adds and removes it. |
| `href` | Where its events come from, for the range on screen. See [Loading from a server](#loading-from-a-server). |

Without any `orb-calendar-source`, events use one implicit calendar, and the sidebar shows only the mini month. Set `show-sidebar="false"` to hide the sidebar altogether.

::: live-code-demo

```html
<orb-calendar view="week" date="2026-06-08" style="height: 30rem;">
  <orb-calendar-source id="calendars-work" name="Work" color="primary"></orb-calendar-source>
  <orb-calendar-source id="calendars-personal" name="Personal" color="success"></orb-calendar-source>
  <orb-calendar-source id="calendars-family" name="Family" color="#f5871f"></orb-calendar-source>
  <orb-calendar-event id="calendars-standup" calendar-id="calendars-work" start="2026-06-08T09:00" end="2026-06-08T09:30">Standup</orb-calendar-event>
  <orb-calendar-event id="calendars-gym" calendar-id="calendars-personal" start="2026-06-08T18:00" end="2026-06-08T19:00">Gym</orb-calendar-event>
  <orb-calendar-event id="calendars-dinner" calendar-id="calendars-family" start="2026-06-08T19:30" end="2026-06-08T21:00">Dinner</orb-calendar-event>
  <orb-calendar-event id="calendars-review" calendar-id="calendars-work" color="danger" start="2026-06-08T13:00" end="2026-06-08T14:00">Review (custom color)</orb-calendar-event>
</orb-calendar>
```

:::

Unchecking a calendar in the sidebar writes `hidden` on its `orb-calendar-source`. `orbSourceToggle` fires first, with `{ id, name, hidden, source }`, where `source` is that element. Call `preventDefault()` to keep the calendar as it was, for example to ask first. The checkbox goes back.

### Narrow calendars

Below `48rem` of the calendar's own width, the sidebar gives way to a Calendars button. Its menu lists the calendars with a checkbox each, and choosing one shows or hides it, as the sidebar's checkboxes do. The breakpoint is the calendar's width, not the screen's, so a calendar given a narrow width collapses on a wide screen too. It's fixed: `--orb-calendar-sidebar-width` doesn't move it, since a container query can't read a custom property. The mini month is in the sidebar only, so it's not available while the sidebar is collapsed.

::: live-code-demo

```html
<orb-calendar id="collapsed-calendar" view="week" date="2026-06-08" style="height: 26rem; max-width: 36rem;">
  <orb-calendar-source id="collapsed-work" name="Work" color="primary"></orb-calendar-source>
  <orb-calendar-source id="collapsed-home" name="Home" color="success"></orb-calendar-source>
  <orb-calendar-event id="collapsed-standup" calendar-id="collapsed-work" start="2026-06-08T09:00" end="2026-06-08T09:30">Standup</orb-calendar-event>
  <orb-calendar-event id="collapsed-lunch" calendar-id="collapsed-home" start="2026-06-09T12:00" end="2026-06-09T13:00">Lunch</orb-calendar-event>
</orb-calendar>
```

:::

### Reacting to Clicks

`orbEventClick` fires when an event is clicked. Its detail has the `occurrence` and the `element` it's drawn from. The built-in editor opens afterwards. Call `preventDefault()` to handle the click yourself instead.

::: live-code-demo

```html
<orb-calendar id="click-calendar" view="week" date="2026-06-08" show-sidebar="false" style="height: 26rem;">
  <orb-calendar-event id="click-me" start="2026-06-08T10:00" end="2026-06-08T11:00">Click me</orb-calendar-event>
</orb-calendar>
<p id="click-output" role="status" style="margin-top: 1rem;">Click an event.</p>
```

```javascript
await customElements.whenDefined("orb-calendar");
const cal = document.querySelector("#click-calendar");
const output = document.querySelector("#click-output");
cal.addEventListener("orbEventClick", (e) => {
  e.preventDefault();
  output.textContent = `Clicked: ${e.detail.occurrence.event.title}`;
});
```

:::

## Saving Changes

When the user creates, edits, drags, resizes, or deletes an event, the calendar emits a change event and then writes the change into its children. Copying the change somewhere else is up to you, so listen for these events when your server needs to know about them.

| Event | Fired when | Cancelable |
| --- | --- | --- |
| `orbEventCreate` | The user saves a new event, after clicking an empty slot or day | Yes |
| `orbEventUpdate` | The user saves edits, or drags or resizes an event | Yes |
| `orbEventDelete` | The user deletes an event | Yes |

Each one carries this in `event.detail`:

```ts
interface OrbCalendarMutation {
  event: OrbCalendarEvent;     // the new or edited event
  occurrenceStart?: number;    // for an edit to one occurrence of a recurring event
  scope: "single" | "occurrence" | "future" | "all";
}

interface OrbCalendarChangeDetail extends OrbCalendarMutation {
  element: HTMLElement;        // the element the change is written to
}
```

`element` is the new element for a create. For an update or a delete, it's the element of the event the user acted on: the occurrence's override if it has one, otherwise the master.

Calling `preventDefault()` on a change event stops the calendar from writing it. The editor still closes, and a canceled drag snaps back. Cancel when you want to save on your server first, as described below.

### Copying changes to a server

Post the detail. `element` is left out, since `JSON.stringify` can't send an element.

```js
cal.addEventListener("orbEventUpdate", ({ detail }) => {
  fetch("/api/events/changes", {
    method: "POST",
    body: JSON.stringify({ kind: "update", ...detail, element: undefined }),
  });
});
```

A Node server can run `applyEventChange` on its own copy of the events. Given the same change, it gets the same result as the calendar, including the same override and split ids. It's exported from `orb-style`:

```js
import { applyEventChange } from "orb-style";

events = applyEventChange(events, mutation, "update");
```

### Saving on the server first

Cancel the change, wait for the server, then apply what the server saved. `applyChange()` writes a change without emitting it, so the calendar doesn't ask again.

```js
cal.addEventListener("orbEventUpdate", async (e) => {
  e.preventDefault();
  const { element, ...mutation } = e.detail;
  const saved = await saveToServer(mutation.event); // your API call, returns the saved event
  await cal.applyChange({ ...mutation, event: saved }, "update");
});
```

The calendar shows the old event until `applyChange()` runs. Use `applyChange(mutation, "create")` or `"delete"` for the other two kinds.

### Server ids

A new event keeps the id the calendar generated, until you change it. To use the server's id, set `detail.element.id`. The calendar follows the rename, and any overrides that pointed at the old id now point at the new one.

```js
cal.addEventListener("orbEventCreate", async ({ detail }) => {
  const saved = await saveToServer(detail.event);
  detail.element.id = saved.id;
});
```

### Frameworks

In a framework that renders events from its own state, such as React, Vue, or Svelte, the framework and the calendar would both write the same elements. Cancel the change, update your state, and let the framework render the events. Here `events` is your state:

```js
cal.addEventListener("orbEventUpdate", (e) => {
  e.preventDefault();
  setEvents(applyEventChange(events, e.detail, "update"));
});
```

### Adding events and exporting

Adding an event from code is one more child element. The calendar picks it up without any change to its own data.

::: live-code-demo

```html
<orb-toolbar style="margin-bottom: 1rem;">
  <orb-button id="manage-add">Add event</orb-button>
  <orb-button id="manage-export" fill="outline">Export .ics</orb-button>
</orb-toolbar>
<orb-calendar id="manage-calendar" view="week" date="2026-06-08" style="height: 32rem;">
  <orb-calendar-source id="manage-work" name="Work" color="primary"></orb-calendar-source>
  <orb-calendar-event id="manage-e1" calendar-id="manage-work" start="2026-06-08T09:00" end="2026-06-08T09:30" recurrence="FREQ=DAILY">Standup</orb-calendar-event>
  <orb-calendar-event id="manage-e2" calendar-id="manage-work" start="2026-06-08T11:00" end="2026-06-08T12:00">Design review</orb-calendar-event>
</orb-calendar>
```

```javascript
await customElements.whenDefined("orb-calendar");
const cal = document.querySelector("#manage-calendar");
let added = 0;
document.querySelector("#manage-add").addEventListener("click", () => {
  added += 1;
  cal.insertAdjacentHTML(
    "beforeend",
    `<orb-calendar-event id="manage-added-${added}" calendar-id="manage-work" start="2026-06-09T14:00" end="2026-06-09T15:00">New event ${added}</orb-calendar-event>`,
  );
});
document.querySelector("#manage-export").addEventListener("click", () => {
  cal.downloadICS({ filename: "demo.ics" });
});
```

:::

## Read-Only

Set `editable="false"` to turn off creating, editing, dragging, and resizing. `orbEventClick` still fires. To lock individual events instead, add `readonly` to them.

::: live-code-demo

```html
<orb-calendar view="week" date="2026-06-08" editable="false" show-sidebar="false" style="height: 26rem;">
  <orb-calendar-event id="readonly-holiday" start="2026-06-08T09:00" end="2026-06-08T17:00">Holiday (read-only)</orb-calendar-event>
</orb-calendar>
```

:::

## Recurring Events

Give an event a `recurrence`: a standard [RRULE](https://icalendar.org/iCalendar-RFC-5545/3-8-5-3-recurrence-rule.html) without the `RRULE:` prefix. The calendar expands it into occurrences for the visible range, starting from the event's `start`.

::: live-code-demo

```html
<orb-calendar view="month" date="2026-06-08" show-sidebar="false" style="height: 32rem;">
  <orb-calendar-event id="recurring-standup" start="2026-06-08T09:00" end="2026-06-08T09:15" recurrence="FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR">Standup</orb-calendar-event>
  <orb-calendar-event id="recurring-payday" start="2026-06-01" end="2026-06-02" all-day recurrence="FREQ=MONTHLY;BYMONTHDAY=1">Payday</orb-calendar-event>
  <orb-calendar-event id="recurring-one-on-one" start="2026-06-10T15:00" end="2026-06-10T15:30" recurrence="FREQ=WEEKLY;INTERVAL=2">1:1</orb-calendar-event>
</orb-calendar>
```

:::

| Repeats | RRULE |
| --- | --- |
| Every day | `FREQ=DAILY` |
| Every weekday | `FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR` |
| Every other week | `FREQ=WEEKLY;INTERVAL=2` |
| Monthly on the 1st | `FREQ=MONTHLY;BYMONTHDAY=1` |
| Every year | `FREQ=YEARLY` |
| 10 times | `FREQ=WEEKLY;COUNT=10` |
| Until a date | `FREQ=WEEKLY;UNTIL=20261231T000000Z` |

The built-in editor has a Repeat menu with these presets and a Custom option for frequency, interval, and weekdays.

### One Occurrence or the Whole Series

When the user edits, drags, or deletes an occurrence of a recurring event, the calendar asks which occurrences the change applies to. The answer is the `scope` in the detail:

- `occurrence`: only this one, as an exception or an override
- `future`: this one and everything after it, which splits the series
- `all`: the whole series

Dismiss the question without choosing, and the editor stays open, so you can save again or cancel. The calendar writes each one into the markup, so you can see what it did. The examples below are for New York, so the offsets are `-04:00`. Your offsets depend on your time zone.

::: live-code-demo

```html
<orb-calendar view="week" date="2026-06-08" show-sidebar="false" style="height: 26rem;">
  <orb-calendar-event id="scope-standup" start="2026-06-08T09:00" end="2026-06-08T09:30" recurrence="FREQ=DAILY">Standup</orb-calendar-event>
</orb-calendar>
```

:::

Drag one of the standups, and choose This Event. That occurrence moves, and the rest of the series stays where it was. The calendar adds an override element right after its master:

```html
<orb-calendar-event id="standup" start="2026-06-08T09:00" end="2026-06-08T09:30" recurrence="FREQ=DAILY">Standup</orb-calendar-event>
<orb-calendar-event id="standup::1781010000000" recurrence-parent-id="standup" recurrence-id="2026-06-09T09:00-04:00"
  start="2026-06-09T10:00-04:00" end="2026-06-09T10:30-04:00">Standup</orb-calendar-event>
```

An override's id is the master's id, then `::`, then the start of the occurrence it replaces, in epoch milliseconds.

Deleting This Event adds that occurrence's start to the master's `recurrence-exceptions`, so the series skips it:

```html
<orb-calendar-event id="standup" start="2026-06-08T09:00" end="2026-06-08T09:30" recurrence="FREQ=DAILY"
  recurrence-exceptions="2026-06-09T09:00-04:00">Standup</orb-calendar-event>
```

All Future Events splits the series. The master's rule gets an `UNTIL` just before the split, and a new master starts at the split. Its id is the master's id, then `:`, then the start of the split occurrence:

```html
<orb-calendar-event id="standup" start="2026-06-08T09:00" end="2026-06-08T09:30" recurrence="FREQ=DAILY;UNTIL=20260609T085959Z">Standup</orb-calendar-event>
<orb-calendar-event id="standup:1781010000000" start="2026-06-09T09:00-04:00" end="2026-06-09T09:30-04:00" recurrence="FREQ=DAILY">Standup</orb-calendar-event>
```

All Events changes the master alone. Its overrides and exceptions stay as they are, and deleting the series removes the master and its overrides.

Because the markup is the saved state, the same markup works without any script. The demo above writes to itself: drag a standup and choose This Event, and the calendar adds the override for you.

## Views and Navigation

The calendar has `month` (the default), `week`, and `day` views, switched from its header. Week and month views show each event's name, and day view shows its times as well, since it has the room. Screen readers hear the times in every view. `view` is reflected, and `orbViewChange` fires when the user switches.

`date` is the anchor the view renders around. It takes an ISO date, such as `date="2026-06-08"`, or epoch milliseconds, and defaults to now. `orbDateChange` fires with epoch milliseconds when the user navigates with the header arrows, Today, or the sidebar mini month. You can also call these methods:

- `goToToday()`
- `next()` and `prev()`, which move by a day, week, or month depending on the view
- `goToDate(date)`, which takes either form

::: live-code-demo

```html
<orb-toolbar style="margin-bottom: 1rem;">
  <orb-button id="nav-prev" fill="outline">Prev</orb-button>
  <orb-button id="nav-today">Today</orb-button>
  <orb-button id="nav-next" fill="outline">Next</orb-button>
</orb-toolbar>
<orb-calendar id="nav-calendar" view="day" date="2026-06-08" show-sidebar="false" style="height: 26rem;"></orb-calendar>
```

```javascript
await customElements.whenDefined("orb-calendar");
const cal = document.querySelector("#nav-calendar");
document.querySelector("#nav-prev").addEventListener("click", () => cal.prev());
document.querySelector("#nav-next").addEventListener("click", () => cal.next());
document.querySelector("#nav-today").addEventListener("click", () => cal.goToToday());
```

:::

### Layout

| Attribute | Default | Effect |
| --- | --- | --- |
| `week-starts-on` | `0` (Sunday) | First day of the week, from `0` to `6` |
| `day-start-hour` / `day-end-hour` | `0` / `24` | Hours shown in day and week views |
| `scroll-to-hour` | `8` | Hour scrolled into view in day and week views |
| `show-sidebar` | `true` | Shows the calendar list and mini month |

This example starts the week on Monday and shows 7am to 7pm.

::: live-code-demo

```html
<orb-calendar
  view="week"
  date="2026-06-08"
  week-starts-on="1"
  day-start-hour="7"
  day-end-hour="19"
  scroll-to-hour="9"
  show-sidebar="false"
  style="height: 30rem;"
>
  <orb-calendar-event id="layout-planning" start="2026-06-08T09:00" end="2026-06-08T10:30">Planning</orb-calendar-event>
  <orb-calendar-event id="layout-review" start="2026-06-10T16:00" end="2026-06-10T17:00">Review</orb-calendar-event>
</orb-calendar>
```

:::

### Loading from a server

A source can load its events from a server, for the range on screen. Set its `href`. `{start}` and `{end}` are replaced with the range, as local times with their offsets, and URL-encoded:

```html
<orb-calendar view="week">
  <orb-calendar-source id="work" name="Work" color="primary"
    href="/calendars/work/events?start={start}&amp;end={end}"></orb-calendar-source>
</orb-calendar>
```

`end` is the midnight after the last day shown, so the range runs up to but not including it. The response is HTML of `orb-calendar-event` elements, in the same markup as the calendar's own children:

```html
<orb-calendar-event id="standup" start="2026-06-08T09:00-04:00" end="2026-06-08T09:30-04:00" recurrence="FREQ=DAILY">Standup</orb-calendar-event>
```

The server returns every event with an occurrence in the range. That includes a recurring event that started before the range, and its overrides, since the calendar expands the series itself. Leave the master out, and its whole series is missing.

The calendar asks once for each range. Going back to a range it has loaded makes no request, and so does moving from a month to a week inside it. Changing `href` removes the events the source loaded and asks again with the new URL. Events the user made in the calendar stay. A hidden source asks for nothing until it's shown.

A failed request, a response that isn't OK or a network error, logs a warning that names the source and the URL. The range is asked for again the next time it's shown. The response is cleaned: scripts and `on*` attributes are removed, and any element other than `orb-calendar-event` is left out, with a warning. An event with the `id` of one already in the calendar replaces it. An event with no `calendar-id` joins the source that loaded it.

`orbSourceLoad` fires before each request, with `{ id, source, start, end, url }`, where `start` and `end` are epoch ms. Call `preventDefault()` to skip the request. Use that to fetch the events yourself, with the headers your server needs, and insert them as children. The range then counts as loaded.

While a request is pending, the calendar has `aria-busy="true"`, which you can style as `orb-calendar[aria-busy="true"]`.

After they load, the events are ordinary children. A change to one fires the change events, so the app can save it.

### Lazy Loading

You don't need to put every event in the markup. `orbRangeChange` fires on load and whenever the visible range changes, with `{ start, end }` in epoch milliseconds, so you can fetch just that window. Replace the events in one batch, so the calendar reads them once. Sources aren't touched, so keep them out of the removal.

```js
import { createEventElement } from "orb-style";

cal.addEventListener("orbRangeChange", async ({ detail }) => {
  const events = await fetchEvents(detail.start, detail.end); // your API, returns OrbCalendarEvent[]
  cal.querySelectorAll(":scope > orb-calendar-event").forEach((el) => el.remove());
  cal.append(...events.map((event) => createEventElement(event)));
});
```

`createEventElement()` builds an element from an `OrbCalendarEvent`. You can also insert markup from the server with `insertAdjacentHTML()`.

Removing the old events drops them from the calendar. Save any change the user made in the range to your server before it's reloaded, or the reload removes it.

## Exporting to ICS

The calendar can export its events in the [iCalendar](https://icalendar.org/) (`.ics`) format that Apple Calendar, Google Calendar, and Outlook import. Recurrence rules, exceptions, overrides, and all-day events are preserved. The export covers the events that are loaded, including those from a source's `href`.

- `exportICS(opts?)` returns the `.ics` text.
- `downloadICS(opts?)` builds the file and starts a download.

Both accept `{ calendarIds }` to export only some calendars, and `downloadICS` also takes a `filename`, which defaults to `calendar.ics`.

::: live-code-demo

```html
<orb-toolbar style="margin-bottom: 1rem;">
  <orb-button id="ics-download">Download .ics</orb-button>
  <orb-button id="ics-show" fill="outline">Show .ics text</orb-button>
</orb-toolbar>
<orb-calendar id="ics-calendar" view="week" date="2026-06-08" show-sidebar="false" style="height: 26rem;">
  <orb-calendar-source id="ics-work" name="Work" color="primary"></orb-calendar-source>
  <orb-calendar-event id="ics-standup" calendar-id="ics-work" start="2026-06-08T09:00" end="2026-06-08T09:30" recurrence="FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR">Standup</orb-calendar-event>
  <orb-calendar-event id="ics-conference" calendar-id="ics-work" start="2026-06-09" end="2026-06-12" all-day>Conference</orb-calendar-event>
</orb-calendar>
<pre id="ics-output" style="max-height: 12rem; overflow: auto; font-size: 0.75rem; white-space: pre-wrap;"></pre>
```

```javascript
await customElements.whenDefined("orb-calendar");
const cal = document.querySelector("#ics-calendar");
document.querySelector("#ics-download").addEventListener("click", () => {
  cal.downloadICS({ filename: "my-calendar.ics" });
});
document.querySelector("#ics-show").addEventListener("click", async () => {
  document.querySelector("#ics-output").textContent = await cal.exportICS();
});
```

:::

## Theming

The calendar uses orb's tokens and follows light and dark mode. Override these custom properties on the element for finer control.

| Property | Controls |
| --- | --- |
| `--orb-calendar-bg` | Surface background |
| `--orb-calendar-grid-line` | Grid lines and cell borders |
| `--orb-calendar-today-color` | Today's highlight and the now-line |
| `--orb-calendar-muted` | Muted text, such as weekday labels and times |
| `--orb-calendar-hour-height` | Height of one hour in day and week views |
| `--orb-calendar-sidebar-width` | Sidebar width |
| `--orb-calendar-event-radius` | Corner radius of event pills and blocks |

::: live-code-demo

```html
<orb-calendar
  id="theme-calendar"
  view="week"
  date="2026-06-08"
  show-sidebar="false"
  style="
    height: 30rem;
    --orb-calendar-today-color: var(--orb-primary-500);
    --orb-calendar-hour-height: 4rem;
    --orb-calendar-event-radius: 1rem;
  "
>
  <orb-calendar-event id="theme-taller" start="2026-06-08T09:00" end="2026-06-08T10:00" color="warning">Taller rows</orb-calendar-event>
  <orb-calendar-event id="theme-rounder" start="2026-06-08T11:00" end="2026-06-08T12:30" color="warning">Rounder blocks</orb-calendar-event>
</orb-calendar>
```

:::

Use the CSS parts listed in the API table below, such as `::part(header)` and `::part(event)`, for anything the custom properties don't cover.

## Migrating from `events` and `calendars`

Earlier versions set `events` and `calendars` as properties and applied changes with listeners. Now the events and calendars are child elements, and the calendar applies changes itself.

```html
<!-- Before -->
<orb-calendar id="cal"></orb-calendar>
<script type="module">
  const cal = document.querySelector("#cal");
  cal.calendars = [{ id: "work", name: "Work", color: "primary" }];
  cal.events = [{ id: "standup", title: "Standup", start: 1780923600000, end: 1780925400000, calendarId: "work" }];
  cal.addEventListener("orbEventUpdate", (e) => (cal.events = applyEventChange(cal.events, e.detail, "update")));
</script>

<!-- After -->
<orb-calendar>
  <orb-calendar-source id="work" name="Work" color="primary"></orb-calendar-source>
  <orb-calendar-event id="standup" calendar-id="work" start="2026-06-08T09:00" end="2026-06-08T09:30">Standup</orb-calendar-event>
</orb-calendar>
```

| Change | Effect |
| --- | --- |
| `events` and `calendars` removed | Put `orb-calendar-event` and `orb-calendar-source` elements inside the calendar, or build them with `createEventElement()`. Assigning the old properties does nothing. |
| Changes apply themselves | Listeners that reassigned `cal.events` with `applyEventChange` are no longer needed. Keep them only to copy changes elsewhere. In a framework that renders from state, call `preventDefault()` and update the state. |
| New event ids | `detail.event.id` is a generated id, not `""`. Set `detail.element.id` to replace it. |
| Sidebar toggles | Unchecking a calendar writes `hidden` on its `orb-calendar-source` element, instead of keeping private state. `orbSourceToggle` is cancelable. |
| Event details | `orbEventCreate`, `orbEventUpdate`, `orbEventDelete`, and `orbEventClick` gain `element`. The three change events are cancelable. Existing fields don't change. |
| `date` | Also accepts an ISO date. Numbers work as before. |
