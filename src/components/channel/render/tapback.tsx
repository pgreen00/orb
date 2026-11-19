import { CopyIcon, EyeOffIcon } from "../../../utils/icons";
import type { MessageModel } from "../model/types";
import { FlagIcon, MuteIcon, PencilIcon, PinIcon, ReplyIcon, TrashIcon } from "../icons";
import type { RowHandlers } from "./message";

/** The reactions a message's actions menu offers */
export const REACTIONS = ["👍", "❤️", "😂", "🎉", "😮", "😢"];

export interface MessageActionsProps {
  model: MessageModel;
  /** Whether the point of view wrote the message, so it can edit and delete it */
  own: boolean;
  pov?: string;
  /** Whether the point of view is a moderator, who gets moderation actions */
  moderator: boolean;
  handlers: RowHandlers;
  /** Closes the menu. It closes before an action runs, so the action can move focus. */
  close: () => void;
}

/** The actions for one message: a row of reactions, then the message's own actions and moderation */
export function MessageActions(props: MessageActionsProps) {
  const { model, own, handlers, close } = props;
  const reacted = (emoji: string) => !!model.reactions.find((r) => r.emoji === emoji)?.by.includes(props.pov ?? "");
  const actions: Record<string, () => void> = {
    reply: handlers.reply,
    copy: handlers.copy,
    edit: handlers.edit,
    delete: handlers.remove,
    report: handlers.report,
    pin: () => handlers.moderate("pin"),
    unpin: () => handlers.moderate("unpin"),
    hide: () => handlers.moderate("hide"),
    remove: () => handlers.moderate("remove"),
    mute: () => handlers.moderate("mute"),
  };
  const choose = (value: string) => {
    const action = actions[value];
    if (!action) return;
    close();
    action();
  };

  return (
    <>
      <div part="react" class="react" role="group" aria-label="React">
        {REACTIONS.map((emoji) => (
          <button
            aria-pressed={reacted(emoji) ? "true" : "false"}
            aria-label={`React with ${emoji}`}
            onClick={() => {
              close();
              handlers.reaction(emoji);
            }}
          >
            {emoji}
          </button>
        ))}
      </div>
      <orb-menu mode="actions" label="Message actions" onOrbSelect={(event) => choose(event.detail.value)}>
        <orb-mi value="reply">
          <span slot="icon">
            <ReplyIcon />
          </span>
          Reply
        </orb-mi>
        <orb-mi value="copy">
          <span slot="icon">
            <CopyIcon />
          </span>
          Copy
        </orb-mi>
        <orb-divider />
        {own && (
          <orb-mi value="edit">
            <span slot="icon">
              <PencilIcon />
            </span>
            Edit
          </orb-mi>
        )}
        {own && (
          <orb-mi value="delete">
            <span slot="icon">
              <TrashIcon />
            </span>
            Delete
          </orb-mi>
        )}
        {!own && (
          <orb-mi value="report">
            <span slot="icon">
              <FlagIcon />
            </span>
            Report
          </orb-mi>
        )}
        {props.moderator && <orb-divider />}
        {props.moderator && (
          <orb-mi value={model.pinned ? "unpin" : "pin"}>
            <span slot="icon">
              <PinIcon />
            </span>
            {model.pinned ? "Unpin" : "Pin"}
          </orb-mi>
        )}
        {props.moderator && (
          <orb-mi value="hide">
            <span slot="icon">
              <EyeOffIcon />
            </span>
            Hide
          </orb-mi>
        )}
        {props.moderator && (
          <orb-mi value="remove">
            <span slot="icon">
              <TrashIcon />
            </span>
            Remove
          </orb-mi>
        )}
        {props.moderator && !own && (
          <orb-mi value="mute">
            <span slot="icon">
              <MuteIcon />
            </span>
            Mute author
          </orb-mi>
        )}
      </orb-menu>
    </>
  );
}
