import { COMMANDS } from "./commands";
import { mentionNode, paramNode, tagNode } from "./params";
import type { ParamDef } from "./params";
import { closestBlock } from "./selection";
import type { EmojiEntry } from "../ui/emoji";

/** A line of a trigger's menu */
export interface TriggerItem {
  id: string;
  label: string;
  /** Extra text: the emoji for a shortcode, or the name a new tag is made from */
  details?: string;
}

/**
 * A character that opens a menu of items as the user types after it, such as
 * `/` for commands or `@` for mentions.
 */
export interface Trigger {
  text: string;
  /** The menu's accessible name */
  label: string;
  /** Only at the start of a block, like the `/` menu */
  blockStart?: boolean;
  /** Whether the search text may contain spaces */
  spaces?: boolean;
  /** The items come from a lookup, so they wait for a pause in typing */
  async?: boolean;
  /** The chosen item runs a command, rather than inserting text */
  command?: boolean;
  items(query: string): TriggerItem[] | Promise<TriggerItem[]>;
  /** Replaces the trigger and search text, which the range covers, and returns the caret */
  choose(item: TriggerItem, root: HTMLElement, range: Range): Range;
}

export interface TriggerMatch {
  trigger: Trigger;
  /** From the trigger's text to the caret */
  range: Range;
  query: string;
  /** The block and offset the trigger starts at, so a dismissed trigger stays dismissed */
  block: HTMLElement;
  at: number;
}

/** A search longer than this doesn't open a menu */
const MAX_QUERY = 50;

/** Mentions, tags and placeholders are one piece each. The text inside one isn't typed, so it can't start a menu. */
const PIECE = "[data-mention],[data-tag],[data-param]";

/** The text of a block from its start to the caret */
function textBeforeCaret(block: HTMLElement, caret: Range): string {
  const range = document.createRange();
  range.setStart(block, 0);
  range.setEnd(caret.startContainer, caret.startOffset);
  return range.toString();
}

/** The DOM position of a character offset in a block's text */
function positionAt(block: HTMLElement, offset: number): [Node, number] {
  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
  let seen = 0;
  let last: Text | null = null;
  for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
    last = node;
    if (offset <= seen + node.length) return [node, offset - seen];
    seen += node.length;
  }
  return last ? [last, last.length] : [block, 0];
}

/**
 * The trigger the caret is in, if any: a trigger's text, at the start of a
 * block or after a space, with a search after it that fits the trigger's rules.
 * Triggers are tried in order, and the first match wins. Code blocks have none.
 */
export function findTrigger(root: HTMLElement, caret: Range, triggers: Trigger[]): TriggerMatch | null {
  const block = closestBlock(caret.startContainer, root);
  if (!caret.collapsed || block === root || block.tagName === "PRE") return null;
  const before = textBeforeCaret(block, caret);
  for (const trigger of triggers) {
    const at = before.lastIndexOf(trigger.text);
    if (at < 0) continue;
    const query = before.slice(at + trigger.text.length);
    const startsOk = trigger.blockStart ? at === 0 : at === 0 || /\s/.test(before[at - 1]);
    if (!startsOk || query.length > MAX_QUERY || (!trigger.spaces && /\s/.test(query))) continue;
    const range = document.createRange();
    const [node, offset] = positionAt(block, at);
    range.setStart(node, offset);
    range.setEnd(caret.startContainer, caret.startOffset);
    // A piece partly inside the range is cloned into the fragment, so this finds it from either end
    if (range.cloneContents().querySelector(PIECE)) continue;
    return { trigger, range, query, block, at };
  }
  return null;
}

/** Puts `node` where the range is, and returns the caret after it */
function replaceWith(range: Range, node: Node): Range {
  range.deleteContents();
  range.insertNode(node);
  const caret = document.createRange();
  caret.setStartAfter(node);
  caret.collapse(true);
  return caret;
}

