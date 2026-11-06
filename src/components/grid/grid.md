---
title: "OrbGrid | <orb-grid>"
sidebar_label: "Grid"
wide: true
---

::: live-code-demo

```html
<orb-grid name="employees" striped>
  <orb-cell section="head">ID</orb-cell>
  <orb-cell section="head">Name</orb-cell>
  <orb-cell section="head">Department</orb-cell>
  <orb-cell section="head">Position</orb-cell>
  <orb-cell section="head">Salary</orb-cell>
  <orb-cell section="head">Status</orb-cell>

  <orb-cell>001</orb-cell>
  <orb-cell>Alice Johnson</orb-cell>
  <orb-cell>Engineering</orb-cell>
  <orb-cell>Senior Developer</orb-cell>
  <orb-cell>$95,000</orb-cell>
  <orb-cell>Active</orb-cell>
  
  <orb-cell>002</orb-cell>
  <orb-cell>Bob Smith</orb-cell>
  <orb-cell>Marketing</orb-cell>
  <orb-cell>Marketing Manager</orb-cell>
  <orb-cell>$85,000</orb-cell>
  <orb-cell>Active</orb-cell>
</orb-grid>
```

:::

## Spanning

Set `colspan` and `rowspan` on a cell to cover more than one column or row, the same as a table cell. The grid places each cell in the next free slot, skipping slots that a cell above spans into, and lays them out with CSS grid's `grid-column` and `grid-row` spans. A row span stops at the end of its section, so a body cell can't reach into the footer.

::: live-code-demo

```html
<orb-grid>
  <orb-cell section="head">Time</orb-cell>
  <orb-cell section="head">Monday</orb-cell>
  <orb-cell section="head">Tuesday</orb-cell>
  <orb-cell section="head">Wednesday</orb-cell>

  <orb-cell>9:00</orb-cell>
  <orb-cell colspan="3">Standup</orb-cell>

  <orb-cell>10:00</orb-cell>
  <orb-cell rowspan="2">Design review</orb-cell>
  <orb-cell>Code review</orb-cell>
  <orb-cell>1:1s</orb-cell>

  <orb-cell>11:00</orb-cell>
  <orb-cell colspan="2">Lunch and learn</orb-cell>

  <orb-cell>12:00</orb-cell>
  <orb-cell>Demo</orb-cell>
  <orb-cell>Retro</orb-cell>
  <orb-cell>Planning</orb-cell>
</orb-grid>
```

:::

**Manual test:**
- "Standup" covers Monday to Wednesday.
- "Design review" covers the 10:00 and 11:00 rows on Monday, and "Lunch and learn" starts in the Tuesday column beside it.
- Every cell has one border on each side, with no doubled lines around the spanning cells.
- Focus "9:00" and press Right. Focus moves to "Standup", and Right again does nothing.
- From "Standup", press Down. Focus moves to "Design review", the cell below the column you came from. Down again skips its second row and goes to "Demo".
- From "Code review", press Down to "Lunch and learn", then Left. Focus moves to "Design review". Right goes back to "Lunch and learn".

### Header Rows

Without `columns`, the number of columns is the sum of the header cells' column spans, which only works for a single header row. Set `columns` when the header has more than one row.

::: live-code-demo

```html
<orb-grid columns="3">
  <orb-cell section="head" rowspan="2">Name</orb-cell>
  <orb-cell section="head" colspan="2">Contact</orb-cell>
  <orb-cell section="head">Email</orb-cell>
  <orb-cell section="head">Phone</orb-cell>

  <orb-cell>Alice Johnson</orb-cell>
  <orb-cell>alice@example.com</orb-cell>
  <orb-cell>555-0100</orb-cell>

  <orb-cell>Bob Smith</orb-cell>
  <orb-cell>bob@example.com</orb-cell>
  <orb-cell>555-0101</orb-cell>
</orb-grid>
```

:::

**Manual test:**
- "Name" covers both header rows, and "Contact" covers the Email and Phone columns.
- Both header rows are tinted, including the part of "Name" in the second row.

## Selection

Set `selection` to `single` or `multiple`, and the grid adds a first column with a control in every body row: a radio button for `single`, and an `orb-checkbox` for `multiple`. Each control is named from its row's first cell, such as "Select Alice Johnson", so put something that identifies the row there. With `single`, the selected row is also tinted. With `multiple`, the checkboxes show which rows are selected, so rows aren't tinted. `orbSelectionChange` reports each selected row's cells.

With `multiple`, add `select-all` for a checkbox in the header that selects or clears every row. It's checked when every row is selected, and mixed when only some are. The [interactive cells](#interactive-cells) demo uses it.

The controls are cells like any other, so the arrow keys reach them, and Space on any cell in the row toggles it too.

::: live-code-demo

```html
<orb-grid id="plan-grid" selection="single">
  <orb-cell section="head">Plan</orb-cell>
  <orb-cell section="head">Seats</orb-cell>
  <orb-cell section="head">Price</orb-cell>

  <orb-cell>Starter</orb-cell>
  <orb-cell>1</orb-cell>
  <orb-cell>$0</orb-cell>

  <orb-cell>Team</orb-cell>
  <orb-cell>10</orb-cell>
  <orb-cell>$40</orb-cell>

  <orb-cell>Business</orb-cell>
  <orb-cell>50</orb-cell>
  <orb-cell>$180</orb-cell>
</orb-grid>
<p id="plan-status" role="status">No plan selected.</p>
```

```javascript
document.querySelector("#plan-grid").addEventListener("orbSelectionChange", (event) => {
  const [row] = event.detail;
  document.querySelector("#plan-status").textContent = row
    ? `Selected: ${row[0].textContent.trim()}`
    : "No plan selected.";
});
```

:::

**Manual test:**
- Each body row has a radio button in a narrow first column. The header has an empty cell above them.
- Click a radio button. It fills, the row is tinted, and the status line names the plan. Clicking another moves the selection to that row.
- Tab into the grid and press Down, then Home. Focus is on the row's radio button. Press Space. The row is selected.
- With a screen reader, each radio button is announced as "Select Starter" and so on, with its checked state.

## Reordering

Add `reorder`, and each body row gets a drag handle at its start. Press and hold the handle, then drag the row up or down. It uses the browser's drag and drop, so a picture of the row follows the pointer, the row left behind fades, and a line shows where it will land. Touch dragging depends on the browser's drag and drop support. The grid moves the row's cells in the page, so the markup always matches the order on screen.

`orbReorder` fires before each move, with the row's cells and its old and new index among the body rows. Call `preventDefault()` to keep the row where it is. Do that when a framework renders the cells from your data: update the data in the event instead, and let the framework render the new order.

Rows only move within the body. A cell's row span doesn't move with its row, so reordering works best in grids without row spans. With `selection` set as well, the handles come first and the selection controls second.

::: live-code-demo

```html
<orb-grid id="task-grid" reorder selection="multiple">
  <orb-cell section="head">Task</orb-cell>
  <orb-cell section="head">Owner</orb-cell>
  <orb-cell section="head">Due</orb-cell>

  <orb-cell>Write the release notes</orb-cell>
  <orb-cell>Alice</orb-cell>
  <orb-cell>Monday</orb-cell>

  <orb-cell>Fix the login bug</orb-cell>
  <orb-cell>Bob</orb-cell>
  <orb-cell>Tuesday</orb-cell>

  <orb-cell>Review the design</orb-cell>
  <orb-cell>Cara</orb-cell>
  <orb-cell>Wednesday</orb-cell>

  <orb-cell>Plan the next sprint</orb-cell>
  <orb-cell>Dan</orb-cell>
  <orb-cell>Friday</orb-cell>
</orb-grid>
<p id="task-status">Drag a row to move it.</p>
```

```javascript
document.querySelector("#task-grid").addEventListener("orbReorder", (event) => {
  const { row, from, to } = event.detail;
  document.querySelector("#task-status").textContent =
    `Moved "${row[0].textContent.trim()}" from row ${from + 1} to row ${to + 1}.`;
});
```

:::

**Manual test:**
- Each body row has a grip handle first, then a checkbox. The header row has empty cells above them.
- Press and hold "Write the release notes"'s handle, and drag it down below "Review the design". A picture of the whole row follows the pointer, from the point where you grabbed it, and the row in the grid fades. A line follows between the rows. Release. The row moves there, and the status line reports it.
- Click a handle without dragging. Nothing moves.
- Start a drag, then press Escape before releasing. The line goes away, and nothing moves.
- Select a row, then move it. It stays selected.
- Focus a handle with the arrow keys and press Space. The row is tinted, and a screen reader hears that it's picked up. Press Down twice, then Space. The row moves two rows down and is dropped there.
- Pick a row up, press Down, then Escape. It goes back to where it started.
- On any cell in a body row, press Alt + Down. The row moves down one, and focus stays on the same cell.

