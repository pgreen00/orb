import { test, expect, type Page } from "@playwright/test";
import { content, editor } from "./rich-text-utils";

const SVG =
  "data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20width=%27200%27%20height=%2780%27%3E%3Crect%20width=%27200%27%20height=%2780%27%20fill=%27%23cfe3ff%27/%3E%3C/svg%3E";
const FIGURE = `<figure style="text-align: center"><img alt="x" width="200" src="${SVG}"><figcaption>cap</figcaption></figure><p>after</p>`;

const popoverOpen = (page: Page) =>
  page.locator("orb-rich-text .media-popover-host").evaluate((el) => el.matches(":popover-open"));

test.describe("orb-rich-text picture resizing", () => {
  test("dragging the corner handle resizes the picture, and the picture stays selected", async ({ page }) => {
    await editor(page, FIGURE);
    await page.locator("orb-rich-text figure img").click();
    await expect(page.locator("orb-rich-text .media-handle")).toHaveCount(1);

    const handle = (await page.locator("orb-rich-text .media-handle").boundingBox())!;
    await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
    await page.mouse.down();
    await page.mouse.move(handle.x + 60, handle.y + 30, { steps: 8 });
    await page.mouse.up();

    await expect.poll(() => content(page)).toMatch(/ width="(2[5-9]\d|[3-9]\d\d)"/);
    await expect(page.locator("orb-rich-text figure[data-selected]")).toHaveCount(1);
    await expect(page.locator("orb-rich-text .media-handle")).toHaveCount(1);
    await expect.poll(() => popoverOpen(page)).toBe(true);
  });

  test("clicking a selected picture again shows its popover and handle", async ({ page }) => {
    await editor(page, FIGURE);
    const picture = page.locator("orb-rich-text figure img");
    await picture.click();
    await expect.poll(() => popoverOpen(page)).toBe(true);

    await picture.click();
    await expect.poll(() => popoverOpen(page)).toBe(true);
    await expect(page.locator("orb-rich-text .media-handle")).toHaveCount(1);
  });
});
