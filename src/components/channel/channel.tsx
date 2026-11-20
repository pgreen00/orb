import {
  Component,
  Element,
  Event,
  EventEmitter,
  forceUpdate,
  Host,
  Listen,
  Method,
  Prop,
  State,
  Watch,
} from "@stencil/core";
import { adoptChatStyles } from "../../utils/chat-styles";
import { isAccepted } from "../../utils/files";
import { usingKeyboard } from "../../utils/input-modality";
import { CloseIcon } from "../../utils/icons";
import { mentionIds } from "./model/text";
import { markdownHtml } from "./model/content";
import { sentencesOf, spokenTextOf } from "./model/speech";
import { threadsOf } from "./model/threads";
import { parseDuration, readCommand, readComposer, readDivider, readMessage, readParticipant, readSuggestions } from "./model/parse";
import { BUILT_IN, PRESETS, SETTING_NAMES, type SettingName, type Settings } from "./model/settings";
import type {
  CommandModel,
  ComposerModel,
  DividerModel,
  Item,
  MessageModel,
  ParticipantModel,
  SendDetail,
  SuggestionModel,
  SuggestionsModel,
  ThreadModel,
  View,
} from "./model/types";
import { ChannelHeader, type HeaderPresence } from "./render/header";
import { ReplyBox, ThreadSummary } from "./render/thread";
import { ComposerView, mentionItems } from "./render/composer";
import { DividerRow, MessageRow, type RowHandlers } from "./render/message";
import { DEFAULT_ACTIONS, MessageActions } from "./render/tapback";
import { CitationPopover, SuggestionsView, type CitationPart } from "./render/ai";
import { cleanFragment } from "./model/sanitize";
import { declaredTransport, type MessageTransport, type OutgoingMessage } from "./transport";

/** The text that a command typed at the start of a message starts with, such as `/summarize now` */
function commandIn(text: string, commands: CommandModel[]): { name: string; args: string } | null {
  const match = /^\/(\S+)\s*([\s\S]*)$/.exec(text.trim());
  if (!match || !commands.some((command) => command.name === match[1])) return null;
  return { name: match[1], args: match[2].trim() };
}

const dayOf = (time: number) => new Date(time).toDateString();

/** Lists longer than this are drawn only near the viewport, and rows that aren't drawn are spacers */
const WINDOW_ABOVE = 200;
/** The height a row is given until it has been measured */
const ESTIMATE = 72;

/**
 * The attachment of a sent file. Its data is read into a data URL, so the message
 * still shows the file after the composer has released its preview.
 */
function attachmentOf(file: File): HTMLElement {
  const el = document.createElement("orb-channel-attachment");
  el.setAttribute("name", file.name);
  el.setAttribute("type", file.type);
  const reader = new FileReader();
  reader.onload = () => el.setAttribute("href", String(reader.result));
  reader.readAsDataURL(file);
  return el;
}

/** A random id for a sent message. Its server copy carries it as `client-id`. */
const newClientId = () => Math.random().toString(36).slice(2);

/** How many people one request to the participant source asks for */
const PEOPLE_BATCH = 50;

/** The key of a reply, which is its row in a thread */
const replyKey = (model: MessageModel, index: number) => `reply-${model.id || model.clientId || index}`;

const escapeHtml = (text: string) => text.replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]!);

const DAY_LABEL = new Intl.DateTimeFormat(undefined, { dateStyle: "long" });

/** A row before the list's items are made: a message, a divider, or the replies to a message */
type Row =
  | { kind: "message"; model: MessageModel }
  | { kind: "divider"; model: DividerModel }
  | { kind: "thread"; thread: ThreadModel };

/** The thread, when it has replies to show */
const withReplies = (thread: ThreadModel | undefined) => (thread && (thread.count > 0 || thread.replies.length > 0) ? thread : undefined);

/** The composer for replies: the main composer's settings, with the ones the replies composer sets */
function repliesOf(main: ComposerModel, scoped: ComposerModel): ComposerModel {
  const set = (attribute: string) => scoped.el.hasAttribute(attribute);
  return {
    ...main,
    placeholder: set("placeholder") ? scoped.placeholder : main.placeholder,
    label: set("label") ? scoped.label : main.label,
    maxLength: set("max-length") ? scoped.maxLength : main.maxLength,
    sendOn: set("send-on") ? scoped.sendOn : main.sendOn,
  };
}

/** The menu that `/` or `@` opened in the plain editor, and what it'll replace */
interface SuggestMenu {
  kind: "command" | "mention";
  /** The position of the `/` or `@` in the draft */
  start: number;
  items: { id: string; label: string }[];
}

/**
 * A chat interface. It renders the messages, participants, dividers and
 * composer it finds in its light DOM, all in its own shadow root.
 *
 * @slot header-start - Before the title, such as a back button
 * @slot header-title - Replaces the title, description and avatars
 * @slot header-end - After the title, such as call or search buttons
 *
 * @part header - The header
 * @part header-title - The title
 * @part header-description - The line under the title
 * @part header-avatars - The avatars in the header
 * @part list - The scrolling list of messages
 * @part message - A message. Its states are `self`, `first-in-group`, `last-in-group`, `failed`, `pending`, `pinned` and `removed`.
 * @part bubble - The content of a message. It has the same states as `message`.
 * @part avatar - A participant's picture or initial
 * @part name - A participant's name, above their messages
 * @part badge - The moderator badge
 * @part quote - The message a reply quotes
 * @part mention - An `@`-mention of a participant. `mention-self` is the point of view's own name.
 * @part reactions - The reaction buttons under a message
 * @part reaction - A reaction button
 * @part attachments - The files attached to a message
 * @part attachment - A file attached to a message
 * @part status - A message's status, such as "Sending…" or "Pinned"
 * @part retry - The button that sends a failed message again
 * @part time - When a message was sent
 * @part actions - The menu of a message's actions. It opens from a right click, a long press, or the Menu key.
 * @part react - The row of reactions at the top of that menu
 * @part hidden - A hidden or ignored message's notice
 * @part removed - A removed message's notice
 * @part divider - A divider between messages. `unread` is the new messages divider.
 * @part empty - The text shown while there are no messages
 * @part composer - The message box and its buttons
 * @part countdown - The time left in slow mode
 * @part note - A note under the message box, such as why it's off
 * @part action - A button from an `orb-channel-action`
 * @part send - The send button
 * @part stop - The stop button, which replaces the send button while an AI message streams
 * @part suggestions - The suggestions above the message box
 * @part suggestion - A suggestion chip
 * @part reasoning - A model's reasoning, a collapsible block above its answer
 * @part reasoning-text - The text of the reasoning
 * @part tool-call - A tool call, with its arguments and result
 * @part tool-name - The name of a tool call
 * @part tool-status - A tool call's status
 * @part tool-args - A tool call's arguments
 * @part tool-result - A tool call's result
 * @part approval - The approve and deny buttons of a tool call that waits for approval
 * @part cursor - The cursor at the end of a streaming message
 * @part ai-badge - The badge on an AI participant's name
 * @part citation - A citation's number in the text
 * @part citation-popover - The popover of a citation, with its link
 * @part variants - The version switcher of a message
 * @part variants-previous - The switcher's previous version button
 * @part variants-next - The switcher's next version button
 * @part variants-count - The switcher's "2 / 3" count
 */
@Component({
  tag: "orb-channel",
  styleUrl: "channel.css",
  shadow: true,
})
export class Channel {
  @Element() el!: HTMLElement;

  /** The models of messages, reused until their element changes */
  private models = new WeakMap<HTMLElement, MessageModel>();
  /** Messages whose text or attributes changed since the list was last built */
  private dirtyMessages = new Set<HTMLElement>();
  /** Messages the channel added with `echo`, which an app's copy can replace */
  private echoed = new WeakSet<HTMLElement>();
  /** Messages the user has shown anyway, when they're hidden or ignored */
  private revealed = new WeakSet<HTMLElement>();
  /** Messages already reported by `orbRead` */
  private read = new WeakSet<HTMLElement>();
  /** The model element of each rendered row, by its key */
  private rowEls = new Map<string, HTMLElement>();
  private observer = new MutationObserver((records) => this.onMutations(records));
  private reader?: IntersectionObserver;
  private frame?: number;
  private ticker?: ReturnType<typeof setInterval>;
  /** Set while the channel writes to its children, so the changes it causes are ignored */
  private writing = false;
  /** Whether the list is at its bottom, so new messages keep it there */
  private stuck = true;
  /** The settings the channel filled in, rather than the app. Only these are refilled when `kind` or `preset` changes. */
  private filled = new Set<SettingName>();
  private filling = false;
  /** The end of slow mode, in milliseconds since the epoch */
  private slowUntil = 0;
  /** The files the composer will send, and the preview URL of each image */
  private fileUrls = new Map<File, string>();
  private listEl?: HTMLElement;
  private textareaEl?: HTMLTextAreaElement;
  private richEl?: HTMLElement;
  private fileInputEl?: HTMLInputElement;
  private actionsEl?: HTMLOrbPopoverElement;
  private suggestMenuEl?: HTMLOrbMenuElement;
  /** The AI messages that were streaming at the last flush, and how many sentences of each have been spoken */
  private streamingEls = new Set<HTMLElement>();
  private spoken = new WeakMap<HTMLElement, number>();
  /** Whether each thread's inline replies are open, where the reader has changed them from the message's `thread-state` */
  private threadOpen = new WeakMap<HTMLElement, boolean>();
  /** The drafts of the reply boxes, by the message each reply goes to */
  private replyDrafts = new Map<HTMLElement, string>();
  /** The measured height of each row, by its key. Rows not measured yet get `ESTIMATE`. */
  private heights = new Map<string, number>();
  private sizer?: ResizeObserver;
  /** The row to keep at the same place on screen while the list changes above it */
  private rowAnchor?: { key: string; offset: number };
  /** Where the window is drawn for this render, when the anchor row is to be put back in place */
  private pinnedTop?: number;
  /** A message to scroll to once it's drawn, and how */
  private jumpTo?: string;
  private jumpBehavior?: ScrollBehavior;
  /** A row to focus once it's drawn, by its key */
  private focusKey?: string;
  /** The reply box of a message to focus once it's drawn */
  private focusReply?: string;
  /** Whether the channel has drawn once, so the messages it starts with aren't new */
  private loaded = false;
  /** Whether the local user is typing, and the timer that stops it */
  private typingOn = false;
  private typingTimer?: ReturnType<typeof setTimeout>;
  /** The messages in the list when it was left at the bottom, so the new ones can be counted for the pill */
  private awayKeys?: Set<string>;
  private scrollFrame?: number;
  /** Whether `frame` is a timer, from `coalesce`, rather than an animation frame */
  private frameIsTimer = false;
  /** Whether the pointer is over the list */
  private hovering = false;
  /** A row to bring to the top of the list once it's drawn, when a question is sent with `follow=question` */
  private alignKey?: string;
  /** The question brought to the top, whose room below it shrinks as the answer grows */
  private questionKey?: string;
  /** The key of the viewer's last message, to notice a new one */
  private lastOwn?: string;
  /** The last request for more messages, by direction and cursor, so the same one isn't sent twice */
  private requestedKey?: string;
  /** The transport in use, from `transport` or from an `orb-channel-transport` child */
  private connection?: { jsTransport?: MessageTransport; key?: string; transport: MessageTransport; stop: () => void };
  private declaredEl?: HTMLElement;
  private participantSourceEl?: HTMLElement;
  /** Messages still sending, or failed and waiting to be sent again, by client-id */
  private pending = new Map<string, { el: HTMLElement; message: OutgoingMessage }>();
  /** People that messages come from who aren't children of the channel. The ones asked for are kept, so they're asked for once. */
  private wantedPeople = new Set<string>();
  private askedPeople = new Set<string>();
  private askTimer?: ReturnType<typeof setTimeout>;
  /** The key whose saved draft is in the composer */
  private restoredKey?: string;
  /** Whether the list has so many rows that only the ones near the viewport are drawn */
  private windowed = false;
  /** The keys of the rows that the arrow keys move between, in order */
  private navKeys: string[] = [];
  /** A replaceFrom() whose new message is still to be drawn, so the place on screen and the focus can be kept */
  private pendingReplace?: { el: HTMLElement; offset?: number; focus: boolean };
  /** The message whose version the user is switching to, so the new version's switcher gets the focus */
  private switching?: HTMLElement;

  @State() view: View = { items: [], participants: [], commands: [], streaming: [], threads: new Map() };
  /** The key of the message the list's arrow keys start from. Undefined means the newest. */
  @State() activeKey?: string;
  @State() files: File[] = [];
  @State() toolbarShown = false;
  /** The message whose actions menu is open, and the row it's in */
  @State() actionsFor?: { message: HTMLElement; row: HTMLElement };
  /** The message being edited, and its draft */
  @State() editing?: { el: HTMLElement; draft: string };
  @State() suggest?: SuggestMenu;
  /** The time, updated while a countdown is running */
  @State() now = Date.now();
  @State() announcement = "";
  /** What screen readers hear from streaming messages: the sentences as they finish, and version changes */
  @State() speech = "";
  /** Where the list is scrolled to, while it's windowed */
  @State() viewport = { top: 0, height: 0 };
  /** Whether the list has been scrolled away from its bottom, and how many messages arrived since */
  @State() away = false;
  /** Whether messages are below what's on screen. The room a `follow="question"` leaves below a question doesn't count. */
  @State() belowLatest = false;
  private pillEl?: HTMLOrbPopoverElement;
  private pillShown = false;
  @State() newCount = 0;
  /** Whether a send is waiting for the answer to finish. Its draft stays in the box until then. */
  @State() queued = false;

