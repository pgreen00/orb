/**
 * The calendar loading its events from a server: a source with an `href` asks for
 * the range on screen, once for each range. The server is a Playwright route, so
 * each request can be answered, held, or failed.
 *
 * Firefox is skipped for now, like the grid: it hangs and takes 100% of a CPU on
 * the development machine.
 * Run with: npx playwright test tests/calendar-sources.spec.ts --project=chromium --project=webkit
 *
 * Times are local, in America/New_York, and every date is built inside a test.
 */
import { test, expect, type Page, type Route } from "@playwright/test";
import { mount } from "./utils";

process.env.TZ = "America/New_York";
test.use({ timezoneId: "America/New_York" });

// An error on the page, such as an unhandled rejection, fails the spec that caused it
let pageErrors: string[] = [];
test.beforeEach(({ page }) => {
  pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
});
test.afterEach(() => {
  expect(pageErrors).toEqual([]);
});

/** Local time in June 2026. 0 is Sunday, June 7, so the week of June 8 is day 1. */
function date(day: number, hours = 0, minutes = 0): number {
  const d = new Date(2026, 5, 7);
  d.setDate(d.getDate() + day);
  d.setHours(hours, minutes, 0, 0);
  return d.getTime();
}

const calendar = (page: Page) => page.locator("orb-calendar");
const part = (page: Page, name: string) => calendar(page).locator(`[part~='${name}']`);

/** The week of June 8, without the sidebar, as attributes */
const WEEK = () => `view="week" date="${date(1)}" show-sidebar="false"`;

/** A source that loads from `/events/<id>`, with the placeholders written as the docs show them */
const source = (id: string, extra = "") =>
  `<orb-calendar-source id="${id}" name="${id}" color="primary" href="/events/${id}?start={start}&amp;end={end}" ${extra}></orb-calendar-source>`;

/** An event as the server answers it: its attributes, and its title as its text */
const served = (attrs: Record<string, string | number>, title: string) =>
  `<orb-calendar-event ${Object.entries(attrs)
    .map(([name, value]) => `${name}="${value}"`)
    .join(" ")}>${title}</orb-calendar-event>`;

/**
 * Routes the calendar's requests to `/events/...`. `answer` decides each one, by
 * fulfilling its route, or by holding the route to fulfill later. Returns the
 * requests, in order.
 */
async function serve(page: Page, answer: (url: URL, route: Route) => Promise<void> | void): Promise<URL[]> {
  const requests: URL[] = [];
  await page.route("**/events/**", async (route) => {
    const url = new URL(route.request().url());
    requests.push(url);
    await answer(url, route);
  });
  return requests;
}

const reply = (route: Route, body: string, status = 200) => route.fulfill({ status, contentType: "text/html", body });

/** Waits for two frames, so the calendar has read its children and drawn them */
const settle = (page: Page) =>
  page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));

/** Mounts the calendar in the week of June 8, with the given children */
const mountWeek = (page: Page, children: string) => mount(page, `<orb-calendar ${WEEK()}>${children}</orb-calendar>`);

/** The console warnings from now on, as their text */
function warnings(page: Page) {
  const messages: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "warning") messages.push(message.text());
  });
  return messages;
}

const hourHeight = (page: Page) =>
  page.evaluate(() => {
    const label = document.querySelector("orb-calendar")!.shadowRoot!.querySelector(".tg-hour-label") as HTMLElement | null;
    return label?.getBoundingClientRect().height ?? 0;
  });

/** Drags the first event block down by `dy` pixels, past interact's threshold */
async function dragDown(page: Page, dy: number) {
  const block = part(page, "event").first();
  await block.evaluate((el) => el.scrollIntoView({ block: "center" }));
  const box = await block.boundingBox();
  if (!box) throw new Error("no event block to drag");
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + 10, { steps: 2 });
  await page.mouse.move(x, y + dy, { steps: 12 });
  await page.mouse.up();
}

