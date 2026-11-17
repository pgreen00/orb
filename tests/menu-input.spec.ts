import { test, expect } from "@playwright/test";
import { mount } from "./utils";

test.describe("orb-menu attachInput", () => {
  test("an attached input drives an open menu, and Enter chooses the highlighted item", async ({ page }) => {
    await mount(
      page,
      `<input id="field" aria-label="Fruit">
       <orb-button id="open">Open</orb-button>
       <orb-menu id="menu" for="open">
         <orb-mi value="apple">Apple</orb-mi>
         <orb-mi value="banana">Banana</orb-mi>
       </orb-menu>`,
    );

    await page.evaluate(() => {
      const menu = document.getElementById("menu") as any;
      menu.attachInput(document.getElementById("field"));
      (window as any).chosen = null;
      menu.addEventListener("orbSelect", (ev: CustomEvent) => ((window as any).chosen = ev.detail.value));
    });

    await page.locator("#open").click();
    await expect(page.locator("#field")).toHaveAttribute("aria-expanded", "true");

    // Focus stays in the input while the menu is driven from it
    await page.locator("#field").focus();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");

    expect(await page.evaluate(() => (window as any).chosen)).toBe("banana");
    await expect(page.locator("#field")).toHaveAttribute("aria-expanded", "false");
  });
});
