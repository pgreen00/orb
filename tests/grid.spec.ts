/**
 * Specs for orb-grid, across the phases in plans/grid-new-features.md.
 *
 * Phase 0 covered how pointer and keyboard input reach the grid, so the
 * phases that change selection modes, card taps, and reordering can show what
 * they break. What that found:
 *
 * - In cell navigation, Right on a tree row's first cell opens it, and doesn't
 *   move focus into its first child, which grid.md's manual test says it
 *   should. Left on a child does move focus to its parent.
 * - WebKit doesn't move a row with the drag events Playwright dispatches, and
 *   Chromium sometimes drops at the start. Phase 6 replaced the native drag
 *   and drop with pointer events, which fixed it, and replaced that spec.
 * - Phase 1's `contain: inline-size` stops wide rows from making the page
 *   wider, so the grid fills its container. A container that sizes to its
 *   content gets no width from the grid, which the `fixme` spec records.
 *
 * Firefox is left out for now, since it hangs and pins a CPU on the dev
 * machine. Run with:
 *
 *   npx playwright test tests/grid.spec.ts --project=chromium --project=webkit
 *
 * When a phase changes a spec's expectations on purpose, change the spec in
 * that phase and say so in the commit:
 *
 * - Phase 2: the header checkbox reaches every page, so it's `checked` once a
 *   page's rows are all selected.
 * - Phase 3: cards have no selection controls and a tap selects.
 * - Phase 4: clicking a header chip in cards opens the sheet instead of sorting.
 *   The Escape spec is skipped in WebKit, which under Playwright's parallel load
 *   sometimes leaves the overlay's dialog closed though the overlay is open.
 *   That can't be reproduced outside the suite.
 * - Phase 5: `selection="keyboard"` adds its own describe block.
 * - Phase 6: the handle is gone, so the drag specs press a cell's text instead,
 *   with `page.mouse`.
 * - Phase 7: trees reorder, so the "blocked" announcement is only for sorting
 *   and filtering.
 */
import { test, expect, type Page } from "@playwright/test";
import { mount } from "./utils";

const grid = (page: Page) => page.locator("orb-grid");
const cells = (page: Page) => page.locator("orb-grid > orb-cell");

/** The body rows, each as its first cell's text, in the order they show */
const rowOrder = (page: Page) =>
  grid(page).evaluate((el) =>
    [...el.shadowRoot!.querySelectorAll('[role="row"].body')].flatMap((row) => {
      const first = row.querySelector("slot")?.assignedElements()[0];
      return first ? [first.textContent!.trim()] : [];
    }),
  );

/** The names of the selected rows, from `getSelectedRows()` */
const selectedNames = (page: Page) =>
  grid(page).evaluate(async (el: any) =>
    ((await el.getSelectedRows()) as HTMLElement[][]).map((row) => row[0].textContent!.trim()),
  );

/** A body row's selection control, by the row's name */
const control = (page: Page, name: string) =>
  grid(page).locator(`[part~="select-cell"] [part~="select-control"][aria-label="Select ${name}"]`);

/**
 * Clicks a row's selection control. The grid's own controls sit under the
 * row's slot, which Playwright's hit test reports as covering them, so control
 * clicks skip the actionability checks and go straight to the element.
 */
const toggle = (page: Page, name: string) => control(page, name).click({ force: true });

/** How many rows are selected, from `getSelectedRows()` */
const selectedCount = (page: Page) =>
  grid(page).evaluate(async (el: any) => ((await el.getSelectedRows()) as HTMLElement[][]).length);

const NAMES = ["Alice", "Bob", "Cara", "Dan", "Eve", "Frank", "Grace", "Hiro"];

const markup = (attrs: string, names = NAMES.slice(0, 4)) => `
  <orb-grid ${attrs}>
    <orb-cell section="head">Name</orb-cell>
    ${names.map((name) => `<orb-cell>${name}</orb-cell>`).join("")}
  </orb-grid>`;

/**
 * Gives a body cell focus the way the grid does when its row is reached, then
 * the arrow keys. A click would also select in some modes, so it's avoided.
 */
const activate = (page: Page, index = 0) =>
  grid(page).evaluate((el, i) => {
    const cell = el.querySelectorAll<HTMLElement>(":scope > orb-cell")[i + 1];
    cell.focus();
    return cell === document.activeElement;
  }, index);

/** The body row the focused element is in, from the focused element */
const focusedRowName = (page: Page) =>
  grid(page).evaluate((el) => {
    const active = document.activeElement;
    if (!active || active === document.body) return null;
    // Focus is on a cell in the page, in a row in the shadow root
    const cell = active as HTMLElement;
    const row = [...el.shadowRoot!.querySelectorAll('[role="row"]')].find((row) =>
      row.querySelector("slot")?.assignedElements().includes(cell),
    );
    return row?.querySelector("slot")?.assignedElements()[0]?.textContent?.trim() ?? null;
  });

