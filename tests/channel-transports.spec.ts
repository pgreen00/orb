import { test, expect, type Page } from "@playwright/test";
import { mount } from "./utils";

const PEOPLE = `
  <orb-channel-participant id="ada" name="Ada"></orb-channel-participant>
  <orb-channel-participant id="grace" name="Grace"></orb-channel-participant>`;

const row = (page: Page, id: string) => page.locator(`orb-channel [role='article'][data-id='${id}']`);
const list = (page: Page) => page.locator("orb-channel [role='log'], orb-channel [role='feed']");
const byText = (page: Page, text: string) => page.locator("orb-channel [role='article']").filter({ hasText: text });

/** Keeps each named event the channel emits, as plain values, in `window.log` */
const watch = (page: Page, ...names: string[]) =>
  page.locator("orb-channel").evaluate((el, names) => {
    (window as any).log = [];
    for (const name of names) {
      el.addEventListener(name, (ev: any) => (window as any).log.push({ type: name, message: ev.detail?.message?.id }));
    }
  }, names);

const log = (page: Page) => page.evaluate(() => (window as any).log);

/** Sets a transport on the channel from the page. `send` and `history` can be given as source text. */
const setTransport = (page: Page, source: string) =>
  page.evaluate((source) => {
    const channel = document.querySelector("orb-channel") as any;
    channel.transport = new Function("window", `return (${source})`)(window);
  }, source);

async function typeAndSend(page: Page, text: string) {
  await page.locator("orb-channel textarea").click();
  await page.keyboard.type(text);
  await page.keyboard.press("Enter");
}

const COMPOSER = `<orb-channel-composer name="body" placeholder="Write"></orb-channel-composer>`;

