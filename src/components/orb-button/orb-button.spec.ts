import { test, expect } from "@playwright/test";

test.describe("je-button", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  // Basic rendering test
  test("renders with text content", async ({ page }) => {
    await page.setContent("<je-button>Hello world!</je-button>");
    const button = page.locator("je-button");

    await expect(button).toBeVisible();
    await expect(button).toContainText("Hello world!");
  });

  // Testing attributes and properties
  test("sets and reads attributes", async ({ page }) => {
    await page.setContent(
      '<je-button disabled="true" variant="primary">Button</je-button>',
    );
    const button = page.locator("je-button");

    await expect(button).toHaveAttribute("disabled", "true");
    await expect(button).toHaveAttribute("variant", "primary");

    // Test property access
    const isDisabled = await button.evaluate<any, any>((el) => el.disabled);
    expect(isDisabled).toBe(true);
  });
});
