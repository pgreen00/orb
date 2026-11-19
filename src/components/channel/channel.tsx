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
import { mentionIds } from "./model/text";
import { markdownHtml } from "./model/content";
import { parseDuration, readCommand, readComposer, readDivider, readMessage, readParticipant } from "./model/parse";
import { BUILT_IN, PRESETS, SETTING_NAMES, type SettingName, type Settings } from "./model/settings";
import type {
  CommandModel,
  ComposerModel,
  DividerModel,
  Item,
  MessageModel,
  ParticipantModel,
  SendDetail,
  View,
} from "./model/types";
import { ChannelHeader } from "./render/header";
import { ComposerView, mentionItems } from "./render/composer";
import { DividerRow, MessageRow, type RowHandlers } from "./render/message";
import { MessageActions } from "./render/tapback";

/** The text that a command typed at the start of a message starts with, such as `/summarize now` */
function commandIn(text: string, commands: CommandModel[]): { name: string; args: string } | null {
  const match = /^\/(\S+)\s*([\s\S]*)$/.exec(text.trim());
  if (!match || !commands.some((command) => command.name === match[1])) return null;
  return { name: match[1], args: match[2].trim() };
}

const dayOf = (time: number) => new Date(time).toDateString();

const DAY_LABEL = new Intl.DateTimeFormat(undefined, { dateStyle: "long" });

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

  @State() view: View = { items: [], participants: [], commands: [] };
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
   * it. Without `echo`, the app adds sent messages itself.
   */
  @Prop() echo = false;

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

  /** Emitted when a message is sent from the composer. Cancel it to keep the draft. */
  @Event({ cancelable: true }) orbSend: EventEmitter<SendDetail>;

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

  connectedCallback() {
    this.observer.observe(this.el, { childList: true, subtree: true, characterData: true });
    this.scheduleFlush();
  }

  disconnectedCallback() {
    this.observer.disconnect();
    this.reader?.disconnect();
    if (this.frame !== undefined) cancelAnimationFrame(this.frame);
    this.frame = undefined;
    this.stopTicker();
    for (const url of this.fileUrls.values()) URL.revokeObjectURL(url);
    this.fileUrls.clear();
  }

  componentWillLoad() {
    this.fillSettings();
    // The first render already has the children, so methods such as focusComposer() find their elements
    this.flush();
  }

  componentDidLoad() {
    adoptChatStyles(this.el.shadowRoot!);
    this.reader = new IntersectionObserver((entries) => this.onVisible(entries), { root: this.listEl, threshold: 0.5 });
    this.scheduleFlush();
  }

  componentDidRender() {
    if (this.stuck && this.listEl) this.listEl.scrollTop = this.listEl.scrollHeight;
    if (this.reader && this.listEl) {
      for (const row of Array.from(this.listEl.querySelectorAll<HTMLElement>('[role="article"]'))) this.reader.observe(row);
    }
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
  onSettingChange(_value: unknown, _previous: unknown, name: string) {
    if (!this.filling) this.filled.delete(name as SettingName);
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
  };

  private onListScroll = () => {
    const list = this.listEl!;
    this.stuck = list.scrollHeight - list.scrollTop - list.clientHeight < 16;
  };

  /** The arrow keys move between messages. Home and End go to the first and the last. */
  private onListKeyDown = (event: KeyboardEvent) => {
    if ((event.target as HTMLElement).tagName === "TEXTAREA") return;
    const articles = Array.from(this.listEl?.querySelectorAll<HTMLElement>('[role="article"]') ?? []);
    const current = (event.target as HTMLElement).closest<HTMLElement>('[role="article"]');
    const index = current ? articles.indexOf(current) : -1;
    if (index < 0) return;
    const moves: Record<string, number> = { ArrowUp: index - 1, ArrowDown: index + 1, Home: 0, End: articles.length - 1 };
    const target = moves[event.key];
    if (target === undefined) return;
    event.preventDefault();
    const next = articles[Math.min(Math.max(target, 0), articles.length - 1)];
    this.activeKey = next.dataset.key;
    next.focus();
  };

  /** Writes the channel's own settings onto the element, for the ones the app hasn't set */
  private fillSettings() {
    const preset = this.preset ? PRESETS[this.preset] : undefined;
    const builtIn = BUILT_IN[this.resolvedKind];
    const fields = this as unknown as Record<SettingName, Settings[SettingName]>;
    this.filling = true;
    for (const name of SETTING_NAMES) {
      if (fields[name] !== undefined && !this.filled.has(name)) continue;
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

  private scheduleFlush() {
    if (this.frame !== undefined) return;
    this.frame = requestAnimationFrame(() => this.flush());
  }

  /** Reads the children into the view. Only messages that changed are read again. */
  private flush() {
    this.frame = undefined;
    const dirty = this.dirtyMessages;
    this.dirtyMessages = new Set();

    const participants: ParticipantModel[] = [];
    const rows: ({ kind: "message"; model: MessageModel } | { kind: "divider"; model: DividerModel })[] = [];
    let composer: ComposerModel | undefined;
    let commands: CommandModel[] = [];
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
      } else if (child.tagName === "ORB-CHANNEL-PARTICIPANT") {
        participants.push(readParticipant(child));
      } else if (child.tagName === "ORB-CHANNEL-COMPOSER" && !composer) {
        composer = readComposer(child);
        commands = (Array.from(child.children) as HTMLElement[])
          .filter((el) => el.tagName === "ORB-CHANNEL-COMMAND")
          .map(readCommand);
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

    const visible = rows.filter((row) => !(row.kind === "message" && dropped.has(row.model.el)));
    const windowMs = parseDuration(this.groupWithin ?? "") ?? 0;
    const grouped = (a: MessageModel, b: MessageModel) =>
      windowMs > 0 &&
      a.from === b.from &&
      (a.time === undefined || b.time === undefined || Math.abs(b.time - a.time) <= windowMs);

    // Date dividers go in where the day changes
    const ordered: ({ kind: "message"; model: MessageModel } | { kind: "divider"; model: DividerModel })[] = [];
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
    }

    const items: Item[] = ordered.map((row, index): Item => {
      if (row.kind === "divider") return { kind: "divider", model: row.model };
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
      };
    });

    // The messages after the unread divider that aren't the point of view's
    const unreadAt = items.findIndex((item) => item.kind === "divider" && item.model.type === "unread");
    this.unread =
      unreadAt < 0
        ? 0
        : items.slice(unreadAt + 1).filter((item) => item.kind === "message" && !item.self).length;

    this.view = { items, participants, composer, commands };
  }

  /** A message's key, which keeps its row when the list changes */
  private keyOf(item: Item, index: number): string {
    if (item.kind === "divider") return `divider-${index}`;
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
    if (!this.dispatchSend(text, { format: "text", html: undefined, composer: composer.el })) return;
    this.setDraft(composer, "");
  }

  private sendRich(event: CustomEvent<{ html: string; text: string }>) {
    const composer = this.view.composer;
    if (!composer || this.disabled || this.readonly || this.povMuted || this.slowed) {
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
  private dispatchSend(text: string, options: { format: "text" | "html"; html?: string; composer: HTMLElement | null }): boolean {
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
      to: null,
      composer: options.composer,
      message: null,
      mentions,
      command: commandIn(text, this.view.commands),
      files: [...this.files],
    };
    if (this.orbSend.emit(detail).defaultPrevented) return false;
    if (this.echo) detail.message = this.echoMessage(text);
    this.afterSend();
    return true;
  }

  private afterSend() {
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

  private echoMessage(text: string): HTMLElement {
    const el = document.createElement("orb-channel-message");
    el.setAttribute("from", this.pov ?? "");
    el.setAttribute("client-id", Math.random().toString(36).slice(2));
    el.setAttribute("status", "sent");
    el.textContent = text;
    this.echoed.add(el);
    this.el.append(el);
    return el;
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
  @Method()
  async send(text: string): Promise<void> {
    if (this.disabled || this.readonly || this.povMuted || this.slowed || !text.trim()) return;
    this.dispatchSend(text.trim(), { format: "text", composer: this.view.composer?.el ?? null });
  }

  /** Scrolls a message into view and moves the list's focus to it */
  @Method()
  async scrollToMessage(id: string, options?: { behavior?: ScrollBehavior }): Promise<void> {
    const target = Array.from(this.listEl?.querySelectorAll<HTMLElement>('[role="article"][data-id]') ?? []).find(
      (el) => el.dataset.id === id,
    );
    if (!target) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ block: "center", behavior: options?.behavior ?? (reduced ? "auto" : "smooth") });
  }

  /** Moves the keyboard focus to the message box */
  @Method()
  async focusComposer(): Promise<void> {
    (this.richEl ?? this.textareaEl)?.focus();
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
      reply: () => this.orbReply.emit({ message: model.el }),
      copy: () => void navigator.clipboard?.writeText(model.text),
      edit: () => {
        if (this.orbEdit.emit({ message: model.el, text: model.text }).defaultPrevented) return;
        this.editing = { el: model.el, draft: model.text };
      },
      remove: () => this.orbDelete.emit({ message: model.el }),
      report: () => this.orbReport.emit({ message: model.el }),
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
    const lastMessage = [...items].reverse().find((item) => item.kind === "message");
    const newest = lastMessage ? this.keyOf(lastMessage, items.indexOf(lastMessage)) : undefined;
    const activeKey = this.activeKey ?? newest;
    const byId = new Map<string, MessageModel>();
    for (const item of items) if (item.kind === "message") byId.set(item.model.id, item.model);
    this.rowEls.clear();
    const actionsModel = this.actionsFor ? this.models.get(this.actionsFor.message) : undefined;

    const markdownOf = (source: string) => markdownHtml(source, () => forceUpdate(this.el));

    return (
      <Host>
        {this.showHeader && (
          <ChannelHeader title={header.title} description={header.description} avatars={header.avatars} />
        )}
        <div
          part="list"
          class="list"
          role="log"
          aria-live="polite"
          aria-label={this.label}
          ref={(el) => (this.listEl = el)}
          onScroll={this.onListScroll}
          onKeyDown={this.onListKeyDown}
        >
          {items.length === 0 && this.empty && (
            <p part="empty" class="empty">
              {this.empty}
            </p>
          )}
          {items.map((item, index) => {
            const key = this.keyOf(item, index);
            if (item.kind === "divider") {
              return <DividerRow key={key} label={item.model.label} type={item.model.type} />;
            }
            const model = item.model;
            this.rowEls.set(key, model.el);
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
            return (
              <MessageRow
                key={key}
                rowKey={key}
                model={model}
                self={item.self}
                first={item.first}
                last={item.last}
                participant={participant}
                participants={participants}
                pov={this.pov}
                quoted={model.replyTo ? byId.get(model.replyTo) : undefined}
                showName={!!this.showNames && item.first}
                showAvatar={!!this.avatars && item.first}
                showTime={item.first}
                active={key === activeKey}
                collapsed={collapsed}
                editing={this.editing?.el === model.el ? this.editing.draft : undefined}
                moderator={this.povModerator}
                markdownOf={markdownOf}
                handlers={this.handlersFor(model)}
                onFocus={() => (this.activeKey = key)}
              />
            );
          })}
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
              own={!!this.pov && actionsModel.from === this.pov}
              pov={this.pov}
              moderator={this.povModerator}
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
        {composer && this.renderComposer(composer)}
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
      </Host>
    );
  }
}

