import {
  Component,
  Element,
  Event,
  EventEmitter,
  Host,
  Method,
  Prop,
  State,
  Watch,
} from "@stencil/core";
import interact from "interactjs";
import { format, startOfDay } from "date-fns";
import {
  OrbCalendarEvent,
  OrbCalendarEventClickDetail,
  OrbCalendarMutation,
  OrbCalendarOccurrence,
  OrbCalendarRange,
  OrbCalendarSource,
  OrbCalendarView,
  OrbRecurrenceScope,
  OrbWeekStart,
} from "./utils/types";
import { daysInRange, nextDay, rangeForView, step } from "./utils/datetime";
import { expandOccurrences } from "./utils/recurrence";
import { buildICS } from "./utils/ics";
import { resolveColor } from "./utils/color";
import { ChevronLeftIcon, ChevronRightIcon } from "../../utils/icons";
import { MonthView } from "./views/month-view";
import { TimeGrid } from "./views/time-grid";
import { Sidebar } from "./views/sidebar";
import { EventEditor } from "./views/event-editor";

const HOUR = 60 * 60 * 1000;

/**
 * A full calendar with day, week, and month views, multiple named calendars,
 * all-day and recurring (RRULE) events with per-occurrence editing, drag and
 * resize, and ICS export. Times are in the browser's local time zone.
 *
 * The host owns the `events` array. The calendar emits change requests
 * (`orbEventCreate`, `orbEventUpdate`, `orbEventDelete`). Apply them with the exported
 * `applyEventChange` helper and assign the result back to `events`.
 *
 * @part header - The top toolbar
 * @part view-switcher - The day/week/month control
 * @part sidebar - The sidebar with the calendar list and mini month
 * @part calendar-list - The list of calendars in the sidebar
 * @part mini-month - The datepicker in the sidebar
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

  /** The events to display. Owned by the host. The calendar never mutates it. */
  @Prop() events: OrbCalendarEvent[] = [];

  /** Named calendars and their colors. Without any, there's one implicit calendar. */
  @Prop() calendars: OrbCalendarSource[] = [];

  /** The active view */
  @Prop({ mutable: true, reflect: true }) view: OrbCalendarView = "month";

  /** The anchor date (epoch ms) that decides which range is shown */
  @Prop({ mutable: true }) date: number = Date.now();

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

  /** Emitted when the user saves a new event */
  @Event({ bubbles: false }) orbEventCreate: EventEmitter<OrbCalendarMutation>;

  /** Emitted when the user edits, drags, or resizes an event */
  @Event({ bubbles: false }) orbEventUpdate: EventEmitter<OrbCalendarMutation>;

  /** Emitted when the user deletes an event */
  @Event({ bubbles: false }) orbEventDelete: EventEmitter<OrbCalendarMutation>;

  /** Re-render tick for the now-line */
  @State() now = Date.now();
  @State() editorOpen = false;
  @State() editorEvent?: OrbCalendarEvent;

  /** Show/hide choices from the sidebar, kept separate so `calendars` isn't mutated */
  @State() hiddenOverrides = new Map<string, boolean>();

  @State() scopeOpen = false;
  @State() scopeAction: "edit" | "delete" = "edit";
  private scopeResolver?: (scope: OrbRecurrenceScope | null) => void;

  private editorMode: "create" | "edit" = "create";
  private editorOccurrence: OrbCalendarOccurrence | null = null;
  /** When the last drag or resize ended, to ignore the click that follows it */
  private lastInteractEnd = 0;
  private nowTimer?: ReturnType<typeof setInterval>;
  private lastRange?: OrbCalendarRange;
  private lastOccurrences: OrbCalendarOccurrence[] = [];
  private scrollEl?: HTMLElement;
  private lastScrollKey = "";

  connectedCallback() {
    this.nowTimer = setInterval(() => (this.now = Date.now()), 60_000);
  }

  componentDidLoad() {
    this.setupInteract();
    this.emitRangeIfChanged();
  }

  disconnectedCallback() {
    clearInterval(this.nowTimer);
    this.teardownInteract();
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
      const key = `${this.view}:${this.date}`;
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
  }

  /** Goes to today */
  @Method()
  async goToToday() {
    this.setDate(Date.now());
  }

  /** Moves forward one day, week, or month, depending on the view */
  @Method()
  async next() {
    this.setDate(step(this.date, this.view, 1));
  }

  /** Moves back one day, week, or month, depending on the view */
  @Method()
  async prev() {
    this.setDate(step(this.date, this.view, -1));
  }

  /** Goes to the given date (epoch ms) */
  @Method()
  async goToDate(date: number) {
    this.setDate(date);
  }

  /** Builds a VCALENDAR string of all events, or only those in `calendarIds` */
  @Method()
  async exportICS(opts?: { calendarIds?: string[] }): Promise<string> {
    return buildICS(this.events, { calendarIds: opts?.calendarIds, now: Date.now() });
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

  private currentRange() {
    return rangeForView(this.date, this.view, this.weekStartsOn);
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

  private isHidden = (cal: OrbCalendarSource) =>
    this.hiddenOverrides.get(cal.id) ?? !!cal.hidden;

  private toggleCalendar = (id: string, hidden: boolean) => {
    this.hiddenOverrides = new Map(this.hiddenOverrides).set(id, hidden);
  };

  private colorFor = (occ: OrbCalendarOccurrence) => {
    if (occ.event.color) return resolveColor(occ.event.color);
    const cal = this.calendars.find((c) => c.id === occ.event.calendarId);
    return resolveColor(cal?.color ?? this.calendars[0]?.color);
  };

  private visibleOccurrences(range: OrbCalendarRange) {
    const hidden = new Set(
      this.calendars.filter(this.isHidden).map((c) => c.id),
    );
    const occs = expandOccurrences(this.events, range);
    return hidden.size
      ? occs.filter((o) => !hidden.has(o.event.calendarId ?? this.calendars[0]?.id))
      : occs;
  }

  private openCreate(draft: OrbCalendarEvent) {
    this.editorEvent = draft;
    this.editorMode = "create";
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
      calendarId: this.calendars[0]?.id,
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
      calendarId: this.calendars[0]?.id,
    });
  };

  private onEventClick = (occ: OrbCalendarOccurrence, ev: MouseEvent) => {
    if (Date.now() - this.lastInteractEnd < 300) return;
    const emitted = this.orbEventClick.emit({ occurrence: occ, nativeEvent: ev });
    if (emitted.defaultPrevented || !this.editable || occ.event.readonly) return;
    this.editorEvent = { ...occ.event, start: occ.start, end: occ.end };
    this.editorMode = "edit";
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

  private closeEditor = () => {
    this.editorOpen = false;
  };

  /** Clears the draft once the editor has finished closing. */
  private onEditorDismiss = (e: Event) => {
    if (e.target !== e.currentTarget) return;
    this.editorOpen = false;
    this.editorEvent = undefined;
    this.editorOccurrence = null;
  };

  /** Asks which occurrences a change to a recurring event applies to. */
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

  /** Emits an update, asking for a scope first when the event repeats. */
  private async commitUpdate(
    occ: OrbCalendarOccurrence | null,
    working: OrbCalendarEvent,
  ) {
    if (occ?.isRecurring) {
      const scope = await this.promptScope("edit");
      if (!scope) return false;
      this.orbEventUpdate.emit({
        event: working,
        scope,
        occurrenceStart: occ.occurrenceStart,
      });
    } else {
      this.orbEventUpdate.emit({ event: working, scope: "single" });
    }
    return true;
  }

  private save = async () => {
    const working = this.editorEvent;
    if (!working) return;
    if (this.editorMode === "create") {
      this.orbEventCreate.emit({ event: working, scope: "single" });
    } else if (!(await this.commitUpdate(this.editorOccurrence, working))) {
      return;
    }
    this.closeEditor();
  };

  private deleteEvent = async () => {
    const working = this.editorEvent;
    if (!working) return;
    const occ = this.editorOccurrence;
    if (occ?.isRecurring) {
      const scope = await this.promptScope("delete");
      if (!scope) return;
      this.orbEventDelete.emit({
        event: working,
        scope,
        occurrenceStart: occ.occurrenceStart,
      });
    } else {
      this.orbEventDelete.emit({ event: working, scope: "single" });
    }
    this.closeEditor();
  };

  private registerScroll = (el: HTMLElement | null) => {
    this.scrollEl = el ?? undefined;
  };

  private title() {
    if (this.view === "day") return format(this.date, "EEEE, MMMM d, yyyy");
    if (this.view === "month") return format(this.date, "MMMM yyyy");
    const range = this.currentRange();
    return `${format(range.start, "MMM d")} – ${format(range.end, "MMM d, yyyy")}`;
  }

  private renderView(range: OrbCalendarRange) {
    const occurrences = this.visibleOccurrences(range);
    this.lastOccurrences = occurrences;
    if (this.view === "month") {
      return (
        <MonthView
          date={this.date}
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
        ? [startOfDay(this.date).getTime()]
        : daysInRange(range);
    return (
      <TimeGrid
        days={days}
        occurrences={occurrences}
        colorFor={this.colorFor}
        now={this.now}
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
              calendars={this.calendars}
              isRecurringInstance={!!this.editorOccurrence?.isRecurring}
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
              date={this.date}
              calendars={this.calendars}
              isHidden={this.isHidden}
              onDateChange={this.setDate}
              onToggleCalendar={this.toggleCalendar}
            />
          )}
          <div class="calendar-main">
            <div class="header" part="header">
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
