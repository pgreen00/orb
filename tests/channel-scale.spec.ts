import { test, expect, type Page } from "@playwright/test";
import { mount } from "./utils";

const PEOPLE = `
  <orb-channel-participant id="ada" name="Ada"></orb-channel-participant>
  <orb-channel-participant id="grace" name="Grace"></orb-channel-participant>`;

const row = (page: Page, id: string) => page.locator(`orb-channel [role='article'][data-id='${id}']`);
const toggle = (page: Page) => page.locator("orb-channel [part~='thread-toggle']").first();

/** Keeps each named event the channel emits, as plain values, in `window.log` */
const watch = (page: Page, ...names: string[]) =>
  page.locator("orb-channel").evaluate((el, names) => {
    (window as any).log = [];
    for (const name of names) {
      el.addEventListener(name, (ev: any) => {
        const d = ev.detail ?? {};
        (window as any).log.push({
          type: name,
          parent: d.parent?.id,
          to: d.to?.id,
          cursor: d.cursor,
          direction: d.direction,
          text: d.text,
          typing: d.typing,
          message: d.message?.id,
        });
      });
    }
  }, names);

const log = (page: Page) => page.evaluate(() => (window as any).log);

/** The top of a row, relative to the top of the list */
const rowTop = (page: Page, id: string) =>
  page.evaluate((id) => {
    const list = document.querySelector("orb-channel")!.shadowRoot!.querySelector("[role='log']")!;
    const row = document.querySelector("orb-channel")!.shadowRoot!.querySelector(`[role='article'][data-id='${id}']`);
    return row ? row.getBoundingClientRect().top - list.getBoundingClientRect().top : null;
  }, id);

/** A list of `count` messages from Grace, m0 to m(count-1) */
const messages = (count: number) =>
  Array.from({ length: count }, (_, i) => `<orb-channel-message id="m${i}" from="grace" ts="2025-06-01T09:${String(i % 60).padStart(2, "0")}:00Z">Message ${i}</orb-channel-message>`).join("");

const THREAD = `<orb-channel-message id="m1" from="grace">Release 2.0 is out!</orb-channel-message><orb-channel-message id="r1" from="ada" thread="m1">Congrats!</orb-channel-message><orb-channel-message id="m2" from="grace">Anyone going to the meetup?</orb-channel-message><orb-channel-message id="r2" from="grace" thread="m1">Changelog is in the docs.</orb-channel-message>`;

