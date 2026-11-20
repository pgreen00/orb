import { test, expect, type Page } from "@playwright/test";
import { mount } from "./utils";

const PEOPLE = `
  <orb-channel-participant id="ada" name="Ada"></orb-channel-participant>
  <orb-channel-participant id="grace" name="Grace"></orb-channel-participant>`;

const row = (page: Page, id: string) => page.locator(`orb-channel [role='article'][data-id='${id}']`);
const item = (page: Page, label: string) => page.locator("orb-channel orb-mi").filter({ hasText: label });
const list = (page: Page) => page.locator("orb-channel [role='log'], orb-channel [role='feed']");
/** Replaces the clipboard, which is a getter on navigator, so the copied text lands on window */
const mockClipboard = (page: Page) =>
  page.evaluate(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (text: string) => ((window as any).copied = text) } }));
const pill = (page: Page) => page.locator("orb-channel [part~='jump-pill']");

/** Keeps each named event the channel emits, as plain values, in `window.log` */
const watch = (page: Page, ...names: string[]) =>
  page.locator("orb-channel").evaluate((el, names) => {
    (window as any).log = [];
    for (const name of names) {
      el.addEventListener(name, (ev: any) => {
        const d = ev.detail ?? {};
        (window as any).log.push({
          type: name,
          value: d.value,
          sort: d.sort,
          pinned: d.pinned,
          direction: d.direction,
          cursor: d.cursor,
          message: d.message?.id,
          current: d.current,
        });
      });
    }
  }, names);

const log = (page: Page) => page.evaluate(() => (window as any).log);

/** How far the row with this text is from the top of the list, or 999 when there's no such row */
const topOfText = (page: Page, text: string) =>
  page.evaluate((text) => {
    const root = document.querySelector("orb-channel")!.shadowRoot!;
    const list = root.querySelector("[role='log'], [role='feed']")!;
    const row = Array.from(root.querySelectorAll("[role='article']")).find((r) => (r as HTMLElement).innerText.includes(text));
    return row ? Math.abs(row.getBoundingClientRect().top - list.getBoundingClientRect().top) : 999;
  }, text);

/** A list of `count` messages from Grace, m0 to m(count-1) */
const messages = (count: number, from = "grace") =>
  Array.from({ length: count }, (_, i) => `<orb-channel-message id="m${i}" from="${from}">Message ${i}</orb-channel-message>`).join("");

test.describe("orb-channel layouts", () => {
  test("flat puts every message at the start with its name and no bubble", async ({ page }) => {
    await mount(page, `<orb-channel pov="ada" layout="flat" style="height: 300px">${PEOPLE}<orb-channel-message id="m1" from="ada">Mine</orb-channel-message><orb-channel-message id="m2" from="grace">Theirs</orb-channel-message></orb-channel>`);
    await expect(row(page, "m1").locator("[part~='name']")).toHaveText("Ada");
    await expect(row(page, "m2").locator("[part~='name']")).toHaveText("Grace");
    const background = await row(page, "m1").locator("[part~='bubble']").evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(background).toBe("rgba(0, 0, 0, 0)");

  });

  test("compact is one line per message, with the name before the text and no avatar", async ({ page }) => {
    await mount(page, `<orb-channel pov="ada" layout="compact" style="height: 300px">${PEOPLE}<orb-channel-message id="m1" from="grace">Shipped it</orb-channel-message></orb-channel>`);
    await expect(row(page, "m1").locator("[part~='avatar']")).toBeHidden();
    const name = await row(page, "m1").locator("[part~='name']").boundingBox();
    const text = await row(page, "m1").locator("[part~='bubble']").boundingBox();
    expect(Math.abs(name!.y - text!.y)).toBeLessThan(12);
  });

  test("assistant keeps bubbles for the point of view only", async ({ page }) => {
    await mount(page, `<orb-channel pov="ada" layout="assistant" style="height: 300px">${PEOPLE}<orb-channel-message id="m1" from="ada">Mine</orb-channel-message><orb-channel-message id="m2" from="grace">Theirs</orb-channel-message></orb-channel>`);
    const mine = await row(page, "m1").locator("[part~='bubble']").evaluate((el) => getComputedStyle(el).backgroundColor);
    const theirs = await row(page, "m2").locator("[part~='bubble']").evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(mine).not.toBe("rgba(0, 0, 0, 0)");
    expect(theirs).toBe("rgba(0, 0, 0, 0)");
  });
});