## Sorting

Add `sortable` to a header cell, and clicking it, or pressing Enter on it, sorts the body rows by that column: ascending, then descending, then back to the order in the markup. Only one column sorts at a time, and the header shows an arrow for its direction. To start out sorted, set `sort="ascending"` or `sort="descending"` on the header.

Cells sort by their text, with numbers inside the text compared as numbers, so "$9,000" comes before "$85,000". When the text doesn't sort the way it should, such as a date written out in words, set `value` on the cell to what it should sort and filter by.

Sorting only changes the order the rows are shown in. The cells stay in their markup order, so clearing the sort puts the rows back. `orbSortChange` fires before each change, and `preventDefault()` cancels it. Reordering is off while a column is sorted, since the sort decides the order.

::: live-code-demo

```html
<orb-grid>
  <orb-cell section="head" sortable>Name</orb-cell>
  <orb-cell section="head" sortable>Salary</orb-cell>
  <orb-cell section="head" sortable sort="ascending">Started</orb-cell>

  <orb-cell>Alice Johnson</orb-cell>
  <orb-cell>$95,000</orb-cell>
  <orb-cell value="2019-03-04">March 4, 2019</orb-cell>

  <orb-cell>Bob Smith</orb-cell>
  <orb-cell>$85,000</orb-cell>
  <orb-cell value="2021-11-15">November 15, 2021</orb-cell>

  <orb-cell>Cara Diaz</orb-cell>
  <orb-cell>$9,000</orb-cell>
  <orb-cell value="2018-07-30">July 30, 2018</orb-cell>

  <orb-cell>Dan Lee</orb-cell>
  <orb-cell>$120,000</orb-cell>
  <orb-cell value="2021-02-01">February 1, 2021</orb-cell>
</orb-grid>
```

:::

**Manual test:**
- The grid starts sorted by Started, oldest first: Cara, Alice, Dan, Bob. The Started header shows an up arrow.
- Click Salary. The rows sort $9,000, $85,000, $95,000, $120,000. Salary shows an up arrow, and Started goes back to the plain arrows.
- Click Salary again. The order flips, with a down arrow. Click it a third time. The rows go back to Alice, Bob, Cara, Dan.
- Focus a header with the arrow keys and press Enter. It sorts the same as a click.
- With a screen reader, a sorted header is announced as sorted ascending or descending, and each sort is announced.

## Pagination

To split the body rows into pages, add an [`orb-pagination`](../pagination/) with an `id`, and set the grid's `pagination` to that `id`. The grid shows the rows on the pagination's current page, and follows it when the page or `page-size` changes. The header and footer show on every page.

Leave out `total`, and the grid sets it to the number of body rows, and keeps it up to date as rows are added and removed. Leave out `label`, and the grid names it "Pages". Set `total` yourself when the grid only holds one page of a larger set, such as rows loaded from a server for each page.

Sorting sorts every row, not just the current page, and goes back to the first page. Selections are kept across pages, and select all works on the current page.

::: live-code-demo

```html
<orb-grid pagination="staff-pages" selection="multiple" select-all>
  <orb-cell section="head" sortable>Name</orb-cell>
  <orb-cell section="head" sortable>Department</orb-cell>

  <orb-cell>Alice Johnson</orb-cell><orb-cell>Engineering</orb-cell>
  <orb-cell>Bob Smith</orb-cell><orb-cell>Marketing</orb-cell>
  <orb-cell>Cara Diaz</orb-cell><orb-cell>Sales</orb-cell>
  <orb-cell>Dan Lee</orb-cell><orb-cell>Engineering</orb-cell>
  <orb-cell>Eve Moreno</orb-cell><orb-cell>Support</orb-cell>
  <orb-cell>Frank Okafor</orb-cell><orb-cell>Finance</orb-cell>
  <orb-cell>Grace Park</orb-cell><orb-cell>Engineering</orb-cell>
  <orb-cell>Hiro Tanaka</orb-cell><orb-cell>Design</orb-cell>
</orb-grid>
<div style="display: flex; justify-content: flex-end;">
  <orb-pagination 
    class="orb-margin-sm" 
    id="staff-pages" 
    page-size="3" 
    with-summary
  ></orb-pagination>
</div>
```

:::

**Manual test:**
- The grid shows Alice, Bob, and Cara, and the pagination reads "1–3 of 8" with three pages.
- Click page 2. The grid shows Dan, Eve, and Frank. Page 3 shows Grace and Hiro.
- Focus a cell in the grid and press Page Down. The grid goes to the next page, the pagination follows, and focus moves to the same column in the first row. Page Up goes back.
- On page 3, click Name twice to sort descending. The grid goes back to page 1 and shows Hiro, Grace, and Frank.
- Select a row, go to another page, and come back. It's still selected.
- On page 2, check select all. Only page 2's rows are selected.
- In devtools, remove two cells for a row. The pagination's total drops to 7.

## Searching and Filtering

To search every column, point `searchbox` at the `id` of a search field: an `orb-textbox`, or a plain `input`. The grid shows the body rows that contain every word typed, in any column, ignoring case and accents. With an `orb-textbox`, its `debounce` applies. Set the grid's `search` property to search from code.

To filter a column, set `filter` on its header cell. The header gets a funnel button that opens the filter in a popover. Filters apply as you change them, with text waiting for a short pause in typing:

| `filter` | Popover | Shows rows where the column's cell |
| --- | --- | --- |
| `text` | A text field | Contains the text |
| `number` | Min and Max fields | Is within the range. Either end can be left empty |
| `date` | From and To date fields | Is within the range. Give date cells an ISO date in `value`, such as `value="2021-03-04"` |
| `select` | A checkbox for each value in the column, all checked to start | Has a checked value. Select all checks or clears every value |

Each popover has a Clear button. While a filter hides rows, its funnel is filled in, and screen readers hear "Filtered" on the header. To filter from code, set the header's `filterValue`: a string for `text`, `{ min, max }` for `number` and `date`, and an array of the checked values for `select`.

Cells are compared by their `value` when they have one, and their text otherwise. Numbers in text compare as numbers, so "$95,000" is over a minimum of 90000. A row shows when it matches the search and every filter. Matches are highlighted in the cells, in browsers with the CSS Custom Highlight API.

When nothing matches, a row says "No matching rows". Give an element `slot="empty"` inside the grid to say something else. Each change goes back to the first page, announces how many rows match, and fires `orbFilterChange` with the search, each filtered header and its value, and the number of matches. Selected rows stay selected while they're filtered out.

From the keyboard, press Alt + Down on a header to open its filter. On a header that doesn't sort, Enter opens it too. Tab moves between the filter's controls, and Escape closes it and goes back to the header.

::: live-code-demo

```html
<orb-textbox id="people-search" label="Search people" debounce="200" class="orb-margin-bottom-sm">
  <input type="search" placeholder="Name, department, or city">
</orb-textbox>
<orb-grid id="people-grid" searchbox="people-search" pagination="people-pages">
  <orb-cell section="head" sortable filter="text">Name</orb-cell>
  <orb-cell section="head" sortable filter="select">Department</orb-cell>
  <orb-cell section="head" sortable filter="number">Salary</orb-cell>
  <orb-cell section="head" sortable filter="date">Started</orb-cell>
  <orb-cell section="head" filter="select">City</orb-cell>

  <orb-cell>Alice Johnson</orb-cell><orb-cell>Engineering</orb-cell><orb-cell>$95,000</orb-cell><orb-cell value="2019-03-04">Mar 4, 2019</orb-cell><orb-cell>Seattle</orb-cell>
  <orb-cell>Bob Smith</orb-cell><orb-cell>Marketing</orb-cell><orb-cell>$85,000</orb-cell><orb-cell value="2021-11-15">Nov 15, 2021</orb-cell><orb-cell>Portland</orb-cell>
  <orb-cell>Cara Díaz</orb-cell><orb-cell>Sales</orb-cell><orb-cell>$62,000</orb-cell><orb-cell value="2018-07-30">Jul 30, 2018</orb-cell><orb-cell>Seattle</orb-cell>
  <orb-cell>Dan Lee</orb-cell><orb-cell>Engineering</orb-cell><orb-cell>$120,000</orb-cell><orb-cell value="2021-02-01">Feb 1, 2021</orb-cell><orb-cell>Vancouver</orb-cell>
  <orb-cell>Eve Moreno</orb-cell><orb-cell>Sales</orb-cell><orb-cell>$58,000</orb-cell><orb-cell value="2022-06-13">Jun 13, 2022</orb-cell><orb-cell>Portland</orb-cell>
  <orb-cell>Frank Okafor</orb-cell><orb-cell>Marketing</orb-cell><orb-cell>$77,000</orb-cell><orb-cell value="2020-09-21">Sep 21, 2020</orb-cell><orb-cell>Boise</orb-cell>
  <orb-cell>Grace Park</orb-cell><orb-cell>Engineering</orb-cell><orb-cell>$105,000</orb-cell><orb-cell value="2017-01-09">Jan 9, 2017</orb-cell><orb-cell>Seattle</orb-cell>
  <orb-cell>Hiro Tanaka</orb-cell><orb-cell>Sales</orb-cell><orb-cell>$71,000</orb-cell><orb-cell value="2023-04-03">Apr 3, 2023</orb-cell><orb-cell>Vancouver</orb-cell>

  <p slot="empty">No people match. Try fewer words, or clear a filter.</p>
</orb-grid>
<orb-toolbar class="orb-padding-sm">
  <p id="people-status">Showing everyone.</p>
  <orb-pagination 
    id="people-pages" 
    page-size="5" 
    with-summary 
    slot="end"
  ></orb-pagination>
</orb-toolbar>
```

