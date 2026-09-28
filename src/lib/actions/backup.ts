"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

// Sauvegarde/restauration complète de la base au format JSON. Utilisé pour transférer
// les données d'un ordinateur à un autre : un seul poste d'accueil est actif à la fois
// (pas de réservations simultanées à synchroniser), donc un simple export en fin de
// journée + import le lendemain sur l'autre poste suffit, sans hébergement partagé.

export async function exportBackupData(): Promise<string> {
  const [staff, activities, activitySlots, sessions, bookings, participants, checklists] = await Promise.all([
    prisma.staff.findMany(),
    prisma.activity.findMany(),
    prisma.activitySlot.findMany(),
    prisma.session.findMany(),
    prisma.booking.findMany(),
    prisma.participant.findMany(),
    prisma.checklist.findMany(),
  ]);

  return JSON.stringify(
    {
      version: 1,
      exportedAt: new Date().toISOString(),
      staff,
      activities,
      activitySlots,
      sessions,
      bookings,
      participants,
      checklists,
    },
    null,
    2,
  );
}

const decimalInput = z.union([z.string(), z.number()]);

const backupSchema = z.object({
  version: z.literal(1),
  staff: z.array(
    z.object({ id: z.string(), nom: z.string(), actif: z.boolean(), createdAt: z.string() }),
  ),
  activities: z.array(
    z.object({
      id: z.string(),
      nom: z.string(),
      type: z.enum(["PARC", "EXCURSION"]),
      actif: z.boolean(),
      couleur: z.string(),
      prixAdulte: decimalInput,
      prixEnfant: decimalInput.nullable(),
      capaciteParDefaut: z.number(),
      paxMinimum: z.number().nullable(),
      recurrenceFixe: z.boolean(),
      description: z.string().nullable(),
      createdAt: z.string(),
      updatedAt: z.string(),
    }),
  ),
  activitySlots: z.array(
    z.object({
      id: z.string(),
      activityId: z.string(),
      jourSemaine: z.number(),
      heureDebut: z.string(),
      heureFin: z.string(),
      capacite: z.number().nullable(),
      createdAt: z.string(),
    }),
  ),
  sessions: z.array(
    z.object({
      id: z.string(),
      activityId: z.string(),
      date: z.string(),
      heureDebut: z.string(),
      heureFin: z.string(),
      staffId: z.string().nullable(),
      capaciteMax: z.number().nullable(),
      notes: z.string().nullable(),
      createdAt: z.string(),
      updatedAt: z.string(),
    }),
  ),
  bookings: z.array(
    z.object({
      id: z.string(),
      sessionId: z.string(),
      clientPrincipalId: z.string().nullable(),
      nombrePax: z.number(),
      statutReglement: z.enum(["EN_ATTENTE", "PAYE", "ANNULE"]),
      modeReglement: z.enum(["CMP", "ESP", "CB", "CAR", "GRATUIT", "GO", "AUTRE"]).nullable(),
      montantTotal: decimalInput,
      // Optionnels : absents des sauvegardes antérieures à l'ajout de ces champs.
      prixLibre: decimalInput.nullable().optional(),
      datePaiement: z.string().nullable().optional(),
      notes: z.string().nullable(),
      createdAt: z.string(),
      updatedAt: z.string(),
    }),
  ),
  participants: z.array(
    z.object({
      id: z.string(),
      nom: z.string(),
      prenom: z.string(),
      age: z.number().nullable(),
      isAdult: z.boolean(),
      telephone: z.string().nullable(),
      presenceParent: z.boolean(),
      bookingId: z.string(),
      createdAt: z.string(),
    }),
  ),
  checklists: z.array(
    z.object({
      id: z.string(),
      bookingId: z.string(),
      infosPhil: z.boolean(),
      infosGO: z.boolean(),
      infosParents: z.boolean(),
      securiteOK: z.boolean(),
      infosPrestaOK: z.boolean(),
      updatedAt: z.string(),
    }),
  ),
});

export type ImportBackupState = {
  error?: string;
  success?: string;
} | undefined;

