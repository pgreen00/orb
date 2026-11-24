/**
 * The child elements of `orb-calendar`, and the markup they're read from and
 * written to. The calendar reads them in the next phase; this covers the
 * elements and `utils/markup.ts`.
 *
 * Times are local, in America/New_York, and the runner runs in that zone too,
 * since the specs build dates in both.
 *
 * Run with: npx playwright test tests/calendar*.spec.ts --project=chromium --project=webkit
 */
import { test, expect, type Page } from "@playwright/test";
import { mount } from "./utils";

process.env.TZ = "America/New_York";
test.use({ timezoneId: "America/New_York" });

/** The markup helpers, from the built bundle */
interface Markup {
  parseTime: (value: string | number | null | undefined) => number | undefined;
  formatTime: (epoch: number, allDay?: boolean) => string;
  readSource: (el: HTMLElement) => Record<string, unknown>;
  readEvent: (el: HTMLElement) => Record<string, unknown> | undefined;
  createEventElement: (event: unknown) => HTMLElement;
  writeEvent: (el: HTMLElement, event: unknown) => void;
}

declare global {
  interface Window {
    markup: Markup;
  }
}

/** Puts the helpers on `window` for the page's own scripts to use */
const loadMarkup = (page: Page) =>
  page.evaluate(async () => {
    // @ts-expect-error the built bundle is served under /dist, and has no types at that path
    const mod = (await import("/dist/components/index.js")) as Record<string, unknown>;
    // The exports are named for the calendar, so the helpers are mapped to the names these specs use
    window.markup = {
      ...mod,
      parseTime: mod.parseCalendarTime,
      formatTime: mod.formatCalendarTime,
    } as unknown as Markup;
  });

test.beforeEach(async ({ page }) => {
  await mount(page, "");
  await loadMarkup(page);
});

test.describe("calendar markup: times", () => {
  test("a timed value round-trips exactly, in local time with its offset", async ({ page }) => {
    const result = await page.evaluate(() =>
      ["2026-06-08T09:00", "2026-06-08T10:00-04:00", "2026-06-08T23:59:59", "2026-06-08T23:59:59.123", "2026-12-31T18:30Z"].map(
        (value) => {
          const epoch = window.markup.parseTime(value);
          const written = window.markup.formatTime(epoch!);
          return { value, epoch, written, again: window.markup.parseTime(written) };
        },
      ),
    );
    for (const { value, epoch, written, again } of result) {
      expect(again, value).toBe(epoch);
      expect(written, value).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{3})?)?[+-]\d{2}:\d{2}$/);
    }
    // Seconds and milliseconds are only there when they're set
    expect(result[0].written).toBe("2026-06-08T09:00-04:00");
    expect(result[2].written).toBe("2026-06-08T23:59:59-04:00");
    expect(result[3].written).toBe("2026-06-08T23:59:59.123-04:00");
  });

  test("a date alone is local midnight, and all-day values are written as dates", async ({
    page,
  }) => {
    const result = await page.evaluate(() => {
      const epoch = window.markup.parseTime("2026-06-08")!;
      const date = new Date(epoch);
      return {
        hours: date.getHours(),
        minutes: date.getMinutes(),
        written: window.markup.formatTime(epoch, true),
        roundTrip: window.markup.parseTime(window.markup.formatTime(epoch, true)) === epoch,
      };
    });
    expect(result).toEqual({ hours: 0, minutes: 0, written: "2026-06-08", roundTrip: true });
  });

  test("an offset or Z is read as written, and a value without one is local", async ({ page }) => {
    const result = await page.evaluate(() => ({
      z: new Date(window.markup.parseTime("2026-06-08T09:00Z")!).toISOString(),
      plusTwo: new Date(window.markup.parseTime("2026-06-08T09:00+02:00")!).toISOString(),
      localHour: new Date(window.markup.parseTime("2026-06-08T09:00")!).getHours(),
      fromText: window.markup.parseTime("1780923600000"),
      fromNumber: window.markup.parseTime(1780923600000),
    }));
    expect(result).toMatchObject({
      z: "2026-06-08T09:00:00.000Z",
      plusTwo: "2026-06-08T07:00:00.000Z",
      localHour: 9,
    });
    expect(result.fromText).toBe(result.fromNumber);
  });

  test("junk and impossible fields are undefined", async ({ page }) => {
    const result = await page.evaluate(() =>
      ["", "hello", "2026-13-01", "2026-02-30", "2026-06-08T25:00", "2026-06-08T09:75"].map((value) =>
        window.markup.parseTime(value),
      ),
    );
    expect(result).toEqual([undefined, undefined, undefined, undefined, undefined, undefined]);
  });

  test("across the DST change, wall-clock times keep their offsets and round-trip", async ({
    page,
  }) => {
    const result = await page.evaluate(() =>
      ["2026-03-07T09:00", "2026-03-08T09:00", "2026-03-09T09:00"].map((value) => {
        const epoch = window.markup.parseTime(value)!;
        const written = window.markup.formatTime(epoch);
        return { written, again: window.markup.parseTime(written) === epoch };
      }),
    );
    expect(result.map((r) => r.written)).toEqual([
      "2026-03-07T09:00-05:00",
      "2026-03-08T09:00-04:00",
      "2026-03-09T09:00-04:00",
    ]);
    expect(result.every((r) => r.again)).toBe(true);
  });
});

