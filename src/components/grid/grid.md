---
title: "OrbGrid | <orb-grid>"
sidebar_label: "Grid"
---

::: live-code-demo

```html
<orb-grid
  id="employees"
  sort-mode="single"
  selection="multiple"
  striped
  style="max-height:400px;"
>
  <orb-gr section="head">
    <orb-gc field="id" sticky sortable>ID</orb-gc>
    <orb-gc field="name" sortable>Name</orb-gc>
    <orb-gc field="department" sortable>Department</orb-gc>
    <orb-gc field="position">Position</orb-gc>
    <orb-gc field="salary" sortable>Salary</orb-gc>
    <orb-gc field="status">Status</orb-gc>
  </orb-gr>
</orb-grid>
```

```javascript
const grid = document.getElementById("employees");
const employees = await fetch("/employees.json").then((r) => r.json());

let state = { sort: "", selected: [], data: employees };

function render() {
  let rows = [...state.data];

  // the consumer sorts; the grid only asked
  if (state.sort) {
    const [field, direction] = state.sort.split(":");
    rows.sort((a, b) =>
      direction === "desc"
        ? String(b[field]).localeCompare(String(a[field]), undefined, { numeric: true })
        : String(a[field]).localeCompare(String(b[field]), undefined, { numeric: true }),
    );
  }

  grid.querySelectorAll('orb-gr[section="body"]').forEach((r) => r.remove());
  grid.append(
    ...rows.map((employee) => {
      const row = document.createElement("orb-gr");
      row.section = "body";
      row.rowKey = String(employee.id);
      row.append(
        ...["id", "name", "department", "position", "salary", "status"].map((field, i) => {
          const cell = document.createElement("orb-gc");
          if (field === "id") cell.sticky = "start";
          if (field === "salary") cell.align = "end";
          cell.textContent = employee[i];
          return cell;
        }),
      );
      return row;
    }),
  );

  grid.sort = state.sort;
  grid.selected = state.selected;
  grid.rowCount = state.data.length;
  grid.state = rows.length ? "ready" : "empty";
}

grid.addEventListener("sortIntent", ({ detail }) => {
  state.sort = detail.sort.map((s) => `${s.field}:${s.direction}`).join(",");
  render();
});

grid.addEventListener("selectIntent", ({ detail }) => {
  state.selected = detail.keys;
  render();
});

grid.addEventListener("activate", ({ detail }) => {
  console.log("activated row", detail.key);
});

await customElements.whenDefined("orb-grid");
render();
```

:::

## Intents

Every event is `bubbles: false` and fires on `orb-grid`, so one listener on the
grid survives the consumer replacing all of its rows.

| Event          | Detail                                           | Meaning                                 |
| -------------- | ------------------------------------------------ | --------------------------------------- |
| `sortIntent`   | `{ field, direction, additive, sort }`           | A sortable header was activated         |
| `selectIntent` | `{ keys, added, removed, reason }`               | The selection should change             |
| `activate`     | `{ key, field, row, cell, originalEvent }`       | Double click or Enter on a body row     |
| `expand`       | `{ key, expanded }`                              | A row should expand or collapse         |
| `resizeIntent` | `{ field, width, previous }`                     | A column was dragged to a new width     |

`activate` is the only cancelable one. Its default is to move focus into whatever
focusable content the cell holds; call `preventDefault()` to keep focus on the
cell and handle the activation yourself.

`sort` is a string so it works as an attribute: `"salary:desc"`, or
`"department:asc,salary:desc"` when `sort-mode="multiple"`. Shift click adds a
column to the sort in that mode. Read the parsed form from the `sortState` getter.

## Keyboard

`role="grid"` obligates the full APG model, so it is always on.

| Key                     | Action                                  |
| ----------------------- | --------------------------------------- |
| Arrows                  | Move by cell, or by row when `navigation="row"` |
| Home / End              | First or last cell in the row           |
| Ctrl + Home / End       | First or last cell in the grid          |
| Page Up / Page Down     | Move roughly one viewport of rows       |
| Space                   | Toggle selection of the focused row     |
| Enter                   | Activate, then enter the cell's content |
| Escape                  | Leave the cell's content                |

Exactly one cell holds the tab stop at a time, so tabbing past the grid takes one
press regardless of how many rows it has.

## Styling

The stylesheet for all three elements is adopted into the light DOM before the
elements are defined, so ordinary selectors reach into rows and cells without
crossing a shadow boundary. It is organised in two layers:

```css
@layer orb.grid.structure, orb.grid.theme;
```

`structure` holds the grid formatting, `display: contents` on rows, and the sticky
offsets. Override those and the grid stops behaving like a grid. `theme` holds
every colour, border, space and font.

Because everything we ship is inside a layer, **unlayered CSS of yours always
wins** with no specificity fight:

```css
orb-gr[section="head"] > orb-gc {
  background: rebeccapurple;
}
```

Three ways to customise, easiest first:

```css
/* 1. tokens, no selectors, survives upgrades */
orb-grid {
  --cell-padding-inline: 2rem;
  --row-background-hover: #eef;
}

/* 2. plain CSS, beats both our layers automatically */
orb-gc[align="end"] {
  font-variant-numeric: tabular-nums;
}

/* 3. drop our visuals wholesale, keep the structure working */
@layer orb.grid.theme {
}
```

The sort indicator and resize handle live in the cell's shadow root and are
exposed as `::part(sort)` and `::part(resize)`.

## Notes

- A row needs `row-key` to take part in selection; without one it cannot be
  tracked across a re-render.
- Pass `row-count` when paginating, otherwise `aria-rowcount` describes only the
  current page.
- Accessible naming is not wired up yet.
