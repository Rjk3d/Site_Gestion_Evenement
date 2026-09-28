"use client";

import { useOptimistic, useTransition } from "react";
import { toggleChecklistItem } from "@/lib/actions/planning";

const ITEMS = [
  { key: "infosPhil", label: "Infos Phil" },
  { key: "infosGO", label: "Infos G.O" },
  { key: "infosParents", label: "Infos Parents" },
  { key: "securiteOK", label: "Sécurité" },
  { key: "infosPrestaOK", label: "Infos Presta" },
] as const;

type ChecklistField = (typeof ITEMS)[number]["key"];
type ChecklistValues = Record<ChecklistField, boolean>;

const EMPTY: ChecklistValues = {
  infosPhil: false,
  infosGO: false,
  infosParents: false,
  securiteOK: false,
  infosPrestaOK: false,
};

export function ChecklistToggle({
  bookingId,
  sessionId,
  checklist,
}: {
  bookingId: string;
  sessionId: string;
  checklist: ChecklistValues | null;
}) {
  const [values, setOptimisticValues] = useOptimistic<ChecklistValues, Partial<ChecklistValues>>(
    checklist ?? EMPTY,
    (state, patch) => ({ ...state, ...patch }),
  );
  const [, startTransition] = useTransition();

  function handleToggle(field: ChecklistField) {
    const next = !values[field];
    startTransition(async () => {
      setOptimisticValues({ [field]: next });
      await toggleChecklistItem(bookingId, sessionId, field, next);
    });
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {ITEMS.map((item) => {
        const done = values[item.key];
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => handleToggle(item.key)}
            aria-pressed={done}
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
              done
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                : "bg-muted text-muted-foreground hover:bg-muted/70"
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
