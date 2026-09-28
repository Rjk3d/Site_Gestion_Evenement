import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { StaffForm } from "@/components/staff/staff-form";

export default function NouveauPersonnelPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Link href="/personnel" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Retour au personnel
      </Link>

      <h1 className="mt-4 text-xl font-semibold text-foreground">Ajouter un membre du personnel</h1>
      <p className="text-sm text-muted-foreground">
        Il pourra ensuite être affecté à une session depuis le planning.
      </p>

      <div className="mt-6">
        <StaffForm />
      </div>
    </div>
  );
}