```javascript
document.querySelector("#people-grid").addEventListener("orbFilterChange", (event) => {
  const { search, filters, matches, total } = event.detail;
  document.querySelector("#people-status").textContent =
    search || filters.length ? `${matches} of ${total} people match.` : "Showing everyone.";
});
```

:::

**Manual test:**
- Type "seattle" in the search. Alice, Cara, and Grace show, "Seattle" is highlighted in each row, and the pagination reads "1–3 of 3".
- Type "seattle eng". Only Alice and Grace show, since every word has to match.
- Search "cara diaz" without the accent. Cara Díaz shows.
- Clear the search. Click the funnel on Department. Every department is checked. Uncheck Engineering and Marketing. Only Cara, Eve, and Hiro show, and the funnel is filled in.
- Click the funnel on Salary, and type 70000 in Min. Only Hiro shows.
- In the Department filter, click Select all, then Clear. Every row shows again, and the funnel is outlined.
- Filter Started from 2020-01-01 to 2021-12-31. Bob, Dan, and Frank show.
- Type "zzz" in the Name filter. The grid shows "No people match. Try fewer words, or clear a filter." under the header.
- Clicking a funnel, or anywhere in its popover, doesn't sort the column. Clicking the header's label still does.
- Focus the Name header and press Alt + Down. The filter opens with focus in its field. Press Escape. It closes, and focus is back on the header. On City, which doesn't sort, Enter opens the filter too.
- With a screen reader, each change is announced, such as "3 of 8 rows match", and a filtered header is described as "Filtered".

## Row Details

To give a body row content it can show and hide, put an [`orb-row-details`](../row-details/) right after the row's cells. The grid adds a column with a toggle button to rows that have details, and shows the details below the row when it's open. The details span every column and lay out however you like, so they can hold anything: text, a form, a chart, or another grid. Set `expanded` on `orb-row-details` to start it open.

`orbRowToggle` fires before the details open or close, with the row's cells, the details, and whether they're opening. Call `preventDefault()` to stop it, or use it to load the content the first time the row opens.

The details follow their row: they sort, page, and move with it. They follow the grid's keyboard rules too: they're one arrow-key stop below their row, and controls inside them are out of the Tab order until you press Enter on the details. With `navigation="row"`, Right opens a row's details and Left closes them.

::: live-code-demo

```html
<orb-grid id="order-grid" selection="multiple">
  <orb-cell section="head">Order</orb-cell>
  <orb-cell section="head">Customer</orb-cell>
  <orb-cell section="head">Total</orb-cell>

  <orb-cell>#1042</orb-cell>
  <orb-cell>Alice Johnson</orb-cell>
  <orb-cell>$120.00</orb-cell>
  <orb-row-details>
    <dl data-orb="mesh">
      <div><dt>Ship to</dt><dd>12 Pine St, Seattle</dd></div>
      <div><dt>Items</dt><dd>2 field guides, 1 feeder</dd></div>
      <div><dt>Status</dt><dd>Shipped May 3</dd></div>
    </dl>
  </orb-row-details>

  <orb-cell>#1043</orb-cell>
  <orb-cell>Bob Smith</orb-cell>
  <orb-cell>$45.50</orb-cell>

  <orb-cell>#1044</orb-cell>
  <orb-cell>Cara Diaz</orb-cell>
  <orb-cell>$310.00</orb-cell>
  <orb-row-details expanded>
    <orb-textbox label="Note for the warehouse">
      <input value="Gift wrap the binoculars">
    </orb-textbox>
  </orb-row-details>
</orb-grid>
<p id="order-status">Open a row to see its details.</p>
```

```javascript
document.querySelector("#order-grid").addEventListener("orbRowToggle", (event) => {
  const { row, expanded } = event.detail;
  document.querySelector("#order-status").textContent =
    `${expanded ? "Opened" : "Closed"} ${row[0].textContent.trim()}.`;
});
```

:::

**Manual test:**
- Orders #1042 and #1044 have a chevron, and #1043 doesn't. #1044 starts open, with its note below it across the whole grid.
- Click #1042's chevron. It turns down, the shipping details open below the row, and the status line reports it. Click it again to close them.
- The details don't line up with the columns. They lay out on their own across the full width.
- Focus #1042's Order cell and press Left. Focus moves to the chevron. Press Space to open the details, then Right and Down. Focus moves to the details.
- On the open note, press Enter. Focus moves into the field. Escape comes back to the details.
- Select #1044. Only the row is selected, not its details.

## Tree Grids

To nest rows, set `depth` on each row's first cell. Top-level rows have a depth of 0, which is the default, so they don't need it. List rows parent first: a row is the child of the closest row above it with a smaller depth. The grid becomes a tree grid, and each parent row's first cell gets a chevron, with every level indented by `--grid-tree-indent`.

Rows start collapsed. Set `expanded` on a row's first cell to start it open. `orbRowExpand` fires before a row expands or collapses, with the row's cells and whether it's expanding. To load a row's children when it first opens, set `expandable` on its first cell, so it has a chevron before it has children, and add the children's cells after the row in the event.

The tree works with the grid's other features:
- Sorting sorts each parent's children, so rows stay under their parents.
- Pagination pages top-level rows, each with its whole subtree.
- Searching and filtering show matching rows, and the rows above them. A row that only shows for a match under it opens while the search is on, without changing its `expanded`. Rows under a matching row show as usual.
- With `selection="multiple"`, a parent's checkbox follows its children. It's checked when all of them are selected, mixed when some are, and clear when none are. Checking or clearing a parent does the same to every row under it, including rows under collapsed rows. Children added under a checked parent, such as ones loaded when it opens, start checked. With `selection="single"`, rows are selected on their own.
- Row details stay with their row, and hide along with it.
- Reordering is off in tree grids.

::: live-code-demo

```html
<orb-textbox id="file-search" label="Search files">
  <input type="search">
</orb-textbox>
<orb-grid id="file-grid" selection="multiple" searchbox="file-search">
  <orb-cell section="head" sortable>Name</orb-cell>
  <orb-cell section="head" sortable>Size</orb-cell>
  <orb-cell section="head">Kind</orb-cell>

  <orb-cell expanded>src</orb-cell>
  <orb-cell value="0">—</orb-cell>
  <orb-cell>Folder</orb-cell>

  <orb-cell depth="1" expanded>components</orb-cell>
  <orb-cell value="0">—</orb-cell>
  <orb-cell>Folder</orb-cell>

  <orb-cell depth="2">grid.tsx</orb-cell>
  <orb-cell value="48">48 KB</orb-cell>
  <orb-cell>TypeScript</orb-cell>

  <orb-cell depth="2">grid.css</orb-cell>
  <orb-cell value="6">6 KB</orb-cell>
  <orb-cell>CSS</orb-cell>

  <orb-cell depth="1">utils</orb-cell>
  <orb-cell value="0">—</orb-cell>
  <orb-cell>Folder</orb-cell>

  <orb-cell depth="2">icons.tsx</orb-cell>
  <orb-cell value="14">14 KB</orb-cell>
  <orb-cell>TypeScript</orb-cell>

  <orb-cell expandable>docs</orb-cell>
  <orb-cell value="0">—</orb-cell>
  <orb-cell>Folder</orb-cell>

  <orb-cell>README.md</orb-cell>
  <orb-cell value="2">2 KB</orb-cell>
  <orb-cell>Markdown</orb-cell>
</orb-grid>
```

