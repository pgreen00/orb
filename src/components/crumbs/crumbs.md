---
title: 'OrbCrumbs | <orb-crumbs>'
sidebar_label: 'Breadcrumbs'
---

## Usage

Breadcrumbs show where the current page sits in a hierarchy. Put a crumb inside `<orb-crumbs>` for each level, in order from the top. Crumbs are your own elements: an `<a>` for a link, or a `<button>` for apps that navigate with click handlers. The trail adds the slashes between them, and the last crumb is the current page.

::: live-code-demo

```html
<orb-crumbs>
  <a href="#home">Home</a>
  <a href="#products">Products</a>
  <a href="#keyboards">Keyboards</a>
  <a href="#mechanical">Mechanical keyboard</a>
</orb-crumbs>
```

:::

**Manual test:**
- Four crumbs appear in order, separated by slashes.
- Each crumb is a link. Clicking one changes the URL hash.
- The last crumb is highlighted and has `aria-current="page"`.
- The host has the `navigation` role.

### Current Page Without a Link

The current page usually doesn't need a link. Use a `<span>` for the last crumb and it shows as plain text, styled as the current page.

::: live-code-demo

```html
<orb-crumbs>
  <a href="#home">Home</a>
  <a href="#settings">Settings</a>
  <span>Notifications</span>
</orb-crumbs>
```

:::

**Manual test:**
- "Notifications" is highlighted as the current page, without an underline or pointer cursor.
- Inspect it. It should have `aria-current="page"`.
- Tab through the trail. "Notifications" isn't a Tab stop.

### Single-Page Apps

For apps that navigate with click handlers, use `<button type="button">` crumbs and listen for clicks on them, or on `<orb-crumbs>`.

::: live-code-demo

```html
<orb-crumbs id="spa-crumbs">
  <button type="button" data-route="/">Home</button>
  <button type="button" data-route="/projects">Projects</button>
  <button type="button" data-route="/projects/orb">Orb</button>
</orb-crumbs>
<p id="spa-output" role="status" style="margin-top: 1rem;">Click a crumb.</p>
```

```javascript
const crumbs = document.querySelector("#spa-crumbs");
const output = document.querySelector("#spa-output");
crumbs.addEventListener("click", (event) => {
  const crumb = event.target.closest("button");
  if (crumb) output.textContent = `Navigate to ${crumb.dataset.route}`;
});
```

:::

**Manual test:**
- Click each crumb. The status line shows its route, and each click is reported once.
- Tab to a crumb and press Enter or Space. It reports the route the same way.
- Crumbs before the current page look like links, with an underline and pointer cursor.

### Intercepting Links

Client-side routers can keep real links, which still open in a new tab and work without JavaScript, and route clicks themselves. Call `preventDefault()` on the click to stop the browser from following the link.

::: live-code-demo

```html
<orb-crumbs id="router-crumbs">
  <a href="#home">Home</a>
  <a href="#docs">Docs</a>
  <a href="#breadcrumbs">Breadcrumbs</a>
</orb-crumbs>
<p id="router-output" role="status" style="margin-top: 1rem;">Click a crumb. The URL hash shouldn't change.</p>
```

```javascript
const crumbs = document.querySelector("#router-crumbs");
const output = document.querySelector("#router-output");
crumbs.addEventListener("click", (event) => {
  const crumb = event.target.closest("a");
  // Let modified clicks through, so Cmd/Ctrl-click still opens a new tab.
  if (!crumb || event.metaKey || event.ctrlKey || event.shiftKey) return;
  event.preventDefault();
  output.textContent = `Routed to ${crumb.getAttribute("href")} without a page load`;
});
```

:::

**Manual test:**
- Click a crumb. The status line updates, and the URL hash stays the same.
- Cmd-click or Ctrl-click a crumb. It opens in a new tab.

### Collapsing

Set `max-items` to collapse long trails. When there are more crumbs than `max-items`, the middle ones are replaced with an ellipsis button. `items-before-collapse` and `items-after-collapse` set how many crumbs stay visible at each end. Both default to `1`. `items-after-collapse` is at least `1`, so the current page is always shown. Clicking the ellipsis shows the hidden crumbs.

