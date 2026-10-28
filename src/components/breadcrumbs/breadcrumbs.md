---
title: 'OrbBreadcrumbs | <orb-breadcrumbs>'
sidebar_label: 'Breadcrumbs'
---

## Usage

Breadcrumbs show where the current page sits in a hierarchy. Put an `<orb-breadcrumb>` inside `<orb-breadcrumbs>` for each level, in order from the top. Set `href` on a crumb to make it a link. The last crumb is the current page.

::: live-code-demo

```html
<orb-breadcrumbs>
  <orb-breadcrumb href="#home">Home</orb-breadcrumb>
  <orb-breadcrumb href="#products">Products</orb-breadcrumb>
  <orb-breadcrumb href="#keyboards">Keyboards</orb-breadcrumb>
  <orb-breadcrumb href="#mechanical">Mechanical keyboard</orb-breadcrumb>
</orb-breadcrumbs>
```

:::

**Manual test:**
- Four crumbs appear in order, separated by slashes.
- Each crumb is a link. Clicking one changes the URL hash.
- The last crumb is highlighted and has `aria-current="page"`.
- The host has the `navigation` role.

### Current Page Without a Link

The current page usually doesn't need a link. Leave `href` off the last crumb and it renders as a button styled as the current page.

::: live-code-demo

```html
<orb-breadcrumbs>
  <orb-breadcrumb href="#home">Home</orb-breadcrumb>
  <orb-breadcrumb href="#settings">Settings</orb-breadcrumb>
  <orb-breadcrumb>Notifications</orb-breadcrumb>
</orb-breadcrumbs>
```

:::

**Manual test:**
- "Notifications" is highlighted as the current page, without an underline or pointer cursor.
- Inspect it. It should have `aria-current="page"`.

### Single-Page Apps

Crumbs without an `href` render as buttons, for apps that navigate with click handlers instead of links. Clicks are forwarded to the matching `<orb-breadcrumb>`, so add a `click` listener to the crumb itself, or listen on `<orb-breadcrumbs>` and check `event.target`.

::: live-code-demo

```html
<orb-breadcrumbs id="spa-crumbs">
  <orb-breadcrumb data-route="/">Home</orb-breadcrumb>
  <orb-breadcrumb data-route="/projects">Projects</orb-breadcrumb>
  <orb-breadcrumb data-route="/projects/orb">Orb</orb-breadcrumb>
</orb-breadcrumbs>
<p id="spa-output" role="status" style="margin-top: 1rem;">Click a crumb.</p>
```

```javascript
const crumbs = document.querySelector("#spa-crumbs");
const output = document.querySelector("#spa-output");
crumbs.addEventListener("click", (event) => {
  const crumb = event.target.closest("orb-breadcrumb");
  if (crumb) output.textContent = `Navigate to ${crumb.dataset.route}`;
});
```

:::

**Manual test:**
- Click each crumb. The status line shows its route, and each click is reported once.
- Tab to a crumb and press Enter or Space. It should report the route the same way.
- Crumbs before the current page look like links, with an underline and pointer cursor.

### Intercepting Links

Client-side routers can keep real links, which still open in a new tab and work without JavaScript, and route clicks themselves. Call `preventDefault()` on the forwarded click to stop the browser from following the link.

::: live-code-demo

```html
<orb-breadcrumbs id="router-crumbs">
  <orb-breadcrumb href="#home">Home</orb-breadcrumb>
  <orb-breadcrumb href="#docs">Docs</orb-breadcrumb>
  <orb-breadcrumb href="#breadcrumbs">Breadcrumbs</orb-breadcrumb>
</orb-breadcrumbs>
<p id="router-output" role="status" style="margin-top: 1rem;">Click a crumb. The URL hash shouldn't change.</p>
```

