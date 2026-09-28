import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getActivityForEdit } from "@/lib/activities-data";
import { ActivityForm } from "@/components/activities/activity-form";

export default async function GestionActivitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const activity = await getActivityForEdit(id);
  if (!activity) notFound();

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <Link href="/activites" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Retour aux activités
      </Link>

      <h1 className="mt-4 text-xl font-semibold text-foreground">Gérer « {activity.nom} »</h1>
      <p className="text-sm text-muted-foreground">
        Modifiez les tarifs, la capacité et les créneaux hebdomadaires : la réservation proposera automatiquement les
        nouvelles dates et horaires. Les sessions déjà programmées ne sont pas modifiées.
      </p>

      <div className="mt-6">
        <ActivityForm activity={activity} />
      </div>
    </div>
  );
}
