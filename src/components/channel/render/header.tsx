import type { ParticipantModel } from "../model/types";
import { Avatar } from "./parts";

export interface HeaderPresence {
  /** `sampled` shows a count and a few avatars. `full` names the people who are online and away. */
  mode: "sampled" | "full";
  online: ParticipantModel[];
  away: ParticipantModel[];
  total: number;
}

export interface ChannelHeaderProps {
  title: string;
  description?: string;
  avatars: ParticipantModel[];
  presence?: HeaderPresence;
}

const names = (participants: ParticipantModel[]) => participants.map((p) => p.name).join(", ");

/**
 * The header. The `header-start`, `header-title` and `header-end` slots let an
 * app place its own content. The `header-title` slot replaces the title, the
 * description, the presence and the avatars.
 */
export function ChannelHeader(props: ChannelHeaderProps) {
  const presence = props.presence;
  return (
    <header part="header" class="header">
      <slot name="header-start" />
      <slot name="header-title">
        <div class="titles">
          <div part="header-title" class="title">
            {props.title}
          </div>
          {props.description && (
            <div part="header-description" class="description">
              {props.description}
            </div>
          )}
          {presence &&
            (presence.mode === "full" ? (
              <div part="presence" class="description">
                {presence.online.length ? `Online: ${names(presence.online)}` : "Nobody is online"}
                {presence.away.length > 0 && ` · Away: ${names(presence.away)}`}
              </div>
            ) : (
              <div part="presence" class="description">
                {presence.online.length} of {presence.total} online
              </div>
            ))}
        </div>
        {props.avatars.length > 0 && (
          <div part="header-avatars" class="avatars">
            {props.avatars.map((participant) => (
              <Avatar name={participant.name} src={participant.avatar} accent={participant.accent} />
            ))}
          </div>
        )}
        {presence?.mode === "sampled" && presence.online.length > 0 && (
          <div part="presence-avatars" class="avatars">
            {presence.online.slice(0, 3).map((participant) => (
              <Avatar name={participant.name} src={participant.avatar} accent={participant.accent} />
            ))}
          </div>
        )}
      </slot>
      <slot name="header-end" />
    </header>
  );
}