test.describe("orb-channel transport in JavaScript", () => {
  test("a sent message shows as sending, and the transport gets it with its client-id", async ({ page }) => {
    await mount(page, `<orb-channel pov="ada" style="height: 300px">${PEOPLE}${COMPOSER}</orb-channel>`);
    await setTransport(
      page,
      `{ sent: [], send(message) { window.sent = [...(window.sent ?? []), message]; return new Promise((resolve) => (window.finish = resolve)); }, subscribe() { return () => {}; } }`,
    );
    await typeAndSend(page, "Hello");
    await expect(byText(page, "Hello").locator("[part~='status']")).toContainText("Sending");
    const sent = await page.evaluate(() => (window as any).sent);
    expect(sent).toEqual([expect.objectContaining({ text: "Hello", from: "ada", format: "text", thread: undefined })]);
    const clientId = sent[0].clientId as string;
    await expect(page.locator(`orb-channel > orb-channel-message[client-id='${clientId}']`)).toHaveCount(1);

    await page.evaluate(() => (window as any).finish());
    await expect(byText(page, "Hello").locator("[part~='status']")).toHaveCount(0);
  });

  test("the server's copy replaces the sending message when its client-id matches", async ({ page }) => {
    await mount(page, `<orb-channel pov="ada" style="height: 300px">${PEOPLE}${COMPOSER}</orb-channel>`);
    await setTransport(
      page,
      `{ send(message) { window.clientId = message.clientId; return Promise.resolve(); }, subscribe(handlers) { window.handlers = handlers; return () => {}; } }`,
    );
    await typeAndSend(page, "Hi there");
    await expect(byText(page, "Hi there")).toHaveCount(1);
    await page.evaluate(() => {
      const id = (window as any).clientId;
      (window as any).handlers.receive(`<orb-channel-message id="s1" from="ada" client-id="${id}">Hi there</orb-channel-message>`);
    });
    await expect(byText(page, "Hi there")).toHaveCount(1);
    await expect(row(page, "s1")).toContainText("Hi there");
    await expect(byText(page, "Hi there").locator("[part~='status']")).toHaveCount(0);
  });

  test("a rejected send shows as failed, and Retry sends it again", async ({ page }) => {
    await mount(page, `<orb-channel pov="ada" style="height: 300px">${PEOPLE}${COMPOSER}</orb-channel>`);
    await watch(page, "orbRetry");
    await setTransport(
      page,
      `{ calls: 0, send() { this.calls += 1; return this.calls === 1 ? Promise.reject(new Error("Offline")) : Promise.resolve(); }, subscribe() { return () => {}; } }`,
    );
    await typeAndSend(page, "Try me");
    await expect(byText(page, "Try me").locator("[part~='status']")).toContainText("Offline");
    await byText(page, "Try me").locator("[part~='retry']").click();
    await expect(byText(page, "Try me").locator("[part~='status']")).toHaveCount(0);
    expect(await log(page)).toEqual([expect.objectContaining({ type: "orbRetry" })]);
  });

  test("a canceled orbRetry leaves the message failed, and the transport isn't called again", async ({ page }) => {
    await mount(page, `<orb-channel pov="ada" style="height: 300px">${PEOPLE}${COMPOSER}</orb-channel>`);
    await page.evaluate(() => document.querySelector("orb-channel")!.addEventListener("orbRetry", (ev) => ev.preventDefault()));
    await setTransport(page, `{ calls: 0, send() { window.calls = (window.calls ?? 0) + 1; return Promise.reject(new Error("Offline")); }, subscribe() { return () => {}; } }`);
    await typeAndSend(page, "Stay failed");
    await byText(page, "Stay failed").locator("[part~='retry']").click();
    await expect.poll(() => page.evaluate(() => (window as any).calls)).toBe(1);
    await expect(byText(page, "Stay failed").locator("[part~='status']")).toContainText("Offline");
  });

  test("a server's HTML can't run event handlers or javascript: links", async ({ page }) => {
    await mount(page, `<orb-channel pov="ada" style="height: 300px">${PEOPLE}</orb-channel>`);
    await setTransport(page, `{ send() { return Promise.resolve(); }, subscribe(handlers) { window.handlers = handlers; return () => {}; } }`);
    await expect.poll(() => page.evaluate(() => !!(window as any).handlers)).toBe(true);
    await page.evaluate(() =>
      (window as any).handlers.receive(
        `<orb-channel-message id="bad" from="grace">Hi<img src="/no-such-image.png" onerror="window.pwned = 'img'"></orb-channel-message><orb-channel-message id="link" from="grace"><a href="javascript:window.pwned = 'link'">Link</a><iframe srcdoc="<script>window.pwned = 'frame'<\/script>"></iframe></orb-channel-message>`,
      ),
    );
    await expect(row(page, "link")).toHaveCount(1);
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => (window as any).pwned)).toBeUndefined();
    await expect(page.locator("orb-channel iframe")).toHaveCount(0);
  });

  test("a canceled orbSend sends nothing and shows nothing", async ({ page }) => {
    await mount(page, `<orb-channel pov="ada" style="height: 300px">${PEOPLE}${COMPOSER}</orb-channel>`);
    await page.evaluate(() => document.querySelector("orb-channel")!.addEventListener("orbSend", (ev) => ev.preventDefault()));
    await setTransport(page, `{ send() { window.sent = true; return Promise.resolve(); }, subscribe() { return () => {}; } }`);
    await typeAndSend(page, "Not sent");
    await expect(byText(page, "Not sent")).toHaveCount(0);
    expect(await page.evaluate(() => (window as any).sent)).toBeUndefined();
  });

  test("without a transport, echo still shows the sent message as sent", async ({ page }) => {
    await mount(page, `<orb-channel pov="ada" echo style="height: 300px">${PEOPLE}${COMPOSER}</orb-channel>`);
    await typeAndSend(page, "Echoed");
    await expect(byText(page, "Echoed")).toHaveCount(1);
    await expect(byText(page, "Echoed").locator("[part~='status']")).toHaveCount(0);
  });

  test("scrolling to the top asks the transport's history for older messages, which go above", async ({ page }) => {
    const messages = Array.from({ length: 30 }, (_, i) => `<orb-channel-message id="m${i}" from="grace">Message ${i}</orb-channel-message>`).join("");
    await mount(page, `<orb-channel pov="ada" style="height: 300px">${PEOPLE}${messages}</orb-channel>`);
    await setTransport(
      page,
      `{ cursors: [], send() { return Promise.resolve(); }, subscribe() { return () => {}; }, history(cursor) { window.cursors = [...(window.cursors ?? []), cursor]; return cursor === "m0" ? new Promise((resolve) => setTimeout(() => resolve('<orb-channel-message id="older" from="grace">Older</orb-channel-message>'), 300)) : Promise.resolve(""); } }`,
    );
    await expect.poll(() => list(page).evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
    await list(page).evaluate((el) => (el.scrollTop = 0));
    await expect(page.locator("orb-channel")).toHaveAttribute("loading-more", "");
    await expect(row(page, "older")).toContainText("Older");
    await expect(page.locator("orb-channel")).not.toHaveAttribute("loading-more");
    const order = await page.evaluate(() => Array.from(document.querySelector("orb-channel")!.children).map((child) => child.id));
    expect(order.indexOf("older")).toBeLessThan(order.indexOf("m0"));
    const cursors: string[] = await page.evaluate(() => (window as any).cursors);
    expect(cursors[0]).toBe("m0");
    expect(new Set(cursors).size).toBe(cursors.length);
  });

  test("a canceled orbLoadMore leaves paging to the app", async ({ page }) => {
    const messages = Array.from({ length: 30 }, (_, i) => `<orb-channel-message id="m${i}" from="grace">Message ${i}</orb-channel-message>`).join("");
    await mount(page, `<orb-channel pov="ada" style="height: 300px">${PEOPLE}${messages}</orb-channel>`);
    await page.evaluate(() => document.querySelector("orb-channel")!.addEventListener("orbLoadMore", (ev) => ev.preventDefault()));
    await setTransport(page, `{ send() { return Promise.resolve(); }, subscribe() { return () => {}; }, history() { window.asked = true; return Promise.resolve(""); } }`);
    await list(page).evaluate((el) => (el.scrollTop = 0));
    await expect.poll(() => page.evaluate(() => document.querySelector("orb-channel")!.querySelectorAll("orb-channel-message").length)).toBe(30);
    expect(await page.evaluate(() => (window as any).asked)).toBeUndefined();
  });
});