```javascript
// "docs" loads its children the first time it opens.
document.querySelector("#file-grid").addEventListener("orbRowExpand", (event) => {
  const [first, , last] = event.detail.row;
  if (!event.detail.expanded || !first.hasAttribute("expandable")) return;
  first.removeAttribute("expandable");
  const files = [["index.md", "3 KB", 3], ["installation.md", "1 KB", 1]];
  const cells = files.flatMap(([name, size, bytes]) => {
    const row = [name, size, "Markdown"].map((text) => {
      const cell = document.createElement("orb-cell");
      cell.textContent = text;
      return cell;
    });
    row[0].setAttribute("depth", "1");
    row[1].setAttribute("value", String(bytes));
    return row;
  });
  last.after(...cells);
});
```

:::

**Manual test:**
- "src" and "components" are open, so their children show, each level indented further. "utils" is closed, with a chevron pointing to the side.
- Click the chevron beside "utils". It opens and shows "icons.tsx". Click it again to close it.
- Click the chevron beside "docs". It loads and shows two files.
- Focus "utils" and press Right. It opens. Press Left. It closes. Press Left again on "icons.tsx" while "utils" is open, and focus moves to "utils".
- Close "src" while focus is on "grid.tsx". Focus moves to "src".
- Sort by Size, descending. Each folder's files sort among themselves, and every file stays under its folder.
- Check "grid.tsx". "components" and "src" show as mixed. Check "grid.css" too. "components" is checked, and "src" is still mixed.
- Check "src". Every row under it is checked, including "icons.tsx" while "utils" is closed. Clear "src", and they all clear.
- Check "docs" before opening it, then open it. Its loaded files start checked.
- Press Space on a mixed row. It and every row under it are checked.
- Close "utils", then search "icons". "src" and "utils" show and open to show "icons.tsx", and the other rows hide. Clear the search, and "utils" is closed again.
- Search "components". The folder shows with its files, since the folder itself matches.
- With a screen reader, each row is announced with its level, its place among its siblings, and whether it's expanded.

## Styling

The grid looks like a [native table](/css-utilities/tables/), and has the same settings. Where a table takes words in `data-orb`, the grid takes props, and words for one cell or column go on the `orb-cell`. Each setting only sets `--grid-*` custom properties, so you can set any of them yourself.

| Native table | `orb-grid` |
| --- | --- |
| `striped`, `hover`, `interactive` | `striped`, `hover`, `interactive` |
| `outer`, `rows`, `borderless` | `borders="outer"`, `borders="rows"`, `borders="none"`. The default is `all` |
| `compact`, `comfortable` | `density="compact"`, `density="comfortable"`. The default is `default` |
| `separate`, `caps`, `fixed`, `truncate` | `separate`, `caps`, `fixed`, `truncate` |
| `sticky-header`, `sticky-column` | `sticky-header`, `sticky-column`. The grid scrolls in its own box, so a sticky header needs `--grid-max-height` |
| `row-headers`, and `th` in the body | `row-headers` on the grid, and `row-header` on the cells |
| `success`, `warning`, `danger` on a cell | `status` on the cell |
| `success`, `warning`, `danger` on a row | `row-status` on the row's first cell |
| `w-xs` to `w-xl`, `w-auto`, `w-min` | `width="xs"` to `width="xl"`, `width="auto"`, `width="min"` on a header cell |
| `start`, `center`, `end`, `numeric` | `align` and `numeric` on a cell. On a header cell, they apply to the whole column |
| `table-container` | Not needed. The grid scrolls in its own box. Size it with `--grid-max-width`, `--grid-max-height`, and `--grid-min-width` |
| `<caption>` | An `orb-label` with `for` set to the grid's `id` |
| `selected` | Not needed. Use `selection` |
| `--table-*` properties | The same properties, named `--grid-*` |

### Labels

Give a grid a visible name with an `orb-label` whose `for` is the grid's `id`. Screen readers announce the grid with it.

::: live-code-demo

```html
<orb-label for="feeder-grid">Feeder visits this week</orb-label>
<orb-grid id="feeder-grid">
  <orb-cell section="head">Species</orb-cell>
  <orb-cell section="head" numeric>Visits</orb-cell>
  <orb-cell section="head">Seen</orb-cell>

  <orb-cell>American Robin</orb-cell>
  <orb-cell>12</orb-cell>
  <orb-cell>Mornings</orb-cell>

  <orb-cell>Steller's Jay</orb-cell>
  <orb-cell>7</orb-cell>
  <orb-cell>All day</orb-cell>

  <orb-cell section="foot">Total</orb-cell>
  <orb-cell section="foot">19</orb-cell>
  <orb-cell section="foot"></orb-cell>
</orb-grid>
```

:::

**Manual test:**
- With a screen reader, the grid is announced as "Feeder visits this week".
- The Visits column, including the footer, is aligned to the end.

### Borders and Spacing

::: live-code-demo

```html
<orb-mesh space="lg" style="--min-column-size: 18rem; align-items: start;">
  <orb-grid borders="outer" aria-label="outer">
    <orb-cell section="head">borders="outer"</orb-cell>
    <orb-cell section="head">Visits</orb-cell>
    <orb-cell>Robin</orb-cell><orb-cell>12</orb-cell>
    <orb-cell>Jay</orb-cell><orb-cell>7</orb-cell>
  </orb-grid>
  <orb-grid borders="rows" aria-label="rows">
    <orb-cell section="head">borders="rows"</orb-cell>
    <orb-cell section="head">Visits</orb-cell>
    <orb-cell>Robin</orb-cell><orb-cell>12</orb-cell>
    <orb-cell>Jay</orb-cell><orb-cell>7</orb-cell>
  </orb-grid>
  <orb-grid borders="none" striped aria-label="none striped">
    <orb-cell section="head">borders="none" striped</orb-cell>
    <orb-cell section="head">Visits</orb-cell>
    <orb-cell>Robin</orb-cell><orb-cell>12</orb-cell>
    <orb-cell>Jay</orb-cell><orb-cell>7</orb-cell>
    <orb-cell>Thrush</orb-cell><orb-cell>3</orb-cell>
  </orb-grid>
  <orb-grid separate aria-label="separate">
    <orb-cell section="head">separate</orb-cell>
    <orb-cell section="head">Visits</orb-cell>
    <orb-cell>Robin</orb-cell><orb-cell>12</orb-cell>
    <orb-cell>Jay</orb-cell><orb-cell>7</orb-cell>
  </orb-grid>
  <orb-grid density="compact" aria-label="compact">
    <orb-cell section="head">density="compact"</orb-cell>
    <orb-cell section="head">Visits</orb-cell>
    <orb-cell>Robin</orb-cell><orb-cell>12</orb-cell>
    <orb-cell>Jay</orb-cell><orb-cell>7</orb-cell>
  </orb-grid>
  <orb-grid density="comfortable" aria-label="comfortable">
    <orb-cell section="head">density="comfortable"</orb-cell>
    <orb-cell section="head">Visits</orb-cell>
    <orb-cell>Robin</orb-cell><orb-cell>12</orb-cell>
    <orb-cell>Jay</orb-cell><orb-cell>7</orb-cell>
  </orb-grid>
  <orb-grid selection="multiple" borders="rows" aria-label="rows with selection">
    <orb-cell section="head">rows, with selection</orb-cell>
    <orb-cell section="head">Visits</orb-cell>
    <orb-cell>Robin</orb-cell><orb-cell>12</orb-cell>
    <orb-cell>Jay</orb-cell><orb-cell>7</orb-cell>
  </orb-grid>
  <orb-grid style="--grid-vertical-borders: 0; --grid-border-color: var(--orb-primary-400);" aria-label="custom properties">
    <orb-cell section="head">custom properties</orb-cell>
    <orb-cell section="head">Visits</orb-cell>
    <orb-cell>Robin</orb-cell><orb-cell>12</orb-cell>
    <orb-cell>Jay</orb-cell><orb-cell>7</orb-cell>
  </orb-grid>
</orb-mesh>
```

:::

**Manual test:**
- **outer** has a border around the whole grid and no lines inside.
- **rows** has lines between rows, and above and below the grid, with no vertical lines.
- **none striped** has no lines. Every other body row is tinted.
- **separate** has a small gap between cells, and each cell has its own border with rounded corners.
- **compact** is shorter than the others, and **comfortable** is taller.
- **rows, with selection** has no vertical line beside the checkboxes either.
- **custom properties** has no vertical lines and a primary-colored border.
- No grid has a doubled line anywhere.

### Columns and Text

Set `width` on a header cell to size its column, and `align` or `numeric` to align it. The body and footer cells in the column follow, unless they set their own. With `fixed`, columns without a width share the rest of the space, and `truncate` keeps text on one line.

::: live-code-demo

