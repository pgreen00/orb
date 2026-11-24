/**
 * The overlay's open and close. A close or a reopen can stop an animation that's
 * still running, and that must not leave an error in the page or a dialog open
 * when it should be closed.
 *
 * Firefox is skipped for now, like the grid: it hangs and takes 100% of a CPU
 * on the development machine.
 * Run with: npx playwright test tests/overlay.spec.ts --project=chromium --project=webkit
 */
import { test, expect, type Page } from "@playwright/test";
import { mount } from "./utils";


/** Counts the overlay's `orbPresent` and `orbDismiss` events from now on */
const count = (page: Page) =>
  page.evaluate(() => {
    const el = document.querySelector("#o")!;
    const counts = { present: 0, dismiss: 0 };
    (window as unknown as { counts: typeof counts }).counts = counts;
    el.addEventListener("orbPresent", () => counts.present++);
    el.addEventListener("orbDismiss", () => counts.dismiss++);
  });

const counts = (page: Page) =>
  page.evaluate(() => (window as unknown as { counts: { present: number; dismiss: number } }).counts);

/** Whether the overlay's own dialog is open */
const dialogOpen = (page: Page) =>
  page.evaluate(
    () => document.querySelector("#o")!.shadowRoot!.querySelector("dialog")!.open,
  );

const setOpen = (page: Page, open: boolean) =>
  page.evaluate(
    ({ open }) => ((document.querySelector("#o") as HTMLElement & { open: boolean }).open = open),
    { open },
  );

test.describe("overlay open and close", () => {
  let errors: string[];

  test.beforeEach(async ({ page }) => {
    errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await mount(page, `<orb-overlay id="o"><p>Body</p></orb-overlay>`);
    await count(page);
  });

  test("closing within 50 ms of opening closes once, with no errors", async ({ page }) => {
    await setOpen(page, true);
    await page.waitForTimeout(50);
    await setOpen(page, false);
    await expect.poll(() => counts(page)).toEqual({ present: 0, dismiss: 1 });
    expect(await dialogOpen(page)).toBe(false);
    expect(errors).toEqual([]);
  });

  test("reopening while it closes shows it again, presenting once more", async ({ page }) => {
    await setOpen(page, true);
    await expect.poll(() => counts(page)).toEqual({ present: 1, dismiss: 0 });
    await setOpen(page, false);
    await page.waitForTimeout(100);
    await setOpen(page, true);
    await expect.poll(() => counts(page)).toEqual({ present: 2, dismiss: 0 });
    await page.waitForTimeout(400);
    expect(await dialogOpen(page)).toBe(true);
    expect(await counts(page)).toEqual({ present: 2, dismiss: 0 });
    expect(errors).toEqual([]);
  });

  test("Escape closes it in one step", async ({ page }) => {
    await setOpen(page, true);
    await expect.poll(() => counts(page)).toEqual({ present: 1, dismiss: 0 });
    await page.keyboard.press("Escape");
    await expect.poll(() => counts(page)).toEqual({ present: 1, dismiss: 1 });
    expect(await dialogOpen(page)).toBe(false);
    expect(errors).toEqual([]);
  });

  test("a reopen during a close drops the role and data that close was given", async ({ page }) => {
    await page.evaluate(() => {
      const dismissed: unknown[] = [];
      (window as unknown as { dismissed: unknown[] }).dismissed = dismissed;
      document.querySelector("#o")!.addEventListener("orbDismiss", (event) => dismissed.push((event as CustomEvent).detail));
    });
    await setOpen(page, true);
    await expect.poll(() => counts(page)).toEqual({ present: 1, dismiss: 0 });
    await page.evaluate(() =>
      (document.querySelector("#o") as unknown as { hide(role?: string, data?: string): Promise<void> }).hide("save", "x"),
    );
    await page.waitForTimeout(50);
    await setOpen(page, true);
    await expect.poll(() => counts(page)).toEqual({ present: 2, dismiss: 0 });
    await page.keyboard.press("Escape");
    await expect.poll(() => counts(page)).toEqual({ present: 2, dismiss: 1 });
    // The close that was stopped had said "save", which no longer applies
    expect(await page.evaluate(() => (window as unknown as { dismissed: unknown[] }).dismissed)).toEqual([{}]);
    expect(errors).toEqual([]);
  });

  test("a click on the backdrop closes it in one step", async ({ page }) => {
    await setOpen(page, true);
    await expect.poll(() => counts(page)).toEqual({ present: 1, dismiss: 0 });
    // The corner is outside the dialog, so the click lands on the backdrop
    await page.mouse.click(5, 5);
    await expect.poll(() => counts(page)).toEqual({ present: 1, dismiss: 1 });
    expect(await dialogOpen(page)).toBe(false);
    expect(errors).toEqual([]);
  });
});
