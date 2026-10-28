---
title: 'OrbCalendar | <orb-calendar>'
sidebar_label: 'Calendar'
---

## Usage

`orb-calendar` is a full calendar with day, week, and month views, named calendars, all-day and recurring events, drag and resize, and ICS export. It manages its own scrolling, so give it a height and put it in any container. Times use the browser's local time zone.

Set `calendars` and `events` as properties in JavaScript, since they're arrays. The calendar renders them and emits change requests when the user edits something. Apply those to your events to make it interactive.

In this demo, click an empty slot to add an event, click an event to edit it, and drag to reschedule.

::: live-code-demo

```html
<orb-calendar id="quickstart" view="week" style="height: 32rem;"></orb-calendar>
```

```javascript
import { applyEventChange } from "orb-style";

await customElements.whenDefined("orb-calendar");
const cal = document.querySelector("#quickstart");
const day = new Date();
day.setHours(0, 0, 0, 0);
const at = (offsetDays, h, m = 0) => {
  const d = new Date(day);
  d.setDate(d.getDate() + offsetDays);
  d.setHours(h, m);
  return d.getTime();
};

cal.calendars = [
  { id: "work", name: "Work", color: "primary" },
  { id: "home", name: "Home", color: "success" },
];
cal.events = [
  { id: "1", title: "Standup", start: at(0, 9), end: at(0, 9, 30), calendarId: "work", recurrence: "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR" },
  { id: "2", title: "Lunch", start: at(1, 12), end: at(1, 13), calendarId: "home" },
  { id: "3", title: "Conference", start: at(2, 0), end: at(5, 0), allDay: true, calendarId: "work" },
];

// The calendar emits change requests. applyEventChange applies them to your
// events, including recurrence exceptions, overrides, and series splits.
let nextId = 0;
cal.addEventListener("orbEventCreate", (e) => {
  const event = { ...e.detail.event, id: `new-${++nextId}` };
  cal.events = applyEventChange(cal.events, { ...e.detail, event }, "create");
});
cal.addEventListener("orbEventUpdate", (e) => {
  cal.events = applyEventChange(cal.events, e.detail, "update");
});
cal.addEventListener("orbEventDelete", (e) => {
  cal.events = applyEventChange(cal.events, e.detail, "delete");
});
```

:::

Those three listeners are the whole integration. `applyEventChange` is exported from `orb-style`.

## Events and Calendars

The calendar never mutates `events`. Each event looks like this:

```ts
interface OrbCalendarEvent {
  id: string;           // stable and unique
  title: string;
  start: number;        // epoch milliseconds
  end: number;          // epoch milliseconds, exclusive
  allDay?: boolean;
  calendarId?: string;  // links to an OrbCalendarSource
  location?: string;
  notes?: string;
  url?: string;
  recurrence?: string;  // RRULE, such as "FREQ=WEEKLY;BYDAY=MO"
  color?: string;       // overrides the calendar color
  readonly?: boolean;   // can't be dragged, resized, or edited
}
```

Times are epoch milliseconds, such as `Date.now()` or `date.getTime()`. For an all-day event, `start` is the first day and `end` is the day after the last day.

### Calendars

Group events into named calendars, each with its own color. The sidebar lists them with checkboxes to show and hide them. An event joins a calendar through its `calendarId`.

```ts
interface OrbCalendarSource {
  id: string;
  name: string;
  color: string;     // "primary", "success-600", or any CSS color
  hidden?: boolean;  // starts hidden
}
```

`color` accepts an orb color token (`primary`, `success`, `warning`, `danger`, `neutral`), a token and shade (`primary-600`), or any CSS color (`#f5871f`, `tomato`).

::: live-code-demo

```html
<orb-calendar id="colors-calendar" view="week" style="height: 30rem;"></orb-calendar>
```

