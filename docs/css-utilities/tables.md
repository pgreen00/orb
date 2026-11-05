---
title: Tables
section: css-utilities
layout: css-utilities.njk
description: A plain table looks right out of the box. Words in data-orb turn on layout, borders, spacing, states, and sticky headers.
---

A plain `<table>` gets sensible defaults: full width, collapsed borders, comfortable padding, and left-aligned cells. Turn features on with words in `data-orb` on the table, such as `data-orb="striped hover compact"`. Each feature only sets custom properties, so they combine, and you can set any of the properties on a table yourself.

::: live-code-demo

```html
<table>
  <caption>Feeder visits this week</caption>
  <thead>
    <tr><th>Species</th><th>Visits</th><th>Seen</th></tr>
  </thead>
  <tbody>
    <tr><td>American Robin</td><td>12</td><td>Mornings</td></tr>
    <tr><td>Steller's Jay</td><td>7</td><td>All day</td></tr>
    <tr><td>Varied Thrush</td><td>3</td><td>Evenings</td></tr>
  </tbody>
  <tfoot>
    <tr><th>Total</th><td>22</td><td></td></tr>
  </tfoot>
</table>
```

:::

**Manual test:**
- The table fills its container. Every cell has a border, and the borders are one line wide, not doubled.
- The caption is above the table, in smaller muted text.
- The header row has a tinted background and semi-bold text. The footer row matches it.
- Header cells are left-aligned, not centered.

## Settings Reference

| Word | What it does |
| --- | --- |
| `fixed` | Columns are sized from the first row, not their content, so they don't shift as content changes |
| `truncate` | Cell text stays on one line and ends in an ellipsis. Pair it with `fixed` |
| `separate` | Each cell is its own box with space between them, instead of sharing borders |
| `caption-bottom` | Moves the caption below the table |
| `outer` | Only the table's outer border |
| `rows` | Only lines between rows, with no vertical lines |
| `borderless` | No borders |
| `striped` | Tints every other body row |
| `hover` | Tints the row under the pointer, on devices that hover |
| `compact`, `comfortable` | Less or more padding in cells |
| `caps` | Small uppercase header labels |
| `sticky-header` | The header stays at the top while the table scrolls |
| `sticky-column` | The first column stays at the start while the table scrolls sideways |
| `row-headers` | Row headers in the body (`th` cells) take the header tint, so they read as labels |

On rows and cells: `selected`, `success`, `warning`, `danger`, and `interactive`. On cells and columns: `start`, `center`, `end`, `numeric`, and the widths `w-xs`, `w-sm`, `w-md`, `w-lg`, `w-xl`, `w-auto`, and `w-min`. On a wrapper: `table-container`.

| Property | Default | Controls |
| --- | --- | --- |
| `--table-background` | page background | The color sticky cells and tints are mixed with. Set it to the background behind the table |
| `--table-border-color`, `--table-border-width` | neutral, `1px` | The lines |
| `--table-vertical-borders`, `--table-horizontal-borders` | `1` | Set to `0` to remove the lines between columns or rows |
| `--table-cell-padding-y`, `--table-cell-padding-x` | `xs`, `sm` spacing | Cell padding |
| `--table-border-spacing` | `0`, or `3xs` with `separate` | Space between cells with `separate` |
| `--table-cell-radius` | `md` radius | Corners of cells with `separate` |
| `--table-font-size`, `--table-header-font-size` | inherited | Text size |
| `--table-header-background`, `--table-stripe-background`, `--table-hover-background` | tints of the text color | Row backgrounds |
| `--table-selected-background`, `--table-success-background`, `--table-warning-background`, `--table-danger-background` | tints of each color | Row states |
| `--table-col-width-xs` to `--table-col-width-xl` | `4rem` to `24rem` | The `w-*` widths |
| `--table-sticky-top` | `0` | How far below the top the sticky header sticks |
| `--table-max-width`, `--table-max-height`, `--table-min-width` | none | Size of the container and table |

## Layout

A `fixed` table sizes its columns from the first row, so a long word can't push a column wider. With `truncate`, the text ends in an ellipsis instead of wrapping. Give columns a width with `w-*` words on a `<col>` or on header cells.