::: live-code-demo

```html
<orb-stack space="lg">
  <orb-crumbs max-items="4">
    <a href="#root">Root</a>
    <a href="#a">Projects</a>
    <a href="#b">Orb</a>
    <a href="#c">Source</a>
    <a href="#d">Components</a>
    <span>crumbs.tsx</span>
  </orb-crumbs>
  <orb-crumbs max-items="4" items-before-collapse="2" items-after-collapse="2">
    <a href="#root">Root</a>
    <a href="#a">Projects</a>
    <a href="#b">Orb</a>
    <a href="#c">Source</a>
    <a href="#d">Components</a>
    <span>crumbs.tsx</span>
  </orb-crumbs>
</orb-stack>
```

:::

**Manual test:**
- The first trail shows `Root / … / crumbs.tsx`.
- The second shows `Root / Projects / … / Components / crumbs.tsx`.
- Collapsed crumbs aren't Tab stops.
- Click an ellipsis. The hidden crumbs appear in its place, in order.
- Tab to an ellipsis and press Enter. Focus moves to the first revealed crumb.
- Inspect the first ellipsis button. Its accessible name is "Show 4 more breadcrumbs".

### Handling Expansion Yourself

The ellipsis emits `orbExpandClick` with the hidden crumb elements. Call `preventDefault()` to keep them collapsed, for example to show them in your own menu instead.

::: live-code-demo

```html
<orb-crumbs id="expand-crumbs" max-items="3">
  <a href="#root">Root</a>
  <a href="#a">Projects</a>
  <a href="#b">Orb</a>
  <a href="#c">Source</a>
  <span>crumbs.tsx</span>
</orb-crumbs>
<label style="display: flex; align-items: center; gap: 0.5rem; margin-top: 1rem;">
  <input type="checkbox" id="expand-prevent" checked />
  Keep collapsed
</label>
<p id="expand-output" role="status">Click the ellipsis.</p>
```

```javascript
const crumbs = document.querySelector("#expand-crumbs");
const prevent = document.querySelector("#expand-prevent");
const output = document.querySelector("#expand-output");
crumbs.addEventListener("orbExpandClick", (event) => {
  output.textContent = `Hidden: ${event.detail.map((crumb) => crumb.textContent).join(", ")}`;
  if (prevent.checked) event.preventDefault();
});
```

:::

**Manual test:**
- With the box checked, click the ellipsis. The status lists `Projects, Orb, Source`, and the trail stays collapsed.
- Uncheck the box and click again. The trail expands.

### Icons and Markup

Crumbs render as written, so icons and other markup inside them work.

::: live-code-demo

```html
<orb-crumbs>
  <a href="#home">
    <iconify-icon icon="mdi:home" aria-hidden="true" style="vertical-align: -0.125em;"></iconify-icon>
    Home
  </a>
  <a href="#settings">Settings</a>
  <span>Profile <em>(editing)</em></span>
</orb-crumbs>
```

:::

**Manual test:** the home icon and the italic text appear inside their crumbs, and the icon is part of the Home link.

### Fewer Crumbs Than the Limit

Nothing collapses when the number of crumbs is at or below `max-items`.

::: live-code-demo

```html
<orb-crumbs max-items="4">
  <a href="#home">Home</a>
  <a href="#docs">Docs</a>
  <span>Getting started</span>
</orb-crumbs>
```

:::

**Manual test:** all three crumbs show, with no ellipsis.

### Updating Crumbs

Breadcrumbs often change as the user navigates. Use these buttons to add and remove crumbs, rename one, change a link, and change `max-items`, and check that the trail updates each time.

::: live-code-demo

