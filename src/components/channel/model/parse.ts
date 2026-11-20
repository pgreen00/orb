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
  ParticipantRole,
  ReactionModel,
  RespondTo,
  SuggestionModel,
  SuggestionsModel,
  VariantsModel,
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

/** A number property of a child element, or else its attribute. NaN when it isn't a number. */
function number(el: HTMLElement, prop: string, attribute: string): number {
  const value = (el as unknown as Record<string, unknown>)[prop];
  return typeof value === "number" ? value : Number(el.getAttribute(attribute));
}

/** A number property of a child element, or else its attribute, or undefined when neither is set to a number */
function optionalNumber(el: HTMLElement, prop: string, attribute: string): number | undefined {
  const value = (el as unknown as Record<string, unknown>)[prop];
  if (typeof value === "number") return value;
  if (!el.hasAttribute(attribute)) return undefined;
  const parsed = Number(el.getAttribute(attribute));
  return Number.isFinite(parsed) ? parsed : undefined;
}

/** Removes the indentation shared by every line, so markdown can be indented to match the markup */
function dedent(text: string) {
  const lines = text.split(/\r?\n/);
  while (lines.length && !lines[0].trim()) lines.shift();
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  const indent = Math.min(...lines.filter((line) => line.trim()).map((line) => line.length - line.trimStart().length));
  return lines.map((line) => line.slice(Number.isFinite(indent) ? indent : 0)).join("\n");
}

/** Citation popovers need an id that stays the same when the message is read again */
const anchors = new WeakMap<Element, string>();
let anchorCount = 0;

function anchorOf(el: Element): string {
  let anchor = anchors.get(el);
  if (!anchor) anchors.set(el, (anchor = `citation-${++anchorCount}`));
  return anchor;
}

/** The data of a `<script>` in a child element, parsed as JSON. The raw text is kept when it isn't JSON. */
function jsonOf(el: HTMLElement, part: "args" | "result"): unknown {
  const script = el.querySelector(`:scope > script[data-part="${part}"]`);
  if (!script) return undefined;
  const text = script.textContent ?? "";
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function readReasoning(el: HTMLElement): ContentPart {
  const state = read(el, "state", "state") === "done" ? "done" : "thinking";
  return {
    type: "reasoning",
    el,
    state,
    label: read(el, "label", "label") || undefined,
    duration: read(el, "duration", "duration") || undefined,
    text: (el.textContent ?? "").trim(),
  };
}

function readToolCall(el: HTMLElement): ContentPart {
  return {
    type: "tool-call",
    el,
    callId: read(el, "callId", "call-id") ?? "",
    name: read(el, "name", "name") ?? "",
    status: read(el, "status", "status") || "running",
    requiresApproval: flag(el, "requiresApproval", "requires-approval"),
    args: jsonOf(el, "args"),
    result: jsonOf(el, "result"),
  };
}

/**
 * The content of a message, in order: its text, its `<script>` markdown or
 * HTML, and its reasoning, tool calls and citations. Scripts are inert, so
 * their contents aren't run.
 */
export function contentOf(el: HTMLElement): { parts: ContentPart[]; text: string } {
  const parts: ContentPart[] = [];
  let buffer = "";
  let citations = 0;
  const flushText = () => {
    if (buffer.trim()) parts.push({ type: "text", text: buffer });
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
    } else if (node instanceof HTMLElement) {
      if (node.tagName === "ORB-CHANNEL-REASONING") {
        flushText();
        parts.push(readReasoning(node));
      } else if (node.tagName === "ORB-CHANNEL-TOOL-CALL") {
        flushText();
        parts.push(readToolCall(node));
      } else if (node.tagName === "ORB-CHANNEL-CITATION") {
        citations++;
        flushText();
        const index = number(node, "index", "index");
        parts.push({
          type: "citation",
          el: node,
          anchor: anchorOf(node),
          index: Number.isFinite(index) && index > 0 ? index : citations,
          href: read(node, "href", "href") ?? "",
          title: read(node, "citationTitle", "title") ?? "",
        });
      }
    }
  }
  flushText();

  // Whitespace is kept between inline parts, such as a citation in the middle of a sentence,
  // and trimmed where a text run meets a block
  parts.forEach((part, index) => {
    if (part.type !== "text") return;
    if (parts[index - 1]?.type !== "citation") part.text = part.text.trimStart();
    if (parts[index + 1]?.type !== "citation") part.text = part.text.trimEnd();
  });

  // Text runs read as one line when only citations separate them, and as separate lines otherwise
  let text = "";
  let breakBefore = false;
  for (const part of parts) {
    if (part.type === "text") {
      if (breakBefore && text) text += "\n";
      text += part.text;
      breakBefore = false;
    } else if (part.type !== "citation") {
      breakBefore = true;
    }
  }
  return { parts: parts.filter((part) => part.type !== "text" || part.text.trim()), text };
}