```javascript
const crumbs = document.querySelector("#router-crumbs");
const output = document.querySelector("#router-output");
crumbs.addEventListener("click", (event) => {
  const crumb = event.target.closest("orb-breadcrumb");
  // Let modified clicks through, so Cmd/Ctrl-click still opens a new tab.
  if (!crumb || event.metaKey || event.ctrlKey || event.shiftKey) return;
  event.preventDefault();
  output.textContent = `Routed to ${crumb.href} without a page load`;
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
  <orb-breadcrumbs max-items="4">
    <orb-breadcrumb href="#root">Root</orb-breadcrumb>
    <orb-breadcrumb href="#a">Projects</orb-breadcrumb>
    <orb-breadcrumb href="#b">Orb</orb-breadcrumb>
    <orb-breadcrumb href="#c">Source</orb-breadcrumb>
    <orb-breadcrumb href="#d">Components</orb-breadcrumb>
    <orb-breadcrumb>breadcrumbs.tsx</orb-breadcrumb>
  </orb-breadcrumbs>
  <orb-breadcrumbs max-items="4" items-before-collapse="2" items-after-collapse="2">
    <orb-breadcrumb href="#root">Root</orb-breadcrumb>
    <orb-breadcrumb href="#a">Projects</orb-breadcrumb>
    <orb-breadcrumb href="#b">Orb</orb-breadcrumb>
    <orb-breadcrumb href="#c">Source</orb-breadcrumb>
    <orb-breadcrumb href="#d">Components</orb-breadcrumb>
    <orb-breadcrumb>breadcrumbs.tsx</orb-breadcrumb>
  </orb-breadcrumbs>
</orb-stack>
```

:::

**Manual test:**
- The first trail shows `Root / … / breadcrumbs.tsx`.
- The second shows `Root / Projects / … / Components / breadcrumbs.tsx`.
- Click an ellipsis. The hidden crumbs appear in its place, in order.
- Tab to an ellipsis and press Enter. Focus moves to the first revealed crumb.
- Inspect the first ellipsis button. Its accessible name is "Show 4 more breadcrumbs".

### Handling Expansion Yourself

The ellipsis emits `expandClick` with the hidden `<orb-breadcrumb>` elements. Call `preventDefault()` to keep them collapsed, for example to show them in your own menu instead.

::: live-code-demo

```html
<orb-breadcrumbs id="expand-crumbs" max-items="3">
  <orb-breadcrumb href="#root">Root</orb-breadcrumb>
  <orb-breadcrumb href="#a">Projects</orb-breadcrumb>
  <orb-breadcrumb href="#b">Orb</orb-breadcrumb>
  <orb-breadcrumb href="#c">Source</orb-breadcrumb>
  <orb-breadcrumb>breadcrumbs.tsx</orb-breadcrumb>
</orb-breadcrumbs>
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
crumbs.addEventListener("expandClick", (event) => {
  output.textContent = `Hidden: ${event.detail.map((crumb) => crumb.textContent).join(", ")}`;
  if (prevent.checked) event.preventDefault();
});
```

:::

**Manual test:**
- With the box checked, click the ellipsis. The status lists `Projects, Orb, Source`, and the trail stays collapsed.
- Uncheck the box and click again. The trail expands.

### Icons and Markup

Each crumb's content is slotted into its link or button, so icons and other markup render as written.

::: live-code-demo

```html
<orb-breadcrumbs>
  <orb-breadcrumb href="#home">
    <iconify-icon icon="mdi:home" aria-hidden="true" style="vertical-align: -0.125em;"></iconify-icon>
    Home
  </orb-breadcrumb>
  <orb-breadcrumb href="#settings">Settings</orb-breadcrumb>
  <orb-breadcrumb>Profile <em>(editing)</em></orb-breadcrumb>
</orb-breadcrumbs>
```

:::

**Manual test:** the home icon and the italic text appear inside their crumbs, and the icon is part of the Home link.

### Fewer Crumbs Than the Limit

Nothing collapses when the number of crumbs is at or below `max-items`.

::: live-code-demo

