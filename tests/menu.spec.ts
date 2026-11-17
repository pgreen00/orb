import { test, expect, type Page } from "@playwright/test";
import { mount } from "./utils";

type AxNode = { role: string; name: string; props: Record<string, unknown> };

/**
 * Playwright's role locators can't see roles set through ElementInternals, so
 * roles are read from Chromium's accessibility tree instead.
 */
async function accessibilityTree(page: Page): Promise<AxNode[]> {
  const session = await page.context().newCDPSession(page);
  const { nodes } = await session.send("Accessibility.getFullAXTree");
  return nodes
    .filter((node: any) => !node.ignored)
    .map((node: any) => ({
      role: node.role?.value,
      name: node.name?.value,
      props: Object.fromEntries((node.properties ?? []).map((p: any) => [p.name, p.value.value])),
    }));
}

const findNode = (nodes: AxNode[], role: string, name?: string) =>
  nodes.find((node) => node.role === role && (name === undefined || node.name === name));

const isChecked = (page: Page, value: string) =>
  page.locator(`orb-mi[value="${value}"]`).evaluate((el: any) => el.checked as boolean);

test.describe("orb-menu", () => {
  test("actions mode uses menu and menuitem roles", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "Roles are read from Chromium's accessibility tree");
    await mount(
      page,
      `<button id="trigger">Edit</button>
      <orb-menu for="trigger" label="Edit menu">
        <orb-mi>Cut</orb-mi>
        <orb-mi type="checkbox" checked>Ruler</orb-mi>
      </orb-menu>`,
    );
    await page.locator("#trigger").click();
    await expect(page.locator("orb-menu")).toBeVisible();

    const nodes = await accessibilityTree(page);
    expect(findNode(nodes, "menu", "Edit menu")).toBeDefined();
    expect(findNode(nodes, "menuitem", "Cut")).toBeDefined();
    expect(findNode(nodes, "menuitemcheckbox", "Ruler")?.props.checked).toBe("true");
    expect(findNode(nodes, "button", "Edit")?.props.hasPopup).toBe("menu");
  });

  test("single mode is a listbox of options", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "Roles are read from Chromium's accessibility tree");
    await mount(
      page,
      `<button id="trigger">Sort</button>
      <orb-menu for="trigger" mode="single" label="Sort by">
        <orb-mi value="name" checked>Name</orb-mi>
        <div>
          <orb-mi value="date">Date</orb-mi>
        </div>
        <orb-divider></orb-divider>
        <orb-mi type="checkbox" value="size">Size</orb-mi>
      </orb-menu>`,
    );
    await page.locator("#trigger").click();
    await expect(page.locator("orb-menu")).toBeVisible();

    const nodes = await accessibilityTree(page);
    expect(findNode(nodes, "listbox", "Sort by")?.props.multiselectable).not.toBe(true);
    expect(findNode(nodes, "option", "Name")?.props.selected).toBe(true);
    expect(findNode(nodes, "option", "Date")?.props.selected).toBe(false);
    // Items act as radio options regardless of their type.
    expect(findNode(nodes, "option", "Size")?.props.selected).toBe(false);
    expect(nodes.some((node) => node.role.startsWith("menuitem"))).toBe(false);
    // Dividers are hidden, since listboxes can't contain separators.
    expect(nodes.some((node) => node.role === "separator")).toBe(false);
    expect(findNode(nodes, "button", "Sort")?.props.hasPopup).toBe("listbox");
  });

  test("multi mode is a multiselectable listbox", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "Roles are read from Chromium's accessibility tree");
    await mount(
      page,
      `<button id="trigger">Filter</button>
      <orb-menu for="trigger" mode="multi" label="Filter by">
        <orb-mi value="images" checked>Images</orb-mi>
        <orb-mi value="video">Video</orb-mi>
      </orb-menu>`,
    );
    await page.locator("#trigger").click();
    await expect(page.locator("orb-menu")).toBeVisible();

    const nodes = await accessibilityTree(page);
    expect(findNode(nodes, "listbox", "Filter by")?.props.multiselectable).toBe(true);
    expect(findNode(nodes, "option", "Images")?.props.selected).toBe(true);
    expect(findNode(nodes, "option", "Video")?.props.selected).toBe(false);
  });

  test("single mode selects one option, clears the rest, and closes", async ({ page }) => {
    await mount(
      page,
      `<button id="trigger">Sort</button>
      <orb-menu for="trigger" mode="single" label="Sort by">
        <orb-mi value="name" checked>Name</orb-mi>
        <div>
          <orb-mi value="date">Date</orb-mi>
        </div>
      </orb-menu>`,
    );
    await page.locator("#trigger").click();
    await page.locator('orb-mi[value="date"]').click();

    await expect(page.locator("orb-menu")).toBeHidden();
    expect(await isChecked(page, "date")).toBe(true);
    expect(await isChecked(page, "name")).toBe(false);
  });

  test("single mode keeps only the first checked option", async ({ page }) => {
    await mount(
      page,
      `<button id="trigger">Sort</button>
      <orb-menu for="trigger" mode="single" label="Sort by">
        <orb-mi value="name" checked>Name</orb-mi>
        <orb-mi value="date" checked>Date</orb-mi>
      </orb-menu>`,
    );
    await page.locator("#trigger").click();
    await expect(page.locator("orb-menu")).toBeVisible();

    expect(await isChecked(page, "name")).toBe(true);
    expect(await isChecked(page, "date")).toBe(false);
  });

  test("single mode ignores the item type and closes on choice", async ({ page }) => {
    await mount(
      page,
      `<button id="trigger">Pick</button>
      <orb-menu for="trigger" mode="single" label="Pick">
        <orb-mi type="checkbox" value="alpha">Alpha</orb-mi>
        <orb-mi value="beta">Beta</orb-mi>
      </orb-menu>`,
    );
    await page.locator("#trigger").click();
    await page.locator('orb-mi[value="alpha"]').click();

    await expect(page.locator("orb-menu")).toBeHidden();
    expect(await isChecked(page, "alpha")).toBe(true);
  });

  test("multi mode toggles options and stays open", async ({ page }) => {
    await mount(
      page,
      `<button id="trigger">Filter</button>
      <orb-menu for="trigger" mode="multi" label="Filter by">
        <orb-mi value="images" checked>Images</orb-mi>
        <orb-mi value="video">Video</orb-mi>
      </orb-menu>`,
    );
    await page.locator("#trigger").click();
    const menu = page.locator("orb-menu");

    await page.locator('orb-mi[value="video"]').click();
    await expect(menu).toBeVisible();
    expect(await isChecked(page, "video")).toBe(true);

    await page.locator('orb-mi[value="images"]').click();
    await expect(menu).toBeVisible();
    expect(await isChecked(page, "images")).toBe(false);
  });

  test("opening a single mode menu from the keyboard focuses the selected option", async ({ page }) => {
    await mount(
      page,
      `<button id="trigger">Sort</button>
      <orb-menu for="trigger" mode="single" label="Sort by">
        <orb-mi value="name">Name</orb-mi>
        <orb-mi value="date" checked>Date</orb-mi>
        <orb-mi value="size">Size</orb-mi>
      </orb-menu>`,
    );
    await page.locator("#trigger").focus();
    await page.keyboard.press("ArrowDown");

    await expect(page.locator('orb-mi[value="date"]')).toBeFocused();
  });

  test("changing mode at runtime updates the roles", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "Roles are read from Chromium's accessibility tree");
    await mount(
      page,
      `<button id="trigger">Edit</button>
      <orb-menu for="trigger" label="Edit menu">
        <orb-mi type="checkbox" checked>Ruler</orb-mi>
      </orb-menu>`,
    );
    await page.locator("#trigger").click();
    const menu = page.locator("orb-menu");

    await menu.evaluate((el: any) => {
      el.mode = "multi";
    });
    await expect.poll(async () => findNode(await accessibilityTree(page), "listbox", "Edit menu")?.props.multiselectable).toBe(true);
    let nodes = await accessibilityTree(page);
    expect(findNode(nodes, "option", "Ruler")?.props.selected).toBe(true);
    expect(findNode(nodes, "button", "Edit")?.props.hasPopup).toBe("listbox");

    await menu.evaluate((el: any) => {
      el.mode = "actions";
    });
    // Roles render on the next Stencil update, so wait for the tree to catch up.
    await expect.poll(async () => !!findNode(await accessibilityTree(page), "menu", "Edit menu")).toBe(true);
    nodes = await accessibilityTree(page);
    expect(findNode(nodes, "menuitemcheckbox", "Ruler")?.props.checked).toBe("true");
    expect(findNode(nodes, "button", "Edit")?.props.hasPopup).toBe("menu");
  });

  test("warns when a listbox menu uses a context menu trigger", async ({ page }) => {
    const warnings: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "warning") warnings.push(msg.text());
    });
    await mount(
      page,
      `<div id="area">Right-click</div>
      <orb-menu for="area" mode="single" show-on="context-menu" label="Pick">
        <orb-mi>Alpha</orb-mi>
      </orb-menu>`,
    );

    await expect.poll(() => warnings.some((text) => text.includes("context-menu"))).toBe(true);
  });
});