test.describe("orb-channel threads", () => {
  test("inline threads show their replies under the message, and not in the list", async ({ page }) => {
    await mount(page, `<orb-channel pov="ada" threads="inline" style="height: 400px">${PEOPLE}${THREAD}</orb-channel>`);
    await expect(page.locator("orb-channel [part~='thread'] [data-id='r1']")).toBeVisible();
    await expect(page.locator("orb-channel [part~='list'] > [data-id='r1']")).toHaveCount(0);
    await expect(row(page, "m2")).toBeVisible();
    await expect(toggle(page)).toHaveText("Hide 2 replies");
  });

  test("panel threads open beside the list, emit orbThreadOpen, reflect open-thread, and return focus on close", async ({ page }) => {
    await mount(page, `<orb-channel pov="ada" threads="panel" style="height: 400px">${PEOPLE}${THREAD}</orb-channel>`);
    await watch(page, "orbThreadOpen", "orbThreadClose");
    await expect(page.locator("orb-channel [part~='thread-panel']")).toHaveCount(0);
    await expect(toggle(page)).toHaveText("Open thread · 2 replies");
    await toggle(page).click();
    await expect(page.locator("orb-channel [part~='thread-panel']")).toContainText("Congrats!");
    await expect(page.locator("orb-channel")).toHaveAttribute("open-thread", "m1");
    await expect.poll(() => log(page)).toEqual([expect.objectContaining({ type: "orbThreadOpen", parent: "m1" })]);
    await page.locator("orb-channel [part~='thread-close']").click();
    await expect(page.locator("orb-channel [part~='thread-panel']")).toHaveCount(0);
    await expect(page.locator("orb-channel")).not.toHaveAttribute("open-thread");
    await expect(row(page, "m1")).toBeFocused();
    await expect.poll(() => log(page)).toEqual([
      expect.objectContaining({ type: "orbThreadOpen" }),
      expect.objectContaining({ type: "orbThreadClose", parent: "m1" }),
    ]);
  });

  test("an open-thread attribute opens the panel on load", async ({ page }) => {
    await mount(page, `<orb-channel pov="ada" threads="panel" open-thread="m1" style="height: 400px">${PEOPLE}${THREAD}</orb-channel>`);
    await expect(page.locator("orb-channel [part~='thread-panel'] [data-id='r2']")).toBeVisible();
  });

  test("a reply whose message isn't in the channel is kept out of view until the message arrives", async ({ page }) => {
    await mount(page, `<orb-channel pov="ada" threads="inline" style="height: 400px">${PEOPLE}<orb-channel-message id="m1" from="grace">Hello</orb-channel-message><orb-channel-message id="r9" from="ada" thread="m9">Early reply</orb-channel-message></orb-channel>`);
    await expect(row(page, "r9")).toHaveCount(0);
    await page.evaluate(() => {
      const m9 = document.createElement("orb-channel-message");
      m9.id = "m9";
      m9.setAttribute("from", "grace");
      m9.textContent = "Late parent";
      document.querySelector("orb-channel")!.append(m9);
    });
    await expect(page.locator("orb-channel [part~='thread'] [data-id='r9']")).toBeVisible();
  });

  test("replies deeper than max-depth sit at the last level", async ({ page }) => {
    const replies = `<orb-channel-message id="m1" from="grace">Root</orb-channel-message><orb-channel-message id="r1" from="ada" thread="m1">One</orb-channel-message><orb-channel-message id="r2" from="grace" thread="r1">Two</orb-channel-message>`;
    await mount(page, `<orb-channel pov="ada" threads="inline" style="height: 400px">${PEOPLE}${replies}</orb-channel>`);
    await expect(row(page, "r2")).toHaveAttribute("style", /--depth: 1/);
    await mount(page, `<orb-channel pov="ada" threads="inline" max-depth="3" style="height: 400px">${PEOPLE}${replies}</orb-channel>`);
    await expect(row(page, "r2")).toHaveAttribute("style", /--depth: 2/);
  });

  test("thread-count overrides the replies in the DOM, and the missing ones are asked for with orbLoadMore", async ({ page }) => {
    await mount(page, `<orb-channel pov="ada" threads="inline" style="height: 400px">${PEOPLE}<orb-channel-message id="m1" from="grace" thread-count="14">Release</orb-channel-message><orb-channel-message id="r1" from="ada" thread="m1">One</orb-channel-message><orb-channel-message id="r2" from="grace" thread="m1">Two</orb-channel-message></orb-channel>`);
    await watch(page, "orbLoadMore");
    await expect(page.locator("orb-channel [part~='thread-load']")).toHaveText("View 12 more replies");
    await page.locator("orb-channel [part~='thread-load']").click();
    await expect.poll(() => log(page)).toEqual([expect.objectContaining({ type: "orbLoadMore", parent: "m1" })]);
  });

  test("a thread with thread-state collapsed starts closed, and the reader opens it without changing the attribute", async ({ page }) => {
    await mount(page, `<orb-channel pov="ada" threads="inline" style="height: 400px">${PEOPLE}<orb-channel-message id="m1" from="grace" thread-state="collapsed">Release</orb-channel-message><orb-channel-message id="r1" from="ada" thread="m1">One</orb-channel-message></orb-channel>`);
    await expect(toggle(page)).toHaveText("Show 1 reply");
    await expect(row(page, "r1")).toHaveCount(0);
    await toggle(page).click();
    await expect(row(page, "r1")).toBeVisible();
    await expect(page.locator("orb-channel-message#m1")).toHaveAttribute("thread-state", "collapsed");
  });

  test("a reply box in a thread sends to its message, and echo gives the reply its thread", async ({ page }) => {
    await mount(page, `<orb-channel pov="ada" threads="panel" echo style="height: 400px">${PEOPLE}${THREAD}<orb-channel-composer name="body"></orb-channel-composer></orb-channel>`);
    await watch(page, "orbSend");
    await toggle(page).click();
    await page.locator("orb-channel [part~='thread-panel'] textarea").click();
    await page.keyboard.type("Thanks!");
    await page.keyboard.press("Enter");
    await expect.poll(() => log(page)).toEqual([expect.objectContaining({ type: "orbSend", text: "Thanks!", to: "m1" })]);
    await expect(page.locator("orb-channel-message[thread='m1']")).toHaveCount(3);
    await expect(page.locator("orb-channel [part~='thread-panel']")).toContainText("Thanks!");
  });

  test("Reply opens the thread when threads are shown, and emits orbReply without them", async ({ page }) => {
    await mount(page, `<orb-channel pov="ada" threads="panel" style="height: 400px">${PEOPLE}${THREAD}</orb-channel>`);
    await watch(page, "orbReply");
    await row(page, "m1").click({ button: "right" });
    await page.locator("orb-channel orb-mi").filter({ hasText: "Reply" }).click();
    await expect(page.locator("orb-channel [part~='thread-panel']")).toBeVisible();
    expect(await log(page)).toEqual([]);

    await mount(page, `<orb-channel pov="ada" style="height: 400px">${PEOPLE}${THREAD}</orb-channel>`);
    await watch(page, "orbReply");
    await row(page, "m1").click({ button: "right" });
    await page.locator("orb-channel orb-mi").filter({ hasText: "Reply" }).click();
    await expect.poll(() => log(page)).toEqual([expect.objectContaining({ type: "orbReply", message: "m1" })]);
  });
});

