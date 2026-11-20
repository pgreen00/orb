import { test, expect, type Page } from "@playwright/test";
import { mount } from "./utils";

const PEOPLE = `
  <orb-channel-participant id="ada" name="Ada"></orb-channel-participant>
  <orb-channel-participant id="claude" name="Claude" role="ai" ai-label="Assistant"></orb-channel-participant>`;

const row = (page: Page, id: string) => page.locator(`orb-channel [role='article'][data-id='${id}']`);
const bubble = (page: Page, id: string) => page.locator(`orb-channel [role='article'][data-id='${id}'] [part~='bubble']`);
const item = (page: Page, label: string) => page.locator("orb-channel orb-mi").filter({ hasText: label });

/** Keeps each named event the channel emits, as plain values, in `window.log` */
const watch = (page: Page, ...names: string[]) =>
  page.locator("orb-channel").evaluate((el, names) => {
    (window as any).log = [];
    for (const name of names) {
      el.addEventListener(name, (ev: any) => {
        const d = ev.detail ?? {};
        (window as any).log.push({
          type: name,
          text: d.text,
          count: d.messages?.length,
          respondents: d.respondents,
          approved: d.approved,
          current: d.current,
          callId: d.callId,
        });
      });
    }
  }, names);

const log = (page: Page) => page.evaluate(() => (window as any).log);

