import { Euro, Users, Gauge, Download, Sheet } from "lucide-react";
import { getAvailableYears, getDashboardData } from "@/lib/dashboard-data";
import type { ActivityType } from "@/generated/prisma/client";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { DashboardFilters } from "@/components/dashboard/filters";
import { RevenueByActivityChart, RevenueByMonthChart } from "@/components/dashboard/charts";
import { SalesJournal } from "@/components/dashboard/sales-journal";
import { BackupButtons } from "@/components/dashboard/backup-buttons";
import { formatEuros } from "@/lib/format";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ annee?: string; mois?: string; type?: string }>;
}) {
  const params = await searchParams;
  const annee = params.annee ? Number(params.annee) : undefined;
  const mois = params.mois ? Number(params.mois) : undefined;
  const type = params.type === "PARC" || params.type === "EXCURSION" ? (params.type as ActivityType) : undefined;

  const [years, data] = await Promise.all([getAvailableYears(), getDashboardData({ annee, mois, type })]);

  const exportQuery = new URLSearchParams();
  if (params.annee) exportQuery.set("annee", params.annee);
  if (params.mois) exportQuery.set("mois", params.mois);
  if (params.type) exportQuery.set("type", params.type);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Tableau de bord</h1>
          <p className="text-sm text-muted-foreground">
            Vue d&apos;ensemble du chiffre d&apos;affaires et de la fréquentation — réservations payées uniquement,
            rattachées à leur date d&apos;encaissement.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <DashboardFilters years={years} />
          <a
            href={`/api/dashboard/export?${exportQuery.toString()}`}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-card-foreground hover:bg-muted"
          >
            <Download className="h-4 w-4" />
            Exporter en PDF
          </a>
          <a
            href={`/api/dashboard/export-csv?${exportQuery.toString()}`}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-card-foreground hover:bg-muted"
          >
            <Sheet className="h-4 w-4" />
            Exporter pour Excel / Sheets
          </a>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-card-foreground">Transfert des données entre ordinateurs</p>
          <p className="text-xs text-muted-foreground">
            En fin de journée, exportez un fichier de sauvegarde et importez-le sur le poste utilisé le lendemain s&apos;il
            est différent. L&apos;import remplace entièrement les données actuelles.
          </p>
        </div>
        <BackupButtons />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="CA total" value={formatEuros(data.caTotal)} icon={Euro} hint={`${data.reservationsCount} réservation(s) payée(s)`} />
        <KpiCard label="Total Pax" value={data.paxTotal.toString()} icon={Users} hint="Réservations payées uniquement" />
        <KpiCard
          label="Fréquentation moyenne"
          value={`${data.frequentationMoyenne} pax`}
          icon={Gauge}
          hint="Par session"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="rounded-xl border border-border bg-card p-5 lg:col-span-3">
          <h2 className="text-sm font-semibold text-card-foreground">Évolution du CA par mois</h2>
          <div className="mt-4">
            <RevenueByMonthChart data={data.caParMois} />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-card-foreground">Répartition du CA par activité</h2>
          <div className="mt-4">
            <RevenueByActivityChart data={data.caParActivite} />
          </div>
          <ul className="mt-2 space-y-1.5">
            {data.caParActivite.map((a) => (
              <li key={a.nom} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: a.couleur }} />
                  {a.nom}
                </span>
                <span className="font-medium text-card-foreground">{formatEuros(a.ca)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-card-foreground">Journal des ventes quotidien</h2>
          <p className="text-xs text-muted-foreground">
            Généré automatiquement à partir des réservations, par date d&apos;encaissement.
          </p>
        </div>
        <SalesJournal rows={data.journal} />
      </div>
    </div>
  );
}
