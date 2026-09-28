-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "datePaiement" DATETIME;

-- Reprise de l'existant : les réservations déjà payées sont rattachées à la date de
-- leur session (c'était la date utilisée par le suivi CA jusqu'ici), faute de connaître
-- le jour réel de l'encaissement. Les nouvelles réservations recevront la vraie date.
UPDATE "Booking"
SET "datePaiement" = (SELECT "date" FROM "Session" WHERE "Session"."id" = "Booking"."sessionId")
WHERE "statutReglement" = 'PAYE';
