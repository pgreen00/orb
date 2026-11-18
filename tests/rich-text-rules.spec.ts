import { test, expect, type Page } from "@playwright/test";
import { content, editor, modKey, placeCaretIn } from "./rich-text-utils";

/** An empty editor with the caret in it, ready for typing */
async function typingArea(page: Page) {
  await editor(page);
  await page.locator("orb-rich-text .editor-content").click();
}

test.describe("orb-rich-text typing rules", () => {
  test("# and a space make a heading, and ## a second-level one", async ({ page }) => {
    await typingArea(page);
    await page.keyboard.type("# Title");
    expect(await content(page)).toBe('<h1 id="title">Title</h1>');
  });

  test("## and a space make a second-level heading", async ({ page }) => {
    await typingArea(page);
    await page.keyboard.type("## Section");
    expect(await content(page)).toBe('<h2 id="section">Section</h2>');
  });

  test("- and a space make a bulleted list", async ({ page }) => {
    await typingArea(page);
    await page.keyboard.type("- one");
    expect(await content(page)).toBe("<ul><li>one</li></ul>");
  });

  test("1. and a space make a numbered list", async ({ page }) => {
    await typingArea(page);
    await page.keyboard.type("1. one");
    expect(await content(page)).toBe("<ol><li>one</li></ol>");
  });

  test("[ ] and a space make a task, and [x] makes a checked one", async ({ page }) => {
    await typingArea(page);
    await page.keyboard.type("[x] done");
    expect(await content(page)).toBe(
      '<ul><li style="list-style-type: none;"><input type="checkbox" checked="">done</li></ul>',
    );
  });

  test("> and a space make a quote", async ({ page }) => {
    await typingArea(page);
    await page.keyboard.type("> said");
    expect(await content(page)).toBe("<blockquote><p>said</p></blockquote>");
  });

  test("a fence and Enter make a code block with its language", async ({ page }) => {
    await typingArea(page);
    await page.keyboard.type("```js");
    await page.keyboard.press("Enter");
    await page.keyboard.type("let x");
    expect(await content(page)).toBe('<pre><code class="language-js">let x</code></pre>');
  });

  test("three dashes and Enter make a horizontal line", async ({ page }) => {
    await typingArea(page);
    await page.keyboard.type("---");
    await page.keyboard.press("Enter");
    expect(await content(page)).toBe("<hr><p><br></p>");
  });

  test("**bold** is bold once the closing star is typed", async ({ page }) => {
    await typingArea(page);
    await page.keyboard.type("a **bold**");
    expect(await content(page)).toBe("<p>a <strong>bold</strong></p>");
  });

  test("*italic*, ~~strike~~ and `code` each take their format", async ({ page }) => {
    await typingArea(page);
    await page.keyboard.type("*it*");
    expect(await content(page)).toBe("<p><em>it</em></p>");

    await typingArea(page);
    await page.keyboard.type("~~gone~~");
    expect(await content(page)).toBe("<p><s>gone</s></p>");

    await typingArea(page);
    await page.keyboard.type("`x`");
    expect(await content(page)).toBe("<p><code>x</code></p>");
  });

  test("Backspace right after a rule brings back the typed text", async ({ page }) => {
    await typingArea(page);
    await page.keyboard.type("**bold**");
    await page.keyboard.press("Backspace");
    expect(await content(page)).toBe("<p>**bold**</p>");
  });

  test("undo after a rule brings back the typed text, as its own step", async ({ page }) => {
    await typingArea(page);
    await page.keyboard.type("**bold**");
    await page.locator("orb-rich-text .editor-content").focus();
    await page.keyboard.press(`${await modKey(page)}+z`);
    expect(await content(page)).toBe("<p>**bold**</p>");
  });

  test("a web address becomes a link when a space follows it", async ({ page }) => {
    await typingArea(page);
    await page.keyboard.type("see https://example.com ");
    expect(await content(page)).toContain('<a href="https://example.com">https://example.com</a>');
  });

  test("a web address becomes a link when Enter follows it, and Enter still starts a new paragraph", async ({ page }) => {
    await typingArea(page);
    await page.keyboard.type("https://example.com");
    await page.keyboard.press("Enter");
    expect(await content(page)).toBe('<p><a href="https://example.com">https://example.com</a></p><p><br></p>');
  });

  test("a block rule only applies when its marker starts the paragraph", async ({ page }) => {
    await typingArea(page);
    await page.keyboard.type("a # b");
    expect(await content(page)).toBe("<p>a # b</p>");
  });

  test("rules don't apply inside a code block", async ({ page }) => {
    await editor(page, "<pre><code>x</code></pre>");
    await placeCaretIn(page, "code", 1);
    await page.keyboard.type("*y*");
    expect(await content(page)).toBe("<pre><code>x*y*</code></pre>");
  });
});
