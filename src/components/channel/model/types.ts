export interface ActionModel {
  name: string;
  label: string;
  /** The `slot="icon"` child, copied into the button */
  icon?: Element;
}

export interface CommandModel {
  name: string;
  description?: string;
  args?: string;
}

export interface ComposerModel {
  el: HTMLElement;
  placeholder?: string;
  label?: string;
  maxLength?: number;
  sendOn: "enter" | "mod-enter";
  editor: "plain" | "rich";
  toolbar: "always" | "toggle" | "none";
  /** The `accept` list of the attach button, when the composer has `attachments` */
  attachments?: string;
  actions: ActionModel[];
}

export interface ParticipantModel {
  el: HTMLElement;
  id: string;
  name: string;
  avatar?: string;
  accent?: string;
  moderator: boolean;
  muted: boolean;
  /** When the mute ends, in milliseconds. Undefined for a mute with no end. */
  mutedUntil?: number;
  ignored: boolean;
}

export type ContentPart =
  | { type: "text"; text: string }
  | { type: "markdown"; source: string }
  /** HTML that has been sanitized */
  | { type: "html"; html: string };

export interface ReactionModel {
  emoji: string;
  by: string[];
}

export interface AttachmentModel {
  el: HTMLElement;
  href: string;
  name: string;
  type?: string;
  size?: string;
}

export type Moderation = "pending" | "hidden" | "removed";

export interface MessageModel {
  el: HTMLElement;
  id: string;
  from: string;
  ts?: string;
  /** `ts` as milliseconds, or undefined when it doesn't parse */
  time?: number;
  status?: string;
  clientId?: string;
  edited: boolean;
  /** The plain text of the message, from its text children */
  text: string;
  parts: ContentPart[];
  pinned: boolean;
  moderation?: Moderation;
  moderationReason?: string;
  replyTo?: string;
  reactions: ReactionModel[];
  attachments: AttachmentModel[];
}

export interface DividerModel {
  /** Undefined for the dividers the channel adds itself */
  el?: HTMLElement;
  type: "date" | "unread" | "custom";
  label: string;
}

/** A row of the list, in DOM order, with the date and unread dividers placed */
export type Item =
  | { kind: "message"; model: MessageModel; self: boolean; first: boolean; last: boolean }
  | { kind: "divider"; model: DividerModel };

export interface View {
  items: Item[];
  participants: ParticipantModel[];
  composer?: ComposerModel;
  commands: CommandModel[];
}

export interface SendDetail {
  text: string;
  /** `html` for the rich editor, and `text` for the plain one */
  format: "text" | "html";
  /** The HTML of a rich message. Undefined for plain text. */
  html?: string;
  /** The target, such as a thread. Null sends to the channel. */
  to: null;
  composer: HTMLElement | null;
  /** The echoed message, once it's added. Null when `echo` is off or the send was canceled. */
  message: HTMLElement | null;
  /** The ids of the participants mentioned */
  mentions: string[];
  /** The command the message starts with, such as `/summarize`, and its arguments */
  command: { name: string; args: string } | null;
  /** The files attached to the message */
  files: File[];
}