const fruitMenu = `<button id="trigger">Fruit</button>
  <orb-menu for="trigger" search search-label="Search fruit">
    <orb-mi value="apple">Apple</orb-mi>
    <orb-mi value="banana">Banana</orb-mi>
    <orb-mi value="cherry">Cherry</orb-mi>
    <orb-mi value="date">Date</orb-mi>
  </orb-menu>`;

const searchInput = (page: Page) => page.locator("orb-menu [part=search-input]");

test.describe("orb-menu search", () => {
  test("search menus are dialogs, with a listbox named by the trigger", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "Roles are read from Chromium's accessibility tree");
    await mount(page, fruitMenu);
    await page.locator("#trigger").click();
    await expect(page.locator("orb-menu")).toBeVisible();

    const nodes = await accessibilityTree(page);
    expect(findNode(nodes, "dialog", "Fruit")).toBeDefined();
    expect(findNode(nodes, "listbox", "Fruit")).toBeDefined();
    expect(nodes.some((node) => node.role.toLowerCase() === "searchbox")).toBe(true);
    expect(findNode(nodes, "button", "Fruit")?.props.hasPopup).toBe("dialog");
    expect(await page.locator("#trigger").getAttribute("aria-controls")).toBeNull();
  });

  test("opening focuses the search field", async ({ page }) => {
    await mount(page, fruitMenu);
    await page.locator("#trigger").click();

    await expect(searchInput(page)).toBeFocused();
  });

  test("typing filters the items, highlights the first match, and Enter chooses it", async ({ page }) => {
    await mount(page, fruitMenu);
    await page.evaluate(() => {
      document.querySelector("orb-menu")!.addEventListener("orbSelect", (e: any) => ((window as any).picked = e.detail.value));
    });
    await page.locator("#trigger").click();
    await searchInput(page).pressSequentially("an");

    await expect(page.locator('orb-mi[value="banana"]')).toBeVisible();
    await expect(page.locator('orb-mi[value="apple"]')).toBeHidden();
    await expect(page.locator("orb-mi[data-active]")).toHaveAttribute("value", "banana");
    await page.keyboard.press("Enter");

    await expect(page.locator("orb-menu")).toBeHidden();
    expect(await page.evaluate(() => (window as any).picked)).toBe("banana");
  });

  test("arrow keys move the highlight through the matches only", async ({ page }) => {
    await mount(page, fruitMenu);
    await page.locator("#trigger").click();
    await searchInput(page).pressSequentially("a");

    await expect(page.locator("orb-mi[data-active]")).toHaveAttribute("value", "apple");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    // Cherry has no "a", so it's skipped and Date is reached.
    await expect(page.locator("orb-mi[data-active]")).toHaveAttribute("value", "date");
  });

  test("hovering highlights an item without moving focus", async ({ page }) => {
    await mount(page, fruitMenu);
    await page.locator("#trigger").click();
    await page.locator('orb-mi[value="cherry"]').hover();

    await expect(page.locator('orb-mi[value="cherry"]')).toHaveAttribute("data-active", "pointer");
    await expect(searchInput(page)).toBeFocused();
  });

  test("a preventDefault on orbSearch turns off the built-in filter", async ({ page }) => {
    await mount(page, fruitMenu);
    await page.evaluate(() => {
      document.querySelector("orb-menu")!.addEventListener("orbSearch", (e) => e.preventDefault());
    });
    await page.locator("#trigger").click();
    await searchInput(page).pressSequentially("zzz");

    await expect(page.locator('orb-mi[value="apple"]')).toBeVisible();
  });

  test("hidden items are not shown or navigated", async ({ page }) => {
    await mount(
      page,
      `<button id="trigger">Fruit</button>
      <orb-menu for="trigger" search>
        <orb-mi value="apple" hidden>Apple</orb-mi>
        <orb-mi value="banana">Banana</orb-mi>
        <orb-mi value="cherry">Cherry</orb-mi>
      </orb-menu>`,
    );
    await page.locator("#trigger").click();

    await expect(page.locator('orb-mi[value="apple"]')).toBeHidden();
    await page.keyboard.press("ArrowDown");
    await expect(page.locator("orb-mi[data-active]")).toHaveAttribute("value", "banana");
  });

  // WebKit doesn't move Tab from the search field into content slotted into the
  // popover, so Tab can't reach the footer there.
  test("Tab moves from the search field to the footer and stays open, then closes", async ({ page, browserName }) => {
    test.skip(browserName === "webkit", "WebKit doesn't Tab into slotted content in a popover");
    await mount(
      page,
      `<button id="trigger">Fruit</button>
      <orb-menu for="trigger" search>
        <orb-mi value="apple">Apple</orb-mi>
        <a href="#" slot="footer" id="default-button">Set as default</a>
      </orb-menu>`,
    );
    await page.locator("#trigger").click();
    await page.keyboard.press("Tab");

    await expect(page.locator("#default-button")).toBeFocused();
    await expect(page.locator("orb-menu")).toBeVisible();

    await page.keyboard.press("Tab");
    await expect(page.locator("orb-menu")).toBeHidden();
  });

  test("a filter menu in the search row opens below its button, and choosing in it keeps the menu open", async ({ page }) => {
    await mount(
      page,
      `<button id="trigger">Fruit</button>
      <orb-menu id="picker" for="trigger" search search-label="Search fruit">
        <button id="filter-button" slot="search-end">All</button>
        <orb-menu id="filter" slot="search-end" for="filter-button" mode="single" label="Kind">
          <orb-mi value="all" checked>All fruit</orb-mi>
          <orb-mi value="citrus">Citrus</orb-mi>
        </orb-menu>
        <orb-mi value="apple">Apple</orb-mi>
        <orb-mi value="lime">Lime</orb-mi>
      </orb-menu>`,
    );
    await page.locator("#trigger").click();
    await page.locator("#filter-button").click();

    await expect(page.locator("#filter")).toBeVisible();
    await page.locator('#filter orb-mi[value="citrus"]').click();

    await expect(page.locator("#filter")).toBeHidden();
    await expect(page.locator("#picker")).toBeVisible();
  });

  test("Escape closes only the filter menu", async ({ page }) => {
    await mount(
      page,
      `<button id="trigger">Fruit</button>
      <orb-menu id="picker" for="trigger" search>
        <button id="filter-button" slot="search-end">All</button>
        <orb-menu id="filter" slot="search-end" for="filter-button" mode="single" label="Kind">
          <orb-mi value="all">All fruit</orb-mi>
        </orb-menu>
        <orb-mi value="apple">Apple</orb-mi>
      </orb-menu>`,
    );
    await page.locator("#trigger").click();
    await page.locator("#filter-button").click();
    await expect(page.locator("#filter")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.locator("#filter")).toBeHidden();
    await expect(page.locator("#picker")).toBeVisible();
  });
});

