export function formatEuros(value: number, maximumFractionDigits = 0) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits }).format(value);
}

export function formatDateFR(date: Date | string, options: Intl.DateTimeFormatOptions = {}) {
  const d = typeof date === "string" ? new Date(`${date}T00:00:00Z`) : date;
  return new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", ...options }).format(d);
}