test.describe("orb-channel-transport", () => {
  test("poll fetches src every interval, and shows the HTML it gets", async ({ page }) => {
    let polls = 0;
    await page.route("**/feed", (route) => {
      polls += 1;
      return route.fulfill({ contentType: "text/html", body: `<orb-channel-message id="p1" from="grace">From the poll</orb-channel-message>` });
    });
    await mount(page, `<orb-channel pov="ada" style="height: 300px">${PEOPLE}<orb-channel-transport type="poll" src="/feed" interval="300ms"></orb-channel-transport></orb-channel>`);
    await expect(row(page, "p1")).toContainText("From the poll");
    await expect.poll(() => polls).toBeGreaterThanOrEqual(2);
    await expect(page.locator("orb-channel orb-channel-message[id='p1']")).toHaveCount(1);
  });

  test("sse shows each event's HTML", async ({ page }) => {
    await page.route("**/events", (route) =>
      route.fulfill({ contentType: "text/event-stream", body: `data: <orb-channel-message id="e1" from="grace">From the stream</orb-channel-message>\n\n` }),
    );
    await mount(page, `<orb-channel pov="ada" style="height: 300px">${PEOPLE}<orb-channel-transport type="sse" src="/events"></orb-channel-transport></orb-channel>`);
    await expect(row(page, "e1")).toContainText("From the stream");
  });

  test("websocket shows what the socket receives, and sends messages over it with their client-id", async ({ page }) => {
    const received: string[] = [];
    await page.routeWebSocket(/\/chat$/, (ws) => {
      ws.send(`<orb-channel-message id="w1" from="grace">Welcome</orb-channel-message>`);
      ws.onMessage((message) => {
        const data = JSON.parse(String(message));
        received.push(data.text);
        ws.send(`<orb-channel-message id="w2" from="ada" client-id="${data.clientId}">${data.text}</orb-channel-message>`);
      });
    });
    await mount(
      page,
      `<orb-channel pov="ada" style="height: 300px">${PEOPLE}<orb-channel-transport type="websocket" src="ws://localhost:3000/chat"></orb-channel-transport>${COMPOSER}</orb-channel>`,
    );
    await expect(row(page, "w1")).toContainText("Welcome");
    await typeAndSend(page, "Over the socket");
    await expect(row(page, "w2")).toContainText("Over the socket");
    await expect(byText(page, "Over the socket")).toHaveCount(1);
    await expect(byText(page, "Over the socket").locator("[part~='status']")).toHaveCount(0);
    expect(received).toEqual(["Over the socket"]);
  });

  test("form posts each message to action, and the response replaces the sending message", async ({ page }) => {
    let body = "";
    await page.route("**/post", async (route) => {
      body = route.request().postData() ?? "";
      const clientId = /name="client-id"\r\n\r\n([^\r\n]+)/.exec(body)?.[1] ?? "";
      await route.fulfill({ contentType: "text/html", body: `<orb-channel-message id="f1" from="ada" client-id="${clientId}">Form text</orb-channel-message>` });
    });
    await mount(page, `<orb-channel pov="ada" style="height: 300px">${PEOPLE}<orb-channel-transport type="form" action="/post"></orb-channel-transport>${COMPOSER}</orb-channel>`);
    await typeAndSend(page, "Form text");
    await expect(row(page, "f1")).toContainText("Form text");
    await expect(byText(page, "Form text")).toHaveCount(1);
    expect(body).toContain('name="text"');
    expect(body).toContain("Form text");
    expect(body).toContain('name="client-id"');
  });

  test("a form response that isn't OK shows the failure, and Retry posts again", async ({ page }) => {
    let posts = 0;
    await page.route("**/post", (route) => {
      posts += 1;
      return posts === 1 ? route.fulfill({ status: 500, body: "" }) : route.fulfill({ contentType: "text/html", body: "" });
    });
    await mount(page, `<orb-channel pov="ada" style="height: 300px">${PEOPLE}<orb-channel-transport type="form" action="/post"></orb-channel-transport>${COMPOSER}</orb-channel>`);
    await typeAndSend(page, "Flaky");
    await expect(byText(page, "Flaky").locator("[part~='status']")).toContainText("The server answered 500");
    await byText(page, "Flaky").locator("[part~='retry']").click();
    await expect.poll(() => posts).toBe(2);
    await expect(byText(page, "Flaky").locator("[part~='status']")).toHaveCount(0);
  });

  test("participants the messages come from are fetched in one batch from the source", async ({ page }) => {
    const requested: string[] = [];
    await page.route("**/people**", (route) => {
      const ids = new URL(route.request().url()).searchParams.get("ids") ?? "";
      requested.push(ids);
      const body = ids
        .split(",")
        .map((id) => `<orb-channel-participant id="${id}" name="${id.toUpperCase()}"></orb-channel-participant>`)
        .join("");
      return route.fulfill({ contentType: "text/html", body });
    });
    await mount(
      page,
      `<orb-channel pov="ada" show-names style="height: 300px"><orb-channel-participant id="ada" name="Ada"></orb-channel-participant><orb-channel-participant-source href="/people?ids={ids}"></orb-channel-participant-source><orb-channel-message id="m1" from="zoe">Hello</orb-channel-message><orb-channel-message id="m2" from="yan">Hi</orb-channel-message></orb-channel>`,
    );
    await expect(row(page, "m1").locator("[part~='name']")).toHaveText("ZOE");
    await expect(row(page, "m2").locator("[part~='name']")).toHaveText("YAN");
    expect(requested).toEqual(["zoe,yan"]);
  });
});

