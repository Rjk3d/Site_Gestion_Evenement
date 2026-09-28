"use client";

import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { Phone, Trash2 } from "lucide-react";
import {
  deleteBooking,
  updateBookingMode,
  updateBookingMontant,
  updateBookingNotes,
  updateBookingStatut,
} from "@/lib/actions/planning";
import { ChecklistToggle } from "@/components/planning/checklist-toggle";
import { formatEuros } from "@/lib/format";
import type { BookingStatus, PaymentMethod } from "@/generated/prisma/client";

const STATUT_OPTIONS: { value: BookingStatus; label: string }[] = [
  { value: "PAYE", label: "Payé" },
  { value: "EN_ATTENTE", label: "En attente" },
  { value: "ANNULE", label: "Annulé" },
];

const MODE_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: "CMP", label: "CMP" },
  { value: "ESP", label: "Espèces" },
  { value: "CB", label: "Carte bancaire" },
  { value: "CAR", label: "Carte cadeau / pass" },
  { value: "GRATUIT", label: "Gratuit" },
  { value: "GO", label: "Offert (G.O)" },
  { value: "AUTRE", label: "Autre" },
];

const STATUT_SELECT_CLASS: Record<BookingStatus, string> = {
  PAYE: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  EN_ATTENTE: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  ANNULE: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
};

type Booking = {
  id: string;
  nombrePax: number;
  montantTotal: number;
  prixLibre: number | null;
  statutReglement: BookingStatus;
  modeReglement: PaymentMethod | null;
  notes: string | null;
  clientPrincipal: { prenom: string; nom: string; telephone: string | null } | null;
  participants: { id: string; prenom: string; nom: string; age: number | null; isAdult: boolean }[];
  checklist: {
    infosPhil: boolean;
    infosGO: boolean;
    infosParents: boolean;
    securiteOK: boolean;
    infosPrestaOK: boolean;
  } | null;
};

export function BookingEditor({ booking, sessionId }: { booking: Booking; sessionId: string }) {
  const [statut, setOptimisticStatut] = useOptimistic(booking.statutReglement);
  const [mode, setOptimisticMode] = useOptimistic(booking.modeReglement ?? "CMP");
  const [montant, setMontant] = useState(booking.montantTotal.toString());
  const [notes, setNotes] = useState(booking.notes ?? "");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      await deleteBooking(booking.id, sessionId);
    });
  }

  const selectClass =
    "rounded-lg border border-border bg-card px-2 py-1 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-accent";

  function handleStatutChange(value: BookingStatus) {
    startTransition(async () => {
      setOptimisticStatut(value);
      await updateBookingStatut(booking.id, sessionId, value);
    });
  }

  function handleModeChange(value: PaymentMethod) {
    startTransition(async () => {
      setOptimisticMode(value);
      await updateBookingMode(booking.id, sessionId, value);
    });
  }

  // Sauvegarde automatique (avec un léger délai) plutôt qu'au blur : plus fiable
  // qu'un déclenchement au blur, et l'utilisateur n'a pas besoin de cliquer ailleurs.
  const montantSkipFirst = useRef(true);
  useEffect(() => {
    if (montantSkipFirst.current) {
      montantSkipFirst.current = false;
      return;
    }
    const value = Number(montant);
    if (Number.isNaN(value) || value < 0) return;
    const timeout = setTimeout(() => {
      startTransition(async () => {
        await updateBookingMontant(booking.id, sessionId, value);
      });
    }, 600);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [montant]);

  const notesSkipFirst = useRef(true);
  useEffect(() => {
    if (notesSkipFirst.current) {
      notesSkipFirst.current = false;
      return;
    }
    const timeout = setTimeout(() => {
      startTransition(async () => {
        await updateBookingNotes(booking.id, sessionId, notes);
      });
    }, 600);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes]);

  return (
    <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-card-foreground">
            {booking.clientPrincipal ? `${booking.clientPrincipal.prenom} ${booking.clientPrincipal.nom}` : "—"}
          </span>
          <select
            value={statut}
            onChange={(e) => handleStatutChange(e.target.value as BookingStatus)}
            className={`${selectClass} ${STATUT_SELECT_CLASS[statut]}`}
          >
            {STATUT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select value={mode} onChange={(e) => handleModeChange(e.target.value as PaymentMethod)} className={selectClass}>
            {MODE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          {confirmingDelete ? (
            <span className="ml-auto flex items-center gap-1.5">
              <span className="text-xs text-rose-600 dark:text-rose-400">Supprimer cette réservation ?</span>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                className="rounded-lg border border-border px-2 py-0.5 text-xs font-medium text-muted-foreground hover:bg-muted"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="rounded-lg bg-rose-600 px-2 py-0.5 text-xs font-medium text-white hover:bg-rose-700"
              >
                Confirmer
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              aria-label="Supprimer cette réservation"
              className="ml-auto flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-rose-600"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <p className="mt-1 text-sm text-muted-foreground">
          {booking.participants.map((p) => `${p.prenom} ${p.nom} (${p.isAdult ? "Adulte" : (p.age ?? "?")})`).join(", ")}
        </p>

        {booking.clientPrincipal?.telephone && (
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <Phone className="h-3 w-3" />
            {booking.clientPrincipal.telephone}
          </p>
        )}

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes / to-do..."
          rows={1}
          className="mt-2 w-full resize-y rounded-lg border border-border bg-card px-2 py-1 text-xs text-card-foreground focus:outline-none focus:ring-2 focus:ring-accent"
        />

        <div className="mt-3">
          <ChecklistToggle bookingId={booking.id} sessionId={sessionId} checklist={booking.checklist} />
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
        <div className="flex items-center gap-1">
          <input
            type="number"
            min={0}
            step="0.01"
            value={montant}
            onChange={(e) => setMontant(e.target.value)}
            className="w-24 rounded-lg border border-border bg-card px-2 py-1 text-right text-sm font-semibold text-card-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <span className="text-sm text-muted-foreground">€</span>
        </div>
        <span className="text-xs text-muted-foreground">{booking.nombrePax} pax</span>
        {booking.prixLibre != null && booking.prixLibre > 0 && (
          <span className="text-xs text-muted-foreground">dont prix libre : {formatEuros(booking.prixLibre, 2)}</span>
        )}
      </div>
    </div>
  );
}
