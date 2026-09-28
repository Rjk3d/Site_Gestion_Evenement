import Link from "next/link";
import type { SessionSummary } from "@/lib/planning-data";
import { getWeekDays, toISODate } from "@/lib/calendar-utils";
import { SessionCard } from "@/components/planning/session-card";

export function WeekView({ weekDate, sessions, today }: { weekDate: Date; sessions: SessionSummary[]; today: Date }) {
  const days = getWeekDays(weekDate);
  const todayKey = toISODate(today);

  const byDay = new Map<string, SessionSummary[]>();
  for (const s of sessions) {
    const key = toISODate(s.date);
    const arr = byDay.get(key) ?? [];
    arr.push(s);
    byDay.set(key, arr);
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
      {days.map((day) => {
        const key = toISODate(day);
        const daySessions = byDay.get(key) ?? [];
        const isToday = key === todayKey;

        return (
          <div key={key} className="flex flex-col gap-2">
            <Link
              href={`/planning?view=day&date=${key}`}
              className={`rounded-lg px-2 py-1 text-center text-xs font-medium ${
                isToday ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {day.toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "2-digit", timeZone: "UTC" })}
            </Link>
            <div className="flex flex-col gap-2">
              {daySessions.length === 0 ? (
                <p className="px-1 text-center text-xs text-muted-foreground/60">—</p>
              ) : (
                daySessions.map((s) => <SessionCard key={s.id} session={s} compact />)
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
