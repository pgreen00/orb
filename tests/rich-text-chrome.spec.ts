import { test, expect, type Page } from "@playwright/test";
import { content, editor, modKey, selectText } from "./rich-text-utils";
import { mount } from "./utils";

const host = (page: Page) => page.locator("orb-rich-text");

const setFullscreen = (page: Page, on: boolean) =>
  host(page).evaluate((el: any, on) => (el.fullscreen = on), on);

const isFullscreen = (page: Page) =>
  host(page).evaluate((el: any) => el.shadowRoot.querySelector(".shell").matches(":popover-open"));

/** Clicks through the menubar: each label opens a menu, the last one chooses */
async function menubarChoose(page: Page, path: string[]) {
  for (const label of path) {
    await host(page).locator(`orb-mi:text-is("${label}")`).filter({ visible: true }).first().click();
    await page.waitForTimeout(150);
  }
}

test.describe("orb-rich-text full screen, menubar, modes and formats", () => {
  test("setting fullscreen from code fills the window, and leaving restores the page", async ({ page }) => {
    await editor(page, "<p>Full</p>");
    const before = await host(page).evaluate((el: any) => el.getBoundingClientRect().height);
    await setFullscreen(page, true);
    await expect.poll(() => isFullscreen(page)).toBe(true);
    const box = await host(page).locator(".shell").evaluate((el: any) => el.getBoundingClientRect().width);
    expect(box).toBeGreaterThan(1000);
    await setFullscreen(page, false);
    await expect.poll(() => isFullscreen(page)).toBe(false);
    expect(await host(page).evaluate((el: any) => el.getBoundingClientRect().height)).toBeCloseTo(before, 0);
  });

  test("leaving full screen keeps the page's scroll position", async ({ page }) => {
    await mount(page, `<div style="height:1000px"></div><orb-rich-text></orb-rich-text><div style="height:3000px"></div>`);
    await page.evaluate(() => window.scrollTo(0, 900));
    await setFullscreen(page, true);
    await setFullscreen(page, false);
    expect(await page.evaluate(() => window.scrollY)).toBe(900);
  });

  test("Escape closes an open menu first, and leaves full screen on the next press", async ({ page }) => {
    await editor(page, "<p><br></p>");
    await setFullscreen(page, true);
    await menubarChoose(page, ["File"]);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
    expect(await isFullscreen(page)).toBe(true);
    await page.keyboard.press("Escape");
    await expect.poll(() => isFullscreen(page)).toBe(false);
  });

  test("Escape closes the command menu without leaving full screen", async ({ page }) => {
    await editor(page, "<p><br></p>");
    await setFullscreen(page, true);
    await host(page).locator(".editor-content").click();
    await page.keyboard.type("/");
    await expect(host(page).locator("orb-mi:visible").first()).toBeVisible();
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
    expect(await isFullscreen(page)).toBe(true);
  });

  test("Tab wraps inside full screen, from the content back to the menubar", async ({ page }) => {
    await editor(page, "<p>One</p>");
    await setFullscreen(page, true);
    await host(page).locator(".editor-content").click();
    await page.keyboard.press("Tab");
    const inBar = await host(page).evaluate((el: any) => !!el.shadowRoot.activeElement?.closest("orb-menubar, .editor-toolbar"));
    expect(inBar).toBe(true);
  });

  test("selection and undo history survive entering and leaving full screen", async ({ page }) => {
    await editor(page, "<p>Keep this</p>");
    await selectText(page, "this");
    await setFullscreen(page, true);
    await setFullscreen(page, false);
    await page.keyboard.press(`${await modKey(page)}+b`);
    expect(await content(page)).toBe("<p>Keep <strong>this</strong></p>");
    await page.keyboard.press(`${await modKey(page)}+z`);
    expect(await content(page)).toBe("<p>Keep this</p>");
  });

  test("the menubar shows in full screen by default, and never when set to never", async ({ page }) => {
    await editor(page, "<p>Bar</p>");
    await expect(host(page).locator("orb-menubar")).toHaveCount(0);
    await setFullscreen(page, true);
    await expect(host(page).locator("orb-menubar").first()).toBeVisible();
    await setFullscreen(page, false);
    await host(page).evaluate((el: any) => (el.menubar = "never"));
    await setFullscreen(page, true);
    await expect(host(page).locator("orb-menubar")).toHaveCount(0);
  });

  test("File > Download as saves the document, and orbExport can take it instead", async ({ page }) => {
    await editor(page, "<p>Hi</p>", 'doc-title="Letter"');
    await setFullscreen(page, true);
    const download = page.waitForEvent("download");
    await menubarChoose(page, ["File", "Download as", "Markdown"]);
    expect((await download).suggestedFilename()).toBe("Letter.md");
    await host(page).evaluate((el: any) =>
      el.addEventListener("orbExport", (ev: any) => {
        ev.preventDefault();
        (window as any).exported = ev.detail;
      }),
    );
    await menubarChoose(page, ["File", "Download as", "JSON"]);
    await expect.poll(() => page.evaluate(() => (window as any).exported?.format)).toBe("json");
  });

  test("mode view is read-only and has no editing controls", async ({ page }) => {
    await editor(page, "<p>Locked</p>", 'mode="view"');
    await host(page).locator(".editor-content").click();
    await page.keyboard.type("x");
    expect(await content(page)).toBe("<p>Locked</p>");
    await expect(host(page).locator(".editor-content")).toHaveJSProperty("isContentEditable", false);
  });

  test("toolbar-placement none removes the toolbar", async ({ page }) => {
    await editor(page, "<p>Plain</p>", 'toolbar-placement="none"');
    await expect(host(page).locator(".editor-toolbar")).toHaveCount(0);
  });

  test("HTML source shows the HTML, and switching back applies edits as one undo step", async ({ page }) => {
    await editor(page, "<p>Hello</p>");
    await setFullscreen(page, true);
    await menubarChoose(page, ["View", "HTML source"]);
    const source = host(page).locator("textarea.source");
    await expect(source).toHaveValue("<p>Hello</p>");
    await source.fill("<h2>Changed</h2>");
    await menubarChoose(page, ["View", "Show editor"]);
    await expect.poll(() => content(page)).toBe('<h2 id="changed">Changed</h2>');
    await host(page).locator(".editor-content").focus();
    await page.keyboard.press(`${await modKey(page)}+z`);
    expect(await content(page)).toBe("<p>Hello</p>");
  });

  test("importFrom reads Markdown, text and HTML, and undo takes an import back", async ({ page }) => {
    await editor(page, "<p>Before</p>");
    await host(page).evaluate((el: any) => el.importFrom("markdown", "# Title\n\n- one\n- **two**"));
    await expect.poll(() => content(page)).toBe('<h1 id="title">Title</h1><ul><li>one</li><li><strong>two</strong></li></ul>');
    await host(page).locator(".editor-content").focus();
    await page.keyboard.press(`${await modKey(page)}+z`);
    expect(await content(page)).toBe("<p>Before</p>");
    await host(page).evaluate((el: any) => el.importFrom("text", "a <b>\nsecond"));
    await expect.poll(() => content(page)).toBe("<p>a &lt;b&gt;</p><p>second</p>");
    await host(page).evaluate((el: any) => el.importFrom("html", "<p>From <em>HTML</em></p>"));
    await expect.poll(() => content(page)).toBe("<p>From <em>HTML</em></p>");
  });

  test("print() prints from a hidden frame, and Mod+P does the same from the editor", async ({ page }) => {
    await editor(page, "<p>Printed text</p>");
    // The frame is removed once printing finishes, so its content is read as it loads
    await page.evaluate(() => {
      (window as any).printed = null;
      new MutationObserver((records) => {
        for (const record of records)
          for (const node of Array.from(record.addedNodes))
            if (node instanceof HTMLIFrameElement && node.title === "Print")
              node.addEventListener("load", () => ((window as any).printed = node.contentDocument!.body.innerHTML), { once: true });
      }).observe(document.body, { childList: true });
    });
    await host(page).locator(".editor-content").click();
    await page.keyboard.press(`${await modKey(page)}+p`);
    await expect.poll(() => page.evaluate(() => (window as any).printed)).toContain("Printed text");
  });
});