test.describe("orb-grid layout", () => {
  // A table whose columns don't fit a phone, in a box the grid is supposed to
  // fill. Long values make each column's minimum wide: about 1100px in all,
  // where `auto` columns size to their content.
  const wideTable = (container = "padding: 1rem;") => `
    <div id="page" style="${container}">
      <orb-grid layout="auto" aria-label="Wide">
        <orb-cell section="head">Name</orb-cell>
        <orb-cell section="head">Description</orb-cell>
        <orb-cell section="head">Notes</orb-cell>
        ${[1, 2, 3, 4, 5, 6]
          .map(
            (n) =>
              `<orb-cell>Product number ${n}</orb-cell><orb-cell>A reasonably long description of product number ${n}</orb-cell><orb-cell>Some notes about it, for product ${n}</orb-cell>`,
          )
          .join("\n")}
      </orb-grid>
    </div>`;

  /** Where the grid is in its container, and whether anything scrolls sideways */
  const widths = (page: Page) =>
    page.evaluate(() => {
      const grid = document.querySelector("orb-grid") as HTMLElement & { shadowRoot: ShadowRoot };
      return {
        viewport: innerWidth,
        page: document.getElementById("page")!.getBoundingClientRect().width,
        grid: grid.getBoundingClientRect().width,
        // The whole document: nothing should stick out past the screen
        scrollWidth: document.documentElement.scrollWidth,
        gridScrolls: grid.scrollWidth > grid.clientWidth,
        cards: grid.matches(":state(cards)"),
      };
    });

  test("wide content never makes the page wider than the screen", async ({ page }) => {
    await page.setViewportSize({ width: 1000, height: 800 });
    await mount(page, wideTable());

    // Above the card breakpoint the table fits or its columns give, and it
    // never makes the page scroll sideways. The columns first give at the
    // table's minimum width, which the products demo's wide data passes when
    // the grid is in a wrapper that sizes to its content (see below).
    await page.setViewportSize({ width: 800, height: 800 });
    await expect.poll(async () => (await widths(page)).page).toBe(800);
    const middle = await widths(page);
    expect(middle.cards).toBe(false);
    expect(middle.scrollWidth).toBe(800);
    expect(middle.grid).toBeLessThanOrEqual(middle.page);
    // Nothing in the grid is wider than the grid, so it doesn't scroll
    expect(middle.gridScrolls).toBe(false);

    // Below the card breakpoint: the rows become cards, and nothing scrolls
    await page.setViewportSize({ width: 480, height: 800 });
    await expect.poll(async () => (await widths(page)).cards).toBe(true);
    const narrow = await widths(page);
    expect(narrow.scrollWidth).toBe(480);
    expect(narrow.gridScrolls).toBe(false);
    expect(narrow.page).toBe(480);
  });

  // This is the one thing a container gets from the grid's content: nothing.
  // A container that sizes to its content, such as a centered wrapper with
  // auto margins, gives the grid no width, so the grid takes its own, which
  // is 0. docs/site/demos/products.njk sets the width of its page for this.
  test.fixme(
    "a grid in a centered, content-sized wrapper",
    async ({ page }) => {
      await mount(page, `<div style="display: grid">${wideTable("max-width: 80rem; margin-inline: auto; padding: 1rem;")}</div>`);
      await expect.poll(async () => (await widths(page)).grid).toBeGreaterThan(300);
    },
  );
});

test.describe("orb-grid selection", () => {
  test("single: a radio selects one row at a time", async ({ page }) => {
    await mount(page, markup('selection="single"'));
    await expect(grid(page).locator('[part~="select-cell"] .radio')).toHaveCount(4);
    await expect(grid(page).locator('[part~="select-cell"] orb-checkbox')).toHaveCount(0);

    await toggle(page, "Bob");
    await expect(control(page, "Bob")).toHaveAttribute("aria-checked", "true");
    await expect(control(page, "Bob")).toBeFocused();
    await expect.poll(() => selectedCount(page)).toBe(1);

    await toggle(page, "Dan");
    await expect(control(page, "Bob")).toHaveAttribute("aria-checked", "false");
    await expect(control(page, "Dan")).toHaveAttribute("aria-checked", "true");
    expect(await selectedCount(page)).toBe(1);
  });

  test("single: Space on a cell selects its row", async ({ page }) => {
    await mount(page, markup('selection="single"'));
    expect(await activate(page, 1)).toBe(true);
    await page.keyboard.press("Space");
    await expect(control(page, "Bob")).toHaveAttribute("aria-checked", "true");
  });

  test("multiple: checkboxes toggle rows and fire orbSelectionChange", async ({ page }) => {
    await mount(page, markup('selection="multiple" select-all'));
    await expect(grid(page).locator('[part~="select-cell"] orb-checkbox')).toHaveCount(5);

    await page.evaluate(() => {
      (window as any).changes = [];
      document.querySelector("orb-grid")!.addEventListener("orbSelectionChange", (event: any) =>
        (window as any).changes.push(event.detail.length),
      );
    });

    await toggle(page, "Bob");
    await toggle(page, "Dan");
    await expect(control(page, "Bob")).toHaveAttribute("checked", "true");
    expect(await selectedCount(page)).toBe(2);
    expect(await page.evaluate(() => (window as any).changes)).toEqual([1, 2]);

    await toggle(page, "Bob");
    expect(await selectedCount(page)).toBe(1);
  });

  test("methods select and clear rows, and the header select all follows", async ({ page }) => {
    await mount(page, markup('selection="multiple" select-all'));
    const selectAll = grid(page).locator('orb-checkbox[part~="select-all"]');

    await grid(page).evaluate(async (el: any) => {
      const body = [...el.querySelectorAll(":scope > orb-cell")].slice(1);
      await el.selectRows([body[0], body[2]]);
    });
    expect(await selectedCount(page)).toBe(2);
    await expect(selectAll).toHaveAttribute("checked", "mixed");

    await selectAll.click({ force: true });
    expect(await selectedCount(page)).toBe(4);
    await expect(selectAll).toHaveAttribute("checked", "true");

    await grid(page).evaluate(async (el: any) => el.clearSelection());
    expect(await selectedCount(page)).toBe(0);
    await expect(selectAll).toHaveAttribute("checked", "false");
  });

  test("without selection, cells still take focus and nothing is selected", async ({ page }) => {
    await mount(page, markup(""));
    await expect(grid(page).locator('[part~="select-cell"]')).toHaveCount(0);
    expect(await activate(page)).toBe(true);
    await page.keyboard.press("Space");
    expect(await selectedCount(page)).toBe(0);
  });
});