test.describe("orb-channel scrolling", () => {
  test("anchor top puts the composer above the list, and new messages don't move the list", async ({ page }) => {
    await mount(page, `<orb-channel pov="ada" anchor="top" style="height: 300px">${PEOPLE}${messages(30)}<orb-channel-composer name="body"></orb-channel-composer></orb-channel>`);
    const composer = await page.locator("orb-channel textarea").boundingBox();
    const listBox = await list(page).boundingBox();
    expect(composer!.y).toBeLessThan(listBox!.y);
    expect(await list(page).evaluate((el) => el.scrollTop)).toBe(0);
    await page.evaluate(() => {
      const channel = document.querySelector("orb-channel")!;
      for (let i = 0; i < 3; i++) {
        const next = document.createElement("orb-channel-message");
        next.id = `n${i}`;
        next.setAttribute("from", "grace");
        next.textContent = `New ${i}`;
        channel.insertBefore(next, channel.querySelector("orb-channel-composer"));
      }
    });
    await expect(row(page, "n2")).toHaveCount(1);
    expect(await list(page).evaluate((el) => el.scrollTop)).toBe(0);
  });

  test("anchor top asks for newer messages near the bottom, with the newest as the cursor", async ({ page }) => {
    await mount(page, `<orb-channel pov="ada" anchor="top" style="height: 300px">${PEOPLE}${messages(30)}</orb-channel>`);
    await watch(page, "orbLoadMore");
    await list(page).evaluate((el) => (el.scrollTop = el.scrollHeight));
    await expect.poll(() => log(page)).toEqual([expect.objectContaining({ type: "orbLoadMore", direction: "after", cursor: "m29" })]);
  });

  test("follow question brings the viewer's message to the top, and the answer grows below it", async ({ page }) => {
    await mount(page, `<orb-channel pov="ada" follow="question" echo style="height: 300px">${PEOPLE}${messages(30)}<orb-channel-composer name="body"></orb-channel-composer></orb-channel>`);
    await page.locator("orb-channel textarea").click();
    await page.keyboard.type("A question?");
    await page.keyboard.press("Enter");

    await expect(page.locator("orb-channel [role='article']").filter({ hasText: "A question?" })).toHaveCount(1);
    await expect.poll(() => topOfText(page, "A question?")).toBeLessThan(6);
    await page.evaluate(() => {
      const channel = document.querySelector("orb-channel")!;
      const answer = document.createElement("orb-channel-message");
      answer.id = "answer";
      answer.setAttribute("from", "grace");
      answer.textContent = "Here is the answer, a long one that grows below the question.";
      channel.insertBefore(answer, channel.querySelector("orb-channel-composer"));
    });
    await expect(row(page, "answer")).toHaveCount(1);
    expect(await topOfText(page, "A question?")).toBeLessThan(6);
  });

  test("pause-on-scroll stops following while the pointer is over the list, and the pill says so", async ({ page }) => {
    await mount(page, `<orb-channel pov="ada" pause-on-scroll style="height: 300px">${PEOPLE}${messages(30)}</orb-channel>`);
    await list(page).hover();
    const before = await list(page).evaluate((el) => el.scrollTop);
    await page.evaluate(() => {
      const channel = document.querySelector("orb-channel")!;
      for (let i = 1; i <= 3; i++) {
        const next = document.createElement("orb-channel-message");
        next.id = `p${i}`;
        next.setAttribute("from", "grace");
        next.textContent = `Paused ${i}`;
        channel.append(next);
      }
    });
    await expect(row(page, "p3")).toHaveCount(1);
    expect(await list(page).evaluate((el) => el.scrollTop)).toBe(before);
    await page.mouse.move(0, 0);
    await expect(pill(page)).toHaveText("Chat paused, 3 new");
    await pill(page).click();
    await expect(row(page, "p3")).toBeVisible();
    await expect(pill(page)).not.toBeVisible();
  });

  test("the room a question leaves below it doesn't show the pill, but messages that arrive below the screen do", async ({ page }) => {
    await mount(page, `<orb-channel pov="ada" follow="question" echo style="height: 300px">${PEOPLE}${messages(30)}<orb-channel-composer name="body"></orb-channel-composer></orb-channel>`);
    await page.locator("orb-channel textarea").click();
    await page.keyboard.type("A question?");
    await page.keyboard.press("Enter");
    await expect(page.locator("orb-channel [role='article']").filter({ hasText: "A question?" })).toHaveCount(1);
    await page.waitForTimeout(400);
    await expect(pill(page)).not.toBeVisible();
    await page.evaluate(() => {
      const channel = document.querySelector("orb-channel")!;
      for (let i = 0; i < 12; i++) {
        const next = document.createElement("orb-channel-message");
        next.setAttribute("from", "grace");
        next.textContent = `An answer line ${i}, long enough that it takes a line of its own in the list.`;
        channel.append(next);
      }
    });
    await expect(pill(page)).toBeVisible();
  });

  test("jump-to-latest=false hides the pill", async ({ page }) => {
    await mount(page, `<orb-channel pov="ada" jump-to-latest="false" style="height: 300px">${PEOPLE}${messages(30)}</orb-channel>`);
    await list(page).evaluate((el) => (el.scrollTop = 0));
    await expect.poll(() => list(page).evaluate((el) => el.scrollTop)).toBe(0);
    await expect(pill(page)).not.toBeVisible();
  });
});

