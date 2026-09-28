import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
import { getStaffList } from "@/lib/staff-data";
import { DeleteStaffButton } from "@/components/staff/delete-staff-button";
import { Badge } from "@/components/ui/badge";

export default async function PersonnelPage() {
  const staff = await getStaffList();

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Personnel</h1>
          <p className="text-sm text-muted-foreground">
            Membres de l&apos;équipe pouvant être affectés à une session (planning).
          </p>
        </div>
        <Link
          href="/personnel/nouveau"
          className="flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Ajouter
        </Link>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
        {staff.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">Aucun membre du personnel.</p>
        ) : (
          <div className="divide-y divide-border">
            {staff.map((s) => (
              <div key={s.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-card-foreground">{s.nom}</span>
                    {!s.actif && <Badge>Inactif</Badge>}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{s.sessionsCount} session(s) affectée(s)</p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Link
                    href={`/personnel/${s.id}`}
                    className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:border-accent hover:text-card-foreground"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Modifier
                  </Link>
                  <DeleteStaffButton staffId={s.id} nom={s.nom} sessionsCount={s.sessionsCount} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