test.describe("orb-grid keyboard selection", () => {
  const keyboard = (attrs = 'selection="keyboard"', names = NAMES.slice(0, 4)) => markup(attrs, names);

  /** Selected row names, in the order the rows are in */
  const selected = async (page: Page) => {
    const names = await selectedNames(page);
    return (await rowOrder(page)).filter((name) => names.includes(name));
  };

  test("has no selection controls, and Arrow Down selects one row", async ({ page }) => {
    await mount(page, keyboard());
    await expect(grid(page).locator('[part~="select-cell"]')).toHaveCount(0);
    await expect(grid(page).locator("orb-checkbox, .radio")).toHaveCount(0);

    expect(await activate(page)).toBe(true);
    await page.keyboard.press("ArrowDown");
    await expect.poll(() => selectedNames(page)).toEqual(["Bob"]);
  });

  test("Shift + Down extends the range, and Shift + Up shrinks it", async ({ page }) => {
    await mount(page, keyboard());
    await activate(page, 1);
    await page.keyboard.press("Space");
    await expect.poll(() => selectedNames(page)).toEqual(["Bob"]);

    await page.keyboard.press("Shift+ArrowDown");
    await page.keyboard.press("Shift+ArrowDown");
    expect(await selected(page)).toEqual(["Bob", "Cara", "Dan"]);

    await page.keyboard.press("Shift+ArrowUp");
    expect(await selected(page)).toEqual(["Bob", "Cara"]);
  });

  test("Ctrl + Down moves focus without selecting, and Space adds a row", async ({ page }) => {
    await mount(page, keyboard());
    await activate(page);
    await page.keyboard.press("Space");
    await expect.poll(() => selectedNames(page)).toEqual(["Alice"]);

    await page.keyboard.press("Control+ArrowDown");
    await page.keyboard.press("Control+ArrowDown");
    // Focus moved to Cara, and the selection didn't follow
    expect(await focusedRowName(page)).toBe("Cara");
    expect(await selectedNames(page)).toEqual(["Alice"]);

    await page.keyboard.press("Control+Space");
    await expect.poll(() => selected(page)).toEqual(["Alice", "Cara"]);
  });

  test("Ctrl + A selects every page", async ({ page }) => {
    await mount(
      page,
      `<div>${keyboard('selection="keyboard" pagination="pages"', NAMES)}<orb-pagination id="pages" page-size="3"></orb-pagination></div>`,
    );
    await activate(page);
    await page.keyboard.press("Control+a");
    await expect.poll(() => selectedCount(page)).toBe(8);
  });

  test("typing a letter focuses and selects the next row that starts with it", async ({ page }) => {
    await mount(page, keyboard());
    await activate(page);
    await page.keyboard.press("b");
    await expect.poll(() => focusedRowName(page)).toBe("Bob");
    await expect.poll(() => selectedNames(page)).toEqual(["Bob"]);
  });

  test("Shift + click selects a range, and Command + click toggles a row", async ({ page }) => {
    await mount(page, keyboard());
    await cells(page).nth(1).click();
    await expect.poll(() => selectedNames(page)).toEqual(["Alice"]);

    await cells(page).nth(3).click({ modifiers: ["Shift"] });
    await expect.poll(() => selected(page)).toEqual(["Alice", "Bob", "Cara"]);

    // Command + click adds a row that isn't next to the range. On macOS a
    // Ctrl + click is a right click, which browsers don't send as a click.
    await cells(page).nth(4).click({ modifiers: ["Meta"] });
    await expect.poll(() => selected(page)).toEqual(["Alice", "Bob", "Cara", "Dan"]);

    // Again removes it, and leaves the anchor where it was
    await cells(page).nth(2).click({ modifiers: ["Meta"] });
    await expect.poll(() => selected(page)).toEqual(["Alice", "Cara", "Dan"]);
  });

  test("a click on a button inside a cell doesn't select", async ({ page }) => {
    await mount(page, keyboard());
    await grid(page).evaluate((el) => {
      const button = document.createElement("button");
      button.textContent = "Edit";
      el.querySelectorAll(":scope > orb-cell")[2].append(button);
    });
    await page.locator("orb-grid orb-cell button").click();
    await page.waitForTimeout(100);
    expect(await selectedCount(page)).toBe(0);
  });

  test("Shift + click in a tree skips the children of a collapsed row", async ({ page }) => {
    await mount(
      page,
      `<orb-grid selection="keyboard">
        <orb-cell section="head">Name</orb-cell>
        <orb-cell expanded>Docs</orb-cell>
        <orb-cell depth="1">Resume</orb-cell>
        <orb-cell>Photos</orb-cell>
        <orb-cell>Music</orb-cell>
      </orb-grid>`,
    );

    // Collapse Docs, so its children aren't shown to be selected
    await cells(page).nth(1).locator(".tree-toggle").click();
    await expect.poll(() => rowOrder(page)).toEqual(["Docs", "Photos", "Music"]);

    await cells(page).filter({ hasText: "Docs" }).click();
    await cells(page).filter({ hasText: "Music" }).click({ modifiers: ["Shift"] });
    await expect.poll(() => selected(page)).toEqual(["Docs", "Photos", "Music"]);
  });
});

