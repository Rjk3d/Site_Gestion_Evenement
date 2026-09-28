import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  addDaysUTC,
  addMonthsUTC,
  formatDayLabel,
  formatMonthLabel,
  getWeekDays,
  toISODate,
} from "@/lib/calendar-utils";

export type PlanningView = "month" | "week" | "day";

function buildHref(view: PlanningView, date: Date) {
  return `/planning?view=${view}&date=${toISODate(date)}`;
}

export function CalendarHeader({ view, date, today }: { view: PlanningView; date: Date; today: Date }) {
  let label: string;
  let prevDate: Date;
  let nextDate: Date;

  if (view === "month") {
    label = formatMonthLabel(date);
    prevDate = addMonthsUTC(date, -1);
    nextDate = addMonthsUTC(date, 1);
  } else if (view === "week") {
    const days = getWeekDays(date);
    const first = days[0];
    const last = days[6];
    label =
      first.getUTCMonth() === last.getUTCMonth()
        ? `${first.getUTCDate()} - ${last.getUTCDate()} ${formatMonthLabel(first)}`
        : `${first.getUTCDate()} ${formatMonthLabel(first)} - ${last.getUTCDate()} ${formatMonthLabel(last)}`;
    prevDate = addDaysUTC(date, -7);
    nextDate = addDaysUTC(date, 7);
  } else {
    label = formatDayLabel(date);
    prevDate = addDaysUTC(date, -1);
    nextDate = addDaysUTC(date, 1);
  }

  const tabClass = (active: boolean) =>
    `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
      active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted"
    }`;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <Link
          href={buildHref(view, prevDate)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted"
          aria-label="Précédent"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <Link
          href={buildHref(view, nextDate)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted"
          aria-label="Suivant"
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
        <Link
          href={buildHref(view, today)}
          className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted"
        >
          Aujourd&apos;hui
        </Link>
        <h1 className="ml-2 text-lg font-semibold capitalize text-foreground">{label}</h1>
      </div>

      <div className="flex items-center gap-1 rounded-lg border border-border p-1">
        <Link href={buildHref("month", date)} className={tabClass(view === "month")}>
          Mois
        </Link>
        <Link href={buildHref("week", date)} className={tabClass(view === "week")}>
          Semaine
        </Link>
        <Link href={buildHref("day", date)} className={tabClass(view === "day")}>
          Jour
        </Link>
      </div>
    </div>
  );
}
