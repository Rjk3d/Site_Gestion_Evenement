import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { DashboardData, DashboardFilters, ExportBookingRow } from "@/lib/dashboard-data";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica", color: "#0f172a" },
  title: { fontSize: 18, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  subtitle: { fontSize: 10, color: "#64748b", marginBottom: 16 },
  sectionTitle: { fontSize: 12, fontFamily: "Helvetica-Bold", marginTop: 18, marginBottom: 8 },
  kpiRow: { flexDirection: "row", gap: 12, marginBottom: 8 },
  kpiCard: { flex: 1, borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 4, padding: 10 },
  kpiLabel: { fontSize: 8, color: "#64748b", marginBottom: 4 },
  kpiValue: { fontSize: 14, fontFamily: "Helvetica-Bold" },
  table: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 4 },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  tableRowLast: { flexDirection: "row" },
  tableHeaderCell: {
    flex: 1,
    padding: 6,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#64748b",
    textTransform: "uppercase",
  },
  tableCell: { flex: 1, padding: 6, fontSize: 9 },
  tableCellRight: { flex: 1, padding: 6, fontSize: 9, textAlign: "right" },
  dailyTotalRow: { flexDirection: "row", backgroundColor: "#f1f5f9" },
  dailyTotalLabel: { flex: 5, padding: 6, fontSize: 9, fontFamily: "Helvetica-Bold" },
  dailyTotalValue: { flex: 1, padding: 6, fontSize: 9, fontFamily: "Helvetica-Bold", textAlign: "right" },
  footer: { position: "absolute", bottom: 20, left: 32, right: 32, fontSize: 8, color: "#94a3b8", textAlign: "center" },
});

// `toLocaleString("fr-FR")` sépare les milliers avec une espace fine insécable (U+202F)
// que la police de base du PDF ne sait pas afficher (elle se superpose au texte suivant).
// On formate donc les milliers à la main avec une espace normale.
function formatEurosPdf(value: number) {
  const [intPart, decPart] = value.toFixed(2).split(".");
  const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${withThousands},${decPart} €`;
}

function formatDatePdf(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", weekday: "short", day: "2-digit", month: "short", year: "numeric" }).format(
    new Date(`${iso}T00:00:00Z`),
  );
}

function describeFilters(filters: DashboardFilters): string {
  const parts: string[] = [];
  if (filters.mois) {
    const MONTH_NAMES = [
      "Janvier",
      "Février",
      "Mars",
      "Avril",
      "Mai",
      "Juin",
      "Juillet",
      "Août",
      "Septembre",
      "Octobre",
      "Novembre",
      "Décembre",
    ];
    parts.push(MONTH_NAMES[filters.mois - 1]);
  }
  if (filters.annee) parts.push(String(filters.annee));
  if (filters.type) parts.push(filters.type === "PARC" ? "Parc" : "Excursion");
  return parts.length > 0 ? parts.join(" · ") : "Toutes périodes et activités";
}

// Regroupe les réservations par jour d'encaissement et ajoute une ligne de total
// journalier après chaque groupe (les réservations sont déjà triées par date de
// paiement croissante en amont).
function groupByDay(rows: ExportBookingRow[]): { date: string; rows: ExportBookingRow[]; total: number }[] {
  const groups: { date: string; rows: ExportBookingRow[]; total: number }[] = [];
  for (const row of rows) {
    const last = groups[groups.length - 1];
    if (last && last.date === row.datePaiement) {
      last.rows.push(row);
      last.total += row.montant;
    } else {
      groups.push({ date: row.datePaiement, rows: [row], total: row.montant });
    }
  }
  return groups;
}

export function CaReportDocument({
  data,
  bookings,
  filters,
}: {
  data: DashboardData;
  bookings: ExportBookingRow[];
  filters: DashboardFilters;
}) {
  const generatedAt = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date());

  const groups = groupByDay(bookings);

  return (
    <Document title="Suivi du chiffre d'affaires">
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Suivi du chiffre d&apos;affaires</Text>
        <Text style={styles.subtitle}>
          {describeFilters(filters)} · Généré le {generatedAt}
        </Text>

        <View style={styles.kpiRow}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>CA TOTAL</Text>
            <Text style={styles.kpiValue}>{formatEurosPdf(data.caTotal)}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>TOTAL PAX</Text>
            <Text style={styles.kpiValue}>{data.paxTotal}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>RÉSERVATIONS</Text>
            <Text style={styles.kpiValue}>{data.reservationsCount}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Détail des réservations</Text>
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <Text style={styles.tableHeaderCell}>Paiement</Text>
            <Text style={styles.tableHeaderCell}>Activité</Text>
            <Text style={styles.tableHeaderCell}>Date activité</Text>
            <Text style={styles.tableHeaderCell}>Client</Text>
            <Text style={styles.tableHeaderCell}>Pax</Text>
            <Text style={styles.tableHeaderCell}>CA</Text>
          </View>

          {groups.map((group, gi) => (
            <View key={group.date} wrap={false}>
              {group.rows.map((row, ri) => (
                <View
                  key={ri}
                  style={ri === group.rows.length - 1 && gi === groups.length - 1 ? styles.tableRowLast : styles.tableRow}
                >
                  <Text style={styles.tableCell}>{formatDatePdf(row.datePaiement)}</Text>
                  <Text style={styles.tableCell}>{row.activite}</Text>
                  <Text style={styles.tableCell}>{formatDatePdf(row.date)}</Text>
                  <Text style={styles.tableCell}>{row.client}</Text>
                  <Text style={styles.tableCellRight}>{row.pax}</Text>
                  <Text style={styles.tableCellRight}>{formatEurosPdf(row.montant)}</Text>
                </View>
              ))}
              <View style={styles.dailyTotalRow}>
                <Text style={styles.dailyTotalLabel}>Total encaissé le {formatDatePdf(group.date)}</Text>
                <Text style={styles.dailyTotalValue}>{formatEurosPdf(group.total)}</Text>
              </View>
            </View>
          ))}

          {groups.length === 0 && <Text style={{ padding: 10, color: "#64748b" }}>Aucune réservation pour cette période.</Text>}
        </View>

        <Text style={styles.footer} fixed>
          Activités & Excursions — document généré automatiquement, à usage interne.
        </Text>
      </Page>
    </Document>
  );
}
