"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createStaff, updateStaff, type StaffFormState } from "@/lib/actions/staff";

function SubmitButton({ isEdit }: { isEdit: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Enregistrement..." : isEdit ? "Enregistrer les modifications" : "Ajouter"}
    </button>
  );
}

export function StaffForm({ staff }: { staff?: { id: string; nom: string; actif: boolean } }) {
  const isEdit = !!staff;
  const action = staff ? updateStaff.bind(null, staff.id) : createStaff;
  const [state, formAction] = useActionState<StaffFormState, FormData>(action, undefined);

  const inputClass =
    "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-card-foreground focus:outline-none focus:ring-2 focus:ring-accent";
  const labelClass = "mb-1 block text-xs font-medium text-muted-foreground";

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-card-foreground">Informations</h2>
        <div className="mt-3">
          <label className={labelClass}>Nom</label>
          <input className={inputClass} name="nom" defaultValue={staff?.nom ?? ""} required />
        </div>

        <label className="mt-3 flex items-center gap-2 text-sm text-card-foreground">
          <input type="checkbox" name="actif" defaultChecked={staff?.actif ?? true} />
          En activité (proposé pour les nouvelles affectations de session)
        </label>
      </section>

      {state?.error && (
        <p className="rounded-lg bg-rose-500/10 px-4 py-2.5 text-sm font-medium text-rose-600 dark:text-rose-400">
          {state.error}
        </p>
      )}

      <div className="flex justify-end">
        <SubmitButton isEdit={isEdit} />
      </div>
    </form>
  );
}
