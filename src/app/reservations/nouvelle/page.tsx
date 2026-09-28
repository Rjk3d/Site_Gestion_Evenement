import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getActivitiesForForm } from "@/lib/reservations-data";
import { getSessionsForRange } from "@/lib/planning-data";
import { BookingForm } from "@/components/reservations/booking-form";

export default async function NouvelleReservationPage({
  searchParams,
}: {
  searchParams: Promise<{ sessionId?: string }>;
}) {
  const { sessionId } = await searchParams;

  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  // On ne propose jamais un créneau déjà passé pour une nouvelle réservation.
  const [activities, sessions] = await Promise.all([
    getActivitiesForForm(),
    getSessionsForRange(today, new Date(Date.UTC(today.getUTCFullYear() + 1, 0, 1))),
  ]);

  const activityOptions = activities.map((a) => ({
    id: a.id,
    nom: a.nom,
    type: a.type,
    prixAdulte: Number(a.prixAdulte),
    prixEnfant: a.prixEnfant != null ? Number(a.prixEnfant) : null,
    capaciteParDefaut: a.capaciteParDefaut,
    paxMinimum: a.paxMinimum,
    couleur: a.couleur,
    recurrenceFixe: a.recurrenceFixe,
  }));

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <Link href="/reservations" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Retour aux réservations
      </Link>

      <h1 className="mt-4 text-xl font-semibold text-foreground">Nouvelle réservation</h1>
      <p className="text-sm text-muted-foreground">
        Sélectionnez l&apos;activité et le créneau, ajoutez les participants : le montant est calculé automatiquement.
      </p>

      <div className="mt-6">
        <BookingForm activities={activityOptions} sessions={sessions} initialSessionId={sessionId} />
      </div>
    </div>
  );
}
