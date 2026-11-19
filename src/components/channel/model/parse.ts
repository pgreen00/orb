import { sanitizeHtml } from "./sanitize";
import type {
  ActionModel,
  AttachmentModel,
  CommandModel,
  ComposerModel,
  ContentPart,
  DividerModel,
  MessageModel,
  Moderation,
  ParticipantModel,
  ReactionModel,
} from "./types";

/**
 * A property of a child element, or else its attribute. Before the element is
 * upgraded, only the attribute is there.
 */
function read(el: HTMLElement, prop: string, attribute: string): string | undefined {
  const value = (el as unknown as Record<string, unknown>)[prop];
  if (typeof value === "string") return value;
  return el.getAttribute(attribute) ?? undefined;
}

/** A boolean property of a child element, or else the presence of its attribute */
function flag(el: HTMLElement, prop: string, attribute: string): boolean {
  const value = (el as unknown as Record<string, unknown>)[prop];
  return typeof value === "boolean" ? value : el.hasAttribute(attribute);
}

/** Removes the indentation shared by every line, so markdown can be indented to match the markup */
function dedent(text: string) {
  const lines = text.split(/\r?\n/);
  while (lines.length && !lines[0].trim()) lines.shift();
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  const indent = Math.min(...lines.filter((line) => line.trim()).map((line) => line.length - line.trimStart().length));
  return lines.map((line) => line.slice(Number.isFinite(indent) ? indent : 0)).join("\n");
}

/**
 * The content of a message, in order: its text, and any `<script>` markdown or
 * HTML between the text. Scripts are inert, so their contents aren't run.
 */
export function contentOf(el: HTMLElement): { parts: ContentPart[]; text: string } {
  const parts: ContentPart[] = [];
  let buffer = "";
  const flushText = () => {
    const text = buffer.trim();
    if (text) parts.push({ type: "text", text });
    buffer = "";
  };
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      buffer += node.textContent ?? "";
    } else if (node instanceof HTMLScriptElement) {
      const type = node.getAttribute("type");
      if (type === "text/markdown") {
        flushText();
        parts.push({ type: "markdown", source: dedent(node.textContent ?? "") });
      } else if (type === "text/html") {
        flushText();
        parts.push({ type: "html", html: sanitizeHtml(node.textContent ?? "") });
      }
    }
  }
  flushText();
  const text = parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("\n");
  return { parts, text };
}

export function readParticipant(el: HTMLElement): ParticipantModel {
  const muted = flag(el, "muted", "muted");
  const until = read(el, "mutedUntil", "muted-until");
  const mutedUntil = until ? Date.parse(until) : NaN;
  return {
    el,
    id: el.id,
    name: read(el, "name", "name") || el.id,
    avatar: read(el, "avatar", "avatar") || undefined,
    accent: read(el, "accent", "accent") || undefined,
    moderator: flag(el, "moderator", "moderator"),
    muted,
    mutedUntil: muted && !Number.isNaN(mutedUntil) ? mutedUntil : undefined,
    ignored: flag(el, "ignored", "ignored"),
  };
}

/** Reactions are one element each, so the ones with the same emoji are combined, in order of first appearance */
function readReactions(el: HTMLElement): ReactionModel[] {
  const reactions: ReactionModel[] = [];
  for (const child of Array.from(el.children) as HTMLElement[]) {
    if (child.tagName !== "ORB-CHANNEL-REACTION") continue;
    const emoji = read(child, "emoji", "emoji") ?? "";
    const by = read(child, "by", "by") ?? "";
    if (!emoji) continue;
    let reaction = reactions.find((r) => r.emoji === emoji);
    if (!reaction) reactions.push((reaction = { emoji, by: [] }));
    if (by && !reaction.by.includes(by)) reaction.by.push(by);
  }
  return reactions;
}

