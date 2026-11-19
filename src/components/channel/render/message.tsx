import { mountHtml } from "../model/content";
import type { MessageModel, ParticipantModel } from "../model/types";

import { Avatar, renderText } from "./parts";

/** What a message's buttons ask the channel to do. The channel decides what each one means. */
export interface RowHandlers {
  /** Opens the message's actions at a point: a right click, a long press, or the keyboard's Menu key */
  actions: (row: HTMLElement, x: number, y: number) => void;
  reaction: (emoji: string) => void;
  reply: () => void;
  copy: () => void;
  edit: () => void;
  remove: () => void;
  report: () => void;
  moderate: (action: "pin" | "unpin" | "hide" | "remove" | "mute") => void;
  reveal: () => void;
  editInput: (text: string) => void;
  editCommit: () => void;
  editCancel: () => void;
}

export interface MessageRowProps {
  key?: string;
  /** Identifies the row in the list, for keyboard focus */
  rowKey: string;
  model: MessageModel;
  self: boolean;
  first: boolean;
  last: boolean;
  /** The participant who sent the message, if the channel knows them */
  participant?: ParticipantModel;
  participants: ParticipantModel[];
  pov?: string;
  /** The message this one replies to, shown as a quote */
  quoted?: MessageModel;
  showName: boolean;
  showAvatar: boolean;
  showTime: boolean;
  /** Whether this row is the one the list's arrow keys start from */
  active: boolean;
  /**
   * Set when the content is collapsed: a hidden or ignored message, or a
   * removed one, which can't be shown anyway.
   */
  collapsed?: { reason: string; removed: boolean };
  /** The draft, while the message is being edited */
  editing?: string;
  /** Whether the point of view is a moderator, who gets moderation buttons */
  moderator: boolean;
  /** The HTML of a markdown source, or undefined while it loads */
  markdownOf: (source: string) => string | undefined;
  handlers: RowHandlers;
  onFocus: () => void;
}

function Attachments(props: { model: MessageModel }) {
  return (
    <div part="attachments" class="attachments">
      {props.model.attachments.map((file) =>
        file.type?.startsWith("image/") ? (
          <a part="attachment" class="image" href={file.href} target="_blank" rel="noopener noreferrer">
            <img src={file.href} alt={file.name} />
          </a>
        ) : (
          <a part="attachment" class="file" href={file.href} target="_blank" rel="noopener noreferrer">
            <span class="file-name">{file.name}</span>
            {file.size && <span class="file-size">{file.size}</span>}
          </a>
        ),
      )}
    </div>
  );
}

/** How long a finger or pen rests on a message before its actions open */
const HOLD_MS = 500;
/** How far a press can move before it's a scroll, not a hold */
const HOLD_SLOP = 10;
/** Controls keep their own presses and menus, so a message doesn't take them */
const CONTROLS = "a, button, input, select, textarea, orb-button";

/** The press that may open a message's actions. Only one press is tracked at a time. */
let hold: { x: number; y: number; timer: ReturnType<typeof setTimeout> } | undefined;

function endHold() {
  clearTimeout(hold?.timer);
  hold = undefined;
}