  /**
   * `direct` is a conversation between two people, `group` is a few people,
   * and `open` is a channel with many people. The default is `direct`.
   */
  @Prop() kind?: "direct" | "group" | "open";

  /**
   * A familiar format, such as `comments`. It sets the settings it covers, and
   * the kind when `kind` isn't set. An attribute set on the element wins.
   */
  @Prop() preset?: "assistant" | "workspace" | "comments" | "live";

  /** The id of the participant whose point of view the channel shows. Their messages are `self`. */
  @Prop() pov?: string;

  /** The title in the header, and the accessible name of the list */
  @Prop() label?: string;

  /** The line under the title in the header */
  @Prop() description?: string;

  /** Shows the header. The header's content depends on `kind`. */
  @Prop() showHeader = true;

  /** Text shown while there are no messages */
  @Prop() empty?: string;

  /**
   * Adds each message the composer sends as a message from `pov`, with
   * `status="sent"`. An app's own message with the same `client-id` replaces
   * it. Without `echo`, the app adds sent messages itself. With a `transport`,
   * a sent message is shown while it sends, whether or not `echo` is set.
   */
  @Prop() echo = false;

  /**
   * Sends and receives messages. Each message shows while it sends, and the
   * server's copy replaces it when it has the same `client-id`. The transport's
   * `history` pages older messages in.
   */
  @Prop() transport?: MessageTransport;

  /** Names the channel for its saved drafts, with `drafts="persist"` */
  @Prop({ attribute: "key" }) draftKeyName?: string;

  /**
   * `persist` keeps each draft in `localStorage` under `key`, for the channel's
   * composer and for each thread's reply box. Sending clears the draft.
   */
  @Prop() drafts: "none" | "persist" = "none";

  /** Shows the messages without allowing a new one to be written */
  @Prop({ reflect: true }) readonly = false;

  /** Disables the composer */
  @Prop({ reflect: true }) disabled = false;

  /**
   * Shows each participant's name above their messages. Defaults to on, except
   * in `direct` chats.
   */
  @Prop({ mutable: true }) showNames?: boolean;

  /** Shows each participant's picture beside their messages. Defaults to on, except in `direct` chats. */
  @Prop({ mutable: true }) avatars?: boolean;

  /**
   * Messages from the same sender, closer together than this, are grouped. A
   * duration such as "5m" or "30s". "0" turns grouping off. Defaults to "5m".
   */
  @Prop({ mutable: true }) groupWithin?: string;

  /** Shows a line with the date between messages from different days. Defaults to on. */
  @Prop({ mutable: true }) dateDividers?: boolean;

  /**
   * How long a participant waits between messages, such as "30s". Moderators
   * aren't limited. Off when it isn't set.
   */
  @Prop() slowMode?: string;

  /**
   * The number of messages after the `unread` divider that aren't from the
   * point of view. Set by the channel.
   */
  @Prop({ reflect: true, mutable: true }) unread = 0;

  /**
   * How replies to a message are shown. `none` puts them in the list, `inline`
   * shows them under the message they answer, and `panel` opens them beside the
   * list. Defaults to `panel` for `open` channels, and `none` otherwise.
   */
  @Prop({ mutable: true }) threads?: "none" | "inline" | "panel";

  /** How far a message has been read. `delivered` and `read` show a receipt under the viewer's last message. */
  @Prop({ mutable: true }) receipts?: "none" | "delivered" | "read";

  /** Who's online. `sampled` shows a count and a few avatars, and `full` names them. */
  @Prop({ mutable: true }) presence?: "none" | "sampled" | "full";

  /**
   * How many levels of replies are indented. Replies deeper than this sit at the
   * last level. Above 1, inline replies are nested in the message they answer.
   */
  @Prop({ mutable: true }) maxDepth?: number;

  /** The layout. `bubbles` puts the point of view's messages at the end, `flat` puts every message at the start with no bubble, `assistant` keeps bubbles for the point of view only, and `compact` is one line per message. */
  @Prop({ mutable: true }) layout?: "bubbles" | "flat" | "assistant" | "compact";

  /** Where the list starts. `top` puts the composer above the list, and the list doesn't follow new messages. */
  @Prop({ mutable: true }) anchor?: "bottom" | "top";

  /** Whether sending keeps the list at the newest message. `question` scrolls the viewer's message to the top, so the answer grows below it. */
  @Prop({ mutable: true }) follow?: "bottom" | "question";

  /** Stops following new messages while the pointer is over the list. The pill then says the chat is paused. */
  @Prop({ mutable: true }) pauseOnScroll?: boolean;

  /** Whether new messages are announced. Off, the list is a feed, which doesn't announce each message. */
  @Prop({ mutable: true }) announce?: boolean;

  /** The vote buttons on each message. `up-down` adds a downvote. */
  @Prop({ mutable: true }) votes?: "none" | "up" | "up-down";

  /** The sort options, separated by spaces, such as "top new old". Without them, there's no sort menu. */
  @Prop({ mutable: true }) sorts?: string;

  /** How updates are batched, such as "250ms". "0" draws each frame. */
  @Prop({ mutable: true }) coalesce?: string;

  /** The sort in use, one of `sorts`. Choosing one emits `orbSortChange`, and the app reorders the messages. */
  @Prop({ reflect: true, mutable: true }) sort?: string;

  /** Shows the pill that jumps to the newest message, when the list is above its bottom */
  @Prop() jumpToLatest = true;

  /**
   * What scrolls the messages. `list` gives the list its own scrollbar, within the
   * channel's height. `document` lets the page scroll instead: the channel is as tall
   * as its messages, and the composer stays at the bottom of the screen.
   */
  @Prop({ reflect: true }) scrollTarget: "list" | "document" = "list";

  /**
   * The message actions, in order, separated by spaces. The names are `react`,
   * `reply`, `copy`, `copy-link`, `edit`, `delete`, `pin`, `regenerate` and
   * `report`. Without it, the menu has the usual ones.
   */
  @Prop() actions?: string;

  /** The address of a message's link, with `{id}` for its id, such as "/posts/42#{id}". Without it, the page's address is used. */
  @Prop() permalink?: string;

  /** The id of the message whose thread is open in the panel. The channel sets it when a thread opens or closes. */
  @Prop({ reflect: true, mutable: true }) openThread?: string;

  /** Set by the app while older messages load. The list shows a loading row at its top. */
  @Prop({ reflect: true, mutable: true }) loadingMore = false;

  /**
   * How model reasoning shows. `collapsed` is a closed block, `show` opens it,
   * and `hidden` leaves it out.
   */
  @Prop() reasoning: "show" | "collapsed" | "hidden" = "collapsed";

  /** Emitted when a message is sent from the composer. Cancel it to keep the draft. */
  @Event({ cancelable: true }) orbSend: EventEmitter<SendDetail>;

  /**
   * Emitted when the viewer asks to send a failed message again. With a transport,
   * the channel sends it again unless this is canceled. Without one, the app does.
   */
  @Event({ cancelable: true }) orbRetry: EventEmitter<{ message: HTMLElement }>;

  /** Emitted when a button from an `orb-channel-action` is clicked */
  @Event() orbAction: EventEmitter<{ name: string; composer: HTMLElement }>;

  /** Emitted when a reaction is chosen. `on` is whether the point of view is reacting, or taking the reaction back. The channel doesn't change the reaction itself. */
  @Event({ cancelable: true }) orbReact: EventEmitter<{ message: HTMLElement; emoji: string; on: boolean }>;

  /** Emitted when the user asks to edit a message. Cancel it to take over the editing, and the channel's editor isn't shown. */
  @Event({ cancelable: true }) orbEdit: EventEmitter<{ message: HTMLElement; text: string }>;

  /** Emitted when an edit is saved. Cancel it to keep the editor open, such as when the server refuses the change. */
  @Event({ cancelable: true }) orbEditCommit: EventEmitter<{ message: HTMLElement; text: string }>;

  /** Emitted when the user asks to delete a message. The app removes it. */
  @Event({ cancelable: true }) orbDelete: EventEmitter<{ message: HTMLElement }>;

  /** Emitted when the user chooses Reply on a message. The app sets `reply-to` on its own message. */
  @Event() orbReply: EventEmitter<{ message: HTMLElement }>;

  /** Emitted when the user reports a message */
  @Event() orbReport: EventEmitter<{ message: HTMLElement }>;

  /** Emitted when a moderator uses a moderation button, such as "hide", "remove", "pin" or "mute" */
  @Event({ cancelable: true }) orbModerate: EventEmitter<{
    action: "pin" | "unpin" | "hide" | "remove" | "mute";
    message: HTMLElement;
    participant: HTMLElement | null;
  }>;

  /** Emitted when a message has been seen: at least half of it is in the list */
  @Event() orbRead: EventEmitter<{ message: HTMLElement }>;

  /**
   * Emitted when the user stops a streaming AI message. The channel doesn't stop
   * the model: the app does. Cancel it to keep the answer going.
   */
  @Event({ cancelable: true }) orbStop: EventEmitter<{ messages: HTMLElement[] }>;

  /**
   * Emitted when the user approves or denies a tool call. The channel doesn't run
   * the tool. The app does, and sets the call's `status`. Cancel it to take over.
   */
  @Event({ cancelable: true }) orbToolDecision: EventEmitter<{ toolCall: HTMLElement; callId: string; approved: boolean }>;

  /**
   * Emitted when the user asks for another version of a message. The app fetches
   * that version and shows it with `replaceFrom()`.
   */
  @Event() orbVariantChange: EventEmitter<{ message: HTMLElement; current: number }>;

  /**
   * Emitted when the user asks for another answer to an AI message. The app asks
   * its model, and shows the new answer with `replaceFrom()`. Cancel it to take over.
   */
  @Event({ cancelable: true }) orbRegenerate: EventEmitter<{ message: HTMLElement }>;

  /** Emitted when a thread opens in the panel. Cancel it to keep the thread closed. */
  @Event({ cancelable: true }) orbThreadOpen: EventEmitter<{ parent: HTMLElement }>;

  /** Emitted when the panel's thread closes. Cancel it to keep the thread open. */
  @Event({ cancelable: true }) orbThreadClose: EventEmitter<{ parent: HTMLElement }>;

  /**
   * Emitted when older messages are wanted, as the list is scrolled to its top,
   * with the id of the oldest message as `cursor`. It's also emitted with the
   * `parent` message, when the "View more replies" button of a thread is used.
   * Set `loading-more` while the app loads them.
   */
  @Event({ cancelable: true }) orbLoadMore: EventEmitter<{ direction?: "before" | "after"; cursor?: string; parent?: HTMLElement }>;

  /** Emitted when a message's pin is chosen. The app sets `pinned` on the message. Cancel it to leave the message as it is. */
  @Event({ cancelable: true }) orbPin: EventEmitter<{ message: HTMLElement; pinned: boolean }>;

  /** Emitted when a vote button is used. `value` is `none` when the vote is taken back. The app sets `score` and `vote`. */
  @Event({ cancelable: true }) orbVote: EventEmitter<{ message: HTMLElement; value: "up" | "down" | "none" }>;

  /** Emitted when a sort is chosen. The app reorders the messages, since DOM order is the order. Cancel it to keep the sort. */
  @Event({ cancelable: true }) orbSortChange: EventEmitter<{ sort: string }>;

  /** Emitted when the local user starts or stops typing. It stops after a few seconds without a keystroke, and when a message is sent. */
  @Event() orbTyping: EventEmitter<{ typing: boolean }>;

  connectedCallback() {
    this.observer.observe(this.el, { childList: true, subtree: true, characterData: true });
    this.scheduleFlush();
  }

  disconnectedCallback() {
    this.observer.disconnect();
    this.reader?.disconnect();
    this.sizer?.disconnect();
    clearTimeout(this.typingTimer);
    this.connection?.stop();
    this.connection = undefined;
    clearTimeout(this.askTimer);
    this.askTimer = undefined;
    if (this.scrollFrame !== undefined) cancelAnimationFrame(this.scrollFrame);
    if (this.frame !== undefined) {
      if (this.frameIsTimer) clearTimeout(this.frame);
      else cancelAnimationFrame(this.frame);
    }
    this.frame = undefined;
    this.stopTicker();
    for (const url of this.fileUrls.values()) URL.revokeObjectURL(url);
    this.fileUrls.clear();
  }

  componentWillLoad() {
    this.fillSettings();
    // A top-anchored list starts at its top, and doesn't follow the newest message
    this.stuck = this.anchor !== "top";
    // The first render already has the children, so methods such as focusComposer() find their elements
    this.flush();
  }