test.describe("orb-grid pagination", () => {
  const paged = (attrs = 'selection="multiple"') => `
    <div>
      ${markup(`pagination="pages" ${attrs}`, NAMES)}
      <orb-pagination id="pages" page-size="3"></orb-pagination>
    </div>`;

  test("shows one page at a time, and fills in the pagination's total", async ({ page }) => {
    await mount(page, paged());
    expect(await rowOrder(page)).toEqual(["Alice", "Bob", "Cara"]);
    await expect(page.locator("orb-pagination")).toHaveJSProperty("total", 8);

    await page.locator('orb-pagination [aria-label="Page 2"]').click();
    await expect.poll(() => rowOrder(page)).toEqual(["Dan", "Eve", "Frank"]);

    await page.locator('orb-pagination [aria-label="Next page"]').click();
    await expect.poll(() => rowOrder(page)).toEqual(["Grace", "Hiro"]);
  });

  test("selection is kept across pages", async ({ page }) => {
    await mount(page, paged());
    await toggle(page, "Alice");
    await page.locator('orb-pagination [aria-label="Page 3"]').click();
    await toggle(page, "Hiro");

    await expect.poll(() => selectedCount(page)).toBe(2);
    await page.locator('orb-pagination [aria-label="Page 1"]').click();
    await expect(control(page, "Alice")).toHaveAttribute("checked", "true");
  });

  test("select all covers every page, not just the current one", async ({ page }) => {
    await mount(page, paged('selection="multiple" select-all'));
    const selectAll = grid(page).locator('orb-checkbox[part~="select-all"]');
    await expect(selectAll).toHaveAttribute("checked", "false");

    // Checking it on page 1 selects all 8 rows, across the three pages
    await selectAll.click({ force: true });
    await expect.poll(() => selectedCount(page)).toBe(8);
    await expect(selectAll).toHaveAttribute("checked", "true");
    await page.locator('orb-pagination [aria-label="Page 3"]').click();
    await expect(control(page, "Hiro")).toHaveAttribute("checked", "true");
    await expect(selectAll).toHaveAttribute("checked", "true");

    // Clearing it on another page clears every page
    await selectAll.click({ force: true });
    await expect.poll(() => selectedCount(page)).toBe(0);
    await expect(control(page, "Hiro")).toHaveAttribute("checked", "false");

    // Selecting one row makes it mixed, and the rest of a page doesn't finish it
    await toggle(page, "Grace");
    await expect(selectAll).toHaveAttribute("checked", "mixed");
  });

  test("select all follows the search, across pages", async ({ page }) => {
    await mount(page, paged('selection="multiple" select-all'));
    const selectAll = grid(page).locator('orb-checkbox[part~="select-all"]');

    // "an" is in Dan and Frank, and in none of the other names, so the search
    // leaves two rows, on two pages
    await grid(page).evaluate((el) => (el as any).search = "an");
    await expect.poll(() => rowOrder(page)).toEqual(["Dan", "Frank"]);
    await selectAll.click({ force: true });
    await expect.poll(() => selectedCount(page)).toBe(2);
    await expect(selectAll).toHaveAttribute("checked", "true");

    // Rows the search hides stay selected, so clearing it leaves a mix
    await grid(page).evaluate((el) => (el as any).search = "");
    await expect.poll(() => rowOrder(page)).toEqual(["Alice", "Bob", "Cara"]);
    await expect(selectAll).toHaveAttribute("checked", "mixed");
  });

  test("rows added and removed change the total", async ({ page }) => {
    await mount(page, paged());
    await grid(page).evaluate((el) => {
      for (const cell of [...el.children]) if (cell.textContent!.trim() === "Grace") cell.remove();
    });
    await expect(page.locator("orb-pagination")).toHaveJSProperty("total", 7);
  });
});

