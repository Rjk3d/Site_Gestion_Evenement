"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { Plus, Trash2 } from "lucide-react";
import { createBooking, type BookingFormState } from "@/lib/actions/bookings";
import { getVirtualSessionsForActivity } from "@/lib/actions/reservations";
import { formatEuros } from "@/lib/format";
import { parseISODate, toISODate } from "@/lib/calendar-utils";
import { DateTimePicker } from "@/components/reservations/date-time-picker";
import type { SessionSummary } from "@/lib/planning-data";

type ActivityOption = {
  id: string;
  nom: string;
  type: "PARC" | "EXCURSION";
  prixAdulte: number;
  prixEnfant: number | null;
  capaciteParDefaut: number;
  paxMinimum: number | null;
  couleur: string;
  recurrenceFixe: boolean;
};

type ParticipantDraft = {
  key: string;
  prenom: string;
  nom: string;
  telephone: string;
  dateNaissance: string;
  age: string; // saisie manuelle si pas de date de naissance
  isAdult: boolean;
  presenceParent: boolean;
};

function newParticipant(): ParticipantDraft {
  return {
    key: crypto.randomUUID(),
    prenom: "",
    nom: "",
    telephone: "",
    dateNaissance: "",
    age: "",
    isAdult: false,
    presenceParent: false,
  };
}

function computeAge(dateNaissance: string, reference: Date): number {
  const birth = new Date(dateNaissance);
  let age = reference.getUTCFullYear() - birth.getUTCFullYear();
  const monthDiff = reference.getUTCMonth() - birth.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && reference.getUTCDate() < birth.getUTCDate())) {
    age--;
  }
  return age;
}

function effectiveAge(p: ParticipantDraft, referenceDate: Date): { computedAge: number | null; computedIsAdult: boolean } {
  if (p.dateNaissance) {
    const age = computeAge(p.dateNaissance, referenceDate);
    return { computedAge: age, computedIsAdult: age >= 18 };
  }
  if (p.age.trim() !== "") {
    const age = Number(p.age);
    return { computedAge: age, computedIsAdult: age >= 18 };
  }
  return { computedAge: null, computedIsAdult: p.isAdult };
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Enregistrement..." : "Créer la réservation"}
    </button>
  );
}

