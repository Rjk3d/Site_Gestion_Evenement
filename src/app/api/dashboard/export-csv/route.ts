import { getBookingsForExport } from "@/lib/dashboard-data";
import type { ActivityType } from "@/generated/prisma/client";

// Excel et Google Sheets en localisation française attendent le point-virgule comme
// séparateur de colonnes (la virgule sert déjà de séparateur décimal) : on l'utilise
// ici pour que le fichier s'ouvre correctement sans étape d'import manuelle.
const DELIMITER = ";";

// Libellés lisibles pour la colonne « État du paiement » (les réservations annulées
// sont déjà exclues de l'export, mais on garde le libellé par sécurité).
const STATUT_LABELS: Record<string, string> = {
  PAYE: "Payé",
  EN_ATTENTE: "En attente",
  ANNULE: "Annulé",
};

function csvCell(value: string | number): string {
  const s = String(value);
  if (s.includes(DELIMITER) || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const annee = searchParams.get("annee") ? Number(searchParams.get("annee")) : undefined;
  const mois = searchParams.get("mois") ? Number(searchParams.get("mois")) : undefined;
  const typeParam = searchParams.get("type");
  const type = typeParam === "PARC" || typeParam === "EXCURSION" ? (typeParam as ActivityType) : undefined;

  const bookings = await getBookingsForExport({ annee, mois, type });

  const header = [
    "Date paiement",
    "Date activité",
    "Horaire",
    "Activité",
    "Payeur",
    "Téléphone",
    "Participants",
    "Pax",
    "Montant (€)",
    "État du paiement",
  ]
    .map(csvCell)
    .join(DELIMITER);
  const rows = bookings.map((b) =>
    [
      b.datePaiement,
      b.date,
      `${b.heureDebut} - ${b.heureFin}`,
      b.activite,
      b.client,
      b.telephone ?? "",
      // Tous les participants ; l'âge n'est affiché que s'il est renseigné (typiquement les enfants).
      b.participants.map((p) => `${p.prenom} ${p.nom}${p.age != null ? ` (${p.age} ans)` : ""}`).join(" / "),
      b.pax,
      b.montant.toFixed(2).replace(".", ","),
      STATUT_LABELS[b.statutReglement] ?? b.statutReglement,
    ]
      .map(csvCell)
      .join(DELIMITER),
  );
  // BOM UTF-8 : sans lui, Excel affiche mal les accents à l'ouverture directe du fichier.
  const csv = "﻿" + [header, ...rows].join("\r\n") + "\r\n";

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="suivi-ca${annee ? `-${annee}` : ""}${mois ? `-${mois}` : ""}.csv"`,
    },
  });
}
