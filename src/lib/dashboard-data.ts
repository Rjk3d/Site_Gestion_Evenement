import { prisma } from "@/lib/prisma";
import type { ActivityType, BookingStatus, Prisma } from "@/generated/prisma/client";

const MONTH_NAMES_FR = [
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

export type DashboardFilters = {
  annee?: number;
  mois?: number; // 1-12
  type?: ActivityType;
};

export type DashboardData = {
  caTotal: number;
  paxTotal: number;
  frequentationMoyenne: number;
  reservationsCount: number;
  caParMois: { mois: string; ca: number }[];
  caParActivite: { nom: string; ca: number; couleur: string }[];
  journal: { date: string; activites: string; pax: number; ca: number }[];
};

export async function getAvailableYears(): Promise<number[]> {
  const paiements = await prisma.booking.findMany({
    where: { statutReglement: "PAYE", datePaiement: { not: null } },
    select: { datePaiement: true },
  });
  const years = new Set(paiements.map((b) => b.datePaiement!.getUTCFullYear()));
  return Array.from(years).sort((a, b) => b - a);
}

// Le suivi CA est rattaché à la date d'encaissement (datePaiement), pas à la date de
// la session : une excursion payée à la réservation compte dans le CA du jour où elle
// est encaissée, pas du jour de la sortie.
function buildBookingWhere(filters: DashboardFilters): Prisma.BookingWhereInput {
  const where: Prisma.BookingWhereInput = { statutReglement: "PAYE" };

  if (filters.annee) {
    const startMonth = filters.mois ? filters.mois - 1 : 0;
    const start = new Date(Date.UTC(filters.annee, startMonth, 1));
    const end = filters.mois
      ? new Date(Date.UTC(filters.annee, filters.mois, 1))
      : new Date(Date.UTC(filters.annee + 1, 0, 1));
    where.datePaiement = { gte: start, lt: end };
  }

  if (filters.type) {
    where.session = { activity: { type: filters.type } };
  }

  return where;
}

export type ExportParticipant = {
  prenom: string;
  nom: string;
  age: number | null;
};

export type ExportBookingRow = {
  datePaiement: string;
  date: string; // date de la session (l'activité elle-même)
  heureDebut: string;
  heureFin: string;
  activite: string;
  client: string;
  telephone: string | null;
  participants: ExportParticipant[];
  pax: number;
  montant: number;
  statutReglement: BookingStatus;
};

export async function getBookingsForExport(filters: DashboardFilters): Promise<ExportBookingRow[]> {
  const bookings = await prisma.booking.findMany({
    where: buildBookingWhere(filters),
    select: {
      montantTotal: true,
      nombrePax: true,
      statutReglement: true,
      datePaiement: true,
      clientPrincipal: { select: { prenom: true, nom: true, telephone: true } },
      participants: { select: { prenom: true, nom: true, age: true }, orderBy: { createdAt: "asc" } },
      session: { select: { date: true, heureDebut: true, heureFin: true, activity: { select: { nom: true } } } },
    },
    orderBy: [{ datePaiement: "asc" }, { session: { date: "asc" } }, { createdAt: "asc" }],
  });

  return bookings.map((b) => ({
    // Repli sur la date de session pour d'éventuelles réservations payées sans date
    // d'encaissement (données antérieures à l'ajout du champ).
    datePaiement: (b.datePaiement ?? b.session.date).toISOString().slice(0, 10),
    date: b.session.date.toISOString().slice(0, 10),
    heureDebut: b.session.heureDebut,
    heureFin: b.session.heureFin,
    activite: b.session.activity.nom,
    client: b.clientPrincipal ? `${b.clientPrincipal.prenom} ${b.clientPrincipal.nom}` : "—",
    telephone: b.clientPrincipal?.telephone ?? null,
    participants: b.participants.map((p) => ({ prenom: p.prenom, nom: p.nom, age: p.age })),
    pax: b.nombrePax,
    montant: Number(b.montantTotal),
    statutReglement: b.statutReglement,
  }));
}

export async function getDashboardData(filters: DashboardFilters): Promise<DashboardData> {
  const bookings = await prisma.booking.findMany({
    where: buildBookingWhere(filters),
    select: {
      montantTotal: true,
      nombrePax: true,
      sessionId: true,
      datePaiement: true,
      session: { select: { date: true, activity: { select: { nom: true, couleur: true } } } },
    },
  });

  let caTotal = 0;
  let paxTotal = 0;
  const sessionIds = new Set<string>();
  const caByMonth = new Map<string, number>();
  const caByActivity = new Map<string, { ca: number; couleur: string }>();
  const journalByDay = new Map<string, { activites: Set<string>; pax: number; ca: number }>();

  for (const b of bookings) {
    const montant = Number(b.montantTotal);
    caTotal += montant;
    paxTotal += b.nombrePax;
    sessionIds.add(b.sessionId);

    // Agrégation par date d'encaissement ; repli sur la date de session pour
    // d'éventuelles réservations payées sans date de paiement (données anciennes).
    const d = b.datePaiement ?? b.session.date;
    const monthKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    caByMonth.set(monthKey, (caByMonth.get(monthKey) ?? 0) + montant);

    const actNom = b.session.activity.nom;
    const activiteEntry = caByActivity.get(actNom) ?? { ca: 0, couleur: b.session.activity.couleur };
    activiteEntry.ca += montant;
    caByActivity.set(actNom, activiteEntry);

    const dayKey = d.toISOString().slice(0, 10);
    const dayEntry = journalByDay.get(dayKey) ?? { activites: new Set<string>(), pax: 0, ca: 0 };
    dayEntry.activites.add(actNom);
    dayEntry.pax += b.nombrePax;
    dayEntry.ca += montant;
    journalByDay.set(dayKey, dayEntry);
  }

  const caParMois = Array.from(caByMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, ca]) => {
      const [year, month] = key.split("-");
      return { mois: `${MONTH_NAMES_FR[Number(month) - 1]} ${year}`, ca: Math.round(ca * 100) / 100 };
    });

  const caParActivite = Array.from(caByActivity.entries())
    .map(([nom, v]) => ({ nom, ca: Math.round(v.ca * 100) / 100, couleur: v.couleur }))
    .sort((a, b) => b.ca - a.ca);

  const journal = Array.from(journalByDay.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, v]) => ({
      date,
      activites: Array.from(v.activites).join(", "),
      pax: v.pax,
      ca: Math.round(v.ca * 100) / 100,
    }));

  return {
    caTotal: Math.round(caTotal * 100) / 100,
    paxTotal,
    frequentationMoyenne: sessionIds.size > 0 ? Math.round((paxTotal / sessionIds.size) * 10) / 10 : 0,
    reservationsCount: bookings.length,
    caParMois,
    caParActivite,
    journal,
  };
}
