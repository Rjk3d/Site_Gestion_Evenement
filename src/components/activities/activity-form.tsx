"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { CalendarClock, CalendarOff, Plus, Trash2 } from "lucide-react";
import {
  createActivity,
  updateActivity,
  type ActivityFormState,
} from "@/lib/actions/activities";
import type { ActivityForEdit } from "@/lib/activities-data";

// Ordre d'affichage lundi → dimanche ; les valeurs suivent getUTCDay() (0 = dimanche).
const JOURS = [
  { value: 1, label: "Lundi" },
  { value: 2, label: "Mardi" },
  { value: 3, label: "Mercredi" },
  { value: 4, label: "Jeudi" },
  { value: 5, label: "Vendredi" },
  { value: 6, label: "Samedi" },
  { value: 0, label: "Dimanche" },
];

type SlotDraft = {
  key: string;
  jourSemaine: number;
  heureDebut: string;
  heureFin: string;
  capacite: string; // champ texte, vide = capacité par défaut de l'activité
};

function newSlot(): SlotDraft {
  return { key: crypto.randomUUID(), jourSemaine: 1, heureDebut: "", heureFin: "", capacite: "" };
}

function SubmitButton({ isEdit }: { isEdit: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Enregistrement..." : isEdit ? "Enregistrer les modifications" : "Créer l'activité"}
    </button>
  );
}

