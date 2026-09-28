import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";
import { getSessionDetail } from "@/lib/planning-data";
import { getActiveStaffOptions } from "@/lib/staff-data";
import { toISODate } from "@/lib/calendar-utils";
import { CapacityGauge } from "@/components/planning/capacity-gauge";
import { BookingEditor } from "@/components/planning/booking-editor";
import { DeleteSessionButton } from "@/components/planning/delete-session-button";
import { SessionStaffSelect } from "@/components/planning/session-staff-select";
import { Badge } from "@/components/ui/badge";
import { formatDateFR } from "@/lib/format";

export default async function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [detail, activeStaff] = await Promise.all([getSessionDetail(id), getActiveStaffOptions()]);

  if (!detail) {
    notFound();
  }

  const { session, capacite, paxReserve } = detail;

  // Le staff actuellement affecté doit rester visible même s'il est passé "inactif"
  // depuis, sans quoi le menu déroulant afficherait une valeur qui ne correspond à
  // aucune option et le sélecteur paraîtrait vide.
  const staffOptions =
    session.staff && !activeStaff.some((s) => s.id === session.staff!.id)
      ? [...activeStaff, { id: session.staff.id, nom: `${session.staff.nom} (inactif)` }]
      : activeStaff;
  const underMinimum = session.activity.paxMinimum != null && paxReserve < session.activity.paxMinimum;

  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const isPast = session.date.getTime() < today.getTime();

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <Link
        href={`/planning?view=month&date=${toISODate(session.date)}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour au planning
      </Link>

      <div className="mt-4 flex flex-col gap-4 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: session.activity.couleur }} />
            <h1 className="text-lg font-semibold text-card-foreground">{session.activity.nom}</h1>
            <Badge>{session.activity.type === "PARC" ? "Parc" : "Excursion"}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatDateFR(session.date, { weekday: "long", day: "2-digit", month: "long", year: "numeric" })} · {session.heureDebut} –{" "}
            {session.heureFin}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Staff :</span>
            <SessionStaffSelect sessionId={session.id} currentStaffId={session.staffId} options={staffOptions} />
          </div>
        </div>

        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          {isPast ? (
            <span
              className="flex items-center justify-center gap-1.5 rounded-lg bg-muted px-4 py-2 text-sm font-medium text-muted-foreground"
              title="Cette session est déjà passée"
            >
              <Plus className="h-4 w-4" />
              Session passée
            </span>
          ) : (
            <Link
              href={`/reservations?sessionId=${session.id}`}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              Nouvelle réservation
            </Link>
          )}
          <DeleteSessionButton sessionId={session.id} bookingsCount={session.bookings.length} />
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-card-foreground">Remplissage</span>
          <span className="text-sm text-muted-foreground">{session.bookings.length} réservation(s)</span>
        </div>
        <div className="mt-2">
          <CapacityGauge reserve={paxReserve} capacite={capacite} size="lg" />
        </div>
        {underMinimum && (
          <p className="mt-2 text-sm font-medium text-amber-600 dark:text-amber-400">
            Le minimum de {session.activity.paxMinimum} pax n&apos;est pas atteint pour cette sortie.
          </p>
        )}
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-card-foreground">Inscrits</h2>
        </div>

        {session.bookings.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">Aucune réservation sur ce créneau pour le moment.</p>
        ) : (
          <div className="divide-y divide-border">
            {session.bookings.map((booking) => (
              <BookingEditor
                key={booking.id}
                sessionId={session.id}
                booking={{
                  id: booking.id,
                  nombrePax: booking.nombrePax,
                  montantTotal: Number(booking.montantTotal),
                  prixLibre: booking.prixLibre != null ? Number(booking.prixLibre) : null,
                  statutReglement: booking.statutReglement,
                  modeReglement: booking.modeReglement,
                  notes: booking.notes,
                  clientPrincipal: booking.clientPrincipal,
                  participants: booking.participants,
                  checklist: booking.checklist,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
