/**
 * The calendar reads its event children's markup, so an event shows whether or
 * not its tag has a component behind it. This file leaves `orb-calendar-event`
 * undefined throughout, so every event in it is markup alone: attributes and
 * text, and nothing that reports its own changes.
 *
 * Run with: npx playwright test tests/calendar-undefined.spec.ts --project=chromium --project=webkit
 */
import { expect, type Page } from "@playwright/test";
import { test } from "./calendar-undefined.fixture";

process.env.TZ = "America/New_York";
test.use({ timezoneId: "America/New_York" });

/** Local time in June 2026. 0 is Sunday, June 7. */
function date(day: number, hours = 0, minutes = 0): number {
  const d = new Date(2026, 5, 7);
  d.setDate(d.getDate() + day);
  d.setHours(hours, minutes, 0, 0);
  return d.getTime();
}

const calendar = (page: Page) => page.locator("orb-calendar");
const part = (page: Page, name: string) => calendar(page).locator(`[part~='${name}']`);

test("an event without its component shows, and its attributes and text are read", async ({ page }) => {
  await page.goto("/tests");
  // The fixture stops the loader from defining the tag
  expect(await page.evaluate(() => !!customElements.get("orb-calendar-event"))).toBe(false);

  await page.locator("#root").evaluate(
    (root, markup) => {
      root.innerHTML = markup;
    },
    `<orb-calendar view="week" date="${date(1)}" show-sidebar="false">
      <orb-calendar-event id="one" start="${date(1, 9)}" end="${date(1, 10)}">One</orb-calendar-event>
    </orb-calendar>`,
  );
  await page.waitForFunction(() => !!customElements.get("orb-calendar"));
  await expect.poll(async () => calendar(page).locator("[part~='event']").count()).toBe(1);

  // Week view draws the name alone. The time is in the block's text, read by screen readers.
  const block = () => part(page, "event").filter({ hasText: "One" });
  await expect(block()).toContainText("9:00 AM");

  // Read from the attribute alone: nothing on the child reports the change. The
  // block's height is the one the grid sets for its time, a calc() of an hour
  const blockHeight = () =>
    part(page, "event").first().evaluate((el) => (el as HTMLElement).style.height);
  expect(await blockHeight()).toContain("(60 / 60)");
  await page.evaluate((end) => {
    document.querySelector("orb-calendar-event#one")!.setAttribute("end", end);
  }, date(1, 11));
  await expect.poll(blockHeight).toContain("(120 / 60)");
  await expect(block()).toContainText("9:00 AM");

  // And the title, from its text
  await page.evaluate(() => {
    document.querySelector("orb-calendar-event#one")!.textContent = "Renamed";
  });
  await expect(part(page, "event").filter({ hasText: "Renamed" })).toHaveCount(1);
});

test("all-day=\"false\" reads as timed before the element upgrades, as it does after", async ({ page }) => {
  await page.goto("/tests");
  await page.locator("#root").evaluate(
    (root, markup) => {
      root.innerHTML = markup;
    },
    `<orb-calendar view="week" date="${date(1)}" show-sidebar="false">
      <orb-calendar-event id="one" start="${date(1, 9)}" end="${date(1, 10)}" all-day="false">One</orb-calendar-event>
    </orb-calendar>`,
  );
  await page.waitForFunction(() => !!customElements.get("orb-calendar"));
  await expect.poll(async () => calendar(page).locator("[part~='event']").count()).toBe(1);
  await expect(calendar(page).locator("[part~='event--all-day']")).toHaveCount(0);
});
