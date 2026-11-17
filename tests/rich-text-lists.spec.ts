import { test, expect, type Page } from "@playwright/test";
import { choose, content, editor, modKey, placeCaret, selectText } from "./rich-text-utils";

const toolbarButton = (page: Page, id: string) => page.locator(`orb-rich-text #action-${id}`);

test.describe("orb-rich-text lists and code", () => {
  test("nested lists come back from getContent as they were set", async ({ page }) => {
    const html = "<ul><li>One<ol><li>Child</li></ol></li><li>Two</li></ul>";
    await editor(page, html);
    expect(await content(page)).toBe(html);
  });

  test("clicking a task checkbox checks it, and undo unchecks it", async ({ page }) => {
    await editor(page, '<ul><li><input type="checkbox">Task</li></ul>');
    await page.locator("orb-rich-text .editor-content input[type=checkbox]").click();
    await expect.poll(() => content(page)).toContain("checked");

    await toolbarButton(page, "undo").click();
    await expect.poll(() => content(page)).not.toContain("checked");
  });

  test("the task list button makes the selected paragraph a task", async ({ page }) => {
    await editor(page, "<p>One</p>");
    await selectText(page, "One");
    await toolbarButton(page, "taskList").click();
    const saved = await content(page);
    expect(saved).toContain('<input type="checkbox">One');
    expect(saved).toContain("list-style-type: none");
  });

  test("the task list button removes the checkboxes when every item is a task", async ({ page }) => {
    await editor(page, '<ul><li style="list-style-type: none"><input type="checkbox">One</li></ul>');
    await selectText(page, "One");
    await toolbarButton(page, "taskList").click();
    expect(await content(page)).toBe("<ul><li>One</li></ul>");
  });

  test("the list style select sets how the list's items are marked", async ({ page }) => {
    await editor(page, "<ol><li>One</li></ol>");
    await selectText(page, "One");
    await choose(page, "listStyle", "A, B, C");
    expect(await content(page)).toBe('<ol style="list-style-type: upper-alpha"><li>One</li></ol>');
  });

  test("the code language select appears only in a code block, and sets the language", async ({ page }) => {
    await editor(page, "<p>Text</p><pre><code>let x</code></pre>", 'toolbar="codeLanguage"');
    await placeCaret(page, "Text", 1);
    await expect(toolbarButton(page, "codeLanguage")).toHaveCount(0);

    await placeCaret(page, "let x", 1);
    await expect(toolbarButton(page, "codeLanguage")).toHaveCount(1);
    await choose(page, "codeLanguage", "typescript");
    expect(await content(page)).toContain('<code class="language-typescript">');
  });

  test("code blocks are colored with the CSS Custom Highlight API", async ({ page }) => {
    await editor(page, '<pre><code class="language-javascript">const x = 1</code></pre>');
    const supported = await page.evaluate(() => "highlights" in CSS);
    test.skip(!supported, "this browser has no CSS Custom Highlight API");
    await expect.poll(() => page.evaluate(() => CSS.highlights.has("orb-code-keyword"))).toBe(true);
  });

  test("the bulleted list shortcut makes the paragraph a bulleted list", async ({ page }) => {
    await editor(page, "<p>Item</p>");
    await selectText(page, "Item");
    await page.locator("orb-rich-text .editor-content").focus();
    const mod = await modKey(page);
    await page.keyboard.press(`${mod}+Shift+8`);
    expect(await content(page)).toBe("<ul><li>Item</li></ul>");
  });

  test("a task checkbox keeps its state through getContent, and its item drops the bullet", async ({ page }) => {
    await editor(page, '<ul><li><input type="checkbox" checked>Done</li></ul>');
    expect(await content(page)).toBe('<ul><li style="list-style-type: none"><input type="checkbox" checked="">Done</li></ul>');
  });
});
