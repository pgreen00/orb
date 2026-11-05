---
title: Lists
section: css-utilities
layout: css-utilities.njk
description: Ordered, unordered, definition, and navigation lists. Lists keep their meaning, and Orb only gives them a look.
---

## Unordered and Ordered Lists

`<ul>` and `<ol>` get even spacing between items, indented nested lists, and muted bullets. Numbers in an `<ol>` are semi-bold, so steps are easy to scan.

::: live-code-demo

```html
<ul>
  <li>Check the feeder every morning</li>
  <li>Log what you see
    <ul>
      <li>Species</li>
      <li>Count</li>
    </ul>
  </li>
  <li>Share the list with the group</li>
</ul>
<ol>
  <li>Set up the scope</li>
  <li>Walk the trail</li>
  <li>Record the sighting</li>
</ol>
```

:::

**Manual test:**
- The bullets are muted, and the numbers are semi-bold.
- The nested list is indented, and its items sit closer together than the top-level items.
- Items are spaced evenly, with no extra space above the first item or below the last.

## Definition Lists

A `<dl>` is styled like a read-only [textbox](../../components/textbox/) without its border. Each term looks like a label, and each definition looks like the text inside a textbox. Definitions aren't indented, so they line up with their terms.

::: live-code-demo

```html
<dl>
  <dt>Lifer</dt>
  <dd>A species you've seen for the first time.</dd>
  <dt>Pishing</dt>
  <dd>Making a "psh-psh-psh" sound to draw curious songbirds out of cover.</dd>
  <dt>Jizz</dt>
  <dd>The overall impression of a bird's size, shape, and movement.</dd>
</dl>
```

:::

**Manual test:**
- Each term is semi-bold and each definition is light weight, in the same colors as a textbox's label and text.
- The definitions start at the same left edge as their terms.
- Each term and definition sits in a row about as tall as a textbox, with a little space before the next term.
- The text can be selected, and there are no borders or backgrounds.

### Compared with a Textbox

The same label and value, once as a definition list and once as a read-only textbox.

::: live-code-demo

```html
<dl style="max-width: 24rem;">
  <dt>Email</dt>
  <dd>birds@example.com</dd>
</dl>
<orb-textbox label="Email" style="max-width: 24rem;">
  <input value="birds@example.com" readonly>
</orb-textbox>
```

:::

**Manual test:**
- The term and the label have the same size, weight, and color.
- The definition and the textbox's text have the same size, weight, and color. The textbox's text is inset by its border and padding.

### Mesh

Set `data-orb="mesh"` to lay the list out in a grid, the same way [`<orb-mesh>`](../../components/mesh/) does. The grid columns are at least `--min-column-size` wide (20 characters by default), and the columns grow to fill the row.

Wrap each term and its definition in a `<div>`. HTML allows that directly inside a `<dl>`, and it keeps each pair together in one cell.

::: live-code-demo

```html
<dl data-orb="mesh" style="--min-column-size: 14rem;">
  <div>
    <dt>Lifer</dt>
    <dd>A species you've seen for the first time.</dd>
  </div>
  <div>
    <dt>Pishing</dt>
    <dd>Making a "psh-psh-psh" sound to draw curious songbirds out of cover.</dd>
  </div>
  <div>
    <dt>Jizz</dt>
    <dd>The overall impression of a bird's size, shape, and movement.</dd>
  </div>
  <div>
    <dt>Irruption</dt>
    <dd>A year when a species moves south in large numbers.</dd>
  </div>
  <div>
    <dt>Nemesis bird</dt>
    <dd>A species you keep missing, no matter how many times you go looking.</dd>
  </div>
  <div>
    <dt>Spark bird</dt>
    <dd>The bird that first got you hooked.</dd>
  </div>
</dl>
```

:::

**Manual test:**
- The pairs fill the row in columns, and wrap to new rows as the window narrows.
- Each term and its definition stay in the same cell, never split across two.
- Resize the window. The number of columns changes, but no pair is cut in half.
- Change `--min-column-size` in devtools. The columns get wider or narrower.

## Navigation Lists

Put an unordered list of links in a `<nav>` and set `data-orb="nav"` for a row, like a site's section bar, or `data-orb="vertical-nav"` for a column, like a sidebar. Each item is an `<li>` with an `<a>`, or a `<button type="button">` for apps that navigate with click handlers. Mark the current page with `aria-current="page"`. Name the `<nav>` with an `aria-label`, so a page with several navigation landmarks can tell them apart.

::: live-code-demo

```html
<nav aria-label="Sections">
  <ul data-orb="nav">
    <li><a href="#installation">Installation</a></li>
    <li><a href="#tutorials">Tutorials</a></li>
    <li><a href="#components" aria-current="page">Components</a></li>
    <li><a href="#utilities">CSS Utilities</a></li>
  </ul>
</nav>
```

:::

**Manual test:**
- The links sit in a row, with no bullets.
- "Components" is semi-bold and in the primary color. The others are muted.
- Hovering a link tints its background, on devices that hover.
- Tab through the links. Each shows a focus ring that isn't cut off.
- In a container too narrow for the row, it scrolls sideways without a scrollbar.

### Vertical

`vertical-nav` stacks the items. Each link fills the width, and the current page has a tinted background. A list inside an item is indented, with a guide line down its side.

::: live-code-demo

```html
<nav aria-label="Components" style="max-width: 16rem;">
  <ul data-orb="vertical-nav">
    <li><a href="#accordion">Accordion</a></li>
    <li>
      <a href="#forms">Forms</a>
      <ul>
        <li><a href="#textbox" aria-current="page">Textbox</a></li>
        <li><a href="#checkbox">Checkbox</a></li>
      </ul>
    </li>
    <li><a href="#tooltip">Tooltip</a></li>
    <li><a href="#tree" aria-disabled="true">Tree (coming soon)</a></li>
  </ul>
</nav>
```

:::

**Manual test:**
- The links are stacked and fill the width, with the same text indent.
- "Textbox" has a tinted background and the primary color.
- "Textbox" and "Checkbox" are indented under "Forms", with a thin line beside them.
- "Tree (coming soon)" is dimmed, and clicking it does nothing.
- Hovering a link tints its background. Tab shows a focus ring inside each link.

### Buttons

Items can be buttons. They look the same as links, so single-page apps can use either.

::: live-code-demo

```html
<nav aria-label="Views">
  <ul data-orb="nav" id="button-nav">
    <li><button type="button" aria-current="page">Overview</button></li>
    <li><button type="button">Activity</button></li>
    <li><button type="button">Settings</button></li>
  </ul>
</nav>
```

```javascript
const nav = document.querySelector("#button-nav");
nav.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  nav.querySelectorAll("button").forEach((other) => {
    if (other === button) other.setAttribute("aria-current", "page");
    else other.removeAttribute("aria-current");
  });
});
```

:::

**Manual test:**
- Click each button. The current page moves to it, and its look changes.
- Tab to a button and press Enter or Space. It works the same way.
- The buttons look like the links in the first demo.

## Accessibility

**Manual test checklist:**

- [ ] A navigation list is inside a `<nav>` with an `aria-label`, and the current page has `aria-current`. Screen readers announce it as the current page.
- [ ] In forced colors mode, the current page in a navigation list is underlined.
- [ ] A definition list is announced as a list of terms and definitions, with the number of items. Check this with a screen reader on each browser you support, since some browsers drop list semantics from elements whose `display` is changed.
- [ ] Each term is announced before its definition.
- [ ] The text is selectable, so it can be copied.