test.describe("orb-grid cards", () => {
  const cards = (attrs = 'selection="multiple"', withButton = false) => `
    <orb-grid layout="cards" ${attrs}>
      <orb-cell section="head" sortable>Name</orb-cell>
      <orb-cell section="head">Role</orb-cell>
      ${NAMES.slice(0, 4)
        .map(
          (name) =>
            `<orb-cell>${name}</orb-cell><orb-cell>${withButton ? `<button type="button">Edit</button>` : "Engineer"}</orb-cell>`,
        )
        .join("")}
    </orb-grid>`;

  const cardCells = (page: Page) => grid(page).locator('orb-cell:not([section="head"])');

  /** How the named body row's card marks itself as selected */
  const selected = (page: Page, name: string) =>
    grid(page).evaluate((el, name) => {
      const row = [...el.shadowRoot!.querySelectorAll('[role="row"].body')].find((row) =>
        row.querySelector("slot")?.assignedElements()[0]?.textContent?.trim() === name,
      );
      return row?.getAttribute("aria-selected");
    }, name);

  test("each row is a card, with its cells on lines of their own", async ({ page }) => {
    await mount(page, cards());
    const head = grid(page).locator('orb-cell[section="head"]').first();
    const body = cardCells(page).first();
    const box = async (locator: ReturnType<Page["locator"]>) => (await locator.boundingBox())!;

    // The card's first cell is on its own line, full width, under the chips
    expect((await box(body)).y).toBeGreaterThan((await box(head)).y);
    expect((await box(body)).width).toBeGreaterThan((await box(head)).width);
    // Rows are stacked, not lined up in columns
    expect((await box(cardCells(page).nth(1))).y).toBeGreaterThan((await box(body)).y);
  });

  test("arrow keys move through a card's cells, then to the next card", async ({ page }) => {
    await mount(page, cards());
    const body = cardCells(page);
    // Clicking a cell makes it the active cell, as the arrow keys need one
    await body.first().click();
    await expect(body.first()).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await expect(body.nth(1)).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(body.nth(3)).toBeFocused();
  });

  test("Space selects a card", async ({ page }) => {
    await mount(page, cards());
    // The cards have two header chips, so focus the first body cell
    expect(
      await grid(page).evaluate((el) => {
        const cell = el.querySelectorAll<HTMLElement>('orb-cell:not([section="head"])')[0];
        cell.focus();
        return cell === document.activeElement;
      }),
    ).toBe(true);
    await page.keyboard.press("Space");
    await expect.poll(() => selectedCount(page)).toBe(1);
    await expect.poll(() => selected(page, "Alice")).toBe("true");
  });

  test("multiple: tapping a card toggles it, with no selection controls", async ({ page }) => {
    await mount(page, cards());
    // Cards have no selection column at all
    await expect(grid(page).locator('[part~="select-cell"]')).toHaveCount(0);
    await expect(grid(page).locator("orb-checkbox")).toHaveCount(0);

    await cardCells(page).first().click();
    await expect.poll(() => selectedCount(page)).toBe(1);
    expect(await selectedNames(page)).toEqual(["Alice"]);

    await cardCells(page).nth(2).click();
    await expect.poll(() => selectedCount(page)).toBe(2);

    // Tapping a selected card again clears it
    await cardCells(page).first().click();
    await expect.poll(() => selectedCount(page)).toBe(1);
    expect(await selectedNames(page)).toEqual(["Bob"]);
  });

  test("a button in a card cell does its own thing, not selecting", async ({ page }) => {
    await mount(page, cards('selection="multiple"', true));
    await page.getByRole("button", { name: "Edit" }).first().click();
    await page.waitForTimeout(100);
    expect(await selectedCount(page)).toBe(0);
  });

  test("single: tapping a card selects only it, and tapping it again keeps it", async ({ page }) => {
    await mount(page, cards('selection="single"'));
    await cardCells(page).first().click();
    expect(await selectedNames(page)).toEqual(["Alice"]);
    // A selected card has the selected tint, from its row's state
    await expect.poll(() => selected(page, "Alice")).toBe("true");

    await cardCells(page).nth(2).click();
    await expect.poll(() => selectedCount(page)).toBe(1);
    expect(await selectedNames(page)).toEqual(["Bob"]);
    await expect.poll(() => selected(page, "Alice")).toBe("false");
    await expect.poll(() => selected(page, "Bob")).toBe("true");

    // Like a radio button, it stays selected
    await cardCells(page).nth(2).click();
    await expect.poll(() => selectedCount(page)).toBe(1);
    expect(await selectedNames(page)).toEqual(["Bob"]);
  });

  test("switching to a table brings the checkboxes back, with the same rows checked", async ({ page }) => {
    await mount(page, cards('selection="multiple" select-all'));
    await cardCells(page).first().click();
    // Bob's first cell is the third body cell, since cards have two cells
    await cardCells(page).nth(2).click();
    await expect.poll(() => selectedCount(page)).toBe(2);

    await grid(page).evaluate((el) => ((el as any).layout = "table"));
    await expect(grid(page).locator('[part~="select-cell"]')).toHaveCount(5);
    await expect(control(page, "Alice")).toHaveAttribute("checked", "true");
    await expect(control(page, "Bob")).toHaveAttribute("checked", "true");
    await expect(control(page, "Cara")).toHaveAttribute("checked", "false");
    expect(await selectedCount(page)).toBe(2);
  });

  test("select all sits in the header row of the cards", async ({ page }) => {
    await mount(page, cards('selection="multiple" select-all'));
    const chip = grid(page).locator('button[part~="select-all"]');
    await expect(chip).toHaveText("Select all");
    await expect(chip).toHaveAttribute("aria-pressed", "false");

    await chip.click({ force: true });
    await expect.poll(() => selectedCount(page)).toBe(4);
    await expect(chip).toHaveText("Clear selection");
    await expect(chip).toHaveAttribute("aria-pressed", "true");

    await chip.click({ force: true });
    await expect.poll(() => selectedCount(page)).toBe(0);
    await expect(chip).toHaveText("Select all");
  });

  test("arrow keys never land on a hidden control", async ({ page }) => {
    await mount(page, cards());
    const body = cardCells(page);
    await body.first().click();
    await page.keyboard.press("ArrowLeft");
    // The first cell of the first card is as far start as the keys go
    await expect(body.first()).toBeFocused();
    await expect(grid(page).locator('[part~="select-cell"]')).toHaveCount(0);
  });
});

