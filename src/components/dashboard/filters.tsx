"use client";

import { useRouter, useSearchParams } from "next/navigation";

const MONTHS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

export function DashboardFilters({ years }: { years: number[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const annee = searchParams.get("annee") ?? "";
  const mois = searchParams.get("mois") ?? "";
  const type = searchParams.get("type") ?? "";

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/?${params.toString()}`);
  }

  const selectClass =
    "rounded-lg border border-border bg-card px-3 py-2 text-sm text-card-foreground focus:outline-none focus:ring-2 focus:ring-accent";

  return (
    <div className="flex flex-wrap gap-3">
      <select className={selectClass} value={annee} onChange={(e) => updateParam("annee", e.target.value)}>
        <option value="">Toutes les années</option>
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>

      <select className={selectClass} value={mois} onChange={(e) => updateParam("mois", e.target.value)}>
        <option value="">Tous les mois</option>
        {MONTHS.map((m, i) => (
          <option key={m} value={i + 1}>
            {m}
          </option>
        ))}
      </select>

      <select className={selectClass} value={type} onChange={(e) => updateParam("type", e.target.value)}>
        <option value="">Toutes les activités</option>
        <option value="PARC">Parc</option>
        <option value="EXCURSION">Excursion</option>
      </select>
    </div>
  );
}
