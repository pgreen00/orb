---
title: 'OrbPagination | <orb-pagination>'
sidebar_label: 'Pagination'
---

## Usage

Pagination splits a long list of content into pages and lets the user move between them. Set `total` to the number of items and `page-size` to the number of items per page. The component works out the number of pages and renders numbered buttons with previous and next controls.

::: live-code-demo

```html
<orb-pagination total="237" page-size="10" page="3" label="Search results"></orb-pagination>
```

:::

Pagination is a navigation control, not a form control. It tracks the current page and emits events, but it doesn't submit a value with a form. Keep `page` in sync with your data by updating it when `orbPageChange` fires.

Use the `label` attribute to give the control an accessible name. This matters most when more than one pagination appears on the same page.

### Manual test checklist

- [ ] There are 24 pages (237 items ÷ 10), so the last button shows `24`.
- [ ] Page `3` is marked as current. Inspect the element and check it has `aria-current="page"`.
- [ ] The `nav` element has an accessible name of "Search results".
- [ ] Clicking a number changes the current page. Clicking previous and next moves one page at a time.

## Examples

### Appearance

Set `appearance` to `outlined` (the default), `filled`, or `plain`.

::: live-code-demo

```html
<div style="display: grid; gap: 1.5rem;">
  <orb-pagination total="237" page-size="10" page="3" appearance="outlined"></orb-pagination>
  <orb-pagination total="237" page-size="10" page="3" appearance="filled"></orb-pagination>
  <orb-pagination total="237" page-size="10" page="3" appearance="plain"></orb-pagination>
</div>
```

:::

**Manual test:**
- `outlined`: every button has a 1px border. The current page has a primary-colored border and text.
- `filled`: buttons have a neutral background with no border. The current page has a solid primary background.
- `plain`: buttons have no border or background. The current page has primary text and a light primary tint.
- Hover and press each button in every appearance. Hover and press states should appear on every button except the current page.

### Size

Pagination has no `size` attribute. Set `font-size` on the control or on any ancestor to scale it. Buttons are sized in `em`, so they grow with the text.

::: live-code-demo

```html
<div style="display: grid; gap: 1.5rem;">
  <orb-pagination total="237" page-size="10" page="3" style="font-size: 0.75rem"></orb-pagination>
  <orb-pagination total="237" page-size="10" page="3"></orb-pagination>
  <orb-pagination total="237" page-size="10" page="3" style="font-size: 1.25rem"></orb-pagination>
</div>
```

:::

**Manual test:** the three controls should be visibly different sizes, and each button should keep a square-ish shape.

### Number of Buttons

`sibling-count` sets how many pages show on each side of the current page. It defaults to `2`. `boundary-count` sets how many pages always show at the start and end. It defaults to `1`. Pages that don't fit collapse into an ellipsis.

Activating an ellipsis jumps toward that side. It moves by `sibling-count * 2 + 1` pages, so the default jump is 5 pages.

::: live-code-demo

```html
<div style="display: grid; gap: 1.5rem;">
  <orb-pagination total="1000" page-size="10" page="50" sibling-count="1" boundary-count="1" label="Narrow window"></orb-pagination>
  <orb-pagination total="1000" page-size="10" page="50" sibling-count="3" boundary-count="2" label="Wide window"></orb-pagination>
</div>
```

:::

**Manual test:**
- The narrow window shows `1 … 49 50 51 … 100`.
- The wide window shows more pages on each side of `50`, and two pages at each end.
- Activate the first ellipsis in the narrow window. The page should move back by 3 (`sibling-count` 1 × 2 + 1), not by 1. Its `aria-label` should read "Jump back 3 pages".
- Activate the last ellipsis. The page should move forward by 3.
- Clicking an ellipsis moves focus to the new current page.

### First and Last Buttons

Add `with-edges` to show buttons that jump to the first and last pages.

::: live-code-demo

```html
<orb-pagination total="237" page-size="10" page="10" with-edges label="With edges"></orb-pagination>
```

:::

**Manual test:**
- Buttons appear at both ends of the control, outside the previous and next buttons.
- On page `1`, the first and previous buttons are disabled. On the last page, the next and last buttons are disabled.
- Activating the last button goes to page `24`. Activating the first button goes to page `1`.