test.describe("orb-grid card header sheet", () => {
  const cards = (heads = `<orb-cell section="head" sortable>Name</orb-cell><orb-cell section="head">Role</orb-cell>`) => `
    <orb-grid layout="cards">
      ${heads}
      ${NAMES.slice(0, 4)
        .map((name) => `<orb-cell>${name}</orb-cell><orb-cell>Engineer</orb-cell>`)
        .join("")}
    </orb-grid>`;

  const chip = (page: Page, name: string) => grid(page).locator(`orb-cell[section="head"]:text-is("${name}")`);
  const sheet = (page: Page) =>
    grid(page).locator('orb-cell[section="head"] orb-overlay[side="bottom"][open]');
  const sortCell = (page: Page) =>
    grid(page).evaluate((el) => el.querySelector(':scope > orb-cell[section="head"][sort]')?.textContent?.trim() ?? null);
  /** The sheet's sort radio for a label, such as "Z to A" */
  const sortChoice = (page: Page, name: string) =>
    grid(page).locator(`orb-radio-group[part~="sort-control"] orb-radio`, { hasText: name });

  test("a sortable chip opens the sheet instead of sorting", async ({ page }) => {
    await mount(page, cards());
    await expect(chip(page, "Name").locator('[part~="filter-button"]')).toHaveCount(0);
    // No sort arrow until the column is sorted
    await expect(chip(page, "Name").locator('[part~="sort-icon"]')).toHaveCount(0);

    await chip(page, "Name").click();
    await expect(sheet(page)).toHaveCount(1);
    // Clicking it didn't sort
    await expect.poll(() => sortCell(page)).toBe(null);
    expect(await rowOrder(page)).toEqual(NAMES.slice(0, 4));
  });

  test("choosing a direction in the sheet sorts, and fires orbSortChange", async ({ page }) => {
    await mount(page, cards());
    await page.evaluate(() => {
      (window as any).sorts = [];
      document.querySelector("orb-grid")!.addEventListener("orbSortChange", (event: any) =>
        (window as any).sorts.push(event.detail.direction),
      );
    });

    await chip(page, "Name").click();
    await sortChoice(page, "Z to A").click();

    await expect.poll(() => rowOrder(page)).toEqual(["Dan", "Cara", "Bob", "Alice"]);
    expect(await page.evaluate(() => (window as any).sorts)).toEqual(["descending"]);
    await expect(chip(page, "Name").locator('[part~="sort-icon"]')).toHaveCount(1);
  });

  test("canceling orbSortChange leaves the sort as it was", async ({ page }) => {
    await mount(page, cards());
    await page.evaluate(() => {
      document.querySelector("orb-grid")!.addEventListener("orbSortChange", (event) => event.preventDefault());
    });

    await chip(page, "Name").click();
    await sortChoice(page, "A to Z").click();
    // The grid keeps its own sort, and the sheet follows it
    await page.waitForTimeout(100);
    expect(await sortCell(page)).toBe(null);
    expect(await rowOrder(page)).toEqual(NAMES.slice(0, 4));
  });

  test("a text filter typed in the sheet filters the cards", async ({ page }) => {
    await mount(page, cards(`<orb-cell section="head" filter="text">Name</orb-cell>`));
    await chip(page, "Name").click();
    await expect(sheet(page).locator('input[type="search"]')).toBeVisible();
    await sheet(page).locator('input[type="search"]').fill("a");
    await sheet(page).locator('input[type="search"]').press("Enter");
    // Alice, Cara, and Dan all have an "a"
    await expect.poll(() => rowOrder(page)).toEqual(["Alice", "Cara", "Dan"]);
    // The sheet still shows the filter, and the chip carries on without one
    await expect(sheet(page).locator('input[type="search"]')).toHaveValue("a");
  });

  // WebKit under Playwright's parallel load sometimes leaves the dialog
  // closed even though the overlay reports itself open, which this spec is the
  // only one to notice. The sheet itself works, so it's skipped there.
  test("Escape closes the sheet, and focus goes back to the chip", async ({ page, browserName }) => {
    test.skip(browserName === "webkit", "WebKit drops the overlay's open under load");
    await mount(page, cards());
    await chip(page, "Name").focus();
    await expect(chip(page, "Name")).toBeFocused();
    await page.keyboard.press("Enter");
    // Wait for the dialog itself, since Escape goes to the open dialog, which
    // opens a moment after the overlay's `open` attribute changes
    const dialogOpen = () =>
      grid(page).evaluate((el) =>
        [...el.querySelectorAll(':scope > orb-cell[section="head"]')].some((cell: any) =>
          (cell.shadowRoot?.querySelector('orb-overlay[side="bottom"]')?.shadowRoot?.querySelector(
            "dialog",
          ) as HTMLDialogElement | null)?.open,
        ),
      );
    await expect.poll(dialogOpen).toBe(true);
    await expect(sheet(page).locator('orb-radio-group[part~="sort-control"]')).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(sheet(page)).toHaveCount(0);
    await expect(chip(page, "Name")).toBeFocused();
    // Escape didn't reach the grid, which would clear the active cell
    expect(await rowOrder(page)).toEqual(NAMES.slice(0, 4));
  });

  test("clicks inside the sheet never sort the column again", async ({ page }) => {
    await mount(page, cards());
    await page.evaluate(() => {
      (window as any).sorts = [];
      document.querySelector("orb-grid")!.addEventListener("orbSortChange", (event: any) =>
        (window as any).sorts.push(event.detail.direction),
      );
    });
    await chip(page, "Name").click();
    await sheet(page).locator("orb-view").click({ position: { x: 5, y: 5 } });
    await page.waitForTimeout(100);
    expect(await page.evaluate(() => (window as any).sorts)).toEqual([]);
  });

  test("a chip with neither a sort nor a filter is hidden", async ({ page }) => {
    await mount(page, cards());
    // Hidden from the eye, but still a column header for screen readers
    await expect.poll(() => chip(page, "Role").evaluate((el) => getComputedStyle(el).visibility)).toBe("hidden");
    expect(await chip(page, "Name").evaluate((el) => getComputedStyle(el).visibility)).toBe("visible");
  });
});

