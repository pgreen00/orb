import { test, expect, type Page } from "@playwright/test";
import { choose, content, editor, modKey, placeCaret, selectText } from "./rich-text-utils";

const toolbarButton = (page: Page, id: string) => page.locator(`orb-rich-text #action-${id}`);

test.describe("orb-rich-text blocks", () => {
  test("the block type select sets a heading, and Paragraph turns it back", async ({ page }) => {
    await editor(page, "<p>Title</p>");
    await selectText(page, "Title");
    await choose(page, "blockType", "Heading 3");
    expect(await content(page)).toBe('<h3 id="title">Title</h3>');

    await selectText(page, "Title");
    await choose(page, "blockType", "Paragraph");
    expect(await content(page)).toBe("<p>Title</p>");
  });

  test("the block type select has an icon, and its name says the current type", async ({ page }) => {
    await editor(page, "<h2>Title</h2>");
    await selectText(page, "Title");
    await expect(toolbarButton(page, "blockType")).toHaveAttribute("aria-label", "Text style: Heading 2");
    await expect(toolbarButton(page, "blockType").locator("svg").first()).toBeVisible();
  });

  test("the text style select lists paragraph and headings only", async ({ page }) => {
    await editor(page, "<p>Title</p>");
    await selectText(page, "Title");
    await toolbarButton(page, "blockType").click();
    await expect(page.locator("orb-rich-text orb-mi").filter({ visible: true })).toHaveText([
      "Paragraph",
      "Heading 1",
      "Heading 2",
      "Heading 3",
      "Heading 4",
      "Heading 5",
      "Heading 6",
    ]);
  });

  test("the quote button wraps the selected paragraph in a blockquote, and clicking it again lifts it out", async ({ page }) => {
    await editor(page, "<p>One</p><p>Two</p>");
    await selectText(page, "One");
    await toolbarButton(page, "quote").click();
    expect(await content(page)).toBe("<blockquote><p>One</p></blockquote><p>Two</p>");
    await expect(toolbarButton(page, "quote")).toHaveAttribute("aria-pressed", "true");

    await selectText(page, "One");
    await toolbarButton(page, "quote").click();
    expect(await content(page)).toBe("<p>One</p><p>Two</p>");
    await expect(toolbarButton(page, "quote")).toHaveAttribute("aria-pressed", "false");
  });

  test("the code button makes a code block with its text and no formatting, and clicking it again makes a paragraph", async ({ page }) => {
    await editor(page, "<p>let <strong>x</strong></p>");
    await selectText(page, "let");
    await toolbarButton(page, "code").click();
    expect(await content(page)).toBe("<pre><code>let x</code></pre>");
    await expect(toolbarButton(page, "code")).toHaveAttribute("aria-pressed", "true");

    await placeCaret(page, "let", 1);
    await toolbarButton(page, "code").click();
    expect(await content(page)).toBe("<p>let x</p>");
  });

  test("a horizontal line splits the paragraph, with an editable paragraph after it", async ({ page }) => {
    // A toolbar of its own, since the default one overflows into More at this width
    await editor(page, "<p>One</p>", 'toolbar="separator"');
    await page.locator("orb-rich-text .editor-content").click();
    await page.keyboard.press("End");
    await toolbarButton(page, "separator").click();
    expect(await content(page)).toBe("<p>One</p><hr><p><br></p>");
  });

  test("indent steps a paragraph in, and outdent steps it back", async ({ page }) => {
    await editor(page, "<p>Text</p>");
    await selectText(page, "Text");
    await toolbarButton(page, "indent").click();
    expect(await content(page)).toBe('<p style="margin-inline-start: 2em">Text</p>');
    await selectText(page, "Text");
    await toolbarButton(page, "indent").click();
    expect(await content(page)).toBe('<p style="margin-inline-start: 4em">Text</p>');
    await selectText(page, "Text");
    await toolbarButton(page, "outdent").click();
    expect(await content(page)).toBe('<p style="margin-inline-start: 2em">Text</p>');
  });

  test("the line height select sets the spacing of the block", async ({ page }) => {
    await editor(page, "<p>Text</p>");
    await selectText(page, "Text");
    await choose(page, "lineHeight", "1.5");
    expect(await content(page)).toBe('<p style="line-height: 1.5">Text</p>');

    await selectText(page, "Text");
    await choose(page, "lineHeight", "Default");
    expect(await content(page)).toBe("<p>Text</p>");
  });

  test("the heading shortcut sets Heading 3, and pressing it again returns to a paragraph", async ({ page }) => {
    await editor(page, "<p>Title</p>");
    await selectText(page, "Title");
    await page.locator("orb-rich-text .editor-content").focus();
    const mod = await modKey(page);
    await page.keyboard.press(`${mod}+Alt+3`);
    expect(await content(page)).toBe('<h3 id="title">Title</h3>');

    await page.keyboard.press(`${mod}+Alt+3`);
    expect(await content(page)).toBe("<p>Title</p>");
  });

  test("a heading in a quote is still a heading, and the quote stays", async ({ page }) => {
    await editor(page, "<blockquote><p>Quote</p></blockquote>");
    await selectText(page, "Quote");
    await choose(page, "blockType", "Heading 4");
    expect(await content(page)).toBe('<blockquote><h4 id="quote">Quote</h4></blockquote>');
  });
});