  componentDidLoad() {
    this.loaded = true;
    adoptChatStyles(this.el.shadowRoot!);
    this.createReader();
    this.sizer = new ResizeObserver(() => this.onSized());
    this.scheduleFlush();
    this.jumpToHash();
  }

  private get documentScroll(): boolean {
    return this.scrollTarget === "document";
  }

  private scroller(): HTMLElement {
    return (document.scrollingElement as HTMLElement | null) ?? document.documentElement;
  }

  /** The offset, in the list's own coordinates, of the top of what's on screen */
  private viewTop(): number {
    const list = this.listEl;
    if (!list) return 0;
    return this.documentScroll ? -list.getBoundingClientRect().top : list.scrollTop;
  }

  /** The height of what's on screen: the list's, or the window's when the page scrolls */
  private viewHeight(): number {
    if (this.documentScroll) return window.innerHeight;
    return this.listEl?.clientHeight ?? 0;
  }

  /** The top of what's on screen in the viewport, which is the list's top unless the page scrolls */
  private viewRectTop(): number {
    if (this.documentScroll) return 0;
    return this.listEl?.getBoundingClientRect().top ?? 0;
  }

  /** The top of an element in the list's content, wherever the list and the page are scrolled */
  private contentTop(el: HTMLElement): number {
    const list = this.listEl!;
    return el.getBoundingClientRect().top - list.getBoundingClientRect().top + (this.documentScroll ? 0 : list.scrollTop);
  }

  /** The furthest the top of what's on screen can go, in the list's coordinates */
  private maxViewTop(): number {
    const list = this.listEl!;
    if (!this.documentScroll) return list.scrollHeight - list.clientHeight;
    const page = this.scroller();
    return this.viewTop() + page.scrollHeight - page.clientHeight - page.scrollTop;
  }

  /** Scrolls the list, or the page, by a distance */
  private scrollListBy(delta: number) {
    if (!delta || !this.listEl) return;

    if (this.documentScroll) this.scroller().scrollTop += delta;
    else this.listEl.scrollTop += delta;
  }

  /** Scrolls so the content at an offset in the list is at the top of what's on screen */
  private scrollListTo(offset: number) {
    this.scrollListBy(offset - this.viewTop());
  }

  /** How far the bottom of the channel is below the bottom of what's on screen. Zero or less when it's all in view. */
  private distanceFromBottom(): number {
    if (this.documentScroll) return this.el.getBoundingClientRect().bottom - window.innerHeight;
    const list = this.listEl!;
    return list.scrollHeight - list.scrollTop - list.clientHeight;
  }

  private setPillEl(el: HTMLOrbPopoverElement | null) {
    this.pillEl = el ?? undefined;
    if (!el) this.pillShown = false;
  }

  /**
   * Opens the jump pill while messages are below the screen, and closes it when they're not. It's a popover,
   * so it takes no room in the layout, and it follows the bottom of the visible part of the list.
   */
  private syncPill() {
    const pill = this.pillEl;
    if (!pill || !this.listEl) return;
    const wanted = this.away && this.belowLatest;
    if (wanted && !this.pillShown) {
      this.pillShown = true;
      void pill.show(this.pillAnchor());
    } else if (!wanted && this.pillShown) {
      this.pillShown = false;
      void pill.hide();
    }
  }

  /** A point at the bottom of the visible part of the list, which the pill sits above */
  private pillAnchor(): { getBoundingClientRect(): DOMRect; contextElement: Element } {
    const list = this.listEl!;
    return {
      contextElement: list,
      getBoundingClientRect: () => {
        const rect = list.getBoundingClientRect();
        const composerHeight = this.documentScroll ? (this.el.shadowRoot?.querySelector<HTMLElement>(".composer")?.offsetHeight ?? 0) : 0;
        const bottom = Math.min(rect.bottom, window.innerHeight - composerHeight) - 16;
        return new DOMRect(rect.left + rect.width / 2, bottom, 0, 0);
      },
    };
  }

  /** The room below the messages, which `follow="question"` adds, so a question can scroll to the top */
  private roomAtEnd(): number {
    return parseFloat(this.listEl?.style.paddingBlockEnd ?? "") || 0;
  }

  private updateBelowLatest() {
    this.belowLatest = this.distanceFromBottom() - this.roomAtEnd() >= 16;
  }

  /** The start of the list is on screen, or nearly */
  private nearTop(): boolean {
    if (!this.documentScroll) return (this.listEl?.scrollTop ?? 0) < 80;
    const top = this.listEl?.getBoundingClientRect().top ?? 0;
    return top > -80 && top < window.innerHeight;
  }

  /** The end of the list is on screen, or nearly */
  private nearBottom(): boolean {
    if (!this.documentScroll) {
      const list = this.listEl!;
      return list.scrollHeight - list.scrollTop - list.clientHeight < 80;
    }
    const bottom = this.listEl?.getBoundingClientRect().bottom ?? 0;
    return bottom > 0 && bottom < window.innerHeight + 80;
  }

  /** What's on screen, in the list's coordinates. Windowing draws the rows near it. */
  private visibleArea(): { top: number; height: number } {
    return { top: Math.max(0, this.viewTop()), height: this.viewHeight() };
  }

  /** The page's scroll, when the page scrolls the messages. The list then has no scroll of its own. */
  @Listen("scroll", { target: "window" })
  onWindowScroll() {

    if (this.documentScroll) this.onListScroll();
  }

  /**
   * Records the row at the top of the list, so the list can keep it in place when
   * rows above it change. Not while the list is moving to a row itself.
   */
  componentWillRender() {

    this.rowAnchor = undefined;
    this.pinnedTop = undefined;
    const list = this.listEl;
    if (!list || this.stuck || this.jumpTo || this.focusKey || this.focusReply || this.alignKey) return;
    const top = this.viewRectTop();
    const row = Array.from(list.querySelectorAll<HTMLElement>("[data-key]")).find((el) => el.getBoundingClientRect().bottom > top);
    if (!row) return;
    const anchor = { key: row.dataset.key!, offset: row.getBoundingClientRect().top - top };
    this.rowAnchor = anchor;
    // The window is drawn where the anchor row will be, so the row is there to be put back in place
    const index = this.view.items.findIndex((item, i) => this.keyOf(item, i) === anchor.key);
    if (index >= 0) this.pinnedTop = Math.max(0, this.offsetOf(index) - anchor.offset);
  }

  /**
   * Sets the list's bottom padding to the room a row needs to scroll to the top, and returns the
   * row's offset in the list. The room shrinks as the content below the row grows.
   */
  private roomBelow(row: HTMLElement): number {
    const list = this.listEl!;
    const top = this.contentTop(row);
    // Padding doesn't always add its full height to scrollHeight, so the room is measured again after each pass
    // With the page scrolling, what's below the list, such as the composer, is part of the page's height too
    const below = this.documentScroll ? this.el.getBoundingClientRect().bottom - list.getBoundingClientRect().bottom : 0;
    for (let pass = 0; pass < 3; pass++) {
      const content = list.scrollHeight - (parseFloat(list.style.paddingBlockEnd) || 0);
      list.style.paddingBlockEnd = `${Math.max(0, top + this.viewHeight() - content - below)}px`;
      if (this.maxViewTop() >= top) break;
    }
    return top;
  }

  componentDidRender() {

    const list = this.listEl;
    if (list && this.rowAnchor) {
      const row = list.querySelector<HTMLElement>(`[data-key="${CSS.escape(this.rowAnchor.key)}"]`);

      if (row) this.scrollListBy(row.getBoundingClientRect().top - this.viewRectTop() - this.rowAnchor.offset);
      this.rowAnchor = undefined;
    }
    if (list && this.pinnedTop !== undefined) {
      this.pinnedTop = undefined;
      const area = this.visibleArea();
      if (Math.abs(this.viewport.top - area.top) > 1) this.viewport = area;
    }
    // A sent message is brought to the top, when following questions
    if (this.alignKey && list) {
      const row = this.rowByKey(this.alignKey);
      if (row) {
        this.questionKey = this.alignKey;
        this.alignKey = undefined;
        this.scrollListTo(this.roomBelow(row));
      } else {
        const index = this.indexOfKey(this.alignKey);
        if (index >= 0) this.showIndex(index);
        else this.alignKey = undefined;
      }
    } else if (this.questionKey && list) {
      const row = this.rowByKey(this.questionKey);
      if (row) this.roomBelow(row);
      else this.questionKey = undefined;
    }
    // The list follows the newest message, unless it's top-anchored or the pointer is over a paused list
    if (this.stuck && !this.questionKey && this.anchor !== "top" && !(this.pauseOnScroll && this.hovering) && list) this.scrollListBy(Math.max(0, this.distanceFromBottom()));
    this.placeReplaced();
    this.placeFocus();
    this.measure();
    this.updateBelowLatest();
    this.syncPill();
    if (this.reader && list) {
      for (const row of Array.from(list.querySelectorAll<HTMLElement>('[role="article"]'))) this.reader.observe(row);
    }
  }

  @Listen("hashchange", { target: "window" })
  onHashChange() {
    this.jumpToHash();
  }

  @Watch("kind")
  @Watch("preset")
  onSourceChange() {
    this.fillSettings();
    this.scheduleFlush();
  }

  /** An app's own value is kept, so it's no longer refilled when `kind` or `preset` changes */
  @Watch("showNames")
  @Watch("avatars")
  @Watch("groupWithin")
  @Watch("dateDividers")
  @Watch("threads")
  @Watch("receipts")
  @Watch("presence")
  @Watch("layout")
  @Watch("anchor")
  @Watch("follow")
  @Watch("pauseOnScroll")
  @Watch("announce")
  @Watch("votes")
  @Watch("sorts")
  @Watch("maxDepth")
  @Watch("coalesce")
  onSettingChange(_value: unknown, _previous: unknown, name: string) {
    if (!this.filling) this.filled.delete(name as SettingName);
    this.scheduleFlush();
  }

  @Watch("scrollTarget")
  onScrollTargetChange() {
    if (this.reader) this.createReader();
    this.scheduleFlush();
  }

  /** Watches which rows are on screen, for read tracking. With the page scrolling, the viewport is the root. */
  private createReader() {
    this.reader?.disconnect();
    this.reader = new IntersectionObserver((entries) => this.onVisible(entries), {
      root: this.documentScroll ? null : this.listEl,
      threshold: 0.5,
    });
  }

  @Watch("transport")
  onTransportChange() {
    this.scheduleFlush();
  }

  @Watch("draftKeyName")
  onKeyChange() {
    this.restoredKey = undefined;
    this.scheduleFlush();
  }

  @Watch("pov")
  @Watch("slowMode")
  onPovChange() {
    this.scheduleFlush();
  }

  @Listen("orbChannelDataChange")
  onChildChange(event: Event) {
    if (this.writing) return;
    const owner = (event.target as HTMLElement).closest<HTMLElement>("orb-channel-message");
    if (owner?.parentElement === this.el) this.dirtyMessages.add(owner);
    this.scheduleFlush();
  }

  /** The plain editor's keys: Enter sends, and the open menu takes its own keys */
  private onComposerKeyDown = (event: KeyboardEvent) => {
    const composer = this.view.composer;
    if (!composer || event.isComposing) return;
    if (this.suggest && ["ArrowUp", "ArrowDown", "Enter", "Tab", "Escape"].includes(event.key)) {
      if (event.key === "Escape") this.closeSuggest();
      return;
    }
    if (event.key !== "Enter") return;
    const mod = event.ctrlKey || event.metaKey;
    const sends = composer.sendOn === "mod-enter" ? mod : !event.shiftKey && !mod;
    if (!sends) return;
    event.preventDefault();
    this.sendPlain(composer);
  };

  private onDraftInput = (text: string) => {
    const composer = this.view.composer;
    if (!composer) return;
    this.setDraft(composer, text);
    this.updateSuggest(text);
    this.setTyping(text.trim() !== "");
  };

  /** Emits `orbTyping` when the local user starts typing, and when they stop, after a few seconds without a keystroke */
  private setTyping(on: boolean) {
    clearTimeout(this.typingTimer);
    if (on) {
      if (!this.typingOn) {
        this.typingOn = true;
        this.orbTyping.emit({ typing: true });
      }
      this.typingTimer = setTimeout(() => this.setTyping(false), 3000);
    } else if (this.typingOn) {
      this.typingOn = false;
      this.orbTyping.emit({ typing: false });
    }
  }

  private onListScroll = () => {
    this.checkStuck();
    if (this.windowed && this.scrollFrame === undefined) {
      this.scrollFrame = requestAnimationFrame(() => {
        this.scrollFrame = undefined;
        this.viewport = this.visibleArea();
      });
    }
    this.askForMore();
  };

