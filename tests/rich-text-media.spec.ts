import { test, expect, type Page } from "@playwright/test";
import {
  DEFAULT_EMBED_PROVIDERS,
  embedFromText,
  parseEmbedUrl,
  VIMEO,
  YOUTUBE,
} from "../src/components/rich-text/convert/embed";
import { isAccepted } from "../src/components/rich-text/editing/media";
import { content, editor, placeCaret } from "./rich-text-utils";

const file = (name: string, type: string) => new File(["x"], name, { type });

test.describe("embed links", () => {
  test("YouTube watch, short and embed links give the video ID", () => {
    for (const url of [
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://youtu.be/dQw4w9WgXcQ",
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s",
      "https://www.youtube.com/watch?feature=share&v=dQw4w9WgXcQ",
    ]) {
      expect(parseEmbedUrl(url, DEFAULT_EMBED_PROVIDERS), url).toEqual({ provider: YOUTUBE, id: "dQw4w9WgXcQ" });
    }
  });

  test("Vimeo links give the video ID", () => {
    expect(parseEmbedUrl("https://vimeo.com/76979871", DEFAULT_EMBED_PROVIDERS)).toEqual({ provider: VIMEO, id: "76979871" });
    expect(parseEmbedUrl("https://player.vimeo.com/video/76979871", DEFAULT_EMBED_PROVIDERS)?.id).toBe("76979871");
  });

  test("links that aren't a provider's video are rejected", () => {
    for (const url of [
      "https://example.com/watch?v=dQw4w9WgXcQ",
      "https://youtu.be/",
      "https://youtu.be/abc<script>",
      "https://vimeo.com/abc",
      "javascript:alert(1)",
    ]) {
      expect(parseEmbedUrl(url, DEFAULT_EMBED_PROVIDERS), url).toBeNull();
    }
  });

  test("only the providers given are matched", () => {
    expect(parseEmbedUrl("https://vimeo.com/76979871", [YOUTUBE])).toBeNull();
  });

  test("a line counts only when it's the whole link", () => {
    expect(embedFromText("  https://youtu.be/dQw4w9WgXcQ  ", DEFAULT_EMBED_PROVIDERS)?.id).toBe("dQw4w9WgXcQ");
    expect(embedFromText("Watch https://youtu.be/dQw4w9WgXcQ", DEFAULT_EMBED_PROVIDERS)).toBeNull();
    expect(embedFromText("https://youtu.be/dQw4w9WgXcQ\nmore text", DEFAULT_EMBED_PROVIDERS)).toBeNull();
  });

  test("embed sources are built from the ID", () => {
    expect(YOUTUBE.embedSrc("dQw4w9WgXcQ")).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
    expect(VIMEO.embedSrc("76979871")).toBe("https://player.vimeo.com/video/76979871");
  });
});

test.describe("accepted files", () => {
  test("wildcards, exact types and extensions", () => {
    expect(isAccepted(file("cat.png", "image/png"), "image/*")).toBe(true);
    expect(isAccepted(file("clip.mp4", "video/mp4"), "image/*")).toBe(false);
    expect(isAccepted(file("clip.mp4", "video/mp4"), "image/*, video/mp4")).toBe(true);
    expect(isAccepted(file("doc.PDF", "application/pdf"), ".pdf")).toBe(true);
    expect(isAccepted(file("cat.png", "image/png"), ".pdf, .jpg")).toBe(false);
  });

  test("an empty accept string takes any file", () => {
    expect(isAccepted(file("notes.txt", "text/plain"), "")).toBe(true);
  });
});

test.describe("saved media", () => {
  // These need only the current schema and sanitizer, so they run before any wiring.

  test("an image figure with a caption and width is saved as it was written", async ({ page }) => {
    const html =
      '<figure style="text-align: center"><img src="https://example.com/cat.png" alt="A cat" width="480"><figcaption>Optional caption</figcaption></figure>';
    await editor(page, html);
    expect(await content(page)).toBe(`${html}<p><br></p>`);
  });

  test("an image's alignment is kept", async ({ page }) => {
    const html = '<figure style="text-align: left"><img src="https://example.com/cat.png" alt=""></figure>';
    await editor(page, html);
    expect(await content(page)).toBe(`${html}<p><br></p>`);
  });

  test("a video figure is saved as it was written", async ({ page }) => {
    const html = '<figure><video src="https://example.com/clip.mp4" controls=""></video></figure>';
    await editor(page, html);
    expect(await content(page)).toBe(`${html}<p><br></p>`);
  });

  for (const [name, src] of [
    ["youtube", "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"],
    ["vimeo", "https://player.vimeo.com/video/76979871"],
  ] as const) {
    test(`a ${name} embed is saved with its provider's frame`, async ({ page }) => {
      const html = `<figure data-embed="${name}"><iframe src="${src}" sandbox="allow-scripts allow-same-origin allow-presentation" allowfullscreen="" loading="lazy"></iframe></figure>`;
      await editor(page, html);
      expect(await content(page)).toBe(`${html}<p><br></p>`);
    });
  }

  test("the runtime upload marker never reaches the saved HTML", async ({ page }) => {
    await editor(page, '<figure><img src="https://example.com/a.png" alt="" data-uploading=""></figure>');
    expect(await content(page)).toBe('<figure><img src="https://example.com/a.png" alt=""></figure><p><br></p>');
  });

  // Needs sanitize.ts to drop an iframe whose src fails the provider check, as it already does for images.
  test("an iframe that isn't a provider's embed is removed", async ({ page }) => {
    await editor(page, '<figure><iframe src="https://evil.example/embed/x"></iframe></figure>');
    expect(await content(page)).not.toContain("<iframe");
  });

  // Needs the schema to rebuild the embed src from the ID, rather than keeping the pasted query string.
  test("a pasted embed keeps only the provider's ID in its src", async ({ page }) => {
    await editor(page, '<figure data-embed="youtube"><iframe src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1"></iframe></figure>');
    const saved = await content(page);
    expect(saved).toContain('src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"');
    expect(saved).not.toContain("autoplay");
  });
});


