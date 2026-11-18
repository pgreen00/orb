import { test, expect, type Page } from "@playwright/test";
import { content, editor } from "./rich-text-utils";

/** Pastes plain text at the editor's caret, the way the clipboard does */
const pastePlain = (page: Page, text: string) =>
  page.locator("orb-rich-text").evaluate((host: any, text) => {
    const area = host.shadowRoot.querySelector(".editor-content");
    area.focus();
    const dt = new DataTransfer();
    dt.setData("text/plain", text);
    area.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
  }, text);

test.describe("orb-rich-text paste", () => {
  test("Markdown on the clipboard is rendered, then cleaned like HTML", async ({ page }) => {
    await editor(page, "<p><br></p>");
    await pastePlain(page, "# Title\n\n- one\n- two\n\n**bold** text");
    await expect.poll(() => content(page)).toBe(
      '<h1 id="title">Title</h1><ul><li>one</li><li>two</li></ul><p><strong>bold</strong> text</p>',
    );
  });

  test("plain prose pastes as text", async ({ page }) => {
    await editor(page, "<p><br></p>");
    await pastePlain(page, "Just a sentence.");
    expect(await content(page)).toBe("<p>Just a sentence.</p>");
  });

  test("with markdown-paste off, Markdown pastes as it is", async ({ page }) => {
    await editor(page, "<p><br></p>", 'markdown-paste="false"');
    await pastePlain(page, "# Title");
    expect(await content(page)).toBe("<p># Title</p>");
  });
});
