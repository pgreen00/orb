import {
  Component,
  Element,
  Event,
  EventEmitter,
  Host,
  Method,
  Listen,
  Prop,
  State,
  Watch,
} from "@stencil/core";
import interact from "interactjs";
import { format, startOfDay } from "date-fns";
import {
  OrbCalendarChangeDetail,
  OrbCalendarEvent,
  OrbCalendarEventClickDetail,
  OrbCalendarMutation,
  OrbCalendarOccurrence,
  OrbCalendarRange,
  OrbCalendarSource,
  OrbCalendarSourceLoadDetail,
  OrbCalendarSourceToggleDetail,
  OrbCalendarView,
  OrbRecurrenceScope,
  OrbWeekStart,
} from "./utils/types";
import { daysInRange, nextDay, rangeForView, step } from "./utils/datetime";
import { applyEventChange, expandOccurrences } from "./utils/recurrence";
import { buildICS } from "./utils/ics";
import {
  parseTime,
  createEventElement,
  readEvent,
  readSource,
  writeEvent,
  OrbCalendarMarkupEvent,
} from "./utils/markup";
import { resolveColor } from "./utils/color";
import { SourceLoader } from "./utils/loader";
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from "../../utils/icons";
import { MonthView } from "./views/month-view";
import { TimeGrid } from "./views/time-grid";
import { Sidebar } from "./views/sidebar";
import { EventEditor, ruleFor } from "./views/event-editor";

const HOUR = 60 * 60 * 1000;

/** Numbers the ids of new events across every calendar on the page, so two made in one millisecond differ */
let newEventCount = 0;

/** An id for a new event. Unique on the page, and short enough to read in markup. */
function newEventId() {
  return `event-${Date.now().toString(36)}-${++newEventCount}`;
}

/** How an update ended: it went through, the scope prompt was dismissed, or the app had removed the event */
type CommitStatus = "done" | "dismissed" | "gone";

/** A child the calendar reads: an event or a calendar source */
const isDataChild = (node: Node) =>
  node.nodeName === "ORB-CALENDAR-EVENT" || node.nodeName === "ORB-CALENDAR-SOURCE";

/**
 * A full featured calendar.
 *
 * It reads its events and calendars from its children, `orb-calendar-event` and
 * `orb-calendar-source`, and writes the user's changes back into them.
 *
 * @part header - The top toolbar
 * @part view-switcher - The day/week/month control
 * @part sidebar - The sidebar with the calendar list and mini month
 * @part calendar-list - The list of calendars in the sidebar
 * @part mini-month - The datepicker in the sidebar
 * @part sources-button - The Calendars button, shown in place of the sidebar when the calendar is narrow
 * @part sources-menu - The menu of calendars, opened by the Calendars button
 * @part grid - The active view's grid
 * @part event - An event pill or block
 * @part event--all-day - An all-day or multi-day event bar
 * @part day-cell - A day cell in the month grid
 * @part all-day-row - The all-day row in day and week views
 * @part now-line - The current-time indicator line
 * @part editor - The event editor form
 */
@Component({
  tag: "orb-calendar",
  styleUrl: "calendar.css",
  shadow: true,
})
export class Calendar {
  @Element() el!: HTMLOrbCalendarElement;

  /**
   * The `orb-calendar-source` children, one per named calendar. Without any,
   * there's one implicit calendar. They're read again whenever they change.
   */
  @State() private sources: OrbCalendarSource[] = [];

  /**
   * The `orb-calendar-event` children, read as events. A child changes, or is
   * added or removed, and the calendar follows it.
   */
  @State() private items: OrbCalendarMarkupEvent[] = [];

  /** The active view */
  @Prop({ mutable: true, reflect: true }) view: OrbCalendarView = "month";

  /**
   * The anchor date that decides which range is shown: epoch ms, or an ISO date
   * such as `2026-06-08`
   */
  @Prop({ mutable: true }) date?: number | string;

  /** First day of the week, from 0 (Sunday) to 6 */
  @Prop() weekStartsOn: OrbWeekStart = 0;

  /** Allows creating, dragging, resizing, editing, and deleting events */
  @Prop() editable = true;

  /** First hour shown in day and week views */
  @Prop() dayStartHour = 0;

  /** Last hour shown in day and week views */
  @Prop() dayEndHour = 24;

  /** Hour scrolled into view in day and week views */
  @Prop() scrollToHour = 8;

  /** Shows the sidebar with the calendar list and mini month */
  @Prop() showSidebar = true;

  /** Emitted when the user changes the view */
  @Event({ bubbles: false }) orbViewChange: EventEmitter<OrbCalendarView>;

  /** Emitted when the user changes the anchor date */
  @Event({ bubbles: false }) orbDateChange: EventEmitter<number>;

  /** Emitted on load and whenever the visible range changes. Useful for lazy loading events. */
  @Event({ bubbles: false }) orbRangeChange: EventEmitter<OrbCalendarRange>;

  /** Emitted when an event is clicked. Call `preventDefault()` to skip the built-in editor. */
  @Event({ bubbles: false, cancelable: true })
  orbEventClick: EventEmitter<OrbCalendarEventClickDetail>;

  /**
   * Emitted when the user saves a new event. The calendar adds it to its children
   * unless canceled. Call `preventDefault()` to save it yourself first, then
   * `applyChange()`, or to keep it out of the calendar.
   */
  @Event({ bubbles: false, cancelable: true })
  orbEventCreate: EventEmitter<OrbCalendarChangeDetail>;