test.describe("orb-channel AI", () => {
  test("an AI participant's first message shows a badge with its ai-label, even where names are hidden", async ({ page }) => {
    await mount(page, `<orb-channel pov="ada" style="height: 300px">${PEOPLE}<orb-channel-message id="a1" from="claude">Hello, I'm here.</orb-channel-message></orb-channel>`);
    await expect(page.locator("orb-channel [part~='ai-badge']")).toHaveText("Assistant");
  });

  test("orbSend lists the AI participants that should answer: always in a direct chat, and mentioned ones in a group", async ({ page }) => {
    await mount(page, `<orb-channel pov="ada" style="height: 300px">${PEOPLE}<orb-channel-composer name="body"></orb-channel-composer></orb-channel>`);
    await watch(page, "orbSend");
    await page.locator("orb-channel textarea").click();
    await page.keyboard.type("Any ideas?");
    await page.keyboard.press("Enter");
    await expect.poll(() => log(page)).toEqual([expect.objectContaining({ respondents: ["claude"] })]);

    await mount(page, `<orb-channel pov="ada" kind="group" style="height: 300px">${PEOPLE}<orb-channel-composer name="body"></orb-channel-composer></orb-channel>`);
    await watch(page, "orbSend");
    await page.locator("orb-channel textarea").click();
    await page.keyboard.type("Anyone free?");
    await page.keyboard.press("Enter");
    await expect.poll(() => log(page)).toEqual([expect.objectContaining({ respondents: [] })]);
    await page.keyboard.type("@Claude can you check the numbers?");
    await page.keyboard.press("Enter");
    await expect.poll(() => log(page)).toEqual([expect.objectContaining({ respondents: [] }), expect.objectContaining({ respondents: ["claude"] })]);
  });

  test("a streaming message shows a cursor, and is busy until it finishes", async ({ page }) => {
    await mount(page, `<orb-channel pov="ada" style="height: 300px">${PEOPLE}<orb-channel-message id="s1" from="claude" streaming>Working on it</orb-channel-message></orb-channel>`);
    await expect(row(page, "s1")).toHaveAttribute("aria-busy", "true");
    await expect(row(page, "s1").locator("[part~='cursor']")).toBeVisible();
    await page.locator("#s1").evaluate((el) => el.removeAttribute("streaming"));
    await expect(row(page, "s1")).not.toHaveAttribute("aria-busy");
    await expect(row(page, "s1").locator("[part~='cursor']")).toHaveCount(0);
  });

  test("streamed markdown renders, and an open code fence shows as an open code block", async ({ page }) => {
    await mount(
      page,
      `<orb-channel pov="ada" style="height: 300px">${PEOPLE}<orb-channel-message id="s2" from="claude" streaming><script type="text/markdown">Here is the **plan**.

\`\`\`js
const steps = 3;</script></orb-channel-message></orb-channel>`,
    );
    await expect(bubble(page, "s2").locator("strong")).toHaveText("plan");
    await expect(bubble(page, "s2").locator("pre")).toContainText("const steps = 3;");
  });

  test("reasoning is closed by default, and the reasoning attribute opens it or leaves it out", async ({ page }) => {
    const message = `<orb-channel-message id="r1" from="claude"><orb-channel-reasoning state="done" duration="4.2s">Both schemas need checking.</orb-channel-reasoning>Here is the diff.</orb-channel-message>`;
    await mount(page, `<orb-channel pov="ada" style="height: 300px">${PEOPLE}${message}</orb-channel>`);
    const reasoning = page.locator("orb-channel [part~='reasoning']");
    await expect(reasoning).toContainText("Both schemas need checking.");
    await expect.poll(() => reasoning.evaluate((el: any) => el.open)).toBe(false);
    await expect.poll(() => reasoning.evaluate((el: any) => el.summary)).toBe("Reasoning (4.2s)");

    await mount(page, `<orb-channel pov="ada" reasoning="show" style="height: 300px">${PEOPLE}${message}</orb-channel>`);
    await expect.poll(() => page.locator("orb-channel [part~='reasoning']").evaluate((el: any) => el.open)).toBe(true);

    await mount(page, `<orb-channel pov="ada" reasoning="hidden" style="height: 300px">${PEOPLE}${message}</orb-channel>`);
    await expect(page.locator("orb-channel [part~='reasoning']")).toHaveCount(0);
    await expect(bubble(page, "r1")).toContainText("Here is the diff.");
  });

  test("a tool call that waits for approval shows its arguments, and approve emits orbToolDecision", async ({ page }) => {
    await mount(
      page,
      `<orb-channel pov="ada" style="height: 300px">${PEOPLE}<orb-channel-message id="t1" from="claude"><orb-channel-tool-call name="delete_branch" call-id="call-7" status="awaiting-approval" requires-approval><script type="application/json" data-part="args">{"branch":"old-api"}</script></orb-channel-tool-call></orb-channel-message></orb-channel>`,
    );
    await expect(page.locator("orb-channel [part~='tool-args']")).toContainText("old-api");
    await watch(page, "orbToolDecision");
    await page.locator("orb-channel [part~='approval'] orb-button").first().click();
    await expect.poll(() => log(page)).toEqual([expect.objectContaining({ callId: "call-7", approved: true })]);
  });

  test("while an AI message streams, the stop button takes the send button's place, and block ignores a send", async ({ page }) => {
    await mount(
      page,
      `<orb-channel pov="ada" style="height: 300px">${PEOPLE}<orb-channel-message id="s3" from="claude" streaming>Thinking</orb-channel-message><orb-channel-composer name="body"></orb-channel-composer></orb-channel>`,
    );
    await watch(page, "orbStop", "orbSend");
    await expect(page.locator("orb-channel [part~='stop']")).toBeVisible();
    await expect(page.locator("orb-channel [part~='send']")).toHaveCount(0);
    await page.locator("orb-channel textarea").click();
    await page.keyboard.type("Hold on");
    await page.keyboard.press("Enter");
    await expect(page.locator("orb-channel textarea")).toHaveValue("Hold on");
    await page.locator("orb-channel [part~='stop']").click();
    await expect.poll(() => log(page)).toEqual([expect.objectContaining({ type: "orbStop", count: 1 })]);
    await page.locator("#s3").evaluate((el) => el.removeAttribute("streaming"));
    await expect(page.locator("orb-channel [part~='send']")).toBeVisible();
  });

  test("while-streaming queue holds the draft until the answer finishes, then sends it", async ({ page }) => {
    await mount(
      page,
      `<orb-channel pov="ada" style="height: 300px">${PEOPLE}<orb-channel-message id="s4" from="claude" streaming>Thinking</orb-channel-message><orb-channel-composer name="body" while-streaming="queue"></orb-channel-composer></orb-channel>`,
    );
    await watch(page, "orbSend");
    await page.locator("orb-channel textarea").click();
    await page.keyboard.type("Next question");
    await page.keyboard.press("Enter");
    await expect(page.locator("orb-channel [part~='note']")).toContainText("Sends when the answer finishes");
    await expect(page.locator("orb-channel textarea")).toHaveValue("Next question");
    expect(await log(page)).toEqual([]);
    await page.locator("#s4").evaluate((el) => el.removeAttribute("streaming"));
    await expect.poll(() => log(page)).toEqual([expect.objectContaining({ type: "orbSend", text: "Next question" })]);
    await expect(page.locator("orb-channel textarea")).toHaveValue("");
  });

  test("while-streaming interrupt stops the answer, then sends the draft", async ({ page }) => {
    await mount(
      page,
      `<orb-channel pov="ada" style="height: 300px">${PEOPLE}<orb-channel-message id="s5" from="claude" streaming>Thinking</orb-channel-message><orb-channel-composer name="body" while-streaming="interrupt"></orb-channel-composer></orb-channel>`,
    );
    await watch(page, "orbStop", "orbSend");
    await page.locator("orb-channel textarea").click();
    await page.keyboard.type("Change course");
    await page.keyboard.press("Enter");
    await expect.poll(() => log(page)).toEqual([
      expect.objectContaining({ type: "orbStop", count: 1 }),
      expect.objectContaining({ type: "orbSend", text: "Change course" }),
    ]);
  });

  test("a citation is a numbered button, and its popover shows the link", async ({ page }) => {
    await mount(
      page,
      `<orb-channel pov="ada" style="height: 300px">${PEOPLE}<orb-channel-message id="c1" from="claude">Here's what changed<orb-channel-citation href="https://example.com/v2" index="1" title="The v2 notes"></orb-channel-citation>, in short.</orb-channel-message></orb-channel>`,
    );
    const button = page.locator("orb-channel [part~='citation']");
    await expect(button).toHaveText("1");
    await button.click();
    await expect(page.locator("orb-channel .citation-card strong")).toHaveText("The v2 notes");
    await expect(page.locator("orb-channel .citation-card a")).toHaveText("https://example.com/v2");
  });

  test("a suggestion fills the box, and a suggestion with send sends its text", async ({ page }) => {
    await mount(
      page,
      `<orb-channel pov="ada" style="height: 300px">${PEOPLE}<orb-channel-message id="q1" from="claude">Want a summary?</orb-channel-message><orb-channel-suggestions label="Suggested replies"><orb-channel-suggestion>Yes, please</orb-channel-suggestion><orb-channel-suggestion send>Not now</orb-channel-suggestion></orb-channel-suggestions><orb-channel-composer name="body"></orb-channel-composer></orb-channel>`,
    );
    await watch(page, "orbSend");
    await page.locator("orb-channel [part~='suggestion']", { hasText: "Yes, please" }).click();
    await expect(page.locator("orb-channel textarea")).toHaveValue("Yes, please");
    expect(await log(page)).toEqual([]);
    await page.locator("orb-channel [part~='suggestion']", { hasText: "Not now" }).click();
    await expect.poll(() => log(page)).toEqual([expect.objectContaining({ type: "orbSend", text: "Not now" })]);
  });

  test("the version switcher asks for another version, and the replacement keeps focus and is announced", async ({ page }) => {
    await mount(
      page,
      `<orb-channel pov="ada" style="height: 300px">${PEOPLE}<orb-channel-message id="v1" from="claude">First answer<orb-channel-variants current="1" count="2"></orb-channel-variants></orb-channel-message><orb-channel-message id="v2" from="ada">Thanks</orb-channel-message></orb-channel>`,
    );
    await page.evaluate(() => {
      const channel = document.querySelector("orb-channel") as any;
      channel.addEventListener("orbVariantChange", (ev: any) => {
        channel.replaceFrom(
          ev.detail.message,
          `<orb-channel-message id="v3" from="claude">Second answer<orb-channel-variants current="2" count="2"></orb-channel-variants></orb-channel-message>`,
        );
      });
    });
    await expect(page.locator("orb-channel [part~='variants-count']")).toHaveText("1 / 2");
    await page.locator("orb-channel [part~='variants-next']").click();
    await expect(row(page, "v3")).toBeVisible();
    await expect(row(page, "v1")).toHaveCount(0);
    await expect(row(page, "v2")).toHaveCount(0);
    await expect(page.locator("orb-channel [part~='speech']")).toHaveText("Version 2 of 2");
    await expect(page.locator("orb-channel [data-id='v3'] [part~='variants-previous']")).toBeFocused();
  });

  test("switching to another version replaces the old one, even when the old one is markdown", async ({ page }) => {
    await mount(
      page,
      `<orb-channel pov="ada" style="height: 300px">${PEOPLE}<orb-channel-message id="v1" from="claude"><script type="text/markdown">First **answer**.</script><orb-channel-variants current="1" count="2"></orb-channel-variants></orb-channel-message></orb-channel>`,
    );
    await expect(bubble(page, "v1").locator("strong")).toHaveText("answer");
    await page.evaluate(() => {
      const channel = document.querySelector("orb-channel") as any;
      channel.addEventListener("orbVariantChange", (ev: any) => {
        channel.replaceFrom(
          ev.detail.message,
          `<orb-channel-message from="claude">Second answer<orb-channel-variants current="2" count="2"></orb-channel-variants></orb-channel-message>`,
        );
      });
    });
    await page.locator("orb-channel [part~='variants-next']").click();
    const bubbles = page.locator("orb-channel [part~='bubble']");
    await expect(bubbles).toHaveCount(1);
    await expect(bubbles).toContainText("Second answer");
    await expect(bubbles).not.toContainText("First");
  });

  test("the message writer writes a streamed answer with reasoning, a tool call and its result, and finish ends it", async ({ page }) => {
    await mount(page, `<orb-channel pov="ada" style="height: 300px">${PEOPLE}</orb-channel>`);
    await page.evaluate(async () => {
      const { createMessageWriter } = await import("/dist/components/index.js");
      const writer = createMessageWriter(document.querySelector("orb-channel")!, { from: "claude", id: "w1" });
      (window as any).writer = writer;
      writer.reasoning("Checking the schemas.");
      writer.toolCall({ callId: "t1", name: "fetch_schema", args: { id: "v2" } });
      writer.toolResult("t1", { fields: 12 });
      writer.text("Version two has **12** fields.");
    });
    await expect(row(page, "w1")).toHaveAttribute("aria-busy", "true");
    await expect(page.locator("orb-channel [part~='tool-result']")).toContainText("12");
    await expect(page.locator("orb-channel [part~='tool-status']")).toHaveText("Done");
    await expect(bubble(page, "w1").locator("strong")).toHaveText("12");
    await page.evaluate(() => (window as any).writer.finish());
    await expect(row(page, "w1")).not.toHaveAttribute("aria-busy");
  });

  test("reasoning writes that follow each other make one block, and text ends it", async ({ page }) => {
    await mount(page, `<orb-channel pov="ada" style="height: 300px">${PEOPLE}</orb-channel>`);
    await page.evaluate(async () => {
      const { createMessageWriter } = await import("/dist/components/index.js");
      const writer = createMessageWriter(document.querySelector("orb-channel")!, { from: "claude", id: "r1" });
      (window as any).writer = writer;
      writer.reasoning("First ");
      writer.reasoning("second ");
      writer.reasoning("third.");
    });
    await expect(page.locator("orb-channel orb-channel-reasoning")).toHaveCount(1);
    await expect(page.locator("orb-channel orb-channel-reasoning")).toHaveText("First second third.");
    await page.evaluate(() => {
      const writer = (window as any).writer;
      writer.text("Answer.");
      writer.reasoning("More thought.");
    });
    await expect(page.locator("orb-channel orb-channel-reasoning")).toHaveCount(2);
  });

  test("the message writer's fail shows its reason in place of \"Not sent\"", async ({ page }) => {
    await mount(page, `<orb-channel pov="ada" style="height: 300px">${PEOPLE}</orb-channel>`);
    await page.evaluate(async () => {
      const { createMessageWriter } = await import("/dist/components/index.js");
      const writer = createMessageWriter(document.querySelector("orb-channel")!, { from: "claude", id: "w2" });
      writer.text("Partial answer");
      writer.fail("Connection lost");
    });
    await expect(row(page, "w2").locator("[part~='status']")).toContainText("Connection lost");
    await expect(row(page, "w2")).toHaveClass(/failed/);
  });

  test("an AI message's menu offers Regenerate, which emits orbRegenerate", async ({ page }) => {
    await mount(page, `<orb-channel pov="ada" style="height: 300px">${PEOPLE}<orb-channel-message id="a9" from="claude">Draft</orb-channel-message></orb-channel>`);
    await watch(page, "orbRegenerate");
    await row(page, "a9").click({ button: "right" });
    await item(page, "Regenerate").click();
    await expect.poll(() => log(page)).toEqual([expect.objectContaining({ type: "orbRegenerate" })]);
  });

  test("screen readers hear each sentence of a streamed answer as it finishes, and the rest when it ends", async ({ page }) => {
    await mount(
      page,
      `<orb-channel pov="ada" style="height: 300px">${PEOPLE}<orb-channel-message id="sp" from="claude" streaming>First sentence is done. The second is</orb-channel-message></orb-channel>`,
    );
    const speech = page.locator("orb-channel [part~='speech']");
    await expect(speech).toHaveText("First sentence is done.");
    await page.locator("#sp").evaluate((el) => el.append(" finished."));
    await expect(speech).toHaveText("The second is finished.");
    await page.locator("#sp").evaluate((el) => {
      el.append(" and trailing words");
      el.removeAttribute("streaming");
    });
    await expect(speech).toHaveText("and trailing words");
  });
});