test.describe("orb-channel long lists", () => {
  test("only the rows near the viewport are drawn, and a far message can be scrolled to", async ({ page }) => {
    await mount(page, `<orb-channel pov="ada" style="height: 400px">${PEOPLE}${messages(1000)}</orb-channel>`);
    await expect(row(page, "m999")).toBeVisible();
    expect(await page.locator("orb-channel [role='article']").count()).toBeLessThan(100);
    await expect(page.locator("orb-channel .spacer").first()).toBeAttached();
    await page.evaluate(() => (document.querySelector("orb-channel") as any).scrollToMessage("m500", { behavior: "auto" }));
    await expect(row(page, "m500")).toBeVisible();
    await expect(row(page, "m0")).toHaveCount(0);
  });

  test("scrolling to the top asks for older messages once, and the message in view stays put when older ones arrive", async ({ page }) => {
    await mount(page, `<orb-channel pov="ada" style="height: 400px">${PEOPLE}${messages(300)}</orb-channel>`);
    await watch(page, "orbLoadMore");
    await page.evaluate(() => (document.querySelector("orb-channel")!.shadowRoot!.querySelector("[role='log']") as HTMLElement).scrollTop = 0);
    await expect.poll(() => log(page)).toEqual([expect.objectContaining({ type: "orbLoadMore", direction: "before", cursor: "m0" })]);
    await expect(row(page, "m0")).toBeVisible();
    const before = await rowTop(page, "m0");
    await page.evaluate(() => {
      const channel = document.querySelector("orb-channel")!;
      const first = channel.querySelector("orb-channel-message")!;
      for (let i = 0; i < 20; i++) {
        const older = document.createElement("orb-channel-message");
        older.id = `p${i}`;
        older.setAttribute("from", "grace");
        older.textContent = `Older ${i}`;
        channel.insertBefore(older, first);
      }
    });
    await expect(row(page, "p19")).toHaveCount(1);
    await expect.poll(() => rowTop(page, "m0")).toBeCloseTo(before!, -1);
  });

  test("a far message can be jumped to with the URL's hash", async ({ page }) => {
    await mount(page, `<orb-channel pov="ada" style="height: 400px">${PEOPLE}${messages(300)}</orb-channel>`);
    await expect(row(page, "m250")).toHaveCount(0);
    await page.evaluate(() => (location.hash = "m250"));
    await expect(row(page, "m250")).toBeVisible();
  });

  test("the jump pill counts the messages that arrive while the list is above its bottom, and goes to the newest", async ({ page }) => {
    await mount(page, `<orb-channel pov="ada" style="height: 400px">${PEOPLE}${messages(300)}</orb-channel>`);
    const pill = page.locator("orb-channel [part~='jump-pill']");
    await page.evaluate(() => (document.querySelector("orb-channel")!.shadowRoot!.querySelector("[role='log']") as HTMLElement).scrollTop = 0);
    await expect(pill).toHaveText("Jump to latest");
    await page.evaluate(() => {
      const channel = document.querySelector("orb-channel")!;
      for (let i = 1; i <= 3; i++) {
        const next = document.createElement("orb-channel-message");
        next.id = `new${i}`;
        next.setAttribute("from", "grace");
        next.textContent = `New ${i}`;
        channel.append(next);
      }
    });
    await expect(pill).toHaveText("3 new messages");
    await pill.click();
    await expect(row(page, "new3")).toBeVisible();
    await expect(pill).not.toBeVisible();
  });
});