/** A message in the list. Its state names go into its parts, so they can be styled from outside. */
export function MessageRow(props: MessageRowProps) {
  const { model, participant, participants, self, first, last, handlers, collapsed, editing } = props;
  const removed = model.moderation === "removed";
  const canAct = !removed && editing === undefined;
  const states = [
    self && "self",
    first && "first-in-group",
    last && "last-in-group",
    model.status === "failed" && "failed",
    model.moderation === "pending" && "pending",
    model.pinned && "pinned",
    removed && "removed",
  ].filter(Boolean) as string[];
  const name = participant?.name ?? model.from;

  const reacted = (emoji: string) => model.reactions.find((r) => r.emoji === emoji)?.by.includes(props.pov ?? "");
  const bubbleParts = ["bubble", ...states].join(" ");

  const content = () => {
    if (removed) return <div part="removed" class="note">Removed by a moderator</div>;
    if (collapsed) {
      return (
        <div part="hidden" class="note">
          <span>{collapsed.reason}</span>
          <orb-button fill="clear" size="xs" onClick={() => handlers.reveal()}>
            Show anyway
          </orb-button>
        </div>
      );
    }
    if (editing !== undefined) {
      return (
        <div part="edit" class="edit">
          <textarea
            aria-label="Edit message"
            value={editing}
            rows={1}
            onInput={(event) => handlers.editInput((event.target as HTMLTextAreaElement).value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
                event.preventDefault();
                handlers.editCommit();
              } else if (event.key === "Escape") {
                event.preventDefault();
                handlers.editCancel();
              }
            }}
          />
          <div class="edit-actions">
            <orb-button size="xs" onClick={() => handlers.editCommit()}>
              Save
            </orb-button>
            <orb-button size="xs" fill="clear" onClick={() => handlers.editCancel()}>
              Cancel
            </orb-button>
          </div>
        </div>
      );
    }
    return (
      <div part={bubbleParts} class="bubble chat-content">
        {model.parts.map((part) => {
          if (part.type === "text") {
            return <div class="text">{renderText(part.text, participants, props.pov)}</div>;
          }
          if (part.type === "markdown") {
            const html = props.markdownOf(part.source);
            return html === undefined ? (
              <div class="text">{part.source}</div>
            ) : (
              <div class="html" ref={(el) => mountHtml(el ?? null, html)} />
            );
          }
          return <div class="html" ref={(el) => mountHtml(el ?? null, part.html)} />;
        })}
      </div>
    );
  };

  return (
    <div
      role="article"
      class={{ message: true, self, first, last, failed: model.status === "failed", pending: model.moderation === "pending", removed }}
      part={["message", ...states].join(" ")}
      data-id={model.id || undefined}
      data-key={props.rowKey}
      tabIndex={props.active ? 0 : -1}
      onFocus={props.onFocus}
      onContextMenu={(event) => {
        if (!canAct || (event.target as Element).closest?.(CONTROLS)) return;
        event.preventDefault();
        handlers.actions(event.currentTarget as HTMLElement, event.clientX, event.clientY);
      }}
      onPointerDown={(event) => {
        endHold();
        if (!canAct || event.pointerType === "mouse" || !event.isPrimary) return;
        if ((event.target as Element).closest?.(CONTROLS)) return;
        const row = event.currentTarget as HTMLElement;
        const { clientX: x, clientY: y } = event;
        hold = {
          x,
          y,
          timer: setTimeout(() => {
            endHold();
            handlers.actions(row, x, y);
          }, HOLD_MS),
        };
      }}
      onPointerMove={(event) => {
        if (hold && Math.hypot(event.clientX - hold.x, event.clientY - hold.y) > HOLD_SLOP) endHold();
      }}
      onPointerUp={endHold}
      onPointerCancel={endHold}
    >
      {props.showAvatar ? (
        <Avatar name={name} src={participant?.avatar} accent={participant?.accent} />
      ) : (
        <span class="avatar-space" aria-hidden="true" />
      )}
      <div class="body">
        {props.showName && (
          <div part="name" class="name" style={participant?.accent ? ({ "--accent": participant.accent } as any) : undefined}>
            {name}
            {participant?.moderator && (
              <span part="badge" class="badge">
                Moderator
              </span>
            )}
          </div>
        )}
        {model.replyTo && (
          <div part="quote" class="quote">
            {props.quoted ? props.quoted.text.slice(0, 140) : "A message that isn't shown"}
          </div>
        )}
        {content()}
        {!collapsed && !removed && model.reactions.length > 0 && (
          <div part="reactions" class="reactions">
            {model.reactions.map((reaction) => (
              <button
                part="reaction"
                class="reaction"
                aria-pressed={reacted(reaction.emoji) ? "true" : "false"}
                aria-label={`${reaction.emoji}, ${reaction.by.length}`}
                onClick={() => handlers.reaction(reaction.emoji)}
              >
                {reaction.emoji} {reaction.by.length}
              </button>
            ))}
          </div>
        )}
        {!collapsed && !removed && model.attachments.length > 0 && <Attachments model={model} />}
        {(model.status === "sending" || model.status === "failed" || model.edited || model.pinned || model.moderation === "pending") && (
          <div part="status" class="status">
            {model.pinned && "Pinned "}
            {model.status === "sending" && "Sending… "}
            {model.status === "failed" && "Not sent "}
            {model.moderation === "pending" && "Awaiting approval "}
            {model.edited && "Edited"}
          </div>
        )}
        {props.showTime && model.ts && (
          <div part="time" class="time">
            <orb-relative-time date={model.ts} />
          </div>
        )}
      </div>
    </div>
  );
}

/** A line across the list, with a label in its middle */
export function DividerRow(props: { key?: string; label: string; type: "date" | "unread" | "custom" }) {
  return (
    <div part="divider" class={{ divider: true, unread: props.type === "unread" }} role="separator">
      {props.label && <span>{props.label}</span>}
    </div>
  );
}
