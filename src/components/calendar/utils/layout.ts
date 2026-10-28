import { OrbCalendarOccurrence } from "./types";
import { nextDay, overlaps, sameDay } from "./datetime";

/** Whether an occurrence renders as a spanning bar: all-day, or crossing midnight. */
export function isSpanningBar(occ: OrbCalendarOccurrence): boolean {
  return occ.allDay || !sameDay(occ.start, occ.end - 1);
}

export interface SpanningBar {
  occ: OrbCalendarOccurrence;
  colStart: number;
  colSpan: number;
  lane: number;
  continuesLeft: boolean;
  continuesRight: boolean;
}

/**
 * Lays out all-day and multi-day events as bars across a row of consecutive
 * days: a month week, or the all-day row in week view. Returns each bar's
 * column span and lane, plus the number of lanes.
 */
export function layoutSpanningBars(
  days: number[],
  occurrences: OrbCalendarOccurrence[],
): { bars: SpanningBar[]; lanes: number } {
  const rowStart = days[0];
  const rowEnd = nextDay(days[days.length - 1]);
  const spanning = occurrences
    .filter((o) => isSpanningBar(o) && overlaps(o.start, o.end, rowStart, rowEnd))
    .sort((a, b) => a.start - b.start || b.end - b.start - (a.end - a.start));

  const lanes: SpanningBar[][] = [];
  const bars: SpanningBar[] = [];

  for (const occ of spanning) {
    let colStart = days.findIndex((d) => sameDay(d, occ.start) || d > occ.start);
    if (colStart === -1 || occ.start < rowStart) colStart = 0;
    let colEnd = -1;
    for (let i = days.length - 1; i >= 0; i--) {
      if (occ.start < nextDay(days[i]) && occ.end > days[i]) {
        colEnd = i;
        break;
      }
    }
    if (colEnd === -1) colEnd = colStart;
    const colSpan = Math.max(1, colEnd - colStart + 1);

    let lane = lanes.findIndex(
      (laneBars) =>
        !laneBars.some(
          (b) => colStart < b.colStart + b.colSpan && b.colStart < colStart + colSpan,
        ),
    );
    if (lane === -1) {
      lane = lanes.length;
      lanes.push([]);
    }

    const bar: SpanningBar = {
      occ,
      colStart,
      colSpan,
      lane,
      continuesLeft: occ.start < rowStart,
      continuesRight: occ.end > rowEnd,
    };
    lanes[lane].push(bar);
    bars.push(bar);
  }

  return { bars, lanes: lanes.length };
}

export interface PositionedOccurrence {
  occurrence: OrbCalendarOccurrence;
  /** Fraction from the left of the day column, 0 to 1. */
  leftPct: number;
  /** Fraction of the column width, 0 to 1. */
  widthPct: number;
}

/**
 * Lays out overlapping timed events in one day column. Events that overlap,
 * directly or through each other, form a cluster. Each event takes the first
 * free column in its cluster, and the cluster's width is split evenly.
 */
export function layoutDayColumn(
  occurrences: OrbCalendarOccurrence[],
): PositionedOccurrence[] {
  const sorted = [...occurrences].sort(
    (a, b) => a.start - b.start || b.end - a.end,
  );
  const out: PositionedOccurrence[] = [];

  let cluster: OrbCalendarOccurrence[] = [];
  let clusterEnd = -Infinity;

  const flush = () => {
    if (!cluster.length) return;
    // The end time of the last event placed in each column.
    const columnEnds: number[] = [];
    const colOf = new Map<OrbCalendarOccurrence, number>();
    for (const occ of cluster) {
      let col = columnEnds.findIndex((end) => end <= occ.start);
      if (col === -1) {
        col = columnEnds.length;
        columnEnds.push(occ.end);
      } else {
        columnEnds[col] = occ.end;
      }
      colOf.set(occ, col);
    }
    const cols = columnEnds.length;
    for (const occ of cluster) {
      out.push({
        occurrence: occ,
        leftPct: colOf.get(occ)! / cols,
        widthPct: 1 / cols,
      });
    }
    cluster = [];
    clusterEnd = -Infinity;
  };

  for (const occ of sorted) {
    if (cluster.length && occ.start >= clusterEnd) flush();
    cluster.push(occ);
    clusterEnd = Math.max(clusterEnd, occ.end);
  }
  flush();

  return out;
}
