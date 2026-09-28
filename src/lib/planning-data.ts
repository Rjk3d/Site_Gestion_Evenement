import { prisma } from "@/lib/prisma";

export type SessionSummary = {
  id: string;
  date: Date;
  heureDebut: string;
  heureFin: string;
  activityId: string;
  activityNom: string;
  activityCouleur: string;
  activityType: "PARC" | "EXCURSION";
  staffNom: string | null;
  capacite: number;
  paxMinimum: number | null;
  paxReserve: number;
};

export async function getSessionsForRange(start: Date, end: Date): Promise<SessionSummary[]> {
  const sessions = await prisma.session.findMany({
    where: { date: { gte: start, lte: end } },
    include: {
      activity: { select: { nom: true, couleur: true, type: true, capaciteParDefaut: true, paxMinimum: true } },
      staff: { select: { nom: true } },
      bookings: {
        where: { statutReglement: { not: "ANNULE" } },
        select: { nombrePax: true },
      },
    },
    orderBy: [{ date: "asc" }, { heureDebut: "asc" }],
  });

  return sessions.map((s) => ({
    id: s.id,
    date: s.date,
    heureDebut: s.heureDebut,
    heureFin: s.heureFin,
    activityId: s.activityId,
    activityNom: s.activity.nom,
    activityCouleur: s.activity.couleur,
    activityType: s.activity.type,
    staffNom: s.staff?.nom ?? null,
    capacite: s.capaciteMax ?? s.activity.capaciteParDefaut,
    paxMinimum: s.activity.paxMinimum,
    paxReserve: s.bookings.reduce((sum, b) => sum + b.nombrePax, 0),
  }));
}

export async function getDefaultPlanningDate(): Promise<Date> {
  const sessions = await prisma.session.findMany({ select: { date: true }, orderBy: { date: "asc" } });
  if (sessions.length === 0) {
    return new Date();
  }
  const now = Date.now();
  let closest = sessions[0].date;
  let closestDiff = Math.abs(closest.getTime() - now);
  for (const s of sessions) {
    const d = Math.abs(s.date.getTime() - now);
    if (d < closestDiff) {
      closest = s.date;
      closestDiff = d;
    }
  }
  return closest;
}

export async function getSessionDetail(id: string) {
  const session = await prisma.session.findUnique({
    where: { id },
    include: {
      activity: true,
      staff: true,
      bookings: {
        include: {
          participants: true,
          clientPrincipal: true,
          checklist: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!session) return null;

  const capacite = session.capaciteMax ?? session.activity.capaciteParDefaut;
  const paxReserve = session.bookings
    .filter((b) => b.statutReglement !== "ANNULE")
    .reduce((sum, b) => sum + b.nombrePax, 0);

  return { session, capacite, paxReserve };
}
