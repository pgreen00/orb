/**
 * Prints a document from a hidden frame. `@page` rules don't apply inside a
 * shadow root, and printing the page would include everything else on it.
 */

const PRINT_STYLES = `
  @page { size: letter; margin: 1in; }
  body { font: 12pt/1.5 system-ui, sans-serif; color: #000; }
  h1, h2, h3, h4, h5, h6 { break-after: avoid; }
  img, video, iframe { max-width: 100%; }
  figure { margin: 1em 0; text-align: center; }
  blockquote { margin-inline: 0; padding-inline-start: 1em; border-inline-start: 3px solid #999; }
  pre { white-space: pre-wrap; background: #f2f2f2; padding: 0.5em; }
  table { border-collapse: collapse; inline-size: 100%; }
  th, td { border: 1px solid #999; padding: 0.25em 0.5em; vertical-align: top; }
`;

/** Prints `html` (already sanitized editor output) as a document titled `title`. */
export function printDocument(html: string, title: string) {
  const frame = document.createElement("iframe");
  frame.title = "Print";
  frame.style.cssText = "position:fixed;width:0;height:0;border:0;visibility:hidden";
  frame.srcdoc = `<!doctype html><html><head><meta charset="utf-8"><style>${PRINT_STYLES}</style></head><body></body></html>`;
  frame.addEventListener(
    "load",
    async () => {
      const doc = frame.contentDocument!;
      doc.title = title;
      doc.body.innerHTML = html;
      await Promise.all(Array.from(doc.images, (img) => img.decode().catch(() => {})));
      const win = frame.contentWindow!;
      win.addEventListener("afterprint", () => frame.remove(), { once: true });
      win.print();
    },
    { once: true },
  );
  document.body.append(frame);
}
