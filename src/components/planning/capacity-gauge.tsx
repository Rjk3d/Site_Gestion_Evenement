export function CapacityGauge({
  reserve,
  capacite,
  size = "sm",
}: {
  reserve: number;
  capacite: number;
  size?: "sm" | "lg";
}) {
  const ratio = capacite > 0 ? Math.min(reserve / capacite, 1) : 0;
  const isFull = reserve >= capacite;
  const isNearFull = !isFull && ratio >= 0.75;

  const barColor = isFull ? "bg-rose-500" : isNearFull ? "bg-amber-500" : "bg-emerald-500";

  return (
    <div className="flex items-center gap-2">
      <div className={`flex-1 overflow-hidden rounded-full bg-muted ${size === "lg" ? "h-2" : "h-1.5"}`}>
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.max(ratio * 100, reserve > 0 ? 6 : 0)}%` }} />
      </div>
      <span className={`shrink-0 tabular-nums text-muted-foreground ${size === "lg" ? "text-sm" : "text-[11px]"}`}>
        {reserve}/{capacite}
      </span>
    </div>
  );
}
