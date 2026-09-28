"use client";

import { useTransition } from "react";
import { updateSessionStaff } from "@/lib/actions/planning";

export function SessionStaffSelect({
  sessionId,
  currentStaffId,
  options,
}: {
  sessionId: string;
  currentStaffId: string | null;
  options: { id: string; nom: string }[];
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <select
      className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-sm text-card-foreground focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
      defaultValue={currentStaffId ?? ""}
      disabled={isPending}
      onChange={(e) => {
        const value = e.target.value;
        startTransition(async () => {
          await updateSessionStaff(sessionId, value);
        });
      }}
    >
      <option value="">Aucun staff assigné</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.nom}
        </option>
      ))}
    </select>
  );
}
