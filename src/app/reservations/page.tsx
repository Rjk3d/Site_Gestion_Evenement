import Link from "next/link";
import { Plus } from "lucide-react";
import { getBookingsList } from "@/lib/reservations-data";
import type { ActivityType, BookingStatus } from "@/generated/prisma/client";
import { ReservationsFilters } from "@/components/reservations/reservations-filters";
import { BookingsTable } from "@/components/reservations/bookings-table";

export default async function ReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; statut?: string; type?: string }>;
}) {
  const params = await searchParams;
  const statut = params.statut === "PAYE" || params.statut === "EN_ATTENTE" || params.statut === "ANNULE" ? (params.statut as BookingStatus) : undefined;
  const type = params.type === "PARC" || params.type === "EXCURSION" ? (params.type as ActivityType) : undefined;

  const bookings = await getBookingsList({ q: params.q, statut, type });

  const rows = bookings.map((b) => ({
    id: b.id,
    nombrePax: b.nombrePax,
    montantTotal: Number(b.montantTotal),
    statutReglement: b.statutReglement,
    modeReglement: b.modeReglement,
    clientPrincipal: b.clientPrincipal,
    session: { id: b.session.id, date: b.session.date, heureDebut: b.session.heureDebut, activity: b.session.activity },
  }));

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Réservations</h1>
          <p className="text-sm text-muted-foreground">{rows.length} réservation(s) affichée(s).</p>
        </div>
        <Link
          href="/reservations/nouvelle"
          className="flex items-center justify-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Nouvelle réservation
        </Link>
      </div>

      <div className="mt-6">
        <ReservationsFilters q={params.q} statut={params.statut} type={params.type} />
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
        <BookingsTable bookings={rows} />
      </div>
    </div>
  );
}