### Hiding Previous and Next

Add `without-nav` to hide the previous and next buttons. Only the page numbers remain.

::: live-code-demo

```html
<orb-pagination total="237" page-size="10" page="3" without-nav label="Numbers only"></orb-pagination>
```

:::

**Manual test:** no previous or next buttons are rendered. Page numbers and ellipses still work. Combine with `with-edges` to check that the first and last buttons still appear.

### Summary

Add `with-summary` to show which items are on the current page.

::: live-code-demo

```html
<orb-pagination total="237" page-size="10" page="1" with-summary label="With summary"></orb-pagination>
```

:::

**Manual test:**
- On page `1`, the summary reads `1–10 of 237`.
- On page `24`, it reads `231–237 of 237`. Check the last page, because it has fewer items than `page-size`.
- Change `total` to `0` in the DOM. It should read `0 of 0`.

### Compact Format

Set `format="compact"` to replace the page numbers with a short "1 of 5" label between the previous and next buttons. This suits tight spaces such as toolbars and cards.

::: live-code-demo

```html
<div style="display: grid; gap: 1.5rem;">
  <orb-pagination total="237" page-size="10" page="1" format="compact" label="Compact"></orb-pagination>
  <orb-pagination total="237" page-size="10" page="1" format="compact" with-summary label="Compact with summary"></orb-pagination>
</div>
```

:::

**Manual test:**
- The label reads `1 of 24`, with no page number buttons.
- Previous is disabled on page `1`. Next is enabled.
- Activate next until you reach page `24`. Next should become disabled, and focus should stay on the previous button, because next is no longer enabled.

### Custom Icons

Use the `previous-icon`, `next-icon`, `first-icon`, and `last-icon` slots to replace the default icons. The button keeps its accessible label, so screen readers still announce "Previous page" and similar.

::: live-code-demo

```html
<orb-pagination total="237" page-size="10" page="5" with-edges label="Custom icons">
  <iconify-icon slot="first-icon" icon="mdi:skip-backward"></iconify-icon>
  <iconify-icon slot="previous-icon" icon="mdi:step-backward"></iconify-icon>
  <iconify-icon slot="next-icon" icon="mdi:step-forward"></iconify-icon>
  <iconify-icon slot="last-icon" icon="mdi:skip-forward"></iconify-icon>
</orb-pagination>
```

:::

**Manual test:**
- The four icons are the custom ones.
- Inspect the buttons. The `aria-label` values are still "First page", "Previous page", "Next page", and "Last page".
- The default chevrons flip in right-to-left text. Custom slotted icons are not flipped.

### Disabled

Add `disabled` to disable the whole control.

::: live-code-demo

```html
<orb-pagination total="237" page-size="10" page="3" disabled label="Disabled"></orb-pagination>
```

:::

**Manual test:**
- Every button is dimmed and can't be activated with the mouse or keyboard.
- The host element has the `disabled` attribute. The `disabled` custom state applies.
- Remove the attribute in devtools. The control should be interactive again.

### Single Page

Add `hide-single-page` to render nothing when there's only one page. Since nothing renders, this example is shown as code.

```html
<orb-pagination total="5" page-size="10" hide-single-page></orb-pagination>
```

**Manual test:** with `total="5"` and `page-size="10"`, the element should take up no space. Set `total` to `11` and the control should appear.

### Page Size Selector

Pair a `select` with the pagination to let users change the page size. When the selection changes, update `page-size` and reset to the first page.

::: live-code-demo

```html
<orb-stack mode="row" align="end">
  <orb-pagination id="page-size-pagination" total="237" page-size="10" page="1" label="Items per page demo"></orb-pagination>
  <orb-textbox label="Items per page" class="orb-font-xs">
    <select id="page-size-select">
      <option value="10" selected>10</option>
      <option value="20">20</option>
      <option value="50">50</option>
      <option value="100">100</option>
    </select>
  </orb-textbox>
</orb-stack>
```