  /**
   * Emitted when the user edits, drags, or resizes an event. The calendar writes it
   * into its children unless canceled.
   */
  @Event({ bubbles: false, cancelable: true })
  orbEventUpdate: EventEmitter<OrbCalendarChangeDetail>;

  /**
   * Emitted when the user deletes an event. The calendar removes it from its
   * children unless canceled.
   */
  @Event({ bubbles: false, cancelable: true })
  orbEventDelete: EventEmitter<OrbCalendarChangeDetail>;

  /**
   * Emitted when the user shows or hides a calendar in the sidebar. Call
   * `preventDefault()` to keep it as it is, for example to ask first. The
   * calendar makes the change itself, by writing `hidden` on the
   * `orb-calendar-source` element, so the sidebar shows it straight away.
   */
  @Event({ bubbles: false, cancelable: true })
  orbSourceToggle: EventEmitter<OrbCalendarSourceToggleDetail>;

  /**
   * Emitted before a source with an `href` asks its server for the events of the
   * range on screen. Call `preventDefault()` to skip the request, for example to
   * fetch the events yourself, with the headers you need, and insert them as children.
   */
  @Event({ bubbles: false, cancelable: true })
  orbSourceLoad: EventEmitter<OrbCalendarSourceLoadDetail>;

  /** Re-render tick for the now-line */
  @State() now = Date.now();
  @State() editorOpen = false;
  @State() editorEvent?: OrbCalendarEvent;

  @State() scopeOpen = false;
  @State() scopeAction: "edit" | "delete" = "edit";
  private scopeResolver?: (scope: OrbRecurrenceScope | null) => void;

  /**
   * The models of the event children, reused until their element changes. An
   * event with no usable `start` isn't placed here, since there's nothing to
   * keep.
   */
  private events = new WeakMap<HTMLElement, OrbCalendarMarkupEvent>();
  /** The event children whose attributes, text, or properties changed since the last read */
  private dirty = new Set<HTMLElement>();
  /** Children already warned about. A read repeats on every change, so a warning is given once. */
  private warned = new WeakSet<HTMLElement>();
  /** The source children, by id, so the sidebar can write `hidden` on them */
  private sourceEls = new Map<string, HTMLElement>();
  /** The event children, by id, so a change is written to the right element */
  private eventEls = new Map<string, HTMLElement>();
  /** Set while the calendar writes to its children, so its own writes aren't read back as the app's */
  private writing = false;

  private observer = new MutationObserver((records) => this.onMutations(records));
  private frame?: number;

  private editorMode: "create" | "edit" = "create";
  /**
   * The Repeat preset the user picked in the editor. Kept apart from the rule,
   * since a custom rule can start out as the weekly one, which would otherwise
   * show as "Every Week".
   */
  private editorPreset?: string;
  private editorOccurrence: OrbCalendarOccurrence | null = null;
  /** When the last drag or resize ended, to ignore the click that follows it */
  private lastInteractEnd = 0;
  private nowTimer?: ReturnType<typeof setInterval>;
  private lastRange?: OrbCalendarRange;
  private lastOccurrences: OrbCalendarOccurrence[] = [];
  private scrollEl?: HTMLElement;
  private lastScrollKey = "";
  /** The element each event model was read from. A click reports it, which an id can't do for an event without one. */
  private elementOf = new WeakMap<object, HTMLElement>();
  /** Ids a child was renamed from, mapped to the id it has now. A change that names the old id follows it until the next write. */
  private renamed = new Map<string, string>();
  /** Set once the calendar has loaded, so moving it in the document reads its children again */
  private loaded = false;
  /** Watches the layout's width, to close the Calendars menu when its button is hidden */
  private layoutObserver?: ResizeObserver;
  /** Loads the events of sources that have an `href`, for the range on screen */
  private loader?: SourceLoader;