  /**
   * Works out whether the list is at its bottom. Leaving the bottom starts
   * counting the messages that arrive, for the pill.
   */
  private checkStuck() {
    const list = this.listEl;
    if (!list) return;
    // A question held at the top isn't followed: answers grow below it, and the list stays where it is
    this.stuck = !this.questionKey && this.distanceFromBottom() < 16;
    this.awayKeys = this.stuck ? undefined : (this.awayKeys ?? new Set(this.messageKeys()));
    this.away = !this.stuck;
    this.updateBelowLatest();
    if (this.stuck) this.newCount = 0;
  }

  /** The pointer entered or left the list. With pause-on-scroll, the messages that arrive while it's over the list are counted, and don't move it. */
  private onHover(over: boolean) {
    this.hovering = over;
    if (!over) this.checkStuck();
    else if (this.pauseOnScroll && this.stuck && this.anchor !== "top") this.awayKeys ??= new Set(this.messageKeys());
  }

  /**
   * Asks the app for more messages: older ones near the top, and with
   * `anchor=top`, newer ones near the bottom. Each request is sent once.
   */
  private askForMore() {
    const list = this.listEl;
    if (!list) return;
    const ids = this.view.items.flatMap((item) => (item.kind === "message" && item.model.id ? [item.model.id] : []));
    if (this.anchor === "top") {
      const cursor = ids[ids.length - 1];
      const near = this.nearBottom();
      if (near && cursor && !this.loadingMore && this.requestedKey !== `after:${cursor}`) {
        this.requestedKey = `after:${cursor}`;
        this.orbLoadMore.emit({ direction: "after", cursor });
      }
    } else {
      const cursor = ids[0];
      if (this.nearTop() && cursor && !this.loadingMore && this.requestedKey !== `before:${cursor}`) {
        this.requestedKey = `before:${cursor}`;
        if (!this.orbLoadMore.emit({ direction: "before", cursor }).defaultPrevented) void this.loadHistory(cursor);
      }
    }
  }

  /** The arrow keys move between messages. Home and End go to the first and the last. */
  private onListKeyDown = (event: KeyboardEvent) => {
    if ((event.target as HTMLElement).tagName === "TEXTAREA") return;
    const current = (event.target as HTMLElement).closest<HTMLElement>('[role="article"]');
    if (current && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
      event.preventDefault();
      this.moveAcross(current, event.key === "ArrowRight");
      return;
    }
    const keys = this.navKeys;
    const index = current ? keys.indexOf(current.dataset.key ?? "") : -1;
    if (index < 0) return;
    const moves: Record<string, number> = { ArrowUp: index - 1, ArrowDown: index + 1, Home: 0, End: keys.length - 1 };
    const target = moves[event.key];
    if (target === undefined) return;
    event.preventDefault();
    const key = keys[Math.min(Math.max(target, 0), keys.length - 1)];
    this.activeKey = key;
    this.focusRow(key);
  };

  /** Writes the channel's own settings onto the element, for the ones the app hasn't set */
  private fillSettings() {
    const preset = this.preset ? PRESETS[this.preset] : undefined;
    const builtIn = BUILT_IN[this.resolvedKind];
    const fields = this as unknown as Record<SettingName, Settings[SettingName]>;
    this.filling = true;
    for (const name of SETTING_NAMES) {
      if (fields[name] != null && !this.filled.has(name)) continue;
      fields[name] = (preset?.[name] ?? builtIn[name]) as never;
      this.filled.add(name);
    }
    this.filling = false;
  }

  /** The kind in use: the element's own, else the preset's, else `direct` */
  private get resolvedKind(): "direct" | "group" | "open" {
    return this.kind ?? (this.preset ? PRESETS[this.preset].kind : undefined) ?? "direct";
  }

  private onMutations(records: MutationRecord[]) {
    for (const record of records) {
      // A changed text node's message is its parent
      const target = record.target;
      const node = target.nodeType === Node.ELEMENT_NODE ? (target as Element) : target.parentElement;
      const message = node?.closest<HTMLElement>("orb-channel-message");
      if (message?.parentElement === this.el) this.dirtyMessages.add(message);
    }
    this.scheduleFlush();
  }

  /** Reads the children soon. With `coalesce`, the read waits for that time, so bursts of updates are one read. */
  private scheduleFlush() {
    if (this.frame !== undefined) return;
    const wait = parseDuration(this.coalesce ?? "") ?? 0;
    this.frameIsTimer = wait > 0;
    this.frame = wait > 0 ? window.setTimeout(() => this.flush(), wait) : requestAnimationFrame(() => this.flush());
  }

  /** Reads the children into the view. Only messages that changed are read again. */
  private flush() {
    this.frame = undefined;
    this.frameIsTimer = false;
    const dirty = this.dirtyMessages;
    this.dirtyMessages = new Set();

    const participants: ParticipantModel[] = [];
    const rows: Row[] = [];
    let composer: ComposerModel | undefined;
    let scoped: ComposerModel | undefined;
    let commands: CommandModel[] = [];
    let suggestions: SuggestionsModel | undefined;
    let declared: HTMLElement | undefined;
    let source: HTMLElement | undefined;
    for (const child of Array.from(this.el.children) as HTMLElement[]) {
      if (child.tagName === "ORB-CHANNEL-MESSAGE") {
        let model = this.models.get(child);
        if (!model || dirty.has(child)) {
          model = readMessage(child);
          this.models.set(child, model);
        }
        rows.push({ kind: "message", model });
      } else if (child.tagName === "ORB-CHANNEL-DIVIDER") {
        rows.push({ kind: "divider", model: readDivider(child) });
      } else if (child.tagName === "ORB-CHANNEL-SUGGESTIONS") {
        suggestions = readSuggestions(child);
      } else if (child.tagName === "ORB-CHANNEL-TRANSPORT") {
        declared = child;
      } else if (child.tagName === "ORB-CHANNEL-PARTICIPANT-SOURCE") {
        source = child;
      } else if (child.tagName === "ORB-CHANNEL-PARTICIPANT") {
        participants.push(readParticipant(child));
      } else if (child.tagName === "ORB-CHANNEL-COMPOSER") {
        const model = readComposer(child);
        if (model.scope === "replies") {
          scoped ??= model;
        } else if (!composer) {
          composer = model;
          commands = (Array.from(child.children) as HTMLElement[])
            .filter((el) => el.tagName === "ORB-CHANNEL-COMMAND")
            .map(readCommand);
        }
      }
    }

    // A later message with the same id replaces the earlier one
    const dropped = new Set<HTMLElement>();
    const byId = new Map<string, HTMLElement>();
    for (const row of rows) {
      if (row.kind !== "message" || !row.model.id) continue;
      const previous = byId.get(row.model.id);
      if (previous) {
        console.warn(`orb-channel: more than one message has the id "${row.model.id}". The later one is shown.`);
        dropped.add(previous);
      }
      byId.set(row.model.id, row.model.el);
    }

    // An app's message with the same client-id as an echoed one replaces it
    const byClientId = new Map<string, MessageModel[]>();
    for (const row of rows) {
      if (row.kind !== "message" || !row.model.clientId) continue;
      byClientId.set(row.model.clientId, [...(byClientId.get(row.model.clientId) ?? []), row.model]);
    }
    for (const group of byClientId.values()) {
      if (group.length < 2) continue;
      for (const model of group) {
        if (!this.echoed.has(model.el)) continue;
        model.el.remove();
        dropped.add(model.el);
      }
    }

    const kept = rows.filter((row) => !(row.kind === "message" && dropped.has(row.model.el)));
    // With threads shown, the list has the messages that aren't replies. The replies go under the messages they answer.
    const messages = kept.flatMap((row) => (row.kind === "message" ? [row.model] : []));
    const { roots, threads } =
      this.threads === "none" ? { roots: messages, threads: new Map<string, ThreadModel>() } : threadsOf(messages);
    const listed = new Set(roots);
    const visible = kept.filter((row) => row.kind !== "message" || listed.has(row.model));
    const windowMs = parseDuration(this.groupWithin ?? "") ?? 0;
    const grouped = (a: MessageModel, b: MessageModel) =>
      windowMs > 0 &&
      a.from === b.from &&
      (a.time === undefined || b.time === undefined || Math.abs(b.time - a.time) <= windowMs);

    // Date dividers go in where the day changes
    const ordered: Row[] = [];
    let lastDay: string | undefined;
    for (const row of visible) {
      if (row.kind === "message" && this.dateDividers && row.model.time !== undefined) {
        const day = dayOf(row.model.time);
        if (day !== lastDay) {
          ordered.push({ kind: "divider", model: { type: "date", label: DAY_LABEL.format(new Date(row.model.time)) } });
          lastDay = day;
        }
      }
      ordered.push(row);
      const thread = row.kind === "message" && row.model.id ? withReplies(threads.get(row.model.id)) : undefined;
      // Nested replies belong to their message's item, so the message and its replies are one row
      if (thread && !this.nested) ordered.push({ kind: "thread", thread });
    }

    const items: Item[] = ordered.map((row, index): Item => {
      if (row.kind === "divider") return { kind: "divider", model: row.model };
      if (row.kind === "thread") return { kind: "thread", thread: row.thread };
      const before = ordered[index - 1];
      const after = ordered[index + 1];
      const previous = before?.kind === "message" ? before.model : undefined;
      const next = after?.kind === "message" ? after.model : undefined;
      return {
        kind: "message",
        model: row.model,
        self: !!this.pov && row.model.from === this.pov,
        first: !(previous && grouped(previous, row.model)),
        last: !(next && grouped(row.model, next)),
        thread: this.nested && row.model.id ? withReplies(threads.get(row.model.id)) : undefined,
      };
    });

    // The messages after the unread divider that aren't the point of view's
    const unreadAt = items.findIndex((item) => item.kind === "divider" && item.model.type === "unread");
    this.unread =
      unreadAt < 0
        ? 0
        : items.slice(unreadAt + 1).filter((item) => item.kind === "message" && !item.self).length;

    const aiStreaming = items.flatMap((item) =>
      item.kind === "message" && item.model.streaming && participants.find((p) => p.id === item.model.from)?.role === "ai"
        ? [item.model.el]
        : [],
    );
    // A queued send goes once the answer has finished
    if (this.view.streaming.length && !aiStreaming.length && this.queued) {
      this.queued = false;
      requestAnimationFrame(() => void this.sendQueued());
    }
    this.speak(items);
    // A new message from the viewer, with follow=question, is brought to the top of the list
    let own = -1;
    items.forEach((item, index) => {
      if (item.kind === "message" && item.self) own = index;
    });
    const ownKey = own >= 0 ? this.keyOf(items[own], own) : undefined;
    if (this.loaded && ownKey && ownKey !== this.lastOwn && this.follow === "question") {
      this.alignKey = ownKey;
      this.stuck = false;
    }
    this.lastOwn = ownKey;

    const replyComposer = composer && scoped ? repliesOf(composer, scoped) : composer;
    this.view = { items, participants, composer, commands, suggestions, streaming: aiStreaming, replyComposer, threads };
    this.declaredEl = declared;
    this.participantSourceEl = source;
    this.connectTransport();
    this.requestPeople(items, participants);
    this.restoreDraft(composer);
    // The pill counts the messages that came in after the list was left at its bottom
    // Only the messages after the last one seen are new. Older ones loaded above don't count.
    const away = this.awayKeys;
    if (away) {
      const keys = this.messageKeys();
      const seen = keys.reduce((last, key, i) => (away.has(key) ? i : last), -1);
      this.newCount = keys.length - seen - 1;
    }
  }

  /** A message's key, which keeps its row when the list changes */
  private keyOf(item: Item, index: number): string {
    if (item.kind === "divider") return `divider-${index}`;
    if (item.kind === "thread") return `thread-${item.thread.root.id}`;
    return item.model.id || item.model.clientId || `message-${index}`;
  }

  /** The header's title, description and avatars, by `kind` */
  private headerOf(participants: ParticipantModel[]) {
    const count = `${participants.length} member${participants.length === 1 ? "" : "s"}`;
    if (this.resolvedKind === "direct") {
      const other = participants.find((p) => p.id !== this.pov) ?? participants[0];
      return { title: this.label || other?.name || "", description: this.description, avatars: other ? [other] : [] };
    }
    if (this.resolvedKind === "group") {
      return {
        title: this.label || participants.map((p) => p.name).join(", "),
        description: this.description || count,
        avatars: participants.slice(0, 3),
      };
    }
    return { title: this.label || "", description: this.description || count, avatars: [] };
  }

  private get povParticipant(): ParticipantModel | undefined {
    return this.view.participants.find((p) => p.id === this.pov);
  }

  /** Whether the point of view is muted right now */
  private get povMuted(): boolean {
    const pov = this.povParticipant;
    return !!pov?.muted && (pov.mutedUntil === undefined || this.now < pov.mutedUntil);
  }

  private get povModerator(): boolean {
    return !!this.povParticipant?.moderator;
  }

  /** Whether slow mode is holding back the point of view's next message */
  private get slowed(): boolean {
    return this.now < this.slowUntil && !this.povModerator;
  }

  /** The keys of the messages in the list, in order */
  private messageKeys(): string[] {
    return this.view.items.flatMap((item, index) => (item.kind === "message" ? [this.keyOf(item, index)] : []));
  }