```html
<orb-grid caps fixed truncate aria-label="Observations">
  <orb-cell section="head" width="xs">ID</orb-cell>
  <orb-cell section="head">Observation</orb-cell>
  <orb-cell section="head" width="sm" align="center">Region</orb-cell>
  <orb-cell section="head" width="sm" numeric>Count</orb-cell>

  <orb-cell>001</orb-cell>
  <orb-cell>A very long note about a Varied Thrush heard calling from deep inside an old-growth stand</orb-cell>
  <orb-cell>Olympic</orb-cell>
  <orb-cell>1,284</orb-cell>

  <orb-cell>002</orb-cell>
  <orb-cell>Short note</orb-cell>
  <orb-cell align="start">Puget Sound</orb-cell>
  <orb-cell>11</orb-cell>
</orb-grid>
```

:::

**Manual test:**
- Header labels are small and uppercase, with extra letter spacing.
- The ID column is narrow, Region and Count are a little wider, and Observation takes the rest.
- The long note ends in an ellipsis on one line, and the grid doesn't get wider.
- "Olympic" is centered under Region, and "Puget Sound" is at the start, since it sets its own alignment.
- The counts are aligned to the end, and their digits line up.

### Rows and Statuses

`row-status` on a row's first cell tints the row, and `status` tints one cell. Don't rely on color alone: say what the status is in the row. `row-header` makes a cell its row's header, and `row-headers` gives row headers the header tint.

::: live-code-demo

```html
<orb-grid hover row-headers striped aria-label="Species status">
  <orb-cell section="head">Species</orb-cell>
  <orb-cell section="head">Status</orb-cell>
  <orb-cell section="head">Notes</orb-cell>

  <orb-cell row-header>American Robin</orb-cell>
  <orb-cell>Normal</orb-cell>
  <orb-cell>Common</orb-cell>

  <orb-cell row-header row-status="success">Bald Eagle</orb-cell>
  <orb-cell>Recovered</orb-cell>
  <orb-cell>Off the endangered list</orb-cell>

  <orb-cell row-header row-status="warning">Pine Siskin</orb-cell>
  <orb-cell>Declining</orb-cell>
  <orb-cell>Watch list</orb-cell>

  <orb-cell row-header row-status="danger">Marbled Murrelet</orb-cell>
  <orb-cell>Endangered</orb-cell>
  <orb-cell>Old growth only</orb-cell>

  <orb-cell row-header>Varied Thrush</orb-cell>
  <orb-cell status="danger">Cell only</orb-cell>
  <orb-cell>Only the status cell is tinted</orb-cell>

  <orb-cell row-header>Barn Owl</orb-cell>
  <orb-cell>Normal</orb-cell>
  <orb-cell>Roosts in barns</orb-cell>
</orb-grid>
```

:::

**Manual test:**
- The species names are semi-bold, with the header tint over each row's own tint.
- Every other body row is striped. Stripes count every row, so the status rows show their status tint instead, and the owl row is striped.
- The eagle, siskin, and murrelet rows are tinted green, yellow, and red, and hovering them doesn't change their tint.
- Move the pointer over the plain rows. Each one tints as the pointer passes.
- Only "Cell only" is tinted red in its row.
- With a screen reader, the species name is read as the row's header when moving across the row.

### Scrolling Headers and Columns

`sticky-header` keeps the header rows at the top, and `sticky-column` keeps the first column at the start, along with the selection, details, and drag handle columns. The grid is its own scroll box, so a sticky header needs `--grid-max-height`. Use `--grid-min-width` to make the content wider than the grid. Sticky cells are opaque, so if the grid isn't on the page's background, set `--grid-background` to the color behind it.

::: live-code-demo

```html
<orb-grid sticky-header sticky-column striped selection="multiple" aria-label="Sighting log" style="--grid-max-width: 32rem; --grid-max-height: 14rem; --grid-min-width: 48rem;">
  <orb-cell section="head">Species</orb-cell>
  <orb-cell section="head">Region</orb-cell>
  <orb-cell section="head">Month</orb-cell>
  <orb-cell section="head">Habitat</orb-cell>
  <orb-cell section="head">Notes</orb-cell>

  <orb-cell>American Robin</orb-cell><orb-cell>Puget Sound</orb-cell><orb-cell>March</orb-cell><orb-cell>Lawns</orb-cell><orb-cell>First singing males</orb-cell>
  <orb-cell>Steller's Jay</orb-cell><orb-cell>Olympic</orb-cell><orb-cell>April</orb-cell><orb-cell>Conifers</orb-cell><orb-cell>Raiding feeders</orb-cell>
  <orb-cell>Varied Thrush</orb-cell><orb-cell>Cascades</orb-cell><orb-cell>May</orb-cell><orb-cell>Old growth</orb-cell><orb-cell>Heard, not seen</orb-cell>
  <orb-cell>Bald Eagle</orb-cell><orb-cell>San Juans</orb-cell><orb-cell>June</orb-cell><orb-cell>Shoreline</orb-cell><orb-cell>Nesting pair</orb-cell>
  <orb-cell>Pine Siskin</orb-cell><orb-cell>Columbia Basin</orb-cell><orb-cell>July</orb-cell><orb-cell>Mixed woods</orb-cell><orb-cell>Large flock</orb-cell>
  <orb-cell>Barn Owl</orb-cell><orb-cell>Willamette</orb-cell><orb-cell>August</orb-cell><orb-cell>Farmland</orb-cell><orb-cell>Roosting in a barn</orb-cell>
  <orb-cell>Great Blue Heron</orb-cell><orb-cell>Puget Sound</orb-cell><orb-cell>September</orb-cell><orb-cell>Tideflats</orb-cell><orb-cell>Fishing at low tide</orb-cell>
  <orb-cell>Black-capped Chickadee</orb-cell><orb-cell>Cascades</orb-cell><orb-cell>October</orb-cell><orb-cell>Mixed woods</orb-cell><orb-cell>Mixed flock</orb-cell>
</orb-grid>
```

:::

**Manual test:**
- Scroll down inside the grid. The header row stays at the top, and the rows scroll under it without showing through.
- Scroll sideways. The checkboxes and the Species column stay at the start, and the other columns scroll under them.
- Scroll both ways. The header's first cells stay put, above everything else.
- The lines under the header and beside the Species column stay visible while scrolling.
- Striped rows stay striped in the sticky columns.
- Press Down and Right with the keyboard. The focused cell scrolls into view, and isn't hidden under the sticky header or column.

## Controlling the Grid from Code

Methods change the grid the same way the user can. Pass a row as its cells, such as the `row` in an event's detail, or as any one of its cells.

| Method | What it does |
| --- | --- |
| `selectRows(rows, selected = true)` | Selects or deselects rows. In a tree with `selection="multiple"`, rows under each row go with it |
| `selectAllRows()` | Selects every row that passes the search and filters, on every page. Only with `selection="multiple"` |
| `clearSelection()` | Deselects every row |
| `getSelectedRows()` | The selected rows, each as its cells, including rows on other pages |
| `revealRow(row, { focus })` | Expands the rows above it, turns to its page, and scrolls it into view. With `focus`, focus moves to it. Resolves to false when the search or filters hide it |
| `clearFilters()` | Clears the search, the bound search field, and every header filter |
| `resetView()` | Clears the search, filters, and sort, and goes back to the first page |
| `expandAll()`, `collapseAll()` | Expands or collapses every tree row, on every page |

The selection methods emit `orbSelectionChange`, and `clearFilters()` emits `orbFilterChange`. `expandAll()` and `collapseAll()` don't emit `orbRowExpand`, the same as setting `expanded` in the markup, so rows that load their children when they open stay collapsed.

::: live-code-demo

```html
<orb-textbox id="code-search" label="Search birds">
  <input type="search">
</orb-textbox>
<orb-grid id="code-grid" selection="multiple" searchbox="code-search" pagination="code-pages" aria-label="Birds">
  <orb-cell section="head" sortable>Name</orb-cell>
  <orb-cell section="head" filter="select">Region</orb-cell>

  <orb-cell>Thrushes</orb-cell><orb-cell>Everywhere</orb-cell>
  <orb-cell depth="1">American Robin</orb-cell><orb-cell>Puget Sound</orb-cell>
  <orb-cell depth="1">Varied Thrush</orb-cell><orb-cell>Cascades</orb-cell>

  <orb-cell>Corvids</orb-cell><orb-cell>Everywhere</orb-cell>
  <orb-cell depth="1">Steller's Jay</orb-cell><orb-cell>Olympic</orb-cell>
  <orb-cell depth="1">Common Raven</orb-cell><orb-cell>Cascades</orb-cell>

  <orb-cell>Raptors</orb-cell><orb-cell>Everywhere</orb-cell>
  <orb-cell depth="1">Bald Eagle</orb-cell><orb-cell>San Juans</orb-cell>
  <orb-cell depth="1">Barn Owl</orb-cell><orb-cell>Willamette</orb-cell>
</orb-grid>
<orb-mesh class="orb-padding-sm">
  <orb-button id="code-expand" size="sm" fill="outline">Expand all</orb-button>
  <orb-button id="code-collapse" size="sm" fill="outline">Collapse all</orb-button>
  <orb-button id="code-select" size="sm" fill="outline">Select all</orb-button>
  <orb-button id="code-clear" size="sm" fill="outline">Clear selection</orb-button>
  <orb-button id="code-reveal" size="sm" fill="outline">Show the owl</orb-button>
  <orb-button id="code-reset" size="sm" fill="outline">Reset</orb-button>
</orb-mesh>
<orb-pagination id="code-pages" page-size="2"></orb-pagination>
<p id="code-status" role="status">No birds selected.</p>
```

