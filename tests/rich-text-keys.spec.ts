import { test, expect, type Page } from "@playwright/test";
import { content, editor, modKey, placeCaret, placeCaretIn } from "./rich-text-utils";

const IMAGE = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

const focusEditor = (page: Page) => page.locator("orb-rich-text .editor-content").focus();

test.describe("orb-rich-text keyboard", () => {
  test("Enter splits a paragraph at the caret, and keeps the formats", async ({ page }) => {
    await editor(page, "<p>Hello <strong>world</strong></p>");
    await placeCaret(page, "Hello ", 6);
    await page.keyboard.press("Enter");
    expect(await content(page)).toBe("<p>Hello </p><p><strong>world</strong></p>");
  });

  test("Enter at the end of bold text keeps the bold on the new line", async ({ page }) => {
    await editor(page, "<p><strong>Bold</strong></p>");
    await placeCaret(page, "Bold", 4);
    await page.keyboard.press("Enter");
    await page.keyboard.type("x");
    expect(await content(page)).toBe("<p><strong>Bold</strong></p><p><strong>x</strong></p>");
  });

  test("a new line after plain text is saved without a stray line break", async ({ page }) => {
    await editor(page, "<p>One</p>");
    await placeCaret(page, "One", 3);
    await page.keyboard.press("Enter");
    await page.keyboard.type("x");
    expect(await content(page)).toBe("<p>One</p><p>x</p>");
  });

  // The live editor, not the saved HTML, is what shows the extra line.
  const liveHtml = (page: Page) =>
    page.locator("orb-rich-text").evaluate((e: any) => e.shadowRoot.querySelector(".editor-content").innerHTML);

  test("Enter after clicking below the text adds one new line", async ({ page }) => {
    await editor(page, "<p>Start <strong>here</strong>.</p>");
    await page.locator("orb-rich-text .editor-content").click({ position: { x: 200, y: 150 } });
    await page.keyboard.press("Enter");
    expect(await liveHtml(page)).toBe("<p>Start <strong>here</strong>.</p><p><br></p>");
  });

  test("Enter on an empty new line adds one line below it, not above", async ({ page }) => {
    await editor(page, "<p>Start <strong>here</strong>.</p>");
    await page.locator("orb-rich-text .editor-content").click({ position: { x: 200, y: 150 } });
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");
    await page.keyboard.type("x");
    expect(await liveHtml(page)).toBe("<p>Start <strong>here</strong>.</p><p><br></p><p>x</p>");
  });

  test("Enter that a browser reports as a line break still starts a new line", async ({ page }) => {
    await editor(page, "<p>Start <strong>here</strong>.</p>");
    await page.locator("orb-rich-text .editor-content").click({ position: { x: 200, y: 150 } });
    await page.keyboard.press("Enter");
    // Safari sends this for Enter on some lines. It must not add a break inside the paragraph.
    await page.locator("orb-rich-text").evaluate((host: any) => {
      const root = host.shadowRoot.querySelector(".editor-content");
      root.focus();
      root.dispatchEvent(new InputEvent("beforeinput", { inputType: "insertLineBreak", bubbles: true, cancelable: true }));
    });
    expect(await liveHtml(page)).toBe("<p>Start <strong>here</strong>.</p><p><br></p><p><br></p>");
  });

  test("a line break the browser added after text is removed when the caret moves", async ({ page }) => {
    await editor(page, "<p>Start</p>");
    await page.locator("orb-rich-text").evaluate((host: any) => {
      const root = host.shadowRoot.querySelector(".editor-content");
      root.querySelector("p").append(document.createElement("br"));
      root.focus();
      window.getSelection()!.setBaseAndExtent(root.querySelector("p").firstChild, 0, root.querySelector("p").firstChild, 0);
    });
    await expect.poll(() => liveHtml(page)).toBe("<p>Start</p>");
  });

  test("Enter twice after a browser-added line break adds two empty lines", async ({ page }) => {
    await editor(page, "<p>Start</p>");
    await page.locator("orb-rich-text").evaluate((host: any) => {
      host.shadowRoot.querySelector(".editor-content p").append(document.createElement("br"));
    });
    await placeCaret(page, "Start", 5);
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");
    await expect.poll(() => liveHtml(page)).toBe("<p>Start</p><p><br></p><p><br></p>");
  });

  test("Backspace on an empty line joins it to the empty line above, without an extra break", async ({ page }) => {
    await editor(page, "<p><br></p><p><br></p>");
    await page.locator("orb-rich-text").evaluate((host: any) => {
      const root = host.shadowRoot.querySelector(".editor-content");
      const last = root.lastElementChild;
      root.focus();
      window.getSelection()!.setBaseAndExtent(last, 0, last, 0);
    });
    await page.keyboard.press("Backspace");
    expect(await liveHtml(page)).toBe("<p><br></p>");
  });

  test("Backspace on an empty line joins it to the text above, without a stray break", async ({ page }) => {
    await editor(page, "<p>One</p><p><br></p>");
    await page.locator("orb-rich-text").evaluate((host: any) => {
      const root = host.shadowRoot.querySelector(".editor-content");
      const last = root.lastElementChild;
      root.focus();
      window.getSelection()!.setBaseAndExtent(last, 0, last, 0);
    });
    await page.keyboard.press("Backspace");
    expect(await liveHtml(page)).toBe("<p>One</p>");
  });

  test("Enter on an empty bold line keeps the bold on each new line", async ({ page }) => {
    await editor(page, "<p><strong>Bold</strong></p>");
    await placeCaret(page, "Bold", 4);
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");
    await page.keyboard.type("x");
    expect(await liveHtml(page)).toBe("<p><strong>Bold</strong></p><p><strong><br></strong></p><p><strong>x</strong></p>");
  });

  test("Enter with the caret between two blocks adds one new line", async ({ page }) => {
    await editor(page, "<p>One</p><p>Two</p>");
    await page.locator("orb-rich-text").evaluate((host: any) => {
      const root = host.shadowRoot.querySelector(".editor-content");
      root.focus();
      window.getSelection()!.setBaseAndExtent(root, 1, root, 1);
    });
    await page.keyboard.press("Enter");
    expect(await liveHtml(page)).toBe("<p>One</p><p><br></p><p>Two</p>");
  });

  test("Enter at the end of a heading starts a paragraph", async ({ page }) => {
    await editor(page, "<h2>Title</h2>");
    await placeCaret(page, "Title", 5);
    await page.keyboard.press("Enter");
    expect(await content(page)).toBe('<h2 id="title">Title</h2><p><br></p>');
  });

  test("Shift+Enter inserts a line break in the same block", async ({ page }) => {
    await editor(page, "<p>a b</p>");
    await placeCaret(page, "a b", 1);
    await page.keyboard.press("Shift+Enter");
    expect(await content(page)).toBe("<p>a<br> b</p>");
  });

  test("Backspace at the start of a paragraph joins it to the paragraph before", async ({ page }) => {
    await editor(page, "<p>One</p><p>Two</p>");
    await placeCaret(page, "Two", 0);
    await page.keyboard.press("Backspace");
    expect(await content(page)).toBe("<p>OneTwo</p>");
  });

  test("Delete at the end of a paragraph joins the paragraph after it", async ({ page }) => {
    await editor(page, "<p>One</p><p>Two</p>");
    await placeCaret(page, "One", 3);
    await page.keyboard.press("Delete");
    expect(await content(page)).toBe("<p>OneTwo</p>");
  });

  test("Backspace at the start of a heading at the top makes it a paragraph", async ({ page }) => {
    await editor(page, "<h1>Title</h1><p>x</p>");
    await placeCaret(page, "Title", 0);
    await page.keyboard.press("Backspace");
    expect(await content(page)).toBe("<p>Title</p><p>x</p>");
  });

  test("Backspace right after an image removes the whole image", async ({ page }) => {
    await editor(page, `<p>A<img src="${IMAGE}">B</p>`);
    await page.locator("orb-rich-text").evaluate((host: any) => {
      const root = host.shadowRoot.querySelector(".editor-content");
      root.focus();
      window.getSelection()!.setBaseAndExtent(root.querySelector("p"), 2, root.querySelector("p"), 2);
    });
    await page.keyboard.press("Backspace");
    expect(await content(page)).toBe("<p>AB</p>");
  });

  test("Enter in a list item adds an item, and Enter on an empty item leaves the list", async ({ page }) => {
    await editor(page, "<ul><li>One</li></ul>");
    await placeCaret(page, "One", 3);
    await page.keyboard.press("Enter");
    expect(await content(page)).toBe("<ul><li>One</li><li><br></li></ul>");

    await page.keyboard.press("Enter");
    expect(await content(page)).toBe("<ul><li>One</li></ul><p><br></p>");
  });

  test("Tab nests a list item under the one before it, and Shift+Tab brings it back", async ({ page }) => {
    await editor(page, "<ol><li>One</li><li>Two</li></ol>");
    await placeCaret(page, "Two", 1);
    await page.keyboard.press("Tab");
    expect(await content(page)).toBe("<ol><li>One<ol><li>Two</li></ol></li></ol>");

    await page.keyboard.press("Shift+Tab");
    expect(await content(page)).toBe("<ol><li>One</li><li>Two</li></ol>");
  });

  test("Enter in a task item adds an unchecked checkbox to the new item", async ({ page }) => {
    await editor(page, '<ul><li><input type="checkbox">Task one</li></ul>');
    await placeCaret(page, "Task one", 8);
    await page.keyboard.press("Enter");
    const saved = await content(page);
    expect(saved.match(/type="checkbox"/g)).toHaveLength(2);
    expect(saved).not.toContain("checked");
  });

  test("Backspace right after a task checkbox removes the checkbox", async ({ page }) => {
    await editor(page, '<ul><li><input type="checkbox">Task</li></ul>');
    await placeCaretIn(page, "li", 1);
    await page.keyboard.press("Backspace");
    expect(await content(page)).toBe("<ul><li>Task</li></ul>");
  });

  test("Enter on the empty last paragraph of a quote leaves the quote", async ({ page }) => {
    await editor(page, "<blockquote><p>Quote</p><p><br></p></blockquote>");
    await page.locator("orb-rich-text").evaluate((host: any) => {
      const root = host.shadowRoot.querySelector(".editor-content");
      const last = root.querySelector("blockquote").lastElementChild;
      root.focus();
      window.getSelection()!.setBaseAndExtent(last, 0, last, 0);
    });
    await page.keyboard.press("Enter");
    expect(await content(page)).toBe("<blockquote><p>Quote</p></blockquote><p><br></p>");
  });

  test("Backspace at the start of a quote removes the quote", async ({ page }) => {
    await editor(page, "<blockquote><p>Quote</p></blockquote>");
    await placeCaret(page, "Quote", 0);
    await page.keyboard.press("Backspace");
    expect(await content(page)).toBe("<p>Quote</p>");
  });

  test("Tab in a code block indents the line by two spaces", async ({ page }) => {
    await editor(page, "<pre><code>let x</code></pre>");
    await placeCaret(page, "let x", 0);
    await page.keyboard.press("Tab");
    expect(await content(page)).toBe("<pre><code>  let x</code></pre>");
  });

  test("Enter in a code block adds a line, and a third Enter on empty lines leaves the block", async ({ page }) => {
    await editor(page, "<pre><code>a</code></pre>");
    await placeCaret(page, "a", 1);
    await page.keyboard.press("Enter");
    expect(await content(page)).toBe("<pre><code>a\n</code></pre>");

    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");
    expect(await content(page)).toBe("<pre><code>a</code></pre><p><br></p>");
  });

  test("formatting shortcuts don't apply inside a code block", async ({ page }) => {
    await editor(page, "<pre><code>x</code></pre>");
    await placeCaret(page, "x", 0);
    await focusEditor(page);
    await page.keyboard.press(`${await modKey(page)}+b`);
    expect(await content(page)).toBe("<pre><code>x</code></pre>");
  });

  test("Escape then Tab leaves a list instead of indenting it", async ({ page }) => {
    await editor(page, "<ul><li>One</li><li>Two</li></ul>");
    await placeCaret(page, "Two", 1);
    await page.keyboard.press("Escape");
    await page.keyboard.press("Tab");
    expect(await content(page)).toBe("<ul><li>One</li><li>Two</li></ul>");
    const active = await page.locator("orb-rich-text").evaluate((e: any) => e.shadowRoot.activeElement?.className ?? "");
    expect(active).not.toContain("editor-content");
  });

  test("Alt+F10 moves focus to the toolbar", async ({ page }) => {
    await editor(page, "<p>Text</p>");
    await focusEditor(page);
    await page.keyboard.press("Alt+F10");
    const active = await page.locator("orb-rich-text").evaluate((e: any) => e.shadowRoot.activeElement?.tagName);
    expect(active).toBe("ORB-BUTTON");
  });

  test("the shortcut help lists the shortcuts, and can be closed", async ({ page }) => {
    await editor(page, "<p>Text</p>");
    await focusEditor(page);
    await page.keyboard.press(`${await modKey(page)}+/`);
    const overlay = page.locator("orb-rich-text orb-overlay").filter({ hasText: "Keyboard shortcuts" });
    await expect(overlay).toHaveJSProperty("open", true);
    await expect(overlay.getByText("Keyboard shortcuts").first()).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(overlay).toHaveJSProperty("open", false);
  });
});
