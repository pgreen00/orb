import { test, expect, type Page } from "@playwright/test";
import { choose, content, editor, modKey, placeCaret, selectText } from "./rich-text-utils";

const toolbarButton = (page: Page, id: string) => page.locator(`orb-rich-text #action-${id}`);
const swatch = (page: Page, color: string) =>
  page.locator(`orb-rich-text .swatch[aria-label="${color}"]`).filter({ visible: true });

test.describe("orb-rich-text styles", () => {
  test("a text color picked from the swatches colors the selected text", async ({ page }) => {
    await editor(page, "<p>Red word</p>");
    await selectText(page, "Red");
    await toolbarButton(page, "color").click();
    await swatch(page, "#e06666").click();
    expect(await content(page)).toBe('<p><span style="color: rgb(224, 102, 102)">Red</span> word</p>');
  });

  test("the Default swatch removes the text color", async ({ page }) => {
    await editor(page, '<p><span style="color: rgb(224, 102, 102)">Red</span> word</p>');
    await selectText(page, "Red");
    await toolbarButton(page, "color").click();
    await page.locator("orb-rich-text .picker-default").click();
    expect(await content(page)).toBe("<p>Red word</p>");
  });

  test("the background color is set with its own picker", async ({ page }) => {
    await editor(page, "<p>Lit word</p>");
    await selectText(page, "Lit");
    await toolbarButton(page, "background").click();
    await swatch(page, "#ffd966").click();
    expect(await content(page)).toBe('<p><span style="background-color: rgb(255, 217, 102)">Lit</span> word</p>');
  });

  test("the font select sets the font, and the size select sets it in points", async ({ page }) => {
    await editor(page, "<p>Text</p>");
    await selectText(page, "Text");
    await choose(page, "fontFamily", "Georgia");
    expect(await content(page)).toBe('<p><span style="font-family: Georgia, serif">Text</span></p>');

    await selectText(page, "Text");
    await choose(page, "fontSize", "18");
    expect(await content(page)).toBe(
      '<p><span style="font-family: Georgia, serif; font-size: 18pt">Text</span></p>',
    );
  });

  test("the font select shows the font of the selection", async ({ page }) => {
    await editor(page, '<p><span style="font-family: Georgia, serif">Text</span></p>');
    await selectText(page, "Text");
    await expect(toolbarButton(page, "fontFamily")).toHaveAttribute("aria-label", "Font: Georgia");
  });

  test("with nothing selected, a color applies to the text typed next", async ({ page }) => {
    await editor(page, "<p>Start</p>");
    await placeCaret(page, "Start", 5);
    await toolbarButton(page, "color").click();
    await swatch(page, "#e06666").click();
    await page.keyboard.type("!");
    expect(await content(page)).toBe('<p>Start<span style="color: rgb(224, 102, 102)">!</span></p>');
  });

  test("Clear formatting removes colors and fonts, and keeps the text", async ({ page }) => {
    await editor(page, '<p><span style="color: rgb(224, 102, 102); font-size: 18pt">Red</span> word</p>');
    await selectText(page, "Red");
    await page.locator("orb-rich-text .editor-content").focus();
    await page.keyboard.press(`${await modKey(page)}+Backslash`);
    expect(await content(page)).toBe("<p>Red word</p>");
  });

  test("undo reverts a color", async ({ page }) => {
    await editor(page, "<p>Red word</p>");
    await selectText(page, "Red");
    await toolbarButton(page, "color").click();
    await swatch(page, "#e06666").click();
    expect(await content(page)).toContain("color:");
    await page.locator("orb-rich-text .editor-content").focus();
    await page.keyboard.press(`${await modKey(page)}+z`);
    expect(await content(page)).toBe("<p>Red word</p>");
  });

  test("colors aren't applied inside a code block", async ({ page }) => {
    await editor(page, "<pre><code>x</code></pre>");
    await placeCaret(page, "x", 0);
    await toolbarButton(page, "color").click();
    await expect(page.locator("orb-rich-text .picker")).toHaveCount(0);
  });
});
