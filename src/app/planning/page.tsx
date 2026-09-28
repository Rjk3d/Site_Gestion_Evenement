import { getDefaultPlanningDate, getSessionsForRange } from "@/lib/planning-data";
import {
  getMonthGridDays,
  getWeekDays,
  parseISODate,
  startOfMonthUTC,
} from "@/lib/calendar-utils";
import { CalendarHeader, type PlanningView } from "@/components/planning/calendar-header";
import { MonthView } from "@/components/planning/month-view";
import { WeekView } from "@/components/planning/week-view";
import { DayView } from "@/components/planning/day-view";

function todayUTC() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export default async function PlanningPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string }>;
}) {
  const params = await searchParams;
  const view: PlanningView = params.view === "week" || params.view === "day" ? params.view : "month";
  const today = todayUTC();
  const date = params.date ? parseISODate(params.date) : await getDefaultPlanningDate();

  let rangeStart: Date;
  let rangeEnd: Date;

  if (view === "month") {
    const days = getMonthGridDays(date);
    rangeStart = days[0];
    rangeEnd = days[days.length - 1];
  } else if (view === "week") {
    const days = getWeekDays(date);
    rangeStart = days[0];
    rangeEnd = days[6];
  } else {
    rangeStart = date;
    rangeEnd = date;
  }

  const sessions = await getSessionsForRange(rangeStart, rangeEnd);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <CalendarHeader view={view} date={date} today={today} />

      <div className="mt-6">
        {view === "month" && <MonthView monthDate={startOfMonthUTC(date)} sessions={sessions} today={today} />}
        {view === "week" && <WeekView weekDate={date} sessions={sessions} today={today} />}
        {view === "day" && <DayView sessions={sessions} />}
      </div>
    </div>
  );
}
