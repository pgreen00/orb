import { addGridKeys } from "./color-picker";
import { EMOJI_GROUPS, loadEmoji } from "./emoji";
import type { EmojiEntry } from "./emoji";
import { SPECIAL_CATEGORIES, SPECIAL_CHARACTERS } from "./special-characters";

/** Most cells built at once. A broad search leaves the rest out of the DOM. */
const MAX_CELLS = 240;
const COLUMNS = 8;
const RECENT_LIMIT = 16;

interface Item {
  glyph: string;
  name: string;
  /** The tab the item is under: a category name, or an emoji group id */
  group: string;
  /** Lowercase name and tags, which the search matches */
  search: string;
}

interface Tab {
  key: string | null;
  label: string;
  icon?: string;
}

const CHARACTER_TABS: Tab[] = [
  { key: null, label: "All" },
  ...SPECIAL_CATEGORIES.map((category) => ({ key: category, label: category })),
];

const EMOJI_TABS: Tab[] = [
  { key: null, label: "All" },
  ...EMOJI_GROUPS.map(({ id, label, icon }) => ({ key: String(id), label, icon })),
];

const CHARACTER_ITEMS: Item[] = SPECIAL_CHARACTERS.map(({ char, name, category }) => ({
  glyph: char,
  name,
  group: category,
  search: name,
}));

const toItem = ({ emoji, label, group, tags }: EmojiEntry): Item => ({
  glyph: emoji,
  name: label,
  group: String(group),
  search: [label, ...tags].join(" ").toLowerCase(),
});

/** Storage can throw, such as in private modes, so recents are best effort */
function readRecent(key: string): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(value)
      ? value.filter((glyph): glyph is string => typeof glyph === "string").slice(0, RECENT_LIMIT)
      : [];
  } catch {
    return [];
  }
}

function rememberRecent(key: string, glyph: string) {
  const recent = [glyph, ...readRecent(key).filter((item) => item !== glyph)].slice(0, RECENT_LIMIT);
  try {
    localStorage.setItem(key, JSON.stringify(recent));
  } catch {
    // Recents aren't kept when storage is unavailable
  }
}

const indexByGlyph = (list: Item[]) => new Map(list.map((item) => [item.glyph, item] as [string, Item]));

function createGrid(label: string) {
  const grid = document.createElement("div");
  grid.className = "picker-grid";
  grid.setAttribute("role", "grid");
  grid.setAttribute("aria-label", label);
  addGridKeys(grid, ".picker-cell", COLUMNS);
  return grid;
}

/** Fills a grid with rows of cells. Only the first cell is a Tab stop. */
function fillGrid(grid: HTMLElement, items: Item[], onPick: (glyph: string) => void) {
  const rows: HTMLElement[] = [];
  items.forEach((item, index) => {
    if (index % COLUMNS === 0) {
      const row = document.createElement("div");
      row.className = "picker-row";
      row.setAttribute("role", "row");
      rows.push(row);
    }
    const button = document.createElement("button");
    button.type = "button";
    button.className = "picker-cell";
    button.textContent = item.glyph;
    button.setAttribute("aria-label", item.name);
    button.tabIndex = index === 0 ? 0 : -1;
    button.addEventListener("click", () => onPick(item.glyph));
    const cell = document.createElement("div");
    cell.setAttribute("role", "gridcell");
    cell.append(button);
    rows[rows.length - 1].append(cell);
  });
  grid.replaceChildren(...rows);
}

export function createSymbolPicker({
  mode,
  onPick,
}: {
  mode: "characters" | "emoji";
  onPick: (text: string) => void;
}): HTMLElement {
  const emojiMode = mode === "emoji";
  const recentKey = emojiMode ? "orb-rich-text:recent-emoji" : "orb-rich-text:recent-characters";
  let items: Item[] | undefined = emojiMode ? undefined : CHARACTER_ITEMS;
  let byGlyph = indexByGlyph(emojiMode ? [] : CHARACTER_ITEMS);
  let loadFailed = false;
  let tab: string | null = null;
  let query = "";

  const root = document.createElement("div");
  root.className = "picker symbol-picker";

  const search = document.createElement("input");
  search.type = "search";
  search.autocomplete = "off";
  search.setAttribute("aria-label", "Search");
  search.addEventListener("input", () => {
    query = search.value;
    update();
  });
  const field = document.createElement("orb-textbox");
  field.setAttribute("label", "Search");
  field.append(search);

  const tabList = document.createElement("div");
  tabList.className = "picker-tabs";
  tabList.setAttribute("role", "group");
  tabList.setAttribute("aria-label", "Categories");
  const tabButtons = (emojiMode ? EMOJI_TABS : CHARACTER_TABS).map((entry) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "picker-tab";
    button.textContent = entry.icon ?? entry.label;
    button.setAttribute("aria-label", entry.label);
    button.addEventListener("click", () => {
      tab = entry.key;
      update();
    });
    tabList.append(button);
    return { key: entry.key, button };
  });

  const recentLabel = document.createElement("div");
  recentLabel.className = "picker-section-label";
  recentLabel.textContent = "Recently used";
  const recentGrid = createGrid("Recently used");
  const grid = createGrid(emojiMode ? "Emoji" : "Characters");

  const status = document.createElement("div");
  status.className = "picker-empty";
  status.setAttribute("role", "status");

  const pick = (glyph: string) => {
    rememberRecent(recentKey, glyph);
    onPick(glyph);
    update();
  };

  function update() {
    for (const { key, button } of tabButtons) button.setAttribute("aria-pressed", String(key === tab));

    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const recent = readRecent(recentKey).map(
      (glyph) => byGlyph.get(glyph) ?? { glyph, name: glyph, group: "", search: "" },
    );
    const showRecent = recent.length > 0 && words.length === 0;
    recentLabel.hidden = !showRecent;
    recentGrid.hidden = !showRecent;
    fillGrid(recentGrid, showRecent ? recent : [], pick);

    const matched = (items ?? []).filter(
      (item) =>
        (tab === null || item.group === tab) && words.every((word) => item.search.includes(word)),
    );
    const shown = matched.slice(0, MAX_CELLS);
    fillGrid(grid, shown, pick);
    grid.hidden = shown.length === 0;
    status.hidden = shown.length > 0;
    status.textContent = items
      ? "No matches"
      : loadFailed
        ? "Couldn't load emoji"
        : "Loading…";
  }

  if (emojiMode) {
    loadEmoji()
      .then((list) => {
        items = list.map(toItem);
        byGlyph = indexByGlyph(items);
        update();
      })
      .catch(() => {
        loadFailed = true;
        update();
      });
  }

  root.append(field, tabList, recentLabel, recentGrid, grid, status);
  update();
  return root;
}
