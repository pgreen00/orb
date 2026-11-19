import type { ParticipantModel } from "../model/types";
import { Avatar } from "./parts";

export interface ChannelHeaderProps {
  title: string;
  description?: string;
  avatars: ParticipantModel[];
}

/**
 * The header. The `header-start`, `header-title` and `header-end` slots let an
 * app place its own content. The `header-title` slot replaces the title, the
 * description and the avatars.
 */
export function ChannelHeader(props: ChannelHeaderProps) {
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
        </div>
        {props.avatars.length > 0 && (
          <div part="header-avatars" class="avatars">
            {props.avatars.map((participant) => (
              <Avatar name={participant.name} src={participant.avatar} accent={participant.accent} />
            ))}
          </div>
        )}
      </slot>
      <slot name="header-end" />
    </header>
  );
}
