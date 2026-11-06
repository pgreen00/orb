---
title: "OrbGrid | <orb-grid>"
sidebar_label: "Grid"
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