test.describe("calendar loading from a server", () => {
  test("on load, a source asks once, for the visible week, with the end exclusive", async ({ page }) => {
    const requests = await serve(page, (_url, route) =>
      reply(route, served({ id: "standup", start: date(1, 9), end: date(1, 10) }, "Standup")),
    );
    await mountWeek(page, source("work"));
    await expect(part(page, "event")).toHaveCount(1);
    expect(requests).toHaveLength(1);
    expect(requests[0].pathname).toBe("/events/work");
    expect(requests[0].searchParams.get("start")).toBe("2026-06-07T00:00-04:00");
    expect(requests[0].searchParams.get("end")).toBe("2026-06-14T00:00-04:00");
    // An event with no calendar-id joins the source that loaded it
    await expect(calendar(page).locator("orb-calendar-event#standup")).toHaveAttribute("calendar-id", "work");
  });

  test("moving to the next week asks for it, and going back to a loaded week asks for nothing", async ({ page }) => {
    const requests = await serve(page, (_url, route) => reply(route, ""));
    await mountWeek(page, source("work"));
    await expect.poll(() => requests.length).toBe(1);
    await calendar(page).locator("[aria-label='Next week']").click();
    await expect.poll(() => requests.length).toBe(2);
    await calendar(page).locator("[aria-label='Previous week']").click();
    await expect(calendar(page).locator(".title")).toHaveText("Jun 7 – Jun 13, 2026");
    await settle(page);
    expect(requests).toHaveLength(2);
    expect(requests[1].searchParams.get("start")).toBe("2026-06-14T00:00-04:00");
  });

  test("a week inside a month already loaded asks for nothing", async ({ page }) => {
    const requests = await serve(page, (_url, route) => reply(route, ""));
    await mount(
      page,
      `<orb-calendar view="month" date="${date(1)}" show-sidebar="false">${source("work")}</orb-calendar>`,
    );
    await expect.poll(() => requests.length).toBe(1);
    await calendar(page).locator(".view-switcher orb-radio").filter({ hasText: "Week" }).click();
    await expect(calendar(page).locator(".title")).toHaveText("Jun 7 – Jun 13, 2026");
    await settle(page);
    expect(requests).toHaveLength(1);
  });

  test("a hidden source asks for nothing until it's shown", async ({ page }) => {
    const requests = await serve(page, (_url, route) => reply(route, ""));
    await mountWeek(page, source("work", "hidden"));
    await settle(page);
    await page.waitForTimeout(100);
    expect(requests).toHaveLength(0);
    await page.evaluate(() => document.querySelector("orb-calendar-source#work")!.removeAttribute("hidden"));
    await expect.poll(() => requests.length).toBe(1);
  });

  test("a loaded event with the id of one already shown replaces it, and there's one element", async ({ page }) => {
    await serve(page, (_url, route) =>
      reply(route, served({ id: "dup", start: date(1, 9), end: date(1, 10) }, "Server")),
    );
    await mountWeek(page, served({ id: "dup", start: date(1, 9), end: date(1, 10) }, "Local") + source("work"));
    await expect(calendar(page).locator("orb-calendar-event#dup")).toHaveText("Server");
    await expect(calendar(page).locator("orb-calendar-event#dup")).toHaveCount(1);
  });

  test("a recurring event that started before the range draws its occurrences in it", async ({ page }) => {
    await serve(page, (_url, route) =>
      reply(
        route,
        served({ id: "daily", start: date(-6, 9), end: date(-6, 9, 30), recurrence: "FREQ=DAILY" }, "Daily"),
      ),
    );
    await mountWeek(page, source("work"));
    await expect(part(page, "event").filter({ hasText: "Daily" })).toHaveCount(7);
  });

  test("changing href removes the events the source loaded, keeps the user's, and asks again", async ({ page }) => {
    const requests = await serve(page, (url, route) =>
      reply(
        route,
        url.pathname === "/events/a"
          ? served({ id: "from-a", start: date(1, 9), end: date(1, 10) }, "From A")
          : served({ id: "from-b", start: date(1, 11), end: date(1, 12) }, "From B"),
      ),
    );
    await mountWeek(
      page,
      `<orb-calendar-source id="work" name="Work" color="primary" href="/events/a?start={start}&amp;end={end}"></orb-calendar-source>` +
        served({ id: "mine", start: date(3, 9), end: date(3, 10) }, "Mine"),
    );
    await expect(calendar(page).locator("orb-calendar-event#from-a")).toHaveCount(1);
    await page.evaluate(() =>
      document.querySelector("orb-calendar-source#work")!.setAttribute("href", "/events/b?start={start}&end={end}"),
    );
    await expect(calendar(page).locator("orb-calendar-event#from-b")).toHaveCount(1);
    await expect(calendar(page).locator("orb-calendar-event#from-a")).toHaveCount(0);
    await expect(calendar(page).locator("orb-calendar-event#mine")).toHaveCount(1);
    expect(requests.map((url) => url.pathname)).toEqual(["/events/a", "/events/b"]);
  });

  test("a slow answer for the old href, arriving after the change, is dropped", async ({ page }) => {
    const held: Route[] = [];
    const requests = await serve(page, async (url, route) => {
      if (url.pathname === "/events/slow") held.push(route);
      else await reply(route, served({ id: "fast", start: date(1, 9), end: date(1, 10) }, "Fast"));
    });
    await mountWeek(
      page,
      `<orb-calendar-source id="work" name="Work" color="primary" href="/events/slow?start={start}&amp;end={end}"></orb-calendar-source>`,
    );
    await expect.poll(() => held.length).toBe(1);
    await page.evaluate(() =>
      document.querySelector("orb-calendar-source#work")!.setAttribute("href", "/events/fast?start={start}&end={end}"),
    );
    await expect(calendar(page).locator("orb-calendar-event#fast")).toHaveCount(1);
    // The old request was stopped, so its answer can't arrive; if it did, it would be dropped
    void reply(held[0], served({ id: "slow", start: date(1, 11), end: date(1, 12) }, "Slow")).catch(() => undefined);
    await settle(page);
    await expect(calendar(page).locator("orb-calendar-event#slow")).toHaveCount(0);
    expect(requests.map((url) => url.pathname)).toEqual(["/events/slow", "/events/fast"]);
  });

  test("removing the source removes the events it loaded, and the user's stay", async ({ page }) => {
    await serve(page, (_url, route) => reply(route, served({ id: "standup", start: date(1, 9), end: date(1, 10) }, "Standup")));
    await mountWeek(page, source("work") + served({ id: "mine", start: date(3, 9), end: date(3, 10) }, "Mine"));
    await expect(part(page, "event")).toHaveCount(2);
    await page.evaluate(() => document.querySelector("orb-calendar-source#work")!.remove());
    await expect(part(page, "event")).toHaveCount(1);
    await expect(calendar(page).locator("orb-calendar-event#standup")).toHaveCount(0);
    await expect(calendar(page).locator("orb-calendar-event#mine")).toHaveCount(1);
  });

  test("removing the source stops its request, and a late answer draws nothing", async ({ page }) => {
    const held: Route[] = [];
    await serve(page, (_url, route) => {
      held.push(route);
    });
    await mountWeek(page, source("work"));
    await expect.poll(() => held.length).toBe(1);
    await page.evaluate(() => document.querySelector("orb-calendar-source#work")!.remove());
    await expect(calendar(page)).not.toHaveAttribute("aria-busy");
    void reply(held[0], served({ id: "late", start: date(1, 9), end: date(1, 10) }, "Late")).catch(() => undefined);
    await settle(page);
    await expect(calendar(page).locator("orb-calendar-event#late")).toHaveCount(0);
  });

  test("aria-busy is on the calendar while a request is pending, and off after it", async ({ page }) => {
    const held: Route[] = [];
    await serve(page, (_url, route) => {
      held.push(route);
    });
    await mountWeek(page, source("work"));
    await expect.poll(() => held.length).toBe(1);
    await expect(calendar(page)).toHaveAttribute("aria-busy", "true");
    await reply(held[0], served({ id: "standup", start: date(1, 9), end: date(1, 10) }, "Standup"));
    await expect(calendar(page)).not.toHaveAttribute("aria-busy");
  });

  test("a failed request warns and draws nothing, and the range is asked for again when it's shown", async ({
    page,
  }) => {
    const messages = warnings(page);
    let answers = 0;
    const requests = await serve(page, (_url, route) => {
      answers++;
      return answers === 1
        ? reply(route, "Down for maintenance", 500)
        : reply(route, served({ id: "standup", start: date(1, 9), end: date(1, 10) }, "Standup"));
    });
    await mountWeek(page, source("work"));
    await expect.poll(() => messages.some((text) => text.includes('could not load the events of "work"'))).toBe(true);
    await expect(part(page, "event")).toHaveCount(0);
    // Next asks for the following week, and going back asks for the failed one again
    await calendar(page).locator("[aria-label='Next week']").click();
    await expect.poll(() => requests.length).toBe(2);
    await calendar(page).locator("[aria-label='Previous week']").click();
    await expect.poll(() => requests.length).toBe(3);
    await expect(part(page, "event")).toHaveCount(1);
  });

  test("canceling orbSourceLoad makes no request, and the range isn't asked for again", async ({ page }) => {
    const requests = await serve(page, (_url, route) => reply(route, ""));
    await mountWeek(page, "");
    await page.evaluate(() => {
      const counter = { asked: 0 };
      (window as unknown as { counter: typeof counter }).counter = counter;
      document.querySelector("orb-calendar")!.addEventListener("orbSourceLoad", (event) => {
        counter.asked++;
        event.preventDefault();
      });
    });
    await page.evaluate(
      (markup) => document.querySelector("orb-calendar")!.insertAdjacentHTML("beforeend", markup),
      source("work"),
    );
    const asked = () => page.evaluate(() => (window as unknown as { counter: { asked: number } }).counter.asked);
    await expect.poll(asked).toBe(1);
    // A change to the source reads the children again, and the range is already counted as loaded
    await page.evaluate(() => document.querySelector("orb-calendar-source#work")!.setAttribute("name", "Renamed"));
    await settle(page);
    expect(await asked()).toBe(1);
    expect(requests).toHaveLength(0);
  });

  test("a response with a script, an event handler, and another element adds only the event", async ({ page }) => {
    const messages = warnings(page);
    await serve(page, (_url, route) =>
      reply(
        route,
        `<script>window.pwned = true</script>` +
          `<orb-calendar-event id="safe" start="${date(1, 9)}" end="${date(1, 10)}" onclick="window.pwned = true">Safe</orb-calendar-event>` +
          `<div>Stray</div>`,
      ),
    );
    await mountWeek(page, source("work"));
    await expect(part(page, "event")).toHaveCount(1);
    await expect(calendar(page).locator("orb-calendar-event#safe")).not.toHaveAttribute("onclick");
    expect(await page.evaluate(() => (window as unknown as { pwned?: boolean }).pwned)).toBeUndefined();
    expect(messages.some((text) => text.includes("aren't orb-calendar-event"))).toBe(true);
  });

  test("a loaded event can be dragged, and the change is written into it", async ({ page }) => {
    await serve(page, (_url, route) => reply(route, served({ id: "standup", start: date(1, 9), end: date(1, 10) }, "Standup")));
    await mountWeek(page, source("work"));
    await expect(part(page, "event")).toHaveCount(1);
    await page.evaluate(() => {
      const updates: unknown[] = [];
      (window as unknown as { updates: unknown[] }).updates = updates;
      document.querySelector("orb-calendar")!.addEventListener("orbEventUpdate", (event) => {
        updates.push((event as CustomEvent).detail.event.start);
      });
    });
    await dragDown(page, Math.round(await hourHeight(page)));
    await expect
      .poll(() => page.evaluate(() => (window as unknown as { updates: unknown[] }).updates.length))
      .toBe(1);
    await expect(calendar(page).locator("orb-calendar-event#standup")).toHaveAttribute("start", "2026-06-08T10:00-04:00");
  });

  test("a source without an href makes no request, and its own events still show", async ({ page }) => {
    const requests = await serve(page, (_url, route) => reply(route, ""));
    await mountWeek(
      page,
      `<orb-calendar-source id="local" name="Local" color="primary"></orb-calendar-source>` +
        served({ id: "mine", start: date(1, 9), end: date(1, 10), "calendar-id": "local" }, "Mine"),
    );
    await expect(part(page, "event")).toHaveCount(1);
    await settle(page);
    await page.waitForTimeout(100);
    expect(requests).toHaveLength(0);
  });

  test("exportICS covers the events that are loaded", async ({ page }) => {
    await serve(page, (_url, route) => reply(route, served({ id: "standup", start: date(1, 9), end: date(1, 10) }, "Standup")));
    await mountWeek(page, source("work"));
    await expect(calendar(page).locator("orb-calendar-event#standup")).toHaveCount(1);
    const ics = await page.evaluate(() =>
      (document.querySelector("orb-calendar") as unknown as { exportICS(): Promise<string> }).exportICS(),
    );
    expect(ics).toContain("UID:standup");
  });
});
