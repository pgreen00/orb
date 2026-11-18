import { test, expect, type Page } from "@playwright/test";
import { choose, content, editor, modKey, placeCaret } from "./rich-text-utils";

/** Types text into the editor, after a click at its end so the caret is in it */
const typeInEditor = async (page: Page, text: string) => {
  await page.locator("orb-rich-text .editor-content").click();
  await page.keyboard.press("End");
  await page.keyboard.type(text);
};

/** The trigger menu's visible items, by label */
const menuItem = (page: Page, label: string) =>
  page.locator("orb-rich-text orb-mi").filter({ hasText: label }).filter({ visible: true });

const MENTIONS = `(query) => [{ id: "ada", label: "Ada Lovelace" }, { id: "alan", label: "Alan Turing" }].filter((p) => p.label.toLowerCase().includes(query.toLowerCase()))`;

test.describe("orb-rich-text inline objects", () => {
  test("/ opens the commands, and Enter runs the one chosen", async ({ page }) => {
    await editor(page, "<p><br></p>");
    await typeInEditor(page, "/quo");
    await expect(menuItem(page, "Quote")).toHaveCount(1);
    await page.keyboard.press("Enter");
    expect(await content(page)).toContain("<blockquote>");
    expect(await content(page)).not.toContain("/quo");
  });

  test("/ only opens at the start of a block", async ({ page }) => {
    await editor(page, "<p>Text</p>");
    await typeInEditor(page, " /quo");
    await expect(page.locator("orb-rich-text orb-mi:visible")).toHaveCount(0);
  });

  test("Escape closes the menu and leaves the typed text", async ({ page }) => {
    await editor(page, "<p><br></p>");
    await typeInEditor(page, "/");
    await expect(menuItem(page, "Quote")).toHaveCount(1);
    await page.keyboard.press("Escape");
    await expect(page.locator("orb-rich-text orb-mi:visible")).toHaveCount(0);
    expect(await content(page)).toBe("<p>/</p>");
  });

  test("@ opens mentions from the mentions lookup, and inserts a mention", async ({ page }) => {
    await editor(page, "<p>Hi </p>");
    await page.locator("orb-rich-text").evaluate((el: any, fn) => (el.mentions = eval(fn)), MENTIONS);
    await typeInEditor(page, "@ada");
    await expect(menuItem(page, "Ada Lovelace")).toHaveCount(1);
    await page.locator("orb-rich-text").evaluate((el) =>
      el.addEventListener("orbMention", (ev: any) => ((window as any).mentioned = ev.detail.id), { once: true }),
    );
    await page.keyboard.press("Enter");
    await expect.poll(() => page.evaluate(() => (window as any).mentioned)).toBe("ada");
    expect(await content(page)).toBe('<p>Hi <span data-mention="ada">@Ada Lovelace</span></p>');
  });

  test("# offers to create a tag from the text typed", async ({ page }) => {
    await editor(page, "<p><br></p>");
    await page.locator("orb-rich-text").evaluate((el: any) => (el.tags = () => []));
    await typeInEditor(page, "#Design");
    await expect(menuItem(page, "Create #Design")).toHaveCount(1);
    await page.keyboard.press("Enter");
    expect(await content(page)).toBe('<p><span data-tag="design">#Design</span></p>');
  });

  test("# and {{ on their own open their lists, before any letters are typed", async ({ page }) => {
    await editor(page, "<p><br></p>");
    await page.locator("orb-rich-text").evaluate((el: any) => {
      el.tags = () => [{ id: "design", label: "design" }];
      el.params = [{ key: "customer.name", label: "Customer name" }];
    });
    await typeInEditor(page, "#");
    await expect(menuItem(page, "design")).toHaveCount(1);
    await page.keyboard.press("Backspace");
    await typeInEditor(page, " {{");
    await expect(menuItem(page, "Customer name")).toHaveCount(1);
  });

  test("Escape closes a trigger's menu, and it opens again when the trigger is typed again", async ({ page }) => {
    await editor(page, "<p><br></p>");
    await page.locator("orb-rich-text").evaluate((el: any) => (el.tags = () => [{ id: "design", label: "design" }]));
    await typeInEditor(page, "#");
    await expect(menuItem(page, "design")).toHaveCount(1);
    await page.keyboard.press("Escape");
    await page.keyboard.press("Backspace");
    await page.keyboard.type("#");
    await expect(menuItem(page, "design")).toHaveCount(1);
  });

  test("choosing a tag closes the menu, and the caret moves on past the tag", async ({ page }) => {
    await editor(page, "<p>Hi </p>");
    await page.locator("orb-rich-text").evaluate((el: any) => (el.tags = () => [{ id: "research", label: "research" }]));
    await typeInEditor(page, "#res");
    await expect(menuItem(page, "research")).toHaveCount(1);
    await page.keyboard.press("Enter");
    await expect(page.locator("orb-rich-text orb-mi:visible")).toHaveCount(0);
    expect(await content(page)).toContain('<span data-tag="research">#research</span>');
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.type("x");
    expect(await content(page)).toBe('<p>Hix <span data-tag="research">#research</span></p>');
  });

  test("a slash command leaves the caret on its block, not in an empty text node", async ({ page }) => {
    await editor(page, "<p><br></p>");
    await typeInEditor(page, "/para");
    await page.keyboard.press("Enter");
    const caret = await page.locator("orb-rich-text").evaluate((host: any) => {
      const [range] = (document.getSelection() as any).getComposedRanges({ shadowRoots: [host.shadowRoot] });
      return range.startContainer.nodeName;
    });
    expect(caret).toBe("P");
  });

  test("deleting a selection of whole blocks leaves an empty paragraph with the caret in it", async ({ page }) => {
    await editor(page, "<p>One</p><p>Two</p><p>Three</p>");
    await page.locator("orb-rich-text .editor-content").click();
    await page.locator("orb-rich-text").evaluate((host: any) => {
      const root = host.shadowRoot.querySelector(".editor-content");
      const last = root.lastElementChild.firstChild;
      document.getSelection()!.setBaseAndExtent(root.firstElementChild.firstChild, 0, last, last.length);
    });
    await page.keyboard.press("Backspace");
    const caret = await page.locator("orb-rich-text").evaluate((host: any) => {
      const [range] = (document.getSelection() as any).getComposedRanges({ shadowRoots: [host.shadowRoot] });
      return `${range.startContainer.nodeName}@${range.startOffset}`;
    });
    expect(await page.locator("orb-rich-text").evaluate((host: any) => host.shadowRoot.querySelector(".editor-content").innerHTML)).toBe("<p><br></p>");
    expect(caret).toBe("P@0");
  });

  test(": inserts an emoji for a shortcode, once two letters are typed", async ({ page }) => {
    await editor(page, "<p><br></p>");
    await typeInEditor(page, ":g");
    await page.waitForTimeout(300);
    await expect(page.locator("orb-rich-text orb-mi:visible")).toHaveCount(0);
    await page.keyboard.type("ri");
    await expect(menuItem(page, ":grinning:")).toHaveCount(1);
    await page.keyboard.press("Enter");
    expect(await content(page)).toBe("<p>😀</p>");
  });

  test("the time 10:30 doesn't open the emoji menu", async ({ page }) => {
    await editor(page, "<p>10</p>");
    await typeInEditor(page, ":30");
    await page.waitForTimeout(300);
    await expect(page.locator("orb-rich-text orb-mi:visible")).toHaveCount(0);
  });

  test("{{ offers the placeholders, and inserts the one chosen", async ({ page }) => {
    await editor(page, "<p>Dear </p>");
    await page.locator("orb-rich-text").evaluate((el: any) => (el.params = [{ key: "customer.name", label: "Customer name" }]));
    await typeInEditor(page, "{{cust");
    await expect(menuItem(page, "Customer name")).toHaveCount(1);
    await page.keyboard.press("Enter");
    expect(await content(page)).toBe('<p>Dear <span data-param="customer.name">Customer name</span></p>');
  });

  test("getParams lists the placeholders, and fill replaces them with values", async ({ page }) => {
    await editor(page, '<p>Dear <span data-param="customer.name">Customer name</span>, <span data-param="date">Date</span></p>');
    await page.locator("orb-rich-text").evaluate((el: any) => (el.params = [{ key: "customer.name", label: "Customer name" }, { key: "date", label: "Date" }]));
    expect(await page.locator("orb-rich-text").evaluate((el: any) => el.getParams())).toEqual(["customer.name", "date"]);
    expect(await page.locator("orb-rich-text").evaluate((el: any) => el.fill({ "customer.name": "Ada <b>" }))).toBe(
      "<p>Dear Ada &lt;b&gt;, <span data-param=\"date\">Date</span></p>",
    );
  });

  test("a placeholder with no entry in params is marked, and saved without the mark", async ({ page }) => {
    await editor(page, '<p><span data-param="old">Old</span></p>', 'toolbar="param"');
    await expect(page.locator("orb-rich-text [data-unknown]")).toHaveCount(1);
    expect(await content(page)).toBe('<p><span data-param="old">Old</span></p>');
  });

  test("the placeholder control inserts a placeholder at the caret", async ({ page }) => {
    await editor(page, "<p>Dear </p>", 'toolbar="param"');
    await page.locator("orb-rich-text").evaluate((el: any) => (el.params = [{ key: "customer.name", label: "Customer name" }]));
    await placeCaret(page, "Dear ", 5);
    await choose(page, "param", "Customer name");
    expect(await content(page)).toContain('<span data-param="customer.name">Customer name</span>');
  });

  test("a mention is one piece, so Backspace removes all of it", async ({ page }) => {
    await editor(page, '<p>Hi <span data-mention="ada">@Ada Lovelace</span>!</p>');
    await placeCaret(page, "!", 0);
    await page.keyboard.press("Backspace");
    expect(await content(page)).toBe("<p>Hi !</p>");
  });

  test("applyTemplate replaces the document as one undo step, and undo restores it", async ({ page }) => {
    await editor(page, "<p>Draft</p>");
    await page.locator("orb-rich-text").evaluate((el: any) => (el.templates = [{ id: "letter", label: "Letter", html: "<h1>Dear <span data-param=\"customer.name\">Name</span></h1><p>Thanks.</p>" }]));
    await page.locator("orb-rich-text").evaluate((el: any) => el.applyTemplate("letter"));
    expect(await content(page)).toBe('<h1 id="dear-name">Dear <span data-param="customer.name">Name</span></h1><p>Thanks.</p>');
    await page.locator("orb-rich-text .editor-content").focus();
    await page.keyboard.press(`${await modKey(page)}+z`);
    expect(await content(page)).toBe("<p>Draft</p>");
  });

  test("the templates picker lists the templates, and using one replaces the document", async ({ page }) => {
    await editor(page, "<p>Draft</p>", 'toolbar="templates"');
    await page.locator("orb-rich-text").evaluate((el: any) => (el.templates = [{ id: "memo", label: "Memo", description: "A short memo", html: "<p>Memo body</p>" }]));
    await page.locator("orb-rich-text #action-templates").click();
    const overlay = page.locator("orb-rich-text orb-overlay").filter({ hasText: "New from template" });
    await expect(overlay).toHaveJSProperty("open", true);
    await expect(overlay.getByText("Memo", { exact: true })).toBeVisible();
    await overlay.locator("orb-button", { hasText: "Use template" }).click();
    await expect.poll(() => content(page)).toBe("<p>Memo body</p>");
  });
});