test.describe("orb-channel announcements and nesting", () => {
  test("announce off makes the list a feed, which doesn't announce each message", async ({ page }) => {
    await mount(page, `<orb-channel pov="ada" announce="false" style="height: 300px">${PEOPLE}${messages(3)}</orb-channel>`);
    await expect(list(page)).toHaveAttribute("role", "feed");
    await expect(list(page)).not.toHaveAttribute("aria-live");
    await mount(page, `<orb-channel pov="ada" style="height: 300px">${PEOPLE}${messages(3)}</orb-channel>`);
    await expect(list(page)).toHaveAttribute("role", "log");
  });

  test("with max-depth above 1, inline replies are nested in their message's article", async ({ page }) => {
    const replies = `<orb-channel-message id="m1" from="grace">Root</orb-channel-message><orb-channel-message id="r1" from="ada" thread="m1">One</orb-channel-message><orb-channel-message id="r2" from="grace" thread="r1">Two</orb-channel-message>`;
    await mount(page, `<orb-channel pov="ada" threads="inline" max-depth="3" style="height: 400px">${PEOPLE}${replies}</orb-channel>`);
    await expect(page.locator("orb-channel [role='article'][data-id='m1'] [role='article'][data-id='r1']")).toHaveCount(1);
    await expect(page.locator("orb-channel [role='article'][data-id='m1'] [role='article'][data-id='r2']")).toHaveCount(1);
  });

  test("Left and Right collapse, expand, and move between a message and its replies", async ({ page }) => {
    const replies = `<orb-channel-message id="m1" from="grace">Root</orb-channel-message><orb-channel-message id="r1" from="ada" thread="m1">One</orb-channel-message>`;
    await mount(page, `<orb-channel pov="ada" threads="inline" style="height: 400px">${PEOPLE}${replies}</orb-channel>`);
    await row(page, "m1").focus();
    await page.keyboard.press("ArrowLeft");
    await expect(row(page, "r1")).toHaveCount(0);
    await page.keyboard.press("ArrowRight");
    await expect(row(page, "r1")).toBeVisible();
    await page.keyboard.press("ArrowRight");
    await expect(row(page, "r1")).toBeFocused();
    await page.keyboard.press("ArrowLeft");
    await expect(row(page, "m1")).toBeFocused();
  });
});

