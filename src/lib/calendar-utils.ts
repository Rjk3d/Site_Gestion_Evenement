// Utilitaires de dates en UTC pur : les sessions sont stockées à minuit UTC
// (voir schema.prisma), donc toute la logique de calendrier reste en UTC pour
// éviter les décalages d'un jour selon le fuseau horaire du serveur.

export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function parseISODate(s: string): Date {
  const [y, m, day] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day));
}

// Jour calendaire local du poste (la caisse tourne en heure française), converti à
// minuit UTC comme toutes les dates stockées. À utiliser pour horodater un événement
// "métier" du jour (ex: date de paiement) sans risquer le décalage d'un jour que
// donnerait getUTCDate() tard le soir.
export function todayLocalAsUTCDate(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

export function addDaysUTC(d: Date, n: number): Date {
  const r = new Date(d);
  r.setUTCDate(r.getUTCDate() + n);
  return r;
}

export function addMonthsUTC(d: Date, n: number): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
}

export function startOfMonthUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

export function endOfMonthUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
}

// Semaine commençant le lundi
export function startOfWeekUTC(d: Date): Date {
  const day = d.getUTCDay(); // 0 = dimanche .. 6 = samedi
  const diff = day === 0 ? -6 : 1 - day;
  return addDaysUTC(d, diff);
}

export function isSameDayUTC(a: Date, b: Date): boolean {
  return toISODate(a) === toISODate(b);
}

const MOIS_FR = [
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

const JOURS_FR = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

export function formatMonthLabel(d: Date): string {
  return `${MOIS_FR[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function formatDayLabel(d: Date): string {
  return `${JOURS_FR[d.getUTCDay() === 0 ? 6 : d.getUTCDay() - 1]} ${d.getUTCDate()} ${MOIS_FR[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function weekdayShort(d: Date): string {
  return JOURS_FR[d.getUTCDay() === 0 ? 6 : d.getUTCDay() - 1].slice(0, 3);
}

export function getMonthGridDays(monthDate: Date): Date[] {
  const start = startOfMonthUTC(monthDate);
  const end = endOfMonthUTC(monthDate);
  const gridStart = startOfWeekUTC(start);
  const totalDaysInMonthView = Math.ceil((diffDaysUTC(gridStart, end) + 1) / 7) * 7;
  return Array.from({ length: totalDaysInMonthView }, (_, i) => addDaysUTC(gridStart, i));
}

export function getWeekDays(anyDateInWeek: Date): Date[] {
  const start = startOfWeekUTC(anyDateInWeek);
  return Array.from({ length: 7 }, (_, i) => addDaysUTC(start, i));
}

function diffDaysUTC(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}
