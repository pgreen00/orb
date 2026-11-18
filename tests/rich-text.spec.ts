import { test, expect, type Page } from "@playwright/test";
import { mount } from "./utils";
import { choose, content, editor, selectText, text } from "./rich-text-utils";

const toolbarButton = (page: Page, id: string) => page.locator(`orb-rich-text #action-${id}`);

/** The editor's content area, where keys go */
const contentArea = (page: Page) =>
  page.locator("orb-rich-text").evaluate((e: any) => e.shadowRoot.querySelector(".editor-content").focus());

/**
 * The editor's shortcut key, as Playwright should press it. The editor picks
 * Command on Apple devices and Control elsewhere, from the user agent, so the
 * test presses the same modifier it does.
 */
const shortcut = (page: Page, key: string) =>
  page.evaluate((k) => (/Mac|iPhone|iPad/.test(navigator.userAgent) ? "Meta+" : "Control+") + k, key);

test.describe("orb-rich-text", () => {
  test("sanitizes content set from code", async ({ page }) => {
    await editor(page, '<p onclick="x()">Hi <script>alert(1)</script><img src="javascript:bad"></p>');
    expect(await content(page)).toBe("<p>Hi </p>");
  });

  test("keeps the schema's elements and drops unknown ones", async ({ page }) => {
    await editor(page, "<section><h1>Title</h1><b>bold</b><font>x</font></section>");
    // <section> and <font> are unwrapped. The loose text after the heading becomes a paragraph.
    expect(await content(page)).toBe('<h1 id="title">Title</h1><p><strong>bold</strong>x</p>');
  });

  test("saves the same HTML however nested formats were written", async ({ page }) => {
    await editor(page, "<p><em><strong>x</strong></em></p><p><strong><em>x</em></strong></p>");
    expect(await content(page)).toBe("<p><strong><em>x</em></strong></p><p><strong><em>x</em></strong></p>");
  });

  test("keeps text-align and drops other styles on blocks", async ({ page }) => {
    await editor(page, '<p style="text-align: center; color: red">Centered</p>');
    expect(await content(page)).toBe('<p style="text-align: center">Centered</p>');
  });

  test("an editor with no content has empty text", async ({ page }) => {
    await editor(page, "");
    expect(await text(page)).toBe("");
  });

  test("the toolbar is built from the command list", async ({ page }) => {
    await editor(page);
    await expect(toolbarButton(page, "bold")).toHaveCount(1);
    await expect(toolbarButton(page, "blockType")).toHaveCount(1);
    await expect(toolbarButton(page, "undo")).toHaveCount(1);
  });

  test("Bold applies to a selection, and the toolbar shows it pressed", async ({ page }) => {
    await editor(page, "<p>Hello world</p>");
    await selectText(page, "world");
    await toolbarButton(page, "bold").click();
    expect(await content(page)).toBe("<p>Hello <strong>world</strong></p>");
    await expect(toolbarButton(page, "bold")).toHaveAttribute("aria-pressed", "true");
  });

  test("the bold shortcut toggles bold on the selection", async ({ page }) => {
    await editor(page, "<p>Hello</p>");
    await selectText(page, "Hello");
    await contentArea(page);
    await page.keyboard.press(await shortcut(page, "b"));
    expect(await content(page)).toBe("<p><strong>Hello</strong></p>");
  });

  test("undo and redo step back through a change", async ({ page }) => {
    await editor(page, "<p>one</p>");
    await selectText(page, "one");
    await toolbarButton(page, "bold").click();
    expect(await content(page)).toBe("<p><strong>one</strong></p>");
    await toolbarButton(page, "undo").click();
    expect(await content(page)).toBe("<p>one</p>");
    await toolbarButton(page, "redo").click();
    expect(await content(page)).toBe("<p><strong>one</strong></p>");
  });

  test("setContent starts a fresh undo history", async ({ page }) => {
    const el = await editor(page, "<p>one</p>");
    await selectText(page, "one");
    await toolbarButton(page, "bold").click();
    await el.evaluate((e: any) => e.setContent("<p>two</p>"));
    await toolbarButton(page, "undo").click();
    expect(await content(page)).toBe("<p>two</p>");
  });

  test("the block type select makes a heading, and Paragraph turns it back", async ({ page }) => {
    await editor(page, "<p>Title</p>");
    await selectText(page, "Title");
    await choose(page, "blockType", "Heading 1");
    expect(await content(page)).toBe('<h1 id="title">Title</h1>');
    await selectText(page, "Title");
    await choose(page, "blockType", "Paragraph");
    expect(await content(page)).toBe("<p>Title</p>");
  });

  test("the spellcheck prop is set on the content area", async ({ page }) => {
    await editor(page, "", "spellcheck='false'");
    const spellcheck = await page
      .locator("orb-rich-text")
      .evaluate((e: any) => e.shadowRoot.querySelector(".editor-content").spellcheck);
    expect(spellcheck).toBe(false);
  });

  test("the toolbar has a single Tab stop, and arrow keys move between controls", async ({ page }) => {
    await editor(page);
    await toolbarButton(page, "undo").focus();
    await page.keyboard.press("ArrowRight");
    await expect(toolbarButton(page, "redo")).toBeFocused();
  });

  test("a narrow toolbar moves the groups that don't fit into More", async ({ page }) => {
    await mount(page, '<div style="width: 220px"><orb-rich-text></orb-rich-text></div>');
    await expect(page.locator("orb-rich-text #action-more")).toHaveCount(1);
  });

  test("the link shortcut opens the link popover and adds a link to the selection", async ({ page }) => {
    await editor(page, "<p>Site</p>");
    await selectText(page, "Site");
    await contentArea(page);
    await page.keyboard.press(await shortcut(page, "k"));
    const field = page.locator("orb-rich-text input[type=url]");
    await expect(field).toBeVisible();
    await field.fill("https://example.com");
    await field.press("Enter");
    expect(await content(page)).toBe('<p><a href="https://example.com">Site</a></p>');
  });

  test("the link popover rejects unsafe URLs", async ({ page }) => {
    await editor(page, "<p>Site</p>");
    await selectText(page, "Site");
    await contentArea(page);
    await page.keyboard.press(await shortcut(page, "k"));
    const field = page.locator("orb-rich-text input[type=url]");
    await expect(field).toBeVisible();
    await field.fill("javascript:alert(1)");
    await field.press("Enter");
    expect(await content(page)).toBe("<p>Site</p>");
  });
});