test.describe("orb-channel votes, sorting and actions", () => {
  test("votes show a score, and a vote button emits a cancelable orbVote with the value it's asking for", async ({ page }) => {
    await mount(page, `<orb-channel pov="ada" votes="up-down" style="height: 300px">${PEOPLE}<orb-channel-message id="m1" from="grace" score="4">Good post</orb-channel-message><orb-channel-message id="m2" from="grace" score="2" vote="up">Also good</orb-channel-message></orb-channel>`);
    await watch(page, "orbVote");
    await expect(row(page, "m1").locator("[part~='score']")).toHaveText("4");
    await row(page, "m1").locator("[part~='vote-up']").click();
    await row(page, "m2").locator("[part~='vote-up']").click();
    await row(page, "m1").locator("[part~='vote-down']").click();
    await expect.poll(() => log(page)).toEqual([
      expect.objectContaining({ type: "orbVote", message: "m1", value: "up" }),
      expect.objectContaining({ type: "orbVote", message: "m2", value: "none" }),
      expect.objectContaining({ type: "orbVote", message: "m1", value: "down" }),
    ]);
  });

  test("without votes there are no vote buttons", async ({ page }) => {
    await mount(page, `<orb-channel pov="ada" style="height: 300px">${PEOPLE}<orb-channel-message id="m1" from="grace">Post</orb-channel-message></orb-channel>`);
    await expect(page.locator("orb-channel [part~='votes']")).toHaveCount(0);
  });

  test("sorts give a menu, and choosing one emits orbSortChange and sets sort, unless it's canceled", async ({ page }) => {
    await mount(page, `<orb-channel pov="ada" sorts="top new old" style="height: 300px">${PEOPLE}${messages(3)}</orb-channel>`);
    await watch(page, "orbSortChange");
    const button = page.locator("orb-channel [part~='sort-button']");
    await expect(button).toHaveText("Top");
    await button.click();
    await item(page, "Oldest").click();
    await expect.poll(() => log(page)).toEqual([expect.objectContaining({ type: "orbSortChange", sort: "old" })]);
    await expect(page.locator("orb-channel")).toHaveAttribute("sort", "old");
    await expect(button).toHaveText("Oldest");

    await page.evaluate(() => document.querySelector("orb-channel")!.addEventListener("orbSortChange", (ev) => ev.preventDefault()));
    await button.click();
    await item(page, "Newest").click();
    await expect(page.locator("orb-channel")).toHaveAttribute("sort", "old");
  });

  test("actions lists exactly the named actions, in order, and drops the reaction row without react", async ({ page }) => {
    await mount(page, `<orb-channel pov="ada" actions="reply copy-link" style="height: 300px">${PEOPLE}<orb-channel-message id="m1" from="ada">Mine</orb-channel-message></orb-channel>`);
    await row(page, "m1").click({ button: "right" });
    await expect(item(page, "Reply")).toHaveCount(1);
    await expect(item(page, "Copy link")).toHaveCount(1);
    await expect(item(page, "Edit")).toHaveCount(0);
    await expect(page.locator("orb-channel orb-mi").filter({ hasText: /^Copy$/ })).toHaveCount(0);
    await expect(page.locator("orb-channel [part~='react']")).toHaveCount(0);
  });

  test("copy link copies the page's address with the message's id, or the permalink", async ({ page }) => {
    await mount(page, `<orb-channel pov="ada" actions="copy-link" style="height: 300px">${PEOPLE}<orb-channel-message id="m1" from="grace">Post</orb-channel-message></orb-channel>`);
    await mockClipboard(page);
    await row(page, "m1").click({ button: "right" });
    await item(page, "Copy link").click();
    await expect.poll(() => page.evaluate(() => (window as any).copied)).toMatch(/#m1$/);

    await mount(page, `<orb-channel pov="ada" actions="copy-link" permalink="/posts/42#{id}" style="height: 300px">${PEOPLE}<orb-channel-message id="m1" from="grace">Post</orb-channel-message></orb-channel>`);
    await mockClipboard(page);
    await row(page, "m1").click({ button: "right" });
    await item(page, "Copy link").click();
    await expect.poll(() => page.evaluate(() => (window as any).copied)).toMatch(/\/posts\/42#m1$/);
  });

  test("pin emits a cancelable orbPin with the new state", async ({ page }) => {
    await mount(page, `<orb-channel pov="ada" actions="pin" style="height: 300px">${PEOPLE}<orb-channel-message id="m1" from="grace">Post</orb-channel-message></orb-channel>`);
    await watch(page, "orbPin");
    await row(page, "m1").click({ button: "right" });
    await item(page, "Pin").click();
    await expect.poll(() => log(page)).toEqual([expect.objectContaining({ type: "orbPin", message: "m1", pinned: true })]);
  });
});

test.describe("orb-channel coalescing and presets", () => {
  test("coalesce waits before drawing a burst of updates", async ({ page }) => {
    await mount(page, `<orb-channel pov="ada" coalesce="250ms" style="height: 300px">${PEOPLE}</orb-channel>`);
    const drawn = await page.evaluate(() => {
      const channel = document.querySelector("orb-channel")!;
      for (let i = 0; i < 5; i++) {
        const next = document.createElement("orb-channel-message");
        next.id = `b${i}`;
        next.setAttribute("from", "grace");
        next.textContent = `Burst ${i}`;
        channel.append(next);
      }
      return document.querySelectorAll("orb-channel [role='article']").length;
    });
    expect(drawn).toBe(0);
    await expect(page.locator("orb-channel [role='article']")).toHaveCount(5);
  });

  test("a preset sets its layout and its other settings", async ({ page }) => {
    await mount(page, `<orb-channel pov="ada" preset="assistant" style="height: 300px">${PEOPLE}</orb-channel>`);
    await expect(list(page)).toHaveAttribute("data-layout", "assistant");
    await expect.poll(() => page.locator("orb-channel").evaluate((el: any) => el.follow)).toBe("question");
  });

  test("an attribute wins over the preset", async ({ page }) => {
    await mount(page, `<orb-channel pov="ada" preset="assistant" layout="flat" style="height: 300px">${PEOPLE}</orb-channel>`);
    await expect(list(page)).toHaveAttribute("data-layout", "flat");
  });

  test("preset comments makes an open channel, with top anchoring and inline threads", async ({ page }) => {
    await mount(page, `<orb-channel pov="ada" preset="comments" style="height: 300px">${PEOPLE}</orb-channel>`);
    await expect(page.locator("orb-channel")).toContainText("2 members");
    await expect.poll(() => page.locator("orb-channel").evaluate((el: any) => [el.anchor, el.threads, el.maxDepth])).toEqual(["top", "inline", 3]);
  });

  test("changing preset after load refills the settings the app hasn't set, and keeps the ones it has", async ({ page }) => {
    await mount(page, `<orb-channel pov="ada" layout="flat" style="height: 300px">${PEOPLE}</orb-channel>`);
    await page.locator("orb-channel").evaluate((el: any) => (el.preset = "live"));
    await expect(list(page)).toHaveAttribute("data-layout", "flat");
    await expect.poll(() => page.locator("orb-channel").evaluate((el: any) => el.coalesce)).toBe("250ms");
    await page.locator("orb-channel").evaluate((el: any) => el.removeAttribute("layout"));
    await page.locator("orb-channel").evaluate((el: any) => (el.preset = "assistant"));
    await expect(list(page)).toHaveAttribute("data-layout", "assistant");
  });
});
