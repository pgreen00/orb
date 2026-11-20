import { test, expect, type Page } from "@playwright/test";
import { mount } from "./utils";

const PEOPLE = `
  <orb-channel-participant id="ada" name="Ada"></orb-channel-participant>
  <orb-channel-participant id="grace" name="Grace"></orb-channel-participant>`;

const messages = (count: number, from = "grace") =>
  Array.from({ length: count }, (_, i) => `<orb-channel-message id="m${i}" from="${from}">Message ${i}</orb-channel-message>`).join("");

const pill = (page: Page) => page.locator("orb-channel [part~='jump-pill']");

/** How far the channel's bottom is below the bottom of the screen. Zero or less when it's all in view. */
const gapBelow = (page: Page) =>
  page.evaluate(() => Math.round(document.querySelector("orb-channel")!.getBoundingClientRect().bottom - window.innerHeight));

test.describe("orb-channel with scroll-target=document", () => {
  test("the page scrolls, not the list, and the channel starts at the bottom of the page", async ({ page }) => {
    await mount(page, `<orb-channel pov="ada" scroll-target="document">${PEOPLE}${messages(60)}<orb-channel-composer name="body"></orb-channel-composer></orb-channel>`);
    const shape = await page.evaluate(() => {
      const list = document.querySelector("orb-channel")!.shadowRoot!.querySelector("[role='log']") as HTMLElement;
      return { listOverflow: list.scrollHeight - list.clientHeight, pageScrolls: document.documentElement.scrollHeight > window.innerHeight, pageY: window.scrollY };
    });
    expect(shape.listOverflow).toBeLessThanOrEqual(1);
    expect(shape.pageScrolls).toBe(true);
    expect(shape.pageY).toBeGreaterThan(0);
    await expect.poll(() => gapBelow(page)).toBeLessThanOrEqual(1);
  });

  test("new messages keep the bottom of the channel on screen while it follows", async ({ page }) => {
    await mount(page, `<orb-channel pov="ada" scroll-target="document">${PEOPLE}${messages(30)}<orb-channel-composer name="body"></orb-channel-composer></orb-channel>`);
    await expect.poll(() => gapBelow(page)).toBeLessThanOrEqual(1);
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
    await expect(page.locator("orb-channel [role='article'][data-id='n2']")).toHaveCount(1);
    await expect.poll(() => gapBelow(page)).toBeLessThanOrEqual(1);
  });

  test("scrolling up stops following, the pill counts what arrives, and the pill goes back to the bottom", async ({ page }) => {
    await mount(page, `<orb-channel pov="ada" scroll-target="document">${PEOPLE}${messages(30)}<orb-channel-composer name="body"></orb-channel-composer></orb-channel>`);
    await expect.poll(() => gapBelow(page)).toBeLessThanOrEqual(1);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.evaluate(() => {
      const channel = document.querySelector("orb-channel")!;
      const next = document.createElement("orb-channel-message");
      next.id = "late";
      next.setAttribute("from", "grace");
      next.textContent = "Arrived while scrolled up";
      channel.insertBefore(next, channel.querySelector("orb-channel-composer"));
    });
    await expect(pill(page)).toBeVisible();
    expect(await gapBelow(page)).toBeGreaterThan(16);
    await pill(page).click();
    await expect.poll(() => gapBelow(page)).toBeLessThanOrEqual(1);
    await expect(pill(page)).not.toBeVisible();
  });

  test("the jump pill takes no room, so the page doesn't move when it appears or goes", async ({ page }) => {
    await mount(page, `<orb-channel pov="ada" scroll-target="document">${PEOPLE}${messages(30)}<orb-channel-composer name="body"></orb-channel-composer></orb-channel>`);
    await expect.poll(() => gapBelow(page)).toBeLessThanOrEqual(1);
    const layout = () =>
      page.evaluate(() => {
        const host = document.querySelector("orb-channel")!;
        const list = host.shadowRoot!.querySelector("[role='log']") as HTMLElement;
        return { docHeight: document.documentElement.scrollHeight, hostTop: Math.round(host.getBoundingClientRect().top + window.scrollY), hostHeight: Math.round(host.getBoundingClientRect().height), listHeight: list.offsetHeight };
      });
    const before = await layout();
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(pill(page)).toBeVisible();
    expect(await layout()).toEqual(before);
    await pill(page).click();
    await expect(pill(page)).not.toBeVisible();
    expect(await layout()).toEqual(before);
  });

  test("the composer stays on the bottom of the screen when the page is scrolled up", async ({ page }) => {
    await mount(page, `<orb-channel pov="ada" scroll-target="document">${PEOPLE}${messages(30)}<orb-channel-composer name="body"></orb-channel-composer></orb-channel>`);
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect.poll(() => page.evaluate(() => Math.round(document.querySelector("orb-channel")!.shadowRoot!.querySelector(".composer")!.getBoundingClientRect().bottom))).toBe(await page.evaluate(() => window.innerHeight));
  });

  test("many messages draw only the rows near the screen, and the channel still ends at the bottom", async ({ page }) => {
    await mount(page, `<orb-channel pov="ada" scroll-target="document">${PEOPLE}${messages(400)}<orb-channel-composer name="body"></orb-channel-composer></orb-channel>`);
    await expect.poll(() => gapBelow(page)).toBeLessThanOrEqual(1);
    const drawn = await page.locator("orb-channel [role='article']").count();
    expect(drawn).toBeLessThan(100);
    await expect(page.locator("orb-channel [role='article'][data-id='m399']")).toHaveCount(1);
  });

  test("scrolling the page to the top of the channel asks for older messages, once", async ({ page }) => {
    await mount(page, `<orb-channel pov="ada" scroll-target="document">${PEOPLE}${messages(60)}</orb-channel>`);
    await page.locator("orb-channel").evaluate((el) => {
      (window as any).loads = [];
      el.addEventListener("orbLoadMore", (ev: any) => (window as any).loads.push(ev.detail.cursor));
    });
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect.poll(() => page.evaluate(() => (window as any).loads)).toEqual(["m0"]);
  });

  test("scrollToMessage brings the message onto the screen", async ({ page }) => {
    await mount(page, `<orb-channel pov="ada" scroll-target="document">${PEOPLE}${messages(60)}</orb-channel>`);
    await page.evaluate(() => (document.querySelector("orb-channel") as any).scrollToMessage("m5", { behavior: "auto" }));
    await expect.poll(() =>
      page.evaluate(() => {
        const row = document.querySelector("orb-channel")!.shadowRoot!.querySelector("[data-id='m5']") as HTMLElement | null;
        if (!row) return false;
        const { top, bottom } = row.getBoundingClientRect();
        return top >= 0 && bottom <= window.innerHeight;
      }),
    ).toBe(true);
  });

  test("with follow=question, the room below a question doesn't show the pill, and an answer past the screen does", async ({ page }) => {
    await mount(page, `<orb-channel pov="ada" follow="question" echo scroll-target="document">${PEOPLE}${messages(30)}<orb-channel-composer name="body"></orb-channel-composer></orb-channel>`);
    await page.locator("orb-channel textarea").click();
    await page.keyboard.type("A question?");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(400);
    await expect(pill(page)).not.toBeVisible();
    await page.evaluate(() => {
      const channel = document.querySelector("orb-channel")!;
      for (let i = 0; i < 12; i++) {
        const next = document.createElement("orb-channel-message");
        next.setAttribute("from", "grace");
        next.textContent = `Answer line ${i}, long enough that it takes a line of its own on the page.`;
        channel.append(next);
      }
    });
    await expect(pill(page)).toBeVisible();
    const questionTop = await page.evaluate(() => {
      const rows = [...document.querySelector("orb-channel")!.shadowRoot!.querySelectorAll("[role='article']")] as HTMLElement[];
      return Math.round(rows.find((r) => r.innerText.includes("A question?"))!.getBoundingClientRect().top);
    });
    expect(questionTop).toBeLessThan(200);
  });
});