test.describe("orb-menu animation", () => {
  test("reopening while the menu fades out keeps it open", async ({ page }) => {
    await mount(page, `<button id="trigger">Edit</button><orb-menu for="trigger"><orb-mi>Cut</orb-mi></orb-menu>`);
    await page.locator("#trigger").click();
    await expect(page.locator("orb-menu")).toBeVisible();

    // The second click lands while the fade-out started by the first is still running.
    await page.locator("#trigger").click();
    await page.locator("#trigger").click();
    await page.waitForTimeout(400);

    await expect(page.locator("orb-menu")).toBeVisible();
  });
});

test.describe("orb-menu search on a small touch screen", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test("the menu fills the screen, with the search field above the items", async ({ page }) => {
    await mount(page, fruitMenu);
    await page.locator("#trigger").tap();

    await expect(page.locator("orb-menu")).toBeVisible();
    const menu = await page.locator("orb-menu").boundingBox();
    expect(menu!.width).toBeCloseTo(390, 0);
    expect(menu!.height).toBeCloseTo(844, 0);
    const list = await page.locator("orb-menu [part=list]").boundingBox();
    const input = await searchInput(page).boundingBox();
    expect(input!.y).toBeLessThan(list!.y);
    expect(input!.y + input!.height).toBeLessThanOrEqual(844);
    // The keyboard would cover the list, so the field waits for a tap.
    await expect(searchInput(page)).not.toBeFocused();
  });

  test("the close button closes a full screen menu", async ({ page }) => {
    await mount(page, fruitMenu);
    await page.locator("#trigger").tap();
    await page.locator("orb-menu [part=close-button]").tap();

    await expect(page.locator("orb-menu")).toBeHidden();
  });

  test("items are large enough to tap", async ({ page }) => {
    await mount(page, fruitMenu);
    await page.locator("#trigger").tap();

    const item = await page.locator('orb-mi[value="apple"]').boundingBox();
    expect(item!.height).toBeGreaterThanOrEqual(48);
  });
});
