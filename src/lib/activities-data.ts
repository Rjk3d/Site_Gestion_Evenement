import { prisma } from "@/lib/prisma";
import type { ActivityType } from "@/generated/prisma/client";

export type ActivitySlotData = {
  id: string;
  jourSemaine: number; // 0 = dimanche .. 6 = samedi (convention getUTCDay)
  heureDebut: string;
  heureFin: string;
  capacite: number | null;
};

export type ActivityWithStats = {
  id: string;
  nom: string;
  type: ActivityType;
  actif: boolean;
  couleur: string;
  prixAdulte: number;
  prixEnfant: number | null;
  capaciteParDefaut: number;
  recurrenceFixe: boolean;
  slots: ActivitySlotData[];
  sessionsCount: number;
  bookingsCount: number;
};

const SLOT_ORDER = [{ jourSemaine: "asc" }, { heureDebut: "asc" }] as const;

export async function getActivitiesWithStats(): Promise<ActivityWithStats[]> {
  const activities = await prisma.activity.findMany({
    orderBy: { nom: "asc" },
    include: {
      _count: { select: { sessions: true } },
      slots: { orderBy: [...SLOT_ORDER] },
    },
  });

  const results: ActivityWithStats[] = [];
  for (const a of activities) {
    const bookingsCount = await prisma.booking.count({ where: { session: { activityId: a.id } } });
    results.push({
      id: a.id,
      nom: a.nom,
      type: a.type,
      actif: a.actif,
      couleur: a.couleur,
      prixAdulte: Number(a.prixAdulte),
      prixEnfant: a.prixEnfant != null ? Number(a.prixEnfant) : null,
      capaciteParDefaut: a.capaciteParDefaut,
      recurrenceFixe: a.recurrenceFixe,
      slots: a.slots.map((s) => ({
        id: s.id,
        jourSemaine: s.jourSemaine,
        heureDebut: s.heureDebut,
        heureFin: s.heureFin,
        capacite: s.capacite,
      })),
      sessionsCount: a._count.sessions,
      bookingsCount,
    });
  }
  return results;
}

export type ActivityForEdit = {
  id: string;
  nom: string;
  type: ActivityType;
  actif: boolean;
  couleur: string;
  prixAdulte: number;
  prixEnfant: number | null;
  capaciteParDefaut: number;
  paxMinimum: number | null;
  recurrenceFixe: boolean;
  description: string | null;
  slots: ActivitySlotData[];
};

export async function getActivityForEdit(activityId: string): Promise<ActivityForEdit | null> {
  const a = await prisma.activity.findUnique({
    where: { id: activityId },
    include: { slots: { orderBy: [...SLOT_ORDER] } },
  });
  if (!a) return null;

  return {
    id: a.id,
    nom: a.nom,
    type: a.type,
    actif: a.actif,
    couleur: a.couleur,
    prixAdulte: Number(a.prixAdulte),
    prixEnfant: a.prixEnfant != null ? Number(a.prixEnfant) : null,
    capaciteParDefaut: a.capaciteParDefaut,
    paxMinimum: a.paxMinimum,
    recurrenceFixe: a.recurrenceFixe,
    description: a.description,
    slots: a.slots.map((s) => ({
      id: s.id,
      jourSemaine: s.jourSemaine,
      heureDebut: s.heureDebut,
      heureFin: s.heureFin,
      capacite: s.capacite,
    })),
  };
}
