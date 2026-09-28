import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatDateFR, formatEuros } from "@/lib/format";
import { toISODate } from "@/lib/calendar-utils";

const STATUT_VARIANT = { PAYE: "success", EN_ATTENTE: "warning", ANNULE: "danger" } as const;
const STATUT_LABEL = { PAYE: "Payé", EN_ATTENTE: "En attente", ANNULE: "Annulé" } as const;

type BookingRow = {
  id: string;
  nombrePax: number;
  montantTotal: number;
  statutReglement: keyof typeof STATUT_LABEL;
  modeReglement: string | null;
  clientPrincipal: { prenom: string; nom: string; telephone: string | null } | null;
  session: { id: string; date: Date; heureDebut: string; activity: { nom: string; couleur: string } };
};

export function BookingsTable({ bookings }: { bookings: BookingRow[] }) {
  if (bookings.length === 0) {
    return <p className="p-5 text-sm text-muted-foreground">Aucune réservation ne correspond à ces filtres.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-5 py-3 font-medium">Session</th>
            <th className="px-5 py-3 font-medium">Contact</th>
            <th className="px-5 py-3 font-medium text-right">Pax</th>
            <th className="px-5 py-3 font-medium text-right">Montant</th>
            <th className="px-5 py-3 font-medium">Règlement</th>
            <th className="px-5 py-3 font-medium">Statut</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((b) => (
            <tr key={b.id} className="border-b border-border last:border-0 hover:bg-muted/60">
              <td className="px-5 py-3">
                <Link href={`/planning/sessions/${b.session.id}`} className="flex items-center gap-2 hover:text-accent">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: b.session.activity.couleur }} />
                  <span>
                    <span className="font-medium text-card-foreground">{b.session.activity.nom}</span>
                    <span className="text-muted-foreground">
                      {" "}
                      · {formatDateFR(toISODate(b.session.date), { day: "2-digit", month: "short", year: "numeric" })} · {b.session.heureDebut}
                    </span>
                  </span>
                </Link>
              </td>
              <td className="px-5 py-3 text-card-foreground">
                {b.clientPrincipal ? `${b.clientPrincipal.prenom} ${b.clientPrincipal.nom}` : "—"}
                {b.clientPrincipal?.telephone && <span className="text-muted-foreground"> · {b.clientPrincipal.telephone}</span>}
              </td>
              <td className="px-5 py-3 text-right text-card-foreground">{b.nombrePax}</td>
              <td className="whitespace-nowrap px-5 py-3 text-right font-medium text-card-foreground">
                {formatEuros(b.montantTotal, 2)}
              </td>
              <td className="px-5 py-3 text-muted-foreground">{b.modeReglement ?? "—"}</td>
              <td className="px-5 py-3">
                <Badge variant={STATUT_VARIANT[b.statutReglement]}>{STATUT_LABEL[b.statutReglement]}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
