import type { SessionSummary } from "@/lib/planning-data";
import { SessionCard } from "@/components/planning/session-card";

export function DayView({ sessions }: { sessions: SessionSummary[] }) {
  if (sessions.length === 0) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center rounded-xl border border-border bg-card text-sm text-muted-foreground">
        Aucune session programmée ce jour-là.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {sessions.map((s) => (
        <SessionCard key={s.id} session={s} />
      ))}
    </div>
  );
}