export function readParticipant(el: HTMLElement): ParticipantModel {
  const muted = flag(el, "muted", "muted");
  const until = read(el, "mutedUntil", "muted-until");
  const mutedUntil = until ? Date.parse(until) : NaN;
  const role = read(el, "role", "role");
  const respondTo = read(el, "respondTo", "respond-to");
  const presence = read(el, "presence", "presence");
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
    role: ROLES.includes(role as ParticipantRole) ? (role as ParticipantRole) : "human",
    aiLabel: read(el, "aiLabel", "ai-label") || "AI",
    respondTo: RESPOND_TO.includes(respondTo as RespondTo) ? (respondTo as RespondTo) : undefined,
    presence: PRESENCES.includes(presence as ParticipantModel["presence"] & string) ? (presence as ParticipantModel["presence"]) : undefined,
    typing: flag(el, "typing", "typing"),
  };
}

const PRESENCES = ["online", "away", "offline"];

const ROLES: ParticipantRole[] = ["human", "ai", "bot", "system"];
const RESPOND_TO: RespondTo[] = ["always", "mention", "manual", "never"];

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

/** The variant switcher in a message, if it has one */
function readVariants(el: HTMLElement): VariantsModel | undefined {
  const switcher = Array.from(el.children).find((child) => child.tagName === "ORB-CHANNEL-VARIANTS") as HTMLElement | undefined;
  if (!switcher) return undefined;
  const count = Math.max(1, Math.floor(number(switcher, "count", "count")) || 1);
  const current = Math.min(count, Math.max(1, Math.floor(number(switcher, "current", "current")) || 1));
  return { el: switcher, current, count, busy: flag(switcher, "busy", "busy") };
}

const MODERATIONS: Moderation[] = ["pending", "hidden", "removed"];
const THREAD_STATES = ["collapsed", "resolved"];

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
    error: read(el, "error", "error") || undefined,
    streaming: flag(el, "streaming", "streaming"),
    clientId: read(el, "clientId", "client-id") || undefined,
    edited: flag(el, "edited", "edited"),
    text,
    parts,
    pinned: flag(el, "pinned", "pinned"),
    moderation: MODERATIONS.includes(moderation as Moderation) ? moderation : undefined,
    moderationReason: read(el, "moderationReason", "moderation-reason") || undefined,
    replyTo: read(el, "replyTo", "reply-to") || undefined,
    thread: read(el, "thread", "thread") || undefined,
    threadState: THREAD_STATES.includes(read(el, "threadState", "thread-state") as "collapsed") ? (read(el, "threadState", "thread-state") as "collapsed") : undefined,
    threadCount: optionalNumber(el, "threadCount", "thread-count"),
    score: optionalNumber(el, "score", "score"),
    vote: read(el, "vote", "vote") === "up" || read(el, "vote", "vote") === "down" ? (read(el, "vote", "vote") as "up" | "down") : undefined,
    threadLast: read(el, "threadLast", "thread-last") ? Date.parse(read(el, "threadLast", "thread-last")!) || undefined : undefined,
    reactions: readReactions(el),
    attachments: readAttachments(el),
    variants: readVariants(el),
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

const WHILE_STREAMING = ["queue", "block", "interrupt"] as const;

export function readComposer(el: HTMLElement): ComposerModel {
  const maxLength = Number((el as unknown as { maxLength?: number }).maxLength ?? el.getAttribute("max-length"));
  const toolbar = read(el, "toolbar", "toolbar");
  const whileStreaming = read(el, "whileStreaming", "while-streaming") as (typeof WHILE_STREAMING)[number];
  return {
    el,
    placeholder: read(el, "placeholder", "placeholder") || undefined,
    label: read(el, "label", "label") || undefined,
    maxLength: Number.isFinite(maxLength) && maxLength > 0 ? maxLength : undefined,
    sendOn: read(el, "sendOn", "send-on") === "mod-enter" ? "mod-enter" : "enter",
    editor: read(el, "editor", "editor") === "rich" ? "rich" : "plain",
    toolbar: toolbar === "always" || toolbar === "none" ? toolbar : "toggle",
    whileStreaming: WHILE_STREAMING.includes(whileStreaming) ? whileStreaming : "block",
    scope: read(el, "scope", "scope") === "replies" ? "replies" : undefined,
    attachments: el.hasAttribute("attachments") ? read(el, "attachments", "attachments") ?? "" : undefined,
    actions: (Array.from(el.children) as HTMLElement[])
      .filter((child) => child.tagName === "ORB-CHANNEL-ACTION")
      .map(readAction),
  };
}

/** The suggestions the app offers, if the channel has an `orb-channel-suggestions` child */
export function readSuggestions(el: HTMLElement): SuggestionsModel {
  const items: SuggestionModel[] = (Array.from(el.children) as HTMLElement[])
    .filter((child) => child.tagName === "ORB-CHANNEL-SUGGESTION")
    .map((child) => ({
      el: child,
      text: (child.textContent ?? "").trim(),
      send: flag(child, "send", "send"),
      icon: child.querySelector(':scope > [slot="icon"]') ?? undefined,
    }))
    .filter((item) => item.text);
  return { label: read(el, "label", "label") || "Suggestions", items };
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
