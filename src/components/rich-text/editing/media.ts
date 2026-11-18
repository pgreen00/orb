import type { EmbedProvider } from "../convert/embed";
import { wrapLooseText } from "./blocks";
import { hasContent, isElement, unwrapAround } from "./dom";
import { closestBlock } from "./selection";

/** Blocks a figure can split. Other blocks, such as list items and table cells, get the figure after them. */
const SPLITTABLE = /^(P|H[1-6])$/;

/** Captions taken off a figure, kept so turning the caption back on brings its text back */
const removedCaptions = new WeakMap<HTMLElement, HTMLElement>();


/**
 * A picture, video or embed in a figure with an empty caption. The figure is a
 * non-editable piece, but its caption is typed into, so it's marked editable.
 */
function wrapInFigure(media: Element, embed?: EmbedProvider["name"]): HTMLElement {
  const doc = media.ownerDocument;
  const figure = doc.createElement("figure");
  figure.style.textAlign = "center";
  figure.setAttribute("contenteditable", "false");
  if (embed) figure.setAttribute("data-embed", embed);
  figure.append(media, emptyCaption(doc));
  return figure;
}

function emptyCaption(doc: Document): HTMLElement {
  const caption = doc.createElement("figcaption");
  caption.setAttribute("contenteditable", "true");
  caption.append(doc.createElement("br"));
  return caption;
}

/** The figure's picture or video, with `data-uploading` while its upload is pending */
export function createMediaFigure(
  kind: "image" | "video",
  src: string,
  alt: string,
  options: { uploading?: boolean } = {},
): HTMLElement {
  const media = document.createElement(kind === "image" ? "img" : "video");
  media.setAttribute("src", src);
  if (kind === "image") media.setAttribute("alt", alt);
  else media.setAttribute("controls", "");
  if (options.uploading) media.setAttribute("data-uploading", "");
  return wrapInFigure(media);
}

/** A figure with the provider's iframe, covered until the figure is selected */
export function createEmbedFigure(provider: EmbedProvider, id: string): HTMLElement {
  // The ID comes from parseEmbedUrl, so this only catches a caller's mistake; it's never a pasted src.
  if (!/^[\w-]+$/.test(id)) throw new Error(`Invalid ${provider.name} video ID: ${id}`);
  const iframe = document.createElement("iframe");
  iframe.setAttribute("src", provider.embedSrc(id));
  iframe.setAttribute("sandbox", "allow-scripts allow-same-origin allow-presentation");
  iframe.setAttribute("allowfullscreen", "");
  iframe.setAttribute("loading", "lazy");
  const figure = wrapInFigure(iframe, provider.name);
  setEmbedCover(figure, true);
  return figure;
}

/**
 * Puts a transparent cover over an embed's iframe, which would otherwise take the
 * clicks that select the figure. Removing it, once the figure is selected, lets the video play.
 */
export function setEmbedCover(figure: HTMLElement, covered: boolean): void {
  const iframe = figure.querySelector(":scope > iframe");
  const cover = figure.querySelector(":scope > .media-cover");
  if (!iframe) return;
  if (!covered) {
    cover?.remove();
  } else if (!cover) {
    const div = figure.ownerDocument.createElement("div");
    div.className = "media-cover";
    iframe.after(div);
  }
}

/** Whether a node is inside a figure's caption, where typing goes rather than selecting the figure */
export function isCaption(node: Node): boolean {
  const el = isElement(node) ? node : node.parentElement;
  return !!el?.closest("figcaption");
}

/** The top of the block holding `block`: its child of the root, or of a quote, where a figure can go */
function holderOf(root: HTMLElement, block: HTMLElement): HTMLElement {
  let holder = block;
  while (holder.parentElement && holder.parentElement !== root && holder.parentElement.tagName !== "BLOCKQUOTE") {
    holder = holder.parentElement;
  }
  return holder;
}

/**
 * Puts a figure in its own block at the caret. A paragraph or heading is split
 * there. Other blocks, such as list items and table cells, get the figure after
 * them. Returns the caret in the paragraph after the figure.
 */
export function insertFigure(root: HTMLElement, range: Range, figure: HTMLElement): Range {
  if (!range.collapsed) range.deleteContents();
  const at = wrapLooseText(root, range);
  const block = closestBlock(at.startContainer, root);
  const doc = root.ownerDocument;
  const after = doc.createElement("p");
  if (block === root) {
    root.append(figure, after);
  } else if (SPLITTABLE.test(block.tagName)) {
    const tail = doc.createRange();
    tail.setStart(at.startContainer, at.startOffset);
    tail.setEnd(block, block.childNodes.length);
    after.append(tail.extractContents());
    block.after(figure, after);
    if (!hasContent(block)) block.remove();
  } else {
    holderOf(root, block).after(figure, after);
  }
  if (!hasContent(after)) after.append(doc.createElement("br"));
  const caret = doc.createRange();
  caret.setStart(after, 0);
  caret.collapse(true);
  return caret;
}