```javascript
const grid = document.querySelector("#code-grid");
const status = document.querySelector("#code-status");
const owl = [...grid.querySelectorAll("orb-cell")].find((cell) => cell.textContent === "Barn Owl");

document.querySelector("#code-expand").addEventListener("click", () => grid.expandAll());
document.querySelector("#code-collapse").addEventListener("click", () => grid.collapseAll());
document.querySelector("#code-select").addEventListener("click", () => grid.selectAllRows());
document.querySelector("#code-clear").addEventListener("click", () => grid.clearSelection());
document.querySelector("#code-reset").addEventListener("click", () => grid.resetView());
document.querySelector("#code-reveal").addEventListener("click", async () => {
  const shown = await grid.revealRow(owl, { focus: true });
  if (!shown) status.textContent = "The search or filters hide the owl.";
});

grid.addEventListener("orbSelectionChange", async () => {
  const rows = await grid.getSelectedRows();
  const names = rows.map((cells) => cells[0].textContent.trim());
  status.textContent = names.length ? `Selected: ${names.join(", ")}` : "No birds selected.";
});
```

:::

**Manual test:**
- Click Expand all. Every group opens, on both pages. Collapse all closes them.
- Expand all, focus "Steller's Jay", then click Collapse all. Focus moves to "Corvids".
- Click Show the owl. The grid turns to page 2, Raptors opens, and focus moves to "Barn Owl".
- Click Select all. Every bird is selected, on both pages, and the status lists them. Clear selection deselects them.
- Search "jay", then click Select all. Only Steller's Jay is selected, and Corvids shows as mixed.
- With "jay" still in the search, click Show the owl. The status says the search hides it.
- Sort by Name, filter Region, and type a search. Click Reset. The search field is empty, the filter is cleared, the sort is off, and the grid is on page 1. Expanded groups stay expanded.

## Styling with Custom States

