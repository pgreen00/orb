---
title: 'OrbDatepicker | <orb-datepicker>'
sidebar_label: 'Datepicker'
---

## Usage

An inline date and time picker. It shows a month calendar and a time picker, and reports the selected value as epoch milliseconds. It fills the width of its container, so set a width on it or its parent.

::: live-code-demo

```html
<orb-datepicker style="max-width: 20rem;"></orb-datepicker>
```

:::

### Type

Set `type` to `date` for just the calendar, `time` for just the time picker, or `datetime` (the default) for both. Add `include-seconds` to show a seconds column.

::: live-code-demo

```html
<orb-mesh space="lg" style="--min-column-size: 16rem;">
  <orb-datepicker type="date"></orb-datepicker>
  <orb-datepicker type="time" include-seconds></orb-datepicker>
</orb-mesh>
```

:::

### Value and Changes

`value` is epoch milliseconds. The picker opens on the month of the value. When the user picks a day or time, `orbValueChange` fires with the new value.

::: live-code-demo

```html
<orb-datepicker id="value-picker" style="max-width: 20rem;"></orb-datepicker>
<p id="value-output" role="status" style="margin-top: 1rem;"></p>
```

```javascript
await customElements.whenDefined("orb-datepicker");
const picker = document.querySelector("#value-picker");
const output = document.querySelector("#value-output");
const show = (value) => {
  output.textContent = value == null ? "No value" : new Date(value).toLocaleString();
};

picker.value = new Date(2025, 11, 25, 9, 30).getTime();
show(picker.value);
picker.addEventListener("orbValueChange", (event) => show(event.detail));
```

:::

### Limits

Set `min` and `max` (epoch milliseconds) to disable days outside a range. For other rules, set `isDateDisabled` to a function that returns `true` for days that can't be picked. This demo allows the next 30 days, excluding weekends.

::: live-code-demo

```html
<orb-datepicker id="limits-picker" type="date" style="max-width: 20rem;"></orb-datepicker>
```

```javascript
await customElements.whenDefined("orb-datepicker");
const picker = document.querySelector("#limits-picker");
const day = 24 * 60 * 60 * 1000;

picker.min = Date.now();
picker.max = Date.now() + 30 * day;
picker.isDateDisabled = (date) => date.getDay() === 0 || date.getDay() === 6;
```

:::

### Keyboard

The day grid and each time column have one button in the Tab order. In the day grid, that's the day you last moved to, the selected day, today, or the first of the month, in that order. Use the keys below to move between the rest. Enter and Space select the focused day or time.

**Days**

| Key | Action |
| --- | --- |
| Left / Right | Previous / next day. Flipped in right-to-left pages. |
| Up / Down | Same day in the previous / next week |
| Home / End | First / last day of the week, within the month |
| Page Up / Page Down | Same day in the previous / next month |
| Shift + Page Up / Page Down | Same day in the previous / next year |

Moving past the shown month switches to the new month. Disabled days can be focused so you can move across them, but they can't be selected.

**Time columns**

Opening the time popover focuses the hour column. Tab moves between columns.

| Key | Action |
| --- | --- |
| Up / Down | Previous / next value, wrapping at the ends |
| Home / End | First / last value |
| Escape | Closes the popover and returns focus to the time button |

### In a Popover

Put the picker in an `orb-popover` to build a field-style control.

::: live-code-demo

```html
<orb-popover id="field-popover">
  <orb-button slot="trigger" fill="outline" id="field-trigger">Pick a date</orb-button>
  <orb-datepicker id="field-picker" type="date" style="width: 18rem;"></orb-datepicker>
</orb-popover>
```

```javascript
const trigger = document.querySelector("#field-trigger");
document.querySelector("#field-picker").addEventListener("orbValueChange", (event) => {
  trigger.textContent = new Date(event.detail).toLocaleDateString();
});
```

:::
