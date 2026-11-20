import { mountHtml } from "../model/content";
import type { ContentPart, MessageModel, ParticipantModel } from "../model/types";

import { Avatar, renderText } from "./parts";
import { CitationButton, ReasoningBlock, ToolCallBlock, VariantSwitch, type ReasoningPart, type ToolCallPart } from "./ai";
import { ArrowDownIcon, ArrowUpIcon } from "../icons";

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
  regenerate: () => void;
  /** Sends a failed message again */
  retry: () => void;
  /** Pins the message, for the app to set `pinned` on it */
  pin: () => void;
  /** Copies a link to the message */
  copyLink: () => void;
  /** The viewer's vote. `none` takes the vote back. */
  vote: (value: "up" | "down" | "none") => void;
  moderate: (action: "pin" | "unpin" | "hide" | "remove" | "mute") => void;
  reveal: () => void;
  /** A tool call's approve or deny button */
  toolDecision: (toolCall: HTMLElement, callId: string, approved: boolean) => void;
  /** The version switcher's arrows, with the version asked for */
  variant: (current: number) => void;
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
  /** How reasoning shows: `show` opens it, `collapsed` keeps it shut, and `hidden` leaves it out */
  reasoning: "show" | "collapsed" | "hidden";
  /** How deep a reply is in its thread. Replies are indented by it. */
  depth?: number;
  /** A receipt under the message, such as "Delivered" or "Read" */
  receipt?: string;
  /** Which vote buttons the message shows */
  votes: "none" | "up" | "up-down";
  /** Content drawn at the end of the message, such as its replies when they're nested in it */
  nested?: any;
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

/** A message's content is bubbles of text, with reasoning and tool calls between them, drawn as blocks */
type Segment = { kind: "bubble"; parts: ContentPart[] } | { kind: "block"; part: ReasoningPart | ToolCallPart };

