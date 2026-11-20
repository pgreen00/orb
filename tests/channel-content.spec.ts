import { test, expect, type Locator, type Page } from "@playwright/test";
import { mount } from "./utils";

const CONVERSATION = `
<orb-channel pov="ada" label="Grace" style="height: 300px">
  <orb-channel-participant id="ada" name="Ada"></orb-channel-participant>
  <orb-channel-participant id="grace" name="Grace"></orb-channel-participant>
  <orb-channel-message id="m1" from="grace" ts="2025-06-01T09:14:00Z">Did the compiler change land?</orb-channel-message>
  <orb-channel-message id="m2" from="ada" ts="2025-06-01T09:15:00Z">Yep, merged this morning.</orb-channel-message>
  <orb-channel-composer name="body" placeholder="Message Grace"></orb-channel-composer>
</orb-channel>`;

const bubble = (page: Page, id: string) => page.locator(`orb-channel [role='article'][data-id='${id}'] [part~='bubble']`);
const row = (page: Page, id: string) => page.locator(`orb-channel [role='article'][data-id='${id}']`);
/** Opens a message's actions with a right click */
const openActions = (page: Page, id: string) => row(page, id).click({ button: "right" });
/** An item of the open actions menu, by its label. `value` is a property, so there's no attribute to select. */
const item = (page: Page, label: string) => page.locator("orb-channel orb-mi").filter({ hasText: label });

/** Keeps the detail of each `name` event the channel emits, in `window.events` */
const record = (page: Page, name: string) =>
  page.locator("orb-channel").evaluate((el, name) => {
    (window as any).events = [];
    el.addEventListener(name, (ev: any) => (window as any).events.push({ type: name, detail: ev.detail }));
  }, name);

/** The recorded events, as plain values */
const events = (page: Page) =>
  page.evaluate(() =>
    ((window as any).events ?? []).map((e: any) => ({
      type: e.type,
      id: e.detail.message?.id ?? undefined,
      emoji: e.detail.emoji,
      on: e.detail.on,
      action: e.detail.action,
      text: e.detail.text,
      format: e.detail.format,
      mentions: e.detail.mentions,
      command: e.detail.command,
      files: e.detail.files?.length,
    })),
  );

