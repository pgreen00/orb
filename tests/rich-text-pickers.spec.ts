import { test, expect, type Page } from "@playwright/test";
import { content, editor, placeCaret } from "./rich-text-utils";

const toolbarButton = (page: Page, id: string) => page.locator(`orb-rich-text #action-${id}`);
/** Only the controls these tests use, which the default toolbar would move into More at this width */
const SHORT_TOOLBAR = 'toolbar="fontFamily specialCharacter emoji"';
const cell = (page: Page, name: string) =>
  page.locator(`orb-rich-text .picker-cell[aria-label="${name}"]`).filter({ visible: true });

test.describe("orb-rich-text pickers", () => {
  test("a special character picked from the grid is inserted at the caret", async ({ page }) => {
    await editor(page, "<p>Dash</p>", SHORT_TOOLBAR);
    await placeCaret(page, "Dash", 4);
    await toolbarButton(page, "specialCharacter").click();
    await cell(page, "em dash").click();
    expect(await content(page)).toBe("<p>Dash—</p>");
  });

  test("the search narrows the special characters to matches", async ({ page }) => {
    await editor(page, "<p><br></p>", SHORT_TOOLBAR);
    await page.locator("orb-rich-text .editor-content").click();
    await toolbarButton(page, "specialCharacter").click();
    await page.locator('orb-rich-text .picker input[aria-label="Search"]').fill("euro");
    await expect(page.locator('orb-rich-text .picker-cell[aria-label="euro sign"]').filter({ visible: true })).toHaveCount(1);
    await expect(page.locator('orb-rich-text .picker-cell[aria-label="em dash"]').filter({ visible: true })).toHaveCount(0);
  });

  test("an emoji picked from the emoji picker is inserted", async ({ page }) => {
    await editor(page, "<p>Hi </p>", SHORT_TOOLBAR);
    await placeCaret(page, "Hi ", 3);
    await toolbarButton(page, "emoji").click();
    await cell(page, "grinning face").click();
    expect(await content(page)).toBe("<p>Hi 😀</p>");
  });

  test("a picked character takes the formats set for typing", async ({ page }) => {
    await editor(page, "<p>A</p>", SHORT_TOOLBAR);
    await placeCaret(page, "A", 1);
    await toolbarButton(page, "fontFamily").click();
    await page.locator("orb-rich-text orb-mi:text-is('Georgia')").filter({ visible: true }).evaluate((item: HTMLElement) => item.click());
    await toolbarButton(page, "specialCharacter").click();
    await cell(page, "em dash").click();
    expect(await content(page)).toBe('<p>A<span style="font-family: Georgia, serif">—</span></p>');
  });
});
