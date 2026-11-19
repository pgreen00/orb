import { test, expect, type Page } from "@playwright/test";
import { modKey } from "./rich-text-utils";
import { mount } from "./utils";

const CONVERSATION = `
<orb-channel pov="ada" label="Grace" style="height: 300px">
  <orb-channel-participant id="ada" name="Ada"></orb-channel-participant>
  <orb-channel-participant id="grace" name="Grace" avatar="/a/grace.png"></orb-channel-participant>
  <orb-channel-message id="m1" from="grace" ts="2025-06-01T09:14:00Z">Did the compiler change land?</orb-channel-message>
  <orb-channel-message id="m2" from="ada" ts="2025-06-01T09:15:00Z">Yep, merged this morning.</orb-channel-message>
  <orb-channel-composer name="body" placeholder="Message Grace"></orb-channel-composer>
</orb-channel>`;

const articles = (page: Page) => page.locator("orb-channel [role='article']");

/** The `part` attribute of each message's row, in order */
const partsOf = (page: Page) =>
  page.locator("orb-channel").evaluate((el) =>
    Array.from(el.shadowRoot!.querySelectorAll("[role='article']")).map((row) => row.getAttribute("part")),
  );

/** Keeps the detail of each `name` event the channel emits, in `window.events` */
const record = (page: Page, name: string) =>
  page.locator("orb-channel").evaluate((el, name) => {
    (window as any).events = [];
    el.addEventListener(name, (ev: any) => (window as any).events.push(ev.detail));
  }, name);

/** The last `orbSend` detail, as plain values. Its `message` is set after the event, when `echo` is on. */
const lastSend = (page: Page) =>
  page.evaluate(() => {
    const detail = (window as any).events?.at(-1);
    return detail && { text: detail.text, message: detail.message?.textContent ?? null, from: detail.message?.getAttribute("from") ?? null };
  });

const draft = (page: Page) => page.locator("orb-channel textarea");

