import type { JSX } from "@stencil/core";
import { textPattern } from "../model/text";
import type { ParticipantModel } from "../model/types";

/** The text with its web addresses as links, and its `@`-mentions of participants as spans */
export function renderText(text: string, participants: ParticipantModel[], pov?: string): (string | JSX.Element)[] {
  const nodes: (string | JSX.Element)[] = [];
  let last = 0;
  for (const match of text.matchAll(textPattern(participants))) {
    const at = match.index ?? 0;
    if (at > last) nodes.push(text.slice(last, at));
    if (match[1]) {
      nodes.push(
        <a href={match[1]} rel="noopener noreferrer" target="_blank">
          {match[1]}
        </a>,
      );
    } else {
      const mentioned = participants.find((p) => p.name === match[2]);
      nodes.push(
        <span part={mentioned?.id === pov ? "mention mention-self" : "mention"} class="mention">
          {match[0]}
        </span>,
      );
    }
    last = at + match[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

/** A participant's picture, or their first letter when they have no picture */
export function Avatar(props: { name: string; src?: string; accent?: string }) {
  return (
    <span
      part="avatar"
      class="avatar"
      aria-hidden="true"
      style={props.accent ? ({ "--accent": props.accent } as any) : undefined}
    >
      {props.src ? <img src={props.src} alt="" /> : props.name.charAt(0).toUpperCase()}
    </span>
  );
}
