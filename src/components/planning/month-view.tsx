import Link from "next/link";
import type { SessionSummary } from "@/lib/planning-data";
import { getMonthGridDays, toISODate } from "@/lib/calendar-utils";

const WEEKDAY_HEADERS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MAX_VISIBLE = 3;

export function MonthView({ monthDate, sessions, today }: { monthDate: Date; sessions: SessionSummary[]; today: Date }) {
  const days = getMonthGridDays(monthDate);
  const currentMonth = monthDate.getUTCMonth();

  const byDay = new Map<string, SessionSummary[]>();
  for (const s of sessions) {
    const key = toISODate(s.date);
    const arr = byDay.get(key) ?? [];
    arr.push(s);
    byDay.set(key, arr);
  }

  const todayKey = toISODate(today);

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <div className="grid grid-cols-7 border-b border-border bg-muted/50">
        {WEEKDAY_HEADERS.map((w) => (
          <div key={w} className="px-2 py-2 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const key = toISODate(day);
          const daySessions = byDay.get(key) ?? [];
          const isCurrentMonth = day.getUTCMonth() === currentMonth;
          const isToday = key === todayKey;
          const visible = daySessions.slice(0, MAX_VISIBLE);
          const overflow = daySessions.length - visible.length;

          return (
            <Link
              key={key}
              href={`/planning?view=day&date=${key}`}
              className={`flex min-h-28 flex-col gap-1 border-b border-r border-border p-1.5 last:border-r-0 hover:bg-muted/40 ${
                isCurrentMonth ? "bg-card" : "bg-muted/30"
              }`}
            >
              <span
                className={`w-fit rounded-full px-1.5 text-xs ${
                  isToday
                    ? "bg-accent font-semibold text-accent-foreground"
                    : isCurrentMonth
                      ? "text-card-foreground"
                      : "text-muted-foreground/60"
                }`}
              >
                {day.getUTCDate()}
              </span>

              <div className="flex flex-col gap-0.5">
                {visible.map((s) => (
                  <div
                    key={s.id}
                    title={`${s.heureDebut} ${s.activityNom} — ${s.paxReserve}/${s.capacite} pax`}
                    className="truncate rounded px-1 py-0.5 text-[10px] font-medium leading-tight text-white"
                    style={{ backgroundColor: s.activityCouleur }}
                  >
                    {s.heureDebut} {s.activityNom}
                  </div>
                ))}
                {overflow > 0 && <span className="px-1 text-[10px] text-muted-foreground">+{overflow} autre(s)</span>}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