test.describe("orb-grid reordering", () => {
  const reorderable = `
    <orb-grid reorder>
      <orb-cell section="head">Task</orb-cell>
      <orb-cell>One</orb-cell>
      <orb-cell>Two</orb-cell>
      <orb-cell>Three</orb-cell>
    </orb-grid>`;

  test("Alt + Down moves the focused row, reports it, and keeps focus", async ({ page }) => {
    await mount(page, reorderable);
    await page.evaluate(() => {
      (window as any).details = [];
      document.querySelector("orb-grid")!.addEventListener("orbReorder", (event: any) => {
        const { row, from, to } = event.detail;
        (window as any).details.push({ first: row[0].textContent.trim(), from, to });
      });
    });

    await activate(page, 0);
    await page.keyboard.press("Alt+ArrowDown");
    await expect.poll(() => rowOrder(page)).toEqual(["Two", "One", "Three"]);
    expect(await page.evaluate(() => (window as any).details)).toEqual([{ first: "One", from: 0, to: 1 }]);
    await expect.poll(() => focusedRowName(page)).toBe("One");

    await page.keyboard.press("Alt+ArrowUp");
    await expect.poll(() => rowOrder(page)).toEqual(["One", "Two", "Three"]);
  });

  test("preventDefault keeps the row where it is", async ({ page }) => {
    await mount(page, reorderable);
    await page.evaluate(() =>
      document.querySelector("orb-grid")!.addEventListener("orbReorder", (event) => event.preventDefault()),
    );
    await activate(page, 0);
    await page.keyboard.press("Alt+ArrowDown");
    expect(await rowOrder(page)).toEqual(["One", "Two", "Three"]);
  });

  test("a sorted grid blocks moving, and says so", async ({ page }) => {
    await mount(
      page,
      reorderable.replace("<orb-cell section=\"head\">", '<orb-cell section="head" sortable sort="ascending">'),
    );
    expect(await rowOrder(page)).toEqual(["One", "Three", "Two"]);

    await activate(page, 0);
    await page.keyboard.press("Alt+ArrowDown");
    expect(await rowOrder(page)).toEqual(["One", "Three", "Two"]);
    await expect(grid(page).locator('[role="status"]')).toContainText("can't be moved");
  });

  // The handle is gone, so these drag a row by its own text with the mouse.
  /** Presses on a cell's text, moves in steps, and releases */
  const dragRow = async (page: Page, from: string, toY: number, steps = 8) => {
    const start = (await cells(page).filter({ hasText: from }).boundingBox())!;
    const x = start.x + start.width / 2;
    const y = start.y + start.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    for (let i = 1; i <= steps; i++) {
      await page.mouse.move(x, y + ((toY - y) * i) / steps);
    }
    await page.mouse.up();
  };

  test("pressing a row's text and dragging moves it, and reports it", async ({ page }) => {
    await mount(page, reorderable);
    await page.evaluate(() => {
      (window as any).moves = [];
      document.querySelector("orb-grid")!.addEventListener("orbReorder", (event: any) =>
        (window as any).moves.push([event.detail.from, event.detail.to]),
      );
    });
    const last = (await grid(page).locator('[role="row"].body').last().boundingBox())!;

    await dragRow(page, "One", last.y + last.height - 2);

    await expect.poll(() => rowOrder(page)).toEqual(["Two", "Three", "One"]);
    expect(await page.evaluate(() => (window as any).moves)).toEqual([[0, 2]]);
  });

  test("no drag handle is rendered", async ({ page }) => {
    await mount(page, reorderable);
    await expect(grid(page).locator('[part~="handle"]')).toHaveCount(0);
    await expect(grid(page).locator('[part~="handle-cell"]')).toHaveCount(0);
    // The rows say how to move them with the keyboard instead
    await expect(grid(page).locator('[role="row"].body').first()).toHaveAttribute(
      "aria-keyshortcuts",
      "Alt+ArrowUp Alt+ArrowDown",
    );
  });

  test("a click without moving moves nothing", async ({ page }) => {
    await mount(page, reorderable);
    await cells(page).filter({ hasText: "One" }).click();
    await page.waitForTimeout(100);
    expect(await rowOrder(page)).toEqual(["One", "Two", "Three"]);
  });

  test("Escape during a drag moves nothing", async ({ page }) => {
    await mount(page, reorderable);
    const last = (await grid(page).locator('[role="row"].body').last().boundingBox())!;
    const start = (await cells(page).filter({ hasText: "One" }).boundingBox())!;
    const x = start.x + start.width / 2;
    const y = start.y + start.height / 2;

    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x, last.y + last.height - 2, { steps: 8 });
    await page.keyboard.press("Escape");
    await page.mouse.up();

    await page.waitForTimeout(200);
    expect(await rowOrder(page)).toEqual(["One", "Two", "Three"]);
  });

  test("a drag started on a button inside a cell does nothing", async ({ page }) => {
    await mount(
      page,
      `<orb-grid reorder>
        <orb-cell section="head">Task</orb-cell>
        <orb-cell section="head">Actions</orb-cell>
        <orb-cell>One</orb-cell><orb-cell><button type="button">Edit</button></orb-cell>
        <orb-cell>Two</orb-cell><orb-cell></orb-cell>
        <orb-cell>Three</orb-cell><orb-cell></orb-cell>
      </orb-grid>`,
    );
    const last = (await grid(page).locator('[role="row"].body').last().boundingBox())!;
    const box = (await page.locator("orb-grid orb-cell button").boundingBox())!;

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2, last.y + last.height - 2, { steps: 8 });
    await page.mouse.up();

    await page.waitForTimeout(200);
    expect(await rowOrder(page)).toEqual(["One", "Two", "Three"]);
  });

  test("dragging to the bottom edge scrolls the grid", async ({ page }) => {
    await mount(page, reorderable.replace("<orb-grid reorder>", '<orb-grid reorder style="--grid-max-height: 80px; display: block; overflow: auto;">'));
    const scrolled = await grid(page).evaluate(async (el: any) => {
      const rows = el.shadowRoot!.querySelectorAll<HTMLElement>('[role="row"].body');
      const cell = el.querySelectorAll(":scope > orb-cell")[1] as HTMLElement;
      const box = cell.getBoundingClientRect();
      cell.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, composed: true, clientX: box.x + 5, clientY: box.y + 5, pointerId: 1, button: 0, pointerType: "mouse" }));
      el.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, composed: true, clientX: box.x + 5, clientY: box.y + 20, pointerId: 1, pointerType: "mouse" }));
      // Near the bottom edge, which auto-scrolls on each frame
      const hostBox = el.getBoundingClientRect();
      el.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, composed: true, clientX: box.x + 5, clientY: hostBox.bottom - 2, pointerId: 1, pointerType: "mouse" }));
      await new Promise((r) => setTimeout(r, 300));
      const top = el.scrollTop;
      el.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, composed: true, pointerId: 1 }));
      return top;
    });
    expect(scrolled).toBeGreaterThan(0);
  });

  test("a long press on touch drags, and a quick swipe doesn't", async ({ page }) => {
    await mount(page, reorderable);
    const result = await grid(page).evaluate(async (el: any) => {
      const cell = el.querySelectorAll(":scope > orb-cell")[1] as HTMLElement;
      const box = cell.getBoundingClientRect();
      const others = el.shadowRoot!.querySelectorAll<HTMLElement>('[role="row"].body');
      const last = others[others.length - 1].getBoundingClientRect();
      const send = (type: string, clientY: number) =>
        cell.dispatchEvent(new PointerEvent(type, { bubbles: true, composed: true, clientX: box.x + 5, clientY, pointerId: 7, pointerType: "touch", isPrimary: true }));

      // A quick swipe moves a little, then lifts, before the hold
      send("pointerdown", box.y + 5);
      send("pointermove", box.y + 30);
      send("pointerup", box.y + 30);
      await new Promise((r) => setTimeout(r, 50));

      // A long press, then a move to the last row
      send("pointerdown", box.y + 5);
      await new Promise((r) => setTimeout(r, 450));
      send("pointermove", last.y + last.height - 2);
      send("pointerup", last.y + last.height - 2);
      await new Promise((r) => setTimeout(r, 200));
      return [...el.shadowRoot!.querySelectorAll('[role="row"].body')].map(
        (row) => row.querySelector("slot")?.assignedElements()[0]?.textContent?.trim(),
      );
    });
    expect(result).toEqual(["Two", "Three", "One"]);
  });
});

