import { OrbCalendarSource } from "../utils/types";
import { resolveColor } from "../utils/color";

export interface SidebarProps {
  date: number;
  calendars: OrbCalendarSource[];
  isHidden: (cal: OrbCalendarSource) => boolean;
  onDateChange: (date: number) => void;
  /** Shows or hides a calendar. Returns false when the change was canceled. */
  onToggleCalendar: (id: string, hidden: boolean) => boolean;
}

export function Sidebar(props: SidebarProps) {
  return (
    <aside class="sidebar" part="sidebar">
      {props.calendars.length > 0 && (
        <orb-checkbox-group class="calendar-list" part="calendar-list">
          <span slot="label" class="sidebar-heading">
            Calendars
          </span>
          {props.calendars.map((cal) => (
            <orb-checkbox
              class="calendar-item"
              checked={props.isHidden(cal) ? "false" : "true"}
              onOrbCheckedChange={(e: CustomEvent<string>) => {
                const hidden = e.detail !== "true";
                if (props.onToggleCalendar(cal.id, hidden)) return;
                // Canceled, so the box goes back to what the calendar has. The
                // box toggles itself, and the same value isn't written again.
                (e.currentTarget as HTMLOrbCheckboxElement).checked = props.isHidden(cal)
                  ? "false"
                  : "true";
              }}
            >
              <span class="calendar-dot" style={{ background: resolveColor(cal.color) }} />
              {cal.name}
            </orb-checkbox>
          ))}
        </orb-checkbox-group>
      )}
      <orb-datepicker
        class="mini-month"
        part="mini-month"
        type="date"
        value={props.date}
        onOrbValueChange={(e: CustomEvent<number | undefined>) => {
          if (e.detail != null) props.onDateChange(e.detail);
        }}
      />
    </aside>
  );
}