test.describe("orb-channel content", () => {
  test("markdown renders, and its code blocks get a copy button", async ({ page }) => {
    await mount(page, `<orb-channel pov="ada" style="height: 300px"><orb-channel-message id="md" from="grace"><script type="text/markdown">
      **Bold** and [a link](https://example.com)

      \`\`\`js
      const a = 1;
      \`\`\`
    </script></orb-channel-message></orb-channel>`);
    await expect(bubble(page, "md").locator("strong")).toHaveText("Bold");
    await expect(bubble(page, "md").locator("a[href='https://example.com']")).toHaveText("a link");
    await expect(bubble(page, "md").locator("pre")).toContainText("const a = 1;");
    await expect(page.locator("orb-channel [part~='copy']")).toHaveCount(1);
  });

  test("HTML is sanitized: scripts, handlers and unsafe links are removed, and formatting stays", async ({ page }) => {
    await mount(page, `<orb-channel pov="ada" style="height: 300px"><orb-channel-message id="html" from="grace"><script type="text/html"><p>Hi <b>there</b> <a href="javascript:alert(1)">bad link</a><img src="x" onerror="alert(1)"></p></script></orb-channel-message></orb-channel>`);
    await expect(bubble(page, "html").locator("b")).toHaveText("there");
    const html = await bubble(page, "html").evaluate((el) => el.innerHTML);
    expect(html).not.toContain("onerror");
    expect(html).not.toContain("javascript:");
    await expect(bubble(page, "html")).toContainText("bad link");
  });

  test("web addresses are links, and @-mentions of participants are marked, with the point of view's own", async ({ page }) => {
    await mount(page, CONVERSATION.replace('from="ada" ts="2025-06-01T09:15:00Z">Yep, merged this morning.', 'from="grace" ts="2025-06-01T09:15:00Z">Hey @Ada and @Grace, see https://example.com.'));
    await expect(bubble(page, "m2").locator("a[href='https://example.com']")).toHaveText("https://example.com");
    await expect(bubble(page, "m2").locator("[part~='mention-self']")).toHaveText("@Ada");
    await expect(bubble(page, "m2").locator("[part~='mention']")).toHaveCount(2);
  });

  test("reactions with the same emoji combine, and clicking one emits orbReact", async ({ page }) => {
    await mount(page, CONVERSATION.replace("Did the compiler change land?</orb-channel-message>", 'Did the compiler change land?<orb-channel-reaction emoji="🎉" by="grace"></orb-channel-reaction><orb-channel-reaction emoji="🎉" by="ada"></orb-channel-reaction></orb-channel-message>'));
    await record(page, "orbReact");
    const pill = page.locator("orb-channel [part~='reaction']");
    await expect(pill).toHaveText("🎉 2");
    await pill.click();
    await expect.poll(events.bind(null, page)).toEqual([{ type: "orbReact", id: "m1", emoji: "🎉", on: false }]);
  });

  test("attachments show images inline, and other files as links", async ({ page }) => {
    await mount(page, CONVERSATION.replace("Yep, merged this morning.</orb-channel-message>", 'Yep, merged this morning.<orb-channel-attachment href="/a/photo.png" name="photo.png" type="image/png"></orb-channel-attachment><orb-channel-attachment href="/a/report.pdf" name="report.pdf" type="application/pdf" size="2 MB"></orb-channel-attachment></orb-channel-message>'));
    await expect(page.locator("orb-channel [part~='attachment'].image img")).toHaveAttribute("src", "/a/photo.png");
    await expect(page.locator("orb-channel [part~='attachment'].file")).toContainText("report.pdf");
    const attachments = await row(page, "m2").locator("[part~='attachments']").boundingBox();
    const text = await bubble(page, "m2").boundingBox();
    expect(attachments!.y + attachments!.height).toBeLessThanOrEqual(text!.y);
  });

  test("date dividers mark the days, and date-dividers=false removes them", async ({ page }) => {
    await mount(page, `<orb-channel pov="ada" style="height: 300px">
      <orb-channel-message id="d1" from="grace" ts="2025-06-01T09:14:00Z">One</orb-channel-message>
      <orb-channel-message id="d2" from="grace" ts="2025-06-02T09:14:00Z">Two</orb-channel-message>
    </orb-channel>`);
    await expect(page.locator("orb-channel [part~='divider']")).toHaveCount(2);

    await mount(page, `<orb-channel pov="ada" date-dividers="false" style="height: 300px">
      <orb-channel-message from="grace" ts="2025-06-01T09:14:00Z">One</orb-channel-message>
      <orb-channel-message from="grace" ts="2025-06-02T09:14:00Z">Two</orb-channel-message>
    </orb-channel>`);
    await expect(page.locator("orb-channel [part~='divider']")).toHaveCount(0);
  });

  test("an unread divider counts the messages after it that aren't the point of view's", async ({ page }) => {
    await mount(page, `<orb-channel pov="ada" style="height: 300px">
      <orb-channel-message from="ada">Earlier</orb-channel-message>
      <orb-channel-divider type="unread"></orb-channel-divider>
      <orb-channel-message from="grace">New one</orb-channel-message>
      <orb-channel-message from="ada">Mine</orb-channel-message>
      <orb-channel-message from="grace">New two</orb-channel-message>
    </orb-channel>`);
    await expect(page.locator("orb-channel")).toHaveAttribute("unread", "2");
    await expect(page.locator("orb-channel [part='divider'].unread")).toHaveText("New messages");
  });

  test("orbRead is emitted once a message has been seen", async ({ page }) => {
    const many = Array.from({ length: 30 }, (_, i) => `<orb-channel-message id="n${i}" from="grace">Message ${i}</orb-channel-message>`).join("");
    await mount(page, `<orb-channel pov="ada" style="height: 200px">${many}</orb-channel>`);
    await record(page, "orbRead");
    // The list starts at its newest message, so the oldest come into view when it's scrolled to the top
    await page.locator("orb-channel").evaluate((el) => (el.shadowRoot!.querySelector("[role='log']") as HTMLElement).scrollTop = 0);
    await expect.poll(events.bind(null, page)).toEqual(expect.arrayContaining([expect.objectContaining({ type: "orbRead", id: "n0" })]));
  });

  test("Reply, Copy and Report emit their events, and Edit opens the editor for the point of view's own message", async ({ page }) => {
    await mount(page, CONVERSATION);
    await record(page, "orbReply");
    await openActions(page, "m1");
    await item(page, "Reply").click();
    await expect.poll(events.bind(null, page)).toEqual([{ type: "orbReply", id: "m1" }]);

    await record(page, "orbReport");
    await openActions(page, "m1");
    await item(page, "Report").click();
    await expect.poll(events.bind(null, page)).toEqual([{ type: "orbReport", id: "m1" }]);

    await record(page, "orbEdit");
    await openActions(page, "m2");
    await item(page, "Edit").click();
    await expect.poll(events.bind(null, page)).toEqual([expect.objectContaining({ type: "orbEdit", id: "m2" })]);
    await expect(page.locator('orb-channel textarea[aria-label="Edit message"]')).toHaveValue("Yep, merged this morning.");
  });

  test("saving an edit emits orbEditCommit and closes the editor, and a canceled save keeps it open", async ({ page }) => {
    await mount(page, CONVERSATION);
    await openActions(page, "m2");
    await item(page, "Edit").click();
    const editor = page.locator('orb-channel textarea[aria-label="Edit message"]');
    await editor.fill("Yes, merged.");

    await page.locator("orb-channel").evaluate((el) => el.addEventListener("orbEditCommit", (ev) => ev.preventDefault(), { once: true }));
    await editor.press("Enter");
    await expect(editor).toHaveValue("Yes, merged.");

    await record(page, "orbEditCommit");
    await editor.press("Enter");
    await expect(editor).toHaveCount(0);
    await expect.poll(events.bind(null, page)).toEqual([expect.objectContaining({ type: "orbEditCommit", id: "m2", text: "Yes, merged." })]);
  });

  test("every action has a drawn icon", async ({ page }) => {
    await mount(page, CONVERSATION.replace('id="ada" name="Ada"', 'id="ada" name="Ada" moderator'));
    await openActions(page, "m2");
    const items = page.locator("orb-channel orb-mi");
    await expect(items.first()).toBeVisible();
    const count = await items.count();
    expect(count).toBeGreaterThan(3);
    for (let i = 0; i < count; i++) {
      const drawn = await items.nth(i).evaluate((entry) => entry.querySelectorAll("[slot='icon'] svg path, [slot='icon'] svg line, [slot='icon'] svg polyline").length);
      expect(drawn, `action ${i}`).toBeGreaterThan(0);
    }
  });

  test("Delete emits orbDelete on the point of view's own message", async ({ page }) => {
    await mount(page, CONVERSATION);
    await record(page, "orbDelete");
    await openActions(page, "m2");
    await item(page, "Delete").click();
    await expect.poll(events.bind(null, page)).toEqual([{ type: "orbDelete", id: "m2" }]);
  });

  test("right-clicking a message opens its actions, and a reaction there toggles it", async ({ page }) => {
    await mount(page, CONVERSATION);
    await record(page, "orbReact");
    await openActions(page, "m1");
    await page.locator("orb-channel .react button[aria-label='React with 👍']").click();
    await expect.poll(events.bind(null, page)).toEqual([{ type: "orbReact", id: "m1", emoji: "👍", on: true }]);
    await expect(page.locator("orb-channel .react")).toBeHidden();
  });

  test("a long press on a touch screen opens the actions, and a drag before the hold ends doesn't", async ({ page }) => {
    await mount(page, CONVERSATION);
    const pointer = (type: string, y: number) =>
      row(page, "m1").evaluate(
        (el, [type, y]) => el.dispatchEvent(new PointerEvent(type, { pointerType: "touch", isPrimary: true, clientX: 100, clientY: y, bubbles: true, composed: true })),
        [type, y],
      );

    await pointer("pointerdown", 100);
    await page.waitForTimeout(200);
    await pointer("pointermove", 160);
    await page.waitForTimeout(500);
    await pointer("pointerup", 160);
    await expect(item(page, "Reply")).toBeHidden();

    await pointer("pointerdown", 100);
    await expect(item(page, "Reply")).toBeVisible({ timeout: 2000 });
    await pointer("pointerup", 100);
  });

  test("the Menu key opens the actions with focus in them, and Escape returns focus to the message", async ({ page }) => {
    await mount(page, CONVERSATION);
    await row(page, "m1").focus();
    await page.keyboard.press("Shift");
    await row(page, "m1").evaluate((el) => el.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, composed: true, cancelable: true, clientX: 0, clientY: 0 })));
    await expect(page.locator("orb-channel .react button").first()).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(row(page, "m1")).toBeFocused();
  });

  test("a right click on a link keeps the browser's menu, and elsewhere the actions open", async ({ page }) => {
    await mount(page, CONVERSATION.replace("Did the compiler change land?</orb-channel-message>", '<script type="text/html"><p>See <a href="https://example.com">the spec</a></p></script></orb-channel-message>'));
    const cancelled = (locator: Locator) =>
      locator.evaluate((el) => {
        const event = new MouseEvent("contextmenu", { bubbles: true, composed: true, cancelable: true });
        el.dispatchEvent(event);
        return event.defaultPrevented;
      });
    expect(await cancelled(page.locator("orb-channel a"))).toBe(false);
    expect(await cancelled(row(page, "m2"))).toBe(true);
  });

  test("a hidden message shows its reason, and Show anyway reveals it", async ({ page }) => {
    await mount(page, CONVERSATION.replace("Did the compiler change land?</orb-channel-message>", "Did the compiler change land?</orb-channel-message>").replace('id="m1" from="grace"', 'id="m1" from="grace" moderation="hidden" moderation-reason="Hidden for low score"'));
    await expect(page.locator("orb-channel [part~='hidden']")).toContainText("Hidden for low score");
    await expect(bubble(page, "m1")).toHaveCount(0);
    await page.locator("orb-channel [part~='hidden'] orb-button").click();
    await expect(bubble(page, "m1")).toContainText("Did the compiler change land?");
  });

  test("a removed message says it was removed, and a pending one is marked", async ({ page }) => {
    await mount(page, CONVERSATION.replace('id="m1" from="grace"', 'id="m1" from="grace" moderation="removed"').replace('id="m2" from="ada"', 'id="m2" from="ada" moderation="pending"'));
    await expect(page.locator("orb-channel div[part='removed']")).toHaveText("Removed by a moderator");
    await expect(row(page, "m2")).toHaveClass(/pending/);
    await expect(row(page, "m2")).toContainText("Awaiting approval");
  });

  test("a moderator gets moderation buttons, which emit orbModerate", async ({ page }) => {
    await mount(page, CONVERSATION.replace('<orb-channel-participant id="ada" name="Ada"></orb-channel-participant>', '<orb-channel-participant id="ada" name="Ada" moderator></orb-channel-participant>'));
    await record(page, "orbModerate");
    await openActions(page, "m1");
    await item(page, "Hide").click();
    await expect.poll(events.bind(null, page)).toEqual([{ type: "orbModerate", id: "m1", action: "hide" }]);
  });

  test("a muted point of view can't write, and sees why", async ({ page }) => {
    await mount(page, CONVERSATION.replace('id="ada" name="Ada"', 'id="ada" name="Ada" muted'));
    await expect(page.locator("orb-channel textarea")).toBeDisabled();
    await expect(page.locator("orb-channel [part='note']")).toHaveText("You're muted in this conversation.");
  });

  test("slow mode holds back the next message, and moderators aren't held back", async ({ page }) => {
    await mount(page, CONVERSATION.replace('pov="ada"', 'pov="ada" slow-mode="30s"'));
    await page.locator("orb-channel textarea").click();
    await page.keyboard.type("First");
    await page.keyboard.press("Enter");
    await expect(page.locator("orb-channel textarea")).toBeDisabled();
    await expect(page.locator("orb-channel [part='countdown']")).toContainText("Slow mode");

    await mount(page, CONVERSATION.replace('pov="ada"', 'pov="ada" slow-mode="30s"').replace('id="ada" name="Ada"', 'id="ada" name="Ada" moderator'));
    await page.locator("orb-channel textarea").click();
    await page.keyboard.type("First");
    await page.keyboard.press("Enter");
    await expect(page.locator("orb-channel textarea")).toBeEnabled();
  });

  test("the rich composer sends HTML, with its mentions", async ({ page }) => {
    await mount(page, CONVERSATION.replace('<orb-channel-composer name="body" placeholder="Message Grace"></orb-channel-composer>', '<orb-channel-composer name="body" editor="rich"></orb-channel-composer>'));
    await record(page, "orbSend");
    await expect(page.locator("orb-channel orb-rich-text")).toHaveCount(1);
    await page.locator("orb-channel orb-rich-text").evaluate((el: any) => el.setContent('<p>Hi <span data-mention="grace">@Grace</span></p>'));
    await page.locator('orb-channel [aria-label="Send"]').click();
    await expect.poll(events.bind(null, page)).toEqual([expect.objectContaining({ type: "orbSend", format: "html", text: "Hi @Grace", mentions: ["grace"] })]);
  });

  test("a plain composer's / menu offers commands, and the sent command is parsed", async ({ page }) => {
    await mount(page, CONVERSATION.replace('<orb-channel-composer name="body" placeholder="Message Grace"></orb-channel-composer>', '<orb-channel-composer name="body"><orb-channel-command name="summarize" description="Summarize the channel"></orb-channel-command></orb-channel-composer>'));
    await record(page, "orbSend");
    await page.locator("orb-channel textarea").click();
    await page.keyboard.type("/sum");
    await expect(page.locator("orb-channel orb-mi", { hasText: "/summarize" })).toHaveCount(1);
    await page.locator("orb-channel orb-mi", { hasText: "/summarize" }).click();
    await expect(page.locator("orb-channel textarea")).toHaveValue("/summarize ");
    await page.keyboard.type("now");
    await page.keyboard.press("Enter");
    await expect.poll(events.bind(null, page)).toEqual([expect.objectContaining({ type: "orbSend", text: "/summarize now", command: { name: "summarize", args: "now" } })]);
  });

  test("typing @ offers participants, and a chosen one is a mention in the send", async ({ page }) => {
    await mount(page, CONVERSATION);
    await record(page, "orbSend");
    await page.locator("orb-channel textarea").click();
    await page.keyboard.type("Hi @Gra");
    await expect(page.locator("orb-channel orb-mi", { hasText: "Grace" })).toHaveCount(1);
    await page.locator("orb-channel orb-mi", { hasText: "Grace" }).click();
    await expect(page.locator("orb-channel textarea")).toHaveValue("Hi @Grace ");
    await page.keyboard.press("Enter");
    await expect.poll(events.bind(null, page)).toEqual([expect.objectContaining({ type: "orbSend", mentions: ["grace"] })]);
  });

  test("attached files are previewed, and sent with the message", async ({ page }) => {
    await mount(page, CONVERSATION.replace('<orb-channel-composer name="body" placeholder="Message Grace"></orb-channel-composer>', '<orb-channel-composer name="body" attachments="image/*,.pdf"></orb-channel-composer>'));
    await record(page, "orbSend");
    await page.locator("orb-channel input[type=file]").setInputFiles({ name: "pic.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgo=", "base64") });
    await expect(page.locator("orb-channel [part~='files'] .file-name")).toHaveText("pic.png");
    await page.locator('orb-channel [aria-label="Send"]').click();
    await expect.poll(events.bind(null, page)).toEqual([expect.objectContaining({ type: "orbSend", files: 1 })]);
    await expect(page.locator("orb-channel [part~='files']")).toHaveCount(0);
  });

  test("with echo, a sent image is shown in the echoed message after the preview is released", async ({ page }) => {
    const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400"><rect width="800" height="400" fill="#c33"/></svg>');
    await mount(page, CONVERSATION.replace("<orb-channel pov=\"ada\"", "<orb-channel pov=\"ada\" echo").replace('<orb-channel-composer name="body" placeholder="Message Grace"></orb-channel-composer>', '<orb-channel-composer name="body" attachments="image/*,.pdf"></orb-channel-composer>'));
    await page.locator("orb-channel input[type=file]").setInputFiles({ name: "pic.svg", mimeType: "image/svg+xml", buffer: SVG });
    await page.locator('orb-channel [aria-label="Send"]').click();
    await expect(page.locator("orb-channel [part~='attachment'].image img")).toHaveCount(1);
    await expect(page.locator("orb-channel [part~='attachment'].image img")).toHaveJSProperty("naturalWidth", 800);
    await expect.poll(() =>
      page.locator("orb-channel [part~='attachment'].image img").evaluate((el) => el.getBoundingClientRect().width <= 16 * parseFloat(getComputedStyle(document.documentElement).fontSize) + 1),
    ).toBe(true);
  });

  test("the line breaks between rendered markdown tags don't add space between list items", async ({ page }) => {
    await mount(page, `<orb-channel pov="ada" style="height: 400px"><orb-channel-participant id="grace" name="Grace"></orb-channel-participant><orb-channel-message id="md" from="grace"><script type="text/markdown">Ingredients:\n\n- butter\n- sugar\n- cocoa</script></orb-channel-message></orb-channel>`);
    await expect(page.locator("orb-channel li")).toHaveCount(3);
    const gap = await page.locator("orb-channel li").evaluateAll((items) => items[1].getBoundingClientRect().top - items[0].getBoundingClientRect().bottom);
    expect(gap).toBeLessThan(4);
  });
});
