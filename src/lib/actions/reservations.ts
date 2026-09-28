"use server";

import { prisma } from "@/lib/prisma";
import { addDaysUTC, toISODate } from "@/lib/calendar-utils";
import type { SessionSummary } from "@/lib/planning-data";

// Horizon "sans limite" en pratique : un an de sessions virtuelles générées à la volée.
const VIRTUAL_HORIZON_DAYS = 365;

// Une activité à récurrence fixe tourne sur le(s) même(s) jour(s) de la semaine et
// créneau(x) horaire(s) (ex: Accrobranche = mercredi). Le rythme vient en priorité
// des créneaux hebdomadaires configurés sur l'activité (ActivitySlot, modifiables
// depuis la page de gestion) ; à défaut, il est déduit des sessions déjà créées par
// le passé (ancien comportement). À partir de là, on peut proposer n'importe quelle
// date future correspondante, sans limite dans le temps.
export async function getVirtualSessionsForActivity(activityId: string): Promise<SessionSummary[]> {
  const activity = await prisma.activity.findUnique({
    where: { id: activityId },
    include: { slots: true },
  });
  if (!activity || !activity.recurrenceFixe) return [];

  const allSessions = await prisma.session.findMany({
    where: { activityId },
    select: { date: true, heureDebut: true, heureFin: true },
  });

  const templates = new Map<string, { weekday: number; heureDebut: string; heureFin: string; capacite: number }>();
  if (activity.slots.length > 0) {
    for (const s of activity.slots) {
      templates.set(`${s.jourSemaine}-${s.heureDebut}`, {
        weekday: s.jourSemaine,
        heureDebut: s.heureDebut,
        heureFin: s.heureFin,
        capacite: s.capacite ?? activity.capaciteParDefaut,
      });
    }
  } else {
    for (const s of allSessions) {
      const weekday = s.date.getUTCDay();
      const key = `${weekday}-${s.heureDebut}`;
      if (!templates.has(key)) {
        templates.set(key, {
          weekday,
          heureDebut: s.heureDebut,
          heureFin: s.heureFin,
          capacite: activity.capaciteParDefaut,
        });
      }
    }
  }
  if (templates.size === 0) return [];

  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const existingKeys = new Set(
    allSessions.filter((s) => s.date.getTime() >= today.getTime()).map((s) => `${toISODate(s.date)}-${s.heureDebut}`),
  );

  const results: SessionSummary[] = [];
  for (let i = 0; i <= VIRTUAL_HORIZON_DAYS; i++) {
    const date = addDaysUTC(today, i);
    const weekday = date.getUTCDay();
    const iso = toISODate(date);

    for (const t of templates.values()) {
      if (t.weekday !== weekday) continue;
      const key = `${iso}-${t.heureDebut}`;
      if (existingKeys.has(key)) continue; // une vraie session existe déjà à cette date/heure

      results.push({
        id: `virtual:${activityId}|${iso}|${t.heureDebut}|${t.heureFin}`,
        date,
        heureDebut: t.heureDebut,
        heureFin: t.heureFin,
        activityId,
        activityNom: activity.nom,
        activityCouleur: activity.couleur,
        activityType: activity.type,
        staffNom: null,
        capacite: t.capacite,
        paxMinimum: activity.paxMinimum,
        paxReserve: 0,
      });
    }
  }

  return results;
}
