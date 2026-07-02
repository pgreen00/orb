import { test, expect } from "@playwright/test";

test.describe("orb-button", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  // Basic rendering test
  test("renders with text content", async ({ page }) => {
    await page.setContent("<orb-button>Hello world!</orb-button>");
    const button = page.locator("orb-button");

    await expect(button).toBeVisible();
    await expect(button).toContainText("Hello world!");
  });

  // Testing attributes and properties
  test("sets and reads attributes", async ({ page }) => {
    await page.setContent(
      '<orb-button disabled="true" variant="primary">Button</orb-button>',
    );
    const button = page.locator("orb-button");

    await expect(button).toHaveAttribute("disabled", "true");
    await expect(button).toHaveAttribute("variant", "primary");

    // Test property access
    const isDisabled = await button.evaluate<any, any>((el) => el.disabled);
    expect(isDisabled).toBe(true);
  });
});
