"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

const staffSchema = z.object({
  nom: z.string().trim().min(1, "Le nom est requis."),
  actif: z.boolean(),
});

export type StaffFormState = {
  error?: string;
} | undefined;

function revalidateStaffPages() {
  revalidatePath("/personnel");
  revalidatePath("/planning");
}

export async function createStaff(_prevState: StaffFormState, formData: FormData): Promise<StaffFormState> {
  const parsed = staffSchema.safeParse({
    nom: formData.get("nom"),
    actif: formData.get("actif") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };

  await prisma.staff.create({ data: parsed.data });

  revalidateStaffPages();
  redirect("/personnel");
}

export async function updateStaff(
  staffId: string,
  _prevState: StaffFormState,
  formData: FormData,
): Promise<StaffFormState> {
  const parsed = staffSchema.safeParse({
    nom: formData.get("nom"),
    actif: formData.get("actif") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };

  const existing = await prisma.staff.findUnique({ where: { id: staffId } });
  if (!existing) return { error: "Ce membre du personnel n'existe plus." };

  await prisma.staff.update({ where: { id: staffId }, data: parsed.data });

  revalidateStaffPages();
  redirect("/personnel");
}

// onDelete: SetNull sur Session.staffId (cf. schema.prisma) : les sessions déjà liées à ce
// membre du personnel ne sont pas supprimées, elles perdent simplement cette affectation.
export async function deleteStaff(staffId: string) {
  await prisma.staff.delete({ where: { id: staffId } });
  revalidateStaffPages();
}