```javascript
await customElements.whenDefined("orb-calendar");
const cal = document.querySelector("#colors-calendar");
const day = new Date();
day.setHours(0, 0, 0, 0);
const at = (o, h, m = 0) => {
  const d = new Date(day);
  d.setDate(d.getDate() + o);
  d.setHours(h, m);
  return d.getTime();
};

cal.calendars = [
  { id: "work", name: "Work", color: "primary" },
  { id: "personal", name: "Personal", color: "success" },
  { id: "family", name: "Family", color: "#f5871f" },
];
cal.events = [
  { id: "1", title: "Standup", start: at(0, 9), end: at(0, 9, 30), calendarId: "work" },
  { id: "2", title: "Gym", start: at(0, 18), end: at(0, 19), calendarId: "personal" },
  { id: "3", title: "Dinner", start: at(0, 19, 30), end: at(0, 21), calendarId: "family" },
  { id: "4", title: "Review (custom color)", start: at(0, 13), end: at(0, 14), calendarId: "work", color: "danger" },
];
```

:::

Without `calendars`, events use a single implicit calendar and the sidebar shows only the mini month. Set `show-sidebar="false"` to hide the sidebar.

### Reacting to Clicks

`orbEventClick` fires when an event is clicked, with the occurrence in `event.detail`. The built-in editor opens afterwards. Call `preventDefault()` to handle the click yourself instead.

::: live-code-demo

```html
<orb-calendar id="click-calendar" view="week" show-sidebar="false" style="height: 26rem;"></orb-calendar>
<p id="click-output" role="status" style="margin-top: 1rem;">Click an event.</p>
```

```javascript
await customElements.whenDefined("orb-calendar");
const cal = document.querySelector("#click-calendar");
const output = document.querySelector("#click-output");
const start = new Date();
start.setHours(10, 0, 0, 0);
cal.events = [{ id: "1", title: "Click me", start: start.getTime(), end: start.getTime() + 3600000 }];
cal.addEventListener("orbEventClick", (e) => {
  e.preventDefault();
  output.textContent = `Clicked: ${e.detail.occurrence.event.title}`;
});
```

:::

## Managing Events

When the user creates, edits, drags, resizes, or deletes an event, the calendar emits a change request and you apply it to your own data. Your data stays the single source of truth, whether it lives in component state, a store, or a server.

| Event | Fired when |
| --- | --- |
| `orbEventCreate` | The user saves a new event, after clicking an empty slot or day |
| `orbEventUpdate` | The user saves edits, or drags or resizes an event |
| `orbEventDelete` | The user deletes an event |

Each one carries an `OrbCalendarMutation` in `event.detail`:

```ts
interface OrbCalendarMutation {
  event: OrbCalendarEvent;     // the new or edited event
  occurrenceStart?: number;    // for edits to one occurrence of a recurring event
  scope: "single" | "occurrence" | "future" | "all";
}
```

`applyEventChange(events, mutation, kind)` returns a new array and never mutates the input, so assign the result to `cal.events`. The buttons in this demo add an event from code and download everything as an `.ics` file.

::: live-code-demo

```html
<orb-toolbar style="margin-bottom: 1rem;">
  <orb-button id="manage-add">Add event tomorrow</orb-button>
  <orb-button id="manage-export" fill="outline">Export .ics</orb-button>
</orb-toolbar>
<orb-calendar id="manage-calendar" view="week" style="height: 32rem;"></orb-calendar>
```

```javascript
import { applyEventChange } from "orb-style";

await customElements.whenDefined("orb-calendar");
const cal = document.querySelector("#manage-calendar");
const day = new Date();
day.setHours(0, 0, 0, 0);
const at = (o, h, m = 0) => {
  const d = new Date(day);
  d.setDate(d.getDate() + o);
  d.setHours(h, m);
  return d.getTime();
};

cal.calendars = [
  { id: "work", name: "Work", color: "primary" },
  { id: "personal", name: "Personal", color: "success" },
];
cal.events = [
  { id: "e1", title: "Standup", start: at(0, 9), end: at(0, 9, 30), calendarId: "work", recurrence: "FREQ=DAILY" },
  { id: "e2", title: "Design review", start: at(0, 11), end: at(0, 12), calendarId: "work" },
  { id: "e3", title: "Lunch", start: at(0, 12, 30), end: at(0, 13, 30), calendarId: "personal" },
];

let nextId = 0;
cal.addEventListener("orbEventCreate", (e) => {
  const event = { ...e.detail.event, id: `new-${++nextId}` };
  cal.events = applyEventChange(cal.events, { ...e.detail, event }, "create");
});
cal.addEventListener("orbEventUpdate", (e) => {
  cal.events = applyEventChange(cal.events, e.detail, "update");
});
cal.addEventListener("orbEventDelete", (e) => {
  cal.events = applyEventChange(cal.events, e.detail, "delete");
});

document.querySelector("#manage-add").addEventListener("click", () => {
  cal.events = [
    ...cal.events,
    { id: `new-${++nextId}`, title: "New event", start: at(1, 14), end: at(1, 15), calendarId: "work" },
  ];
});
document.querySelector("#manage-export").addEventListener("click", () => {
  cal.downloadICS({ filename: "demo.ics" });
});
```

