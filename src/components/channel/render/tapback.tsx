import type { JSX } from "@stencil/core";
import { CopyIcon, EyeOffIcon } from "../../../utils/icons";
import type { MessageModel } from "../model/types";
import { FlagIcon, LinkIcon, MuteIcon, PencilIcon, PinIcon, RefreshIcon, ReplyIcon, TrashIcon } from "../icons";
import type { RowHandlers } from "./message";

/** The reactions a message's actions menu offers */
export const REACTIONS = ["👍", "❤️", "😂", "🎉", "😮", "😢"];

/** The actions a message's menu can list, when the channel's `actions` attribute doesn't say */
export const DEFAULT_ACTIONS = ["react", "reply", "copy", "edit", "delete", "regenerate", "report"];

export interface MessageActionsProps {
  model: MessageModel;
  /** The actions to list, in order. `react` is the row of reactions. */
  names: string[];
  /** Whether the point of view wrote the message, so it can edit and delete it */
  own: boolean;
  pov?: string;
  /** Whether the point of view is a moderator, who gets moderation actions */
  moderator: boolean;
  /** Whether the message is an AI's, which can be asked for another answer */
  regenerable: boolean;
  handlers: RowHandlers;
  /** Closes the menu. It closes before an action runs, so the action can move focus. */
  close: () => void;
}

/** The menu for one message: the actions the channel lists, then the moderation actions for moderators */
export function MessageActions(props: MessageActionsProps) {
  const { model, handlers, close, names } = props;
  const reacted = (emoji: string) => !!model.reactions.find((r) => r.emoji === emoji)?.by.includes(props.pov ?? "");
  const listed = (name: string) =>
    names.includes(name) &&
    (name === "edit" || name === "delete" ? props.own : name === "regenerate" ? props.regenerable : name === "report" ? !props.own : true);
  const pinLabel = model.pinned ? "Unpin" : "Pin";
  const actions: Record<string, () => void> = {
    reply: handlers.reply,
    copy: handlers.copy,
    "copy-link": handlers.copyLink,
    edit: handlers.edit,
    delete: handlers.remove,
    report: handlers.report,
    regenerate: handlers.regenerate,
    pin: handlers.pin,
    "mod-pin": () => handlers.moderate(model.pinned ? "unpin" : "pin"),
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

  const item = (value: string, label: string, icon: JSX.Element) => (
    <orb-mi value={value}>
      <span slot="icon">{icon}</span>
      {label}
    </orb-mi>
  );

  const shown = names.filter(listed);
  const modPin = props.moderator && !names.includes("pin");
  return (
    <>
      {names.includes("react") && (
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
      )}
      <orb-menu mode="actions" label="Message actions" onOrbSelect={(event) => choose(event.detail.value)}>
        {shown.map((name) => {
          switch (name) {
            case "reply":
              return item("reply", "Reply", <ReplyIcon />);
            case "copy":
              return item("copy", "Copy", <CopyIcon />);
            case "copy-link":
              return item("copy-link", "Copy link", <LinkIcon />);
            case "edit":
              return item("edit", "Edit", <PencilIcon />);
            case "delete":
              return item("delete", "Delete", <TrashIcon />);
            case "regenerate":
              return item("regenerate", "Regenerate", <RefreshIcon />);
            case "report":
              return item("report", "Report", <FlagIcon />);
            case "pin":
              return item("pin", pinLabel, <PinIcon />);
            default:
              return null;
          }
        })}
        {props.moderator && (shown.length > 0 || modPin) && <orb-divider />}
        {props.moderator && modPin && item("mod-pin", pinLabel, <PinIcon />)}
        {props.moderator && item("hide", "Hide", <EyeOffIcon />)}
        {props.moderator && item("remove", "Remove", <TrashIcon />)}
        {props.moderator && !props.own && item("mute", "Mute author", <MuteIcon />)}
      </orb-menu>
    </>
  );
}
