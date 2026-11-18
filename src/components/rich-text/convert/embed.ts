/** A video site whose videos can be embedded by a link */
export interface EmbedProvider {
  name: "youtube" | "vimeo";
  /** Matches a whole link, and captures the video ID as group 1 */
  pattern: RegExp;
  /** The iframe src for a video ID. The ID is checked before this is called. */
  embedSrc(id: string): string;
}

export const YOUTUBE: EmbedProvider = {
  name: "youtube",
  pattern: /^https?:\/\/(?:(?:www|m)\.)?(?:youtube\.com\/(?:watch\?(?:[^\s#]*&)?v=|embed\/)|youtu\.be\/)([\w-]+)(?:[?&#/][^\s]*)?$/i,
  embedSrc: (id) => `https://www.youtube-nocookie.com/embed/${id}`,
};

export const VIMEO: EmbedProvider = {
  name: "vimeo",
  pattern: /^https?:\/\/(?:(?:www|player)\.)?vimeo\.com\/(?:video\/)?([0-9]+)(?:[?/#][^\s]*)?$/i,
  embedSrc: (id) => `https://player.vimeo.com/video/${id}`,
};

export const DEFAULT_EMBED_PROVIDERS: EmbedProvider[] = [YOUTUBE, VIMEO];

/** The provider and video ID for a link. The whole link must match, so text around it returns null. */
export function parseEmbedUrl(url: string, providers: EmbedProvider[]): { provider: EmbedProvider; id: string } | null {
  for (const provider of providers) {
    const match = provider.pattern.exec(url);
    if (match) return { provider, id: match[1] };
  }
  return null;
}

/** A line of text that is just a video link, such as a pasted one. Spaces around it are ignored. */
export function embedFromText(text: string, providers: EmbedProvider[]) {
  return parseEmbedUrl(text.trim(), providers);
}