test.describe("orb-channel receipts, typing and presence", () => {
  test("the viewer's last message shows Read, or Delivered when that's as far as receipts go", async ({ page }) => {
    await mount(page, `<orb-channel pov="ada" style="height: 300px">${PEOPLE}<orb-channel-message id="s1" from="ada" status="read">Merged.</orb-channel-message></orb-channel>`);
    await expect(page.locator("orb-channel [part~='receipt']")).toHaveText("Read");
    await mount(page, `<orb-channel pov="ada" receipts="delivered" style="height: 300px">${PEOPLE}<orb-channel-message id="s1" from="ada" status="read">Merged.</orb-channel-message></orb-channel>`);
    await expect(page.locator("orb-channel [part~='receipt']")).toHaveText("Delivered");
    await mount(page, `<orb-channel pov="ada" receipts="none" style="height: 300px">${PEOPLE}<orb-channel-message id="s1" from="ada" status="read">Merged.</orb-channel-message></orb-channel>`);
    await expect(page.locator("orb-channel [part~='receipt']")).toHaveCount(0);
  });

  test("a participant's typing attribute shows a line, and the viewer's typing emits orbTyping", async ({ page }) => {
    await mount(page, `<orb-channel pov="ada" style="height: 300px"><orb-channel-participant id="ada" name="Ada"></orb-channel-participant><orb-channel-participant id="grace" name="Grace" typing></orb-channel-participant><orb-channel-composer name="body"></orb-channel-composer></orb-channel>`);
    await expect(page.locator("orb-channel [part~='typing']")).toHaveText("Grace is typing…");
    await watch(page, "orbTyping");
    await page.locator("orb-channel textarea").click();
    await page.keyboard.type("Hi");
    await expect.poll(() => log(page)).toEqual([expect.objectContaining({ type: "orbTyping", typing: true })]);
    await page.keyboard.press("Enter");
    await expect.poll(() => log(page)).toEqual([
      expect.objectContaining({ type: "orbTyping", typing: true }),
      expect.objectContaining({ type: "orbTyping", typing: false }),
    ]);
  });

  test("presence sampled counts the people online, and full names them", async ({ page }) => {
    const people = `<orb-channel-participant id="ada" name="Ada"></orb-channel-participant><orb-channel-participant id="grace" name="Grace" presence="online"></orb-channel-participant><orb-channel-participant id="lin" name="Lin" presence="away"></orb-channel-participant>`;
    await mount(page, `<orb-channel pov="ada" kind="group" presence="sampled" style="height: 300px">${people}</orb-channel>`);
    await expect(page.locator("orb-channel [part~='presence']")).toHaveText("1 of 3 online");
    await mount(page, `<orb-channel pov="ada" kind="group" presence="full" style="height: 300px">${people}</orb-channel>`);
    await expect(page.locator("orb-channel [part~='presence']")).toContainText("Online: Grace");
    await expect(page.locator("orb-channel [part~='presence']")).toContainText("Away: Lin");
  });
});