/** Pastes data onto the editor, the way the clipboard does. `files` are image files on the clipboard. */
const paste = (page: Page, data: Record<string, string>, files: { name: string; type: string }[] = []) =>
  page.locator("orb-rich-text").evaluate(
    (host: any, [data, files]) => {
      const area = host.shadowRoot.querySelector(".editor-content");
      area.focus();
      const dt = new DataTransfer();
      for (const [type, value] of Object.entries(data)) dt.setData(type, value);
      for (const f of files) dt.items.add(new File([new Uint8Array([137, 80, 78, 71])], f.name, { type: f.type }));
      area.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
    },
    [data, files] as const,
  );

/** Sets the host's upload, which resolves to a CDN URL after a short wait, or fails. */
const setUpload = (page: Page, fail = false) =>
  page.locator("orb-rich-text").evaluate((host: any, fail) => {
    host.upload = (f: File) =>
      new Promise((resolve, reject) =>
        setTimeout(() => (fail ? reject(new Error("offline")) : resolve(`https://cdn.example.com/${f.name}`)), 200),
      );
  }, fail);

test.describe("media in the editor", () => {
  test("the image button inserts a figure with the uploaded URL", async ({ page }) => {
    // A toolbar of its own, since the default one overflows into More at this width
    await editor(page, "<p>Start</p>", 'toolbar="media"');
    await setUpload(page);
    await placeCaret(page, "Start", 5);
    const chooser = page.waitForEvent("filechooser");
    await page.locator("orb-rich-text #action-media").click();
    await (await chooser).setFiles({ name: "cat.png", mimeType: "image/png", buffer: Buffer.from([137, 80, 78, 71]) });
    await expect.poll(() => content(page)).toContain('<img src="https://cdn.example.com/cat.png"');
    expect(await content(page)).not.toContain("data-uploading");
  });

  test("a pasted image without an upload is embedded as a data URL", async ({ page }) => {
    await editor(page, "<p><br></p>");
    await paste(page, {}, [{ name: "shot.png", type: "image/png" }]);
    await expect.poll(() => content(page)).toContain('<img src="data:image/png;base64,');
  });

  test("a failed upload removes its figure", async ({ page }) => {
    await editor(page, "<p><br></p>");
    await setUpload(page, true);
    const reported = page
      .locator("orb-rich-text")
      .evaluate((el) => new Promise<boolean>((resolve) => el.addEventListener("orbUploadError", () => resolve(true), { once: true })));
    await paste(page, {}, [{ name: "shot.png", type: "image/png" }]);
    expect(await reported).toBe(true);
    expect(await content(page)).not.toContain("<figure");
  });

  test("an image inside a paragraph moves into its own figure", async ({ page }) => {
    await editor(page, "<p><br></p>");
    await paste(page, { "text/html": '<p>Before <img src="https://example.com/a.png"> after</p>' });
    await expect.poll(() => content(page)).toMatch(/<p>Before <\/p><figure[^>]*><img src="https:\/\/example\.com\/a\.png">/);
    expect(await content(page)).toContain("after</p>");
  });

  test("a pasted video link on its own line becomes an embed", async ({ page }) => {
    await editor(page, "<p><br></p>");
    await paste(page, { "text/plain": "https://youtu.be/dQw4w9WgXcQ" });
    await expect.poll(() => content(page)).toContain('<iframe src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"');
    expect(await content(page)).not.toContain("youtu.be");
  });

  test("the caret goes into a caption and types there", async ({ page }) => {
    await editor(
      page,
      '<figure style="text-align: center"><img src="https://example.com/a.png" alt=""><figcaption>Caption</figcaption></figure>',
    );
    await placeCaret(page, "Caption", 7);
    await page.keyboard.type("!");
    await expect.poll(() => content(page)).toContain("<figcaption>Caption!</figcaption>");
  });
});
