"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { toISODate, todayLocalAsUTCDate } from "@/lib/calendar-utils";
import type { BookingStatus, PaymentMethod } from "@/generated/prisma/client";

const CHECKLIST_FIELDS = ["infosPhil", "infosGO", "infosParents", "securiteOK", "infosPrestaOK"] as const;
type ChecklistField = (typeof CHECKLIST_FIELDS)[number];

function revalidateBooking(sessionId: string) {
  revalidatePath(`/planning/sessions/${sessionId}`);
  revalidatePath("/planning");
  revalidatePath("/reservations");
  revalidatePath("/");
}

export async function updateBookingStatut(bookingId: string, sessionId: string, statut: BookingStatus) {
  const existing = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { statutReglement: true, datePaiement: true },
  });
  if (!existing) return;

  // La date de paiement suit le statut : posée au passage à "Payé" (elle fait foi pour
  // le suivi CA), conservée si la réservation était déjà payée, effacée si elle repasse
  // en attente ou est annulée.
  const datePaiement =
    statut === "PAYE"
      ? (existing.statutReglement === "PAYE" && existing.datePaiement ? existing.datePaiement : todayLocalAsUTCDate())
      : null;

  await prisma.booking.update({ where: { id: bookingId }, data: { statutReglement: statut, datePaiement } });
  revalidateBooking(sessionId);
}

export async function updateBookingMode(bookingId: string, sessionId: string, mode: PaymentMethod) {
  await prisma.booking.update({ where: { id: bookingId }, data: { modeReglement: mode } });
  revalidateBooking(sessionId);
}

export async function updateBookingMontant(bookingId: string, sessionId: string, montant: number) {
  if (Number.isNaN(montant) || montant < 0) {
    throw new Error("Montant invalide.");
  }
  await prisma.booking.update({ where: { id: bookingId }, data: { montantTotal: montant } });
  revalidateBooking(sessionId);
}

export async function updateBookingNotes(bookingId: string, sessionId: string, notes: string) {
  await prisma.booking.update({ where: { id: bookingId }, data: { notes: notes || null } });
  revalidateBooking(sessionId);
}

export async function updateSessionStaff(sessionId: string, staffId: string) {
  await prisma.session.update({ where: { id: sessionId }, data: { staffId: staffId || null } });
  revalidateBooking(sessionId);
}

export async function toggleChecklistItem(bookingId: string, sessionId: string, field: ChecklistField, value: boolean) {
  if (!CHECKLIST_FIELDS.includes(field)) {
    throw new Error("Champ de checklist invalide.");
  }

  await prisma.checklist.upsert({
    where: { bookingId },
    create: { bookingId, [field]: value },
    update: { [field]: value },
  });

  revalidateBooking(sessionId);
}

// Supprime une réservation individuelle (une personne / un groupe) sans toucher au
// reste de la session.
export async function deleteBooking(bookingId: string, sessionId: string) {
  await prisma.booking.delete({ where: { id: bookingId } });
  revalidateBooking(sessionId);
}

// Supprime la session (l'événement) entière du calendrier, avec ses réservations
// restantes (ex : une sortie annulée faute de participants suffisants).
export async function deleteSession(sessionId: string) {
  const session = await prisma.session.findUnique({ where: { id: sessionId }, select: { date: true } });

  await prisma.session.delete({ where: { id: sessionId } });

  revalidatePath("/planning");
  revalidatePath("/reservations");
  revalidatePath("/");

  redirect(`/planning?view=month&date=${session ? toISODate(session.date) : ""}`);
}