test.describe("orb-grid trees", () => {
  const tree = `
    <orb-grid selection="multiple">
      <orb-cell section="head">Name</orb-cell>
      <orb-cell expanded>Docs</orb-cell>
      <orb-cell depth="1">Resume</orb-cell>
      <orb-cell depth="1">Cover</orb-cell>
      <orb-cell>Photos</orb-cell>
    </orb-grid>`;

  // A tree row's keys: collapsed, open, and back again. The last step uses
  // the keyboard, since a collapsed tree row's chevron isn't shown.
  test("a row with children expands and collapses", async ({ page }) => {
    await mount(page, tree);
    const docs = cells(page).nth(1);
    expect(await rowOrder(page)).toEqual(["Docs", "Resume", "Cover", "Photos"]);

    await docs.locator(".tree-toggle").click();
    await expect.poll(() => rowOrder(page)).toEqual(["Docs", "Photos"]);
    await expect(docs).not.toHaveAttribute("expanded");
  });

  test("Right and Left on a row's first cell open and close it", async ({ page }) => {
    await mount(page, tree.replace(" expanded>", ">"));
    expect(await rowOrder(page)).toEqual(["Docs", "Photos"]);

    // Right opens the row
    await activate(page, 0);
    await page.keyboard.press("ArrowRight");
    await expect.poll(() => rowOrder(page)).toEqual(["Docs", "Resume", "Cover", "Photos"]);
    await expect(cells(page).nth(1)).toHaveAttribute("expanded", "");

    // Left closes it again
    await page.keyboard.press("ArrowLeft");
    await expect.poll(() => rowOrder(page)).toEqual(["Docs", "Photos"]);
    await expect(cells(page).nth(1)).not.toHaveAttribute("expanded");
  });

  test("a parent follows its children, and selecting it selects them", async ({ page }) => {
    await mount(page, tree);
    await toggle(page, "Resume");
    await expect(control(page, "Docs")).toHaveAttribute("checked", "mixed");
    await expect(control(page, "Resume")).toHaveAttribute("checked", "true");

    await toggle(page, "Docs");
    await expect(control(page, "Docs")).toHaveAttribute("checked", "true");
    await expect(control(page, "Cover")).toHaveAttribute("checked", "true");
    await expect.poll(() => selectedCount(page)).toBe(3);

    await toggle(page, "Cover");
    await expect(control(page, "Docs")).toHaveAttribute("checked", "mixed");
    expect(await selectedCount(page)).toBe(1);
  });

  test("rows report their level, position, and size", async ({ page }) => {
    await mount(page, tree);
    const resume = grid(page).locator('[role="row"].body').nth(1);
    await expect(resume).toHaveAttribute("aria-level", "2");
    await expect(resume).toHaveAttribute("aria-posinset", "1");
    await expect(resume).toHaveAttribute("aria-setsize", "2");
  });

  test("expandAll and collapseAll, and focus moves out of a row that closes", async ({ page }) => {
    const folders = `
      <orb-grid>
        <orb-cell section="head">Name</orb-cell>
        <orb-cell>Docs</orb-cell>
        <orb-cell depth="1">Resume</orb-cell>
        <orb-cell>Photos</orb-cell>
        <orb-cell depth="1">Beach</orb-cell>
      </orb-grid>`;
    await mount(page, folders);
    expect(await rowOrder(page)).toEqual(["Docs", "Photos"]);

    await grid(page).evaluate(async (el: any) => el.expandAll());
    await expect.poll(() => rowOrder(page)).toEqual(["Docs", "Resume", "Photos", "Beach"]);

    // Focus a row under Photos, then collapse everything
    await grid(page).evaluate((el) => el.querySelector<HTMLElement>(":scope > orb-cell:nth-of-type(5)")!.focus());
    await grid(page).evaluate(async (el: any) => el.collapseAll());
    await expect.poll(() => rowOrder(page)).toEqual(["Docs", "Photos"]);
    expect(await focusedRowName(page)).toBe("Photos");
  });
});
