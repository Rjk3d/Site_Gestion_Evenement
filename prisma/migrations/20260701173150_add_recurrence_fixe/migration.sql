-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Activity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nom" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "couleur" TEXT NOT NULL DEFAULT '#6366f1',
    "prixAdulte" DECIMAL NOT NULL DEFAULT 0,
    "prixEnfant" DECIMAL,
    "capaciteParDefaut" INTEGER NOT NULL,
    "paxMinimum" INTEGER,
    "recurrenceFixe" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Activity" ("actif", "capaciteParDefaut", "couleur", "createdAt", "description", "id", "nom", "paxMinimum", "prixAdulte", "prixEnfant", "type", "updatedAt") SELECT "actif", "capaciteParDefaut", "couleur", "createdAt", "description", "id", "nom", "paxMinimum", "prixAdulte", "prixEnfant", "type", "updatedAt" FROM "Activity";
DROP TABLE "Activity";
ALTER TABLE "new_Activity" RENAME TO "Activity";
CREATE INDEX "Activity_type_idx" ON "Activity"("type");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