::: live-code-demo

```html
<table data-orb="fixed truncate caption-bottom">
  <caption>Fixed layout with the caption below</caption>
  <colgroup>
    <col data-orb="w-xs">
    <col>
    <col data-orb="w-sm">
  </colgroup>
  <thead>
    <tr><th>ID</th><th>Observation</th><th>Region</th></tr>
  </thead>
  <tbody>
    <tr><td>001</td><td>A very long note about a Varied Thrush heard calling from deep inside an old-growth stand</td><td>Olympic</td></tr>
    <tr><td>002</td><td>Short note</td><td>Puget Sound</td></tr>
  </tbody>
</table>
```

:::

**Manual test:**
- The ID column is narrow, the Region column is a little wider, and the Observation column takes the rest.
- The long note ends in an ellipsis on one line, and the table doesn't get wider.
- The caption is below the table.

The container keeps a wide table from stretching the page. Put the table in an element with `data-orb="table-container"` and it scrolls sideways when it doesn't fit. Because it scrolls, give it `tabindex="0"`, `role="region"`, and an `aria-label`, so keyboard users can scroll it.

::: live-code-demo

```html
<div data-orb="table-container" tabindex="0" role="region" aria-label="Wide table" style="max-width: 28rem;">
  <table style="min-width: 50rem;">
    <thead>
      <tr><th>Species</th><th>Family</th><th>Habitat</th><th>Diet</th><th>Status</th></tr>
    </thead>
    <tbody>
      <tr><td>American Robin</td><td>Turdidae</td><td>Lawns and woods</td><td>Worms and berries</td><td>Common</td></tr>
      <tr><td>Steller's Jay</td><td>Corvidae</td><td>Conifer forest</td><td>Seeds and insects</td><td>Common</td></tr>
    </tbody>
  </table>
</div>
```

:::

**Manual test:**
- The container is 28rem wide. The table is wider, and scrolls sideways inside it, not the page.
- Tab to the container. A focus ring shows, and the arrow keys scroll it.

## Borders

::: live-code-demo

```html
<orb-mesh space="lg" style="--min-column-size: 18rem; align-items: start;">
  <table data-orb="outer">
    <caption>outer</caption>
    <thead><tr><th>Species</th><th>Visits</th></tr></thead>
    <tbody><tr><td>Robin</td><td>12</td></tr><tr><td>Jay</td><td>7</td></tr></tbody>
  </table>
  <table data-orb="rows">
    <caption>rows</caption>
    <thead><tr><th>Species</th><th>Visits</th></tr></thead>
    <tbody><tr><td>Robin</td><td>12</td></tr><tr><td>Jay</td><td>7</td></tr></tbody>
  </table>
  <table data-orb="borderless striped">
    <caption>borderless striped</caption>
    <thead><tr><th>Species</th><th>Visits</th></tr></thead>
    <tbody><tr><td>Robin</td><td>12</td></tr><tr><td>Jay</td><td>7</td></tr><tr><td>Thrush</td><td>3</td></tr></tbody>
  </table>
  <table style="--table-vertical-borders: 0; --table-border-color: var(--orb-primary-400);">
    <caption>custom properties</caption>
    <thead><tr><th>Species</th><th>Visits</th></tr></thead>
    <tbody><tr><td>Robin</td><td>12</td></tr><tr><td>Jay</td><td>7</td></tr></tbody>
  </table>
</orb-mesh>
```

:::

**Manual test:**
- **outer** has a border around the whole table and no lines inside.
- **rows** has lines between rows, and above and below the table, with no vertical lines.
- **borderless striped** has no lines. Every other body row is tinted.
- **custom properties** has no vertical lines and a primary-colored border, from properties alone.

## Spacing

::: live-code-demo

