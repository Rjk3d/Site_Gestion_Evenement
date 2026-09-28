"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

const HEURE_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

const slotSchema = z
  .object({
    jourSemaine: z.number().int().min(0).max(6), // convention getUTCDay : 0 = dimanche .. 6 = samedi
    heureDebut: z.string().regex(HEURE_REGEX, "Heure de début invalide (format HH:mm)"),
    heureFin: z.string().regex(HEURE_REGEX, "Heure de fin invalide (format HH:mm)"),
    capacite: z.number().int().min(1).nullable(),
  })
  .refine((s) => s.heureFin > s.heureDebut, {
    message: "L'heure de fin d'un créneau doit être après son heure de début.",
  });

const activitySchema = z
  .object({
    nom: z.string().trim().min(1, "Le nom de l'activité est requis."),
    type: z.enum(["PARC", "EXCURSION"]),
    couleur: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Couleur invalide."),
    prixAdulte: z.number().min(0, "Le tarif adulte doit être positif."),
    prixEnfant: z.number().min(0).nullable(),
    capaciteParDefaut: z.number().int().min(1, "La capacité doit être d'au moins 1."),
    paxMinimum: z.number().int().min(1).nullable(),
    description: z.string().trim().optional(),
    actif: z.boolean(),
    // "Horaire libre" côté formulaire = recurrenceFixe false en base : toutes les
    // dates futures sont réservables avec une heure saisie librement.
    horaireLibre: z.boolean(),
    slots: z.array(slotSchema),
  })
  .refine((a) => a.horaireLibre || a.slots.length > 0, {
    message: "Ajoutez au moins un créneau hebdomadaire, ou activez l'horaire libre.",
  });

export type ActivityFormState = {
  error?: string;
} | undefined;

function parseNumberField(value: FormDataEntryValue | null): number | null {
  const s = String(value ?? "").trim();
  if (s === "") return null;
  const n = Number(s.replace(",", "."));
  return Number.isNaN(n) ? null : n;
}

function parseActivityForm(formData: FormData) {
  let slots: unknown;
  try {
    slots = JSON.parse(String(formData.get("slotsJson") ?? "[]"));
  } catch {
    return { success: false as const, error: "Liste de créneaux invalide." };
  }

  const parsed = activitySchema.safeParse({
    nom: formData.get("nom"),
    type: formData.get("type"),
    couleur: formData.get("couleur"),
    prixAdulte: parseNumberField(formData.get("prixAdulte")) ?? -1,
    prixEnfant: parseNumberField(formData.get("prixEnfant")),
    capaciteParDefaut: parseNumberField(formData.get("capaciteParDefaut")) ?? 0,
    paxMinimum: parseNumberField(formData.get("paxMinimum")),
    description: formData.get("description") || undefined,
    actif: formData.get("actif") === "on",
    horaireLibre: formData.get("horaireLibre") === "true",
    slots,
  });

  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }
  return { success: true as const, data: parsed.data };
}

export async function createActivity(_prevState: ActivityFormState, formData: FormData): Promise<ActivityFormState> {
  const parsed = parseActivityForm(formData);
  if (!parsed.success) return { error: parsed.error };

  const a = parsed.data;
  await prisma.activity.create({
    data: {
      nom: a.nom,
      type: a.type,
      couleur: a.couleur,
      prixAdulte: a.prixAdulte,
      prixEnfant: a.prixEnfant,
      capaciteParDefaut: a.capaciteParDefaut,
      paxMinimum: a.paxMinimum,
      description: a.description,
      actif: a.actif,
      recurrenceFixe: !a.horaireLibre,
      slots: a.horaireLibre
        ? undefined
        : {
            create: a.slots.map((s) => ({
              jourSemaine: s.jourSemaine,
              heureDebut: s.heureDebut,
              heureFin: s.heureFin,
              capacite: s.capacite,
            })),
          },
    },
  });

  revalidateActivityPages();
  redirect("/activites");
}

export async function updateActivity(
  activityId: string,
  _prevState: ActivityFormState,
  formData: FormData,
): Promise<ActivityFormState> {
  const parsed = parseActivityForm(formData);
  if (!parsed.success) return { error: parsed.error };

  const existing = await prisma.activity.findUnique({ where: { id: activityId } });
  if (!existing) return { error: "Cette activité n'existe plus." };

  const a = parsed.data;
  // Les créneaux sont remplacés en bloc : plus simple et sans risque, car ils ne
  // portent aucune donnée liée (les sessions déjà créées en base ne bougent pas).
  await prisma.$transaction([
    prisma.activitySlot.deleteMany({ where: { activityId } }),
    prisma.activity.update({
      where: { id: activityId },
      data: {
        nom: a.nom,
        type: a.type,
        couleur: a.couleur,
        prixAdulte: a.prixAdulte,
        prixEnfant: a.prixEnfant,
        capaciteParDefaut: a.capaciteParDefaut,
        paxMinimum: a.paxMinimum,
        description: a.description,
        actif: a.actif,
        recurrenceFixe: !a.horaireLibre,
        slots: a.horaireLibre
          ? undefined
          : {
              create: a.slots.map((s) => ({
                jourSemaine: s.jourSemaine,
                heureDebut: s.heureDebut,
                heureFin: s.heureFin,
                capacite: s.capacite,
              })),
            },
      },
    }),
  ]);

  revalidateActivityPages();
  redirect("/activites");
}

// Suppression définitive : la cascade du schéma supprime aussi les sessions,
// réservations, participants et checklists rattachés à cette activité.
export async function deleteActivity(activityId: string) {
  await prisma.activity.delete({ where: { id: activityId } });

  revalidateActivityPages();
}

function revalidateActivityPages() {
  revalidatePath("/activites");
  revalidatePath("/planning");
  revalidatePath("/reservations");
  revalidatePath("/reservations/nouvelle");
  revalidatePath("/");
}
