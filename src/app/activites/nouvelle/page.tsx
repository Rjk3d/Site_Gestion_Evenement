import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ActivityForm } from "@/components/activities/activity-form";

export default function NouvelleActivitePage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <Link href="/activites" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Retour aux activités
      </Link>

      <h1 className="mt-4 text-xl font-semibold text-foreground">Nouvelle activité</h1>
      <p className="text-sm text-muted-foreground">
        Définissez les tarifs, la capacité et les créneaux hebdomadaires proposés à la réservation — ou activez
        l&apos;horaire libre pour une activité selon disponibilité.
      </p>

      <div className="mt-6">
        <ActivityForm />
      </div>
    </div>
  );
}
