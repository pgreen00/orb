import { startOfDay } from "date-fns";
import { OrbCalendarEvent, OrbCalendarSource } from "../utils/types";
import { formatRRule, parseRRule } from "../utils/recurrence";
import { fromInputValue, nextDay, toInputValue } from "../utils/datetime";

const WEEKDAYS = [
  { key: "SU", label: "S", name: "Sunday" },
  { key: "MO", label: "M", name: "Monday" },
  { key: "TU", label: "T", name: "Tuesday" },
  { key: "WE", label: "W", name: "Wednesday" },
  { key: "TH", label: "T", name: "Thursday" },
  { key: "FR", label: "F", name: "Friday" },
  { key: "SA", label: "S", name: "Saturday" },
];

const PRESETS: { key: string; label: string; rrule?: string }[] = [
  { key: "none", label: "Never", rrule: undefined },
  { key: "daily", label: "Every Day", rrule: "FREQ=DAILY" },
  { key: "weekly", label: "Every Week", rrule: "FREQ=WEEKLY" },
  { key: "weekdays", label: "Every Weekday", rrule: "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR" },
  { key: "monthly", label: "Every Month", rrule: "FREQ=MONTHLY" },
  { key: "yearly", label: "Every Year", rrule: "FREQ=YEARLY" },
  { key: "custom", label: "Custom…" },
];

const HOUR = 60 * 60 * 1000;

function presetFor(rrule?: string): string {
  if (!rrule) return "none";
  return PRESETS.find((p) => p.rrule && p.rrule === rrule)?.key ?? "custom";
}

const valueOf = (e: Event) =>
  (e.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).value;

export interface EventEditorProps {
  event: OrbCalendarEvent;
  calendars: OrbCalendarSource[];
  isRecurringInstance: boolean;
  onPatch: (patch: Partial<OrbCalendarEvent>) => void;
}

