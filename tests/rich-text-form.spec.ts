import { test, expect, type Page } from "@playwright/test";
import { mount } from "./utils";

const formHtml = (attrs = "") =>
  `<form><orb-rich-text name="body" ${attrs}></orb-rich-text><button type="submit">Save</button></form>`;

/** The editor's entry in a FormData built from the form, or null when it's missing */
const formEntry = (page: Page, name = "body") =>
  page.evaluate((n) => new FormData(document.querySelector("form")!).get(n), name);

/** Waits for the editor to load, so its form value is set */
const ready = (page: Page) => page.locator("orb-rich-text").evaluate((e: any) => e.ready);

test.describe("orb-rich-text form field", () => {
  test("FormData has the editor's HTML under its name", async ({ page }) => {
    await mount(page, formHtml('value="<p>Hi</p>"'));
    await ready(page);
    expect(await formEntry(page)).toBe("<p>Hi</p>");
  });

  test("the form value follows typing after a pause", async ({ page }) => {
    await mount(page, formHtml());
    await ready(page);
    await page.locator("orb-rich-text .editor-content").click();
    await page.keyboard.type("hello");
    await page.waitForTimeout(700);
    expect(await formEntry(page)).toBe("<p>hello</p>");
  });

  test("required blocks submission, and marks the field as user-invalid after submit", async ({ page }) => {
    await mount(page, formHtml("required"));
    await ready(page);
    expect(await page.evaluate(() => document.querySelector("form")!.checkValidity())).toBe(false);
    await page.evaluate(() => document.querySelector("form")!.requestSubmit());
    await expect(page.locator("orb-rich-text")).toHaveJSProperty("userInvalid", true);
  });

  test("a form reset restores defaultValue", async ({ page }) => {
    await mount(page, formHtml('value="<p>Start</p>"'));
    await ready(page);
    await page.locator("orb-rich-text").evaluate((e: any) => e.setContent("<p>Changed</p>"));
    await page.evaluate(() => document.querySelector("form")!.reset());
    expect(await formEntry(page)).toBe("<p>Start</p>");
  });

  test("a disabled fieldset leaves the editor out of FormData", async ({ page }) => {
    await mount(
      page,
      `<form><fieldset disabled><orb-rich-text name="body" value="<p>x</p>"></orb-rich-text></fieldset></form>`,
    );
    await ready(page);
    expect(await formEntry(page)).toBe(null);
  });

  test("the disabled prop leaves the editor out of FormData, and turning it off puts it back", async ({ page }) => {
    await mount(page, formHtml('value="<p>x</p>"'));
    await ready(page);
    const editor = page.locator("orb-rich-text");
    await editor.evaluate((e: any) => (e.disabled = true));
    expect(await formEntry(page)).toBe(null);
    await editor.evaluate((e: any) => (e.disabled = false));
    // The reflected attribute is removed on the next render, which is when the browser stops treating it as disabled
    await expect.poll(() => formEntry(page)).toBe("<p>x</p>");
  });

  test("a disabled editor in a form renders without errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await mount(page, formHtml("disabled value=\"<p>x</p>\""));
    await ready(page);
    expect(errors).toEqual([]);
    expect(await formEntry(page)).toBe(null);
  });

  test("readonly content is still submitted", async ({ page }) => {
    await mount(page, formHtml('readonly value="<p>Locked</p>"'));
    await ready(page);
    expect(await formEntry(page)).toBe("<p>Locked</p>");
  });

  test("clicking a label for the editor focuses the content area", async ({ page }) => {
    await mount(page, `<label for="ed">Body</label><orb-rich-text id="ed"></orb-rich-text>`);
    await ready(page);
    await page.locator("label").click();
    // The editor takes focus on the next frame, after the browser focuses the host
    await expect
      .poll(() => page.locator("orb-rich-text").evaluate((e: any) => e.shadowRoot.activeElement?.className))
      .toContain("editor-content");
  });

  test("the label and note name the content area for accessibility", async ({ page }) => {
    await mount(page, `<orb-rich-text label="Body" note="Be kind"></orb-rich-text>`);
    const editable = page.getByRole("textbox", { name: "Body" });
    await expect(editable).toHaveAttribute("aria-multiline", "true");
    await expect(editable).toHaveAccessibleDescription("Be kind");
  });

  test("setting value from code replaces the content without firing change", async ({ page }) => {
    await mount(page, `<orb-rich-text id="ed"></orb-rich-text>`);
    await ready(page);
    const changes = await page.evaluate(
      () =>
        new Promise<number>((resolve) => {
          const el = document.getElementById("ed") as any;
          let count = 0;
          el.addEventListener("change", () => count++);
          el.value = "<p>New</p>";
          setTimeout(() => resolve(count), 50);
        }),
    );
    expect(changes).toBe(0);
    expect(await page.locator("orb-rich-text").evaluate((e: any) => e.getContent())).toBe("<p>New</p>");
  });

  test("input fires for typing and for toolbar commands, with matching inputType values", async ({ page }) => {
    await mount(page, `<orb-rich-text id="ed" value="<p>one</p>"></orb-rich-text>`);
    await ready(page);
    // Listens before any input, so every event is seen
    await page.evaluate(() => {
      (window as any).seen = [];
      document.getElementById("ed")!.addEventListener("input", (ev: Event) => (window as any).seen.push((ev as InputEvent).inputType));
    });
    await page.locator("orb-rich-text .editor-content").click();
    await page.keyboard.press("End");
    await page.keyboard.type("x");
    // Bold needs a selection. With a collapsed caret it only sets a pending format, with no input event.
    await page.evaluate(() => {
      const root = (document.getElementById("ed") as any).shadowRoot.querySelector(".editor-content");
      const range = document.createRange();
      range.selectNodeContents(root.querySelector("p"));
      root.focus();
      window.getSelection()!.setBaseAndExtent(range.startContainer, 0, range.endContainer, range.endOffset);
    });
    await page.locator("orb-rich-text #action-bold").click();
    const seen = await page.evaluate(() => (window as any).seen as string[]);
    expect(seen).toContain("insertText");
    expect(seen).toContain("formatBold");
  });

  test("change fires once when focus leaves the editor, not when it moves to the toolbar", async ({ page }) => {
    await mount(page, `<button id="before">before</button><orb-rich-text id="ed"></orb-rich-text><button id="after">after</button>`);
    await ready(page);
    await page.evaluate(() => {
      (window as any).changes = 0;
      document.getElementById("ed")!.addEventListener("change", () => ((window as any).changes += 1));
    });
    await page.locator("orb-rich-text .editor-content").click();
    await page.keyboard.type("a");
    await page.locator("orb-rich-text #action-bold").click();
    expect(await page.evaluate(() => (window as any).changes)).toBe(0);
    await page.locator("#after").click();
    expect(await page.evaluate(() => (window as any).changes)).toBe(1);
  });

  test("pasting Google Docs bold keeps only the bold it marked", async ({ page }) => {
    await mount(page, `<orb-rich-text id="ed"></orb-rich-text>`);
    await ready(page);
    const saved = await page.evaluate(async () => {
      const el = document.getElementById("ed") as any;
      const editor = el.shadowRoot.querySelector(".editor-content");
      editor.focus();
      const dt = new DataTransfer();
      dt.setData(
        "text/html",
        '<meta charset="utf-8"><b id="docs-internal-guid-1" style="font-weight:normal"><p><span style="font-weight:700">Bold</span> plain</p></b>',
      );
      editor.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
      return el.getContent();
    });
    expect(saved).toBe("<p><strong>Bold</strong> plain</p>");
  });

  test("setCustomValidity blocks the form until the message is cleared", async ({ page }) => {
    await mount(page, formHtml('value="<p>Hi</p>"'));
    await ready(page);
    const editor = page.locator("orb-rich-text");
    await editor.evaluate((e: any) => e.setCustomValidity("Too short"));
    expect(await page.evaluate(() => document.querySelector("form")!.checkValidity())).toBe(false);
    expect(await editor.evaluate((e: any) => e.validationMessage)).toBe("Too short");

    await editor.evaluate((e: any) => e.setCustomValidity(""));
    expect(await page.evaluate(() => document.querySelector("form")!.checkValidity())).toBe(true);
  });

  test("resetValidity hides the error after a failed submit", async ({ page }) => {
    await mount(page, formHtml("required"));
    await ready(page);
    await page.evaluate(() => document.querySelector("form")!.requestSubmit());
    const editor = page.locator("orb-rich-text");
    await expect(editor).toHaveJSProperty("userInvalid", true);
    await editor.evaluate((e: any) => e.resetValidity());
    await expect(editor).toHaveJSProperty("userInvalid", false);
  });

  test("a <label for> names the editor", async ({ page }) => {
    await mount(page, `<label for="ed">Body</label><orb-rich-text id="ed"></orb-rich-text>`);
    await expect(page.getByRole("textbox", { name: "Body" })).toHaveCount(1);
  });

  test("a slotted label and note name and describe the editor", async ({ page }) => {
    await mount(page, `<orb-rich-text><span slot="label">Notes</span><span slot="note">Keep it short</span></orb-rich-text>`);
    const area = page.getByRole("textbox", { name: "Notes" });
    await expect(area).toHaveCount(1);
    await expect(area).toHaveAttribute("aria-description", "Keep it short");
  });
});
