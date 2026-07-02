import type { Page } from "@playwright/test";

/**
 * Render markup into the test harness mount point (#root) and wait for every
 * orb-* component to auto-define.
 */
export async function mount(page: Page, html: string): Promise<void> {
  await page.goto("/e2e");
  await page.locator("#root").evaluate((el, markup) => {
    el.innerHTML = markup;
  }, html);
  await page.waitForFunction(
    () => !document.querySelector("#root :not(:defined)"),
  );
}
