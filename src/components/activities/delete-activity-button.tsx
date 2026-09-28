"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteActivity } from "@/lib/actions/activities";

export function DeleteActivityButton({
  activityId,
  nom,
  sessionsCount,
  bookingsCount,
}: {
  activityId: string;
  nom: string;
  sessionsCount: number;
  bookingsCount: number;
}) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      await deleteActivity(activityId);
    });
  }

  if (confirming) {
    return (
      <div className="flex flex-col items-end gap-1.5">
        <p className="max-w-[220px] text-right text-xs text-rose-600 dark:text-rose-400">
          Supprimer « {nom} » ainsi que {sessionsCount} session(s) et {bookingsCount} réservation(s) associées, de façon
          définitive ?
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={isPending}
            className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-rose-700 disabled:opacity-50"
          >
            {isPending ? "Suppression..." : "Confirmer la suppression"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:border-rose-300 hover:text-rose-600"
    >
      <Trash2 className="h-3.5 w-3.5" />
      Supprimer
    </button>
  );
}