export function EventEditor(props: EventEditorProps) {
  const { event, calendars } = props;
  const allDay = !!event.allDay;
  const preset = presetFor(event.recurrence);
  const custom = preset === "custom";
  const opts: Record<string, any> = custom ? parseRRule(event.recurrence) : {};
  const inputType = allDay ? "date" : "datetime-local";

  const setRepeatPreset = (key: string) => {
    if (key === "custom") {
      props.onPatch({ recurrence: event.recurrence ?? "FREQ=WEEKLY" });
    } else {
      props.onPatch({ recurrence: PRESETS.find((p) => p.key === key)?.rrule });
    }
  };

  const patchRule = (patch: Record<string, any>) => {
    props.onPatch({ recurrence: formatRRule({ ...parseRRule(event.recurrence), ...patch }) });
  };

  // rrule weekdays run MO=0 to SU=6. The WEEKDAYS list runs SU to SA.
  const ruleWeekdays: number[] = Array.isArray(opts.byweekday)
    ? opts.byweekday.map((d: any) => (typeof d === "number" ? d : d.weekday))
    : [];
  const activeWeekdays = new Set(ruleWeekdays.map((d) => (d + 1) % 7));

  const toggleWeekday = (idx: number) => {
    const ruleIdx = (idx + 6) % 7;
    const next = ruleWeekdays.includes(ruleIdx)
      ? ruleWeekdays.filter((d) => d !== ruleIdx)
      : [...ruleWeekdays, ruleIdx];
    patchRule({ byweekday: next });
  };

  /** Snaps to whole days when switching to all-day, and to 9–10am when switching back. */
  const setAllDay = (next: boolean) => {
    const dayStart = startOfDay(event.start).getTime();
    if (next) {
      const lastDay = startOfDay(Math.max(event.end - 1, event.start)).getTime();
      props.onPatch({ allDay: true, start: dayStart, end: nextDay(lastDay) });
    } else {
      props.onPatch({ allDay: false, start: dayStart + 9 * HOUR, end: dayStart + 10 * HOUR });
    }
  };

  /** Moving the start keeps the event's duration. */
  const setStart = (value: string) => {
    if (!value) return;
    const start = fromInputValue(value, allDay);
    props.onPatch({ start, end: start + (event.end - event.start) });
  };

  const setEnd = (value: string) => {
    if (!value) return;
    let end = fromInputValue(value, allDay);
    // All-day inputs show the last day, but `end` is the day after it.
    if (allDay) end = nextDay(end);
    props.onPatch({ end });
  };

  // All-day `end` is exclusive, so the input shows the day before it.
  const endInputEpoch = allDay ? event.end - 1 : event.end;

  return (
    <div class="editor" part="editor">
      <orb-textbox label="Title">
        <input
          value={event.title}
          onInput={(e) => props.onPatch({ title: valueOf(e) })}
        />
      </orb-textbox>

      <orb-toggle
        checked={allDay}
        onCheckedChange={(e: CustomEvent<boolean>) => setAllDay(e.detail)}
      >
        All-day
      </orb-toggle>

      <div class="editor-dates">
        <orb-textbox label="Starts">
          <input
            type={inputType}
            value={toInputValue(event.start, allDay)}
            onChange={(e) => setStart(valueOf(e))}
          />
        </orb-textbox>
        <orb-textbox label="Ends">
          <input
            type={inputType}
            value={toInputValue(endInputEpoch, allDay)}
            onChange={(e) => setEnd(valueOf(e))}
          />
        </orb-textbox>
      </div>

      {calendars.length > 0 && (
        <orb-textbox label="Calendar">
          <select onChange={(e) => props.onPatch({ calendarId: valueOf(e) })}>
            {calendars.map((c) => (
              <option value={c.id} selected={c.id === (event.calendarId ?? calendars[0].id)}>
                {c.name}
              </option>
            ))}
          </select>
        </orb-textbox>
      )}

      <orb-textbox label="Repeat">
        <select onChange={(e) => setRepeatPreset(valueOf(e))}>
          {PRESETS.map((p) => (
            <option value={p.key} selected={p.key === preset}>
              {p.label}
            </option>
          ))}
        </select>
      </orb-textbox>

      {custom && (
        <div class="editor-custom">
          <orb-textbox label="Frequency">
            <select onChange={(e) => patchRule({ freq: Number(valueOf(e)) })}>
              {/* rrule frequencies: YEARLY=0, MONTHLY=1, WEEKLY=2, DAILY=3 */}
              {[
                ["3", "Daily"],
                ["2", "Weekly"],
                ["1", "Monthly"],
                ["0", "Yearly"],
              ].map(([value, label]) => (
                <option value={value} selected={String(opts.freq ?? 2) === value}>
                  {label}
                </option>
              ))}
            </select>
          </orb-textbox>
          <orb-textbox label="Every">
            <input
              type="number"
              min="1"
              value={String(opts.interval ?? 1)}
              onChange={(e) =>
                patchRule({ interval: Math.max(1, Number(valueOf(e)) || 1) })
              }
            />
          </orb-textbox>
          {Number(opts.freq ?? 2) === 2 && (
            <div class="editor-weekdays" role="group" aria-label="Repeat on">
              {WEEKDAYS.map((d, i) => (
                <button
                  type="button"
                  class={{ "weekday-pill": true, active: activeWeekdays.has(i) }}
                  aria-label={d.name}
                  aria-pressed={activeWeekdays.has(i) ? "true" : "false"}
                  onClick={() => toggleWeekday(i)}
                >
                  {d.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <orb-textbox label="Location">
        <input
          value={event.location ?? ""}
          onInput={(e) => props.onPatch({ location: valueOf(e) })}
        />
      </orb-textbox>
      <orb-textbox label="URL">
        <input
          type="url"
          value={event.url ?? ""}
          onInput={(e) => props.onPatch({ url: valueOf(e) })}
        />
      </orb-textbox>
      <orb-textbox label="Notes">
        <textarea
          value={event.notes ?? ""}
          onInput={(e) => props.onPatch({ notes: valueOf(e) })}
        />
      </orb-textbox>

      {props.isRecurringInstance && (
        <p class="editor-recurring-note">
          This is a repeating event. You'll choose which occurrences to change when you save.
        </p>
      )}
    </div>
  );
}