  /** The gap between rows, which the list sets in its CSS */
  /** Whether replies are nested in their message, which is when `max-depth` is above 1 with inline threads */
  private get nested(): boolean {
    return this.threads === "inline" && (this.maxDepth ?? 1) > 1;
  }

  private gapPx(): number {
    return this.listEl ? parseFloat(getComputedStyle(this.listEl).rowGap) || 0 : 8;
  }

  /** The height a row takes, with the gap after it */
  private sizeOf(key: string): number {
    return (this.heights.get(key) ?? ESTIMATE) + this.gapPx();
  }

  /**
   * The rows to draw. A long list draws only the rows near its viewport, and the
   * rows before and after them are spacers of the height they'd take.
   */
  private windowOf(keys: string[]): { start: number; end: number; before: number; after: number } {
    const count = keys.length;
    if (!this.windowed) return { start: 0, end: count, before: 0, after: 0 };
    const sizes = keys.map((key) => this.sizeOf(key));
    const total = sizes.reduce((sum, size) => sum + size, 0);
    const height = Math.max(this.viewHeight(), this.viewport.height, 600);
    const top = this.pinnedTop ?? (this.stuck ? Math.max(0, total - height) : this.viewport.top);
    // One viewport is drawn above the top, and a viewport and a bit below it
    const from = top - height;
    const to = top + height * 2;
    let start = 0;
    let offset = 0;
    while (start < count - 1 && offset + sizes[start] <= from) offset += sizes[start++];
    let end = start;
    let y = offset;
    while (end < count && y < to) y += sizes[end++];
    return { start, end, before: offset, after: total - y };
  }

  /** Records the height of each drawn row, and watches it, so a row that changes size is measured again */
  private measure() {
    const list = this.listEl;
    if (!list) return;
    this.sizer?.disconnect();
    for (const el of Array.from(list.querySelectorAll<HTMLElement>("[data-key]"))) {
      this.heights.set(el.dataset.key!, el.getBoundingClientRect().height);
      this.sizer?.observe(el);
    }
  }

  /** A row changed size. The list is drawn again when a height changed, so its spacers stay right. */
  private onSized() {
    const list = this.listEl;
    if (!list) return;
    let changed = false;
    for (const el of Array.from(list.querySelectorAll<HTMLElement>("[data-key]"))) {
      const key = el.dataset.key!;
      const height = el.getBoundingClientRect().height;
      if (Math.abs((this.heights.get(key) ?? -1) - height) > 0.5) {
        this.heights.set(key, height);
        changed = true;
      }
    }
    if (changed) forceUpdate(this.el);
  }

  /** The row with a key, when it's drawn */
  private rowByKey(key: string): HTMLElement | null {
    return this.listEl?.querySelector<HTMLElement>(`[data-key="${CSS.escape(key)}"]`) ?? null;
  }

  /** The index of the item that holds a row: a message or a divider, or the thread that holds a reply */
  private indexOfKey(key: string): number {
    return this.view.items.findIndex((item, index) => {
      if (this.keyOf(item, index) === key) return true;
      const thread = item.kind === "thread" ? item.thread : item.kind === "message" ? item.thread : undefined;
      return !!thread && thread.replies.some((reply, i) => replyKey(reply.model, i) === key);
    });
  }

  /**
   * Left and right, with inline threads: a reply goes left to its message, and a
   * message's thread opens to the right and closes to the left. Right on an open
   * thread moves to its first reply.
   */
  private moveAcross(row: HTMLElement, right: boolean) {
    const id = row.dataset.id;
    const parent = [...this.view.threads.values()].find((thread) => thread.replies.some((reply) => reply.model.id === id));
    if (parent) {
      if (!right) this.focusRow(parent.root.id);
      return;
    }
    const thread = id ? this.view.threads.get(id) : undefined;
    if (!thread || this.threads !== "inline") return;
    const open = this.inlineOpen(thread.root.el);
    if (right && !open) {
      this.threadOpen.set(thread.root.el, true);
      forceUpdate(this.el);
    } else if (right && thread.replies.length) {
      this.focusRow(replyKey(thread.replies[0].model, 0));
    } else if (!right && open) {
      this.threadOpen.set(thread.root.el, false);
      forceUpdate(this.el);
    }
  }

  /** The offset of the item at an index from the top of the list, by the heights measured so far */
  private offsetOf(index: number): number {
    return this.view.items.slice(0, index).reduce((sum, item, i) => sum + this.sizeOf(this.keyOf(item, i)), 0);
  }

  /** Moves the list so the item at an index is at its top, and draws the rows there */
  private showIndex(index: number) {
    const list = this.listEl;
    const offset = this.offsetOf(index);
    if (list) {
      this.stuck = false;
      this.scrollListTo(offset);
    }
    this.viewport = { top: offset, height: this.viewHeight() };
  }

  /** Focuses a row. When it isn't drawn, the list moves to it first. */
  private focusRow(key: string) {
    const row = this.rowByKey(key);
    if (row) {
      row.focus();
      return;
    }
    this.focusKey = key;
    const index = this.indexOfKey(key);
    if (index >= 0) this.showIndex(index);
  }

  /** Moves focus, and scrolls to the message that was asked for, once they're drawn. Each is tried once. */
  private placeFocus() {
    const root = this.el.shadowRoot;
    if (!root) return;
    if (this.jumpTo) {
      const target = root.querySelector<HTMLElement>(`[role="article"][data-id="${CSS.escape(this.jumpTo)}"]`);
      const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
      target?.scrollIntoView({ block: "center", behavior: this.jumpBehavior ?? (reduced ? "auto" : "smooth") });
      // The list has moved away from its bottom, so it doesn't follow again before the scroll event says so
      this.stuck = false;
      this.jumpTo = undefined;
      this.jumpBehavior = undefined;
    }
    if (this.focusKey) {
      this.rowByKey(this.focusKey)?.focus();
      this.focusKey = undefined;
    }
    if (this.focusReply) {
      const id = CSS.escape(this.focusReply);
      root.querySelector<HTMLTextAreaElement>(`.thread-panel textarea[data-reply-for="${id}"], textarea[data-reply-for="${id}"]`)?.focus();
      this.focusReply = undefined;
    }
  }

  /** Where a message is in the list, and its thread when it's a reply. Undefined when the message isn't in the list. */
  private locate(id: string): { index: number; thread?: ThreadModel } | undefined {
    const items = this.view.items;
    const top = items.findIndex((item) => item.kind === "message" && item.model.id === id);
    if (top >= 0) return { index: top };
    for (const thread of this.view.threads.values()) {
      if (!thread.replies.some((reply) => reply.model.id === id)) continue;
      const index = items.findIndex((item) => item.kind === "message" && item.model.id === thread.root.id);
      return index < 0 ? undefined : { index, thread };
    }
    return undefined;
  }

  /** Whether a thread's inline replies are open: as the reader left them, else unless the message's thread is collapsed or resolved */
  private inlineOpen(parent: HTMLElement): boolean {
    const set = this.threadOpen.get(parent);
    if (set !== undefined) return set;
    return this.models.get(parent)?.threadState === undefined;
  }

  private toggleInline(parent: HTMLElement) {
    this.threadOpen.set(parent, !this.inlineOpen(parent));
    forceUpdate(this.el);
  }

  /** Opens a message's thread in the panel, unless orbThreadOpen is canceled */
  private openPanel(parent: HTMLElement) {
    if (!parent.id) return;
    if (this.openThread === parent.id) {
      this.focusReply = parent.id;
      forceUpdate(this.el);
      return;
    }
    if (this.orbThreadOpen.emit({ parent }).defaultPrevented) return;
    this.openThread = parent.id;
    this.focusReply = parent.id;
  }

  /** Closes the panel, unless orbThreadClose is canceled. Focus goes back to the message the thread starts from. */
  private closePanel() {
    const id = this.openThread;
    if (!id) return;
    const parent = Array.from(this.el.children).find((child): child is HTMLElement => child.id === id);
    if (parent && this.orbThreadClose.emit({ parent }).defaultPrevented) return;
    this.openThread = undefined;
    this.focusKey = id;
  }

  /** Reply opens the thread when threads are shown. Without them, the app quotes the message, as it does for orbReply. */
  private reply(message: HTMLElement) {
    if (this.threads === "none") {
      this.orbReply.emit({ message });
    } else if (this.threads === "inline") {
      this.threadOpen.set(message, true);
      this.focusReply = message.id;
      forceUpdate(this.el);
    } else {
      this.openPanel(message);
    }
  }

  /** Sends a reply from its box, to the message its thread starts from */
  private sendReply(parent: HTMLElement) {
    const composer = this.view.replyComposer;
    const text = (this.replyDrafts.get(parent) ?? "").trim();
    if (!composer || !text || this.disabled || this.readonly || this.povMuted || this.slowed) return;
    if (!this.dispatchSend(text, { format: "text", composer: composer.el, to: parent })) return;
    this.replyDrafts.delete(parent);
    if (parent.id) this.saveDraft("", parent.id);
    forceUpdate(this.el);
  }

  /** The receipt under a message the viewer sent, as far as `receipts` shows */
  private receiptOf(model: MessageModel): string | undefined {
    if (!this.receipts || this.receipts === "none") return undefined;
    if (model.status === "read" && this.receipts === "read") return "Read";
    return model.status === "read" || model.status === "delivered" ? "Delivered" : undefined;
  }

  /** The line for the people who are typing, other than the viewer */
  private typingLine(participants: ParticipantModel[]): string | undefined {
    const names = participants.filter((p) => p.typing && p.id !== this.pov).map((p) => p.name);
    if (names.length === 0) return undefined;
    if (names.length === 1) return `${names[0]} is typing…`;
    if (names.length === 2) return `${names[0]} and ${names[1]} are typing…`;
    return "Several people are typing…";
  }

  /** Who's online, for the header, as `presence` shows it */
  private presenceOf(participants: ParticipantModel[]): HeaderPresence | undefined {
    if (!this.presence || this.presence === "none") return undefined;
    return {
      mode: this.presence,
      online: participants.filter((p) => p.presence === "online"),
      away: participants.filter((p) => p.presence === "away"),
      total: participants.length,
    };
  }

  /** Scrolls to the newest message, and follows new ones again */
  private scrollToBottom() {
    const list = this.listEl;
    if (!list) return;
    this.stuck = true;
    this.questionKey = undefined;
    this.awayKeys = undefined;
    this.away = false;
    this.newCount = 0;
    this.scrollListBy(Math.max(0, this.distanceFromBottom()));
    this.viewport = this.visibleArea();
  }

  /** Scrolls to the message the URL's hash names, such as #m100, when this channel has it */
  private jumpToHash() {
    const id = decodeURIComponent(location.hash.slice(1));
    if (id) void this.scrollToMessage(id);
  }

  /** The actions the message menu lists, in order */
  private actionNames(): string[] {
    return this.actions ? this.actions.split(/\s+/).filter(Boolean) : DEFAULT_ACTIONS;
  }

  /** The sort options, from `sorts` */
  private get sortOptions(): string[] {
    return (this.sorts ?? "").split(/\s+/).filter(Boolean);
  }

  /** Chooses a sort. The app reorders the messages, unless the event is canceled. */
  private chooseSort(value: string) {
    if (this.orbSortChange.emit({ sort: value }).defaultPrevented) return;
    this.sort = value;
  }

  /** The link to a message: the page's address with its id, or the `permalink` with `{id}` filled in */
  private linkTo(id: string): string {
    if (this.permalink) return new URL(this.permalink.replace("{id}", id), location.href).href;
    return `${location.href.split("#")[0]}#${id}`;
  }

  private startTicker() {
    if (this.ticker !== undefined) return;
    this.ticker = setInterval(() => {
      this.now = Date.now();
      if (this.slowUntil > 0 && this.now >= this.slowUntil) {
        this.slowUntil = 0;
        this.announcement = "You can send again.";
      }
      if (!this.slowed && !this.povMuted) this.stopTicker();
    }, 1000);
  }

  private stopTicker() {
    if (this.ticker === undefined) return;
    clearInterval(this.ticker);
    this.ticker = undefined;
  }

  private setDraft(composer: ComposerModel, value: string) {
    this.writing = true;
    (composer.el as unknown as { value: string }).value = value;
    this.writing = false;
    if (composer.el === this.view.composer?.el) this.saveDraft(value);
    forceUpdate(this.el);
  }

  private draftOf(composer: ComposerModel): string {
    return (composer.el as unknown as { value?: string }).value ?? "";
  }

  /** Opens the menu of commands or mentions for a `/` or `@` at the caret, and closes it otherwise */
  private updateSuggest(text: string) {
    const caret = this.textareaEl?.selectionStart ?? text.length;
    const before = text.slice(0, caret);
    const command = /^\/(\S*)$/.exec(before);
    const mention = /(^|\s)@([^\s@]*)$/.exec(before);
    let suggest: SuggestMenu | undefined;
    if (command) {
      const wanted = command[1].toLowerCase();
      const items = this.view.commands
        .filter((c) => c.name.toLowerCase().includes(wanted))
        .map((c) => ({ id: c.name, label: `/${c.name}` }));
      if (items.length) suggest = { kind: "command", start: 0, items };
    } else if (mention) {
      const items = mentionItems(this.view.participants, mention[2]);
      if (items.length) suggest = { kind: "mention", start: before.length - mention[2].length - 1, items };
    }
    if (!suggest) {
      this.closeSuggest();
      return;
    }
    this.suggest = suggest;
    this.suggestMenuEl?.show(this.textareaEl!);
  }