test.describe("calendar markup: reading elements", () => {
  const eventHtml = `<orb-calendar-event
      id="standup"
      start="2026-06-08T09:00"
      end="2026-06-08T09:30"
      calendar-id="work"
      location="Room 1"
      url="https://example.com"
      color="danger"
      recurrence="FREQ=DAILY"
      recurrence-exceptions="2026-06-09T09:00 2026-06-10T09:00"
    >Standup</orb-calendar-event>`;

  test("reads an event from its attributes and its text", async ({ page }) => {
    await mount(page, eventHtml);
    await loadMarkup(page);
    const event = await page.evaluate(() => window.markup.readEvent(document.querySelector<HTMLElement>("orb-calendar-event")!));
    expect(event).toMatchObject({
      id: "standup",
      title: "Standup",
      allDay: false,
      calendarId: "work",
      location: "Room 1",
      url: "https://example.com",
      color: "danger",
      recurrence: "FREQ=DAILY",
      readonly: false,
    });
    expect((event!.end as number) - (event!.start as number)).toBe(30 * 60 * 1000);
    expect(event!.recurrenceExceptions).toHaveLength(2);
  });

  test("a missing end is a day for an all-day event, and an hour otherwise", async ({ page }) => {
    await mount(
      page,
      `<orb-calendar-event id="day" start="2026-06-08" all-day>Day</orb-calendar-event>
       <orb-calendar-event id="hour" start="2026-06-08T09:00">Hour</orb-calendar-event>`,
    );
    await loadMarkup(page);
    const events = await page.evaluate(() =>
      Array.from(document.querySelectorAll<HTMLElement>("orb-calendar-event")).map((el) => window.markup.readEvent(el)!),
    );
    expect((events[0].end as number) - (events[0].start as number)).toBe(24 * 60 * 60 * 1000);
    expect((events[1].end as number) - (events[1].start as number)).toBe(60 * 60 * 1000);
    expect(events[0].allDay).toBe(true);
    expect(events[1].allDay).toBe(false);
  });

  test("an event with no usable start has nothing to read", async ({ page }) => {
    await mount(page, `<orb-calendar-event id="x" start="soon">No start</orb-calendar-event>`);
    await loadMarkup(page);
    const event = await page.evaluate(() => window.markup.readEvent(document.querySelector<HTMLElement>("orb-calendar-event")!));
    expect(event).toBeUndefined();
  });

  test("reads the same before and after the element is defined", async ({ page }) => {
    // Placed by hand, so it can be read before anything defines the tag
    const before = await page.evaluate((html) => {
      document.querySelector("#root")!.innerHTML = html;
      const el = document.querySelector<HTMLElement>("orb-calendar-event")!;
      const read = window.markup.readEvent(el);
      return { read, defined: !!customElements.get("orb-calendar-event") };
    }, eventHtml);
    expect(before.defined).toBe(false);
    // Defining the tag upgrades the element in place
    await page.evaluate(async () => {
      // @ts-expect-error the built bundle is served under /dist, and has no types at that path
      await import("/dist/components/orb-calendar-event.js");
      await customElements.whenDefined("orb-calendar-event");
    });
    const after = await page.evaluate(() => window.markup.readEvent(document.querySelector<HTMLElement>("orb-calendar-event")!));
    expect(after).toEqual(before.read);
  });

  test("reads a source, including one that starts hidden", async ({ page }) => {
    await mount(
      page,
      `<orb-calendar-source id="work" name="Work" color="primary"></orb-calendar-source>
       <orb-calendar-source id="home" name="Home" hidden></orb-calendar-source>`,
    );
    await loadMarkup(page);
    const sources = await page.evaluate(() =>
      Array.from(document.querySelectorAll<HTMLElement>("orb-calendar-source")).map((el) => window.markup.readSource(el)),
    );
    expect(sources[0]).toMatchObject({ id: "work", name: "Work", color: "primary", hidden: false });
    expect(sources[1]).toMatchObject({ id: "home", name: "Home", hidden: true });
  });

  test("neither element draws anything", async ({ page }) => {
    await mount(
      page,
      `<orb-calendar-event id="e" start="2026-06-08T09:00">A title in the light DOM</orb-calendar-event>
       <orb-calendar-source id="s" name="Work"></orb-calendar-source>`,
    );
    const drawn = await page.evaluate(() =>
      ["orb-calendar-event", "orb-calendar-source"].map((tag) => {
        const el = document.querySelector(tag) as HTMLElement;
        return {
          hasShadow: !!el.shadowRoot,
          // A shadow root with no slot hides the light DOM, so nothing shows
          shadowText: el.shadowRoot?.textContent?.trim() ?? "",
          slots: el.shadowRoot?.querySelectorAll("slot").length ?? 0,
        };
      }),
    );
    expect(drawn).toEqual([
      { hasShadow: true, shadowText: "", slots: 0 },
      { hasShadow: true, shadowText: "", slots: 0 },
    ]);
  });
});

