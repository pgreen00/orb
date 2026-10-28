import { OrbCalendarSource } from "../utils/types";
import { resolveColor } from "../utils/color";

export interface SidebarProps {
  date: number;
  calendars: OrbCalendarSource[];
  isHidden: (cal: OrbCalendarSource) => boolean;
  onDateChange: (date: number) => void;
  onToggleCalendar: (id: string, hidden: boolean) => void;
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
              onOrbCheckedChange={(e: CustomEvent<string>) =>
                props.onToggleCalendar(cal.id, e.detail !== "true")
              }
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