```html
<orb-mesh space="lg" style="--min-column-size: 18rem; align-items: start;">
  <table data-orb="compact">
    <caption>compact</caption>
    <thead><tr><th>Species</th><th>Visits</th></tr></thead>
    <tbody><tr><td>Robin</td><td>12</td></tr><tr><td>Jay</td><td>7</td></tr></tbody>
  </table>
  <table>
    <caption>default</caption>
    <thead><tr><th>Species</th><th>Visits</th></tr></thead>
    <tbody><tr><td>Robin</td><td>12</td></tr><tr><td>Jay</td><td>7</td></tr></tbody>
  </table>
  <table data-orb="comfortable">
    <caption>comfortable</caption>
    <thead><tr><th>Species</th><th>Visits</th></tr></thead>
    <tbody><tr><td>Robin</td><td>12</td></tr><tr><td>Jay</td><td>7</td></tr></tbody>
  </table>
  <table data-orb="separate">
    <caption>separate</caption>
    <thead><tr><th>Species</th><th>Visits</th></tr></thead>
    <tbody><tr><td>Robin</td><td>12</td></tr><tr><td>Jay</td><td>7</td></tr></tbody>
  </table>
</orb-mesh>
```

:::

**Manual test:**
- The three tables are the same except for padding. **compact** is the shortest and **comfortable** the tallest.
- **separate** has a small gap between cells, and each cell has its own border with rounded corners. There's no border around the whole table.

## Text and Alignment

Header cells are semi-bold. A header in a body row, or with `scope="row"`, names its row and is semi-bold too. Add `caps` for small uppercase labels. Use `start`, `center`, or `end` on cells to align them. `numeric` aligns to the end and uses digits of equal width, so numbers line up.

::: live-code-demo

```html
<table data-orb="caps">
  <thead>
    <tr>
      <th scope="col">Species</th>
      <th scope="col" data-orb="center">Status</th>
      <th scope="col" data-orb="numeric">Count</th>
      <th scope="col" data-orb="numeric">Weight (g)</th>
    </tr>
  </thead>
  <tbody>
    <tr><th scope="row">Anna's Hummingbird</th><td data-orb="center">Common</td><td data-orb="numeric">1,284</td><td data-orb="numeric">4.5</td></tr>
    <tr><th scope="row">Bald Eagle</th><td data-orb="center">Recovering</td><td data-orb="numeric">96</td><td data-orb="numeric">4,500</td></tr>
    <tr><th scope="row">Pine Siskin</th><td data-orb="center">Irruptive</td><td data-orb="numeric">11</td><td data-orb="numeric">13.6</td></tr>
  </tbody>
</table>
```

:::

**Manual test:**
- Header labels are small and uppercase, with extra letter spacing.
- The species names in the first column are semi-bold.
- Status is centered. Count and weight are right-aligned, and their digits line up, with each digit the same width.

## Scrolling Headers and Columns

`sticky-header` keeps the header in place, and `sticky-column` does the same for the first column. Sticky cells are opaque, so the cells scrolling under them are hidden. If the table isn't on the page's background, set `--table-background` to the color behind it.

A sticky header sticks to the nearest scrolling ancestor. In a container, that means it needs a `--table-max-height`, so the container scrolls vertically too. On a page that scrolls, set `--table-sticky-top` to the height of any fixed header above the table.

::: live-code-demo

```html
<div data-orb="table-container" tabindex="0" role="region" aria-label="Sighting log" style="max-width: 32rem; --table-max-height: 14rem;">
  <table data-orb="sticky-header sticky-column striped" style="min-width: 48rem;">
    <thead>
      <tr><th scope="col">Species</th><th scope="col">Region</th><th scope="col">Month</th><th scope="col">Habitat</th><th scope="col">Notes</th></tr>
    </thead>
    <tbody>
      <tr><th scope="row">American Robin</th><td>Puget Sound</td><td>March</td><td>Lawns</td><td>First singing males</td></tr>
      <tr><th scope="row">Steller's Jay</th><td>Olympic</td><td>April</td><td>Conifers</td><td>Raiding feeders</td></tr>
      <tr><th scope="row">Varied Thrush</th><td>Cascades</td><td>May</td><td>Old growth</td><td>Heard, not seen</td></tr>
      <tr><th scope="row">Bald Eagle</th><td>San Juans</td><td>June</td><td>Shoreline</td><td>Nesting pair</td></tr>
      <tr><th scope="row">Pine Siskin</th><td>Columbia Basin</td><td>July</td><td>Mixed woods</td><td>Large flock</td></tr>
      <tr><th scope="row">Barn Owl</th><td>Willamette</td><td>August</td><td>Farmland</td><td>Roosting in a barn</td></tr>
      <tr><th scope="row">Great Blue Heron</th><td>Puget Sound</td><td>September</td><td>Tideflats</td><td>Fishing at low tide</td></tr>
      <tr><th scope="row">Black-capped Chickadee</th><td>Cascades</td><td>October</td><td>Mixed woods</td><td>Mixed flock</td></tr>
    </tbody>
  </table>
</div>
```