test.describe("calendar markup: writing elements", () => {
  /** A full event, built in the page where the helpers are */
  const event = (page: Page) =>
    page.evaluate(() => {
      const start = window.markup.parseTime("2026-06-08T09:00")!;
      return {
        id: "standup",
        title: "Standup",
        start,
        end: start + 30 * 60 * 1000,
        allDay: false,
        calendarId: "work",
        location: "Room 1",
        url: "https://example.com",
        color: "danger",
        recurrence: "FREQ=DAILY",
        readonly: false,
      };
    });

  test("writes attributes and text, leaving out what the event doesn't have", async ({ page }) => {
    const original = await event(page);
    const result = await page.evaluate((original) => {
      const el = window.markup.createEventElement(original);
      return {
        tag: el.tagName,
        attributes: Object.fromEntries(Array.from(el.attributes).map((a) => [a.name, a.value])),
        text: el.textContent,
      };
    }, original);
    expect(result.tag).toBe("ORB-CALENDAR-EVENT");
    expect(result.text).toBe("Standup");
    expect(result.attributes).toMatchObject({
      id: "standup",
      start: "2026-06-08T09:00-04:00",
      end: "2026-06-08T09:30-04:00",
      "calendar-id": "work",
      location: "Room 1",
      url: "https://example.com",
      color: "danger",
      recurrence: "FREQ=DAILY",
    });
    for (const name of ["all-day", "readonly", "notes", "recurrence-id", "recurrence-parent-id", "recurrence-exceptions"]) {
      expect(result.attributes, name).not.toHaveProperty(name);
    }
  });

  test("an all-day event is written as dates, and a flag as a bare attribute", async ({ page }) => {
    const original = await event(page);
    const result = await page.evaluate((original) => {
      const start = window.markup.parseTime("2026-06-08")!;
      const el = window.markup.createEventElement({
        ...original,
        allDay: true,
        readonly: true,
        start,
        end: start + 3 * 24 * 60 * 60 * 1000,
      });
      return {
        start: el.getAttribute("start"),
        end: el.getAttribute("end"),
        allDay: el.getAttribute("all-day"),
        readonly: el.getAttribute("readonly"),
      };
    }, original);
    expect(result).toEqual({ start: "2026-06-08", end: "2026-06-11", allDay: "", readonly: "" });
  });

  test("what it writes reads back as the same event", async ({ page }) => {
    const original = await event(page);
    const result = await page.evaluate((original) => {
      const start = window.markup.parseTime("2026-06-08T09:00:05.250")!;
      const written = { ...original, start, end: start + 30 * 60 * 1000, recurrenceExceptions: [start + 86400000] };
      const el = window.markup.createEventElement(written);
      return { written, read: window.markup.readEvent(el) };
    }, original);
    expect(result.read).toMatchObject({
      id: result.written.id,
      title: "Standup",
      start: result.written.start,
      end: result.written.end,
      calendarId: "work",
      recurrence: "FREQ=DAILY",
      recurrenceExceptions: result.written.recurrenceExceptions,
    });
  });

  test("writing the same event again changes nothing", async ({ page }) => {
    const original = await event(page);
    const changes = await page.evaluate((original) => {
      const el = window.markup.createEventElement(original);
      document.body.append(el);
      const observed: string[] = [];
      const observer = new MutationObserver(() => {});
      observer.observe(el, { attributes: true, childList: true, characterData: true, subtree: true });
      window.markup.writeEvent(el, original);
      observed.push(...observer.takeRecords().map((r) => r.type));
      observer.disconnect();
      return observed;
    }, original);
    expect(changes).toEqual([]);
  });

  test("a change writes only what it changed", async ({ page }) => {
    const original = await event(page);
    const result = await page.evaluate((original) => {
      const el = window.markup.createEventElement(original);
      document.body.append(el);
      const observer = new MutationObserver(() => {});
      observer.observe(el, { attributes: true, childList: true, characterData: true, subtree: true });
      window.markup.writeEvent(el, { ...original, title: "Moved", location: undefined });
      const records = observer.takeRecords().map((r) => r.attributeName ?? r.type);
      observer.disconnect();
      return { records: Array.from(new Set(records)).sort(), title: el.textContent, location: el.getAttribute("location") };
    }, original);
    // Setting the text replaces the text node, which reads as a child change
    expect(result.records).toEqual(["childList", "location"]);
    expect(result.title).toBe("Moved");
    expect(result.location).toBeNull();
  });
});
