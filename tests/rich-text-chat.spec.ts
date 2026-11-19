import { test, expect, type Page } from "@playwright/test";
import { content, editor, modKey, placeCaret } from "./rich-text-utils";
import { mount } from "./utils";

const host = (page: Page) => page.locator("orb-rich-text");

/** Types into the editor, after a click at its end so the caret is in it */
const typeInEditor = async (page: Page, text: string) => {
  await page.locator("orb-rich-text .editor-content").click();
  await page.keyboard.press("End");
  await page.keyboard.type(text);
};

/** Keeps the detail of each `name` event the editor emits, in `window.events` */
const record = (page: Page, name: string) =>
  host(page).evaluate((el, name) => {
    (window as any).events = [];
    el.addEventListener(name, (ev: any) => (window as any).events.push(ev.detail));
  }, name);

const events = (page: Page) => page.evaluate(() => (window as any).events as any[]);

test.describe("orb-rich-text as a chat composer", () => {
  test("Enter submits the content, and the editor is cleared", async ({ page }) => {
    await editor(page, "", 'enter-action="submit"');
    await record(page, "orbSubmit");
    await typeInEditor(page, "Hello");
    await page.keyboard.press("Enter");
    await expect.poll(() => events(page)).toHaveLength(1);
    expect((await events(page))[0]).toMatchObject({ html: "<p>Hello</p>", text: "Hello", isEmpty: false });
    await expect.poll(() => content(page)).toBe("");
  });

  test("Enter on empty content doesn't submit, and doesn't add a line", async ({ page }) => {
    await editor(page, "", 'enter-action="submit"');
    await record(page, "orbSubmit");
    await page.locator("orb-rich-text .editor-content").click();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(100);
    expect(await events(page)).toHaveLength(0);
    expect(await content(page)).toBe("");
  });

  test("Shift+Enter adds a line break, and doesn't submit", async ({ page }) => {
    await editor(page, "", 'enter-action="submit"');
    await record(page, "orbSubmit");
    await typeInEditor(page, "Hi");
    await page.keyboard.press("Shift+Enter");
    await page.keyboard.type("there");
    await page.waitForTimeout(100);
    expect(await events(page)).toHaveLength(0);
    expect(await content(page)).toBe("<p>Hi<br>there</p>");
  });

  test("Enter in a code block adds a line, and Ctrl or ⌘+Enter submits from it", async ({ page }) => {
    await editor(page, "<pre>const a = 1</pre>", 'enter-action="submit"');
    await record(page, "orbSubmit");
    await placeCaret(page, "const a = 1", 11);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(100);
    expect(await events(page)).toHaveLength(0);
    expect(await content(page)).toContain("const a = 1\n");
    await page.keyboard.press(`${await modKey(page)}+Enter`);
    await expect.poll(() => events(page)).toHaveLength(1);
    expect((await events(page))[0].text).toContain("const a = 1");
  });

  test("a submit that's canceled keeps the content", async ({ page }) => {
    await editor(page, "", 'enter-action="submit"');
    await host(page).evaluate((el) => el.addEventListener("orbSubmit", (ev) => ev.preventDefault()));
    await typeInEditor(page, "Keep me");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(100);
    expect(await content(page)).toBe("<p>Keep me</p>");
  });

  test("Enter starts a new paragraph by default", async ({ page }) => {
    await editor(page, "<p>Hi</p>");
    await record(page, "orbSubmit");
    await page.locator("orb-rich-text .editor-content").click();
    await page.keyboard.press("End");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(100);
    expect(await events(page)).toHaveLength(0);
    expect(await content(page)).toBe("<p>Hi</p><p><br></p>");
  });

  test("toolbar-placement bottom puts the toolbar below the writing area, and top puts it back above", async ({ page }) => {
    await editor(page, "<p>Text</p>", 'toolbar-placement="bottom"');
    const layout = () =>
      host(page).evaluate((el) => {
        const root = el.shadowRoot!;
        const toolbar = root.querySelector(".editor-toolbar")?.getBoundingClientRect();
        const content = root.querySelector(".editor-content")!.getBoundingClientRect();
        return { toolbarTop: toolbar?.top ?? null, contentTop: content.top, contentBottom: content.bottom };
      });
    await expect.poll(async () => {
      const { toolbarTop, contentBottom } = await layout();
      return toolbarTop !== null && toolbarTop >= contentBottom - 1;
    }).toBe(true);

    await host(page).evaluate((el: any) => (el.toolbarPlacement = "top"));
    await expect.poll(async () => {
      const { toolbarTop, contentTop } = await layout();
      return toolbarTop !== null && toolbarTop < contentTop;
    }).toBe(true);

    await host(page).evaluate((el: any) => (el.toolbarPlacement = "none"));
    await expect.poll(async () => (await layout()).toolbarTop).toBeNull();
  });

  test("content slotted into the top and bottom rows shows inside the border, and an empty row is hidden", async ({ page }) => {
    await mount(page, '<orb-rich-text><span slot="top-start">Replying to Ada</span></orb-rich-text>');
    const rows = () =>
      host(page).evaluate((el) => {
        const root = el.shadowRoot!;
        const row = (position: string) => root.querySelector<HTMLElement>(`.shell [part="${position}"]`)!;
        return { topHidden: row("top").hidden, bottomHidden: row("bottom").hidden };
      });
    expect(await rows()).toEqual({ topHidden: false, bottomHidden: true });

    await host(page).evaluate((el) => {
      const send = document.createElement("button");
      send.slot = "bottom-end";
      send.textContent = "Send";
      el.append(send);
    });
    await expect.poll(async () => (await rows()).bottomHidden).toBe(false);
    const slotted = await host(page).evaluate((el) =>
      el.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="bottom-end"]')!.assignedElements().map((n) => n.textContent),
    );
    expect(slotted).toEqual(["Send"]);
  });

  test("the compact variant has no word count or menubar by default, a one-line minimum, and chat typography", async ({ page }) => {
    await editor(page, "<pre>code</pre>");
    const document_ = await host(page).evaluate((el) => {
      const root = el.shadowRoot!;
      return {
        footer: !!root.querySelector(".editor-footer"),
        preMargin: parseFloat(getComputedStyle(root.querySelector("pre")!).marginTop),
      };
    });
    expect(document_.footer).toBe(true);

    await editor(page, "<pre>code</pre>", 'variant="compact" menubar="always"');
    const compact = await host(page).evaluate((el) => {
      const root = el.shadowRoot!;
      const writing = root.querySelector<HTMLElement>(".editor-content")!;
      return {
        footer: !!root.querySelector(".editor-footer"),
        menubar: !!root.querySelector("orb-menubar"),
        chatClass: writing.classList.contains("chat-content"),
        minHeight: parseFloat(getComputedStyle(writing).minHeight),
        preMargin: parseFloat(getComputedStyle(root.querySelector("pre")!).marginTop),
      };
    });
    expect(compact.footer).toBe(false);
    expect(compact.menubar).toBe(false);
    expect(compact.chatClass).toBe(true);
    expect(compact.minHeight).toBeLessThan(60);
    expect(compact.preMargin).toBeLessThan(document_.preMargin);
  });

  test("show-word-count turns the count on in the compact variant", async ({ page }) => {
    await editor(page, "<p>Hi</p>", 'variant="compact" show-word-count');
    await expect(host(page).locator(".editor-footer")).toHaveCount(1);
  });
});