test.describe("orb-channel", () => {
  test("renders messages in DOM order, and marks the point of view's own messages as self", async ({ page }) => {
    await mount(page, CONVERSATION);
    await expect(articles(page)).toHaveCount(2);
    await expect(articles(page).nth(0)).toContainText("Did the compiler change land?");
    await expect(page.locator("orb-channel [part~='message'][part~='self']")).toContainText("Yep, merged this morning.");
  });

  test("groups consecutive messages from one sender that are close together", async ({ page }) => {
    await mount(page, `
      <orb-channel pov="ada" style="height: 300px">
        <orb-channel-message from="grace" ts="2025-06-01T09:00:00Z">One</orb-channel-message>
        <orb-channel-message from="grace" ts="2025-06-01T09:02:00Z">Two</orb-channel-message>
        <orb-channel-message from="grace" ts="2025-06-01T09:30:00Z">Three</orb-channel-message>
      </orb-channel>`);
    await expect.poll(() => partsOf(page)).toEqual([
      "message first-in-group",
      "message last-in-group",
      "message first-in-group last-in-group",
    ]);
  });

  test("names follow kind, and a setting the app sets is kept when kind changes", async ({ page }) => {
    await mount(page, CONVERSATION);
    const names = page.locator("orb-channel [part='name']");
    await expect(names).toHaveCount(0);

    await page.locator("orb-channel").evaluate((el: any) => (el.kind = "group"));
    await expect(names).toHaveCount(2);

    await page.locator("orb-channel").evaluate((el: any) => (el.showNames = false));
    await page.locator("orb-channel").evaluate((el: any) => (el.kind = "open"));
    await expect(names).toHaveCount(0);
  });

  test("a direct chat's header names the other participant, and an open channel's header shows its label", async ({ page }) => {
    await mount(page, CONVERSATION.replace(' label="Grace"', ""));
    await expect(page.locator("orb-channel [part='header-title']")).toHaveText("Grace");

    await mount(page, '<orb-channel kind="open" label="Release notes"><orb-channel-participant id="a"></orb-channel-participant><orb-channel-participant id="b"></orb-channel-participant></orb-channel>');
    await expect(page.locator("orb-channel [part='header-title']")).toHaveText("Release notes");
    await expect(page.locator("orb-channel [part='header-description']")).toHaveText("2 members");
  });

  test("show-header hides the header, and the header-title slot replaces the default title", async ({ page }) => {
    await mount(page, CONVERSATION.replace("<orb-channel ", '<orb-channel show-header="false" '));
    await expect(page.locator("orb-channel [part='header']")).toHaveCount(0);

    await mount(page, CONVERSATION.replace("<orb-channel-composer", '<span slot="header-title">Custom title</span><orb-channel-composer'));
    // The default title is still in the DOM as the slot's fallback, but it isn't rendered
    await expect(page.locator("orb-channel [part='header-title']")).toBeHidden();
    await expect(page.locator("orb-channel")).toContainText("Custom title");
  });

  test("Enter sends the draft, and clears the composer", async ({ page }) => {
    await mount(page, CONVERSATION);
    await record(page, "orbSend");
    await draft(page).click();
    await page.keyboard.type("Hello");
    await page.keyboard.press("Enter");
    await expect.poll(() => lastSend(page)).toMatchObject({ text: "Hello" });
    await expect(draft(page)).toHaveValue("");
  });

  test("Shift+Enter adds a line, and doesn't send", async ({ page }) => {
    await mount(page, CONVERSATION);
    await record(page, "orbSend");
    await draft(page).click();
    await page.keyboard.type("first");
    await page.keyboard.press("Shift+Enter");
    await page.keyboard.type("second");
    await expect(draft(page)).toHaveValue("first\nsecond");
    expect(await page.evaluate(() => (window as any).events.length)).toBe(0);
  });

  test("a canceled send keeps the draft", async ({ page }) => {
    await mount(page, CONVERSATION);
    await page.locator("orb-channel").evaluate((el) => el.addEventListener("orbSend", (ev) => ev.preventDefault()));
    await draft(page).click();
    await page.keyboard.type("Keep me");
    await page.keyboard.press("Enter");
    await expect(draft(page)).toHaveValue("Keep me");
  });

  test("send-on mod-enter sends on Ctrl or ⌘+Enter, and Enter adds a line", async ({ page }) => {
    await mount(page, CONVERSATION.replace('name="body"', 'name="body" send-on="mod-enter"'));
    await record(page, "orbSend");
    await draft(page).click();
    await page.keyboard.type("line one");
    await page.keyboard.press("Enter");
    await page.keyboard.type("line two");
    await expect(draft(page)).toHaveValue("line one\nline two");
    await page.keyboard.press(`${await modKey(page)}+Enter`);
    await expect.poll(() => lastSend(page)).toMatchObject({ text: "line one\nline two" });
  });

  test("echo adds the sent message from the point of view, and sets it on the event", async ({ page }) => {
    await mount(page, CONVERSATION.replace('pov="ada"', 'pov="ada" echo'));
    await record(page, "orbSend");
    await draft(page).click();
    await page.keyboard.type("Hi");
    await page.keyboard.press("Enter");
    await expect(articles(page)).toHaveCount(3);
    await expect(articles(page).last()).toContainText("Hi");
    await expect.poll(() => lastSend(page)).toMatchObject({ text: "Hi", message: "Hi", from: "ada" });
  });

  test("without echo, nothing is added and the event's message is null", async ({ page }) => {
    await mount(page, CONVERSATION);
    await record(page, "orbSend");
    await draft(page).click();
    await page.keyboard.type("Hi");
    await page.keyboard.press("Enter");
    await expect.poll(() => lastSend(page)).toMatchObject({ text: "Hi", message: null });
    await expect(articles(page)).toHaveCount(2);
  });

  test("an app's message with the same client-id replaces the echoed one", async ({ page }) => {
    await mount(page, CONVERSATION.replace('pov="ada"', 'pov="ada" echo'));
    await draft(page).click();
    await page.keyboard.type("Hi");
    await page.keyboard.press("Enter");
    await expect(articles(page)).toHaveCount(3);
    await page.locator("orb-channel").evaluate((el) => {
      const echoed = el.querySelector("orb-channel-message:last-of-type")!;
      const copy = document.createElement("orb-channel-message");
      copy.id = "server-1";
      copy.setAttribute("from", "ada");
      copy.setAttribute("client-id", echoed.getAttribute("client-id")!);
      copy.setAttribute("status", "sent");
      copy.textContent = "Hi";
      el.append(copy);
    });
    await expect(articles(page)).toHaveCount(3);
    await expect(page.locator("orb-channel [role='article'][data-id='server-1']")).toHaveCount(1);
  });

  test("the draft is submitted with the form under the composer's name, and a reset clears it", async ({ page }) => {
    await mount(page, `<form id="f">${CONVERSATION}</form>`);
    await draft(page).click();
    await page.keyboard.type("Draft");
    const submitted = () => page.evaluate(() => new FormData(document.getElementById("f") as HTMLFormElement).get("body"));
    await expect.poll(submitted).toBe("Draft");
    await page.evaluate(() => (document.getElementById("f") as HTMLFormElement).reset());
    await expect(draft(page)).toHaveValue("");
    await expect.poll(submitted).toBe("");
  });

  test("action buttons emit orbAction, show a slotted icon, and show a default icon without one", async ({ page }) => {
    await mount(page, CONVERSATION.replace(
      '<orb-channel-composer name="body" placeholder="Message Grace"></orb-channel-composer>',
      `<orb-channel-composer name="body">
         <orb-channel-action name="attach" label="Attach file"><svg slot="icon" data-test="custom-icon"></svg></orb-channel-action>
         <orb-channel-action name="more" label="More options"></orb-channel-action>
       </orb-channel-composer>`,
    ));
    await expect(page.locator('orb-channel [aria-label="Attach file"] [data-test="custom-icon"]')).toHaveCount(1);
    await expect(page.locator('orb-channel [aria-label="More options"] svg')).toHaveCount(1);
    await expect(page.locator('orb-channel [aria-label="More options"] [data-test]')).toHaveCount(0);

    await page.locator("orb-channel").evaluate((el) => {
      (window as any).actions = [];
      el.addEventListener("orbAction", (ev: any) => (window as any).actions.push(ev.detail.name));
    });
    await page.locator('orb-channel [aria-label="Attach file"]').click();
    await expect.poll(() => page.evaluate(() => (window as any).actions)).toEqual(["attach"]);
  });

  test("the list keeps to the newest message as messages arrive, and stays put once the user scrolls up", async ({ page }) => {
    const many = Array.from({ length: 30 }, (_, i) => `<orb-channel-message from="grace">Message ${i}</orb-channel-message>`).join("");
    await mount(page, `<orb-channel pov="ada" style="height: 200px">${many}</orb-channel>`);
    const list = () =>
      page.locator("orb-channel").evaluate((el) => {
        const log = el.shadowRoot!.querySelector<HTMLElement>("[role='log']")!;
        return { top: log.scrollTop, atBottom: log.scrollTop + log.clientHeight >= log.scrollHeight - 2 };
      });
    await expect.poll(async () => (await list()).atBottom).toBe(true);

    await page.locator("orb-channel").evaluate((el) => el.append(Object.assign(document.createElement("orb-channel-message"), { textContent: "New" })));
    await expect.poll(async () => (await list()).atBottom).toBe(true);

    await page.locator("orb-channel").evaluate((el) => (el.shadowRoot!.querySelector<HTMLElement>("[role='log']")!.scrollTop = 0));
    await page.locator("orb-channel").evaluate((el) => el.append(Object.assign(document.createElement("orb-channel-message"), { textContent: "Later" })));
    await page.waitForTimeout(100);
    expect((await list()).top).toBe(0);
  });

  test("arrow keys move between messages, and Home and End go to the ends", async ({ page }) => {
    await mount(page, CONVERSATION);
    const focused = () => page.locator("orb-channel").evaluate((el) => (el.shadowRoot!.activeElement as HTMLElement | null)?.dataset.id);
    await articles(page).last().focus();
    await expect.poll(focused).toBe("m2");
    await page.keyboard.press("ArrowUp");
    await expect.poll(focused).toBe("m1");
    await page.keyboard.press("End");
    await expect.poll(focused).toBe("m2");
    await page.keyboard.press("Home");
    await expect.poll(focused).toBe("m1");
  });

  test("changing a message's text or status updates it, and removing it removes it", async ({ page }) => {
    await mount(page, CONVERSATION);
    await page.locator("orb-channel-message#m1").evaluate((el) => (el.textContent = "Changed text"));
    await expect(articles(page).nth(0)).toContainText("Changed text");

    await page.locator("orb-channel-message#m1").evaluate((el) => el.setAttribute("status", "failed"));
    await expect.poll(() => partsOf(page)).toEqual([expect.stringContaining("failed"), expect.not.stringContaining("failed")]);

    await page.locator("orb-channel-message#m2").evaluate((el) => el.remove());
    await expect(articles(page)).toHaveCount(1);
  });

  test("a later message with the same id replaces the earlier one", async ({ page }) => {
    await mount(page, '<orb-channel pov="ada" style="height: 300px"><orb-channel-message id="dup" from="grace">First copy</orb-channel-message><orb-channel-message id="dup" from="grace">Second copy</orb-channel-message></orb-channel>');
    await expect(articles(page)).toHaveCount(1);
    await expect(articles(page)).toContainText("Second copy");
  });

  test("the list is a named log, and the message box is named by its placeholder", async ({ page }) => {
    await mount(page, CONVERSATION);
    await expect(page.locator("orb-channel [role='log'][aria-live='polite'][aria-label='Grace']")).toHaveCount(1);
    await expect(draft(page)).toHaveAttribute("aria-label", "Message Grace");
  });

  test("an empty channel shows its empty text, and a divider shows its label between messages", async ({ page }) => {
    await mount(page, '<orb-channel empty="Nothing here yet"></orb-channel>');
    await expect(page.locator("orb-channel [part='empty']")).toHaveText("Nothing here yet");

    await mount(page, `<orb-channel pov="ada" style="height: 300px">
      <orb-channel-message from="grace">Before</orb-channel-message>
      <orb-channel-divider label="Today"></orb-channel-divider>
      <orb-channel-message from="grace">After</orb-channel-message>
    </orb-channel>`);
    await expect(page.locator("orb-channel [part='divider']")).toHaveText("Today");
  });

  test("a sender with no participant shows their id", async ({ page }) => {
    await mount(page, '<orb-channel kind="group" pov="ada" style="height: 300px"><orb-channel-message from="sam">Hi</orb-channel-message></orb-channel>');
    await expect(page.locator("orb-channel [part='name']")).toHaveText("sam");
  });

  test("the methods focus the box, send text, and scroll a message into view", async ({ page }) => {
    const many = Array.from({ length: 30 }, (_, i) => `<orb-channel-message id="n${i}" from="grace">Message ${i}</orb-channel-message>`).join("");
    await mount(page, `<orb-channel pov="ada" style="height: 200px">${many}<orb-channel-composer name="body"></orb-channel-composer></orb-channel>`);
    await record(page, "orbSend");

    await page.locator("orb-channel").evaluate((el: any) => el.focusComposer());
    await expect.poll(() => page.locator("orb-channel").evaluate((el) => el.shadowRoot!.activeElement?.tagName)).toBe("TEXTAREA");

    await page.locator("orb-channel").evaluate((el: any) => el.send("Sent by method"));
    await expect.poll(() => lastSend(page)).toMatchObject({ text: "Sent by method" });

    await page.locator("orb-channel").evaluate((el: any) => el.scrollToMessage("n5", { behavior: "auto" }));
    await expect.poll(() =>
      page.locator("orb-channel").evaluate((el) => {
        const log = el.shadowRoot!.querySelector<HTMLElement>("[role='log']")!;
        const row = log.querySelector<HTMLElement>("[data-id='n5']")!;
        return row.getBoundingClientRect().top < log.getBoundingClientRect().bottom && log.scrollTop > 0;
      }),
    ).toBe(true);
  });

  test("readonly makes the message box read-only", async ({ page }) => {
    await mount(page, CONVERSATION.replace('pov="ada"', 'pov="ada" readonly'));
    await expect(draft(page)).toHaveJSProperty("readOnly", true);
  });
});