export function BookingForm({
  activities,
  sessions,
  initialSessionId,
}: {
  activities: ActivityOption[];
  sessions: SessionSummary[];
  initialSessionId?: string;
}) {
  const initialSession = sessions.find((s) => s.id === initialSessionId);

  const [activityId, setActivityId] = useState(initialSession?.activityId ?? "");
  const [selectedDate, setSelectedDate] = useState(initialSession ? toISODate(initialSession.date) : "");
  const [sessionId, setSessionId] = useState(initialSessionId ?? "");
  const [manualHeureDebut, setManualHeureDebut] = useState("");
  const [manualHeureFin, setManualHeureFin] = useState("");
  const [participants, setParticipants] = useState<ParticipantDraft[]>([newParticipant()]);
  const [modeReglement, setModeReglement] = useState("CMP");
  const [statutReglement, setStatutReglement] = useState("PAYE");
  const [prixLibre, setPrixLibre] = useState("");
  const [notes, setNotes] = useState("");

  const [state, formAction] = useActionState<BookingFormState, FormData>(createBooking, undefined);

  // Créneaux déjà réellement programmés (base de données) pour l'activité choisie.
  const activitySessions = useMemo(
    () => sessions.filter((s) => s.activityId === activityId),
    [sessions, activityId],
  );

  // Créneaux futurs déduits de la récurrence habituelle de l'activité (ex: tous les
  // mercredis), sans limite dans le temps : ils sont créés en base seulement au
  // moment où une réservation est effectivement passée dessus.
  const [virtualSessions, setVirtualSessions] = useState<SessionSummary[]>([]);

  useEffect(() => {
    if (!activityId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset tied to a changing prop/id, not derivable during render
      setVirtualSessions([]);
      return;
    }
    let cancelled = false;
    getVirtualSessionsForActivity(activityId).then((result) => {
      if (!cancelled) setVirtualSessions(result);
    });
    return () => {
      cancelled = true;
    };
  }, [activityId]);

  const availableSessions = useMemo(
    () => [...activitySessions, ...virtualSessions].sort((a, b) => a.date.getTime() - b.date.getTime()),
    [activitySessions, virtualSessions],
  );

  const selectedActivity = activities.find((a) => a.id === activityId);

  // Activités "selon disponibilité" (pas de jour fixe) : l'heure est saisie librement,
  // le créneau est donc reconstruit à la volée plutôt que choisi dans une liste.
  const manualSession: SessionSummary | null = useMemo(() => {
    if (!selectedActivity || selectedActivity.recurrenceFixe) return null;
    if (!selectedDate || !manualHeureDebut || !manualHeureFin) return null;
    return {
      id: `virtual:${activityId}|${selectedDate}|${manualHeureDebut}|${manualHeureFin}`,
      date: parseISODate(selectedDate),
      heureDebut: manualHeureDebut,
      heureFin: manualHeureFin,
      activityId,
      activityNom: selectedActivity.nom,
      activityCouleur: selectedActivity.couleur,
      activityType: selectedActivity.type,
      staffNom: null,
      capacite: selectedActivity.capaciteParDefaut,
      paxMinimum: selectedActivity.paxMinimum,
      paxReserve: 0,
    };
  }, [selectedActivity, selectedDate, manualHeureDebut, manualHeureFin, activityId]);

  const effectiveSessionId = selectedActivity && !selectedActivity.recurrenceFixe ? (manualSession?.id ?? "") : sessionId;

  const selectedSession =
    manualSession ?? availableSessions.find((s) => s.id === sessionId) ?? sessions.find((s) => s.id === sessionId);
  const referenceDate = selectedSession?.date ?? new Date();

  const enrichedParticipants = participants.map((p) => ({ ...p, ...effectiveAge(p, referenceDate) }));

  const totalParticipants = enrichedParticipants.reduce((sum, p) => {
    if (!selectedActivity) return sum;
    const prix = p.computedIsAdult ? selectedActivity.prixAdulte : (selectedActivity.prixEnfant ?? selectedActivity.prixAdulte);
    return sum + prix;
  }, 0);

  const prixLibreValue = Number(prixLibre.replace(",", "."));
  const total = totalParticipants + (prixLibre.trim() !== "" && !Number.isNaN(prixLibreValue) ? prixLibreValue : 0);

  const placesRestantes = selectedSession ? selectedSession.capacite - selectedSession.paxReserve : null;
  const overCapacity = placesRestantes != null && participants.length > placesRestantes;

  const canSubmit =
    effectiveSessionId !== "" && participants.length > 0 && participants.every((p) => p.prenom.trim() && p.nom.trim());

  function updateParticipant(key: string, patch: Partial<ParticipantDraft>) {
    setParticipants((prev) => prev.map((p) => (p.key === key ? { ...p, ...patch } : p)));
  }

  const inputClass =
    "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-card-foreground focus:outline-none focus:ring-2 focus:ring-accent";
  const labelClass = "mb-1 block text-xs font-medium text-muted-foreground";

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="sessionId" value={effectiveSessionId} />
      <input
        type="hidden"
        name="participantsJson"
        value={JSON.stringify(
          enrichedParticipants.map((p) => ({
            prenom: p.prenom,
            nom: p.nom,
            telephone: p.telephone || undefined,
            age: p.computedAge,
            isAdult: p.computedIsAdult,
            presenceParent: p.presenceParent,
          })),
        )}
      />

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-card-foreground">Activité &amp; créneau</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Activité</label>
            <select
              className={inputClass}
              value={activityId}
              onChange={(e) => {
                setActivityId(e.target.value);
                setSelectedDate("");
                setSessionId("");
                setManualHeureDebut("");
                setManualHeureFin("");
              }}
            >
              <option value="">Sélectionner une activité</option>
              {activities.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nom}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Date &amp; heure</label>
            <DateTimePicker
              sessions={availableSessions}
              freeSchedule={!!selectedActivity && !selectedActivity.recurrenceFixe}
              selectedDate={selectedDate}
              sessionId={sessionId}
              onSelectDate={setSelectedDate}
              onSelectSession={setSessionId}
              manualHeureDebut={manualHeureDebut}
              manualHeureFin={manualHeureFin}
              onManualHeureDebutChange={setManualHeureDebut}
              onManualHeureFinChange={setManualHeureFin}
              disabled={!activityId}
            />
          </div>
        </div>

        {selectedSession && (
          <p className={`mt-3 text-sm ${overCapacity ? "font-medium text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
            {placesRestantes} place(s) restante(s) avant cette réservation.
            {overCapacity && " Attention : le nombre de participants dépasse la capacité restante."}
          </p>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-card-foreground">Participants</h2>
          <button
            type="button"
            onClick={() => setParticipants((prev) => [...prev, newParticipant()])}
            className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
          >
            <Plus className="h-3.5 w-3.5" />
            Ajouter un participant
          </button>
        </div>

        <div className="mt-3 flex flex-col gap-3">
          {enrichedParticipants.map((p, index) => (
            <div key={p.key} className="rounded-lg border border-border p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  {index === 0 ? "Contact principal" : `Participant ${index + 1}`}
                </span>
                {participants.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setParticipants((prev) => prev.filter((x) => x.key !== p.key))}
                    className="text-muted-foreground hover:text-rose-500"
                    aria-label="Retirer ce participant"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className={labelClass}>Prénom</label>
                  <input
                    className={inputClass}
                    value={p.prenom}
                    onChange={(e) => updateParticipant(p.key, { prenom: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelClass}>Nom</label>
                  <input
                    className={inputClass}
                    value={p.nom}
                    onChange={(e) => updateParticipant(p.key, { nom: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelClass}>Téléphone{index === 0 ? "" : " (optionnel)"}</label>
                  <input
                    className={inputClass}
                    value={p.telephone}
                    onChange={(e) => updateParticipant(p.key, { telephone: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelClass}>Date de naissance (optionnel)</label>
                  <input
                    type="date"
                    className={inputClass}
                    value={p.dateNaissance}
                    onChange={(e) => updateParticipant(p.key, { dateNaissance: e.target.value })}
                  />
                </div>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-4">
                {!p.dateNaissance && (
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-muted-foreground">Âge</label>
                    <input
                      type="number"
                      min={0}
                      max={120}
                      className="w-20 rounded-lg border border-border bg-card px-2 py-1 text-sm text-card-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                      value={p.age}
                      onChange={(e) => updateParticipant(p.key, { age: e.target.value })}
                      disabled={p.isAdult}
                    />
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={p.isAdult}
                        onChange={(e) => updateParticipant(p.key, { isAdult: e.target.checked, age: "" })}
                      />
                      Adulte (âge non précisé)
                    </label>
                  </div>
                )}

                {p.dateNaissance && (
                  <span className="text-xs text-muted-foreground">
                    Âge calculé : {p.computedAge} {p.computedIsAdult ? "(adulte)" : "(mineur)"}
                  </span>
                )}

                {!p.computedIsAdult && (
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={p.presenceParent}
                      onChange={(e) => updateParticipant(p.key, { presenceParent: e.target.checked })}
                    />
                    Présence d&apos;un parent
                  </label>
                )}

                <span className="ml-auto text-xs font-medium text-card-foreground">
                  {selectedActivity
                    ? formatEuros(p.computedIsAdult ? selectedActivity.prixAdulte : (selectedActivity.prixEnfant ?? selectedActivity.prixAdulte), 2)
                    : "—"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-card-foreground">Règlement</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className={labelClass}>Mode de règlement</label>
            <select
              className={inputClass}
              name="modeReglement"
              value={modeReglement}
              onChange={(e) => setModeReglement(e.target.value)}
            >
              <option value="CMP">CMP (compte membre)</option>
              <option value="ESP">Espèces</option>
              <option value="CB">Carte bancaire</option>
              <option value="CAR">Carte cadeau / pass</option>
              <option value="GRATUIT">Gratuit</option>
              <option value="GO">Offert (G.O / staff)</option>
              <option value="AUTRE">Autre</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>Statut</label>
            <select
              className={inputClass}
              name="statutReglement"
              value={statutReglement}
              onChange={(e) => setStatutReglement(e.target.value)}
            >
              <option value="PAYE">Payé</option>
              <option value="EN_ATTENTE">En attente</option>
              <option value="ANNULE">Annulé</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>Prix libre (€, optionnel)</label>
            <input
              type="number"
              step="0.01"
              min={0}
              className={inputClass}
              name="prixLibre"
              value={prixLibre}
              onChange={(e) => setPrixLibre(e.target.value)}
              placeholder="Sur mesure"
            />
          </div>

          <div>
            <label className={labelClass}>Montant total</label>
            <p className="rounded-lg border border-border bg-muted px-3 py-2 text-sm font-semibold text-card-foreground">
              {formatEuros(total, 2)}
            </p>
          </div>
        </div>

        {prixLibre.trim() !== "" && !Number.isNaN(prixLibreValue) && prixLibreValue > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            Total : {formatEuros(totalParticipants, 2)} (participants) + {formatEuros(prixLibreValue, 2)} (prix libre sur
            mesure).
          </p>
        )}

        <div className="mt-3">
          <label className={labelClass}>Notes / to-do (optionnel)</label>
          <textarea
            className={inputClass}
            name="notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </section>

      {state?.error && (
        <p className="rounded-lg bg-rose-500/10 px-4 py-2.5 text-sm font-medium text-rose-600 dark:text-rose-400">
          {state.error}
        </p>
      )}

      <div className="flex justify-end">
        <SubmitButton disabled={!canSubmit} />
      </div>
    </form>
  );
}
