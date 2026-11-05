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

  <orb-cell section="foot" colspan="6" style="justify-content: flex-end">
    <orb-pagination total="237" page-size="10" page="1" with-summary label="Compact with summary"></orb-pagination>
  </orb-cell>
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

## Keyboard

The grid is a single Tab stop. Once it has focus, the keys move around inside it.

| Key | Action |
| --- | --- |
| Arrows | Move by cell, or by row when `navigation="row"` |
| Home / End | First or last cell in the row. With `navigation="row"`, the first or last row |
| Ctrl + Home / End | First or last cell in the grid |
| Space | Toggle selection of the focused row, when `selection` is set. On a radio button, select its row |
| Enter | Activate, then enter the cell's content |
| Space or Enter on a drag handle | Pick the row up, or drop it |
| Up / Down, with a row picked up | Move the row |
| Escape, with a row picked up | Put the row back where it started |
| Alt + Up / Down | Move the focused row, when `reorder` is set |
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
- [ ] In forced colors mode, a row being moved has a dashed outline, and the drop line is visible.
