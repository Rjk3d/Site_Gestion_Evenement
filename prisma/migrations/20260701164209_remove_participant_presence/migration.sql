/*
  Warnings:

  - You are about to drop the column `present` on the `Participant` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Participant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "age" INTEGER,
    "isAdult" BOOLEAN NOT NULL DEFAULT false,
    "telephone" TEXT,
    "presenceParent" BOOLEAN NOT NULL DEFAULT false,
    "bookingId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Participant_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Participant" ("age", "bookingId", "createdAt", "id", "isAdult", "nom", "prenom", "presenceParent", "telephone") SELECT "age", "bookingId", "createdAt", "id", "isAdult", "nom", "prenom", "presenceParent", "telephone" FROM "Participant";
DROP TABLE "Participant";
ALTER TABLE "new_Participant" RENAME TO "Participant";
CREATE INDEX "Participant_bookingId_idx" ON "Participant"("bookingId");
CREATE INDEX "Participant_telephone_idx" ON "Participant"("telephone");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