  private closeSuggest() {
    if (!this.suggest) return;
    this.suggest = undefined;
    this.suggestMenuEl?.hide();
  }

  /** Puts the chosen command or mention where the `/` or `@` was */
  private chooseSuggest(id: string) {
    const suggest = this.suggest;
    const composer = this.view.composer;
    const textarea = this.textareaEl;
    if (!suggest || !composer || !textarea) return;
    const item = suggest.items.find((i) => i.id === id);
    if (!item) return;
    const caret = textarea.selectionStart;
    const insert = suggest.kind === "command" ? `/${id} ` : `@${item.label} `;
    const text = this.draftOf(composer);
    const next = text.slice(0, suggest.start) + insert + text.slice(caret);
    this.closeSuggest();
    this.setDraft(composer, next);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(suggest.start + insert.length, suggest.start + insert.length);
    });
  }

  private sendPlain(composer: ComposerModel) {
    if (this.disabled || this.readonly || this.povMuted || this.slowed) return;
    const text = this.draftOf(composer).trim();
    if (!text && this.files.length === 0) return;
    if (!this.gateSend(composer)) return;
    if (!this.dispatchSend(text, { format: "text", html: undefined, composer: composer.el })) return;
    this.setDraft(composer, "");
  }

  private sendRich(event: CustomEvent<{ html: string; text: string }>) {
    const composer = this.view.composer;
    if (!composer || this.disabled || this.readonly || this.povMuted || this.slowed || !this.gateSend(composer)) {
      event.preventDefault();
      return;
    }
    const { html, text } = event.detail;
    const sent = this.dispatchSend(text.trim(), { format: "html", html, composer: composer.el });
    if (!sent) event.preventDefault();
  }

  /**
   * Emits `orbSend`, and echoes the message when `echo` is set. Returns false
   * when the send was canceled.
   */
  private dispatchSend(
    text: string,
    options: { format: "text" | "html"; html?: string; composer: HTMLElement | null; to?: HTMLElement },
  ): boolean {
    const participants = this.view.participants;
    const mentions =
      options.format === "html"
        ? Array.from(new DOMParser().parseFromString(options.html ?? "", "text/html").querySelectorAll("[data-mention]"), (el) =>
            el.getAttribute("data-mention")!,
          )
        : mentionIds(text, participants);
    const detail: SendDetail = {
      text,
      format: options.format,
      html: options.html,
      to: options.to ?? null,
      composer: options.composer,
      clientId: newClientId(),
      message: null,
      mentions,
      command: commandIn(text, this.view.commands),
      files: [...this.files],
      respondents: this.respondentsFor(mentions),
    };
    if (this.orbSend.emit(detail).defaultPrevented) return false;
    if (this.activeTransport()) detail.message = this.sendWithTransport(detail, options.to);
    else if (this.echo) detail.message = this.echoMessage(text, options.to, detail.clientId, detail.files);
    this.afterSend();
    return true;
  }

  private afterSend() {
    this.setTyping(false);
    for (const file of this.files) this.releaseUrl(file);
    this.files = [];
    if (parseDuration(this.slowMode ?? "") && !this.povModerator) {
      const ms = parseDuration(this.slowMode!)!;
      this.slowUntil = Date.now() + ms;
      this.announcement = `Slow mode is on. You can send again in ${Math.round(ms / 1000)} seconds.`;
      this.now = Date.now();
      this.startTicker();
    }
  }

  private echoMessage(text: string, to: HTMLElement | undefined, clientId: string, files: File[], status = "sent"): HTMLElement {
    const el = document.createElement("orb-channel-message");
    el.setAttribute("from", this.pov ?? "");
    el.setAttribute("client-id", clientId);
    el.setAttribute("status", status);
    if (to?.id) el.setAttribute("thread", to.id);
    el.textContent = text;
    for (const file of files) el.append(attachmentOf(file));
    this.echoed.add(el);
    this.el.append(el);
    return el;
  }

  /** With a transport, a sent message shows as sending until the transport has it */
  private sendWithTransport(detail: SendDetail, to?: HTMLElement): HTMLElement {
    const el = this.echoMessage(detail.text, to, detail.clientId, detail.files, "sending");
    this.pending.set(detail.clientId, {
      el,
      message: {
        clientId: detail.clientId,
        from: this.pov ?? "",
        text: detail.text,
        format: detail.format,
        html: detail.html,
        thread: to?.id || undefined,
        mentions: detail.mentions,
        command: detail.command,
        respondents: detail.respondents,
        files: detail.files,
      },
    });
    void this.deliver(detail.clientId);
    return el;
  }

  /** Hands a pending message to the transport. A failure is shown on the message, which can be sent again. */
  private async deliver(clientId: string) {
    const entry = this.pending.get(clientId);
    const transport = this.activeTransport();
    if (!entry || !transport) return;
    this.setStatus(entry.el, "sending");
    try {
      await transport.send(entry.message);
      this.pending.delete(clientId);
      this.setStatus(entry.el, "sent");
    } catch (error) {
      if (!entry.el.isConnected) this.pending.delete(clientId);
      this.setStatus(entry.el, "failed", error instanceof Error ? error.message : "Not sent");
    }
  }

  /** The Retry button of a failed message. The channel sends it again unless `orbRetry` is canceled. */
  private retry(el: HTMLElement) {
    if (this.orbRetry.emit({ message: el }).defaultPrevented) return;
    const clientId = this.models.get(el)?.clientId;
    if (clientId) void this.deliver(clientId);
  }

  private setStatus(el: HTMLElement, status: string, error?: string) {
    if (!el.isConnected) return;
    el.setAttribute("status", status);
    if (error) el.setAttribute("error", error);
    else el.removeAttribute("error");
  }

  private activeTransport(): MessageTransport | undefined {
    return this.connection?.transport;
  }

  /** Connects to the transport, and reconnects when it changes, or when the child that describes it does */
  private connectTransport() {
    const declared = this.transport ? undefined : this.declaredEl;
    const key = declared ? ["type", "src", "action", "interval"].map((name) => declared.getAttribute(name) ?? "").join("|") : undefined;
    const current = this.connection;
    if (current && current.jsTransport === this.transport && current.key === key) return;
    current?.stop();
    this.connection = undefined;
    const transport = this.transport ?? (declared ? declaredTransport(declared) : undefined);
    if (!transport) return;
    const stop = transport.subscribe({ receive: (html) => this.receive(html) });
    this.connection = { jsTransport: this.transport, key, transport, stop };
  }

  /**
   * Shows the elements of an HTML fragment. One whose id is already shown replaces
   * it. The others go at the end, or before the first message for older messages.
   */
  private receive(html: string, where: "start" | "end" = "end") {
    const template = document.createElement("template");
    template.innerHTML = html;
    cleanFragment(template.content);
    for (const incoming of Array.from(template.content.children) as HTMLElement[]) {
      const shown = incoming.id
        ? (Array.from(this.el.children) as HTMLElement[]).find((child) => child.id === incoming.id && child.tagName === incoming.tagName)
        : undefined;
      if (shown) shown.replaceWith(incoming);
      else if (where === "start") this.el.insertBefore(incoming, this.el.querySelector(":scope > orb-channel-message, :scope > orb-channel-divider"));
      else this.el.append(incoming);
    }
  }

  /** Asks the transport for the messages before `cursor`. An empty answer means there are none. */
  private async loadHistory(cursor: string) {
    const transport = this.activeTransport();
    if (!transport?.history) return;
    this.loadingMore = true;
    try {
      this.receive(await transport.history(cursor), "start");
    } catch (error) {
      this.requestedKey = undefined;
      console.warn("orb-channel: loading older messages failed", error);
    } finally {
      this.loadingMore = false;
    }
  }

  /** Asks the participant source for the people who send messages and aren't children yet. Each one is asked for once. */
  private requestPeople(items: Item[], participants: ParticipantModel[]) {
    if (!this.participantSourceEl) return;
    const known = new Set(participants.map((p) => p.id));
    for (const item of items) {
      const senders =
        item.kind === "message"
          ? [item.model.from, ...(item.thread?.replies.map((reply) => reply.model.from) ?? [])]
          : item.kind === "thread"
            ? item.thread.replies.map((reply) => reply.model.from)
            : [];
      for (const id of senders) {
        if (!id || known.has(id) || this.askedPeople.has(id)) continue;
        this.askedPeople.add(id);
        this.wantedPeople.add(id);
      }
    }
    if (this.wantedPeople.size && this.askTimer === undefined) this.askTimer = setTimeout(() => void this.fetchPeople(), 0);
  }

  private async fetchPeople() {
    this.askTimer = undefined;
    const ids = [...this.wantedPeople];
    this.wantedPeople.clear();
    const href = this.participantSourceEl?.getAttribute("href");
    if (!href) return;
    for (let start = 0; start < ids.length; start += PEOPLE_BATCH) {
      const batch = ids.slice(start, start + PEOPLE_BATCH);
      try {
        const response = await fetch(href.replace("{ids}", batch.map(encodeURIComponent).join(",")));
        if (!response.ok) throw new Error(`The server answered ${response.status}`);
        this.receive(await response.text());
      } catch (error) {
        for (const id of batch) this.askedPeople.delete(id);
        console.warn(`orb-channel: could not load ${batch.join(", ")}`, error);
      }
    }
  }

  private persistsDrafts(): boolean {
    return this.drafts === "persist" && !!this.draftKeyName;
  }

  /** The storage key of a draft: the channel's composer, or a thread's reply box by its message's id */
  private draftKey(thread?: string): string {
    return `orb-channel-draft:${this.draftKeyName}${thread ? `:${thread}` : ""}`;
  }

  /** Storage can be blocked or full. Then the draft lives only in the page. */
  private savedDraft(thread?: string): string {
    if (!this.persistsDrafts()) return "";
    try {
      return localStorage.getItem(this.draftKey(thread)) ?? "";
    } catch {
      return "";
    }
  }

  private saveDraft(text: string, thread?: string) {
    if (!this.persistsDrafts()) return;
    try {
      if (text) localStorage.setItem(this.draftKey(thread), text);
      else localStorage.removeItem(this.draftKey(thread));
    } catch {
      // Storage is blocked or full, so the draft is kept only in the page
    }
  }

  /** Puts the saved draft in the composer, once for each key */
  private restoreDraft(composer?: ComposerModel) {
    if (!composer || !this.persistsDrafts() || this.restoredKey === this.draftKeyName) return;
    this.restoredKey = this.draftKeyName;
    this.setDraft(composer, this.savedDraft());
  }

  private releaseUrl(file: File) {
    const url = this.fileUrls.get(file);
    if (url) URL.revokeObjectURL(url);
    this.fileUrls.delete(file);
  }

  private addFiles(incoming: FileList | File[]) {
    const accept = this.view.composer?.attachments;
    if (accept === undefined) return;
    const accepted = Array.from(incoming).filter((file) => isAccepted(file, accept));
    if (!accepted.length) return;
    for (const file of accepted) {
      if (file.type.startsWith("image/")) this.fileUrls.set(file, URL.createObjectURL(file));
    }
    this.files = [...this.files, ...accepted];
  }

  private removeFile(index: number) {
    const file = this.files[index];
    if (!file) return;
    this.releaseUrl(file);
    this.files = this.files.filter((_, i) => i !== index);
  }

  /** Emits `orbSend`, from a button or `send()` */
  private onSendClick(composer: ComposerModel) {
    if (composer.editor === "rich") void (this.richEl as unknown as { submit(): Promise<void> } | undefined)?.submit();
    else this.sendPlain(composer);
  }

  /** Sends text as a message, through the same path as the composer. The draft is left as it is. */
  /**
   * Sends text as a message, through the same path as the composer. The draft is
   * left as it is. While an AI message streams, only a composer set to
   * `interrupt` sends, and it stops the answer first.
   */
  @Method()
  async send(text: string): Promise<void> {
    if (this.disabled || this.readonly || this.povMuted || this.slowed || !text.trim()) return;
    if (this.view.streaming.length && (this.view.composer?.whileStreaming !== "interrupt" || !this.stopStreams())) return;
    this.dispatchSend(text.trim(), { format: "text", composer: this.view.composer?.el ?? null });
  }

  /**
   * Scrolls a message into view and moves the list's focus to it. A reply opens
   * its thread first, and a message that isn't drawn is brought into the list.
   */
  @Method()
  async scrollToMessage(id: string, options?: { behavior?: ScrollBehavior }): Promise<void> {
    const found = this.locate(id);
    if (!found) return;
    if (found.thread) {
      if (this.threads === "panel") this.openThread = found.thread.root.id;
      else this.threadOpen.set(found.thread.root.el, true);
    }
    this.jumpTo = id;
    this.jumpBehavior = options?.behavior;
    if (this.windowed && (!found.thread || this.threads === "inline")) this.showIndex(found.index);
    forceUpdate(this.el);
  }

  /** Moves the keyboard focus to the message box */
  @Method()
  async focusComposer(): Promise<void> {
    (this.richEl ?? this.textareaEl)?.focus();
  }

  /**
   * Replaces a message with new content. The message and every message and
   * divider after it are removed, and the content goes where the message was. The
   * content can be an HTML string, an element or a fragment. After a switch from
   * `orbVariantChange`, the place on screen is kept and focus moves to the new
   * version's switcher.
   */
  @Method()
  async replaceFrom(message: HTMLElement, content: string | Node): Promise<void> {
    if (message.parentElement !== this.el) return;
    const fragment = document.createDocumentFragment();
    if (typeof content === "string") {
      const template = document.createElement("template");
      template.innerHTML = content;
      fragment.append(template.content);
    } else {
      fragment.append(content);
    }
    const first = fragment.firstElementChild as HTMLElement | null;
    const switching = this.switching === message;
    this.switching = undefined;
    const offset = this.listEl && !this.stuck ? message.getBoundingClientRect().top - this.viewRectTop() : undefined;
    const removed: Element[] = [message];
    for (let next = message.nextElementSibling; next; next = next.nextElementSibling) {
      if (next.tagName === "ORB-CHANNEL-MESSAGE" || next.tagName === "ORB-CHANNEL-DIVIDER") removed.push(next);
    }
    this.el.insertBefore(fragment, message);
    for (const el of removed) el.remove();
    if (first?.tagName === "ORB-CHANNEL-MESSAGE") {
      this.pendingReplace = { el: first, offset, focus: switching };
      const version = first.querySelector(":scope > orb-channel-variants");
      if (switching && version) this.speech = `Version ${version.getAttribute("current")} of ${version.getAttribute("count")}`;
    }
  }

  /** Keeps the place of a replaced message on screen, and moves focus to its switcher, once the new message is drawn */
  private placeReplaced() {
    const pending = this.pendingReplace;
    const list = this.listEl;
    if (!pending || !list) return;
    const row = this.rowOf(pending.el);
    if (!row) return;
    this.pendingReplace = undefined;
    if (pending.offset !== undefined) {
      this.scrollListBy(row.getBoundingClientRect().top - this.viewRectTop() - pending.offset);
    }
    if (pending.focus) {
      const buttons = Array.from(row.querySelectorAll<HTMLElement & { disabled?: boolean }>('[part~="variants-next"], [part~="variants-previous"]'));
      (buttons.find((button) => !button.disabled) ?? buttons[0])?.focus();
    }
  }

  /** The row of the list that shows a message */
  private rowOf(message: HTMLElement): HTMLElement | undefined {
    for (const [key, el] of this.rowEls) {
      if (el === message) return this.listEl?.querySelector<HTMLElement>(`[data-key="${CSS.escape(key)}"]`) ?? undefined;
    }
    return undefined;
  }

  /** Fills the message box with a suggestion, or sends it when the suggestion sends */
  private async useSuggestion(item: SuggestionModel) {
    const composer = this.view.composer;
    if (!composer) return;
    if (item.send) {
      if (this.disabled || this.readonly || this.povMuted || this.slowed) return;
      if (this.view.streaming.length && (composer.whileStreaming !== "interrupt" || !this.stopStreams())) return;
      this.dispatchSend(item.text, { format: "text", composer: composer.el });
    } else if (composer.editor === "rich") {
      await (this.richEl as unknown as { setContent(html: string): Promise<void> } | undefined)?.setContent(`<p>${escapeHtml(item.text)}</p>`);
      this.richEl?.focus();
    } else {
      this.setDraft(composer, item.text);
      this.textareaEl?.focus();
    }
  }

  /**
   * Applies `while-streaming` to a send made while an AI message streams. `block`
   * refuses it, `queue` holds the draft until the answer finishes, and `interrupt`
   * stops the answer first. Returns whether the send goes ahead now.
   */
  private gateSend(composer: ComposerModel): boolean {
    if (!this.view.streaming.length) return true;
    if (composer.whileStreaming === "interrupt") return this.stopStreams();
    if (composer.whileStreaming === "queue") this.queued = !this.queued;
    return false;
  }

  /** Emits `orbStop` for the streaming AI messages. Returns false when the stop was canceled. */
  private stopStreams(): boolean {
    return !this.orbStop.emit({ messages: [...this.view.streaming] }).defaultPrevented;
  }

  /** Sends the draft that was queued while the answer streamed, if it's still there */
  private async sendQueued() {
    const composer = this.view.composer;
    if (!composer) return;
    const hasText =
      composer.editor === "rich"
        ? !!(await (this.richEl as unknown as { getText(): Promise<string> } | undefined)?.getText())?.trim()
        : !!this.draftOf(composer).trim();
    if (hasText) this.onSendClick(composer);
  }

  /** The AI participants that should answer a message from the point of view, by their `respond-to` */
  private respondentsFor(mentions: string[]): string[] {
    return this.view.participants
      .filter((p) => {
        if (p.role !== "ai" || p.id === this.pov) return false;
        const rule = p.respondTo ?? (this.resolvedKind === "direct" ? "always" : "mention");
        return rule === "always" || (rule === "mention" && mentions.includes(p.id));
      })
      .map((p) => p.id);
  }

  /**
   * Works out what screen readers hear from streaming messages: each sentence as
   * it finishes, and the rest of a message when it ends. Only new sentences are
   * spoken, since the status region holds the latest.
   */
  private speak(items: Item[]) {
    const now = new Set<HTMLElement>();
    let heard = "";
    for (const item of items) {
      if (item.kind !== "message" || !item.model.streaming) continue;
      const el = item.model.el;
      now.add(el);
      const { done } = sentencesOf(spokenTextOf(item.model.parts));
      const said = this.spoken.get(el) ?? 0;
      if (done.length > said) heard += `${done.slice(said).join(" ")} `;
      this.spoken.set(el, done.length);
    }
    for (const el of this.streamingEls) {
      if (now.has(el)) continue;
      const model = this.models.get(el);
      if (model && el.isConnected) {
        const { done, rest } = sentencesOf(spokenTextOf(model.parts));
        heard += `${[...done.slice(this.spoken.get(el) ?? 0), rest].filter(Boolean).join(" ")} `;
      }
      this.spoken.delete(el);
    }
    this.streamingEls = now;
    if (heard.trim()) this.speech = heard.trim();
  }

  private onVisible(entries: IntersectionObserverEntry[]) {

    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const row = entry.target as HTMLElement;
      const message = this.rowEls.get(row.dataset.key ?? "");
      if (!message || this.read.has(message)) continue;
      this.read.add(message);
      this.orbRead.emit({ message });
    }
  }

  /** What a message's buttons do, for one row */
  private handlersFor(model: MessageModel): RowHandlers {
    const author = this.view.participants.find((p) => p.id === model.from)?.el ?? null;
    return {
      actions: (row, x, y) => this.openActions(model.el, row, x, y),
      reaction: (emoji) => this.toggleReaction(model.el, emoji),
      reply: () => this.reply(model.el),
      retry: () => this.retry(model.el),
      copy: () => void navigator.clipboard?.writeText(model.text),
      edit: () => {
        if (this.orbEdit.emit({ message: model.el, text: model.text }).defaultPrevented) return;
        this.editing = { el: model.el, draft: model.text };
      },
      remove: () => this.orbDelete.emit({ message: model.el }),
      report: () => this.orbReport.emit({ message: model.el }),
      regenerate: () => {
        this.orbRegenerate.emit({ message: model.el });
      },
      pin: () => {
        this.orbPin.emit({ message: model.el, pinned: !model.pinned });
      },
      copyLink: () => {
        void navigator.clipboard?.writeText(this.linkTo(model.id));
      },
      vote: (value) => {
        this.orbVote.emit({ message: model.el, value });
      },
      toolDecision: (toolCall, callId, approved) => {
        this.orbToolDecision.emit({ toolCall, callId, approved });
      },
      variant: (current) => {
        this.switching = model.el;
        this.orbVariantChange.emit({ message: model.el, current });
      },
      moderate: (action) => this.orbModerate.emit({ action, message: model.el, participant: author }),
      reveal: () => {
        this.revealed.add(model.el);
        forceUpdate(this.el);
      },
      editInput: (text) => {
        if (this.editing?.el === model.el) this.editing = { el: model.el, draft: text };
      },
      editCommit: () => {
        if (this.editing?.el !== model.el) return;
        if (this.orbEditCommit.emit({ message: model.el, text: this.editing.draft }).defaultPrevented) return;
        this.editing = undefined;
      },
      editCancel: () => {
        if (this.editing?.el === model.el) this.editing = undefined;
      },
    };
  }

  /**
   * Opens a message's actions at a point. Keyboard input has no pointer, so the
   * menu opens beside the message and moves focus into it.
   */
  private openActions(message: HTMLElement, row: HTMLElement, x: number, y: number) {
    const menu = this.actionsEl;
    if (!menu) return;
    const keyboard = usingKeyboard();
    const rect = row.getBoundingClientRect();
    const at = keyboard ? new DOMRect(rect.left, rect.bottom) : new DOMRect(x, y);
    this.actionsFor = { message, row };
    menu.show({ getBoundingClientRect: () => at });
    if (keyboard) requestAnimationFrame(() => menu.querySelector<HTMLElement>("button")?.focus());
  }

  /** When the menu closes with focus in it, focus goes back to the message, since the menu is hidden */
  private onActionsDismiss() {
    if (this.actionsEl?.contains(this.el.shadowRoot!.activeElement)) this.actionsFor?.row.focus();
  }

  private toggleReaction(message: HTMLElement, emoji: string) {
    const model = this.models.get(message);
    const reacted = !!model?.reactions.find((r) => r.emoji === emoji)?.by.includes(this.pov ?? "");
    this.orbReact.emit({ message, emoji, on: !reacted });
  }

  private renderComposer(composer: ComposerModel) {
    const muted = this.povMuted;
    const pov = this.povParticipant;
    const until = pov?.mutedUntil;
    const note = muted
      ? until === undefined
        ? "You're muted in this conversation."
        : `You're muted until ${new Date(until).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}.`
      : undefined;
    const seconds = Math.max(0, Math.ceil((this.slowUntil - this.now) / 1000));
    const slowCountdown = this.slowed && seconds > 0 ? `Slow mode: ${seconds}s` : undefined;
    const actions = composer.actions;
    return (
      <ComposerView
        model={composer}
        draft={this.draftOf(composer)}
        files={this.files}
        disabled={this.disabled || this.povMuted || this.slowed}
        readonly={this.readonly}
        note={note}
        countdown={slowCountdown}
        announcement={this.announcement}
        toolbarShown={this.toolbarShown}
        streaming={this.view.streaming.length > 0}
        queued={this.queued}
        actions={actions}
        fileUrls={this.fileUrls}
        handlers={{
          input: this.onDraftInput,
          keyDown: this.onComposerKeyDown,
          paste: (event) => {
            const files = event.clipboardData?.files;
            if (files?.length && composer.attachments !== undefined) {
              event.preventDefault();
              this.addFiles(files);
            }
          },
          send: () => this.onSendClick(composer),
          stop: () => this.stopStreams(),
          richSubmit: (event) => this.sendRich(event),
          attach: () => this.fileInputEl?.click(),
          removeFile: (index) => this.removeFile(index),
          toggleToolbar: () => (this.toolbarShown = !this.toolbarShown),
          action: (name, el) => this.orbAction.emit({ name, composer: el }),
          drop: (event) => {
            event.preventDefault();
            if (composer.attachments !== undefined) this.addFiles(event.dataTransfer?.files ?? []);
          },
          dragOver: (event) => {
            if (composer.attachments !== undefined) event.preventDefault();
          },
          textarea: (el) => (this.textareaEl = el ?? undefined),
          rich: (el) => (this.richEl = el ?? undefined),
          richCommands: (query) =>
            this.view.commands
              .filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
              .map((c) => ({ id: c.name, label: c.name, details: c.description })),
          richMentions: (query) => mentionItems(this.view.participants, query),
        }}
      />
    );
  }

  render() {
    const { items, participants, composer } = this.view;
    const header = this.headerOf(participants);
    const keys = items.map((item, index) => this.keyOf(item, index));
    this.windowed = items.length > WINDOW_ABOVE;
    const win = this.windowOf(keys);
    const lastMessage = [...items].reverse().find((item) => item.kind === "message");
    const newest = lastMessage ? keys[items.indexOf(lastMessage)] : undefined;
    const activeKey = this.activeKey ?? newest;
    const byId = new Map<string, MessageModel>();
    for (const item of items) if (item.kind === "message") byId.set(item.model.id, item.model);
    for (const thread of this.view.threads.values()) for (const reply of thread.replies) byId.set(reply.model.id, reply.model);
    this.rowEls.clear();
    const actionsModel = this.actionsFor ? this.models.get(this.actionsFor.message) : undefined;
    const layout = this.layout ?? "bubbles";
    const sortOptions = this.sortOptions;
    const currentSort = this.sort && sortOptions.includes(this.sort) ? this.sort : sortOptions[0];
    const sortLabel = (value: string) => ({ top: "Top", new: "Newest", old: "Oldest" })[value as "top"] ?? value;

    const markdownOf = (source: string) => markdownHtml(source, () => forceUpdate(this.el));
    const citations: CitationPart[] = [];
    const lastSelf = [...items].reverse().find((item) => item.kind === "message" && item.self);

    /** A message's row. Replies in a thread are rows too, with a depth. */
    const row = (
      model: MessageModel,
      options: { key: string; self: boolean; first: boolean; last: boolean; showTime: boolean; depth?: number; receipt?: string; after?: unknown },
    ) => {
      const participant = participants.find((p) => p.id === model.from);
      const hiddenReason =
        model.moderation === "hidden"
          ? model.moderationReason || "Hidden by a moderator"
          : participant?.ignored
            ? `You're ignoring ${participant.name}`
            : undefined;
      const collapsed =
        model.moderation === "removed"
          ? { reason: "", removed: true }
          : hiddenReason && !this.revealed.has(model.el)
            ? { reason: hiddenReason, removed: false }
            : undefined;
      if (!collapsed && this.editing?.el !== model.el) {
        citations.push(...model.parts.filter((part): part is CitationPart => part.type === "citation"));
      }
      this.rowEls.set(options.key, model.el);
      return (
        <MessageRow
          key={options.key}
          rowKey={options.key}
          model={model}
          self={options.self}
          first={options.first}
          last={options.last}
          participant={participant}
          participants={participants}
          pov={this.pov}
          quoted={model.replyTo ? byId.get(model.replyTo) : undefined}
          showName={(!!this.showNames || layout === "flat" || layout === "compact") && options.first && !(layout === "assistant" && options.self)}
          showAvatar={(!!this.avatars || layout === "flat") && layout !== "compact" && options.first}
          showTime={options.showTime}
          active={options.key === activeKey}
          collapsed={collapsed}
          editing={this.editing?.el === model.el ? this.editing.draft : undefined}
          moderator={this.povModerator}
          markdownOf={markdownOf}
          reasoning={this.reasoning}
          depth={options.depth}
          receipt={options.receipt}
          votes={this.votes ?? "none"}
          nested={options.after}
          handlers={this.handlersFor(model)}
          onFocus={() => (this.activeKey = options.key)}
        />
      );
    };

    /** One reply of a thread, as a row, at its depth */
    const replyRow = (thread: ThreadModel, index: number) => {
      const { model, depth } = thread.replies[index];
      const before = thread.replies[index - 1]?.model;
      const after = thread.replies[index + 1]?.model;
      return row(model, {
        key: replyKey(model, index),
        self: !!this.pov && model.from === this.pov,
        first: before?.from !== model.from,
        last: after?.from !== model.from,
        showTime: before?.from !== model.from,
        depth: Math.min(depth, this.maxDepth ?? 1),
      });
    };

    /** The rows of a thread's replies */
    const replyRows = (thread: ThreadModel) => thread.replies.map((_, index) => replyRow(thread, index));

    /** The reply box of a message's thread, which sends to the message */
    const replyBox = (parent: HTMLElement) => {
      const composer = this.view.replyComposer;
      if (!composer) return undefined;
      return (
        <ReplyBox
          parent={parent.id}
          composer={composer}
          draft={this.replyDrafts.get(parent) ?? (parent.id ? this.savedDraft(parent.id) : "")}
          disabled={this.disabled || this.readonly || this.povMuted || this.slowed}
          onInput={(text) => {
            this.replyDrafts.set(parent, text);
            if (parent.id) this.saveDraft(text, parent.id);
            forceUpdate(this.el);
          }}
          onSend={() => this.sendReply(parent)}
        />
      );
    };

    /** A thread's line under its message, with its replies and reply box when they're shown inline */
    const threadRow = (thread: ThreadModel, key: string) => {
      const parent = thread.root;
      const inline = this.threads === "inline";
      const open = inline && this.inlineOpen(parent.el);
      return (
        <div key={key} class="thread" data-key={key} part="thread">
          <ThreadSummary
            thread={thread}
            state={parent.threadState}
            mode={inline ? "inline" : "panel"}
            open={open}
            onToggle={() => (inline ? this.toggleInline(parent.el) : this.openPanel(parent.el))}
            onLoadMore={() => this.orbLoadMore.emit({ parent: parent.el })}
          />
          {open && replyRows(thread)}
          {open && replyBox(parent.el)}
        </div>
      );
    };

    /** Nested replies, drawn in their message: the summary, the replies as a list, and the reply box */
    const nestedOf = (thread: ThreadModel) => {
      const parent = thread.root;
      const open = this.inlineOpen(parent.el);
      const count = `${thread.count} ${thread.count === 1 ? "reply" : "replies"}`;
      return (
        <>
          <ThreadSummary
            thread={thread}
            state={parent.threadState}
            mode="inline"
            open={open}
            onToggle={() => this.toggleInline(parent.el)}
            onLoadMore={() => this.orbLoadMore.emit({ parent: parent.el })}
          />
          {open && (
            <div class="thread-nested" role="list" aria-label={count}>
              {thread.replies.map((_, index) => (
                <div role="listitem">{replyRow(thread, index)}</div>
              ))}
            </div>
          )}
          {open && replyBox(parent.el)}
        </>
      );
    };

    // The arrow keys move through every row, drawn or not: messages, and the replies shown inline
    const navKeys: string[] = [];
    items.forEach((item, index) => {
      if (item.kind === "message") {
        navKeys.push(keys[index]);
        if (item.thread && this.inlineOpen(item.model.el)) item.thread.replies.forEach((reply, i) => navKeys.push(replyKey(reply.model, i)));
      }
      if (item.kind === "thread" && this.threads === "inline" && this.inlineOpen(item.thread.root.el)) {
        item.thread.replies.forEach((reply, i) => navKeys.push(replyKey(reply.model, i)));
      }
    });
    this.navKeys = navKeys;

    const rendered: unknown[] = [];
    const spacer = (height: number, key: string) => (
      <div key={key} class="spacer" aria-hidden="true" style={{ blockSize: `${Math.max(0, height)}px` }} />
    );
    if (win.before > 0) rendered.push(spacer(win.before, "spacer-top"));
    const lastSelfKey = lastSelf ? keys[items.indexOf(lastSelf)] : undefined;
    for (let index = win.start; index < win.end; index++) {
      const item = items[index];
      const key = keys[index];
      if (item.kind === "divider") {
        rendered.push(<DividerRow key={key} label={item.model.label} type={item.model.type} />);
      } else if (item.kind === "thread") {
        rendered.push(threadRow(item.thread, key));
      } else {
        rendered.push(
          row(item.model, {
            key,
            self: item.self,
            first: item.first,
            last: item.last,
            showTime: item.first,
            receipt: key === lastSelfKey ? this.receiptOf(item.model) : undefined,
            after: item.thread ? nestedOf(item.thread) : undefined,
          }),
        );
      }
    }
    if (win.after > 0) rendered.push(spacer(win.after, "spacer-bottom"));

    // The panel shows one thread, beside the list, with the message it starts from
    const openItem = this.openThread ? items.find((item) => item.kind === "message" && item.model.id === this.openThread) : undefined;
    const panel =
      openItem?.kind === "message" ? (
        <aside
          part="thread-panel"
          class="thread-panel"
          aria-label="Thread"
          onKeyDown={(event) => {
            if (event.key !== "Escape") return;
            event.stopPropagation();
            this.closePanel();
          }}
        >
          <div class="thread-head">
            <strong>Thread</strong>
            <orb-button part="thread-close" fill="clear" size="xs" class="icon-only" aria-label="Close thread" onClick={() => this.closePanel()}>
              <CloseIcon />
            </orb-button>
          </div>
          <p part="thread-parent" class="thread-parent">
            <strong>{participants.find((p) => p.id === openItem.model.from)?.name ?? openItem.model.from}</strong>{" "}
            {openItem.model.text.slice(0, 140)}
          </p>
          <div part="thread-replies" class="thread-replies" role="log" aria-label="Replies">
            {this.view.threads.get(openItem.model.id) && replyRows(this.view.threads.get(openItem.model.id)!)}
          </div>
          {replyBox(openItem.model.el)}
        </aside>
      ) : undefined;

    const typing = this.typingLine(participants);
    const topAnchored = this.anchor === "top";
    const composerNode = composer && this.renderComposer(composer);
    const loading = this.loadingMore && (
      <div part="loading" class="loading" role="status">
        <orb-loading /> Loading {topAnchored ? "newer" : "earlier"} messages
      </div>
    );

    return (
      <Host>
        {this.showHeader && (
          <ChannelHeader
            title={header.title}
            description={header.description}
            avatars={header.avatars}
            presence={this.presenceOf(participants)}
          />
        )}
        {sortOptions.length > 0 && (
          <div part="sort" class="sort">
            <orb-button part="sort-button" id="sort-button" fill="outline" size="sm" caret>
              {sortLabel(currentSort)}
            </orb-button>
            <orb-menu for="sort-button" mode="single" label="Sort" onOrbSelect={(event) => this.chooseSort(event.detail.value)}>
              {sortOptions.map((option) => (
                <orb-mi value={option} checked={option === currentSort}>
                  {sortLabel(option)}
                </orb-mi>
              ))}
            </orb-menu>
          </div>
        )}
        {topAnchored && composerNode}
        <div part="main" class="main">
          <div
            part="list"
            class="list"
            data-layout={layout}
            role={this.announce === false ? "feed" : "log"}
            aria-live={this.announce === false ? undefined : "polite"}
            aria-label={this.label}
            ref={(el) => (this.listEl = el)}
            onScroll={this.onListScroll}
            onKeyDown={this.onListKeyDown}
            onPointerEnter={() => this.onHover(true)}
            onPointerLeave={() => this.onHover(false)}
          >
            {!topAnchored && loading}
            {items.length === 0 && this.empty && (
              <p part="empty" class="empty">
                {this.empty}
              </p>
            )}
            {rendered}
            {topAnchored && loading}
          </div>
          {!topAnchored && this.jumpToLatest && (
            <orb-popover ref={(el) => this.setPillEl(el ?? null)} class="jump-pill-popover" arrow={false} placement="top" offsetY={0}>
              <orb-button part="jump-pill" class="jump-pill" fill="solid" size="sm" radius="pill" onClick={() => this.scrollToBottom()}>
                {this.pauseOnScroll && this.newCount
                  ? `Chat paused, ${this.newCount} new`
                  : this.newCount
                    ? `${this.newCount} new ${this.newCount === 1 ? "message" : "messages"}`
                    : "Jump to latest"}
              </orb-button>
            </orb-popover>
          )}
          {panel}
        </div>
        <span id="menu-anchor" class="menu-anchor" aria-hidden="true"></span>
        {/* Without a trigger, the popover opens where it's shown, and closes on a press outside */}
        <orb-popover
          part="actions"
          class="actions"
          arrow={false}
          ref={(el) => (this.actionsEl = el)}
          onOrbDismissStart={() => this.onActionsDismiss()}
        >
          {actionsModel && (
            <MessageActions
              model={actionsModel}
              names={this.actionNames()}
              own={!!this.pov && actionsModel.from === this.pov}
              pov={this.pov}
              moderator={this.povModerator}
              regenerable={this.view.participants.find((p) => p.id === actionsModel.from)?.role === "ai"}
              handlers={this.handlersFor(actionsModel)}
              close={() => this.actionsEl?.hide()}
            />
          )}
        </orb-popover>
        <orb-menu
          for="menu-anchor"
          mode="actions"
          label={this.suggest?.kind === "mention" ? "Mentions" : "Commands"}
          ref={(el) => (this.suggestMenuEl = el)}
          onOrbSelect={(event) => this.chooseSuggest(event.detail.value)}
        >
          {(this.suggest?.items ?? []).map((item) => (
            <orb-mi value={item.id}>{item.label}</orb-mi>
          ))}
        </orb-menu>
        {citations.map((part) => (
          <CitationPopover key={part.anchor} part={part} />
        ))}
        {!topAnchored && composerNode}
        {typing && (
          <p part="typing" class="note typing">
            {typing}
          </p>
        )}
        {this.view.suggestions && this.view.suggestions.items.length > 0 && (
          <SuggestionsView suggestions={this.view.suggestions} onPick={(item) => void this.useSuggestion(item)} />
        )}
        {composer && composer.attachments !== undefined && (
          <input
            type="file"
            hidden
            multiple
            accept={composer.attachments}
            ref={(el) => (this.fileInputEl = el)}
            onChange={(event) => {
              this.addFiles((event.target as HTMLInputElement).files ?? []);
              (event.target as HTMLInputElement).value = "";
            }}
          />
        )}
        <p part="speech" class="sr-only" role="status">
          {this.speech}
        </p>
      </Host>
    );
  }
}

