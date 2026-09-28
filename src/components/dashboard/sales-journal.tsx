import { formatDateFR, formatEuros } from "@/lib/format";

function formatDate(iso: string) {
  return formatDateFR(iso, { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
}

export function SalesJournal({ rows }: { rows: { date: string; activites: string; pax: number; ca: number }[] }) {
  if (rows.length === 0) {
    return <p className="p-5 text-sm text-muted-foreground">Aucune vente pour cette sélection.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-5 py-3 font-medium">Date de paiement</th>
            <th className="px-5 py-3 font-medium">Activités</th>
            <th className="px-5 py-3 font-medium text-right">Pax</th>
            <th className="px-5 py-3 font-medium text-right">CA du jour</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.date} className="border-b border-border last:border-0 hover:bg-muted/60">
              <td className="whitespace-nowrap px-5 py-3 capitalize text-card-foreground">{formatDate(row.date)}</td>
              <td className="px-5 py-3 text-muted-foreground">{row.activites}</td>
              <td className="px-5 py-3 text-right text-card-foreground">{row.pax}</td>
              <td className="whitespace-nowrap px-5 py-3 text-right font-medium text-card-foreground">
                {formatEuros(row.ca, 2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