test.describe("orb-channel drafts", () => {
  test("with drafts=persist, a draft is kept under key and comes back when the channel loads", async ({ page }) => {
    const markup = `<orb-channel pov="ada" key="room-1" drafts="persist" style="height: 300px">${PEOPLE}${COMPOSER}</orb-channel>`;
    await mount(page, markup);
    await page.locator("orb-channel textarea").click();
    await page.keyboard.type("Half written");
    await mount(page, markup);
    await expect(page.locator("orb-channel textarea")).toHaveValue("Half written");
  });

  test("without drafts=persist, the draft isn't kept", async ({ page }) => {
    const markup = `<orb-channel pov="ada" key="room-2" style="height: 300px">${PEOPLE}${COMPOSER}</orb-channel>`;
    await mount(page, markup);
    await page.locator("orb-channel textarea").click();
    await page.keyboard.type("Not kept");
    await mount(page, markup);
    await expect(page.locator("orb-channel textarea")).toHaveValue("");
  });

  test("sending clears the saved draft", async ({ page }) => {
    const markup = `<orb-channel pov="ada" key="room-3" drafts="persist" style="height: 300px">${PEOPLE}${COMPOSER}</orb-channel>`;
    await mount(page, markup);
    await typeAndSend(page, "Sent, so cleared");
    await mount(page, markup);
    await expect(page.locator("orb-channel textarea")).toHaveValue("");
  });

  test("a reply box keeps its draft for its thread", async ({ page }) => {
    const markup = `<orb-channel pov="ada" key="room-4" drafts="persist" threads="panel" style="height: 400px">${PEOPLE}<orb-channel-message id="m1" from="grace">Root</orb-channel-message>${COMPOSER}</orb-channel>`;
    const openReply = async () => {
      await row(page, "m1").click({ button: "right" });
      await page.locator("orb-channel orb-mi").filter({ hasText: "Reply" }).click();
    };
    await mount(page, markup);
    await openReply();
    await page.locator("orb-channel [part~='thread-panel'] textarea").click();
    await page.keyboard.type("Half a reply");
    await mount(page, markup);
    await openReply();
    await expect(page.locator("orb-channel [part~='thread-panel'] textarea")).toHaveValue("Half a reply");
  });
});