```javascript
await customElements.whenDefined("orb-pagination");
const pagination = document.querySelector("#page-size-pagination");
const select = document.querySelector("#page-size-select");

select.addEventListener("change", () => {
  pagination.pageSize = Number(select.value);
  pagination.page = 1;
});
```

:::

**Manual test:**
- Choose `100`. The control should show `1 2 3` with a total of 3 pages.
- Go to page `3`, then change the select to `50`. The page should reset to `1` and the control should show 5 pages.

### Responding to Page Changes

When the user changes the page, `orbPageChange` fires with `{ page, pageSize }` in `event.detail`. Use it to load the matching data. The component already updates `page` itself, so there's no need to set it again.

::: live-code-demo

```html
<orb-pagination id="change-pagination" total="237" page-size="10" page="1" label="Change demo"></orb-pagination>
<p id="change-output" role="status" style="margin-top: 1rem;">Showing items 1–10 (page 1 of 24)</p>
```

```javascript
await customElements.whenDefined("orb-pagination");
const pagination = document.querySelector("#change-pagination");
const output = document.querySelector("#change-output");

pagination.addEventListener("orbPageChange", (event) => {
  const { page, pageSize } = event.detail;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, 237);
  output.textContent = `Showing items ${start}–${end} (page ${page} of 24)`;
});
```

:::

**Manual test:**
- Activate page `4`. The output should read `Showing items 31–40 (page 4 of 24)`.
- Confirm in devtools that `pagination.page` is `4` without any extra code.

### Setting the Page Programmatically

Set the `page` property to change the page without user interaction. Setting `page` directly doesn't emit `orbPageChange`. The counter below shows how many events fired, so you can check that.

::: live-code-demo

```html
<orb-pagination id="set-pagination" total="237" page-size="10" page="1" label="Programmatic demo"></orb-pagination>
<div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
  <button type="button" class="jump" data-page="1">Page 1</button>
  <button type="button" class="jump" data-page="5">Page 5</button>
  <button type="button" class="jump" data-page="10">Page 10</button>
</div>
<p id="set-counter" role="status">pageChange events fired: 0</p>
```

```javascript
await customElements.whenDefined("orb-pagination");
const pagination = document.querySelector("#set-pagination");
const counter = document.querySelector("#set-counter");
let events = 0;

pagination.addEventListener("orbPageChange", () => {
  events += 1;
  counter.textContent = `pageChange events fired: ${events}`;
});

document.querySelectorAll(".jump").forEach((button) => {
  button.addEventListener("click", () => {
    pagination.page = Number(button.dataset.page);
  });
});
```

:::

**Manual test:**
- Click `Page 5`. The current page should move to `5`, but the counter should not change.
- Click a number in the pagination. The counter should go up by one.

### Preventing a Page Change

Call `preventDefault()` on `orbBeforePageChange` to cancel a change, for example to guard against unsaved changes. The page stays where it is and focus stays on the control that was activated.

::: live-code-demo

```html
<label style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
  <input type="checkbox" id="guard-toggle" />
  Block page changes
</label>
<orb-pagination id="guard-pagination" total="237" page-size="10" page="1" label="Guarded"></orb-pagination>
<p id="guard-status" role="status" style="margin-top: 1rem;">On page 1</p>
```

```javascript
await customElements.whenDefined("orb-pagination");
const pagination = document.querySelector("#guard-pagination");
const toggle = document.querySelector("#guard-toggle");
const status = document.querySelector("#guard-status");

pagination.addEventListener("orbBeforePageChange", (event) => {
  if (toggle.checked) {
    event.preventDefault();
    status.textContent = `Blocked the change to page ${event.detail.page}`;
  }
});

pagination.addEventListener("orbPageChange", (event) => {
  status.textContent = `On page ${event.detail.page}`;
});
```

:::

**Manual test:**
- Tick the checkbox, then click page `4`. The page should stay at `1`, and the status should say the change was blocked.
- Keyboard: tab to a page number, press Enter, and check that focus is still on that button.
- Untick the checkbox and click page `4`. The change should go through.

### Rendering Links Instead of Buttons

Set `href-template` to render page items as links. Use `{page}` as the placeholder for the page number. Links are useful for server-rendered pages, because each page is a real URL.

