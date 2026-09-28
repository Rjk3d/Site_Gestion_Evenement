"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import {
  addMonthsUTC,
  formatMonthLabel,
  getMonthGridDays,
  parseISODate,
  startOfMonthUTC,
  toISODate,
} from "@/lib/calendar-utils";
import type { SessionSummary } from "@/lib/planning-data";

const WEEKDAY_HEADERS = ["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"];

function todayUTC() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export function DateTimePicker({
  sessions,
  freeSchedule = false,
  selectedDate,
  sessionId,
  onSelectDate,
  onSelectSession,
  manualHeureDebut = "",
  manualHeureFin = "",
  onManualHeureDebutChange,
  onManualHeureFinChange,
  disabled,
}: {
  sessions: SessionSummary[]; // sessions déjà filtrées pour l'activité choisie
  freeSchedule?: boolean; // activité "selon disponibilité" : aucune date grisée, heure libre
  selectedDate: string; // format ISO "yyyy-mm-dd", "" si aucune
  sessionId: string;
  onSelectDate: (iso: string) => void;
  onSelectSession: (id: string) => void;
  manualHeureDebut?: string;
  manualHeureFin?: string;
  onManualHeureDebutChange?: (value: string) => void;
  onManualHeureFinChange?: (value: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const today = useMemo(() => todayUTC(), []);

  const availableDates = useMemo(() => new Set(sessions.map((s) => toISODate(s.date))), [sessions]);

  const [viewMonth, setViewMonth] = useState(() =>
    startOfMonthUTC(selectedDate ? parseISODate(selectedDate) : (sessions[0]?.date ?? new Date())),
  );

  const days = useMemo(() => getMonthGridDays(viewMonth), [viewMonth]);

  const sessionsForDate = useMemo(
    () =>
      sessions
        .filter((s) => toISODate(s.date) === selectedDate)
        .sort((a, b) => a.heureDebut.localeCompare(b.heureDebut)),
    [sessions, selectedDate],
  );

  function openCalendar() {
    if (disabled) return;
    setViewMonth(startOfMonthUTC(selectedDate ? parseISODate(selectedDate) : (sessions[0]?.date ?? new Date())));
    setOpen(true);
  }

  const inputClass =
    "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-card-foreground focus:outline-none focus:ring-2 focus:ring-accent";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={openCalendar}
        disabled={disabled}
        className="flex w-full items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-card-foreground focus:outline-none focus:ring-2 focus:ring-accent disabled:cursor-not-allowed disabled:opacity-50"
      >
        <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
        {selectedDate ? (
          parseISODate(selectedDate).toLocaleDateString("fr-FR", {
            timeZone: "UTC",
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric",
          })
        ) : (
          <span className="text-muted-foreground">{disabled ? "Choisissez d'abord une activité" : "Choisir une date"}</span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute z-50 mt-2 w-72 rounded-xl border border-border bg-card p-3 shadow-xl">
            <div className="flex items-center justify-between px-1">
              <button
                type="button"
                onClick={() => setViewMonth((m) => addMonthsUTC(m, -1))}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
                aria-label="Mois précédent"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-medium capitalize text-card-foreground">{formatMonthLabel(viewMonth)}</span>
              <button
                type="button"
                onClick={() => setViewMonth((m) => addMonthsUTC(m, 1))}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
                aria-label="Mois suivant"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-2 grid grid-cols-7 gap-y-1 text-center">
              {WEEKDAY_HEADERS.map((w) => (
                <span key={w} className="text-[11px] font-medium text-muted-foreground">
                  {w}
                </span>
              ))}
              {days.map((d) => {
                const iso = toISODate(d);
                const inMonth = d.getUTCMonth() === viewMonth.getUTCMonth();
                const isPast = d.getTime() < today.getTime();
                const hasSession = freeSchedule ? !isPast : availableDates.has(iso);
                const isSelected = iso === selectedDate;
                return (
                  <button
                    key={iso}
                    type="button"
                    disabled={!hasSession}
                    onClick={() => {
                      onSelectDate(iso);
                      onSelectSession("");
                      setOpen(false);
                    }}
                    className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full text-xs transition-colors ${
                      isSelected
                        ? "bg-accent font-semibold text-accent-foreground"
                        : hasSession
                          ? "font-medium text-card-foreground hover:bg-muted"
                          : inMonth
                            ? "text-muted-foreground/40"
                            : "text-muted-foreground/20"
                    } ${!hasSession ? "cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    {d.getUTCDate()}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {selectedDate && freeSchedule && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Heure de début</label>
            <input
              type="time"
              className={inputClass}
              value={manualHeureDebut}
              onChange={(e) => onManualHeureDebutChange?.(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Heure de fin</label>
            <input
              type="time"
              className={inputClass}
              value={manualHeureFin}
              onChange={(e) => onManualHeureFinChange?.(e.target.value)}
            />
          </div>
        </div>
      )}

      {selectedDate && !freeSchedule && (
        <div className="mt-3 flex flex-wrap gap-2">
          {sessionsForDate.map((s) => {
            const restantes = s.capacite - s.paxReserve;
            const full = restantes <= 0;
            const isSelected = s.id === sessionId;
            return (
              <button
                key={s.id}
                type="button"
                disabled={full}
                onClick={() => onSelectSession(s.id)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  isSelected
                    ? "border-accent bg-accent text-accent-foreground"
                    : "border-border text-card-foreground hover:border-accent"
                }`}
              >
                {s.heureDebut} · {s.paxReserve}/{s.capacite}
                {full ? " complet" : ""}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
