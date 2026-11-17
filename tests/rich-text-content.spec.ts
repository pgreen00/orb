import { test, expect, type Page } from "@playwright/test";
import { content, editor, selectText } from "./rich-text-utils";

const toolbarButton = (page: Page, id: string) => page.locator(`orb-rich-text #action-${id}`);

/** A 1×1 GIF, small enough to inline */
const IMAGE = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
/** A large enough image to click. A 1x1 one is covered by the paragraph around it. */
const BIG_IMAGE = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="red"/></svg>',
)}`;

/** Pastes HTML into the editor, as Ctrl+V does */
const paste = (page: Page, html: string) =>
  page.locator("orb-rich-text").evaluate((host: any, data: string) => {
    const area = host.shadowRoot.querySelector(".editor-content");
    area.focus();
    const dt = new DataTransfer();
    dt.setData("text/html", data);
    area.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
  }, html);

test.describe("orb-rich-text content", () => {
  test("pasting Word's lists rebuilds them as nested lists", async ({ page }) => {
    await editor(page);
    await paste(
      page,
      `<p class=MsoListParagraph style='mso-list:l0 level1 lfo1'><![if !supportLists]><span style='mso-list:Ignore'>1.<span style='font:7.0pt "Times New Roman"'>&nbsp;&nbsp;</span></span><![endif]>First</p>` +
        `<p class=MsoListParagraph style='mso-list:l0 level2 lfo1'><span style='mso-list:Ignore'>o<span>&nbsp;&nbsp;</span></span>Nested</p>` +
        `<p class=MsoListParagraph style='mso-list:l0 level1 lfo1'><span style='mso-list:Ignore'>2.<span>&nbsp;&nbsp;</span></span>Second</p>` +
        `<p>After</p>`,
    );
    expect(await content(page)).toBe(
      "<ol><li>First<ul><li>Nested</li></ul></li><li>Second</li></ol><p>After</p>",
    );
  });

  test("pasting Word's bullets makes an unordered list", async ({ page }) => {
    await editor(page);
    await paste(
      page,
      `<p class=MsoListParagraph style='mso-list:l1 level1 lfo2'><span style='mso-list:Ignore'>·<span>&nbsp;&nbsp;</span></span>Dot</p>`,
    );
    expect(await content(page)).toBe("<ul><li>Dot</li></ul>");
  });

  test("pasting into a code block takes plain text only", async ({ page }) => {
    await editor(page, "<pre><code>x</code></pre>");
    await page.locator("orb-rich-text").evaluate((host: any) => {
      const code = host.shadowRoot.querySelector(".editor-content code");
      host.shadowRoot.querySelector(".editor-content").focus();
      window.getSelection()!.setBaseAndExtent(code.firstChild, 1, code.firstChild, 1);
    });
    await page.locator("orb-rich-text").evaluate((host: any) => {
      const area = host.shadowRoot.querySelector(".editor-content");
      const dt = new DataTransfer();
      dt.setData("text/html", "<b>bold</b>");
      dt.setData("text/plain", "plain");
      area.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
    });
    expect(await content(page)).toBe("<pre><code>xplain</code></pre>");
  });

  test("undo steps back one change at a time, and redo steps forward", async ({ page }) => {
    await editor(page, "<p>one two</p>");
    await selectText(page, "one");
    await toolbarButton(page, "bold").click();
    await selectText(page, "two");
    await toolbarButton(page, "bold").click();
    expect(await content(page)).toBe("<p><strong>one</strong> <strong>two</strong></p>");

    await toolbarButton(page, "undo").click();
    expect(await content(page)).toBe("<p><strong>one</strong> two</p>");
    await toolbarButton(page, "undo").click();
    expect(await content(page)).toBe("<p>one two</p>");

    await toolbarButton(page, "redo").click();
    expect(await content(page)).toBe("<p><strong>one</strong> two</p>");
  });

  test("clicking an image selects it, and Delete removes it", async ({ page }) => {
    await editor(page, `<p>Before<img src="${BIG_IMAGE}"> after</p>`);
    await page.locator("orb-rich-text .editor-content img").click();
    await expect(page.locator("orb-rich-text .editor-content img")).toHaveAttribute("data-selected", "");

    await page.keyboard.press("Delete");
    expect(await content(page)).toBe("<p>Before after</p>");
  });

  test("a selection mark on an image isn't saved", async ({ page }) => {
    await editor(page, `<p><img src="${BIG_IMAGE}"></p>`);
    await page.locator("orb-rich-text .editor-content img").click();
    await expect(page.locator("orb-rich-text .editor-content img")).toHaveAttribute("data-selected", "");
    expect(await content(page)).toBe(`<p><img src="${BIG_IMAGE}"></p>`);
  });

  test("an image at the end of a block gets a runtime line break, which isn't saved", async ({ page }) => {
    await editor(page, `<p>Text<img src="${IMAGE}"></p>`);
    const trailing = await page
      .locator("orb-rich-text")
      .evaluate((host: any) => host.shadowRoot.querySelectorAll(".editor-content br[data-orb-trailing]").length);
    expect(trailing).toBe(1);
    expect(await content(page)).toBe(`<p>Text<img src="${IMAGE}"></p>`);
  });

  test("a caret placed inside an image moves after it", async ({ page }) => {
    await editor(page, `<p>A<img src="${IMAGE}">B</p>`);
    await page.locator("orb-rich-text").evaluate((host: any) => {
      host.shadowRoot.querySelector(".editor-content").focus();
      const img = host.shadowRoot.querySelector(".editor-content img");
      window.getSelection()!.setBaseAndExtent(img, 0, img, 0);
    });
    await page.keyboard.type("x");
    expect(await content(page)).toBe(`<p>A<img src="${IMAGE}">xB</p>`);
  });
});
