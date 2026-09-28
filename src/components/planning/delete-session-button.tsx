"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteSession } from "@/lib/actions/planning";

export function DeleteSessionButton({ sessionId, bookingsCount }: { sessionId: string; bookingsCount: number }) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      await deleteSession(sessionId);
    });
  }

  if (confirming) {
    return (
      <div className="flex flex-col items-start gap-1.5 sm:items-end">
        <p className="max-w-[220px] text-xs text-rose-600 dark:text-rose-400">
          {bookingsCount > 0
            ? `Supprimer ce créneau et ses ${bookingsCount} réservation(s) ? Il disparaîtra du calendrier.`
            : "Supprimer ce créneau du calendrier ?"}
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
            {isPending ? "Suppression..." : "Confirmer"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="flex items-center justify-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:border-rose-300 hover:text-rose-600"
    >
      <Trash2 className="h-4 w-4" />
      Supprimer la session
    </button>
  );
}
