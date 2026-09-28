export function ReservationsFilters({ q, statut, type }: { q?: string; statut?: string; type?: string }) {
  const selectClass =
    "rounded-lg border border-border bg-card px-3 py-2 text-sm text-card-foreground focus:outline-none focus:ring-2 focus:ring-accent";

  return (
    <form method="get" className="flex flex-wrap gap-3">
      <input
        type="text"
        name="q"
        defaultValue={q}
        placeholder="Rechercher un nom, prénom, téléphone..."
        className={`${selectClass} w-64`}
      />
      <select name="statut" defaultValue={statut ?? ""} className={selectClass}>
        <option value="">Tous les statuts</option>
        <option value="PAYE">Payé</option>
        <option value="EN_ATTENTE">En attente</option>
        <option value="ANNULE">Annulé</option>
      </select>
      <select name="type" defaultValue={type ?? ""} className={selectClass}>
        <option value="">Toutes les activités</option>
        <option value="PARC">Parc</option>
        <option value="EXCURSION">Excursion</option>
      </select>
      <button type="submit" className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90">
        Filtrer
      </button>
    </form>
  );
}