::: live-code-demo

```html
<orb-pagination total="237" page-size="10" page="3" href-template="#page-{page}" label="Links"></orb-pagination>
```

:::

**Manual test:**
- Inspect the markup. Page items are `<a>` elements with `href="#page-N"`. Previous and next are links too.
- On page `3`, the previous link should point to `#page-2` and the next link to `#page-4`.
- On page `1`, the previous control has no `href` and has `aria-disabled="true"`.
- Clicking a link changes the URL hash. It doesn't call `orbPageChange`, because the browser handles navigation. You can still cancel the navigation from `orbBeforePageChange`.

In JavaScript, `hrefTemplate` can also be a function that receives the page number and returns the URL. Use a function when the URL doesn't follow a simple substitution.

::: live-code-demo

```html
<orb-pagination id="href-fn-pagination" total="237" page-size="10" page="3" label="Function links"></orb-pagination>
```

```javascript
await customElements.whenDefined("orb-pagination");
const pagination = document.querySelector("#href-fn-pagination");
pagination.hrefTemplate = (page) => `#results-page-${page}`;
```

:::

**Manual test:** the links should now point to `#results-page-N`. In the devtools console, run `document.querySelector("#href-fn-pagination").hrefTemplate = "#x-{page}"`. The links should switch to `#x-N`, which shows that a string template replaces the function.

### Customizing

Style the control with its CSS parts. `button` targets every button, including page numbers, the ellipsis, and the navigation controls. `page-current` targets the current page. The `pagination` part is the `nav` wrapper.

::: live-code-demo

```html
<orb-pagination
  class="custom-pagination"
  total="237"
  page-size="10"
  page="3"
  appearance="plain"
  with-edges
  sibling-count="1"
  label="Custom parts"
></orb-pagination>

<style>
  .custom-pagination::part(button) {
    border-radius: 999px;
  }

  .custom-pagination::part(page-current) {
    background: linear-gradient(135deg, var(--orb-primary-500), var(--orb-primary-300));
    color: var(--orb-neutral-75);
  }

  .custom-pagination::part(pagination) {
    padding: var(--orb-spacing-xs);
    border-radius: 999px;
    background-color: light-dark(var(--orb-neutral-100), var(--orb-neutral-850));
  }
</style>
```

:::

**Manual test:** the control should have rounded pill buttons, a tinted pill container, and a gradient on the current page. Check that the `::part(button)` rule also applies to ellipses and navigation buttons.

## Accessibility

Pagination has these accessibility behaviors:

- **Page changes are announced.** A visually hidden live region says "Page N of M" after each change. Screen readers announce it politely.
- **Focus follows the page.** After a user activates a control, focus moves to the new current page. In compact format, focus stays on the control that was activated when it's still enabled.
- **The current page is marked.** The current page has `aria-current="page"`.
- **Disabled controls are skipped.** Disabled buttons use the `disabled` attribute. Disabled links have `aria-disabled="true"` and no `href`.
- **Each control has a label.** Page buttons read "Page 3", and the navigation buttons read "Previous page", "Next page", "First page", and "Last page".
- **The nav has a name.** Set `label` whenever more than one pagination is on the page.

### Manual test checklist

- [ ] **Keyboard:** Tab reaches the control. Enter and Space activate buttons. Focus rings are visible.
- [ ] **Focus after activation:** click page `4` with the keyboard. Focus should move to the page `4` button.
- [ ] **Focus after ellipsis:** activate an ellipsis. Focus should move to the new current page.
- [ ] **Announcements:** turn on a screen reader and activate next. It should announce "Page 2 of 24".
- [ ] **Labels:** inspect each control and check the `aria-label` values listed above.
- [ ] **Landmark:** the wrapper is a `nav` with the `label` as its accessible name.
- [ ] **Disabled:** Tab skips disabled controls. Disabled links have no `href`.

## Localization

Labels and summary text are in English. Pagination doesn't read the `lang` attribute, so text isn't translated yet.

## Right-to-left

The default chevrons flip in right-to-left text. Test by adding `dir="rtl"` to a parent element. The previous and next arrows should point the other way. Custom icons from the slots are not flipped.
