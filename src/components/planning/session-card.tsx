import Link from "next/link";
import { CapacityGauge } from "@/components/planning/capacity-gauge";
import type { SessionSummary } from "@/lib/planning-data";

export function SessionCard({ session, compact = false }: { session: SessionSummary; compact?: boolean }) {
  const underMinimum = session.paxMinimum != null && session.paxReserve < session.paxMinimum;

  return (
    <Link
      href={`/planning/sessions/${session.id}`}
      className="block rounded-lg border border-border bg-card p-2.5 transition-colors hover:border-accent"
    >
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: session.activityCouleur }} />
        <span className="text-xs font-medium text-muted-foreground">
          {session.heureDebut} – {session.heureFin}
        </span>
      </div>
      <p className="mt-1 truncate text-sm font-medium text-card-foreground">{session.activityNom}</p>
      {!compact && session.staffNom && <p className="text-xs text-muted-foreground">Staff : {session.staffNom}</p>}
      <div className="mt-2">
        <CapacityGauge reserve={session.paxReserve} capacite={session.capacite} />
      </div>
      {underMinimum && (
        <p className="mt-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
          Minimum {session.paxMinimum} pax non atteint
        </p>
      )}
    </Link>
  );
}
