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
    let nodes = await accessibilityTree(page);
    expect(findNode(nodes, "listbox", "Edit menu")?.props.multiselectable).toBe(true);
    expect(findNode(nodes, "option", "Ruler")?.props.selected).toBe(true);
    expect(findNode(nodes, "button", "Edit")?.props.hasPopup).toBe("listbox");

    await menu.evaluate((el: any) => {
      el.mode = "actions";
    });
    nodes = await accessibilityTree(page);
    expect(findNode(nodes, "menu", "Edit menu")).toBeDefined();
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
