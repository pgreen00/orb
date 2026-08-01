import { test, expect } from "@playwright/test";
import { mount } from "./utils";

test.describe("orb-button", () => {
  // Basic rendering test
  test("renders with text content", async ({ page }) => {
    await mount(page, "<orb-button>Hello world!</orb-button>");
    const button = page.locator("orb-button");

    await expect(button).toBeVisible();
    await expect(button).toContainText("Hello world!");
  });

  // Testing attributes and properties
  test("sets and reads attributes", async ({ page }) => {
    await mount(
      page,
      '<orb-button disabled="true" color="primary">Button</orb-button>',
    );
    const button = page.locator("orb-button");

    await expect(button).toHaveAttribute("disabled", "true");
    await expect(button).toHaveAttribute("color", "primary");

    // mount() already waited for the element to upgrade, so the JS property
    // getter is available.
    const isDisabled = await button.evaluate<any, any>((el) => el.disabled);
    expect(isDisabled).toBe(true);
  });
});