function readAttachments(el: HTMLElement): AttachmentModel[] {
  return (Array.from(el.children) as HTMLElement[])
    .filter((child) => child.tagName === "ORB-CHANNEL-ATTACHMENT")
    .map((child) => {
      const href = read(child, "href", "href") ?? "";
      return {
        el: child,
        href,
        name: read(child, "name", "name") || href,
        type: read(child, "type", "type") || undefined,
        size: read(child, "size", "size") || undefined,
      };
    });
}

const MODERATIONS: Moderation[] = ["pending", "hidden", "removed"];

export function readMessage(el: HTMLElement): MessageModel {
  const ts = read(el, "ts", "ts") || undefined;
  const time = ts ? Date.parse(ts) : NaN;
  const moderation = read(el, "moderation", "moderation") as Moderation | undefined;
  const { parts, text } = contentOf(el);
  return {
    el,
    id: el.id,
    from: read(el, "from", "from") ?? "",
    ts,
    time: Number.isNaN(time) ? undefined : time,
    status: read(el, "status", "status") || undefined,
    clientId: read(el, "clientId", "client-id") || undefined,
    edited: flag(el, "edited", "edited"),
    text,
    parts,
    pinned: flag(el, "pinned", "pinned"),
    moderation: MODERATIONS.includes(moderation as Moderation) ? moderation : undefined,
    moderationReason: read(el, "moderationReason", "moderation-reason") || undefined,
    replyTo: read(el, "replyTo", "reply-to") || undefined,
    reactions: readReactions(el),
    attachments: readAttachments(el),
  };
}

const DIVIDER_TYPES = ["date", "unread", "custom"] as const;

export function readDivider(el: HTMLElement): DividerModel {
  const type = read(el, "type", "type") as DividerModel["type"];
  const kind = DIVIDER_TYPES.includes(type) ? type : "custom";
  const label = read(el, "label", "label") || read(el, "datetime", "datetime") || (kind === "unread" ? "New messages" : "");
  return { el, type: kind, label };
}

export function readAction(el: HTMLElement): ActionModel {
  const name = read(el, "name", "name") ?? "";
  return {
    name,
    label: read(el, "label", "label") || name,
    icon: el.querySelector(':scope > [slot="icon"]') ?? undefined,
  };
}

export function readComposer(el: HTMLElement): ComposerModel {
  const maxLength = Number((el as unknown as { maxLength?: number }).maxLength ?? el.getAttribute("max-length"));
  const toolbar = read(el, "toolbar", "toolbar");
  return {
    el,
    placeholder: read(el, "placeholder", "placeholder") || undefined,
    label: read(el, "label", "label") || undefined,
    maxLength: Number.isFinite(maxLength) && maxLength > 0 ? maxLength : undefined,
    sendOn: read(el, "sendOn", "send-on") === "mod-enter" ? "mod-enter" : "enter",
    editor: read(el, "editor", "editor") === "rich" ? "rich" : "plain",
    toolbar: toolbar === "always" || toolbar === "none" ? toolbar : "toggle",
    attachments: el.hasAttribute("attachments") ? read(el, "attachments", "attachments") ?? "" : undefined,
    actions: (Array.from(el.children) as HTMLElement[])
      .filter((child) => child.tagName === "ORB-CHANNEL-ACTION")
      .map(readAction),
  };
}

export function readCommand(el: HTMLElement): CommandModel {
  return {
    name: read(el, "name", "name") ?? "",
    description: read(el, "description", "description") || undefined,
    args: read(el, "args", "args") || undefined,
  };
}

const UNITS: Record<string, number> = { ms: 1, s: 1_000, m: 60_000, h: 3_600_000 };

/** A duration such as "5m" or "30s", in milliseconds */
export function parseDuration(value: string): number | undefined {
  const match = /^(\d+(?:\.\d+)?)(ms|s|m|h)$/.exec(value.trim());
  return match ? Number(match[1]) * UNITS[match[2]] : undefined;
}