/**
 * Moves each picture in a paragraph or heading into a figure of its own, splitting
 * the block around it, so the picture keeps its place in the text. Used after paste.
 */
export function splitImagesOut(root: Element | DocumentFragment): void {
  const doc = root.ownerDocument;
  for (const img of Array.from(root.querySelectorAll("img"))) {
    const block = img.parentElement?.closest("p, h1, h2, h3, h4, h5, h6") as HTMLElement | null;
    if (!block || !root.contains(block) || img.closest("figure")) continue;
    // Marks around the picture are lifted off it, so the figure holds only the picture
    while (img.parentElement !== block) unwrapAround(img.parentElement!, img);
    const tail = doc.createRange();
    tail.setStartAfter(img);
    tail.setEnd(block, block.childNodes.length);
    const after = doc.createElement("p");
    after.append(tail.extractContents());
    const figure = wrapInFigure(img);
    const parts: HTMLElement[] = hasContent(after) ? [figure, after] : [figure];
    block.after(...parts);
    if (!hasContent(block)) block.remove();
  }
}

export function setMediaAlign(figure: HTMLElement, align: "left" | "center" | "right"): void {
  figure.style.textAlign = align;
}

/**
 * Adds or removes a figure's caption. A caption taken off is kept, so turning it
 * back on restores its text.
 */
export function setCaption(figure: HTMLElement, on: boolean): void {
  const caption = figure.querySelector<HTMLElement>(":scope > figcaption");
  if (on) {
    if (caption) return;
    figure.append(removedCaptions.get(figure) ?? emptyCaption(figure.ownerDocument));
    removedCaptions.delete(figure);
  } else if (caption) {
    removedCaptions.set(figure, caption);
    caption.remove();
  }
}

export function setAltText(figure: HTMLElement, alt: string): void {
  figure.querySelector("img")?.setAttribute("alt", alt);
}

/** Sets the picture's width in whole pixels. The schema keeps width on images only. */
export function setMediaWidth(figure: HTMLElement, width: number): void {
  figure.querySelector("img")?.setAttribute("width", String(Math.round(width)));
}

/**
 * Whether a file matches an `accept` string, such as "image/*, .pdf" or
 * "video/mp4". Each entry is a MIME type, a type with a wildcard, or an extension.
 * An empty string accepts any file.
 */
export function isAccepted(file: File, accept: string): boolean {
  const tokens = accept
    .split(",")
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);
  if (!tokens.length) return true;
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  return tokens.some((token) => {
    if (token.startsWith(".")) return name.endsWith(token);
    if (token === "*/*") return true;
    if (token.endsWith("/*")) return type.startsWith(token.slice(0, -1));
    return type === token;
  });
}

/** The file's URL: from `upload` when there is one, otherwise a data URL */
export async function readMediaFile(file: File, upload?: (file: File) => Promise<string>): Promise<string> {
  if (upload) return upload(file);
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export interface MediaUpload {
  upload?: (file: File) => Promise<string>;
  /** Called when the file can't be inserted or its upload fails. The figure is already removed. */
  onError?: (file: File, error: unknown) => void;
  /** Called once the figure has its final URL, so the change can be recorded */
  onDone?: () => void;
}

/**
 * Inserts an image or video file at `range` as a figure. Until the upload, or
 * the data URL, is ready the figure shows a preview marked `data-uploading`. A
 * failed upload removes the figure. Returns the caret after the figure.
 */
export function insertMediaFile(root: HTMLElement, range: Range, file: File, options: MediaUpload): Range {
  const kind = file.type.startsWith("video/") ? "video" : file.type.startsWith("image/") ? "image" : null;
  if (!kind) {
    options.onError?.(file, new Error(`Can't insert ${file.type || "this file"}`));
    return range;
  }
  const preview = URL.createObjectURL(file);
  const figure = createMediaFigure(kind, preview, file.name, { uploading: true });
  const media = figure.querySelector("img, video")!;
  const caret = insertFigure(root, range, figure);
  readMediaFile(file, options.upload)
    .then(
      (src) => {
        media.setAttribute("src", src);
        media.removeAttribute("data-uploading");
        options.onDone?.();
      },
      (error) => {
        figure.remove();
        options.onError?.(file, error);
      },
    )
    .finally(() => URL.revokeObjectURL(preview));
  return caret;
}
