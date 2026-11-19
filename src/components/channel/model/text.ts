import type { ParticipantModel } from "./types";

const URL_SOURCE = "https?:\\/\\/[^\\s<]*[^\\s<.,;:!?)'\"]";

const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Finds web addresses, and `@` followed by a participant's name. Group 1 is a
 * web address, and group 2 is a name.
 */
export function textPattern(participants: ParticipantModel[]): RegExp {
  const names = participants
    .map((p) => p.name)
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
  const mention = names.length ? `|@(${names.map(escape).join("|")})(?![\\p{L}\\p{N}_])` : "";
  return new RegExp(`(${URL_SOURCE})${mention}`, "gu");
}

/** The ids of the participants `@`-mentioned in the text, in order, without repeats */
export function mentionIds(text: string, participants: ParticipantModel[]): string[] {
  const ids: string[] = [];
  for (const match of text.matchAll(textPattern(participants))) {
    const name = match[2];
    if (!name) continue;
    const participant = participants.find((p) => p.name === name);
    if (participant && !ids.includes(participant.id)) ids.push(participant.id);
  }
  return ids;
}
