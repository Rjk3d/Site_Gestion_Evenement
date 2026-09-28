import { prisma } from "@/lib/prisma";
import type { ActivityType, BookingStatus, Prisma } from "@/generated/prisma/client";

export type BookingListFilters = {
  statut?: BookingStatus;
  type?: ActivityType;
  q?: string;
};

export async function getBookingsList(filters: BookingListFilters) {
  const where: Prisma.BookingWhereInput = {};

  if (filters.statut) {
    where.statutReglement = filters.statut;
  }
  if (filters.type) {
    where.session = { activity: { type: filters.type } };
  }
  if (filters.q) {
    where.OR = [
      { clientPrincipal: { nom: { contains: filters.q } } },
      { clientPrincipal: { prenom: { contains: filters.q } } },
      { clientPrincipal: { telephone: { contains: filters.q } } },
    ];
  }

  return prisma.booking.findMany({
    where,
    include: {
      clientPrincipal: true,
      session: { include: { activity: true } },
    },
    orderBy: [{ session: { date: "desc" } }, { createdAt: "desc" }],
    take: 200,
  });
}

export async function getActivitiesForForm() {
  return prisma.activity.findMany({
    where: { actif: true },
    orderBy: { nom: "asc" },
  });
}