```html
<orb-crumbs id="dynamic-crumbs">
  <a href="#home">Home</a>
  <a href="#library">Library</a>
</orb-crumbs>
<orb-toolbar space="xs" style="margin-top: 1rem; flex-wrap: wrap;">
  <orb-button size="sm" id="crumb-add">Add crumb</orb-button>
  <orb-button size="sm" fill="outline" id="crumb-remove">Remove last</orb-button>
  <orb-button size="sm" fill="outline" id="crumb-rename">Rename last</orb-button>
  <orb-button size="sm" fill="outline" id="crumb-href">Change Library link</orb-button>
  <orb-button size="sm" fill="outline" id="crumb-max">Set max-items to 3</orb-button>
</orb-toolbar>
```

```javascript
const crumbs = document.querySelector("#dynamic-crumbs");
let count = 0;

document.querySelector("#crumb-add").addEventListener("click", () => {
  const crumb = document.createElement("a");
  crumb.href = `#level-${++count}`;
  crumb.textContent = `Level ${count}`;
  crumbs.append(crumb);
});
document.querySelector("#crumb-remove").addEventListener("click", () => {
  crumbs.lastElementChild?.remove();
});
document.querySelector("#crumb-rename").addEventListener("click", () => {
  const last = crumbs.lastElementChild;
  if (last) last.textContent = `${last.textContent} (renamed)`;
});
document.querySelector("#crumb-href").addEventListener("click", () => {
  const library = crumbs.children[1];
  if (library) library.href = "#library-changed";
});
document.querySelector("#crumb-max").addEventListener("click", () => {
  crumbs.setAttribute("max-items", "3");
});
```

:::

**Manual test:**
- **Add crumb:** a new link appears at the end and becomes the current page.
- **Remove last:** the previous crumb becomes the current page.
- **Rename last:** the last crumb's text changes.
- **Change Library link:** hover "Library". The link points to `#library-changed`.
- **Set max-items to 3:** with four or more crumbs, the trail collapses.
- **Starting collapsed again:** expand the collapsed trail, then add or remove a crumb. A different set of crumbs counts as a new trail, so it collapses again. Renaming or relinking a crumb keeps it expanded.

### Collapse Edge Cases

These settings used to produce broken trails.

::: live-code-demo

```html
<orb-stack space="lg">
  <orb-crumbs max-items="2" items-before-collapse="2" items-after-collapse="2">
    <a href="#a">Nothing</a>
    <a href="#b">to</a>
    <span>collapse</span>
  </orb-crumbs>
  <orb-crumbs max-items="3" items-after-collapse="0">
    <a href="#a">Root</a>
    <a href="#b">Two</a>
    <a href="#c">Three</a>
    <a href="#d">Four</a>
    <span>Current</span>
  </orb-crumbs>
</orb-stack>
```

:::

**Manual test:**
- The first trail shows all three crumbs with no ellipsis, because the visible ends already cover every crumb.
- The second shows `Root / … / Current`. `items-after-collapse="0"` is treated as `1`, so the current page stays visible and there's no trailing slash.

### Narrow Containers

Long trails need to fit small screens.

::: live-code-demo

```html
<div style="max-width: 16rem; border: 1px dashed; padding: 0.5rem;">
  <orb-crumbs>
    <a href="#home">Home</a>
    <a href="#a">A fairly long section name</a>
    <a href="#b">Another long subsection</a>
    <span>The current page title</span>
  </orb-crumbs>
</div>
```

:::

**Manual test:** the trail stays inside the dashed box, by wrapping or truncating, instead of overflowing it.

## Accessibility

### Manual test checklist

- [ ] The host is a `navigation` landmark named "Breadcrumbs". Set `aria-label` on the element to rename it when a page has several navigation landmarks.
- [ ] Screen readers announce the crumbs as a list with the number of items, since they're placed in an `ol`.
- [ ] The last crumb has `aria-current="page"`, whether it's a link, a button, or plain text.
- [ ] Slash separators aren't announced.
- [ ] Links, crumb buttons, and the ellipsis button are focusable, and each shows a visible focus ring. Collapsed crumbs aren't focusable.
- [ ] The ellipsis button is named "Show N more breadcrumbs", and expanding with the keyboard moves focus to the first revealed crumb.
