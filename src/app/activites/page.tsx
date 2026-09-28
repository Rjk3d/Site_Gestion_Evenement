import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
import { getActivitiesWithStats, type ActivitySlotData } from "@/lib/activities-data";
import { DeleteActivityButton } from "@/components/activities/delete-activity-button";
import { Badge } from "@/components/ui/badge";
import { formatEuros } from "@/lib/format";

// Libellés indexés par la convention getUTCDay() : 0 = dimanche .. 6 = samedi.
const JOURS_COURTS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

function slotLabel(s: ActivitySlotData): string {
  return `${JOURS_COURTS[s.jourSemaine]} ${s.heureDebut} – ${s.heureFin}${s.capacite != null ? ` (${s.capacite} pax)` : ""}`;
}

export default async function ActivitesPage() {
  const activities = await getActivitiesWithStats();

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Activités</h1>
          <p className="text-sm text-muted-foreground">
            Catalogue des activités proposées : tarifs, capacité et créneaux hebdomadaires.
          </p>
        </div>
        <Link
          href="/activites/nouvelle"
          className="flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Nouvelle activité
        </Link>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
        {activities.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">Aucune activité.</p>
        ) : (
          <div className="divide-y divide-border">
            {activities.map((a) => (
              <div key={a.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: a.couleur }} />
                    <span className="font-medium text-card-foreground">{a.nom}</span>
                    <Badge>{a.type === "PARC" ? "Parc" : "Excursion"}</Badge>
                    {!a.recurrenceFixe && <Badge>Horaire libre</Badge>}
                    {!a.actif && <Badge>Inactive</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatEuros(a.prixAdulte, 2)} adulte
                    {a.prixEnfant != null && ` · ${formatEuros(a.prixEnfant, 2)} enfant`} · Capacité {a.capaciteParDefaut} pax
                  </p>
                  {a.recurrenceFixe && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {a.slots.length > 0
                        ? `Créneaux : ${a.slots.map(slotLabel).join(" · ")}`
                        : "Créneaux déduits des sessions passées (aucun créneau configuré)"}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {a.sessionsCount} session(s) programmée(s) · {a.bookingsCount} réservation(s)
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Link
                    href={`/activites/${a.id}`}
                    className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:border-accent hover:text-card-foreground"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Gérer
                  </Link>
                  <DeleteActivityButton
                    activityId={a.id}
                    nom={a.nom}
                    sessionsCount={a.sessionsCount}
                    bookingsCount={a.bookingsCount}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
