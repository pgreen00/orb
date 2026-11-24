/**
 * The calendar's specs: how it shows events, edits them, and reports the
 * changes. The calendar is given its data as `orb-calendar-source` and
 * `orb-calendar-event` children, as an app would write it.
 *
 * Firefox is skipped for now, like the grid: it hangs and takes 100% of a CPU
 * on the development machine.
 * Run with: npx playwright test tests/calendar*.spec.ts --project=chromium --project=webkit
 *
 * Times are local, in America/New_York. `new Date(...)` at the top of a spec
 * file runs in the runner's own time zone, not the browser's, so every date is
 * built inside a test, with `date()`.
 */
import { test, expect, type Page } from "@playwright/test";
import type {
  OrbCalendarEvent,
  OrbCalendarMutation,
  OrbCalendarRange,
} from "../dist/types/components";
import type { OrbCalendarSource } from "../src/components/calendar/utils/types";
import { mount } from "./utils";

// The specs build their dates in the runner, so it works in the same zone as
// the browser. `test.use` changes the browser only.
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

/**
 * Local time in June 2026. 0 is Sunday, June 7, so the week shown is June 7 to
 * 13, and the month is June. Days are stepped with `setDate`, so they stay at
 * midnight across a DST change.
 */
function date(day: number, hours = 0, minutes = 0): number {
  const d = new Date(2026, 5, 7);
  d.setDate(d.getDate() + day);
  d.setHours(hours, minutes, 0, 0);
  return d.getTime();
}

/** The same time one hour later, which is what a day of drag moves an event */
const plusHour = (epoch: number, hours = 1) => epoch + hours * 60 * 60 * 1000;

/**
 * Reads a time the way the markup writes it, through the calendar's own helper,
 * so written markup compares with the events behind it. It runs in the page, in
 * the browser's zone.
 */
const parseTime = (page: Page, value: string) =>
  page.evaluate(async (value) => {
    // @ts-expect-error the built bundle is served under /dist, and has no types at that path
    const { parseCalendarTime } = await import("/dist/components/index.js");
    return parseCalendarTime(value) as number;
  }, value);

/** One entry in `window.log`: what a listener got from an event, as plain values */
interface Logged {
  type: string;
  mutation?: OrbCalendarMutation;
  title?: string;
  /** Whether the event went on, which for a change means it's cancelable */
  written?: boolean;
  /** Whether the detail carried the event's element */
  hasElement?: boolean;
}

type CalendarElement = HTMLElement & { date: number | string };

const calendar = (page: Page) => page.locator("orb-calendar");
const part = (page: Page, name: string) => calendar(page).locator(`[part~='${name}']`);
/**
 * An editor field, by its label. The inputs carry their label in `aria-label`.
 * Matched exactly, so "Repeat" doesn't also find the "Repeat on" weekday group.
 */
const input = (page: Page, label: string) => page.getByLabel(label, { exact: true });
/** Clicks a button by its text, scrolling it into view first, since the editor scrolls. */
async function button(page: Page, label: string) {
  const target = calendar(page).locator(`orb-button:has-text("${label}")`);
  await target.scrollIntoViewIfNeeded();
  await target.click();
}

/** The week view opened on Monday, without the sidebar */
const week = () => ({ view: "week", date: date(1), "show-sidebar": "false" });

/** Clicks a point in a day's column of the time grid, to make an event there. */
async function clickSlot(page: Page, day: number) {
  const column = calendar(page).locator(".tg-col").nth(day);
  await column.scrollIntoViewIfNeeded();
  // The grid scrolls to `scroll-to-hour`, so the middle of the column is inside
  // the day, in the hours shown there
  await column.click({ position: { x: 20, y: 200 } });
}

/** The color an event block is drawn in */
const barColor = (page: Page, title: string) =>
  part(page, "event")
    .filter({ hasText: title })
    .evaluate((el) => {
      // The block holds a token, so a probe resolves it to the color drawn
      const probe = document.createElement("div");
      probe.style.color = getComputedStyle(el).getPropertyValue("--bar-color");
      document.body.append(probe);
      const value = getComputedStyle(probe).color;
      probe.remove();
      return value;
    });

/** An orb color token, as the browser draws it, so it can be compared with a block's color */
const orbColor = (page: Page, token: string) =>
  page.evaluate((token) => {
    const probe = document.createElement("div");
    probe.style.color = `var(--orb-${token})`;
    document.body.append(probe);
    const value = getComputedStyle(probe).color;
    probe.remove();
    return value;
  }, token);

/**
 * The markup for an event, as the calendar's own children carry it: attributes
 * for everything but the title, which is the text.
 */
function eventMarkup(event: Partial<OrbCalendarEvent>): string {
  const attributes: Record<string, string | undefined> = {
    id: event.id,
    start: event.start === undefined ? undefined : String(event.start),
    end: event.end === undefined ? undefined : String(event.end),
    "calendar-id": event.calendarId,
    location: event.location,
    notes: event.notes,
    url: event.url,
    color: event.color,
    recurrence: event.recurrence,
    "recurrence-parent-id": event.recurrenceParentId,
    "recurrence-id": event.recurrenceId === undefined ? undefined : String(event.recurrenceId),
  };
  const own = Object.entries(attributes)
    .filter(([, value]) => value !== undefined)
    .map(([name, value]) => `${name}="${value}"`);
  if (event.allDay) own.push("all-day");
  if (event.readonly) own.push("readonly");
  if (event.recurrenceExceptions?.length) {
    own.push(`recurrence-exceptions="${event.recurrenceExceptions.join(" ")}"`);
  }
  return `<orb-calendar-event ${own.join(" ")}>${event.title ?? ""}</orb-calendar-event>`;
}

/** The markup for a named calendar. A source's `id` is its element's id. */
function sourceMarkup(source: OrbCalendarSource): string {
  const own = [`id="${source.id}"`, `name="${source.name}"`, `color="${source.color}"`];
  if (source.hidden) own.push("hidden");
  return `<orb-calendar-source ${own.join(" ")}></orb-calendar-source>`;
}

/**
 * Mounts one calendar with its sources and events as children, as markup. Only
 * the attributes it's given are set, so the element's defaults apply.
 */
async function mountCalendar(
  page: Page,
  attrs: Record<string, string | number | boolean>,
  events: Partial<OrbCalendarEvent>[] = [],
  calendars: OrbCalendarSource[] = [],
) {
  const markup = Object.entries(attrs)
    .map(([name, value]) => `${name}="${value}"`)
    .join(" ");
  const children = [...calendars.map(sourceMarkup), ...events.map(eventMarkup)].join("");
  await mount(page, `<orb-calendar ${markup}>${children}</orb-calendar>`);
  // Two frames: the calendar reads its children, then renders them
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}


/**
 * The calendar's event children, as plain data: what an app would see in its
 * markup. `start` and `end` keep the attribute's own text, so the written
 * format is compared too.
 */
