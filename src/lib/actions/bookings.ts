"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { parseISODate, todayLocalAsUTCDate } from "@/lib/calendar-utils";

const participantSchema = z.object({
  prenom: z.string().trim().min(1, "Prénom requis"),
  nom: z.string().trim().min(1, "Nom requis"),
  age: z.number().int().min(0).max(120).nullable(),
  isAdult: z.boolean(),
  telephone: z.string().trim().optional(),
  presenceParent: z.boolean(),
});

const formSchema = z.object({
  sessionId: z.string().min(1, "Sélectionnez un créneau"),
  participants: z.array(participantSchema).min(1, "Ajoutez au moins un participant"),
  modeReglement: z.enum(["CMP", "ESP", "CB", "CAR", "GRATUIT", "GO", "AUTRE"]),
  statutReglement: z.enum(["EN_ATTENTE", "PAYE", "ANNULE"]),
  prixLibre: z.number().min(0, "Le prix libre doit être positif.").nullable(),
  notes: z.string().trim().optional(),
});

export type BookingFormState = {
  error?: string;
} | undefined;

// Champ vide = pas de prix libre ; une saisie invalide devient -1 pour être
// rejetée par le schéma plutôt que silencieusement ignorée.
function parsePrixLibre(value: FormDataEntryValue | null): number | null {
  const s = String(value ?? "").trim();
  if (s === "") return null;
  const n = Number(s.replace(",", "."));
  return Number.isNaN(n) ? -1 : n;
}

export async function createBooking(_prevState: BookingFormState, formData: FormData): Promise<BookingFormState> {
  let participants: unknown;
  try {
    participants = JSON.parse(String(formData.get("participantsJson") ?? "[]"));
  } catch {
    return { error: "Liste de participants invalide." };
  }

  const parsed = formSchema.safeParse({
    sessionId: formData.get("sessionId"),
    participants,
    modeReglement: formData.get("modeReglement"),
    statutReglement: formData.get("statutReglement"),
    prixLibre: parsePrixLibre(formData.get("prixLibre")),
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const { sessionId, participants: pax, modeReglement, statutReglement, prixLibre, notes } = parsed.data;

  // Un créneau "virtuel" (récurrence future pas encore matérialisée en base) est créé
  // à la volée dès qu'une réservation est effectivement passée dessus.
  let realSessionId = sessionId;
  if (sessionId.startsWith("virtual:")) {
    const [activityId, dateIso, heureDebut, heureFin] = sessionId.slice("virtual:".length).split("|");
    if (!activityId || !dateIso || !heureDebut || !heureFin) {
      return { error: "Créneau invalide." };
    }

    const date = parseISODate(dateIso);
    const existingVirtual = await prisma.session.findFirst({ where: { activityId, date, heureDebut } });
    if (existingVirtual) {
      realSessionId = existingVirtual.id;
    } else {
      // Si le créneau vient d'un créneau hebdomadaire configuré avec une capacité
      // spécifique, on la reporte sur la session matérialisée.
      const slot = await prisma.activitySlot.findFirst({
        where: { activityId, jourSemaine: date.getUTCDay(), heureDebut },
      });
      realSessionId = (
        await prisma.session.create({
          data: { activityId, date, heureDebut, heureFin, capaciteMax: slot?.capacite ?? undefined },
        })
      ).id;
    }
  }

  const session = await prisma.session.findUnique({
    where: { id: realSessionId },
    include: { activity: true },
  });

  if (!session) {
    return { error: "Ce créneau n'existe plus. Rechargez la page." };
  }

  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (session.date.getTime() < today.getTime()) {
    return { error: "Ce créneau est déjà passé, impossible d'y ajouter une réservation." };
  }

  // Le montant est toujours recalculé côté serveur à partir des tarifs de l'activité :
  // on ne fait jamais confiance à un total transmis par le client. Seul le prix libre
  // (supplément sur mesure, par nature saisi à la main) s'y ajoute tel quel.
  const montantTotal =
    pax.reduce((sum, p) => {
      const prix = p.isAdult ? session.activity.prixAdulte : (session.activity.prixEnfant ?? session.activity.prixAdulte);
      return sum + Number(prix);
    }, 0) + (prixLibre ?? 0);

  const booking = await prisma.booking.create({
    data: {
      sessionId: realSessionId,
      nombrePax: pax.length,
      statutReglement,
      modeReglement,
      montantTotal,
      prixLibre,
      // La date de paiement fait foi pour le suivi CA : posée seulement si la
      // réservation est encaissée d'emblée (sinon elle le sera au passage à "Payé").
      datePaiement: statutReglement === "PAYE" ? todayLocalAsUTCDate() : null,
      notes: notes || undefined,
      checklist: { create: {} },
      participants: {
        create: pax.map((p) => ({
          prenom: p.prenom,
          nom: p.nom,
          age: p.age,
          isAdult: p.isAdult,
          telephone: p.telephone || undefined,
          presenceParent: p.presenceParent,
        })),
      },
    },
    include: { participants: true },
  });

  await prisma.booking.update({
    where: { id: booking.id },
    data: { clientPrincipalId: booking.participants[0].id },
  });

  revalidatePath("/reservations");
  revalidatePath("/planning");
  revalidatePath(`/planning/sessions/${realSessionId}`);
  revalidatePath("/");

  redirect(`/planning/sessions/${realSessionId}`);
}
