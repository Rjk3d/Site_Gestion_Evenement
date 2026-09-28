import { prisma } from "@/lib/prisma";

export type StaffWithStats = {
  id: string;
  nom: string;
  actif: boolean;
  sessionsCount: number;
};

export async function getStaffList(): Promise<StaffWithStats[]> {
  const staff = await prisma.staff.findMany({
    orderBy: { nom: "asc" },
    include: { _count: { select: { sessions: true } } },
  });

  return staff.map((s) => ({ id: s.id, nom: s.nom, actif: s.actif, sessionsCount: s._count.sessions }));
}

export type StaffOption = { id: string; nom: string };

// Utilisé pour les listes déroulantes d'assignation : seul le personnel actif est proposé
// pour de nouvelles affectations, mais un membre inactif reste affiché sur les sessions
// passées où il apparaît déjà (cf. relation Session.staff, non filtrée par actif).
export async function getActiveStaffOptions(): Promise<StaffOption[]> {
  const staff = await prisma.staff.findMany({ where: { actif: true }, orderBy: { nom: "asc" } });
  return staff.map((s) => ({ id: s.id, nom: s.nom }));
}

export async function getStaffForEdit(staffId: string) {
  return prisma.staff.findUnique({ where: { id: staffId } });
}