const markupEvents = (page: Page) =>
  page.evaluate(() =>
    Array.from(document.querySelector("orb-calendar")!.querySelectorAll("orb-calendar-event"))
      .map((el) => ({
        id: el.id,
        title: el.textContent ?? "",
        start: el.getAttribute("start"),
        end: el.getAttribute("end"),
        allDay: el.hasAttribute("all-day"),
        recurrence: el.getAttribute("recurrence"),
        exceptions: (el.getAttribute("recurrence-exceptions") ?? "").split(/\s+/).filter(Boolean),
        parent: el.getAttribute("recurrence-parent-id"),
        occurrence: el.getAttribute("recurrence-id"),
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
  );

/** How many drawn events carry a title, which for a series is once per occurrence */
const occurrenceCount = (page: Page, title: string) =>
  page.evaluate(
    (title) =>
      Array.from(
        document.querySelector("orb-calendar")!.shadowRoot!.querySelectorAll("[part~='event']"),
      ).filter((el) => (el.textContent ?? "").includes(title)).length,
    title,
  );

/**
 * Keeps the events named in `names` in `window.log`, as plain values, so the
 * specs read them all at once after the page settles. Source toggles go in
 * `window.toggles`, without their element, so they compare as plain data.
 */
const watch = (page: Page, ...names: string[]) =>
  page.evaluate((names) => {
    const log: Logged[] = [];
    const toggles: { id: string; name: string; hidden: boolean }[] = [];
    (window as unknown as { log: Logged[] }).log = log;
    (window as unknown as { toggles: typeof toggles }).toggles = toggles;
    for (const name of names) {
      document.querySelector("orb-calendar")!.addEventListener(name, (event) => {
        const detail = (event as CustomEvent).detail ?? {};
        if (detail.hidden != null) {
          toggles.push({ id: detail.id, name: detail.name, hidden: detail.hidden });
          return;
        }
        const entry: Logged = { type: name };
        entry.written = (event as Event).defaultPrevented === false;
        entry.hasElement = detail.element instanceof HTMLElement;
        if (detail.event) {
          entry.mutation = {
            event: {
              id: detail.event.id,
              title: detail.event.title,
              start: detail.event.start,
              end: detail.event.end,
              allDay: detail.event.allDay,
              calendarId: detail.event.calendarId,
              location: detail.event.location,
              notes: detail.event.notes,
              url: detail.event.url,
              recurrence: detail.event.recurrence,
              recurrenceExceptions: detail.event.recurrenceExceptions,
              recurrenceParentId: detail.event.recurrenceParentId,
              recurrenceId: detail.event.recurrenceId,
              color: detail.event.color,
            },
            occurrenceStart: detail.occurrenceStart,
            scope: detail.scope,
          };
        }
        if (detail.occurrence) entry.title = detail.occurrence.event.title;
        log.push(entry);
      });
    }
  }, names);

/** Reads `window.log`, which `watch` fills */
const log = (page: Page) =>
  page.evaluate(() => (window as unknown as { log: Logged[] }).log) as Promise<Logged[]>;

/**
 * Counts the change events from now on, in the page, so a spec can wait for the
 * one a click saves before it reads the markup.
 */
const captureChanges = (page: Page) =>
  page.evaluate(() => {
    const events: string[] = [];
    (window as unknown as { changeLog: string[] }).changeLog = events;
    const cal = document.querySelector("orb-calendar")!;
    for (const type of ["orbEventUpdate", "orbEventDelete", "orbEventCreate"]) {
      cal.addEventListener(type, () => events.push(type));
    }
  });


/**
 * Clicks a button in the editor or the scope prompt, then waits for the change
 * it makes after `from` changes so far. Pressing Save on a recurring event makes
 * no change until a scope is chosen, so that answer is clicked here instead.
 */
async function buttonThenChange(page: Page, label: string, from: number) {
  await button(page, label);
  await page.waitForFunction(
    (from) => (window as unknown as { changeLog: string[] }).changeLog.length > from,
    from,
  );
}

/** Runs `applyEventChange`, from the built bundle, on `events` in the page */
const apply = (
  page: Page,
  events: OrbCalendarEvent[],
  mutation: OrbCalendarMutation,
  kind: "create" | "update" | "delete",
) =>
  page.evaluate(
    async ({ events, mutation, kind }) => {
      // @ts-expect-error the built bundle is served under /dist, and has no types at that path
      const { applyEventChange } = await import("/dist/components/index.js");
      return applyEventChange(events, mutation, kind);
    },
    { events, mutation, kind },
  ) as Promise<OrbCalendarEvent[]>;

/** Runs a method on the calendar, the way an app would */
const call = <T = void>(page: Page, method: string, ...args: unknown[]) =>
  page.evaluate(
    ({ method, args }) => {
      const cal = document.querySelector("orb-calendar") as unknown as Record<
        string,
        (...rest: unknown[]) => unknown
      >;
      return cal[method](...args);
    },
    { method, args },
  ) as Promise<T>;

/** The height the grid gives one hour, which is also the distance for an hour of drag */
const hourHeight = (page: Page) =>
  page.evaluate(() => {
    const label = document
      .querySelector("orb-calendar")!
      .shadowRoot!.querySelector(".tg-hour-label") as HTMLElement | null;
    return label?.getBoundingClientRect().height ?? 0;
  });

/** Drags the first event block down by `dy` pixels, past interact's threshold */
async function dragEvent(page: Page, dy: number, block = part(page, "event").first()) {
  // Centred in view, so the whole move fits on screen: the page scrolls, since the
  // harness gives the calendar no height of its own
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

test.describe("calendar applyEventChange", () => {
  // A one-hour event every day at 9, from Sunday
  const series = (): OrbCalendarEvent => ({
    id: "a",
    title: "A",
    start: date(0, 9),
    end: date(0, 10),
    recurrence: "FREQ=DAILY",
  });
  /** The same event at 11, as an edit moves it */
  const moved = (over: Partial<OrbCalendarEvent> = {}): OrbCalendarEvent => ({
    ...series(),
    start: date(0, 11),
    end: date(0, 12),
    ...over,
  });
  /** Tuesday's occurrence, two days after the master's start */
  const tuesday = date(2, 9);
  test.beforeEach(async ({ page }) => {
    await mount(page, "");
  });

  test("create adds the event at the end", async ({ page }) => {
    const next = await apply(
      page,
      [
        { id: "a", title: "A", start: date(1, 9), end: date(1, 10) },
        { id: "b", title: "B", start: date(1, 11), end: date(1, 12) },
      ],
      { event: { id: "c", title: "C", start: date(1, 13), end: date(1, 14) }, scope: "single" },
      "create",
    );
    expect(next.map((e) => e.id)).toEqual(["a", "b", "c"]);
    expect(next[2].title).toBe("C");
  });

  test("update with single replaces the event, and leaves the input alone", async ({ page }) => {
    const events = [series()];
    const next = await apply(page, events, { event: moved({ title: "A2" }), scope: "single" }, "update");
    expect(next).toHaveLength(1);
    expect(next[0]).toMatchObject({ id: "a", title: "A2", start: date(0, 11) });
    expect(events[0].title).toBe("A");
  });

  test("update with occurrence adds an override, named after its master and its start", async ({
    page,
  }) => {
    const next = await apply(
      page,
      [series()],
      { event: moved({ title: "Moved", start: tuesday + 2 * 60 * 60 * 1000, end: tuesday + 3 * 60 * 60 * 1000 }), scope: "occurrence", occurrenceStart: tuesday },
      "update",
    );
    expect(next).toHaveLength(2);
    expect(next[1]).toMatchObject({
      id: `a::${tuesday}`,
      title: "Moved",
      recurrenceParentId: "a",
      recurrenceId: tuesday,
    });
    expect(next[1].recurrence).toBeUndefined();
    expect(next[0].recurrence).toBe("FREQ=DAILY");
  });

  test("update with occurrence replaces an existing override", async ({ page }) => {
    const override = moved({
      id: `a::${tuesday}`,
      title: "Old",
      recurrenceParentId: "a",
      recurrenceId: tuesday,
    });
    const next = await apply(
      page,
      [series(), override],
      { event: { ...override, title: "New" }, scope: "occurrence", occurrenceStart: tuesday },
      "update",
    );
    expect(next).toHaveLength(2);
    expect(next.filter((e) => e.id === override.id)).toHaveLength(1);
    expect(next[1]).toMatchObject({ id: override.id, title: "New" });
  });

  test("delete with single removes the event", async ({ page }) => {
    const next = await apply(
      page,
      [series()],
      { event: series(), scope: "single" },
      "delete",
    );
    expect(next).toEqual([]);
  });

  test("delete with occurrence adds the start to the master's exceptions", async ({ page }) => {
    const existing = tuesday;
    const event = { ...series(), recurrenceExceptions: [existing] };
    const next = await apply(
      page,
      [event],
      { event, scope: "occurrence", occurrenceStart: tuesday },
      "delete",
    );
    expect(next).toHaveLength(1);
    expect(next[0].recurrenceExceptions).toEqual([existing, tuesday]);
  });

  test("delete with future moves overrides before the split, and ends the old series", async ({
    page,
  }) => {
    const before = moved({
      id: `a::${date(0, 9)}`,
      title: "Before",
      recurrenceParentId: "a",
      recurrenceId: date(0, 9),
    });
    const after = moved({
      id: `a::${tuesday}`,
      title: "After",
      recurrenceParentId: "a",
      recurrenceId: tuesday,
    });
    const next = await apply(
      page,
      [series(), before, after],
      { event: series(), scope: "future", occurrenceStart: tuesday },
      "delete",
    );
    expect(next.map((e) => e.id).sort()).toEqual(["a", before.id].sort());
    // The rule ends a second before the occurrence, written with the wall
    // clock's fields as if they were UTC, which is what rrule reads back as
    // local time. Here that's 08:59:59 on June 9.
    expect(next[0].recurrence).toBe("FREQ=DAILY;UNTIL=20260609T085959Z");
  });

  test("delete with all removes the master and every override", async ({ page }) => {
    const override = moved({
      id: `a::${date(0, 9)}`,
      recurrenceParentId: "a",
      recurrenceId: date(0, 9),
    });
    const next = await apply(
      page,
      [series(), override],
      { event: override, scope: "all", occurrenceStart: date(0, 9) },
      "delete",
    );
    expect(next).toEqual([]);
  });

  test("update with all keeps the master's rule, and places the change where it now falls", async ({
    page,
  }) => {
    // "All" moves the master by the change's start minus the occurrence's
    // start, which is a day at the same hour, so the 9:00 series moves to
    // 11:00, starting on its first day
    const next = await apply(
      page,
      [series()],
      {
        event: { ...series(), title: "Renamed", start: tuesday + 2 * 60 * 60 * 1000, end: tuesday + 3 * 60 * 60 * 1000 },
        scope: "all",
        occurrenceStart: tuesday,
      },
      "update",
    );
    expect(next[0]).toMatchObject({
      id: "a",
      title: "Renamed",
      recurrence: "FREQ=DAILY",
      start: date(0, 11),
      end: date(0, 12),
    });
  });

  test("update with future splits the series, and moves later overrides to the new master", async ({
    page,
  }) => {
    const later = moved({
      id: `a::${date(3, 9)}`,
      title: "Later",
      recurrenceParentId: "a",
      recurrenceId: date(3, 9),
    });
    const earlier = moved({
      id: `a::${date(0, 9)}`,
      title: "Earlier",
      recurrenceParentId: "a",
      recurrenceId: date(0, 9),
    });
    const split = { ...moved({ title: "Split" }), start: tuesday + 2 * 60 * 60 * 1000, end: tuesday + 3 * 60 * 60 * 1000 };
    const next = await apply(
      page,
      [series(), later, earlier],
      { event: split, scope: "future", occurrenceStart: tuesday },
      "update",
    );
    const splitId = `a:${tuesday}`;
    const newMaster = next.find((e) => e.id === splitId);
    expect(newMaster).toMatchObject({ title: "Split", recurrence: "FREQ=DAILY" });
    // The moved override points at the new master, and the one before doesn't
    expect(next.find((e) => e.id === later.id)?.recurrenceParentId).toBe(splitId);
    expect(next.find((e) => e.id === earlier.id)?.recurrenceParentId).toBe("a");
    expect(next.find((e) => e.id === "a")?.recurrence).toContain("UNTIL=");
  });
});

test.describe("calendar rendering", () => {
  const SOURCES: OrbCalendarSource[] = [
    { id: "work", name: "Work", color: "primary" },
    { id: "home", name: "Home", color: "success" },
  ];
  const EVENTS = (): OrbCalendarEvent[] => [
    { id: "standup", title: "Standup", start: date(1, 9), end: date(1, 9, 30), calendarId: "work" },
    { id: "lunch", title: "Lunch", start: date(2, 12), end: date(2, 13), calendarId: "home" },
    { id: "locked", title: "Locked", start: date(2, 14), end: date(2, 15), calendarId: "work", readonly: true },
  ];

  test("a week view shows each timed event once", async ({ page }) => {
    await mountCalendar(page, week(), EVENTS());
    await expect(part(page, "event")).toHaveCount(3);
    await expect(part(page, "event").filter({ hasText: "Standup" })).toHaveCount(1);
    await expect(part(page, "grid")).toBeVisible();
  });

  test("a month view shows timed events as pills and multi-day events as bars", async ({ page }) => {
    const events = [
      ...EVENTS(),
      { id: "conf", title: "Conference", start: date(2), end: date(5), allDay: true, calendarId: "work" },
    ];
    await mountCalendar(page, { ...week(), view: "month" }, events);
    // Whole weeks from the first day of June to the last, which is five weeks here
    await expect(part(page, "day-cell")).toHaveCount(35);
    await expect(part(page, "event").filter({ hasText: "Conference" })).toHaveClass(/event-bar/);
    await expect(part(page, "event").filter({ hasText: "Standup" })).toHaveClass(/event-pill/);
  });

  test("a recurring event shows an occurrence for each day, without its exceptions", async ({
    page,
  }) => {
    const events: OrbCalendarEvent[] = [
      {
        id: "daily",
        title: "Daily",
        start: date(0, 8),
        end: date(0, 8, 30),
        recurrence: "FREQ=DAILY;COUNT=20",
        recurrenceExceptions: [date(3, 8)],
      },
    ];
    await mountCalendar(page, week(), events);
    await expect(part(page, "event").filter({ hasText: "Daily" })).toHaveCount(6);
  });

  test("an override replaces its occurrence", async ({ page }) => {
    const events: OrbCalendarEvent[] = [
      { id: "daily", title: "Daily", start: date(0, 8), end: date(0, 8, 30), recurrence: "FREQ=DAILY;COUNT=20" },
      {
        id: `daily::${date(2, 8)}`,
        title: "Moved",
        start: date(2, 11),
        end: date(2, 11, 30),
        recurrenceParentId: "daily",
        recurrenceId: date(2, 8),
      },
    ];
    await mountCalendar(page, week(), events);
    await expect(part(page, "event").filter({ hasText: "Moved" })).toHaveCount(1);
    await expect(part(page, "event").filter({ hasText: "Daily" })).toHaveCount(6);
  });

  test("an all-day event in a week view fills the all-day row", async ({ page }) => {
    await mountCalendar(page, week(), [
      { id: "holiday", title: "Holiday", start: date(1), end: date(2), allDay: true },
    ]);
    await expect(part(page, "all-day-row").locator("[part~='event']")).toHaveText("Holiday");
  });

  test("an event takes its calendar's color", async ({ page }) => {
    await mountCalendar(page, week(), EVENTS(), SOURCES);
    expect(await barColor(page, "Standup")).toEqual(await orbColor(page, "primary-500"));
    expect(await barColor(page, "Lunch")).toEqual(await orbColor(page, "success-500"));
  });

  test("an event's own color wins over its calendar's", async ({ page }) => {
    await mountCalendar(page, week(), [{ ...EVENTS()[0], color: "danger" }], SOURCES);
    expect(await barColor(page, "Standup")).toEqual(await orbColor(page, "danger-500"));
  });

  test("the sidebar lists the calendars, and unchecking one hides its events", async ({ page }) => {
    await mountCalendar(page, { ...week(), "show-sidebar": "true" }, EVENTS(), SOURCES);
    const list = calendar(page).locator("[part~='calendar-list']");
    await expect(list.locator("orb-checkbox")).toHaveCount(2);
    await expect(part(page, "event")).toHaveCount(3);
    await list.getByText("Work", { exact: true }).click();
    await expect(part(page, "event")).toHaveCount(1);
    await expect(part(page, "event")).toHaveText(/Lunch/);
  });

  test("unchecking a calendar says which one, and what it becomes", async ({ page }) => {
    await mountCalendar(page, { ...week(), "show-sidebar": "true" }, EVENTS(), SOURCES);
    await watch(page, "orbSourceToggle");
    const list = calendar(page).locator("[part~='calendar-list']");
    await list.getByText("Work", { exact: true }).click();
    await expect(part(page, "event")).toHaveCount(1);

    await list.getByText("Work", { exact: true }).click();
    await expect(part(page, "event")).toHaveCount(3);

    // One for each change, with the state it changed to
    expect(await page.evaluate(() => (window as unknown as { toggles: unknown[] }).toggles)).toEqual([
      { id: "work", name: "Work", hidden: true },
      { id: "work", name: "Work", hidden: false },
    ]);
  });

  test("canceling a toggle keeps the calendar as it was", async ({ page }) => {
    await mountCalendar(page, { ...week(), "show-sidebar": "true" }, EVENTS(), SOURCES);
    await page.evaluate(() =>
      document.querySelector("orb-calendar")!.addEventListener("orbSourceToggle", (event) => {
        (window as unknown as { attempted: boolean }).attempted = true;
        event.preventDefault();
      }),
    );
    const list = calendar(page).locator("[part~='calendar-list']");
    await list.getByText("Work", { exact: true }).click();

    // The events stay, and the checkbox goes back to checked
    await expect(part(page, "event")).toHaveCount(3);
    expect(await page.evaluate(() => (window as unknown as { attempted: boolean }).attempted)).toBe(true);
    const checked = await list
      .locator("orb-checkbox")
      .first()
      .evaluate((el) => (el as unknown as { checked: unknown }).checked);
    expect(String(checked)).toBe("true");
  });

  test("a calendar that starts hidden shows no events", async ({ page }) => {
    await mountCalendar(page, { ...week(), "show-sidebar": "true" }, EVENTS(), [
      { ...SOURCES[0], hidden: true },
      SOURCES[1],
    ]);
    await expect(part(page, "event")).toHaveCount(1);
  });

  test("the header names the range, and the view switcher changes the view", async ({ page }) => {
    await mountCalendar(page, week(), EVENTS());
    await expect(calendar(page).locator(".title")).toHaveText("Jun 7 – Jun 13, 2026");
    await calendar(page).locator(".view-switcher orb-radio").filter({ hasText: "Day" }).click();
    await expect(calendar(page)).toHaveAttribute("view", "day");
    await expect(calendar(page).locator(".title")).toHaveText("Monday, June 8, 2026");
  });
});

test.describe("calendar reading its children", () => {
  /** A calendar in the week view, with the markup given as its children */
  const mountWith = (page: Page, children: string) =>
    mount(page, `<orb-calendar ${Object.entries(week()).map(([k, v]) => `${k}="${v}"`).join(" ")}>${children}</orb-calendar>`);

  const one = (over: Partial<OrbCalendarEvent> = {}) =>
    eventMarkup({ id: "one", title: "One", start: date(1, 9), end: date(1, 10), ...over });

  /** Adds a child to the calendar, or changes one, the way an app does */
  const run = (page: Page, source: string) => page.evaluate(source);

  test("an event added later shows up", async ({ page }) => {
    await mountWith(page, one());
    await expect(part(page, "event")).toHaveCount(1);
    await run(page, `
      const cal = document.querySelector("orb-calendar");
      cal.insertAdjacentHTML("beforeend", ${JSON.stringify(eventMarkup({ id: "two", title: "Two", start: date(2, 9), end: date(2, 10) }))});
    `);
    await expect(part(page, "event")).toHaveCount(2);
    await expect(part(page, "event").filter({ hasText: "Two" })).toHaveCount(1);
  });

  test("removing an event's element removes it from the view", async ({ page }) => {
    await mountWith(page, one() + eventMarkup({ id: "two", title: "Two", start: date(2, 9), end: date(2, 10) }));
    await expect(part(page, "event")).toHaveCount(2);
    await run(page, `document.querySelector("orb-calendar-event#one").remove()`);
    await expect(part(page, "event")).toHaveCount(1);
    await expect(part(page, "event").filter({ hasText: "One" })).toHaveCount(0);
  });

  test("an attribute edit, a property, and the text each update the view", async ({ page }) => {
    await mountWith(page, one());
    // Week view draws the name alone. The times are in the block's text, read by screen readers.
    const block = () => part(page, "event").filter({ hasText: "One" });
    await expect(block()).toContainText("9:00 AM");

    // The attribute, as markup or a setAttribute changes it
    await run(page, `document.querySelector("orb-calendar-event#one").setAttribute("start", "${date(1, 11)}")`);
    await expect(block()).toContainText("11:00 AM");

    // The property, from JavaScript, which the element reports as its data changes.
    // It isn't written to the attribute, so the markup stays the app's own: the
    // event is read again, from the property for what it holds, and from the
    // attribute for the rest
    await run(page, `document.querySelector("orb-calendar-event#one").end = ${date(1, 12)}`);
    await run(page, `document.querySelector("orb-calendar-event#one").textContent = "Still one"`);
    await expect(part(page, "event").filter({ hasText: "Still one" })).toHaveCount(1);
    expect(await page.evaluate(() => document.querySelector("orb-calendar-event#one")!.getAttribute("end"))).toBe(
      `${date(1, 10)}`,
    );

    // The title is the element's text
    await run(page, `document.querySelector("orb-calendar-event#one").textContent = "Renamed"`);
    await expect(part(page, "event").filter({ hasText: "Renamed" })).toHaveCount(1);
  });

  test("unchecking a calendar writes hidden on its source, and removing it checks the box again", async ({
    page,
  }) => {
    await mountCalendar(
      page,
      { ...week(), "show-sidebar": "true" },
      [{ id: "a", title: "A", start: date(1, 9), end: date(1, 10), calendarId: "work" }],
      [{ id: "work", name: "Work", color: "primary" }],
    );
    const list = calendar(page).locator("[part~='calendar-list']");
    const checkbox = list.locator("orb-checkbox").first();
    await expect(part(page, "event")).toHaveCount(1);

    await list.getByText("Work", { exact: true }).click();
    await expect(calendar(page).locator("orb-calendar-source#work")).toHaveAttribute("hidden", "");
    await expect(part(page, "event")).toHaveCount(0);

    // The app checks it again by taking `hidden` off its element
    await run(page, `document.querySelector("orb-calendar-source#work").removeAttribute("hidden")`);
    await expect(part(page, "event")).toHaveCount(1);
    expect(await checkbox.evaluate((el) => String((el as unknown as { checked: unknown }).checked))).toBe(
      "true",
    );
  });

  test("a later event with the same id replaces the earlier one", async ({ page }) => {
    const warnings: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "warning") warnings.push(message.text());
    });
    await mountWith(
      page,
      one({ title: "First" }) + one({ title: "Second", start: date(1, 11), end: date(1, 12) }),
    );
    // One block, drawn where the later child puts it
    await expect(part(page, "event").filter({ hasText: "Second" })).toHaveCount(1);
    await expect(part(page, "event").filter({ hasText: "First" })).toHaveCount(0);
    await expect.poll(() => warnings.some((w) => w.includes('more than one event has the id "one"'))).toBe(
      true,
    );
  });

  test("an event without an id still shows, and can't be opened for editing", async ({ page }) => {
    await mountWith(
      page,
      eventMarkup({ title: "Unnamed", start: date(1, 9), end: date(1, 10) }),
    );
    await expect(part(page, "event").filter({ hasText: "Unnamed" })).toHaveCount(1);
    await part(page, "event").filter({ hasText: "Unnamed" }).click();
    await expect(calendar(page).locator(".editor")).toHaveCount(0);
  });

  test("date as an ISO date opens that week, and Next moves on from it", async ({ page }) => {
    await mount(
      page,
      `<orb-calendar view="week" date="2026-06-08" show-sidebar="false">
        ${eventMarkup({ id: "one", title: "One", start: date(1, 9), end: date(1, 10) })}
      </orb-calendar>`,
    );
    await expect(calendar(page).locator(".title")).toHaveText("Jun 7 – Jun 13, 2026");
    await expect(part(page, "event")).toHaveCount(1);
    await calendar(page).locator("[aria-label='Next week']").click();
    await expect(calendar(page).locator(".title")).toHaveText("Jun 14 – Jun 20, 2026");
    // Moved as a number, the same as before
    expect(await page.evaluate(() => typeof (document.querySelector("orb-calendar") as unknown as { date: unknown }).date)).toBe(
      "number",
    );
  });
});

test.describe("calendar editor", () => {
  const meeting = (): OrbCalendarEvent[] => [
    { id: "meeting", title: "Meeting", start: date(1, 9), end: date(1, 10), location: "Room 1", notes: "Agenda" },
  ];

  test("a click on an empty slot opens an hour-long event, and saving creates it", async ({
    page,
  }) => {
    await mountCalendar(page, week(), meeting());
    await watch(page, "orbEventCreate");
    await clickSlot(page, 1);
    await expect(calendar(page).locator(".editor")).toBeVisible();
    await input(page, "Title").fill("New meeting");
    await button(page, "Save");
    const [created] = await log(page);
    expect(created.mutation).toMatchObject({
      scope: "single",
      event: { title: "New meeting", allDay: false },
    });
    // The calendar names what it writes, so the event has an id of its own
    expect(created.mutation!.event.id).toMatch(/^event-[a-z0-9]+-\d+$/);
    const { start, end } = created.mutation!.event;
    expect(end - start).toBe(60 * 60 * 1000);
    // The click's point, snapped to a quarter hour, on Monday
    const offset = start - date(1);
    expect(offset).toBeGreaterThanOrEqual(0);
    expect(offset).toBeLessThanOrEqual(24 * 60 * 60 * 1000 - 60 * 60 * 1000);
    expect(offset % (15 * 60 * 1000)).toBe(0);
    await expect(calendar(page).locator(".editor")).toHaveCount(0);
  });

  test("a click on a month day makes an all-day event for that day", async ({ page }) => {
    await mountCalendar(page, { ...week(), view: "month" }, []);
    await watch(page, "orbEventCreate");
    const day = part(page, "day-cell").filter({ has: page.locator(".day-number", { hasText: /^17$/ }) });
    const cell = day.first();
    await cell.scrollIntoViewIfNeeded();
    // A point in the cell's own padding, clear of the date and the pills, so
    // the day is chosen rather than an event
    await cell.click({ position: { x: 4, y: 4 } });
    await input(page, "Title").fill("Holiday");
    await button(page, "Save");
    const [created] = await log(page);
    // The 17th, from midnight to the next midnight
    expect(created.mutation!.event).toMatchObject({
      title: "Holiday",
      allDay: true,
      start: date(10),
    });
    expect(created.mutation!.event.end).toBe(date(11));
  });

  test("editing an event and saving sends the whole event", async ({ page }) => {
    await mountCalendar(page, week(), meeting());
    await watch(page, "orbEventUpdate");
    await part(page, "event").filter({ hasText: "Meeting" }).click();
    await expect(input(page, "Title")).toHaveValue("Meeting");
    await expect(input(page, "Location")).toHaveValue("Room 1");
    await expect(input(page, "Notes")).toHaveValue("Agenda");
    await input(page, "Title").fill("Design review");
    await button(page, "Save");
    const [updated] = await log(page);
    expect(updated.mutation).toMatchObject({
      scope: "single",
      event: {
        id: "meeting",
        title: "Design review",
        start: date(1, 9),
        end: date(1, 10),
        location: "Room 1",
        notes: "Agenda",
      },
    });
  });

  test("changing the start keeps the duration, and the end sets its own", async ({ page }) => {
    await mountCalendar(page, week(), meeting());
    await watch(page, "orbEventUpdate");
    await part(page, "event").filter({ hasText: "Meeting" }).click();
    // Set and changed together, since each change re-renders the editor
    await input(page, "Starts").evaluate((el) => {
      (el as HTMLInputElement).value = "2026-06-09T13:00";
      el.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await expect(input(page, "Ends")).toHaveValue("2026-06-09T14:00");
    await input(page, "Ends").evaluate((el) => {
      (el as HTMLInputElement).value = "2026-06-09T16:00";
      el.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await button(page, "Save");
    const [updated] = await log(page);
    expect(updated.mutation!.event).toMatchObject({ start: date(2, 13), end: date(2, 16) });
  });

  test("All-day toggles back and forth, saved each time", async ({ page }) => {
    await mountCalendar(page, week(), meeting());
    // Nothing to apply here: the calendar writes each save into its own event, so
    // the next edit opens what the last one saved
    await page.evaluate(() => {
      const saved: boolean[] = [];
      (window as unknown as { saved: boolean[] }).saved = saved;
      document.querySelector("orb-calendar")!.addEventListener("orbEventUpdate", (event) => {
        saved.push((event as CustomEvent<OrbCalendarMutation>).detail.event.allDay === true);
      });
    });
    const openAndToggle = async () => {
      const before = await page.evaluate(
        () => (window as unknown as { saved: boolean[] }).saved.length,
      );
      await part(page, "event").filter({ hasText: "Meeting" }).first().click();
      // The editor draws its toggle when the overlay opens, a frame or so after the click
      const toggle = calendar(page).locator("orb-toggle");
      await toggle.waitFor();
      await page.waitForTimeout(100);
      await toggle.click();
      await button(page, "Save");
      await expect(calendar(page).locator(".editor")).toHaveCount(0);
      await expect
        .poll(() => page.evaluate(() => (window as unknown as { saved: boolean[] }).saved.length))
        .toBe(before + 1);
    };

    await openAndToggle();
    const [first] = await page.evaluate(() => (window as unknown as { saved: boolean[] }).saved);
    expect(first).toBe(true);

    await openAndToggle();
    await openAndToggle();
    // A day-long event, then a timed one, then a day-long one again
    expect(await page.evaluate(() => (window as unknown as { saved: boolean[] }).saved)).toEqual([
      true,
      false,
      true,
    ]);
    expect(await part(page, "event").filter({ hasText: "Meeting" }).count()).toBeGreaterThan(0);
  });

  test("deleting from the editor emits orbEventDelete and closes it", async ({ page }) => {
    await mountCalendar(page, week(), meeting());
    await watch(page, "orbEventDelete");
    await part(page, "event").filter({ hasText: "Meeting" }).click();
    await button(page, "Delete");
    const [deleted] = await log(page);
    expect(deleted.mutation).toMatchObject({
      scope: "single",
      event: { id: "meeting", title: "Meeting" },
    });
    await expect(calendar(page).locator(".editor")).toHaveCount(0);
  });

  test("there's no Delete on a new event", async ({ page }) => {
    await mountCalendar(page, week(), []);
    await clickSlot(page, 1);
    await expect(part(page, "editor").getByRole("button", { name: "Delete" })).toHaveCount(0);
  });

  test("Cancel closes the editor without emitting", async ({ page }) => {
    await mountCalendar(page, week(), meeting());
    await watch(page, "orbEventCreate", "orbEventUpdate", "orbEventDelete");
    await part(page, "event").filter({ hasText: "Meeting" }).click();
    await button(page, "Cancel");
    await expect(calendar(page).locator(".editor")).toHaveCount(0);
    expect(await log(page)).toEqual([]);
  });
});

test.describe("calendar recurring scope", () => {
  const daily = (): OrbCalendarEvent[] => [
    { id: "daily", title: "Daily", start: date(0, 9), end: date(0, 9, 30), recurrence: "FREQ=DAILY;COUNT=20" },
  ];

  test("editing an occurrence asks first, and This Event emits the occurrence's start", async ({
    page,
  }) => {
    await mountCalendar(page, week(), daily());
    await watch(page, "orbEventUpdate");
    await part(page, "event").filter({ hasText: "Daily" }).nth(1).click();
    await expect(calendar(page).locator(".editor-recurring-note")).toBeVisible();
    await input(page, "Title").fill("Moved");
    await button(page, "Save");
    await expect(calendar(page).locator(".scope-message")).toBeVisible();
    // Nothing is emitted until a scope is chosen
    expect(await log(page)).toEqual([]);
    await button(page, "This Event");
    const [updated] = await log(page);
    expect(updated.mutation).toMatchObject({
      scope: "occurrence",
      occurrenceStart: date(1, 9),
      event: { id: "daily", title: "Moved" },
    });
  });

  test("All Future and All Events pass their scope on", async ({ page }) => {
    await mountCalendar(page, week(), daily());
    await watch(page, "orbEventDelete");
    await part(page, "event").filter({ hasText: "Daily" }).nth(2).click();
    await button(page, "Delete");
    await expect(calendar(page).locator(".scope-message")).toBeVisible();
    await button(page, "All Future Events");
    const [deleted] = await log(page);
    expect(deleted.mutation).toMatchObject({ scope: "future", occurrenceStart: date(2, 9) });
  });

  test("All Events passes the whole series", async ({ page }) => {
    await mountCalendar(page, week(), daily());
    await watch(page, "orbEventDelete");
    await part(page, "event").filter({ hasText: "Daily" }).nth(3).click();
    await button(page, "Delete");
    await button(page, "All Events");
    const [deleted] = await log(page);
    expect(deleted.mutation).toMatchObject({ scope: "all", occurrenceStart: date(3, 9) });
  });

  test("dismissing the prompt emits nothing, and returns to the editor", async ({ page }) => {
    await mountCalendar(page, week(), daily());
    await watch(page, "orbEventUpdate");
    await part(page, "event").filter({ hasText: "Daily" }).nth(1).click();
    await button(page, "Save");
    /** The prompt's overlay, by whether it's the one asking for a scope */
    const prompt = () =>
      page.evaluate(() => {
        const cal = document.querySelector("orb-calendar")!;
        const overlay = Array.from(cal.shadowRoot!.querySelectorAll("orb-overlay")).find((o) =>
          o.querySelector(".scope-message"),
        );
        return overlay ? overlay.hasAttribute("open") : false;
      });
    await expect.poll(prompt).toBe(true);
    // Escape dismisses the topmost dialog, as a person would
    await page.keyboard.press("Escape");
    await expect.poll(prompt).toBe(false);
    // An editor that closes would finish its animation in this time, and then be gone
    await page.waitForTimeout(400);
    // Nothing is saved, and the editor that asked is still open with its draft
    const editorOpen = () =>
      page.evaluate(() => {
        const cal = document.querySelector("orb-calendar")!;
        const overlay = Array.from(cal.shadowRoot!.querySelectorAll("orb-overlay")).find((o) =>
          o.querySelector(".editor"),
        );
        return overlay ? overlay.hasAttribute("open") : false;
      });
    await expect.poll(editorOpen).toBe(true);
    await expect(calendar(page).locator(".editor")).toBeVisible();
    expect(await log(page)).toEqual([]);
  });

  // Dismissing the prompt returns to the editor, so the first Escape closes only
  // the prompt, and a second one closes the editor.
  test("closing the prompt, then the editor, takes two Escapes", async ({ page }) => {
    await mountCalendar(page, week(), daily());
    await part(page, "event").filter({ hasText: "Daily" }).nth(1).click();
    await button(page, "Save");
    await expect(calendar(page).locator(".scope-message")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(calendar(page).locator(".scope-message")).toBeHidden();
    await expect(calendar(page).locator(".editor")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(calendar(page).locator(".editor")).toHaveCount(0);
  });

  test("dismissing the Delete prompt returns to the editor, and deletes nothing", async ({ page }) => {
    await mountCalendar(page, week(), daily());
    await watch(page, "orbEventDelete");
    await part(page, "event").filter({ hasText: "Daily" }).nth(1).click();
    await button(page, "Delete");
    await expect(calendar(page).locator(".scope-message")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(calendar(page).locator(".scope-message")).toBeHidden();
    await expect(calendar(page).locator(".editor")).toBeVisible();
    expect(await log(page)).toEqual([]);
  });

  test("nothing is saved while the prompt is undecided", async ({ page }) => {
    await mountCalendar(page, week(), daily());
    await watch(page, "orbEventUpdate");
    await part(page, "event").filter({ hasText: "Daily" }).nth(1).click();
    await button(page, "Save");
    await expect(calendar(page).locator(".scope-message")).toBeVisible();
    await page.waitForTimeout(300);
    expect(await log(page)).toEqual([]);
  });

  test("a one-off event saves without asking", async ({ page }) => {
    await mountCalendar(page, week(), [{ ...daily()[0], recurrence: undefined }]);
    await watch(page, "orbEventUpdate");
    await part(page, "event").filter({ hasText: "Daily" }).first().click();
    await expect(calendar(page).locator(".editor-recurring-note")).toHaveCount(0);
    await button(page, "Save");
    const [updated] = await log(page);
    expect(updated.mutation!.scope).toBe("single");
    await expect(calendar(page).locator(".editor")).toHaveCount(0);
  });

  test("the prompt answers when Save follows the editor's opening within two frames", async ({
    page,
  }) => {
    await mountCalendar(page, week(), daily());
    await captureChanges(page);
    await watch(page, "orbEventUpdate");
    // Opened and saved while the editor's overlay is still animating in
    await page.evaluate(async () => {
      const shadow = document.querySelector("orb-calendar")!.shadowRoot!;
      shadow.querySelectorAll<HTMLElement>("[part~='event']")[1].click();
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      Array.from(shadow.querySelectorAll<HTMLElement>("orb-button"))
        .find((button) => button.textContent?.trim() === "Save")!
        .click();
    });
    await expect(calendar(page).locator(".scope-message")).toBeVisible();
    await buttonThenChange(page, "This Event", 0);
    expect((await log(page)).map((entry) => entry.mutation?.scope)).toEqual(["occurrence"]);
  });

  test("the prompt answers after the editor is reopened as it closes", async ({ page }) => {
    await mountCalendar(page, week(), daily());
    await captureChanges(page);
    await watch(page, "orbEventUpdate");
    await page.evaluate(async () => {
      const shadow = document.querySelector("orb-calendar")!.shadowRoot!;
      const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
      const button = (label: string) =>
        Array.from(shadow.querySelectorAll<HTMLElement>("orb-button")).find(
          (item) => item.textContent?.trim() === label,
        )!;
      shadow.querySelectorAll<HTMLElement>("[part~='event']")[2].click();
      await wait(400);
      button("Cancel").click();
      // Reopened while the close is still animating
      await wait(16);
      shadow.querySelectorAll<HTMLElement>("[part~='event']")[3].click();
      await wait(400);
      button("Save").click();
    });
    await expect(calendar(page).locator(".scope-message")).toBeVisible();
    await buttonThenChange(page, "This Event", 0);
    expect((await log(page)).map((entry) => entry.mutation?.scope)).toEqual(["occurrence"]);
  });
});

test.describe("calendar dragging", () => {
  const one = (over: Partial<OrbCalendarEvent> = {}): OrbCalendarEvent[] => [
    { id: "one", title: "One", start: date(1, 9), end: date(1, 10), ...over },
  ];
  /** Drags the first event down by the distance for `hours` of drag, in pixels */
  async function dragBy(page: Page, hours: number) {
    await dragEvent(page, Math.round((await hourHeight(page)) * hours));
  }

  test("dragging down an hour moves the start and the end by an hour", async ({ page }) => {
    await mountCalendar(page, week(), one());
    await watch(page, "orbEventUpdate");
    await dragBy(page, 1);
    await expect.poll(async () => (await log(page)).length).toBe(1);
    const [moved] = await log(page);
    expect(moved.mutation).toMatchObject({
      scope: "single",
      event: { id: "one", start: plusHour(date(1, 9)), end: plusHour(date(1, 10)) },
    });
  });

  test("dragging up an hour moves it back", async ({ page }) => {
    await mountCalendar(page, week(), one());
    await watch(page, "orbEventUpdate");
    await dragBy(page, -1);
    await expect.poll(async () => (await log(page)).length).toBe(1);
    const [moved] = await log(page);
    expect(moved.mutation).toMatchObject({
      event: { start: date(1, 8), end: date(1, 9) },
    });
  });

  test("a drag shorter than a quarter hour changes nothing", async ({ page }) => {
    await mountCalendar(page, week(), one());
    await watch(page, "orbEventUpdate");
    // Past interact's threshold, less than the 8px half of the 15-minute step
    await dragEvent(page, 6);
    await page.waitForTimeout(300);
    expect(await log(page)).toEqual([]);
  });

  test("a readonly event doesn't move", async ({ page }) => {
    await mountCalendar(page, week(), one({ readonly: true }));
    await watch(page, "orbEventUpdate");
    await dragBy(page, 1);
    await page.waitForTimeout(300);
    expect(await log(page)).toEqual([]);
  });

  test("a drag in a recurring event asks for its scope", async ({ page }) => {
    await mountCalendar(page, week(), one({ recurrence: "FREQ=DAILY;COUNT=20" }));
    await watch(page, "orbEventUpdate");
    await dragBy(page, 1);
    await expect(calendar(page).locator(".scope-message")).toBeVisible();
    await button(page, "This Event");
    const [moved] = await log(page);
    // The occurrence dragged is Tuesday's, the first of the two days shown
    await expect(calendar(page).locator(".scope-message")).toBeHidden();
    expect(moved.mutation).toMatchObject({
      scope: "occurrence",
      occurrenceStart: date(1, 9),
      event: { start: plusHour(date(1, 9)), end: plusHour(date(1, 10)) },
    });
  });

  test("clicking an all-day bar opens its editor rather than dragging it", async ({ page }) => {
    await mountCalendar(page, week(), [
      { id: "holiday", title: "Holiday", start: date(1), end: date(2), allDay: true },
    ]);
    await watch(page, "orbEventUpdate");
    await part(page, "event").first().click();
    await expect(calendar(page).locator(".editor")).toBeVisible();
    expect(await log(page)).toEqual([]);
  });
});

test.describe("calendar writing changes", () => {
  const meeting = (): OrbCalendarEvent[] => [
    { id: "meeting", title: "Meeting", start: date(1, 9), end: date(1, 10), location: "Room 1" },
  ];

  test("a new event from a slot is added to the markup with an id of its own", async ({ page }) => {
    await mountCalendar(page, week(), []);
    await captureChanges(page);
    await clickSlot(page, 1);
    await input(page, "Title").fill("New meeting");
    await buttonThenChange(page, "Save", 0);
    await expect(part(page, "event").filter({ hasText: "New meeting" })).toHaveCount(1);

    const [created] = await markupEvents(page);
    expect(created.title).toBe("New meeting");
    expect(created.id).toMatch(/^event-[a-z0-9]+-1$/);
    // Written in the markup's own format, offset and all
    expect(created.start).toMatch(/^2026-06-08T\d{2}:\d{2}-04:00$/);
  });

  test("each new event gets its own id", async ({ page }) => {
    await mountCalendar(page, week(), []);
    await captureChanges(page);
    for (const [index, title] of ["One", "Two"].entries()) {
      await clickSlot(page, index + 1);
      await input(page, "Title").fill(title);
      // Waited for, since the next click needs the new event's element in place
      await buttonThenChange(page, "Save", index);
      await expect(calendar(page).locator("orb-calendar-event")).toHaveCount(index + 1);
    }
    const ids = (await markupEvents(page)).map((event) => event.id);
    expect(ids).toHaveLength(2);
    expect(ids[0]).toMatch(/^event-[a-z0-9]+-1$/);
    expect(ids[1]).toMatch(/^event-[a-z0-9]+-2$/);
  });

  test("saving an edit writes the title and the fields to its element", async ({ page }) => {
    await mountCalendar(page, week(), meeting());
    await captureChanges(page);
    await part(page, "event").filter({ hasText: "Meeting" }).click();
    await input(page, "Title").fill("Design review");
    await input(page, "Location").fill("Room 2");
    await buttonThenChange(page, "Save", 0);
    await expect(calendar(page).locator("orb-calendar-event#meeting")).toHaveText("Design review");

    const [event] = await markupEvents(page);
    expect(event).toMatchObject({ id: "meeting", title: "Design review" });
    expect(
      await page.evaluate(() =>
        document.querySelector("orb-calendar-event#meeting")!.getAttribute("location"),
      ),
    ).toBe("Room 2");
  });

  test("a drag rewrites the start and the end, without a listener", async ({ page }) => {
    await mountCalendar(page, week(), meeting());
    await dragEvent(page, Math.round((await hourHeight(page)) * 1));
    await expect.poll(async () => (await markupEvents(page))[0].start).toBe(
      "2026-06-08T10:00-04:00",
    );
    const [event] = await markupEvents(page);
    expect(event.end).toBe("2026-06-08T11:00-04:00");
  });

  test("resizing the bottom edge writes the end only", async ({ page }) => {
    await mountCalendar(page, week(), [
      { id: "one", title: "One", start: date(1, 9), end: date(1, 10) },
    ]);
    const block = part(page, "event").first();
    // Centred, so the handle and the whole drag are on screen
    await block.evaluate((el) => el.scrollIntoView({ block: "center" }));
    const box = (await block.boundingBox())!;
    const hour = await hourHeight(page);
    // The handle at the bottom, dragged down an hour
    const x = box.x + box.width / 2;
    const y = box.y + box.height - 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x, y + 10, { steps: 2 });
    await page.mouse.move(x, y + hour, { steps: 12 });
    await page.mouse.up();

    await expect.poll(async () => (await markupEvents(page))[0].end).toBe("2026-06-08T11:00-04:00");
    // Only the end was written, so the start keeps the spelling the markup gave it
    const [event] = await markupEvents(page);
    expect(event.start).toBe(`${date(1, 9)}`);
  });

  test("deleting from the editor removes the element", async ({ page }) => {
    await mountCalendar(page, week(), meeting());
    await captureChanges(page);
    await part(page, "event").filter({ hasText: "Meeting" }).click();
    await buttonThenChange(page, "Delete", 0);
    await expect(calendar(page).locator("orb-calendar-event#meeting")).toHaveCount(0);
    expect(await markupEvents(page)).toEqual([]);
    await expect(part(page, "event")).toHaveCount(0);
  });

  test("a rewrite keeps an app's own attributes on the element", async ({ page }) => {
    await mountCalendar(page, week(), meeting());
    await captureChanges(page);
    // An attribute the calendar doesn't know about is the app's
    await page.evaluate(() =>
      document.querySelector("orb-calendar-event#meeting")!.setAttribute("data-server", "42"),
    );
    await part(page, "event").filter({ hasText: "Meeting" }).click();
    await input(page, "Title").fill("Renamed");
    await buttonThenChange(page, "Save", 0);
    await expect(calendar(page).locator("orb-calendar-event#meeting")).toHaveAttribute(
      "data-server",
      "42",
    );
  });

  test("the view follows each write, one after the other", async ({ page }) => {
    await mountCalendar(page, week(), meeting());
    await call(page, "applyChange", { event: { ...meeting()[0], title: "Renamed" }, scope: "single" }, "update");
    await expect(part(page, "event")).toContainText("Renamed");
    await call(
      page,
      "applyChange",
      { event: { ...meeting()[0], title: "Renamed", start: date(1, 11), end: date(1, 12) }, scope: "single" },
      "update",
    );
    await expect(part(page, "event")).toContainText("11:00 AM");
    await expect(part(page, "event")).not.toContainText("9:00 AM");
  });

  test("a drag lands at its new time in the first frame after the drop", async ({ page }) => {
    await mountCalendar(page, week(), meeting());
    const hour = await hourHeight(page);
    // Recorded in the frame after the drop: the block's top, and what the write
    // left in the block's transform and in the markup
    const before = await page.evaluate(() => {
      const cal = document.querySelector("orb-calendar")!;
      const block = () => cal.shadowRoot!.querySelector<HTMLElement>("[part~='event']")!;
      block().scrollIntoView({ block: "center" });
      const frames: { top: number; transform: string; start: string | null }[] = [];
      (window as unknown as { frames: typeof frames }).frames = frames;
      cal.addEventListener("orbEventUpdate", () => {
        // A microtask runs once the write is done, and the frame after it is the first
        queueMicrotask(() => {
          const entry = {
            top: 0,
            transform: block().style.transform,
            start: cal.querySelector("orb-calendar-event")!.getAttribute("start"),
          };
          frames.push(entry);
          requestAnimationFrame(() => (entry.top = Math.round(block().getBoundingClientRect().top)));
        });
      });
      return Math.round(block().getBoundingClientRect().top);
    });
    // The same drag, without the scroll, since it's already centred
    const box = (await part(page, "event").first().boundingBox())!;
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x, y + 10, { steps: 2 });
    await page.mouse.move(x, y + Math.round(hour), { steps: 12 });
    await page.mouse.up();
    await expect.poll(async () => (await markupEvents(page))[0].start).toBe(
      "2026-06-08T10:00-04:00",
    );
    // The frame is measured in the next frame, after the markup has changed, so wait for it
    await expect
      .poll(() =>
        page.evaluate(() => (window as unknown as { frames: { top: number }[] }).frames[0]?.top ?? 0),
      )
      .toBeGreaterThan(0);
    const [first] = await page.evaluate(() => (window as unknown as { frames: { top: number; transform: string; start: string | null }[] }).frames);
    // No drag transform is left, and the markup already has the new time, so no
    // frame can show the block at its old time
    expect(first.transform).toBe("");
    expect(first.start).toBe("2026-06-08T10:00-04:00");
    expect(first.top).toBeGreaterThan(Math.round(before) + hour / 2);
  });
});

test.describe("calendar recurring writes", () => {
  const daily = (): OrbCalendarEvent[] => [
    { id: "daily", title: "Daily", start: date(0, 9), end: date(0, 9, 30), recurrence: "FREQ=DAILY;COUNT=20" },
  ];

  /** All-day, so a split falls on a whole day, with no time of day to compare */
  const allDaySeries = (): OrbCalendarEvent[] => [
    { id: "daily", title: "Daily", start: date(0), end: date(1), allDay: true, recurrence: "FREQ=DAILY" },
  ];

  /** The same change made by `applyEventChange`, as plain data, for comparison */
  const applied = async (
    page: Page,
    events: OrbCalendarEvent[],
    mutation: OrbCalendarMutation,
    kind: "update" | "delete",
  ) => {
    const next = await apply(page, events, mutation, kind);
    return next
      .map((event) => ({
        id: event.id,
        start: event.start,
        end: event.end,
        title: event.title,
        recurrence: event.recurrence,
        exceptions: event.recurrenceExceptions ?? [],
        parent: event.recurrenceParentId,
        occurrence: event.recurrenceId,
      }))
      .sort((a, b) => a.id.localeCompare(b.id));
  };

  /**
   * The end a missing `end` attribute stands for, as the calendar reads it: an
   * hour for a timed event, and the next day for an all-day one
   */
  const defaultEnd = (start: number, allDay: boolean) => {
    if (!allDay) return start + 60 * 60 * 1000;
    const day = new Date(start);
    day.setDate(day.getDate() + 1);
    return day.getTime();
  };

  /** The calendar's children, in the same plain shape, to compare with */
  const written = async (page: Page) => {
    const events = await markupEvents(page);
    const rows = [];
    for (const event of events) {
      const start = await parseTime(page, event.start!);
      rows.push({
        id: event.id,
        start,
        end: event.end === null ? defaultEnd(start, event.allDay) : await parseTime(page, event.end),
        title: event.title,
        recurrence: event.recurrence ?? undefined,
        exceptions: await Promise.all(event.exceptions.map((time) => parseTime(page, time))),
        parent: event.parent ?? undefined,
        occurrence: event.occurrence ? await parseTime(page, event.occurrence) : undefined,
      });
    }
    return rows.sort((a, b) => a.id.localeCompare(b.id));
  };

  test("This Event on a drag adds an override after its master", async ({ page }) => {
    await mountCalendar(page, week(), daily());
    await captureChanges(page);
    const hour = await hourHeight(page);
    // Monday's, the second occurrence in the week
    await dragEvent(page, Math.round(hour), part(page, "event").filter({ hasText: "Daily" }).nth(1));
    await buttonThenChange(page, "This Event", 0);

    // Monday's occurrence, moved an hour, as a new element right after the master
    await expect.poll(async () => (await markupEvents(page)).length).toBe(2);
    const ids = await page.evaluate(() =>
      Array.from(document.querySelector("orb-calendar")!.children).map((el) => el.id),
    );
    expect(ids).toEqual(["daily", `daily::${date(1, 9)}`]);
    const [master, override] = await markupEvents(page);
    expect(master.exceptions).toEqual([]);
    expect(override).toMatchObject({
      id: `daily::${date(1, 9)}`,
      parent: "daily",
      recurrence: null,
    });
    // Timed values keep their offset, so Monday's override is written in the same format
    expect(override.occurrence).toBe("2026-06-08T09:00-04:00");
    expect(override.start).toBe("2026-06-08T10:00-04:00");
  });

  test("deleting This Event adds the start to the master's exceptions", async ({ page }) => {
    await mountCalendar(page, week(), daily());
    await captureChanges(page);
    await part(page, "event").filter({ hasText: "Daily" }).nth(2).click();
    await button(page, "Delete");
    await expect(calendar(page).locator(".scope-message")).toBeVisible();
    await buttonThenChange(page, "This Event", 0);

    await expect.poll(async () => (await written(page))[0].exceptions.length).toBe(1);
    expect(await written(page)).toEqual(
      await applied(page, daily(), { event: { ...daily()[0], id: "daily" }, scope: "occurrence", occurrenceStart: date(2, 9) }, "delete"),
    );
    // Wednesday's is gone from the week, and an element wasn't added
    expect((await markupEvents(page)).length).toBe(1);
    expect(await occurrenceCount(page, "Daily")).toBe(6);
  });

  /**
   * Retitles the occurrence at `index` in the week, and answers All Future Events
   * for it. Checks the written markup against `applyEventChange` for the same
   * change, and the view against the new title.
   */
  async function splitFromOccurrence(
    page: Page,
    series: OrbCalendarEvent[],
    index: number,
    splitStart: number,
    counts: { before: number; after: number },
  ) {
    await captureChanges(page);
    await part(page, "event").filter({ hasText: "Daily" }).nth(index).click();
    await input(page, "Title").fill("Later");
    await button(page, "Save");
    await expect(calendar(page).locator(".scope-message")).toBeVisible();
    await buttonThenChange(page, "All Future Events", 0);

    await expect.poll(async () => (await markupEvents(page)).length).toBe(2);
    const ids = await page.evaluate(() =>
      Array.from(document.querySelector("orb-calendar")!.children).map((el) => el.id),
    );
    // The new master is named after the occurrence it starts at, and follows the old one
    expect(ids).toEqual(["daily", `daily:${splitStart}`]);
    // The editor saves the occurrence's own times, so the new master starts on the split
    const duration = series[0].end - series[0].start;
    const mutation = {
      event: { ...series[0], title: "Later", start: splitStart, end: splitStart + duration },
      scope: "future",
      occurrenceStart: splitStart,
    } as OrbCalendarMutation;
    expect(await written(page)).toEqual(await applied(page, series, mutation, "update"));
    // Before the split the old title stays, and from the split on the new one shows
    await expect(part(page, "event").filter({ hasText: "Daily" })).toHaveCount(counts.before);
    await expect(part(page, "event").filter({ hasText: "Later" })).toHaveCount(counts.after);
  }

  test("All Future adds UNTIL to the master, and a new master after it", async ({ page }) => {
    const series = daily();
    await mountCalendar(page, week(), series);
    // Tuesday's occurrence, the third in the week, so Sunday and Monday keep the title
    await splitFromOccurrence(page, series, 2, date(2, 9), { before: 2, after: 5 });
  });

  test("All Future on an all-day series splits on the day", async ({ page }) => {
    const series = allDaySeries();
    await mountCalendar(page, week(), series);
    await splitFromOccurrence(page, series, 2, date(2), { before: 2, after: 5 });
  });

  test("All Events rewrites the master alone", async ({ page }) => {
    await mountCalendar(page, week(), daily());
    await captureChanges(page);
    await part(page, "event").filter({ hasText: "Daily" }).nth(3).click();
    await input(page, "Title").fill("Every day");
    await button(page, "Save");
    await expect(calendar(page).locator(".scope-message")).toBeVisible();
    await buttonThenChange(page, "All Events", 0);

    await expect.poll(async () => (await markupEvents(page))[0].title).toBe("Every day");
    const events = await markupEvents(page);
    expect(events.length).toBe(1);
    expect(events[0].id).toBe("daily");
    expect(events[0].recurrence).toBe("FREQ=DAILY;COUNT=20");
    // Every day of the week shows the occurrence, under the new title
    await expect.poll(() => occurrenceCount(page, "Every day")).toBe(7);
  });

  test("deleting All Events removes the master and its overrides", async ({ page }) => {
    await mountCalendar(page, week(), daily());
    await captureChanges(page);
    // An override first, so there's one to take along
    await dragEvent(page, Math.round(await hourHeight(page)), part(page, "event").filter({ hasText: "Daily" }).first());
    await buttonThenChange(page, "This Event", 0);
    await expect.poll(async () => (await markupEvents(page)).length).toBe(2);

    await part(page, "event").filter({ hasText: "Daily" }).first().click();
    await button(page, "Delete");
    await expect(calendar(page).locator(".scope-message")).toBeVisible();
    await buttonThenChange(page, "All Events", 1);
    await expect(calendar(page).locator("orb-calendar-event")).toHaveCount(0);
    await expect(part(page, "event")).toHaveCount(0);
  });
});

test.describe("calendar change events", () => {
  const one = (over: Partial<OrbCalendarEvent> = {}): OrbCalendarEvent[] => [
    { id: "one", title: "One", start: date(1, 9), end: date(1, 10), ...over },
  ];

  test("an update carries the event's element, and the calendar writes it", async ({ page }) => {
    await mountCalendar(page, week(), one());
    await captureChanges(page);
    await watch(page, "orbEventUpdate");
    await part(page, "event").click();
    await input(page, "Title").fill("Renamed");
    await buttonThenChange(page, "Save", 0);
    const [updated] = await log(page);
    expect(updated).toMatchObject({ written: true, hasElement: true });
    await expect(calendar(page).locator("orb-calendar-event#one")).toHaveText("Renamed");
  });

  test("a cancelable update leaves the markup to the app, and the editor closed", async ({ page }) => {
    await mountCalendar(page, week(), one());
    await page.evaluate(() =>
      document
        .querySelector("orb-calendar")!
        .addEventListener("orbEventUpdate", (event) => event.preventDefault()),
    );
    await part(page, "event").click();
    await input(page, "Title").fill("Renamed");
    await button(page, "Save");
    await expect(calendar(page).locator(".editor")).toHaveCount(0);
    // Nothing is written
    await page.waitForTimeout(200);
    expect((await markupEvents(page))[0].title).toBe("One");
    await expect(part(page, "event").filter({ hasText: "One" })).toHaveCount(1);
  });

  test("a canceled drag snaps back", async ({ page }) => {
    await mountCalendar(page, week(), one());
    await page.evaluate(() =>
      document
        .querySelector("orb-calendar")!
        .addEventListener("orbEventUpdate", (event) => event.preventDefault()),
    );
    await dragEvent(page, Math.round(await hourHeight(page)));
    await page.waitForTimeout(300);
    expect((await markupEvents(page))[0].start).toBe(`${date(1, 9)}`);
    await expect(part(page, "event")).toContainText("9:00 AM");
  });

  test("a canceled create leaves the event out, and a canceled delete keeps it", async ({ page }) => {
    await mountCalendar(page, week(), one());
    await page.evaluate(() => {
      for (const name of ["orbEventCreate", "orbEventDelete"]) {
        document.querySelector("orb-calendar")!.addEventListener(name, (event) => event.preventDefault());
      }
    });
    await clickSlot(page, 1);
    await input(page, "Title").fill("Never");
    await button(page, "Save");
    // The editor closes whether or not the change was canceled
    await expect(calendar(page).locator(".editor")).toHaveCount(0);
    expect(await markupEvents(page)).toHaveLength(1);

    await part(page, "event").click();
    await button(page, "Delete");
    await expect(calendar(page).locator(".editor")).toHaveCount(0);
    expect(await markupEvents(page)).toHaveLength(1);
  });

  test("a created event is the element the change carried, and it's inserted", async ({ page }) => {
    await mountCalendar(page, week(), []);
    await captureChanges(page);
    await page.evaluate(() => {
      document.querySelector("orb-calendar")!.addEventListener("orbEventCreate", (event) => {
        (window as unknown as { given: Element }).given = (event as CustomEvent<{ element: Element }>).detail.element;
      });
    });
    await clickSlot(page, 1);
    await input(page, "Title").fill("Standup");
    await buttonThenChange(page, "Save", 0);
    await expect
      .poll(() => page.evaluate(() => (window as unknown as { given: Element }).given.isConnected))
      .toBe(true);
    const given = await page.evaluate(() => {
      const el = (window as unknown as { given: HTMLElement }).given;
      return { id: el.id, parent: el.parentElement?.tagName, title: el.textContent };
    });
    expect(given).toEqual({
      id: (await markupEvents(page))[0].id,
      parent: "ORB-CALENDAR",
      title: "Standup",
    });
  });

  test("a deleted event's element is the one the change carried, and it's removed", async ({ page }) => {
    await mountCalendar(page, week(), one());
    await page.evaluate(() => {
      const cal = document.querySelector("orb-calendar")!;
      const w = window as unknown as { before: Element; given: Element };
      w.before = cal.querySelector("orb-calendar-event#one")!;
      cal.addEventListener("orbEventDelete", (event) => {
        w.given = (event as CustomEvent<{ element: Element }>).detail.element;
      });
    });
    await part(page, "event").click();
    await button(page, "Delete");
    await expect
      .poll(() => page.evaluate(() => !(window as unknown as { before: Element }).before.isConnected))
      .toBe(true);
    expect(
      await page.evaluate(() => {
        const w = window as unknown as { before: Element; given: Element };
        return w.given === w.before;
      }),
    ).toBe(true);
  });

  test("applyChange writes what a cancelation left to the app", async ({ page }) => {
    await mountCalendar(page, week(), one());
    // The app saves first: it cancels the change, then applies what its server saved
    await page.evaluate(() => {
      const cal = document.querySelector("orb-calendar") as HTMLElement;
      const updates: OrbCalendarMutation[] = [];
      (window as unknown as { updates: OrbCalendarMutation[] }).updates = updates;
      cal.addEventListener("orbEventUpdate", (event) => {
        event.preventDefault();
        updates.push((event as CustomEvent<OrbCalendarMutation>).detail);
      });
    });
    await part(page, "event").click();
    await input(page, "Title").fill("Renamed");
    await button(page, "Save");
    await expect(calendar(page).locator(".editor")).toHaveCount(0);
    // Canceled, so the markup still says the old title
    expect((await markupEvents(page))[0].title).toBe("One");

    const [mutation] = await page.evaluate(() => (window as unknown as { updates: OrbCalendarMutation[] }).updates);
    await call(page, "applyChange", { ...mutation, event: { ...mutation.event, title: "Server" } }, "update");
    await expect(calendar(page).locator("orb-calendar-event#one")).toHaveText("Server");
    // The same markup an uncanceled save makes
    expect((await markupEvents(page))[0].title).toBe("Server");
    expect(await occurrenceCount(page, "Server")).toBe(1);
  });

  test("a new element's id can be replaced, and its overrides follow", async ({ page }) => {
    await mountCalendar(page, week(), [
      { id: "a", title: "Daily", start: date(0, 9), end: date(0, 9, 30), recurrence: "FREQ=DAILY;COUNT=20" },
    ]);
    // The app names the new event itself, as if from its server
    await part(page, "event").filter({ hasText: "Daily" }).nth(1).click();
    await input(page, "Title").fill("Moved");
    await button(page, "Save");
    await expect(calendar(page).locator(".scope-message")).toBeVisible();
    await button(page, "This Event");
    // Rename the new override, as an optimistic save does with the server's id
    await expect.poll(async () => (await markupEvents(page)).length).toBe(2);
    const overrideId = (await markupEvents(page)).find((event) => event.id.startsWith("a::"))!.id;
    await page.evaluate((id) => {
      document.querySelector(`orb-calendar-event#${CSS.escape(id)}`)!.id = "saved-1";
    }, overrideId);
    await expect(calendar(page).locator("orb-calendar-event#saved-1")).toHaveCount(1);
    expect((await markupEvents(page)).find((event) => event.id === "saved-1")!.parent).toBe("a");
  });

  test("renaming a master points its overrides at the new id", async ({ page }) => {
    await mountCalendar(page, week(), [
      { id: "a", title: "Daily", start: date(0, 9), end: date(0, 9, 30), recurrence: "FREQ=DAILY;COUNT=20" },
    ]);
    await captureChanges(page);
    await dragEvent(page, Math.round(await hourHeight(page)), part(page, "event").filter({ hasText: "Daily" }).nth(1));
    await buttonThenChange(page, "This Event", 0);
    await expect.poll(async () => (await markupEvents(page)).length).toBe(2);

    await page.evaluate(() => {
      document.querySelector("orb-calendar-event#a")!.id = "server-a";
    });
    await expect(calendar(page).locator("orb-calendar-event#server-a")).toHaveCount(1);
    // The override follows the rename, which is what points it at its master
    await expect
      .poll(async () => (await markupEvents(page)).find((event) => event.id !== "server-a")?.parent)
      .toBe("server-a");
    // Still an override of the master, so the series has seven occurrences
    expect(await occurrenceCount(page, "Daily")).toBe(7);
  });

  test("an event the app removed while its editor was open is neither written nor emitted", async ({
    page,
  }) => {
    await mountCalendar(page, week(), one());
    await watch(page, "orbEventUpdate", "orbEventDelete");
    await part(page, "event").click();
    await input(page, "Title").fill("Gone");
    await page.evaluate(() => document.querySelector("orb-calendar-event#one")!.remove());
    await button(page, "Save");
    await expect(calendar(page).locator(".editor")).toHaveCount(0);
    await page.waitForTimeout(200);
    expect(await log(page)).toEqual([]);
    // The app's removal stays, and nothing is added back
    await expect(calendar(page).locator("orb-calendar-event")).toHaveCount(0);
  });
});

test.describe("calendar ids", () => {
  /** The page's console warnings, from now on. Listen before mounting: the first read happens then. */
  const warnings = (page: Page) => {
    const messages: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "warning") messages.push(message.text());
    });
    return messages;
  };

  test("an event without an id is shown read-only, with a warning, and nothing changes it", async ({
    page,
  }) => {
    const messages = warnings(page);
    await mountCalendar(page, week(), [{ title: "Plain", start: date(1, 9), end: date(1, 10) }]);
    await watch(page, "orbEventUpdate", "orbEventClick");
    await part(page, "event").filter({ hasText: "Plain" }).click();
    // Opens nothing, but the click is still reported
    await expect(calendar(page).locator(".editor")).toHaveCount(0);
    await dragEvent(page, Math.round(await hourHeight(page)));
    await page.waitForTimeout(300);
    expect((await log(page)).map((entry) => entry.type)).toEqual(["orbEventClick"]);
    // The markup is as the page wrote it
    expect(
      await page.evaluate(() => document.querySelector("orb-calendar-event")!.getAttribute("start")),
    ).toBe(String(date(1, 9)));
    expect(messages.filter((message) => message.includes("has no id"))).toHaveLength(1);
  });

  test("a calendar without an id is skipped, with a warning", async ({ page }) => {
    const messages = warnings(page);
    await mount(
      page,
      `<orb-calendar view="week" date="${date(1)}"><orb-calendar-source name="Ghost" color="danger"></orb-calendar-source><orb-calendar-source id="work" name="Work" color="primary"></orb-calendar-source></orb-calendar>`,
    );
    await expect(part(page, "calendar-list")).toContainText("Work");
    await expect(part(page, "calendar-list")).not.toContainText("Ghost");
    expect(messages.filter((message) => message.includes("has no id"))).toHaveLength(1);
  });
});

test.describe("calendar read-only", () => {
  test("editable=false makes no events and opens no editor, but still emits orbEventClick", async ({
    page,
  }) => {
    await mountCalendar(
      page,
      { ...week(), editable: "false" },
      [{ id: "one", title: "One", start: date(1, 9), end: date(1, 10) }],
    );
    await watch(page, "orbEventCreate", "orbEventClick");
    await clickSlot(page, 1);
    await expect(calendar(page).locator(".editor")).toHaveCount(0);
    await part(page, "event").filter({ hasText: "One" }).click();
    await expect(calendar(page).locator(".editor")).toHaveCount(0);
    expect((await log(page)).map((e) => e.type)).toEqual(["orbEventClick"]);
  });
});

test.describe("calendar event clicks", () => {
  const one = (): OrbCalendarEvent[] => [
    { id: "one", title: "One", start: date(1, 9), end: date(1, 10) },
  ];

  test("orbEventClick names the occurrence", async ({ page }) => {
    await mountCalendar(page, week(), one());
    await watch(page, "orbEventClick");
    await part(page, "event").filter({ hasText: "One" }).click();
    const [clicked] = await log(page);
    expect(clicked.title).toBe("One");
  });

  test("preventDefault keeps the editor closed", async ({ page }) => {
    await mountCalendar(page, week(), one());
    await page.evaluate(() =>
      document
        .querySelector("orb-calendar")!
        .addEventListener("orbEventClick", (event) => event.preventDefault()),
    );
    await part(page, "event").filter({ hasText: "One" }).click();
    await expect(calendar(page).locator(".editor")).toHaveCount(0);
  });

  test("without preventDefault, the editor opens", async ({ page }) => {
    await mountCalendar(page, week(), one());
    await part(page, "event").filter({ hasText: "One" }).click();
    await expect(calendar(page).locator(".editor")).toBeVisible();
  });
});

test.describe("calendar ICS export", () => {
  const EVENTS = (): OrbCalendarEvent[] => [
    {
      id: "standup",
      title: "Standup",
      start: date(0, 9),
      end: date(0, 9, 30),
      calendarId: "work",
      recurrence: "FREQ=DAILY",
      recurrenceExceptions: [date(2, 9)],
    },
    {
      id: `standup::${date(1, 9)}`,
      title: "Standup moved",
      start: date(1, 10),
      end: date(1, 10, 30),
      calendarId: "work",
      recurrenceParentId: "standup",
      recurrenceId: date(1, 9),
    },
    { id: "holiday", title: "Holiday", start: date(4), end: date(5), allDay: true, calendarId: "home" },
  ];
  const SOURCES: OrbCalendarSource[] = [
    { id: "work", name: "Work", color: "primary" },
    { id: "home", name: "Home", color: "success" },
  ];

  test("exportICS writes the rules, the exceptions, and the overrides", async ({ page }) => {
    await mountCalendar(page, week(), EVENTS(), SOURCES);
    const lines = (await call<string>(page, "exportICS")).split("\r\n");
    expect(lines[0]).toBe("BEGIN:VCALENDAR");
    expect(lines).toContain("RRULE:FREQ=DAILY");
    expect(lines.filter((line) => line.startsWith("EXDATE:"))).toHaveLength(1);
    expect(lines.filter((line) => line.startsWith("RECURRENCE-ID:"))).toHaveLength(1);
    expect(lines).toContain("DTSTART;VALUE=DATE:20260611");
    expect(lines).toContain("SUMMARY:Standup moved");
    // An override keeps its master's UID
    expect(lines.filter((line) => line === "UID:standup")).toHaveLength(2);
  });

  test("calendarIds narrows the export", async ({ page }) => {
    await mountCalendar(page, week(), EVENTS(), SOURCES);
    const ics = await call<string>(page, "exportICS", { calendarIds: ["home"] });
    expect(ics).toContain("SUMMARY:Holiday");
    expect(ics).not.toContain("SUMMARY:Standup");
  });
});

test.describe("calendar navigation", () => {
  test("the header's arrows move the date and name the new range", async ({ page }) => {
    await mountCalendar(page, { ...week(), view: "month" }, []);
    await watch(page, "orbDateChange");
    await calendar(page).locator('orb-button[aria-label="Next month"]').click();
    await expect(calendar(page).locator(".title")).toHaveText("July 2026");
    expect((await log(page))[0].type).toBe("orbDateChange");
    await calendar(page).locator('orb-button[aria-label="Previous month"]').click();
    await expect(calendar(page).locator(".title")).toHaveText("June 2026");
  });

  test("goToToday, next, prev, and goToDate move the anchor", async ({ page }) => {
    await mountCalendar(page, { ...week(), view: "day" }, []);
    await call(page, "next");
    await call(page, "next");
    await expect(calendar(page).locator(".title")).toHaveText("Wednesday, June 10, 2026");
    await call(page, "prev");
    await expect(calendar(page).locator(".title")).toHaveText("Tuesday, June 9, 2026");
    await call(page, "goToDate", date(10));
    await expect(calendar(page).locator(".title")).toHaveText("Wednesday, June 17, 2026");
    await call(page, "goToToday");
    const today = await page.evaluate(() => new Date().getDate());
    await expect(calendar(page).locator(".title")).toContainText(` ${today}, `);
  });

  test("orbRangeChange reports whole weeks, and again when the range changes", async ({ page }) => {
    await mountCalendar(page, { ...week(), view: "month" }, []);
    const ranges = () =>
      page.evaluate(() => (window as unknown as { ranges: OrbCalendarRange[] }).ranges);
    await page.evaluate(() => {
      const seen: OrbCalendarRange[] = [];
      (window as unknown as { ranges: OrbCalendarRange[] }).ranges = seen;
      const cal = document.querySelector("orb-calendar")!;
      cal.addEventListener("orbRangeChange", (event) => seen.push((event as CustomEvent).detail));
      // June's range, from the week of the 1st to the week of the 30th, was
      // reported as the calendar loaded, before a test could listen
      const june = (cal as unknown as { lastRange: OrbCalendarRange }).lastRange;
      seen.push(june);
    });
    const june = (await ranges())[0];
    const juneDays = await page.evaluate((range) => {
      const start = new Date(range.start);
      const end = new Date(range.end);
      return { startDay: start.getDay(), endDay: end.getDay(), startDate: start.getDate(), endDate: end.getDate() };
    }, june);
    // Whole weeks, starting on the Sunday before June and ending on the
    // Saturday after it
    expect(juneDays.startDay).toBe(0);
    expect(juneDays.endDay).toBe(6);
    expect(juneDays.startDate).toBe(31);
    expect(juneDays.endDate).toBe(4);

    await calendar(page).locator('orb-button[aria-label="Next month"]').click();
    // July's range follows, from the Sunday before July to the Saturday after
    // it, reported once
    await expect
      .poll(async () => (await ranges()).length)
      .toBe(2);
    const july = (await ranges())[1];
    const julyDays = await page.evaluate((range) => {
      const start = new Date(range.start);
      const end = new Date(range.end);
      return { startDay: start.getDay(), endDay: end.getDay(), startDate: start.getDate(), endDate: end.getDate() };
    }, july);
    expect(julyDays).toEqual({ startDay: 0, endDay: 6, startDate: 28, endDate: 1 });
  });

  test("the sidebar's mini month moves to the day it picks", async ({ page }) => {
    await mountCalendar(page, { ...week(), view: "month", "show-sidebar": "true" }, []);
    const picker = calendar(page).locator("orb-datepicker");
    await picker.locator("[part~='day']").filter({ hasText: /^20$/ }).click();
    await expect(calendar(page).locator(".title")).toHaveText("June 2026");
    await expect(picker.locator("[part~='day']").filter({ hasText: /^20$/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});

test.describe("calendar layout options", () => {
  test("day and week views show only the hours between day-start-hour and day-end-hour", async ({
    page,
  }) => {
    await mountCalendar(
      page,
      { ...week(), "day-start-hour": 7, "day-end-hour": 19, "week-starts-on": 1 },
      [],
    );
    const labels = calendar(page).locator(".tg-hour-label");
    await expect(labels).toHaveCount(12);
    await expect(labels.nth(1)).toHaveText("8 AM");
    // The week starts on Monday
    await expect(calendar(page).locator(".tg-day-head").first()).toContainText("Mon");
  });

  test("a day view shows one column, for the anchor date", async ({ page }) => {
    await mountCalendar(page, { ...week(), view: "day" }, []);
    await expect(calendar(page).locator(".tg-col")).toHaveCount(1);
    await expect(calendar(page).locator(".tg-day-head")).toHaveCount(1);
  });
});

/**
 * Phase 5: reading numbers and flags from markup, the app's own changes that a
 * write must not drop, writing only what means something different, writing
 * properties, and the writer's own failures and reconnects.
 */
test.describe("calendar reading and writing fixes", () => {
  /** Calendar children written as an app would, in the week of June 8 */
  const mountRaw = (page: Page, children: string) =>
    mount(
      page,
      `<orb-calendar ${Object.entries(week())
        .map(([k, v]) => `${k}="${v}"`)
        .join(" ")}>${children}</orb-calendar>`,
    );
  const oneEvent = (): Partial<OrbCalendarEvent>[] => [
    { id: "one", title: "One", start: date(1, 9), end: date(1, 10) },
  ];
  /** Two events with no id, which the calendar shows read-only */
  const idless = () =>
    `<orb-calendar-event start="${date(1, 9)}" end="${date(1, 10)}">Alpha</orb-calendar-event>` +
    `<orb-calendar-event start="${date(1, 11)}" end="${date(1, 12)}">Beta</orb-calendar-event>`;

  test("a time set as a number property moves the event, with or without a start attribute", async ({
    page,
  }) => {
    await mountRaw(
      page,
      eventMarkup({ id: "one", title: "One", start: date(1, 9), end: date(1, 10) }) +
        `<orb-calendar-event id="three">Three</orb-calendar-event>`,
    );
    await page.evaluate(
      ([moved, thirdStart, thirdEnd]) => {
        const set = (id: string, values: Record<string, number>) =>
          Object.assign(document.querySelector(`orb-calendar-event#${id}`)!, values);
        set("one", { start: moved, end: moved + 60 * 60 * 1000 });
        set("three", { start: thirdStart, end: thirdEnd });
      },
      [date(1, 11), date(3, 9), date(3, 10)],
    );
    await expect(part(page, "event").filter({ hasText: "One" })).toHaveAttribute("data-occ-start", `${date(1, 11)}`);
    await expect(part(page, "event").filter({ hasText: "Three" })).toHaveAttribute("data-occ-start", `${date(3, 9)}`);
  });

  test("a number end changes the event's height", async ({ page }) => {
    await mountRaw(page, eventMarkup({ id: "one", title: "One", start: date(1, 9), end: date(1, 10) }));
    const height = () =>
      part(page, "event").filter({ hasText: "One" }).evaluate((el) => (el as HTMLElement).style.height);
    expect(await height()).toContain("(60 / 60)");
    await page.evaluate((end) => {
      Object.assign(document.querySelector("orb-calendar-event#one")!, { end });
    }, date(1, 11));
    await expect.poll(height).toContain("(120 / 60)");
  });

  test("all-day=\"false\" makes a timed event, as it does before the element upgrades", async ({ page }) => {
    await mountRaw(
      page,
      `<orb-calendar-event id="one" start="${date(1, 9)}" end="${date(1, 10)}" all-day="false">One</orb-calendar-event>`,
    );
    await expect(part(page, "event").filter({ hasText: "One" })).toHaveCount(1);
    await expect(calendar(page).locator("[part~='event--all-day']")).toHaveCount(0);
  });

  test("text the app set before applyChange is drawn, when the change has the same title", async ({ page }) => {
    await mountCalendar(page, week(), oneEvent());
    await page.evaluate(
      ([start, end]) => {
        const cal = document.querySelector("orb-calendar") as unknown as {
          applyChange(mutation: unknown, kind: string): Promise<void>;
        };
        document.querySelector("orb-calendar-event#one")!.textContent = "Saved";
        void cal.applyChange({ event: { id: "one", title: "Saved", start, end }, scope: "single" }, "update");
      },
      [date(1, 9), date(1, 10)],
    );
    await expect(part(page, "event").filter({ hasText: "Saved" })).toHaveCount(1);
  });

  test("a change after a rename in the same task finds the event by its old id", async ({ page }) => {
    await mountCalendar(page, week(), [
      { id: "m", title: "Daily", start: date(0, 9), end: date(0, 9, 30), recurrence: "FREQ=DAILY" },
    ]);
    await page.evaluate(
      ([occurrenceStart, start, end]) => {
        const cal = document.querySelector("orb-calendar") as unknown as {
          applyChange(mutation: unknown, kind: string): Promise<void>;
        };
        document.querySelector("orb-calendar-event#m")!.id = "srv";
        void cal.applyChange(
          { event: { id: "m", title: "Moved", start, end }, scope: "occurrence", occurrenceStart },
          "update",
        );
      },
      [date(2, 9), date(2, 10), date(2, 10, 30)],
    );
    await expect.poll(async () => (await markupEvents(page)).find((e) => e.parent !== null)?.parent).toBe("srv");
    await expect(part(page, "event").filter({ hasText: "Moved" })).toHaveCount(1);
  });

  test("an id a listener gives a new event before it's saved is the id it's saved with", async ({ page }) => {
    await mountCalendar(page, week(), []);
    await page.evaluate(() =>
      document.querySelector("orb-calendar")!.addEventListener("orbEventCreate", (event) => {
        (event as CustomEvent).detail.element.id = "server-1";
      }),
    );
    await clickSlot(page, 1);
    await input(page, "Title").fill("New meeting");
    await button(page, "Save");
    await expect(calendar(page).locator("orb-calendar-event#server-1")).toHaveText("New meeting");
  });

  test("a rename a listener makes during an update is where the update is written", async ({ page }) => {
    await mountCalendar(page, week(), oneEvent());
    await page.evaluate(() =>
      document.querySelector("orb-calendar")!.addEventListener("orbEventUpdate", (event) => {
        (event as CustomEvent).detail.element.id = "server-one";
      }),
    );
    await part(page, "event").click();
    await input(page, "Title").fill("Renamed");
    await button(page, "Save");
    await expect(calendar(page).locator("orb-calendar-event#server-one")).toHaveText("Renamed");
    await expect(calendar(page).locator("orb-calendar-event#one")).toHaveCount(0);
  });

  test("a change to one occurrence leaves the master's times as the app wrote them", async ({ page }) => {
    await mountRaw(
      page,
      `<orb-calendar-event id="standup" start="2026-06-08T09:00" end="2026-06-08T09:30" recurrence="FREQ=DAILY">Standup</orb-calendar-event>`,
    );
    await page.evaluate(
      ([occurrenceStart, start, end]) => {
        const cal = document.querySelector("orb-calendar") as unknown as {
          applyChange(mutation: unknown, kind: string): Promise<void>;
        };
        void cal.applyChange(
          { event: { id: "standup", title: "Standup", start, end }, scope: "occurrence", occurrenceStart },
          "update",
        );
      },
      [date(2, 9), date(2, 10), date(2, 10, 30)],
    );
    await expect.poll(async () => (await markupEvents(page)).length).toBe(2);
    const events = await markupEvents(page);
    const master = events.find((e) => e.id === "standup")!;
    expect(master.start).toBe("2026-06-08T09:00");
    expect(master.end).toBe("2026-06-08T09:30");
    // The override is written in the calendar's own format, in New York's offset
    const override = events.find((e) => e.id !== "standup")!;
    expect(override.occurrence).toBe("2026-06-09T09:00-04:00");
    expect(override.start).toBe("2026-06-09T10:00-04:00");
  });

  test("a change keeps the app's own spelling of times, flags, and the title's whitespace", async ({ page }) => {
    await mountRaw(
      page,
      `<orb-calendar-event id="one" start="2026-06-08" end="2026-06-09" all-day="true">\n  Conference\n</orb-calendar-event>` +
        `<orb-calendar-event id="two" start="2026-06-09T09:00" end="2026-06-09T10:00">Standup</orb-calendar-event>`,
    );
    const before = await page.evaluate(() => document.querySelector("orb-calendar-event#one")!.outerHTML);
    await page.evaluate(
      ([start, end]) => {
        const cal = document.querySelector("orb-calendar") as unknown as {
          applyChange(mutation: unknown, kind: string): Promise<void>;
        };
        const two = document.querySelector("orb-calendar-event#two")!;
        (window as unknown as { text: ChildNode | null }).text = two.firstChild;
        void cal.applyChange(
          { event: { id: "two", title: "Standup", start, end, location: "Room" }, scope: "single" },
          "update",
        );
      },
      [date(2, 9), date(2, 10)],
    );
    await expect.poll(() => page.evaluate(() => document.querySelector("orb-calendar-event#two")!.getAttribute("location"))).toBe("Room");
    const two = await page.evaluate(() => {
      const el = document.querySelector("orb-calendar-event#two")!;
      return {
        start: el.getAttribute("start"),
        end: el.getAttribute("end"),
        sameText: el.firstChild === (window as unknown as { text: ChildNode | null }).text,
      };
    });
    expect(two).toEqual({ start: "2026-06-09T09:00", end: "2026-06-09T10:00", sameText: true });
    // The other event, which the write also looks at, is untouched
    expect(await page.evaluate(() => document.querySelector("orb-calendar-event#one")!.outerHTML)).toBe(before);
  });

  test("a drag on an event without an end leaves it without one", async ({ page }) => {
    await mountRaw(page, `<orb-calendar-event id="one" start="2026-06-08T09:00">One</orb-calendar-event>`);
    await dragEvent(page, Math.round(await hourHeight(page)));
    await expect.poll(async () => (await markupEvents(page))[0].start).toBe("2026-06-08T10:00-04:00");
    expect((await markupEvents(page))[0].end).toBeNull();
  });

  test("an all-day flag the app set as a property is replaced when the change turns it off", async ({ page }) => {
    await mountCalendar(page, week(), oneEvent());
    await page.evaluate(() => {
      Object.assign(document.querySelector("orb-calendar-event#one")!, { allDay: true });
    });
    await expect(calendar(page).locator("[part~='event--all-day']")).toHaveCount(1);
    await page.evaluate(
      ([start, end]) => {
        const cal = document.querySelector("orb-calendar") as unknown as {
          applyChange(mutation: unknown, kind: string): Promise<void>;
        };
        void cal.applyChange({ event: { id: "one", title: "One", start, end, allDay: false }, scope: "single" }, "update");
      },
      [date(1, 9), date(1, 10)],
    );
    await expect(calendar(page).locator("[part~='event--all-day']")).toHaveCount(0);
    expect(await page.evaluate(() => (document.querySelector("orb-calendar-event#one") as unknown as { allDay: boolean }).allDay)).toBe(false);
  });

  test("a location the app set as a property is replaced when the change gives another", async ({ page }) => {
    await mountCalendar(page, week(), [{ id: "one", title: "One", start: date(1, 9), end: date(1, 10), location: "B" }]);
    await page.evaluate(() => {
      Object.assign(document.querySelector("orb-calendar-event#one")!, { location: "A" });
    });
    await page.evaluate(
      ([start, end]) => {
        const cal = document.querySelector("orb-calendar") as unknown as {
          applyChange(mutation: unknown, kind: string): Promise<void>;
        };
        void cal.applyChange({ event: { id: "one", title: "One", start, end, location: "B" }, scope: "single" }, "update");
      },
      [date(1, 9), date(1, 10)],
    );
    await expect.poll(() => page.evaluate(() => (document.querySelector("orb-calendar-event#one") as unknown as { location: string }).location)).toBe("B");
  });

  test("a change finds the element in the markup now, after its element was replaced", async ({ page }) => {
    await mountCalendar(page, week(), oneEvent());
    await page.evaluate(
      ([start, end]) => {
        const cal = document.querySelector("orb-calendar")!;
        (window as unknown as { old: Element }).old = cal.querySelector("orb-calendar-event#one")!;
        const fresh = document.createElement("orb-calendar-event");
        fresh.id = "one";
        fresh.setAttribute("start", String(start));
        fresh.setAttribute("end", String(end));
        fresh.textContent = "Replaced";
        cal.replaceChildren(fresh);
        void (cal as unknown as { applyChange(m: unknown, k: string): Promise<void> }).applyChange(
          { event: { id: "one", title: "Final", start, end }, scope: "single" },
          "update",
        );
      },
      [date(1, 9), date(1, 10)],
    );
    await expect(part(page, "event").filter({ hasText: "Final" })).toHaveCount(1);
    expect(await page.evaluate(() => (window as unknown as { old: Element }).old.textContent)).toBe("One");
  });

  test("a change that throws doesn't leave the calendar ignoring its children", async ({ page }) => {
    await mountCalendar(page, week(), [
      { id: "bad", title: "Bad", start: date(1, 9), end: date(1, 10), recurrence: "FREQ=NOPE" },
      { id: "two", title: "Two", start: date(2, 9), end: date(2, 10) },
    ]);
    const rejected = await page.evaluate(
      ([start, end]) => {
        const cal = document.querySelector("orb-calendar") as unknown as {
          applyChange(mutation: unknown, kind: string): Promise<void>;
        };
        return cal
          .applyChange(
            { event: { id: "bad", title: "Bad", start, end, recurrence: "FREQ=NOPE" }, scope: "future", occurrenceStart: start },
            "update",
          )
          .then(
            () => false,
            () => true,
          );
      },
      [date(1, 9), date(1, 10)],
    );
    expect(rejected).toBe(true);
    await page.evaluate(() => {
      document.querySelector("orb-calendar-event#two")!.textContent = "Two edited";
    });
    await expect(part(page, "event").filter({ hasText: "Two edited" })).toHaveCount(1);
  });

  test("moved within the page, the calendar reads the changes it missed, and drags again", async ({ page }) => {
    await mountCalendar(page, week(), oneEvent());
    await watch(page, "orbEventUpdate");
    await page.evaluate(() => {
      const cal = document.querySelector("orb-calendar")!;
      const home = cal.parentElement!;
      const parked = document.createElement("div");
      // Out of the document: the calendar's observer is off until it's back
      parked.append(cal);
      cal.querySelector("orb-calendar-event#one")!.textContent = "Away";
      home.append(cal);
    });
    await expect(part(page, "event").filter({ hasText: "Away" })).toHaveCount(1);
    await dragEvent(page, Math.round(await hourHeight(page)));
    await expect.poll(async () => (await log(page)).map((entry) => entry.type)).toEqual(["orbEventUpdate"]);
  });

  test("two events without ids each report their own element when clicked", async ({ page }) => {
    await mountRaw(page, idless());
    await page.evaluate(() => {
      const names: string[] = [];
      (window as unknown as { names: string[] }).names = names;
      document.querySelector("orb-calendar")!.addEventListener("orbEventClick", (event) => {
        names.push(((event as CustomEvent).detail.element as HTMLElement).textContent!.trim());
      });
    });
    await part(page, "event").filter({ hasText: "Alpha" }).click();
    await part(page, "event").filter({ hasText: "Beta" }).click();
    expect(await page.evaluate(() => (window as unknown as { names: string[] }).names)).toEqual(["Alpha", "Beta"]);
  });

  test("an event without an id exports a UID, and the same UID on each export", async ({ page }) => {
    await mountRaw(page, idless());
    const uids = () =>
      call<string>(page, "exportICS").then((ics) => ics.split(/\r?\n/).filter((line) => line.startsWith("UID:")));
    const first = await uids();
    expect(first).toHaveLength(2);
    expect(first.every((line) => /^UID:anon-\d+-(alpha|beta)$/.test(line))).toBe(true);
    expect(await uids()).toEqual(first);
  });
});

/**
 * Phase 6: a duplicated id, the ids new events get, and when the calendar reads
 * its children.
 */
test.describe("calendar duplicates, ids, and reads", () => {
  const twoDuplicates = (): Partial<OrbCalendarEvent>[] => [
    { id: "dup", title: "First", start: date(1, 9), end: date(1, 10) },
    { id: "dup", title: "Second", start: date(1, 11), end: date(1, 12) },
    { id: "other", title: "Other", start: date(2, 9), end: date(2, 10) },
  ];

  test("a duplicated id warns once, however often the calendar reads", async ({ page }) => {
    const messages: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "warning") messages.push(message.text());
    });
    await mountCalendar(page, week(), twoDuplicates());
    // Each change reads the children again, and the duplicate is among them each time
    for (const step of [0, 1, 2]) {
      await page.evaluate((step) => {
        document.querySelector("orb-calendar-event#other")!.textContent = `Other ${step}`;
      }, step);
      await expect(part(page, "event").filter({ hasText: `Other ${step}` })).toHaveCount(1);
    }
    expect(messages.filter((text) => text.includes('more than one event has the id "dup"'))).toHaveLength(1);
  });

  test("deleting an event whose id is duplicated leaves no element with that id", async ({ page }) => {
    await mountCalendar(page, week(), twoDuplicates());
    await part(page, "event").filter({ hasText: "Second" }).click();
    await button(page, "Delete");
    await expect(part(page, "event")).toHaveCount(1);
    expect(await page.evaluate(() => document.querySelectorAll("orb-calendar-event#dup").length)).toBe(0);
  });

  test("two calendars make new events in one task, and the events get different ids", async ({ page }) => {
    const attrs = Object.entries(week())
      .map(([name, value]) => `${name}="${value}"`)
      .join(" ");
    await mount(page, `<orb-calendar id="a" ${attrs}></orb-calendar><orb-calendar id="b" ${attrs}></orb-calendar>`);
    const ids = await page.evaluate(
      ([start, end]) => {
        type Applies = { applyChange(mutation: unknown, kind: string): Promise<void> };
        const create = (id: string) =>
          (document.querySelector(`orb-calendar#${id}`) as unknown as Applies).applyChange(
            { event: { id: "", title: "New", start, end }, scope: "single" },
            "create",
          );
        // Both in one task, so only the counter tells them apart
        void create("a");
        void create("b");
        return ["a", "b"].map((id) => document.querySelector(`orb-calendar#${id} > orb-calendar-event`)?.id ?? "");
      },
      [date(1, 9), date(1, 10)],
    );
    expect(ids[0]).not.toBe("");
    expect(ids[0]).not.toBe(ids[1]);
  });

  test("the calendar reads its children only when one of them changes", async ({ page }) => {
    await mountCalendar(page, week(), [], [{ id: "work", name: "Work", color: "primary" }]);
    await page.evaluate(() => {
      const reads = { count: 0 };
      (window as unknown as { reads: typeof reads }).reads = reads;
      // Counts the reads of the source's name, which a read of the children makes
      Object.defineProperty(document.querySelector("orb-calendar-source#work")!, "name", {
        configurable: true,
        get() {
          reads.count++;
          return "Work";
        },
      });
    });
    const reads = () => page.evaluate(() => (window as unknown as { reads: { count: number } }).reads.count);
    const settled = () =>
      page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));

    const before = await reads();
    // A view change restyles the calendar, which isn't a change to its children
    await page.evaluate(() => {
      (document.querySelector("orb-calendar") as unknown as { view: string }).view = "day";
    });
    await expect(calendar(page).locator(".tg-col")).toHaveCount(1);
    await settled();
    expect(await reads()).toBe(before);

    // An event added to the calendar is a change to its children, so they're read
    const added = eventMarkup({ id: "added", title: "Added", start: date(1, 9), end: date(1, 10) });
    await page.evaluate((markup) => document.querySelector("orb-calendar")!.insertAdjacentHTML("beforeend", markup), added);
    await expect(part(page, "event").filter({ hasText: "Added" })).toHaveCount(1);
    expect(await reads()).toBeGreaterThan(before);
  });
});

/**
 * Phase 8: a narrow calendar gives its sidebar's calendars to a Calendars button
 * and menu. The calendar's own width decides, so a narrow calendar collapses on a
 * wide screen too, and every spec here runs on a wide viewport.
 */
test.describe("calendar collapsed sidebar", () => {
  test.use({ viewport: { width: 1400, height: 900 } });

  const work = { id: "work", name: "Work", color: "primary" };
  const home = { id: "home", name: "Home", color: "success" };
  const narrow = () => ({ ...week(), "show-sidebar": "true", style: "width: 40rem;" });
  const button = (page: Page) => calendar(page).locator(".sources-button");
  const items = (page: Page) => calendar(page).locator("orb-menu[part~='sources-menu'] orb-mi");
  const setWidth = (page: Page, width: string) =>
    page.evaluate((width) => {
      (document.querySelector("orb-calendar") as HTMLElement).style.width = width;
    }, width);
  const menuOpen = (page: Page) =>
    page.evaluate(() =>
      document
        .querySelector("orb-calendar")!
        .shadowRoot!.querySelector("orb-menu[part~='sources-menu']")!
        .matches(":popover-open"),
    );
  /** The elements that have focus, from the page down through each shadow root */
  const focusChain = (page: Page) =>
    page.evaluate(() => {
      const chain: string[] = [];
      let el: Element | null = document.activeElement;
      while (el) {
        const value = (el as HTMLElement & { value?: string }).value;
        chain.push(`${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""}${value ? `[${value}]` : ""}`);
        el = el.shadowRoot?.activeElement ?? null;
      }
      return chain;
    });

  test("a calendar 40rem wide shows the Calendars button, and not the sidebar", async ({ page }) => {
    await mountCalendar(page, narrow(), [], [work]);
    await expect(calendar(page).locator(".sidebar")).toBeHidden();
    await expect(button(page)).toBeVisible();
  });

  test("a calendar 64rem wide shows the sidebar, and changing its width switches back with no reload", async ({ page }) => {
    await mountCalendar(page, { ...narrow(), style: "width: 64rem;" }, [], [work]);
    await expect(calendar(page).locator(".sidebar")).toBeVisible();
    await expect(button(page)).toBeHidden();
    await setWidth(page, "40rem");
    await expect(calendar(page).locator(".sidebar")).toBeHidden();
    await expect(button(page)).toBeVisible();
    await setWidth(page, "64rem");
    await expect(calendar(page).locator(".sidebar")).toBeVisible();
    await expect(button(page)).toBeHidden();
  });

  test("the menu lists the calendars, checked unless they're hidden", async ({ page }) => {
    await mountCalendar(page, narrow(), [], [work, { ...home, hidden: true }]);
    await button(page).click();
    await expect(items(page)).toHaveCount(2);
    await expect(items(page).filter({ hasText: "Work" })).toHaveJSProperty("checked", true);
    await expect(items(page).filter({ hasText: "Home" })).toHaveJSProperty("checked", false);
    expect(await menuOpen(page)).toBe(true);
  });

  test("choosing a calendar hides it and its events, and the menu stays open", async ({ page }) => {
    await mountCalendar(
      page,
      narrow(),
      [{ id: "a", title: "A", start: date(1, 9), end: date(1, 10), calendarId: "work" }],
      [work],
    );
    await button(page).click();
    await items(page).filter({ hasText: "Work" }).click();
    await expect(calendar(page).locator("orb-calendar-source#work")).toHaveAttribute("hidden", "");
    await expect(part(page, "event")).toHaveCount(0);
    expect(await menuOpen(page)).toBe(true);
  });

  test("a canceled choice leaves the item checked, and the calendar as it was", async ({ page }) => {
    await mountCalendar(
      page,
      narrow(),
      [{ id: "a", title: "A", start: date(1, 9), end: date(1, 10), calendarId: "work" }],
      [work],
    );
    await page.evaluate(() =>
      document.querySelector("orb-calendar")!.addEventListener("orbSourceToggle", (event) => event.preventDefault()),
    );
    await button(page).click();
    await items(page).filter({ hasText: "Work" }).click();
    await expect(items(page).filter({ hasText: "Work" })).toHaveJSProperty("checked", true);
    await expect(calendar(page).locator("orb-calendar-source#work")).not.toHaveAttribute("hidden");
    await expect(part(page, "event")).toHaveCount(1);
  });

  test("a calendar added later gets an item, and removing hidden checks its item again", async ({ page }) => {
    await mountCalendar(page, narrow(), [], [work]);
    await expect(items(page)).toHaveCount(1);
    await page.evaluate(
      (markup) => document.querySelector("orb-calendar")!.insertAdjacentHTML("beforeend", markup),
      sourceMarkup({ ...home, hidden: true }),
    );
    await expect(items(page)).toHaveCount(2);
    await expect(items(page).filter({ hasText: "Home" })).toHaveJSProperty("checked", false);
    await page.evaluate(() => document.querySelector("orb-calendar-source#home")!.removeAttribute("hidden"));
    await expect(items(page).filter({ hasText: "Home" })).toHaveJSProperty("checked", true);
  });

  test("no sources, or the sidebar off, means no Calendars button at any width", async ({ page }) => {
    await mountCalendar(page, narrow(), [], []);
    await expect(button(page)).toHaveCount(0);
    await mountCalendar(page, { ...narrow(), "show-sidebar": "false" }, [], [work]);
    await expect(button(page)).toHaveCount(0);
  });

  test("widening the calendar while its menu is open closes the menu", async ({ page }) => {
    await mountCalendar(page, narrow(), [], [work]);
    await button(page).click();
    await expect.poll(() => menuOpen(page)).toBe(true);
    await setWidth(page, "64rem");
    await expect.poll(() => menuOpen(page)).toBe(false);
  });

  test("the keyboard opens the menu on its first calendar, toggles it, and closes back to the button", async ({
    page,
  }) => {
    await mountCalendar(page, narrow(), [], [work, home]);
    await button(page).focus();
    await page.keyboard.press("Enter");
    await expect.poll(() => focusChain(page)).toContain("orb-mi[work]");
    await page.keyboard.press("Space");
    await expect(calendar(page).locator("orb-calendar-source#work")).toHaveAttribute("hidden", "");
    expect(await menuOpen(page)).toBe(true);
    await page.keyboard.press("Escape");
    await expect.poll(() => menuOpen(page)).toBe(false);
    await expect.poll(() => focusChain(page)).toContain("orb-button#sources-button");
  });
});

/**
 * Phase 7: which times a block shows, by view. Week and month views show the name
 * alone, and the times are read by screen readers. Day view shows them too.
 */
test.describe("calendar event times by view", () => {
  /** The block's text as a person sees it: what isn't read by screen readers only */
  const shownText = (page: Page, title: string) =>
    part(page, "event")
      .filter({ hasText: title })
      .evaluate((el) => {
        const copy = el.cloneNode(true) as HTMLElement;
        copy.querySelectorAll(".visually-hidden").forEach((node) => node.remove());
        return (copy.textContent ?? "").trim();
      });
  const planning = (): Partial<OrbCalendarEvent>[] => [
    { id: "planning", title: "Planning", start: date(1, 9), end: date(1, 10, 30) },
  ];

  test("week view shows the name only, and the times are read by screen readers", async ({ page }) => {
    await mountCalendar(page, week(), planning());
    await expect(part(page, "event").filter({ hasText: "Planning" })).toHaveCount(1);
    expect(await shownText(page, "Planning")).toBe("Planning");
    await expect(part(page, "event").filter({ hasText: "Planning" }).locator(".visually-hidden")).toHaveText(
      "9:00 AM to 10:30 AM",
    );
    await expect(calendar(page).locator(".tg-event-time")).toHaveCount(0);
  });

  test("month view shows the name only, and the times are read by screen readers", async ({ page }) => {
    await mountCalendar(page, { ...week(), view: "month" }, planning());
    await expect(part(page, "event").filter({ hasText: "Planning" })).toHaveCount(1);
    expect(await shownText(page, "Planning")).toBe("Planning");
    await expect(part(page, "event").filter({ hasText: "Planning" }).locator(".visually-hidden")).toHaveText(
      "9:00 AM to 10:30 AM",
    );
    await expect(calendar(page).locator(".pill-time")).toHaveCount(0);
  });

  test("day view shows the name, then the start and end times", async ({ page }) => {
    await mountCalendar(page, { ...week(), view: "day" }, planning());
    const block = part(page, "event").filter({ hasText: "Planning" });
    await expect(block.locator(".tg-event-time")).toHaveText("9:00 – 10:30 AM");
    // The name comes first, so it's what shows when a short block has no room for the times
    expect(await block.evaluate((el) => Array.from(el.children).map((child) => child.className))).toEqual([
      "tg-event-title",
      "tg-event-time",
      "tg-resize-handle",
    ]);
  });

  test("day view puts the meridiem once when both times share it, and in full when they don't", async ({ page }) => {
    await mountCalendar(page, { ...week(), view: "day" }, [
      { id: "same", title: "Same", start: date(1, 9), end: date(1, 10, 30) },
      { id: "cross", title: "Cross", start: date(1, 11), end: date(1, 13) },
    ]);
    const timeOf = (title: string) => part(page, "event").filter({ hasText: title }).locator(".tg-event-time");
    await expect(timeOf("Same")).toHaveText("9:00 – 10:30 AM");
    await expect(timeOf("Cross")).toHaveText("11:00 AM – 1:00 PM");
  });
});
