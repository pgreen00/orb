import type { ContentPart } from "./types";

/** The words of a message's parts, without markup, as a screen reader should hear them */
export function spokenTextOf(parts: ContentPart[]): string {
  return parts
    .map((part) => {
      if (part.type === "text") return part.text;
      if (part.type === "markdown") {
        return part.source
          .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
          .replace(/[*_`#>]+/g, "");
      }
      if (part.type === "html") return new DOMParser().parseFromString(part.html, "text/html").body.textContent ?? "";
      // Reasoning and tool calls aren't part of the answer, so they aren't read out
      return "";
    })
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * The sentences that are finished, and the text after them. A sentence is
 * finished once its punctuation is followed by a space or the end of the text.
 */
export function sentencesOf(text: string): { done: string[]; rest: string } {
  const done: string[] = [];
  let end = 0;
  for (const match of text.matchAll(/[^.!?]*[.!?]+(?=\s|$)/g)) {
    const sentence = match[0].trim();
    if (sentence) done.push(sentence);
    end = (match.index ?? 0) + match[0].length;
  }
  return { done, rest: text.slice(end).trim() };
}