:::

### Read-Only

Set `editable="false"` to turn off creating, editing, dragging, and resizing. `orbEventClick` still fires. To lock individual events instead, set `readonly: true` on them.

::: live-code-demo

```html
<orb-calendar id="readonly-calendar" view="week" editable="false" show-sidebar="false" style="height: 26rem;"></orb-calendar>
```

```javascript
await customElements.whenDefined("orb-calendar");
const cal = document.querySelector("#readonly-calendar");
const start = new Date();
start.setHours(9, 0, 0, 0);
cal.events = [{ id: "1", title: "Holiday (read-only)", start: start.getTime(), end: start.getTime() + 8 * 3600000 }];
```

:::

## Recurring Events

Give an event a `recurrence`: a standard [RRULE](https://icalendar.org/iCalendar-RFC-5545/3-8-5-3-recurrence-rule.html) without the `RRULE:` prefix. The calendar expands it into occurrences for the visible range, starting from the event's `start`.

::: live-code-demo

```html
<orb-calendar id="recurring-calendar" show-sidebar="false" style="height: 32rem;"></orb-calendar>
```

```javascript
await customElements.whenDefined("orb-calendar");
const cal = document.querySelector("#recurring-calendar");
const day = new Date();
day.setHours(0, 0, 0, 0);
const at = (o, h, m = 0) => {
  const d = new Date(day);
  d.setDate(d.getDate() + o);
  d.setHours(h, m);
  return d.getTime();
};
cal.events = [
  { id: "standup", title: "Standup", start: at(0, 9), end: at(0, 9, 15), recurrence: "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR" },
  { id: "payday", title: "Payday", start: at(0, 0), end: at(1, 0), allDay: true, recurrence: "FREQ=MONTHLY;BYMONTHDAY=1" },
  { id: "1on1", title: "1:1", start: at(0, 15), end: at(0, 15, 30), recurrence: "FREQ=WEEKLY;INTERVAL=2" },
];
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

When the user edits, drags, or deletes a recurring occurrence, the calendar asks which occurrences the change applies to and reports the answer as `scope`:

- `occurrence`: only this one, as an exception or override
- `future`: this one and everything after it, which splits the series
- `all`: the whole series

`applyEventChange` handles all of these. A deleted occurrence adds its start to the master's `recurrenceExceptions`. An edited occurrence becomes an override event with `recurrenceParentId` and `recurrenceId`. Both export to ICS correctly.

In this demo, drag one of the standups and choose This Event to move just that day.

::: live-code-demo

```html
<orb-calendar id="series-calendar" view="week" show-sidebar="false" style="height: 26rem;"></orb-calendar>
```

```javascript
import { applyEventChange } from "orb-style";

await customElements.whenDefined("orb-calendar");
const cal = document.querySelector("#series-calendar");
const start = new Date();
start.setHours(9, 0, 0, 0);
cal.events = [
  { id: "standup", title: "Standup", start: start.getTime(), end: start.getTime() + 1800000, recurrence: "FREQ=DAILY" },
];
cal.addEventListener("orbEventUpdate", (e) => {
  cal.events = applyEventChange(cal.events, e.detail, "update");
});
cal.addEventListener("orbEventDelete", (e) => {
  cal.events = applyEventChange(cal.events, e.detail, "delete");
});
```

:::

## Views and Navigation

The calendar has `month` (the default), `week`, and `day` views, switched from its header. `view` is reflected, and `orbViewChange` fires when the user switches.

`date` is the anchor the view renders around, in epoch milliseconds, and defaults to now. `orbDateChange` fires when the user navigates with the header arrows, Today, or the sidebar mini month. You can also call these methods:

- `goToToday()`
- `next()` and `prev()`, which move by a day, week, or month depending on the view
- `goToDate(epochMs)`

::: live-code-demo

```html
<orb-toolbar style="margin-bottom: 1rem;">
  <orb-button id="nav-prev" fill="outline">Prev</orb-button>
  <orb-button id="nav-today">Today</orb-button>
  <orb-button id="nav-next" fill="outline">Next</orb-button>
</orb-toolbar>
<orb-calendar id="nav-calendar" view="day" show-sidebar="false" style="height: 26rem;"></orb-calendar>
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
  week-starts-on="1"
  day-start-hour="7"
  day-end-hour="19"
  scroll-to-hour="9"
  show-sidebar="false"
  style="height: 30rem;"
></orb-calendar>
```

:::

### Lazy Loading

You don't need to hold every event in memory. `orbRangeChange` fires on load and whenever the visible range changes, with `{ start, end }` in epoch milliseconds, so you can fetch just that window.

```js
cal.addEventListener("orbRangeChange", async (e) => {
  cal.events = await fetchEvents(e.detail.start, e.detail.end);
});
```

## Exporting to ICS

The calendar can export its events in the [iCalendar](https://icalendar.org/) (`.ics`) format that Apple Calendar, Google Calendar, and Outlook import. Recurrence rules, exceptions, overrides, and all-day events are preserved.

- `exportICS(opts?)` returns the `.ics` text.
- `downloadICS(opts?)` builds the file and starts a download.

Both accept `{ calendarIds }` to export only some calendars, and `downloadICS` also takes a `filename`, which defaults to `calendar.ics`.

::: live-code-demo

```html
<orb-toolbar style="margin-bottom: 1rem;">
  <orb-button id="ics-download">Download .ics</orb-button>
  <orb-button id="ics-show" fill="outline">Show .ics text</orb-button>
</orb-toolbar>
<orb-calendar id="ics-calendar" view="week" show-sidebar="false" style="height: 26rem;"></orb-calendar>
<pre id="ics-output" style="max-height: 12rem; overflow: auto; font-size: 0.75rem; white-space: pre-wrap;"></pre>
```

```javascript
await customElements.whenDefined("orb-calendar");
const cal = document.querySelector("#ics-calendar");
const day = new Date();
day.setHours(0, 0, 0, 0);
const at = (o, h, m = 0) => {
  const d = new Date(day);
  d.setDate(d.getDate() + o);
  d.setHours(h, m);
  return d.getTime();
};
cal.calendars = [{ id: "work", name: "Work", color: "primary" }];
cal.events = [
  { id: "1", title: "Standup", start: at(0, 9), end: at(0, 9, 30), calendarId: "work", recurrence: "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR" },
  { id: "2", title: "Conference", start: at(1, 0), end: at(3, 0), allDay: true, calendarId: "work" },
];
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
  show-sidebar="false"
  style="
    height: 30rem;
    --orb-calendar-today-color: var(--orb-primary-500);
    --orb-calendar-hour-height: 4rem;
    --orb-calendar-event-radius: 1rem;
  "
></orb-calendar>
```

```javascript
await customElements.whenDefined("orb-calendar");
const cal = document.querySelector("#theme-calendar");
const start = new Date();
start.setHours(9, 0, 0, 0);
const t = start.getTime();
cal.events = [
  { id: "1", title: "Taller rows", start: t, end: t + 3600000, color: "warning" },
  { id: "2", title: "Rounder blocks", start: t + 2 * 3600000, end: t + 3.5 * 3600000, color: "warning" },
];
```

:::

Use the CSS parts listed in the API table below, such as `::part(header)` and `::part(event)`, for anything the custom properties don't cover.
