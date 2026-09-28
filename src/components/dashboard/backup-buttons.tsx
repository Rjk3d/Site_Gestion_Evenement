"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Download, Upload } from "lucide-react";
import { exportBackupData, importBackupData, type ImportBackupState } from "@/lib/actions/backup";

function downloadJson(json: string, filename: string) {
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function todayStamp() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function ImportSubmitButton({ onConfirm }: { onConfirm: () => Promise<void> }) {
  const { pending } = useFormStatus();
  const [preparing, setPreparing] = useState(false);

  return (
    <button
      type="button"
      disabled={pending || preparing}
      onClick={async () => {
        setPreparing(true);
        try {
          await onConfirm();
        } finally {
          setPreparing(false);
        }
      }}
      className="rounded-lg bg-rose-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-rose-700 disabled:opacity-50"
    >
      {preparing ? "Sauvegarde de sécurité..." : pending ? "Import en cours..." : "Confirmer le remplacement"}
    </button>
  );
}

export function BackupButtons() {
  const router = useRouter();
  const [exporting, setExporting] = useState(false);
  const [pendingFileName, setPendingFileName] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const [state, formAction] = useActionState<ImportBackupState, FormData>(importBackupData, undefined);

  useEffect(() => {
    if (state?.success) {
      setPendingFileName(null);
      formRef.current?.reset();
      router.refresh();
    }
  }, [state, router]);

  async function handleExport() {
    setExporting(true);
    try {
      const json = await exportBackupData();
      downloadJson(json, `evo2-sauvegarde-${todayStamp()}.json`);
    } finally {
      setExporting(false);
    }
  }

  function cancelImport() {
    setPendingFileName(null);
    formRef.current?.reset();
  }

  // Avant de remplacer les données, on télécharge automatiquement une copie de l'état
  // actuel : si quelqu'un importe le mauvais fichier par erreur, ce fichier de secours
  // permet de tout restaurer en le réimportant, sans qu'aucune manipulation technique
  // n'ait été nécessaire pour le créer.
  async function handleConfirmImport() {
    const json = await exportBackupData();
    downloadJson(json, `evo2-sauvegarde-auto-avant-import-${todayStamp()}.json`);
    formRef.current?.requestSubmit();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={handleExport}
        disabled={exporting}
        className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-card-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Download className="h-4 w-4" />
        {exporting ? "Export..." : "Exporter"}
      </button>

      <form ref={formRef} action={formAction} className="flex flex-wrap items-center gap-2">
        <label className="relative flex cursor-pointer items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-card-foreground hover:bg-muted">
          <Upload className="h-4 w-4" />
          Importer
          <input
            type="file"
            name="file"
            accept="application/json,.json"
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            onChange={(e) => setPendingFileName(e.target.files?.[0]?.name ?? null)}
          />
        </label>

        {pendingFileName && (
          <div className="flex flex-col gap-1.5">
            <span className="max-w-[280px] text-xs text-rose-600 dark:text-rose-400">
              Remplacer toutes les données actuelles par « {pendingFileName} » ? Une sauvegarde de vos données
              actuelles sera téléchargée automatiquement avant, par sécurité.
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={cancelImport}
                className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
              >
                Annuler
              </button>
              <ImportSubmitButton onConfirm={handleConfirmImport} />
            </div>
          </div>
        )}
      </form>

      {state?.error && <p className="text-xs font-medium text-rose-600 dark:text-rose-400">{state.error}</p>}
      {state?.success && <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{state.success}</p>}
    </div>
  );
}