```html
<orb-breadcrumbs max-items="4">
  <orb-breadcrumb href="#home">Home</orb-breadcrumb>
  <orb-breadcrumb href="#docs">Docs</orb-breadcrumb>
  <orb-breadcrumb>Getting started</orb-breadcrumb>
</orb-breadcrumbs>
```

:::

**Manual test:** all three crumbs show, with no ellipsis.

### Updating Crumbs

Breadcrumbs often change as the user navigates. Use these buttons to add and remove crumbs, rename one, change a link, and change `max-items`, and check that the trail updates each time.

::: live-code-demo

```html
<orb-breadcrumbs id="dynamic-crumbs">
  <orb-breadcrumb href="#home">Home</orb-breadcrumb>
  <orb-breadcrumb href="#library">Library</orb-breadcrumb>
</orb-breadcrumbs>
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
  const crumb = document.createElement("orb-breadcrumb");
  crumb.setAttribute("href", `#level-${++count}`);
  crumb.textContent = `Level ${count}`;
  crumbs.append(crumb);
});
document.querySelector("#crumb-remove").addEventListener("click", () => {
  crumbs.querySelector("orb-breadcrumb:last-of-type")?.remove();
});
document.querySelector("#crumb-rename").addEventListener("click", () => {
  const last = crumbs.querySelector("orb-breadcrumb:last-of-type");
  if (last) last.textContent = `${last.textContent} (renamed)`;
});
document.querySelector("#crumb-href").addEventListener("click", () => {
  // Setting the property works too, since href is reflected to the attribute.
  const library = crumbs.querySelectorAll("orb-breadcrumb")[1];
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
- **Change Library link:** hover "Library". The link should point to `#library-changed`.
- **Set max-items to 3:** with four or more crumbs, the trail collapses.
- **Starting collapsed again:** expand the collapsed trail, then add or remove a crumb. A different set of crumbs counts as a new trail, so it collapses again. Renaming or relinking a crumb keeps it expanded.

### Collapse Edge Cases

These settings used to produce broken trails.

::: live-code-demo

```html
<orb-stack space="lg">
  <orb-breadcrumbs max-items="2" items-before-collapse="2" items-after-collapse="2">
    <orb-breadcrumb href="#a">Nothing</orb-breadcrumb>
    <orb-breadcrumb href="#b">to</orb-breadcrumb>
    <orb-breadcrumb>collapse</orb-breadcrumb>
  </orb-breadcrumbs>
  <orb-breadcrumbs max-items="3" items-after-collapse="0">
    <orb-breadcrumb href="#a">Root</orb-breadcrumb>
    <orb-breadcrumb href="#b">Two</orb-breadcrumb>
    <orb-breadcrumb href="#c">Three</orb-breadcrumb>
    <orb-breadcrumb href="#d">Four</orb-breadcrumb>
    <orb-breadcrumb>Current</orb-breadcrumb>
  </orb-breadcrumbs>
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
  <orb-breadcrumbs>
    <orb-breadcrumb href="#home">Home</orb-breadcrumb>
    <orb-breadcrumb href="#a">A fairly long section name</orb-breadcrumb>
    <orb-breadcrumb href="#b">Another long subsection</orb-breadcrumb>
    <orb-breadcrumb>The current page title</orb-breadcrumb>
  </orb-breadcrumbs>
</div>
```

:::

**Manual test:** the trail should stay inside the dashed box, by wrapping or truncating, instead of overflowing it.

## Accessibility

### Manual test checklist

- [ ] The host is a `navigation` landmark named "Breadcrumbs". Set `aria-label` on the element to rename it when a page has several navigation landmarks.
- [ ] Screen readers announce the crumbs as a list with the number of items, since they're rendered in an `ol`.
- [ ] The current page has `aria-current="page"`, whether or not it's a link.
- [ ] Slash separators aren't announced.
- [ ] Links, crumb buttons, and the ellipsis button are focusable, and each shows a visible focus ring.
- [ ] The ellipsis button is named "Show N more breadcrumbs", and expanding with the keyboard moves focus to the first revealed crumb.