export function ActivityForm({ activity }: { activity?: ActivityForEdit }) {
  const isEdit = !!activity;

  const [horaireLibre, setHoraireLibre] = useState(activity ? !activity.recurrenceFixe : false);
  const [slots, setSlots] = useState<SlotDraft[]>(() =>
    activity && activity.slots.length > 0
      ? activity.slots.map((s) => ({
          key: s.id,
          jourSemaine: s.jourSemaine,
          heureDebut: s.heureDebut,
          heureFin: s.heureFin,
          capacite: s.capacite != null ? String(s.capacite) : "",
        }))
      : [newSlot()],
  );

  const action = activity ? updateActivity.bind(null, activity.id) : createActivity;
  const [state, formAction] = useActionState<ActivityFormState, FormData>(action, undefined);

  function updateSlot(key: string, patch: Partial<SlotDraft>) {
    setSlots((prev) => prev.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  }

  const slotsJson = JSON.stringify(
    slots
      .filter((s) => s.heureDebut && s.heureFin)
      .map((s) => ({
        jourSemaine: s.jourSemaine,
        heureDebut: s.heureDebut,
        heureFin: s.heureFin,
        capacite: s.capacite.trim() !== "" ? Number(s.capacite) : null,
      })),
  );

  const inputClass =
    "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-card-foreground focus:outline-none focus:ring-2 focus:ring-accent";
  const labelClass = "mb-1 block text-xs font-medium text-muted-foreground";

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="horaireLibre" value={horaireLibre ? "true" : "false"} />
      <input type="hidden" name="slotsJson" value={horaireLibre ? "[]" : slotsJson} />

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-card-foreground">Informations générales</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Nom de l&apos;activité</label>
            <input className={inputClass} name="nom" defaultValue={activity?.nom ?? ""} required />
          </div>
          <div>
            <label className={labelClass}>Type</label>
            <select className={inputClass} name="type" defaultValue={activity?.type ?? "EXCURSION"}>
              <option value="PARC">Parc (sessions récurrentes)</option>
              <option value="EXCURSION">Excursion</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Couleur (planning)</label>
            <input
              type="color"
              name="couleur"
              defaultValue={activity?.couleur ?? "#6366f1"}
              className="h-9 w-full cursor-pointer rounded-lg border border-border bg-card px-1 py-1"
            />
          </div>
          <div>
            <label className={labelClass}>Description (optionnel)</label>
            <input className={inputClass} name="description" defaultValue={activity?.description ?? ""} />
          </div>
        </div>

        <label className="mt-3 flex items-center gap-2 text-sm text-card-foreground">
          <input type="checkbox" name="actif" defaultChecked={activity?.actif ?? true} />
          Activité active (proposée à la réservation)
        </label>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-card-foreground">Tarifs &amp; capacité</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className={labelClass}>Tarif adulte (€)</label>
            <input
              type="number"
              step="0.01"
              min={0}
              className={inputClass}
              name="prixAdulte"
              defaultValue={activity?.prixAdulte ?? ""}
              required
            />
          </div>
          <div>
            <label className={labelClass}>Tarif enfant (€, optionnel)</label>
            <input
              type="number"
              step="0.01"
              min={0}
              className={inputClass}
              name="prixEnfant"
              defaultValue={activity?.prixEnfant ?? ""}
              placeholder="= tarif adulte"
            />
          </div>
          <div>
            <label className={labelClass}>Capacité par défaut (pax)</label>
            <input
              type="number"
              min={1}
              className={inputClass}
              name="capaciteParDefaut"
              defaultValue={activity?.capaciteParDefaut ?? ""}
              required
            />
          </div>
          <div>
            <label className={labelClass}>Pax minimum (optionnel)</label>
            <input
              type="number"
              min={1}
              className={inputClass}
              name="paxMinimum"
              defaultValue={activity?.paxMinimum ?? ""}
              placeholder="Aucun"
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-card-foreground">Créneaux horaires</h2>
          <button
            type="button"
            onClick={() => setHoraireLibre((v) => !v)}
            aria-pressed={horaireLibre}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              horaireLibre
                ? "border-accent bg-accent text-accent-foreground"
                : "border-border text-muted-foreground hover:border-accent hover:text-card-foreground"
            }`}
          >
            {horaireLibre ? <CalendarOff className="h-3.5 w-3.5" /> : <CalendarClock className="h-3.5 w-3.5" />}
            Horaire libre {horaireLibre ? "activé" : "désactivé"}
          </button>
        </div>

        {horaireLibre ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Horaire libre : à la réservation, toutes les dates futures sont proposées et l&apos;heure de début / fin est
            saisie librement (ex: Atelier Parfum, Séminaire, Bateau...).
          </p>
        ) : (
          <>
            <p className="mt-3 text-sm text-muted-foreground">
              Créneaux hebdomadaires proposés à la réservation (ex: tous les mercredis 09:30 – 12:30). La capacité est
              celle de l&apos;activité, sauf si elle est précisée sur le créneau.
            </p>

            <div className="mt-3 flex flex-col gap-2">
              {slots.map((s) => (
                <div key={s.key} className="grid grid-cols-2 items-end gap-2 rounded-lg border border-border p-3 sm:grid-cols-[1fr_auto_auto_auto_auto]">
                  <div>
                    <label className={labelClass}>Jour</label>
                    <select
                      className={inputClass}
                      value={s.jourSemaine}
                      onChange={(e) => updateSlot(s.key, { jourSemaine: Number(e.target.value) })}
                    >
                      {JOURS.map((j) => (
                        <option key={j.value} value={j.value}>
                          {j.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Début</label>
                    <input
                      type="time"
                      className={inputClass}
                      value={s.heureDebut}
                      onChange={(e) => updateSlot(s.key, { heureDebut: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Fin</label>
                    <input
                      type="time"
                      className={inputClass}
                      value={s.heureFin}
                      onChange={(e) => updateSlot(s.key, { heureFin: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Capacité</label>
                    <input
                      type="number"
                      min={1}
                      className={`${inputClass} w-24`}
                      value={s.capacite}
                      placeholder="défaut"
                      onChange={(e) => updateSlot(s.key, { capacite: e.target.value })}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setSlots((prev) => prev.filter((x) => x.key !== s.key))}
                    disabled={slots.length <= 1}
                    className="mb-1.5 justify-self-end text-muted-foreground hover:text-rose-500 disabled:cursor-not-allowed disabled:opacity-30"
                    aria-label="Retirer ce créneau"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setSlots((prev) => [...prev, newSlot()])}
              className="mt-3 flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
            >
              <Plus className="h-3.5 w-3.5" />
              Ajouter un créneau
            </button>
          </>
        )}
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