export async function importBackupData(_prevState: ImportBackupState, formData: FormData): Promise<ImportBackupState> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Sélectionnez un fichier de sauvegarde (.json)." };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(await file.text());
  } catch {
    return { error: "Fichier invalide : ce n'est pas un JSON valide." };
  }

  const parsed = backupSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "Ce fichier ne correspond pas à un export de cette application." };
  }
  const data = parsed.data;

  await prisma.$transaction(async (tx) => {
    // On repart d'une base vide avant de tout recréer ; l'ordre respecte les
    // dépendances (tables filles vidées avant les tables parentes, comme dans seed.ts).
    await tx.checklist.deleteMany();
    await tx.participant.deleteMany();
    await tx.booking.deleteMany();
    await tx.session.deleteMany();
    await tx.activitySlot.deleteMany();
    await tx.activity.deleteMany();
    await tx.staff.deleteMany();

    if (data.staff.length > 0) {
      await tx.staff.createMany({
        data: data.staff.map((s) => ({ id: s.id, nom: s.nom, actif: s.actif, createdAt: new Date(s.createdAt) })),
      });
    }

    if (data.activities.length > 0) {
      await tx.activity.createMany({
        data: data.activities.map((a) => ({
          id: a.id,
          nom: a.nom,
          type: a.type,
          actif: a.actif,
          couleur: a.couleur,
          prixAdulte: a.prixAdulte,
          prixEnfant: a.prixEnfant,
          capaciteParDefaut: a.capaciteParDefaut,
          paxMinimum: a.paxMinimum,
          recurrenceFixe: a.recurrenceFixe,
          description: a.description,
          createdAt: new Date(a.createdAt),
          updatedAt: new Date(a.updatedAt),
        })),
      });
    }

    if (data.activitySlots.length > 0) {
      await tx.activitySlot.createMany({
        data: data.activitySlots.map((s) => ({
          id: s.id,
          activityId: s.activityId,
          jourSemaine: s.jourSemaine,
          heureDebut: s.heureDebut,
          heureFin: s.heureFin,
          capacite: s.capacite,
          createdAt: new Date(s.createdAt),
        })),
      });
    }

    if (data.sessions.length > 0) {
      await tx.session.createMany({
        data: data.sessions.map((s) => ({
          id: s.id,
          activityId: s.activityId,
          date: new Date(s.date),
          heureDebut: s.heureDebut,
          heureFin: s.heureFin,
          staffId: s.staffId,
          capaciteMax: s.capaciteMax,
          notes: s.notes,
          createdAt: new Date(s.createdAt),
          updatedAt: new Date(s.updatedAt),
        })),
      });
    }

    if (data.bookings.length > 0) {
      // clientPrincipalId est renseigné dans un second temps, une fois les participants
      // créés (même contrainte que createBooking : la relation est bidirectionnelle).
      await tx.booking.createMany({
        data: data.bookings.map((b) => ({
          id: b.id,
          sessionId: b.sessionId,
          clientPrincipalId: null,
          nombrePax: b.nombrePax,
          statutReglement: b.statutReglement,
          modeReglement: b.modeReglement,
          montantTotal: b.montantTotal,
          prixLibre: b.prixLibre ?? null,
          datePaiement: b.datePaiement ? new Date(b.datePaiement) : null,
          notes: b.notes,
          createdAt: new Date(b.createdAt),
          updatedAt: new Date(b.updatedAt),
        })),
      });
    }

    if (data.participants.length > 0) {
      await tx.participant.createMany({
        data: data.participants.map((p) => ({
          id: p.id,
          nom: p.nom,
          prenom: p.prenom,
          age: p.age,
          isAdult: p.isAdult,
          telephone: p.telephone,
          presenceParent: p.presenceParent,
          bookingId: p.bookingId,
          createdAt: new Date(p.createdAt),
        })),
      });
    }

    for (const b of data.bookings) {
      if (b.clientPrincipalId) {
        await tx.booking.update({ where: { id: b.id }, data: { clientPrincipalId: b.clientPrincipalId } });
      }
    }

    if (data.checklists.length > 0) {
      await tx.checklist.createMany({
        data: data.checklists.map((c) => ({
          id: c.id,
          bookingId: c.bookingId,
          infosPhil: c.infosPhil,
          infosGO: c.infosGO,
          infosParents: c.infosParents,
          securiteOK: c.securiteOK,
          infosPrestaOK: c.infosPrestaOK,
          updatedAt: new Date(c.updatedAt),
        })),
      });
    }
  });

  revalidatePath("/", "layout");

  return {
    success: `Import terminé : ${data.activities.length} activité(s), ${data.sessions.length} session(s), ${data.bookings.length} réservation(s).`,
  };
}
