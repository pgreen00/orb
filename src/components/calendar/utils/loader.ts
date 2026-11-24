import { cleanFragment } from "../../channel/model/sanitize";
import { formatTime } from "./markup";
import type { OrbCalendarRange, OrbCalendarSource, OrbCalendarSourceLoadDetail } from "./types";

/** A source element, with its data as the calendar reads it */
export interface LoadableSource {
  el: HTMLElement;
  model: OrbCalendarSource;
}

/** What the loader needs from the calendar */
export interface SourceLoaderHooks {
  /** Emits `orbSourceLoad`. Returns false when a listener canceled the load. */
  emitLoad(detail: OrbCalendarSourceLoadDetail): boolean;
  /** Called with true when the first request starts, and with false when the last one ends */
  setBusy(busy: boolean): void;
}

/** What the loader knows about one source, for as long as the source is in the markup */
interface SourceState {
  /** The `href` this state is for. A change to it starts the state over. */
  href?: string;
  /**
   * Goes up when the href changes or the calendar stops. An answer from before
   * then is dropped, since it no longer counts.
   */
  generation: number;
  /** The ranges asked for under this href, loaded or loading. A failed one is taken out again. */
  ranges: OrbCalendarRange[];
  /** The requests on their way, which are aborted when they stop counting */
  requests: Set<AbortController>;
  /** The events this source loaded, which leave with it */
  elements: Set<HTMLElement>;
}

/**
 * Loads the events of `orb-calendar-source` elements that have an `href`, for the
 * range on screen. The events it loads are ordinary children of the calendar, so
 * the calendar reads and saves them like any others.
 */
export class SourceLoader {
  private readonly host: HTMLElement;
  private readonly hooks: SourceLoaderHooks;
  private readonly states = new Map<HTMLElement, SourceState>();
  /** Requests on their way, across every source */
  private pending = 0;

  constructor(host: HTMLElement, hooks: SourceLoaderHooks) {
    this.host = host;
    this.hooks = hooks;
  }

  /**
   * Brings the states in line with the sources, then asks for `wanted` from each
   * visible source with an `href` whose range isn't covered yet.
   */
  sync(sources: LoadableSource[], wanted: OrbCalendarRange) {
    const present = new Set(sources.map((source) => source.el));
    for (const [el, state] of this.states) {
      if (present.has(el)) continue;
      this.halt(state);
      this.clear(state);
      this.states.delete(el);
    }
    for (const { el, model } of sources) {
      let state = this.states.get(el);
      if (!state) {
        state = { generation: 0, ranges: [], requests: new Set(), elements: new Set() };
        this.states.set(el, state);
      }
      if (state.href !== model.href) {
        // A new href starts over: the old answers are dropped, and what they loaded leaves
        this.halt(state);
        this.clear(state);
        state.href = model.href;
      }
      // A hidden calendar waits until it's shown, and a source without an href has no server
      if (!model.href || model.hidden) continue;
      this.ensure(el, state, model.id, model.href, wanted);
    }
  }

  /** Stops every request, for a calendar that leaves the document. Its ranges are asked for again when it's back. */
  stop() {
    for (const state of this.states.values()) this.halt(state);
  }

  /** Asks for a range unless it's covered already, and calls the hook before the request goes out */
  private ensure(el: HTMLElement, state: SourceState, id: string, href: string, wanted: OrbCalendarRange) {
    if (state.ranges.some((range) => range.start <= wanted.start && range.end >= wanted.end)) return;
    state.ranges.push(wanted);
    const url = href
      .replace(/\{start\}/g, encodeURIComponent(formatTime(wanted.start)))
      .replace(/\{end\}/g, encodeURIComponent(formatTime(wanted.end)));
    // Counted as loaded before the hook, so a listener that cancels the load isn't asked again
    if (!this.hooks.emitLoad({ id, source: el, start: wanted.start, end: wanted.end, url })) return;
    this.request(state, id, url, wanted);
  }

  private request(state: SourceState, id: string, url: string, range: OrbCalendarRange) {
    const generation = state.generation;
    const controller = new AbortController();
    state.requests.add(controller);
    this.pending++;
    if (this.pending === 1) this.hooks.setBusy(true);
    fetch(url, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`The server answered ${response.status}`);
        return response.text();
      })
      .then((html) => {
        if (state.generation === generation) this.receive(state, id, url, html);
      })
      .catch((error: unknown) => {
        // A request that was stopped, or whose href changed, isn't a failure
        if (controller.signal.aborted || state.generation !== generation) return;
        // Taken out again, so the range is asked for the next time it's shown
        state.ranges = state.ranges.filter((covered) => covered !== range);
        console.warn(`orb-calendar: could not load the events of "${id}" from ${url}`, error);
      })
      .finally(() => {
        state.requests.delete(controller);
        this.pending--;
        if (this.pending === 0) this.hooks.setBusy(false);
      });
  }

  /** Adds the events of an answer: one with the id of an event shown takes its place, and the rest go after the last event */
  private receive(state: SourceState, id: string, url: string, html: string) {
    const template = document.createElement("template");
    template.innerHTML = html;
    // Scripts and event handler attributes go, as they do for a channel's messages
    cleanFragment(template.content);
    const incoming: HTMLElement[] = [];
    let others = 0;
    for (const child of Array.from(template.content.children) as HTMLElement[]) {
      if (child.tagName !== "ORB-CALENDAR-EVENT") {
        others++;
        continue;
      }
      // An event that names no calendar joins the source that loaded it
      if (!child.hasAttribute("calendar-id")) child.setAttribute("calendar-id", id);
      incoming.push(child);
    }
    if (others) {
      console.warn(`orb-calendar: ${others} element(s) from ${url} aren't orb-calendar-event, so they're left out.`);
    }

    const added: HTMLElement[] = [];
    for (const child of incoming) {
      state.elements.add(child);
      const shown = child.id ? this.eventNamed(child.id) : undefined;
      if (shown) shown.replaceWith(child);
      else added.push(child);
    }
    if (!added.length) return;
    const events = Array.from(this.host.children).filter((child) => child.tagName === "ORB-CALENDAR-EVENT");
    const last = events[events.length - 1];
    if (last) last.after(...added);
    else this.host.append(...added);
  }

  private eventNamed(id: string) {
    return Array.from(this.host.children).find(
      (child) => child.tagName === "ORB-CALENDAR-EVENT" && child.id === id,
    ) as HTMLElement | undefined;
  }

  /** Aborts a source's requests, and drops their answers. The ranges go too, so they're asked for again. */
  private halt(state: SourceState) {
    state.generation++;
    for (const controller of state.requests) controller.abort();
    state.requests.clear();
    state.ranges = [];
  }

  /** Removes the events a source loaded. One the user has already deleted or replaced is out of the markup, and removing it again does nothing. */
  private clear(state: SourceState) {
    for (const el of state.elements) el.remove();
    state.elements.clear();
  }
}