/** The words each slash command is also found by, besides its label */
const SLASH: Record<string, string[]> = {
  paragraph: ["text", "normal"],
  heading1: ["title", "h1"],
  heading2: ["subtitle", "h2"],
  heading3: ["h3"],
  bulletList: ["ul", "bullets", "unordered"],
  orderedList: ["ol", "numbered"],
  taskList: ["todo", "checkbox", "tasks"],
  quote: ["blockquote", "citation"],
  code: ["pre", "snippet", "codeblock"],
  table: ["grid", "rows", "columns"],
  separator: ["hr", "divider", "rule", "line"],
  media: ["image", "picture", "photo", "file"],
  toc: ["contents", "outline"],
  link: ["url", "hyperlink"],
  specialCharacter: ["symbol", "character"],
  emoji: ["smiley"],
};

/** `/` opens the commands. The chosen one runs once its text is removed, so the caller runs it. */
export function slashTrigger(options: { inTable: boolean }): Trigger {
  return {
    text: "/",
    label: "Commands",
    blockStart: true,
    spaces: true,
    command: true,
    items(query) {
      const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
      const items: TriggerItem[] = [];
      for (const [id, keywords] of Object.entries(SLASH)) {
        const command = COMMANDS.get(id);
        if (!command || (command.noTable && options.inTable)) continue;
        const found = [command.label, ...keywords].join(" ").toLowerCase();
        if (words.every((word) => found.includes(word))) items.push({ id, label: command.label });
      }
      return items;
    },
    choose(_item, _root, range) {
      range.deleteContents();
      const caret = range.cloneRange();
      caret.collapse(true);
      return caret;
    },
  };
}

/** `@` opens mentions from the host's lookup */
export function mentionTrigger(lookup?: (query: string) => TriggerItem[] | Promise<TriggerItem[]>): Trigger {
  return {
    text: "@",
    label: "Mentions",
    async: true,
    items: (query) => lookup?.(query) ?? [],
    choose: (item, _root, range) => replaceWith(range, mentionNode(item.id, item.label)),
  };
}

/** `#` opens tags from the host's lookup, plus a choice to create the tag being typed */
export function tagTrigger(lookup?: (query: string) => TriggerItem[] | Promise<TriggerItem[]>): Trigger {
  return {
    text: "#",
    label: "Tags",
    async: true,
    items: async (query) => {
      const name = query.trim();
      const found = (await lookup?.(query)) ?? [];
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      const exact = found.some((item) => item.label.toLowerCase() === name.toLowerCase());
      if (!slug || exact) return found;
      return [...found, { id: slug, label: `Create #${name}`, details: name }];
    },
    choose: (item, _root, range) => replaceWith(range, tagNode(item.id, item.details ?? item.label)),
  };
}

/** `:` opens emoji shortcodes, once two letters are typed */
export function emojiTrigger(load: () => Promise<EmojiEntry[]>): Trigger {
  return {
    text: ":",
    label: "Emoji",
    async: true,
    spaces: false,
    items: async (query) => {
      if (query.length < 2) return [];
      const wanted = query.toLowerCase();
      const list = await load();
      const items: TriggerItem[] = [];
      for (const entry of list) {
        const code = entry.shortcodes.find((name) => name.startsWith(wanted));
        if (code) items.push({ id: code, label: `${entry.emoji}  :${code}:`, details: entry.emoji });
        if (items.length === 12) break;
      }
      return items;
    },
    choose: (item, _root, range) => replaceWith(range, document.createTextNode(item.details ?? "")),
  };
}

/** `{{` opens the placeholders the host lists */
export function paramTrigger(params: ParamDef[]): Trigger {
  return {
    text: "{{",
    label: "Placeholders",
    items(query) {
      const wanted = query.trim().toLowerCase();
      return params
        .filter((param) => `${param.key} ${param.label}`.toLowerCase().includes(wanted))
        .map((param) => ({ id: param.key, label: param.label }));
    },
    choose: (item, _root, range) => replaceWith(range, paramNode(item.id, item.label)),
  };
}
