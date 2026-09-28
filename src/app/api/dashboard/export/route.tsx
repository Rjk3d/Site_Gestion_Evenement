import { renderToBuffer } from "@react-pdf/renderer";
import { getBookingsForExport, getDashboardData } from "@/lib/dashboard-data";
import { CaReportDocument } from "@/lib/pdf/ca-report";
import type { ActivityType } from "@/generated/prisma/client";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const annee = searchParams.get("annee") ? Number(searchParams.get("annee")) : undefined;
  const mois = searchParams.get("mois") ? Number(searchParams.get("mois")) : undefined;
  const typeParam = searchParams.get("type");
  const type = typeParam === "PARC" || typeParam === "EXCURSION" ? (typeParam as ActivityType) : undefined;

  const filters = { annee, mois, type };
  const [data, bookings] = await Promise.all([getDashboardData(filters), getBookingsForExport(filters)]);

  const buffer = await renderToBuffer(<CaReportDocument data={data} bookings={bookings} filters={filters} />);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="suivi-ca${annee ? `-${annee}` : ""}${mois ? `-${mois}` : ""}.pdf"`,
    },
  });
}