The grid and its cells expose what they work out at runtime as [custom states](https://developer.mozilla.org/en-US/docs/Web/CSS/:state), so page CSS can style them with `:state()`, and other elements can react with `:has()`. The grid's states are listed under [Custom States](#custom-states) below, and the cells' states on the [`orb-cell`](../grid-cell/#custom-states) page.

States are only for styling. Screen readers still hear the same things through ARIA, so don't use a state to show something that isn't also announced.

::: live-code-demo

```html
<style>
  /* Selected rows aren't tinted with multiple selection, so this opts in */
  #state-grid orb-cell:state(selected) {
    background-color: var(--grid-selected-background);
  }

  /* Marks the cell focus comes back to, while focus is outside the grid */
  #state-grid:not(:focus-within) orb-cell:state(current) {
    box-shadow: inset 0 -2px var(--orb-primary-400);
  }

  /* Headers with an active filter */
  #state-grid orb-cell:state(filtered) {
    color: light-dark(var(--orb-primary-600), var(--orb-primary-300));
  }

  /* The bulk actions and clear button only show when they apply */
  #state-tools .bulk,
  #state-tools .clear {
    display: none;
  }
  #state-tools:has(~ #state-grid:state(has-selection)) .bulk,
  #state-tools:has(~ #state-grid:state(filtering)) .clear {
    display: inline-flex;
  }
</style>
<orb-toolbar id="state-tools" class="orb-padding-sm">
  <orb-textbox id="state-search" label="Search">
    <input type="search">
  </orb-textbox>
  <orb-button class="clear" size="sm" fill="outline" onclick="document.querySelector('#state-grid').clearFilters()">Clear filters</orb-button>
  <orb-button class="bulk" size="sm" fill="outline" color="danger" slot="end">Archive selected</orb-button>
</orb-toolbar>
<orb-grid id="state-grid" selection="multiple" searchbox="state-search" aria-label="Birds">
  <orb-cell section="head">Species</orb-cell>
  <orb-cell section="head" filter="select">Region</orb-cell>

  <orb-cell>American Robin</orb-cell><orb-cell>Puget Sound</orb-cell>
  <orb-cell>Steller's Jay</orb-cell><orb-cell>Olympic</orb-cell>
  <orb-cell>Varied Thrush</orb-cell><orb-cell>Cascades</orb-cell>
  <orb-cell>Bald Eagle</orb-cell><orb-cell>San Juans</orb-cell>
</orb-grid>
```

:::

**Manual test:**
- Check a row. Its cells are tinted, and "Archive selected" shows. Uncheck it, and the button hides.
- Type in the search. "Clear filters" shows. Click it. The search field empties, and the button hides.
- Uncheck a value in the Region filter. The Region header turns the primary color, and "Clear filters" shows.
- Focus a cell, then click outside the grid. The cell keeps a line along its bottom. Tab back in, and the line goes away while the focus ring shows.

## Printing and Exporting

`print()` opens the browser's print dialog with the grid as a native table, so it can be printed or saved as a PDF. `toTable()` gives the same `<table>` to use yourself, and `toCSV()` gives the grid as CSV text.

Each one takes the rows in the order shown. By default, that's every row that passes the search and filters, on every page, or only the selected rows when any are selected. Pass `{ rows }` to choose: `"view"`, `"page"`, `"all"`, or `"selected"`. In a tree grid, the children of open rows are included, and open row details. Pass `{ expand: "all" }` to include every row and all details.

The table holds each cell's content as text. Form fields give their value, and buttons are left out. The grid's settings become [`data-orb` words](/css-utilities/tables/), and the grid's label becomes the caption, and the title of a saved PDF. The selection, details, and drag handle columns are left out. When printing, the grid's colors and custom properties carry over, and `truncate` is left off so no text is cut off.

In CSV, each cell gives its `value` when it has one, and its text otherwise. Text that a spreadsheet would run as a formula, such as `=SUM(A1)`, starts with an apostrophe.

::: live-code-demo

```html
<orb-label for="export-grid">Sightings</orb-label>
<orb-grid id="export-grid" pagination="export-pages" selection="multiple" striped>
  <orb-cell section="head" sortable>Species</orb-cell>
  <orb-cell section="head" sortable>Region</orb-cell>
  <orb-cell section="head" sortable numeric>Count</orb-cell>
  <orb-cell section="head">Seen</orb-cell>

  <orb-cell>American Robin</orb-cell><orb-cell>Puget Sound</orb-cell><orb-cell>12</orb-cell><orb-cell value="2025-03-02">March 2</orb-cell>
  <orb-cell>Steller's Jay</orb-cell><orb-cell>Olympic</orb-cell><orb-cell>7</orb-cell><orb-cell value="2025-04-11">April 11</orb-cell>
  <orb-cell>Varied Thrush</orb-cell><orb-cell>Cascades</orb-cell><orb-cell>3</orb-cell><orb-cell value="2025-05-20">May 20</orb-cell>
  <orb-cell row-status="success">Bald Eagle</orb-cell><orb-cell>San Juans</orb-cell><orb-cell>2</orb-cell><orb-cell value="2025-06-08">June 8</orb-cell>
  <orb-cell>Pine Siskin</orb-cell><orb-cell>Columbia Basin</orb-cell><orb-cell>40</orb-cell><orb-cell value="2025-07-15">July 15</orb-cell>
  <orb-cell>Barn Owl</orb-cell><orb-cell>Willamette</orb-cell><orb-cell>1</orb-cell><orb-cell value="2025-08-30">August 30</orb-cell>

  <orb-cell section="foot">Total</orb-cell><orb-cell section="foot"></orb-cell><orb-cell section="foot">65</orb-cell><orb-cell section="foot"></orb-cell>
</orb-grid>
<orb-toolbar class="orb-padding-sm">
  <orb-button id="export-print" size="sm" fill="outline">Print</orb-button>
  <orb-button id="export-csv" size="sm" fill="outline">Download CSV</orb-button>
  <orb-pagination id="export-pages" page-size="3" with-summary slot="end"></orb-pagination>
</orb-toolbar>
```

```javascript
const grid = document.querySelector("#export-grid");

document.querySelector("#export-print").addEventListener("click", () => grid.print());

document.querySelector("#export-csv").addEventListener("click", async () => {
  const csv = await grid.toCSV();
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const link = Object.assign(document.createElement("a"), { href: url, download: "sightings.csv" });
  link.click();
  URL.revokeObjectURL(url);
});
```

:::

**Manual test:**
- Click Print. The print dialog opens with a table titled "Sightings" that has all six rows, not only the three on this page, and the footer.
- The printed table is striped, its header is tinted, the Count column is aligned to the end, and the eagle row is tinted green. There are no checkboxes.
- Save it as a PDF. The suggested file name is "Sightings".
- Sort by Count, then print. The rows are in the sorted order.
- Select two rows, then print. Only those two rows are in the table.
- Click Download CSV. The file has a header row, every body row, and the footer. The Seen column has the ISO dates from `value`.
- Close the print dialog. Focus goes back to the page, and no empty frame is left in it.

## Large Grids

The grid handles thousands of rows on the client. For more, see [Server-Side Data](#server-side-data). Body cells scrolled out of view skip rendering, and rows hidden by pages, filters, or collapsed tree rows aren't rendered at all. When adding many cells from code, append them all at once, such as in a `DocumentFragment`, so the grid lays out its rows once instead of after every cell.

This demo loads products from [DummyJSON](https://dummyjson.com), a free API of example data, and repeats them to make 1,000 rows. It sends a request to `dummyjson.com` when the page loads.

::: live-code-demo

```html
<orb-textbox id="product-search" label="Search products" debounce="300" class="orb-margin-bottom">
  <input type="search">
</orb-textbox>
<orb-grid
  id="product-grid"
  searchbox="product-search"
  sticky-header
  striped
  density="compact"
  aria-label="Products"
  style="--grid-max-height: 30rem;"
  pagination="product-pages"
>
  <orb-cell section="head" width="xs" numeric sortable>ID</orb-cell>
  <orb-cell section="head" width="lg" sortable>Product</orb-cell>
  <orb-cell section="head" width="md" sortable filter="text">Brand</orb-cell>
  <orb-cell section="head" width="sm" sortable filter="select">Category</orb-cell>
  <orb-cell section="head" numeric sortable filter="number">Price</orb-cell>
  <orb-cell section="head" numeric sortable>Rating</orb-cell>
  <orb-cell section="head" numeric sortable>Stock</orb-cell>
</orb-grid>
<p id="product-status" role="status">Loading products…</p>
<div style="display: flex; justify-content: flex-end;">
  <orb-pagination 
    class="orb-margin-sm" 
    id="product-pages" 
    page-size="50" 
    with-summary
  ></orb-pagination>
</div>
```

```javascript
const grid = document.querySelector("#product-grid");
const status = document.querySelector("#product-status");
const rows = 1000;

try {
  const response = await fetch(
    "https://dummyjson.com/products?limit=0&select=title,brand,category,price,rating,stock",
  );
  if (!response.ok) throw new Error(response.statusText);
  const { products } = await response.json();

  const cells = document.createDocumentFragment();
  const add = (text, value) => {
    const cell = document.createElement("orb-cell");
    cell.textContent = text;
    if (value != null) cell.setAttribute("value", value);
    cells.append(cell);
  };
  for (let i = 0; i < rows; i++) {
    const product = products[i % products.length];
    add(String(i + 1));
    add(product.title);
    add(product.brand ?? "");
    add(product.category);
    add(`$${product.price.toFixed(2)}`, product.price);
    add(product.rating.toFixed(1), product.rating);
    add(String(product.stock));
  }
  // All at once, so the grid lays out its rows once
  grid.append(cells);
  status.textContent = `${rows} rows, from ${products.length} DummyJSON products.`;
} catch (error) {
  status.textContent = `Couldn't load the products: ${error.message}`;
}

grid.addEventListener("orbFilterChange", ({ detail }) => {
  status.textContent = `${detail.matches} of ${detail.total} rows match.`;
});
```

:::

**Manual test:**
- The grid fills with 1,000 rows, and the status says how many products they came from.
- Scroll inside the grid. The header stays at the top, and scrolling stays smooth.
- Sort by Price. The rows reorder without a long pause.
- Search "phone", then filter Category. The status counts the matching rows.
- With the network offline, reload. The status says the products couldn't load.

## Server-Side Data

For more rows than the browser should hold, set `server-side`, and let your server sort, search, filter, and page. The grid keeps working the same for the user: headers still sort, the search field and filters still take input, and the pagination still turns pages. But the grid shows the body cells it has, in the order they're in, and leaves the rest to you.

[See it with 100,000 rows](/demos/products/). The demo uses DuckDB in the browser as its server.

`orbQueryChange` fires after any of them change, with the whole query: the sorting header and its column, the search, the active filters, and the page and page size. Fetch the rows for it, and replace the body cells. `getQuery()` gives the same query, for the first load.

```javascript
grid.addEventListener("orbQueryChange", async (event) => {
  const { sort, search, filters, page, pageSize } = event.detail;
  grid.busy = true;
  const { rows, total } = await fetchRows({ sort, search, filters, page, pageSize });
  grid.querySelectorAll(':scope > orb-cell:not([section="head"], [section="foot"])').forEach((cell) => cell.remove());
  grid.append(...rowsToCells(rows));
  pagination.total = total;
  grid.busy = false;
});
```

The cancelable events still work, so `orbSortChange`, `orbRowExpand`, and the pagination's `orbBeforePageChange` can stop a change before it happens. A sort, search, or filter change goes back to page 1.

With `server-side`:
- Set the pagination's `total` to the number of matching rows. The grid uses it to tell screen readers where each row is among them all.
- Set `filterOptions` on each `select` filter's header, since the grid only has one page of values.
- Set `busy` while rows load. It sets `aria-busy` and the `busy` state, and you style the state.
- `orbFilterChange` has no `matches` or `total`, and the grid doesn't announce them. Announce the number of results yourself, such as in a `role="status"` element.
- After Page Up or Page Down, focus moves to the new page's first row once its cells are in.
- Selection, `selectAllRows()`, `revealRow()`, and tree rows only cover the rows the grid has. Selections don't carry across pages.
- `print()`, `toTable()`, and `toCSV()` aren't available, since the grid doesn't have every row. Export on the server.
- `orbReorder` reports indexes among the rows the grid has. Add the page's offset for an index among all rows.

When the cell that has focus is removed, such as when the rows are replaced, focus moves to the cell in its place, or the nearest one. That's true without `server-side` too.

**Manual test** (on the demo page):
- The grid fills with the first 25 of 100,000 products, and the status says how many there are.
- Sort by Price. The rows are the cheapest of all 100,000, not of the 25 that were showing. The pagination goes back to page 1.
- Search "wireless lamp". The status counts the matches, and the pagination shows their pages.
- Filter Brand to two brands, and Price to a range. The rows only include those.
- Turn to the last page. Its rows are the last of the sorted results.
- Focus a cell, then press Page Down. Focus moves to the same column in the new page's first row, and stays in the grid.
- While a query runs, the grid dims. With a screen reader, the grid is announced as busy.
- With a screen reader, a row on page 3 is announced as row 52 or so, out of the total.

## Keyboard

The grid is a single Tab stop. Once it has focus, the keys move around inside it.

| Key | Action |
| --- | --- |
| Arrows | Move by cell, or by row when `navigation="row"` |
| Home / End | First or last cell in the row. With `navigation="row"`, the first or last row |
| Ctrl + Home / End | First or last cell in the grid |
| Space | Toggle selection of the focused row, when `selection` is set. On a radio button, select its row |
| Enter | Activate, then enter the cell's content. On a sortable header, sort |
| F2 | Enter the cell's content |
| Alt + Down, on a header with `filter` | Open the header's filter. On a header that doesn't sort, Enter does too |
| Page Up / Page Down | With `pagination`, the previous or next page. Otherwise, move about one screen of rows |
| Space or Enter on a drag handle | Pick the row up, or drop it |
| Up / Down, with a row picked up | Move the row |
| Escape, with a row picked up | Put the row back where it started |
| Alt + Up / Down | Move the focused row, when `reorder` is set |
| Right / Left, with `navigation="row"` | Open or close the focused row's details. Left on open details goes back to their row |
| Right, in a tree grid | On a collapsed row, expand it. With `navigation="row"`, on an expanded row, move to its first child |
| Left, in a tree grid | On an expanded row, collapse it. On a collapsed row or a leaf, move to its parent |
| Escape | Leave the cell's content |

A cell that spans several columns or rows is one stop for the arrow keys. Moving out of it continues from the row or column you entered it from.

Links, buttons, and fields inside a cell aren't in the Tab order, so Tab leaves the grid instead of stopping on every control. Press Enter on a cell to fire `orbActivate` and move focus to the first control inside it. Tab then moves between the controls in that cell, and Escape goes back to the cell. Clicking a control also enters its cell. Call `preventDefault()` on `orbActivate` to handle Enter yourself and keep focus on the cell.

## Interactive Cells

This grid uses `selection="multiple"`, so each body row has a checkbox in the first column.

::: live-code-demo

```html
<orb-grid id="team-grid" selection="multiple" select-all>
  <orb-cell section="head">Name</orb-cell>
  <orb-cell section="head">Profile</orb-cell>
  <orb-cell section="head">Role</orb-cell>
  <orb-cell section="head">Notes</orb-cell>
  <orb-cell section="head">Actions</orb-cell>

  <orb-cell>Alice Johnson</orb-cell>
  <orb-cell><a href="#alice">View profile</a></orb-cell>
  <orb-cell>
    <select aria-label="Role for Alice Johnson">
      <option>Developer</option>
      <option selected>Lead</option>
      <option>Manager</option>
    </select>
  </orb-cell>
  <orb-cell><input aria-label="Notes for Alice Johnson" value="Owns the release"></orb-cell>
  <orb-cell>
    <orb-button size="sm" fill="outline">Edit</orb-button>
    <orb-button size="sm" fill="outline" color="danger">Remove</orb-button>
  </orb-cell>

  <orb-cell>Bob Smith</orb-cell>
  <orb-cell><a href="#bob">View profile</a></orb-cell>
  <orb-cell>
    <select aria-label="Role for Bob Smith">
      <option selected>Developer</option>
      <option>Lead</option>
      <option>Manager</option>
    </select>
  </orb-cell>
  <orb-cell><input aria-label="Notes for Bob Smith"></orb-cell>
  <orb-cell>
    <orb-button size="sm" fill="outline">Edit</orb-button>
    <orb-button size="sm" fill="outline" color="danger">Remove</orb-button>
  </orb-cell>

  <orb-cell>Cara Diaz</orb-cell>
  <orb-cell>No profile</orb-cell>
  <orb-cell>Manager</orb-cell>
  <orb-cell>On leave until June</orb-cell>
  <orb-cell>
    <orb-button size="sm" fill="outline">Edit</orb-button>
    <orb-button size="sm" fill="outline" color="danger">Remove</orb-button>
  </orb-cell>
</orb-grid>
<p id="team-status" role="status">No rows selected.</p>
```

```javascript
const grid = document.querySelector("#team-grid");
const status = document.querySelector("#team-status");

grid.addEventListener("orbSelectionChange", (event) => {
  const names = event.detail.map((cells) => cells[0].textContent.trim());
  status.textContent = names.length ? `Selected: ${names.join(", ")}` : "No rows selected.";
});

grid.addEventListener("orbActivate", (event) => {
  const { row, cell } = event.detail;
  status.textContent = `Activated ${cell.textContent.trim() || "a cell"} in ${row[0].textContent.trim()}'s row.`;
});
```

:::

**Manual test:**
- Tab into the grid. Focus lands on the "Name" header cell, with a focus ring inside the cell.
- Press Tab again. Focus leaves the grid, without stopping on the links, fields, or buttons.
- Shift+Tab back in. Focus returns to the cell you left.
- Use the arrow keys. Focus moves one cell at a time and stops at the edges.
- Press Home and End. Focus goes to the first and last cell of the row. Ctrl+Home and Ctrl+End go to the first and last cell of the grid.
- On a body row, press Space. Its checkbox is checked, and the status line lists it. The row isn't tinted. Press Space again to deselect it. Space on the header row does nothing.
- Click Bob's checkbox. His row is selected, along with any others. Click it again to deselect it.
- From "Alice Johnson", press Left. Focus moves to her checkbox, and Space toggles it.
- Select one row. The header checkbox shows a dash. Click it. Every row is selected, and it shows a check. Click it again. Every row is cleared.
- Press Ctrl+Home. Focus moves to the header checkbox.
- Make the window narrow. The grid scrolls sideways inside its own box, and the page doesn't. Move focus to the Actions column with the arrow keys. The grid scrolls to show it.
- On Alice's "Actions" cell, press Enter. The status line reports the activation, and focus moves to "Edit". Tab moves to "Remove", and Escape returns to the cell.
- On Alice's "Notes" cell, press Enter, then type. The arrow keys move the caret in the field, not between cells. Escape returns to the cell.
- On Cara's "No profile" cell, press Enter. The status line reports it, and focus stays on the cell.
- Click the "Notes" field for Bob. You can type in it, and Tab moves on from there.

### Row Navigation

With `navigation="row"`, focus moves between whole rows. The up and down arrows move, and Home and End go to the first and last row. Enter fires `orbActivate` without a `cell`, then moves into the row's first control.

::: live-code-demo

```html
<orb-grid navigation="row" selection="single">
  <orb-cell section="head">Species</orb-cell>
  <orb-cell section="head">Region</orb-cell>
  <orb-cell section="head">Details</orb-cell>

  <orb-cell>American Robin</orb-cell>
  <orb-cell>Puget Sound</orb-cell>
  <orb-cell><a href="#robin">Open sighting</a></orb-cell>

  <orb-cell>Steller's Jay</orb-cell>
  <orb-cell>Olympic</orb-cell>
  <orb-cell><a href="#jay">Open sighting</a></orb-cell>

  <orb-cell>Varied Thrush</orb-cell>
  <orb-cell>Cascades</orb-cell>
  <orb-cell><a href="#thrush">Open sighting</a></orb-cell>
</orb-grid>
```

:::

**Manual test:**
- Tab into the grid. The header row has a focus ring around the whole row.
- Up and down move between rows. Left and right do nothing.
- Press Space on a body row. It's selected, and selecting another row deselects the first.
- Press Enter on a body row. Focus moves to its "Open sighting" link. Escape returns to the row.

## Accessibility

**Manual test checklist:**

- [ ] The grid is announced as a grid, with its number of rows and columns. Each body cell is announced with its column header.
- [ ] The grid is a single Tab stop, and Tab never stops on controls inside cells until the cell is entered.
- [ ] Every focused cell or row shows a focus ring that isn't hidden by its neighbors.
- [ ] A spanning cell is announced with the number of columns or rows it covers.
- [ ] With more than one header row, check which headers a screen reader reads for each body cell. Grids tie cells to headers by column, which can be ambiguous with spanning headers.
- [ ] Selected rows are announced as selected. With `selection="multiple"`, the grid is announced as multi-selectable.
- [ ] Controls inside cells have accessible names that make sense out of context, such as "Notes for Alice Johnson".
- [ ] In forced colors mode, a selected row has an outline with `selection="single"`. With `multiple`, its checkbox shows the state.
- [ ] The select all checkbox is announced as "Select all rows", with checked, not checked, or mixed.
- [ ] A grid that scrolls sideways can be scrolled by moving focus, since the grid is a Tab stop.
- [ ] Each drag handle is announced as "Reorder" and the row's name, as a toggle button that's pressed while the row is picked up.
- [ ] Picking up, moving, dropping, and canceling a row are each announced, with the row's position.
- [ ] Rows can be reordered without a pointer, from a handle or with Alt + Up and Down.
- [ ] A sortable header is announced with its sort state: ascending, descending, or none. Each sort is announced.
- [ ] A details toggle is announced as "Details for" and the row's name, as expanded or collapsed. Open details are announced as a row with one cell.
- [ ] Closed details aren't read by a screen reader and can't be reached with the keyboard.
- [ ] A tree grid is announced as a tree grid. Each row is announced with its level, its position among its siblings, and whether it's expanded or collapsed.
- [ ] Rows inside a collapsed row aren't read by a screen reader and can't be reached with the keyboard.
- [ ] A parent row's checkbox is announced as checked, not checked, or mixed, matching its children.
- [ ] Each funnel button is named "Filter" and the column's name, and each filter's fields have labels.
- [ ] A filtered header is described as "Filtered" by screen readers.
- [ ] When a filter closes, focus goes back to its header.
- [ ] After the search or a filter changes, the number of matching rows is announced once typing stops.
- [ ] When nothing matches, the empty row is read by a screen reader.
- [ ] Highlighted matches are still readable in light and dark mode, and in forced colors mode.
- [ ] After a page change, the new page is announced by the pagination, and focus stays in the grid when the page was turned from the keyboard.
- [ ] In forced colors mode, a row being moved has a dashed outline, and the drop line is visible.
- [ ] A grid with an `orb-label` is announced with the label's text.
- [ ] A cell with `row-header` is announced as a row header, and read as the row's header for the other cells in the row.
- [ ] Text in tinted rows and cells has enough contrast, and statuses are also shown with text, not color alone.
- [ ] A focused cell scrolled under a sticky header or column is still visible when focus moves to it.
- [ ] A printed table, or one from `toTable()`, has a caption, header cells with `scope`, and row headers as `th scope="row"`.
