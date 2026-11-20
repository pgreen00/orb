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
  /** What sending does while an AI message is streaming */
  whileStreaming: "queue" | "block" | "interrupt";
  /** `replies` for the composer of threads, which overrides the main one's settings */
  scope?: "replies";
  /** The `accept` list of the attach button, when the composer has `attachments` */
  attachments?: string;
  actions: ActionModel[];
}

export type ParticipantRole = "human" | "ai" | "bot" | "system";

export type RespondTo = "always" | "mention" | "manual" | "never";

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
  role: ParticipantRole;
  /** The label of an AI participant's badge */
  aiLabel: string;
  /** When an AI participant answers. Undefined means the default for the kind. */
  respondTo?: RespondTo;
  /** Whether they're online, away or offline. Undefined when the app doesn't say. */
  presence?: "online" | "away" | "offline";
  /** Whether they're typing right now */
  typing: boolean;
}

export type ContentPart =
  | { type: "text"; text: string }
  | { type: "markdown"; source: string }
  /** HTML that has been sanitized */
  | { type: "html"; html: string }
  | { type: "reasoning"; el: HTMLElement; state: "thinking" | "done"; label?: string; duration?: string; text: string }
  | {
      type: "tool-call";
      el: HTMLElement;
      callId: string;
      name: string;
      status: string;
      requiresApproval: boolean;
      args?: unknown;
      result?: unknown;
    }
  /** `anchor` is the id of the popover that shows the source */
  | { type: "citation"; el: HTMLElement; anchor: string; index: number; href: string; title: string };

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

export interface VariantsModel {
  el: HTMLElement;
  current: number;
  count: number;
  busy: boolean;
}

export interface MessageModel {
  el: HTMLElement;
  id: string;
  from: string;
  ts?: string;
  /** `ts` as milliseconds, or undefined when it doesn't parse */
  time?: number;
  status?: string;
  /** Why the message failed, shown in place of "Not sent" */
  error?: string;
  /** Whether the message is still being written */
  streaming: boolean;
  clientId?: string;
  edited: boolean;
  /** The plain text of the message, from its text children */
  text: string;
  parts: ContentPart[];
  pinned: boolean;
  moderation?: Moderation;
  moderationReason?: string;
  replyTo?: string;
  /** The id of the message this one is a reply in the thread of */
  thread?: string;
  /** `collapsed` or `resolved`, set by the app on the message a thread starts from */
  threadState?: "collapsed" | "resolved";
  /** The number of replies, when the app knows it. It overrides the count of the replies in the DOM. */
  threadCount?: number;
  /** When the last reply was sent, in milliseconds, when the app says so */
  threadLast?: number;
  /** The message's score, when votes are shown */
  score?: number;
  /** The viewer's own vote on the message */
  vote?: "up" | "down";
  reactions: ReactionModel[];
  attachments: AttachmentModel[];
  variants?: VariantsModel;
}

export interface DividerModel {
  /** Undefined for the dividers the channel adds itself */
  el?: HTMLElement;
  type: "date" | "unread" | "custom";
  label: string;
}

/** A message that starts a thread, with the replies it has in the DOM */
export interface ThreadModel {
  root: MessageModel;
  /** The replies in DOM order, with how deep each one is in the thread. Depth 1 replies to the root. */
  replies: { model: MessageModel; depth: number }[];
  /** The number of replies: the app's `thread-count` when set, else the replies in the DOM */
  count: number;
  /** The time of the last reply, in milliseconds, when known */
  last?: number;
  /** Replies the app says exist but aren't in the DOM yet */
  missing: number;
}

/**
 * A row of the list, in DOM order, with the date and unread dividers placed. A
 * `thread` row is the replies of a message, shown inline under it.
 */
export type Item =
  | { kind: "message"; model: MessageModel; self: boolean; first: boolean; last: boolean; thread?: ThreadModel }
  | { kind: "divider"; model: DividerModel }
  | { kind: "thread"; thread: ThreadModel };

export interface SuggestionModel {
  el: HTMLElement;
  text: string;
  /** Sends the suggestion, rather than filling the composer with it */
  send: boolean;
  /** The `slot="icon"` child, copied into the chip */
  icon?: Element;
}

export interface SuggestionsModel {
  label: string;
  items: SuggestionModel[];
}

export interface View {
  items: Item[];
  participants: ParticipantModel[];
  composer?: ComposerModel;
  commands: CommandModel[];
  /** The suggestions the app offers, shown above the message box */
  suggestions?: SuggestionsModel;
  /** The AI messages still being written */
  streaming: HTMLElement[];
  /** The composer for replies in threads, when the app has one with `scope="replies"` */
  replyComposer?: ComposerModel;
  /** The threads, by the id of the message they start from */
  threads: Map<string, ThreadModel>;
}

export interface SendDetail {
  text: string;
  /** `html` for the rich editor, and `text` for the plain one */
  format: "text" | "html";
  /** The HTML of a rich message. Undefined for plain text. */
  html?: string;
  /** The message a reply is sent to, in its thread. Null sends to the channel. */
  to: HTMLElement | null;
  composer: HTMLElement | null;
  /**
   * The `client-id` of the message. The server's copy should carry it, so the channel
   * can replace the message it shows while sending.
   */
  clientId: string;
  /**
   * The message the channel shows for this send: the echo, or the message that's
   * sending. Null when neither is on, or the send was canceled.
   */
  message: HTMLElement | null;
  /** The ids of the participants mentioned */
  mentions: string[];
  /** The command the message starts with, such as `/summarize`, and its arguments */
  command: { name: string; args: string } | null;
  /** The files attached to the message */
  files: File[];
  /** The ids of the AI participants that should answer this message */
  respondents: string[];
}