  connectedCallback() {
    // The default is here, not on the prop, since a prop's default ends up in `attribute`
    this.date ??= Date.now();
    this.observer.observe(this.el, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      // The old id is what `followId()` needs to point overrides at a rename
      attributeOldValue: true,
    });
    this.nowTimer = setInterval(() => (this.now = Date.now()), 60_000);
    // Moved within the document: changes made while it was out weren't seen, and the drag handlers went with it
    if (this.loaded) {
      this.events = new WeakMap();
      this.flush();
      this.setupInteract();
      this.observeLayout();
    }
  }

  componentWillLoad() {
    this.loader = new SourceLoader(this.el, {
      emitLoad: (detail) => !this.orbSourceLoad.emit(detail).defaultPrevented,
      setBusy: (busy) => this.setSourcesBusy(busy),
    });
    // The first render already has the events, and the first `orbRangeChange` has the range
    this.flush();
  }

  componentDidLoad() {
    this.loaded = true;
    this.setupInteract();
    this.observeLayout();
    this.emitRangeIfChanged();
  }

  disconnectedCallback() {
    this.observer.disconnect();
    if (this.frame !== undefined) cancelAnimationFrame(this.frame);
    this.frame = undefined;
    clearInterval(this.nowTimer);
    this.layoutObserver?.disconnect();
    this.loader?.stop();
    this.teardownInteract();
  }

  /** A parent got `orbCalendarDataChange` from a child, which a property set doesn't show as an attribute */
  @Listen("orbCalendarDataChange")
  onChildDataChange(event: Event) {
    // Read back: a listener that sets a property changes the event as much as markup does
    if (this.writing) return;
    const owner = this.ownerOf(event.target as Node);
    if (!owner) return;
    this.dirty.add(owner);
    this.scheduleFlush();
  }

  private onMutations(records: MutationRecord[]) {
    // Read back: while the calendar writes, its own changes are the writer's to follow
    if (this.writing) return;
    let read = false;
    for (const record of records) {
      const owner = this.ownerOf(record.target);
      if (owner) {
        read = true;
        this.dirty.add(owner);
        // An app that gives an event the server's id renames it, and its overrides follow
        if (record.type === "attributes" && record.attributeName === "id") {
          this.followId(owner, record.oldValue ?? "");
        }
      } else if (
        record.type === "childList" &&
        record.target === this.el &&
        [...record.addedNodes, ...record.removedNodes].some(isDataChild)
      ) {
        // An event or source added or removed is read. The calendar's own attributes and text aren't.
        read = true;
      }
    }
    if (read) this.scheduleFlush();
  }


  /**
   * The child whose element changed, by walking up from a node in it. It stops at
   * the calendar's own children, so a nested calendar's events are its own.
   */
  private ownerOf(node: Node | null): HTMLElement | undefined {
    const el = node?.nodeType === Node.ELEMENT_NODE ? (node as HTMLElement) : node?.parentElement;
    const owner = el?.closest<HTMLElement>("orb-calendar-event, orb-calendar-source");
    return owner?.parentElement === this.el ? owner : undefined;
  }

  /** Reads the children on the next frame. A burst of changes is one read. */
  private scheduleFlush() {
    if (this.frame !== undefined) return;
    this.frame = requestAnimationFrame(() => this.flush());
  }

  /**
   * Reads the children into the model. Only a child that changed is read again,
   * and the model keeps its order, so removing the last child doesn't rebuild
   * every event.
   */
  private flush() {
    if (this.frame !== undefined) cancelAnimationFrame(this.frame);
    this.frame = undefined;
    const dirty = this.dirty;
    this.dirty = new Set();

    const sources: OrbCalendarSource[] = [];
    const items: OrbCalendarMarkupEvent[] = [];
    const sourceEls = new Map<string, HTMLElement>();
    const eventEls = new Map<string, HTMLElement>();
    const seen = new Set<string>();
    for (const child of Array.from(this.el.children) as HTMLElement[]) {
      if (child.tagName === "ORB-CALENDAR-SOURCE") {
        const source = readSource(child);
        // Events join a calendar by its id, so one without an id can't be joined
        if (!source.id) {
          this.warnOnce(child, `a calendar named "${source.name || "unnamed"}" has no id, so it's skipped. Give it an id.`);
          continue;
        }
        sources.push(source);
        sourceEls.set(source.id, child);
      } else if (child.tagName === "ORB-CALENDAR-EVENT") {
        let event = this.events.get(child);
        if (!event || dirty.has(child)) {
          event = readEvent(child);
          // A change is written back by id, so an event without one is shown read-only
          if (event && !event.id) {
            event = { ...event, readonly: true };
            this.warnOnce(child, `an event titled "${event.title}" has no id, so it's shown read-only and can't be changed. Give it an id.`);
          }
          if (event) this.events.set(child, event);
          else this.events.delete(child);
        }
        if (!event) continue;
        this.elementOf.set(event, child);
        // A later child with the same id replaces the earlier one, as channel does
        if (event.id && seen.has(event.id)) {
          items.splice(
            items.findIndex((item) => item.id === event.id),
            1,
          );
          this.warnOnce(
            child,
            `more than one event has the id "${event.id}". The later one is shown.`,
          );
        }
        items.push(event);
        if (event.id) {
          seen.add(event.id);
          eventEls.set(event.id, child);
        }
      }
    }

    this.sources = sources;
    this.items = items;
    this.sourceEls = sourceEls;
    this.eventEls = eventEls;
    this.syncSources();
  }

  private warnOnce(el: HTMLElement, message: string) {
    if (this.warned.has(el)) return;
    this.warned.add(el);
    console.warn(`orb-calendar: ${message}`);
  }

  /**
   * The events read fresh from the children, not from the last render: an app
   * may have changed them while a server call was pending. With the element of
   * each id, so a write changes the element that's there now.
   */
  private readChildren() {
    const events: OrbCalendarEvent[] = [];
    const els = new Map<string, HTMLElement>();
    for (const child of Array.from(this.el.children) as HTMLElement[]) {
      if (child.tagName !== "ORB-CALENDAR-EVENT") continue;
      const event = readEvent(child);
      // The model's ids can be empty, which an element can't have, so only what's usable is kept
      if (!event?.id) continue;
      events.push({ ...event, id: event.id, title: event.title ?? "" });
      els.set(event.id, child);
    }
    return { events, els };
  }

  /**
   * Writes a change into the children, the way `applyEventChange` changes an
   * array: an event it doesn't have is added, a changed one is rewritten where
   * it is, and a removed one's element goes. Only what's written is touched, so
   * an app's own markup and attributes survive.
   */
  private write(
    kind: "create" | "update" | "delete",
    mutation: OrbCalendarMutation,
    element?: HTMLElement,
  ) {
    // The app's changes since the last read, such as a rename in a listener, are
    // taken first, so this write works from them rather than dropping them
    this.onMutations(this.observer.takeRecords());
    this.writing = true;
    try {
      const { events: current, els } = this.readChildren();
      const resolved = this.followRenames(mutation, kind, new Set(current.map((event) => event.id)));
      const next = applyEventChange(current, resolved, kind);
      const byId = new Map(current.map((event) => [event.id, event]));
      const nextIds = new Set(next.map((event) => event.id));

      // Removed: a master that's deleted takes its overrides with it. Every element with
      // the id goes, since a duplicated id is written once, and the rest would show again.
      for (const event of current) {
        if (nextIds.has(event.id)) continue;
        for (const child of Array.from(this.el.children) as HTMLElement[]) {
          if (child.tagName === "ORB-CALENDAR-EVENT" && child.id === event.id) child.remove();
        }
        els.delete(event.id);
      }

      // Added. A create goes in as the element the listeners were given.
      for (const event of next) {
        if (byId.has(event.id)) continue;
        const created = kind === "create" && event.id === resolved.event.id ? element : undefined;
        this.dirty.add(this.insertEventElement(event, els, created));
      }

      // Changed, in place. Only an element that really changed is read again.
      for (const event of next) {
        const el = els.get(event.id);
        if (byId.has(event.id) && el && writeEvent(el, event)) this.dirty.add(el);
      }
    } finally {
      // Drops the writer's own records. The app's were taken at the start.
      this.observer.takeRecords();
      this.writing = false;
      this.renamed.clear();
      this.flush();
    }
  }

  /**
   * A change may name an event by the id it had before a rename. The change
   * follows the rename to the id the event has now, so it still finds the event.
   * A create names its own new element, which is already renamed.
   */
  private followRenames(
    mutation: OrbCalendarMutation,
    kind: "create" | "update" | "delete",
    present: Set<string>,
  ): OrbCalendarMutation {
    if (kind === "create" || this.renamed.size === 0) return mutation;
    const follow = (id: string) => {
      let now = id;
      for (let hops = 0; !present.has(now) && this.renamed.has(now) && hops < this.renamed.size; hops++) {
        now = this.renamed.get(now)!;
      }
      return now;
    };
    const event = { ...mutation.event, id: follow(mutation.event.id) };
    if (mutation.event.recurrenceParentId !== undefined) {
      event.recurrenceParentId = follow(mutation.event.recurrenceParentId);
    }
    return { ...mutation, event };
  }

  /**
   * Adds an event's element, next to the ones it's related to: an override after
   * its master, and a split's new master after the old one. Anything else goes
   * after the last event.
   */
  private insertEventElement(
    event: OrbCalendarEvent,
    els: Map<string, HTMLElement>,
    element?: HTMLElement,
  ): HTMLElement {
    const el = element ?? createEventElement(event);
    els.set(event.id, el);
    const children = Array.from(this.el.children) as HTMLElement[];
    const events = children.filter((child) => child.tagName === "ORB-CALENDAR-EVENT");
    const last = events[events.length - 1];
    // An override goes right after its master
    const parent = event.recurrenceParentId ? els.get(event.recurrenceParentId) : undefined;
    if (parent?.parentElement === this.el) {
      parent.after(el);
      return el;
    }
    // A split's new master, named `<old id>:<occurrence start>`, goes right after the old one
    const source = event.id.lastIndexOf(":");
    const old = source > 0 ? els.get(event.id.slice(0, source)) : undefined;
    if (old?.parentElement === this.el) {
      old.after(el);
      return el;
    }
    if (last) last.after(el);
    else this.el.append(el);
    return el;
  }

  /**
   * An app renamed an event, for example with the server's id, so its overrides
   * are pointed at the new one. The overrides are read again like any other
   * change, and the rename is remembered for a change that names the old id.
   */
  private followId(el: HTMLElement, oldId: string) {
    const newId = el.id;
    if (!oldId || !newId || oldId === newId) return;
    this.renamed.set(oldId, newId);
    for (const child of Array.from(this.el.children) as HTMLElement[]) {
      if (child === el || child.getAttribute("recurrence-parent-id") !== oldId) continue;
      child.setAttribute("recurrence-parent-id", newId);
      // Its model still has the old parent, so it's read again
      this.dirty.add(child);
    }
    if (this.eventEls.get(oldId) === el) this.eventEls.delete(oldId);
    this.eventEls.set(newId, el);
  }

  /**
   * Emits a change, and writes it into the children unless a listener canceled
   * it, which leaves that to the app.
   */
  private change(
    kind: "create" | "update" | "delete",
    mutation: OrbCalendarMutation,
    element: HTMLElement,
  ) {
    const emitter =
      kind === "create"
        ? this.orbEventCreate
        : kind === "update"
          ? this.orbEventUpdate
          : this.orbEventDelete;
    const emitted = emitter.emit({ ...mutation, element });
    if (emitted.defaultPrevented) return false;
    // A listener may have given the new element its id, and the created event takes it
    const event =
      kind === "create" && element.id && element.id !== mutation.event.id
        ? { ...mutation.event, id: element.id }
        : mutation.event;
    this.write(kind, { ...mutation, event }, element);
    return true;
  }

  componentDidRender() {
    // Pads the fixed headers by the scrollbar width so their columns line up
    // with the scrolling body on systems with space-taking scrollbars.
    const scroller =
      this.view === "month"
        ? this.el.shadowRoot?.querySelector<HTMLElement>(".month-weeks")
        : this.scrollEl;
    if (scroller) {
      const width = scroller.offsetWidth - scroller.clientWidth;
      this.el.style.setProperty("--orb-calendar-sb", `${width}px`);
    }

    if ((this.view === "week" || this.view === "day") && this.scrollEl) {
      const key = `${this.view}:${this.anchor}`;
      if (key !== this.lastScrollKey) {
        this.lastScrollKey = key;
        const fraction =
          (this.scrollToHour - this.dayStartHour) /
          (this.dayEndHour - this.dayStartHour);
        this.scrollEl.scrollTop = Math.max(0, fraction) * this.scrollEl.scrollHeight;
      }
    }
  }

  @Watch("view")
  @Watch("date")
  @Watch("weekStartsOn")
  emitRangeIfChanged() {
    const range = this.currentRange();
    if (
      !this.lastRange ||
      range.start !== this.lastRange.start ||
      range.end !== this.lastRange.end
    ) {
      this.lastRange = range;
      this.orbRangeChange.emit(range);
    }
    this.syncSources();
  }

  /** Goes to today */
  @Method()
  async goToToday() {
    this.setDate(Date.now());
  }

  /** Moves forward one day, week, or month, depending on the view */
  @Method()
  async next() {
    this.setDate(step(this.anchor, this.view, 1));
  }

  /** Moves back one day, week, or month, depending on the view */
  @Method()
  async prev() {
    this.setDate(step(this.anchor, this.view, -1));
  }

  /** Goes to the given date (epoch ms) */
  @Method()
  async goToDate(date: number | string) {
    const time = parseTime(date);
    if (time !== undefined) this.setDate(time);
  }

  /**
   * Writes a change into the calendar's children, as the calendar does after its
   * change events. Doesn't emit. For an app that saves first: call
   * `preventDefault()` on the change event, save, then apply it here.
   */
  @Method()
  async applyChange(
    mutation: OrbCalendarMutation,
    kind: "create" | "update" | "delete",
  ): Promise<void> {
    const event: OrbCalendarEvent = {
      ...mutation.event,
      id: mutation.event.id || newEventId(),
      title: mutation.event.title ?? "",
    };
    this.write(kind, { ...mutation, event });
  }

  /** Builds a VCALENDAR string of all events, or only those in `calendarIds` */
  @Method()
  async exportICS(opts?: { calendarIds?: string[] }): Promise<string> {
    this.readNow();
    return buildICS(
      this.items as OrbCalendarEvent[],
      { calendarIds: opts?.calendarIds, now: Date.now() },
    );
  }

  /** Builds the ICS file and starts a browser download */
  @Method()
  async downloadICS(opts?: { calendarIds?: string[]; filename?: string }) {
    const ics = await this.exportICS({ calendarIds: opts?.calendarIds });
    const url = URL.createObjectURL(
      new Blob([ics], { type: "text/calendar;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = opts?.filename ?? "calendar.ics";
    a.click();
    URL.revokeObjectURL(url);
  }

  private hourHeightPx() {
    const label =
      this.el.shadowRoot?.querySelector<HTMLElement>(".tg-hour-label");
    return label?.getBoundingClientRect().height || 48;
  }

  private snap15 = (minutes: number) => Math.round(minutes / 15) * 15;

  private occFromEl(el: HTMLElement) {
    const occStart = Number(el.dataset.occStart);
    return this.lastOccurrences.find(
      (o) => o.masterId === el.dataset.occId && o.occurrenceStart === occStart,
    );
  }

  private async dropEvent(el: HTMLElement, startDeltaMin: number, endDeltaMin: number) {
    const occ = this.occFromEl(el);
    if (!occ || occ.event.readonly) return;
    await this.commitUpdate(occ, {
      ...occ.event,
      start: occ.start + startDeltaMin * 60_000,
      end: occ.end + endDeltaMin * 60_000,
    });
  }

  private canInteract(target: HTMLElement) {
    return this.editable && target.dataset.readonly !== "true";
  }

  /** Drag moves timed events in 15-minute steps. The bottom handle resizes them. */
  private setupInteract() {
    const context = this.el.shadowRoot as unknown as Document;
    interact(".tg-event", { context })
      .draggable({
        ignoreFrom: ".tg-resize-handle",
        listeners: {
          move: (e: any) => {
            if (!this.canInteract(e.target)) return;
            const y = (parseFloat(e.target.dataset.dragDy) || 0) + e.dy;
            e.target.dataset.dragDy = `${y}`;
            Object.assign(e.target.style, {
              transform: `translateY(${y}px)`,
              zIndex: "6",
              opacity: "0.85",
            });
          },
          end: (e: any) => {
            const dy = parseFloat(e.target.dataset.dragDy) || 0;
            Object.assign(e.target.style, { transform: "", zIndex: "", opacity: "" });
            delete e.target.dataset.dragDy;
            if (!this.canInteract(e.target) || !dy) return;
            this.lastInteractEnd = Date.now();
            const deltaMin = this.snap15((dy / this.hourHeightPx()) * 60);
            if (deltaMin) this.dropEvent(e.target, deltaMin, deltaMin);
          },
        },
      })
      .resizable({
        edges: { bottom: ".tg-resize-handle" },
        listeners: {
          move: (e: any) => {
            if (!this.canInteract(e.target)) return;
            e.target.style.height = `${e.rect.height}px`;
            e.target.dataset.resizeH = `${e.rect.height}`;
          },
          end: (e: any) => {
            const finalH = parseFloat(e.target.dataset.resizeH) || 0;
            e.target.style.height = "";
            delete e.target.dataset.resizeH;
            if (!this.canInteract(e.target) || !finalH) return;
            // Compares against the height the duration implies, since the DOM
            // height has already been reset.
            const occ = this.occFromEl(e.target);
            if (!occ) return;
            const originalH = ((occ.end - occ.start) / HOUR) * this.hourHeightPx();
            const deltaMin = this.snap15(
              ((finalH - originalH) / this.hourHeightPx()) * 60,
            );
            this.lastInteractEnd = Date.now();
            if (deltaMin) this.dropEvent(e.target, 0, deltaMin);
          },
        },
      });
  }

  private teardownInteract() {
    const context = this.el.shadowRoot as unknown as Document;
    interact(".tg-event", { context }).unset();
  }

  /** The anchor date as epoch ms, however it was set: a number, or an ISO date */
  private get anchor(): number {
    return parseTime(this.date) ?? Date.now();
  }

  private currentRange() {
    return rangeForView(this.anchor, this.view, this.weekStartsOn);
  }

  private setView = (view: OrbCalendarView) => {
    if (view === this.view) return;
    this.view = view;
    this.orbViewChange.emit(view);
  };

  private setDate = (date: number) => {
    this.date = date;
    this.orbDateChange.emit(date);
  };

  private isHidden = (cal: OrbCalendarSource) => !!cal.hidden;

  /**
   * Asks the sources' servers for the visible range, from each source with an
   * `href` whose range isn't loaded yet. `end` is the midnight after the last day shown.
   */
  private syncSources() {
    if (!this.loaded || !this.loader) return;
    const sources = this.sources.flatMap((model) => {
      const el = this.sourceEls.get(model.id);
      return el ? [{ el, model }] : [];
    });
    const range = this.currentRange();
    this.loader.sync(sources, { start: range.start, end: nextDay(startOfDay(range.end).getTime()) });
  }

  /** Holds `aria-busy` on the calendar while any source's request is pending */
  private setSourcesBusy(busy: boolean) {
    if (busy) this.el.setAttribute("aria-busy", "true");
    else this.el.removeAttribute("aria-busy");
  }

  /**
   * Reads the children now if they changed since the last read, so a method that
   * works from the events sees the markup as it is, not as of the last frame.
   */
  private readNow() {
    this.onMutations(this.observer.takeRecords());
    if (this.frame !== undefined) this.flush();
  }

  /** Watches the layout's width, so the Calendars menu can close when its button is hidden */
  private observeLayout() {
    const layout = this.el.shadowRoot?.querySelector(".calendar-layout");
    if (!layout) return;
    this.layoutObserver ??= new ResizeObserver(() => this.closeSourcesMenuIfHidden());
    this.layoutObserver.observe(layout);
  }

  /** An open Calendars menu closes when the button that opens it is hidden, as when the calendar widens */
  private closeSourcesMenuIfHidden() {
    const button = this.el.shadowRoot?.querySelector<HTMLElement>("#sources-button");
    if (button?.checkVisibility()) return;
    this.el.shadowRoot?.querySelector<HTMLOrbMenuElement>("orb-menu[part~='sources-menu']")?.hide();
  }

  /** Choosing a calendar in the Calendars menu shows or hides it, as its checkbox in the sidebar does */
  private onSourceSelect = (event: CustomEvent<{ item: HTMLOrbMiElement; value?: string; checked: boolean }>) => {
    const { item, value, checked } = event.detail;
    if (!value) return;
    // Checked means shown. A canceled change puts the item back, since the calendar doesn't render again for it.
    if (!this.toggleCalendar(value, !checked)) item.checked = !checked;
  };

  /**
   * Shows or hides a calendar, by writing `hidden` on its source element, so the
   * sidebar and the markup agree. Returns false when a listener canceled the
   * change. The calendar follows the element on the next frame.
   */
  private toggleCalendar = (id: string, hidden: boolean): boolean => {
    const source = this.sources.find((cal) => cal.id === id);
    const emitted = this.orbSourceToggle.emit({
      id,
      name: source?.name ?? id,
      hidden,
      source: this.sourceEls.get(id),
    });
    if (emitted.defaultPrevented) return false;
    this.sourceEls.get(id)?.toggleAttribute("hidden", hidden);
    return true;
  };

  private colorFor = (occ: OrbCalendarOccurrence) => {
    if (occ.event.color) return resolveColor(occ.event.color);
    const cal = this.sources.find((c) => c.id === occ.event.calendarId);
    return resolveColor(cal?.color ?? this.sources[0]?.color);
  };

  private visibleOccurrences(range: OrbCalendarRange) {
    const hidden = new Set(
      this.sources.filter(this.isHidden).map((c) => c.id),
    );
    const occs = expandOccurrences(this.items as OrbCalendarEvent[], range);
    return hidden.size
      ? occs.filter((o) => !hidden.has(o.event.calendarId ?? this.sources[0]?.id))
      : occs;
  }

  private openCreate(draft: OrbCalendarEvent) {
    this.editorEvent = draft;
    this.editorMode = "create";
    this.editorPreset = undefined;
    this.editorOccurrence = null;
    this.editorOpen = true;
  }

  private onDayClick = (dayStart: number) => {
    if (!this.editable) return;
    this.openCreate({
      id: "",
      title: "",
      start: dayStart,
      end: nextDay(dayStart),
      allDay: true,
      calendarId: this.sources[0]?.id,
    });
  };

  private onSlotClick = (start: number) => {
    if (!this.editable) return;
    this.openCreate({
      id: "",
      title: "",
      start,
      end: start + HOUR,
      allDay: false,
      calendarId: this.sources[0]?.id,
    });
  };

  private onEventClick = (occ: OrbCalendarOccurrence, ev: MouseEvent) => {
    if (Date.now() - this.lastInteractEnd < 300) return;
    const element = this.elementOf.get(occ.event) ?? this.el;
    const emitted = this.orbEventClick.emit({ occurrence: occ, nativeEvent: ev, element });
    if (emitted.defaultPrevented || !this.editable || occ.event.readonly) return;
    this.editorEvent = { ...occ.event, start: occ.start, end: occ.end };
    this.editorMode = "edit";
    this.editorPreset = undefined;
    this.editorOccurrence = occ;
    this.editorOpen = true;
  };

  private onMoreClick = (dayStart: number) => {
    this.setDate(dayStart);
    this.setView("day");
  };

  private patch = (p: Partial<OrbCalendarEvent>) => {
    if (this.editorEvent) this.editorEvent = { ...this.editorEvent, ...p };
  };

  /** Picking a Repeat preset sets its rule, and remembers the choice */
  private pickPreset = (key: string) => {
    this.editorPreset = key;
    this.patch({ recurrence: ruleFor(key, this.editorEvent?.recurrence) });
  };

  private closeEditor = () => {
    this.editorOpen = false;
  };

  /** Clears the draft once the editor has finished closing. */
  private onEditorDismiss = (e: Event) => {
    if (e.target !== e.currentTarget) return;
    this.editorOpen = false;
    this.editorEvent = undefined;
    this.editorPreset = undefined;
    this.editorOccurrence = null;
  };

  /** Asks which occurrences a change to a recurring event applies to */
  private promptScope(action: "edit" | "delete") {
    return new Promise<OrbRecurrenceScope | null>((resolve) => {
      this.scopeResolver = resolve;
      this.scopeAction = action;
      this.scopeOpen = true;
    });
  }

  private resolveScope(scope: OrbRecurrenceScope | null) {
    const resolve = this.scopeResolver;
    this.scopeResolver = undefined;
    this.scopeOpen = false;
    resolve?.(scope);
  }

  /**
   * Emits an update, asking for a scope first when the event repeats. Says how
   * it ended, which is "gone" when the app removed the event while the editor was open.
   */
  private async commitUpdate(
    occ: OrbCalendarOccurrence | null,
    working: OrbCalendarEvent,
  ): Promise<CommitStatus> {
    // The app may have removed the event since the editor opened. Read from the
    // children rather than the last render, since the app can change them itself.
    const children = Array.from(this.el.children) as HTMLElement[];
    const element = occ
      ? (this.elementFor(occ) ??
        children.find(
          (child) =>
            child.tagName === "ORB-CALENDAR-EVENT" &&
            (child.id === occ.event.id || child.id === occ.masterId),
        ))
      : undefined;
    if (occ && !element) return "gone";
    let mutation: OrbCalendarMutation;
    if (occ?.isRecurring) {
      const scope = await this.promptScope("edit");
      if (!scope) return "dismissed";
      mutation = { event: working, scope, occurrenceStart: occ.occurrenceStart };
    } else {
      mutation = { event: working, scope: "single" };
    }
    this.change("update", mutation, element ?? this.el);
    return "done";
  }

  /** The element of the event the user acted on: an override's, else the master's */
  private elementFor(occ: OrbCalendarOccurrence) {
    return this.eventEls.get(occ.event.id) ?? this.eventEls.get(occ.masterId);
  }


  private save = async () => {
    const working = this.editorEvent;
    if (!working) return;
    if (this.editorMode === "create") {
      // A new event needs an id before it's written, and before a listener sees it
      const event = { ...working, id: working.id || newEventId() };
      this.change("create", { event, scope: "single" }, createEventElement(event));
    } else {
      // A dismissed scope prompt returns to the editor: the question was dismissed, not the edit
      if ((await this.commitUpdate(this.editorOccurrence, working)) === "dismissed") return;
    }
    this.closeEditor();
  };

  private deleteEvent = async () => {
    const working = this.editorEvent;
    if (!working) return;
    const occ = this.editorOccurrence;
    const element = (occ ? this.elementFor(occ) : undefined) ?? this.eventEls.get(working.id);
    if (!element) {
      // The app removed it while the editor was open
      this.closeEditor();
      return;
    }
    let mutation: OrbCalendarMutation;
    if (occ?.isRecurring) {
      const scope = await this.promptScope("delete");
      if (!scope) return;
      mutation = { event: working, scope, occurrenceStart: occ.occurrenceStart };
    } else {
      mutation = { event: working, scope: "single" };
    }
    this.change("delete", mutation, element);
    this.closeEditor();
  };

  private registerScroll = (el: HTMLElement | null) => {
    this.scrollEl = el ?? undefined;
  };

  private title() {
    if (this.view === "day") return format(this.anchor, "EEEE, MMMM d, yyyy");
    if (this.view === "month") return format(this.anchor, "MMMM yyyy");
    const range = this.currentRange();
    return `${format(range.start, "MMM d")} – ${format(range.end, "MMM d, yyyy")}`;
  }

  private renderView(range: OrbCalendarRange) {
    const occurrences = this.visibleOccurrences(range);
    this.lastOccurrences = occurrences;
    if (this.view === "month") {
      return (
        <MonthView
          date={this.anchor}
          rangeStart={range.start}
          rangeEnd={range.end}
          occurrences={occurrences}
          colorFor={this.colorFor}
          today={this.now}
          onDayClick={this.onDayClick}
          onEventClick={this.onEventClick}
          onMoreClick={this.onMoreClick}
        />
      );
    }
    const days =
      this.view === "day"
        ? [startOfDay(this.anchor).getTime()]
        : daysInRange(range);
    return (
      <TimeGrid
        days={days}
        occurrences={occurrences}
        colorFor={this.colorFor}
        now={this.now}
        showTimes={this.view === "day"}
        dayStartHour={this.dayStartHour}
        dayEndHour={this.dayEndHour}
        onSlotClick={this.onSlotClick}
        onEventClick={this.onEventClick}
        registerScroll={this.registerScroll}
      />
    );
  }

  private renderEditor() {
    const editing = this.editorMode === "edit";
    return (
      <orb-overlay open={this.editorOpen} onOrbDismiss={this.onEditorDismiss}>
        {this.editorEvent && (
          <orb-view label={editing ? "Edit Event" : "New Event"}>
            <EventEditor
              event={this.editorEvent}
              calendars={this.sources}
              isRecurringInstance={!!this.editorOccurrence?.isRecurring}
              preset={this.editorPreset}
              onPreset={this.pickPreset}
              onPatch={this.patch}
            />
            <orb-toolbar slot="footer" flank>
              {editing && (
                <orb-button fill="outline" color="danger" onClick={this.deleteEvent}>
                  Delete
                </orb-button>
              )}
              <orb-button slot="end" fill="outline" onClick={this.closeEditor}>
                Cancel
              </orb-button>
              <orb-button slot="end" color="primary" onClick={this.save}>
                Save
              </orb-button>
            </orb-toolbar>
          </orb-view>
        )}
      </orb-overlay>
    );
  }

  private renderScopePrompt() {
    const deleting = this.scopeAction === "delete";
    return (
      <orb-overlay
        size="sm"
        open={this.scopeOpen}
        onOrbDismiss={(e: Event) => {
          if (e.target === e.currentTarget) this.resolveScope(null);
        }}
      >
        <orb-view label={deleting ? "Delete Recurring Event" : "Save Recurring Event"}>
          <p class="scope-message">
            This is a repeating event. Which occurrences should change?
          </p>
          <orb-toolbar slot="footer" class="scope-buttons" space="xs">
            <orb-button fill="outline" onClick={() => this.resolveScope("occurrence")}>
              This Event
            </orb-button>
            <orb-button fill="outline" onClick={() => this.resolveScope("future")}>
              All Future Events
            </orb-button>
            <orb-button
              color={deleting ? "danger" : "primary"}
              onClick={() => this.resolveScope("all")}
            >
              All Events
            </orb-button>
          </orb-toolbar>
        </orb-view>
      </orb-overlay>
    );
  }

  render() {
    const range = this.currentRange();

    return (
      <Host>
        <div class="calendar-layout">
          {this.showSidebar && (
            <Sidebar
              date={this.anchor}
              calendars={this.sources}
              isHidden={this.isHidden}
              onDateChange={this.setDate}
              onToggleCalendar={this.toggleCalendar}
            />
          )}
          <div class="calendar-main">
            <div class="header" part="header">
              {this.showSidebar &&
                this.sources.length > 0 && [
                  <orb-button
                    id="sources-button"
                    class="sources-button icon-only"
                    part="sources-button"
                    fill="clear"
                    aria-label="Calendars"
                  >
                    <CalendarIcon />
                  </orb-button>,
                  <orb-menu
                    for="sources-button"
                    label="Calendars"
                    part="sources-menu"
                    onOrbSelect={this.onSourceSelect}
                  >
                    {this.sources.map((cal) => (
                      <orb-mi type="checkbox" value={cal.id} checked={!cal.hidden}>
                        <span slot="icon" class="calendar-dot" style={{ background: resolveColor(cal.color) }} />
                        {cal.name}
                      </orb-mi>
                    ))}
                  </orb-menu>,
                ]}
              <div class="title" role="heading" aria-level="2" aria-live="polite">
                {this.title()}
              </div>
              <orb-radio-group
                class="view-switcher"
                part="view-switcher"
                aria-label="View"
                buttons
                value={this.view}
                onOrbValueChange={(e: CustomEvent<OrbCalendarView>) => this.setView(e.detail)}
              >
                <orb-radio value="day">Day</orb-radio>
                <orb-radio value="week">Week</orb-radio>
                <orb-radio value="month">Month</orb-radio>
              </orb-radio-group>
              <div class="nav">
                <orb-button
                  fill="clear"
                  class="icon-only"
                  aria-label={`Previous ${this.view}`}
                  onClick={() => this.prev()}
                >
                  <ChevronLeftIcon />
                </orb-button>
                <orb-button size="sm" fill="outline" onClick={() => this.goToToday()}>
                  Today
                </orb-button>
                <orb-button
                  fill="clear"
                  class="icon-only"
                  aria-label={`Next ${this.view}`}
                  onClick={() => this.next()}
                >
                  <ChevronRightIcon />
                </orb-button>
              </div>
            </div>
            {this.renderView(range)}
          </div>
        </div>
        {this.renderEditor()}
        {this.renderScopePrompt()}
      </Host>
    );
  }
}