function segmentsOf(parts: ContentPart[], reasoning: MessageRowProps["reasoning"], streaming: boolean): Segment[] {
  const segments: Segment[] = [];
  for (const part of parts) {
    if (part.type === "reasoning" && reasoning === "hidden") continue;
    if (part.type === "reasoning" || part.type === "tool-call") {
      segments.push({ kind: "block", part });
      continue;
    }
    const last = segments[segments.length - 1];
    if (last?.kind === "bubble") last.parts.push(part);
    else segments.push({ kind: "bubble", parts: [part] });
  }
  // A message that's still streaming ends in a bubble, which holds its cursor
  if (streaming && segments[segments.length - 1]?.kind !== "bubble") segments.push({ kind: "bubble", parts: [] });
  return segments;
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
    model.streaming && "streaming",
    removed && "removed",
  ].filter(Boolean) as string[];
  const name = participant?.name ?? model.from;
  const aiLabel = participant?.role === "ai" ? participant.aiLabel : undefined;

  const reacted = (emoji: string) => model.reactions.find((r) => r.emoji === emoji)?.by.includes(props.pov ?? "");
  const bubbleParts = ["bubble", ...states].join(" ");
  const segments = segmentsOf(model.parts, props.reasoning, model.streaming);

  const inline = (part: ContentPart) => {
    if (part.type === "text") return renderText(part.text, participants, props.pov);
    if (part.type === "citation") return <CitationButton part={part} />;
    return null;
  };

  // Keys stop the vdom from reusing a block that was filled with innerHTML for a different part
  const block = (part: ContentPart, position: number) => {
    if (part.type === "markdown") {
      const html = props.markdownOf(part.source);
      return html === undefined ? (
        <div key={`source-${position}`} class="text">{part.source}</div>
      ) : (
        <div key={`markdown-${position}`} class="html" ref={(el) => mountHtml(el ?? null, html)} />
      );
    }
    if (part.type === "html") return <div key={`html-${position}`} class="html" ref={(el) => mountHtml(el ?? null, part.html)} />;
    if (part.type === "reasoning") return <ReasoningBlock part={part} open={props.reasoning === "show"} />;
    if (part.type === "tool-call") {
      return <ToolCallBlock part={part} onDecide={(approved) => handlers.toolDecision(part.el, part.callId, approved)} />;
    }
    return null;
  };

  /** A bubble's lines: runs of text and citations share a line, and the cursor ends the last line */
  const lines = (parts: ContentPart[], cursor: boolean) => {
    const cursorEl = <span part="cursor" class="cursor" aria-hidden="true" />;
    const nodes: unknown[] = [];
    let run: ContentPart[] = [];
    for (const part of parts) {
      if (part.type === "text" || part.type === "citation") {
        run.push(part);
        continue;
      }
      if (run.length) nodes.push(<div key={`run-${nodes.length}`} class="text">{run.map(inline)}</div>);
      run = [];
      nodes.push(block(part, nodes.length));
    }
    if (run.length) nodes.push(<div key={`run-${nodes.length}`} class="text">{run.map(inline)}{cursor && cursorEl}</div>);
    else if (cursor) nodes.push(<div key={`cursor-${nodes.length}`} class="text">{cursorEl}</div>);
    return nodes;
  };

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
    return segments.map((segment, index) =>
      segment.kind === "block" ? (
        block(segment.part, index)
      ) : (
        <div key={`bubble-${index}`} part={bubbleParts} class="bubble chat-content">
          {lines(segment.parts, model.streaming && index === segments.length - 1)}
        </div>
      ),
    );
  };

  return (
    <div
      key={props.rowKey}
      role="article"
      class={{ message: true, self, first, last, failed: model.status === "failed", pending: model.moderation === "pending", removed }}
      part={["message", ...states].join(" ")}
      data-id={model.id || undefined}
      data-key={props.rowKey}
      style={props.depth ? ({ "--depth": String(props.depth) } as any) : undefined}
      aria-busy={model.streaming ? "true" : undefined}
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
        {(props.showName || (aiLabel && props.first)) && (
          <div part="name" class="name" style={participant?.accent ? ({ "--accent": participant.accent } as any) : undefined}>
            {props.showName && name}
            {props.first && aiLabel && (
              <span part="ai-badge" class="badge">
                {aiLabel}
              </span>
            )}
            {props.showName && participant?.moderator && (
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
        {!collapsed && !removed && model.attachments.length > 0 && <Attachments model={model} />}
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
        {!collapsed && !removed && props.votes !== "none" && (
          <div part="votes" class="votes">
            <orb-button
              part="vote-up"
              fill="clear"
              size="xs"
              class="icon-only"
              aria-label="Upvote"
              aria-pressed={model.vote === "up" ? "true" : "false"}
              onClick={() => handlers.vote(model.vote === "up" ? "none" : "up")}
            >
              <ArrowUpIcon />
            </orb-button>
            <span part="score" class="score" aria-label={`Score ${model.score ?? 0}`}>
              {model.score ?? 0}
            </span>
            {props.votes === "up-down" && (
              <orb-button
                part="vote-down"
                fill="clear"
                size="xs"
                class="icon-only"
                aria-label="Downvote"
                aria-pressed={model.vote === "down" ? "true" : "false"}
                onClick={() => handlers.vote(model.vote === "down" ? "none" : "down")}
              >
                <ArrowDownIcon />
              </orb-button>
            )}
          </div>
        )}
        {!collapsed && !removed && model.variants && (
          <VariantSwitch variants={model.variants} onChange={(current) => handlers.variant(current)} />
        )}
        {(model.status === "sending" || model.status === "failed" || model.edited || model.pinned || model.moderation === "pending") && (
          <div part="status" class="status">
            {model.pinned && "Pinned "}
            {model.status === "sending" && "Sending… "}
            {model.status === "failed" && `${model.error ?? "Not sent"} `}
            {model.status === "failed" && (
              <orb-button part="retry" size="xs" fill="clear" onClick={() => handlers.retry()}>
                Retry
              </orb-button>
            )}
            {model.moderation === "pending" && "Awaiting approval "}
            {model.edited && "Edited"}
          </div>
        )}
        {props.receipt && (
          <div part="receipt" class="status">
            {props.receipt}
          </div>
        )}
        {props.showTime && model.ts && (
          <div part="time" class="time">
            <orb-relative-time date={model.ts} />
          </div>
        )}
        {props.nested}
      </div>
    </div>
  );
}

/** A line across the list, with a label in its middle */
export function DividerRow(props: { key?: string; label: string; type: "date" | "unread" | "custom" }) {
  return (
    <div key={props.key} part="divider" class={{ divider: true, unread: props.type === "unread" }} role="separator">
      {props.label && <span>{props.label}</span>}
    </div>
  );
}