:::

**Manual test:**
- Scroll down inside the container. The header row stays at the top, and the rows scroll under it without showing through.
- Scroll sideways. The Species column stays at the start, and the other columns scroll under it without showing through.
- Scroll both ways. The top-left cell stays put and is above both.
- The lines under the header and beside the first column stay visible while scrolling.
- Striped rows stay striped in the first column.

## Row Headers

`row-headers` gives the body's row headers the header tint and semi-bold text. A row header is a `<th>` in the body, such as `<th scope="row">`, so it works in any column, not only the first. Stripes and row states still tint the row headers.

::: live-code-demo

```html
<table data-orb="row-headers striped">
  <thead>
    <tr><th scope="col">Species</th><th scope="col">Region</th><th scope="col">Month</th></tr>
  </thead>
  <tbody>
    <tr><th scope="row">American Robin</th><td>Puget Sound</td><td>March</td></tr>
    <tr data-orb="selected"><th scope="row">Steller's Jay</th><td>Olympic</td><td>April</td></tr>
    <tr><th scope="row">Varied Thrush</th><td>Cascades</td><td>May</td></tr>
    <tr><th scope="row">Bald Eagle</th><td>San Juans</td><td>June</td></tr>
  </tbody>
</table>
```

:::

**Manual test:**
- Every row's first cell has the header tint, and the header row looks the same as before.
- The striped rows alternate in the row headers too.
- The selected row is tinted blue in its row header as well.

## Rows

Hover tints the row under the pointer, and only on devices that hover, so touch screens don't get stuck tints. `selected`, `success`, `warning`, and `danger` color a row or a cell. Don't rely on color alone: add text or an icon that says what the state is. A row that can be focused or clicked gets a focus ring from the keyboard. Give it `tabindex="0"`, or `data-orb="interactive"` to also show a pointer cursor.

::: live-code-demo

```html
<table data-orb="hover">
  <thead><tr><th>Species</th><th>Status</th><th>Selected</th></tr></thead>
  <tbody>
    <tr><td>American Robin</td><td>Normal</td><td></td></tr>
    <tr data-orb="selected"><td>Steller's Jay</td><td>Normal</td><td>Yes</td></tr>
    <tr data-orb="success"><td>Bald Eagle</td><td>Recovered</td><td></td></tr>
    <tr data-orb="warning"><td>Pine Siskin</td><td>Declining</td><td></td></tr>
    <tr data-orb="danger"><td>Marbled Murrelet</td><td>Endangered</td><td></td></tr>
    <tr><td>Varied Thrush</td><td data-orb="danger">Cell only</td><td></td></tr>
    <tr data-orb="interactive" tabindex="0"><td>Barn Owl</td><td>Press Tab to focus this row</td><td></td></tr>
  </tbody>
</table>
```

:::

**Manual test:**
- Move the pointer over the plain rows. Each one tints as the pointer passes.
- The selected row is tinted blue, and the success, warning, and danger rows are tinted green, yellow, and red. Hovering them doesn't change their tint.
- Only the cell that says "Cell only" is tinted red in its row.
- Tab to the last row. A focus ring shows around it. The pointer over it is a hand.

## Accessibility

**Manual test checklist:**

- [ ] A table is announced with its caption or label, its number of rows and columns, and each cell with its headers. Use `<th scope="col">` and `<th scope="row">` so cells are tied to their headers.
- [ ] A scrolling container has `tabindex="0"`, `role="region"`, and an `aria-label`, and shows a focus ring.
- [ ] Text in tinted rows has enough contrast, and row states are also shown with text or an icon, not color alone.
- [ ] In forced colors mode, a selected row has an outline.
