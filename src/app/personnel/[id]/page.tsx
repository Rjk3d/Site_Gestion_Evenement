import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getStaffForEdit } from "@/lib/staff-data";
import { StaffForm } from "@/components/staff/staff-form";

export default async function ModifierPersonnelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const staff = await getStaffForEdit(id);
  if (!staff) notFound();

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Link href="/personnel" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Retour au personnel
      </Link>

      <h1 className="mt-4 text-xl font-semibold text-foreground">Modifier « {staff.nom} »</h1>

      <div className="mt-6">
        <StaffForm staff={{ id: staff.id, nom: staff.nom, actif: staff.actif }} />
      </div>
    </div>
  );
}
