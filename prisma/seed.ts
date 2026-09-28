// Script de seed - données représentatives réelles (anonymisation non nécessaire :
// il s'agit des propres données historiques du client, réutilisées dans son propre
// environnement de développement pour valider la migration depuis Google Sheets).
//
// Sources : "B2C - accrobranche.csv", "B2C - suivi CA.csv", "B2C - planning excu.csv"
// Un échantillon représentatif est repris (pas l'intégralité des ~950 lignes) pour
// rester lisible tout en couvrant les cas réels : familles multi-pax, mineurs avec/sans
// parent présent, tous les modes de règlement observés, et plusieurs annulations
// gérées proprement via un statut (au lieu des lignes de CA négatives de l'ancien fichier).

import type { PaymentMethod, BookingStatus } from "../src/generated/prisma/client";
import { prisma } from "../src/lib/prisma";

type PInput = {
  p: string; // prénom
  n: string; // nom
  age?: number;
  adult?: boolean;
  tel?: string;
  parent?: boolean; // présence parent (mineurs)
};

const E = (p: string, n: string, age?: number, tel?: string, parent?: boolean): PInput => ({
  p,
  n,
  age,
  adult: false,
  tel,
  parent,
});
const A = (p: string, n: string, tel?: string, parent?: boolean): PInput => ({
  p,
  n,
  adult: true,
  tel,
  parent,
});

function accrobrancheTotal(participants: PInput[]) {
  return participants.reduce((sum, x) => sum + (x.adult ? 22 : 16), 0);
}

async function session(
  activityId: string,
  date: string,
  heureDebut: string,
  heureFin: string,
  opts: { staffId?: string; capaciteMax?: number } = {},
) {
  return prisma.session.create({
    data: { activityId, date: new Date(date), heureDebut, heureFin, staffId: opts.staffId, capaciteMax: opts.capaciteMax },
  });
}

async function booking(
  sessionId: string,
  participants: PInput[],
  opts: {
    montant?: number;
    mode?: PaymentMethod;
    statut?: BookingStatus;
    notes?: string;
    checklist?: [boolean, boolean, boolean, boolean, boolean]; // phil, go, parents, securite, presta
    principal?: number;
    nombrePax?: number;
  } = {},
) {
  const montant = opts.montant ?? accrobrancheTotal(participants);
  const [phil, go, parentsOk, securite, presta] = opts.checklist ?? [false, false, false, false, false];

  const created = await prisma.booking.create({
    data: {
      sessionId,
      nombrePax: opts.nombrePax ?? participants.length,
      statutReglement: opts.statut ?? "PAYE",
      modeReglement: opts.mode ?? "CMP",
      montantTotal: montant,
      notes: opts.notes,
      checklist: {
        create: { infosPhil: phil, infosGO: go, infosParents: parentsOk, securiteOK: securite, infosPrestaOK: presta },
      },
      participants: {
        create: participants.map((x) => ({
          prenom: x.p,
          nom: x.n,
          age: x.age,
          isAdult: !!x.adult,
          telephone: x.tel,
          presenceParent: !!x.parent,
        })),
      },
    },
    include: { participants: true },
  });

  await prisma.booking.update({
    where: { id: created.id },
    data: { clientPrincipalId: created.participants[opts.principal ?? 0].id },
  });

  return created;
}

async function main() {
  console.log("Nettoyage de la base...");
  await prisma.checklist.deleteMany();
  await prisma.participant.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.session.deleteMany();
  await prisma.staff.deleteMany();
  await prisma.activity.deleteMany();

  console.log("Création du staff...");
  const oceane = await prisma.staff.create({ data: { nom: "Océane" } });
  const gaelle = await prisma.staff.create({ data: { nom: "Gaëlle" } });

  console.log("Création des activités...");
  const accrobranche = await prisma.activity.create({
    data: {
      nom: "Accrobranche",
      type: "PARC",
      couleur: "#16a34a",
      prixAdulte: 22,
      prixEnfant: 16,
      capaciteParDefaut: 14,
      description: "Parcours dans les arbres, plusieurs créneaux le mercredi.",
    },
  });
  const grasseMougins = await prisma.activity.create({
    data: {
      nom: "Excursion Grasse-Mougins",
      type: "EXCURSION",
      couleur: "#f59e0b",
      prixAdulte: 65,
      capaciteParDefaut: 20,
      paxMinimum: 5,
      description: "Sortie du mardi, 13h30-17h.",
    },
  });
  const antibes = await prisma.activity.create({
    data: {
      nom: "Antibes",
      type: "EXCURSION",
      couleur: "#0ea5e9",
      prixAdulte: 65,
      capaciteParDefaut: 20,
      paxMinimum: 5,
      description: "Sortie du mercredi, 13h30-17h.",
    },
  });
  const stPaul = await prisma.activity.create({
    data: {
      nom: "St Paul de Vence",
      type: "EXCURSION",
      couleur: "#8b5cf6",
      prixAdulte: 80,
      capaciteParDefaut: 20,
      paxMinimum: 5,
      description: "Sortie du jeudi, 13h30-17h.",
    },
  });
  const atelierParfum = await prisma.activity.create({
    data: {
      nom: "Atelier Parfum",
      type: "EXCURSION",
      couleur: "#ec4899",
      prixAdulte: 84,
      capaciteParDefaut: 15,
      description: "Atelier de fabrication de parfum (Fragonard).",
      recurrenceFixe: false,
    },
  });
  const seminaire = await prisma.activity.create({
    data: {
      nom: "Séminaire",
      type: "EXCURSION",
      couleur: "#64748b",
      prixAdulte: 72,
      capaciteParDefaut: 50,
      description: "Prestation groupe / entreprise.",
      recurrenceFixe: false,
    },
  });
  const bateau1h30 = await prisma.activity.create({
    data: { nom: "Bateau 1h30", type: "EXCURSION", couleur: "#3b82f6", prixAdulte: 55, capaciteParDefaut: 12, recurrenceFixe: false },
  });
  const bateau2h30 = await prisma.activity.create({
    data: { nom: "Bateau 2h30", type: "EXCURSION", couleur: "#1d4ed8", prixAdulte: 75, capaciteParDefaut: 12, recurrenceFixe: false },
  });

  // ---------------------------------------------------------------------
  // PASSÉ (juin 2026) - historique déjà soldé, alimente le dashboard (CA, journal des ventes)
  // ---------------------------------------------------------------------
  console.log("Sessions & réservations - juin 2026 (historique)...");

  // Bloc du matin regroupant plusieurs rotations : capacité élargie en conséquence.
  const acc0904 = await session(accrobranche.id, "2026-06-17", "10:00", "13:00", { staffId: oceane.id, capaciteMax: 20 });
  await booking(acc0904.id, [E("Enfant", "Gianolli", 9), E("Enfant", "Gianolli", 7)]);
  await booking(acc0904.id, [E("Enfant", "Huyghe", 8)], { notes: "Réservé par Hannebique pour l'enfant Huyghe" });
  await booking(acc0904.id, [E("Enfant 1", "De Bussac", 10), E("Enfant 2", "De Bussac", 8), A("Parent", "De Bussac")]);
  await booking(acc0904.id, [E("Enfant", "De Brucker", 9)], { mode: "ESP", notes: "Réglé en espèces" });
  await booking(acc0904.id, [E("Enfant 1", "Reuter", 11), E("Enfant 2", "Reuter", 9), A("Parent", "Reuter")]);
  await booking(acc0904.id, [E("Enfant", "Dupré", 10)], { mode: "ESP", notes: "Réglé en espèces" });
  await booking(acc0904.id, [
    E("Grace", "Finlayson", 12),
    E("Sophie", "Finlayson", 10),
    E("Mylo", "Finlayson", 8),
    A("Rachel", "Kerr Nav"),
    A("Adulte 2", "Finlayson"),
    A("Adulte 3", "Finlayson"),
  ], { notes: "Groupe familial élargi" });

  const acc1604 = await session(accrobranche.id, "2026-06-24", "10:00", "13:00", { staffId: oceane.id });
  await booking(acc1604.id, [E("Enfant 1", "Juengst", 9), E("Enfant 2", "Juengst", 7)]);
  await booking(acc1604.id, [E("Enfant 1", "Sitbon", 10), E("Enfant 2", "Sitbon", 8)]);
  await booking(acc1604.id, [E("Enfant", "Bonhomme", 9)]);

  const grasse0804 = await session(grasseMougins.id, "2026-06-16", "13:30", "17:00", { staffId: gaelle.id });
  await booking(grasse0804.id, [A("Client", "Lainé")], {
    montant: 40,
    statut: "ANNULE",
    notes: "Client annulé - remboursement effectué (ancien système : ligne de CA négative -40€, remplacée ici par un simple statut ANNULE)",
  });

  const grasse1504 = await session(grasseMougins.id, "2026-06-23", "13:30", "17:00", { staffId: gaelle.id });
  await booking(grasse1504.id, [A("Joelle", "Bardio", "06 64 52 39 53"), A("Hoel", "Le Gallo", "06 64 52 39 53")], {
    montant: 130,
  });
  await booking(grasse1504.id, [A("Céline", "Riou", "06 77 75 66 25")], { montant: 65 });

  // Session Antibes du mercredi : volontairement vide (créneau réellement non rempli
  // dans le fichier d'origine) pour tester l'indicateur "0 / X pax" du planning.
  await session(antibes.id, "2026-06-24", "13:30", "17:00", { staffId: oceane.id });

  const stPaul1704 = await session(stPaul.id, "2026-06-25", "13:30", "17:00", { staffId: gaelle.id });
  await booking(stPaul1704.id, [A("Adulte 1", "Cotis"), A("Adulte 2", "Cotis")], {
    montant: 100,
    statut: "ANNULE",
    notes: "Annulé, remboursé",
  });
  await booking(stPaul1704.id, [A("Adulte 1", "Delattre"), A("Adulte 2", "Delattre")], {
    montant: 100,
    statut: "ANNULE",
    notes: "Annulé, remboursé",
  });

  const atelier1204 = await session(atelierParfum.id, "2026-06-20", "10:00", "12:00", { staffId: oceane.id });
  await booking(atelier1204.id, [A("Adulte 1", "Kjeldsen"), A("Adulte 2", "Kjeldsen"), E("Enfant", "Kjeldsen", 11)], {
    montant: 202.5,
    mode: "ESP",
    notes: "Réglé en espèces",
  });

  // ---------------------------------------------------------------------
  // AUJOURD'HUI ET À VENIR (juillet 2026) - ACCROBRANCHE
  // (journée complète du jour même + semaines suivantes)
  // ---------------------------------------------------------------------
  console.log("Sessions & réservations - juillet 2026 (Accrobranche)...");

  const s0907_1030 = await session(accrobranche.id, "2026-07-01", "10:30", "11:30", { staffId: oceane.id, capaciteMax: 14 });
  const morning = [true, true, true, false, false] as [boolean, boolean, boolean, boolean, boolean];
  await booking(s0907_1030.id, [E("Colline", "Trotemann", 11, "06 16 79 67 45")], { checklist: morning });
  await booking(s0907_1030.id, [E("Louise", "Regnier", 11)], { checklist: morning });
  await booking(s0907_1030.id, [E("Mathilde", "Knall-Demars", 11), E("Appoline", "Knall-Demars", 12, "06 48 10 63 42")], {
    checklist: morning,
  });
  await booking(s0907_1030.id, [E("Sixtine", "Neff", 12)], { checklist: morning });
  await booking(s0907_1030.id, [E("Léon", "Albrecht", 11, "41 79 138 17 14")], { mode: "ESP", checklist: morning });
  await booking(s0907_1030.id, [E("Camille", "Papet", 11)], { checklist: morning });
  await booking(s0907_1030.id, [E("Lou-Ann", "Camate", 12)], { mode: "CAR", checklist: morning });
  await booking(s0907_1030.id, [E("Chloé", "Jervis", 11, "06 16 66 67 30")], { checklist: morning });
  await booking(s0907_1030.id, [E("Emy", "Hien", 12)], { checklist: morning });
  await booking(s0907_1030.id, [E("Joris", "Benichou", 11)], { checklist: morning });
  await booking(s0907_1030.id, [E("Julia", "Lesbordes", 13, "41 78 600 66 47", true)], { checklist: morning });

  const s0907_1330 = await session(accrobranche.id, "2026-07-01", "13:30", "14:30", { staffId: oceane.id, capaciteMax: 14 });
  const afternoon = [true, false, true, false, false] as [boolean, boolean, boolean, boolean, boolean];
  await booking(s0907_1330.id, [E("Bérénice", "Durand", 13, "06 68 51 64 99", true)], { checklist: afternoon });

  const s0907_1430 = await session(accrobranche.id, "2026-07-01", "14:30", "15:30", { staffId: gaelle.id, capaciteMax: 14 });
  await booking(s0907_1430.id, [E("Alice", "Oerig / Theurot", 10, "06 4 792 88 54", true)], { checklist: afternoon });
  await booking(s0907_1430.id, [A("Julien", "Prime"), A("Laure", "Prime")], {
    notes: "Passer en premiers car cirque 15h30",
    checklist: [true, false, false, false, false],
  });

  const s0907_1530 = await session(accrobranche.id, "2026-07-01", "15:30", "16:30", { staffId: gaelle.id, capaciteMax: 14 });
  await booking(s0907_1530.id, [A("Benoît", "Loiseau", "06 87 93 86 72", true), E("Hector", "Loiseau", 12, "06 87 93 86 72", true), E("Félix", "Loiseau", 14, "06 87 93 86 72", true)], {
    checklist: afternoon,
  });
  await booking(s0907_1530.id, [E("Arthur", "Brolet", 11, "32 47 48 92 724", true)], { checklist: afternoon });
  await booking(s0907_1530.id, [A("Serge", "Camboly", "06 61 71 83 47", true), A("Nathalie", "Camboly", "06 61 71 83 47", true), E("Emmy", "Camboly", 17, "06 61 71 83 47", true)], {
    checklist: afternoon,
  });

  const s0907_1600 = await session(accrobranche.id, "2026-07-01", "16:00", "17:00", { staffId: gaelle.id, capaciteMax: 14 });
  await booking(s0907_1600.id, [E("Agathe", "Busson", 11, undefined, true), E("Léo", "Busson", 8, undefined, true)], {
    mode: "CAR",
    checklist: afternoon,
  });

  // Semaine suivante (variante avec familles recomposées / mélangées)
  const s1607_0930 = await session(accrobranche.id, "2026-07-08", "09:30", "10:30", { staffId: oceane.id, capaciteMax: 14 });
  await booking(s1607_0930.id, [E("Clément", "Schabo", 10, "06 58 32 00 74")], { checklist: morning });
  await booking(s1607_0930.id, [E("Pandora", "Lair Lachize / Celedoni", 8, "07 60 32 28 16", true)], { checklist: morning });
  await booking(s1607_0930.id, [E("Emma", "Bodrero", 10, "06 17 81 42 26")], { checklist: morning });
  await booking(s1607_0930.id, [E("Shenay", "Darwish / Greiche", 8, "06 11 77 65 82")], { mode: "CAR", checklist: morning });
  await booking(s1607_0930.id, [E("Adrien", "Triebel / Pelletier", 8, "0049 176 637 064 09"), E("Eliot", "Plantard", 9, "0049 176 637 064 09")], {
    checklist: morning,
  });
  await booking(s1607_0930.id, [E("Anna", "D'heygere / Maes", 9)], { checklist: morning });

  const s1607_1030 = await session(accrobranche.id, "2026-07-08", "10:30", "11:30", { staffId: oceane.id, capaciteMax: 14 });
  await booking(s1607_1030.id, [E("Robin", "Schabo", 12, "06 58 32 00 74")], { checklist: morning });
  await booking(s1607_1030.id, [E("Alice", "Smorowinski", 11, "06 17 29 58 30"), E("Arthur", "Smorowinski", 11, "06 17 29 58 30")], {
    checklist: morning,
  });
  await booking(s1607_1030.id, [E("Marceau", "Dubresson", 12, "07 84 10 56 16")], { checklist: morning });
  await booking(s1607_1030.id, [E("Albane", "Celedoni", 11, "07 60 32 28 16"), E("Lissandre", "Celedoni", 13, "07 60 32 28 16")], {
    checklist: morning,
  });
  await booking(s1607_1030.id, [E("Sarah", "Bodrero", 12, "06 17 81 42 26")], { checklist: morning });

  const s1607_1130 = await session(accrobranche.id, "2026-07-08", "11:30", "12:30", { staffId: oceane.id, capaciteMax: 14 });
  await booking(s1607_1130.id, [E("Hugo", "Zegierman / Carrie", 13)], { checklist: morning });
  await booking(s1607_1130.id, [E("Aures", "Safsaf", 13)], { checklist: morning });

  const s1607_1430 = await session(accrobranche.id, "2026-07-08", "14:30", "15:30", { staffId: gaelle.id, capaciteMax: 14 });
  await booking(s1607_1430.id, [E("Alma", "De Fraissinette / Lipp", 8, "06 40 23 34 21", true), E("Mathilde", "Mazziotta / Lipp", 8, "06 40 23 34 21", true)], {
    checklist: afternoon,
  });
  await booking(s1607_1430.id, [E("Raphael", "Mazziotta / Lipp", 10, "06 40 23 34 21", true), E("Léon", "Lipp", 10, "06 40 23 34 21", true)], {
    checklist: afternoon,
  });
  await booking(s1607_1430.id, [E("Stanislas", "Corthay", 8, "0041 79 473 93 38", true), E("Joséphine", "Corthay", 10, "0041 79 473 93 38", true), A("Christophe", "Corthay", "0041 79 473 93 38")], {
    checklist: afternoon,
  });
  await booking(s1607_1430.id, [A("Véronique", "Carrasco", "06 64 44 36 36"), E("Eleonore", "Carrasco", 10, "06 64 44 36 36", true), E("Aurélien", "Carrasco", 8, "06 64 44 36 36", true)], {
    mode: "CAR",
    checklist: afternoon,
  });
  await booking(s1607_1430.id, [E("Marcel", "Lipp", 8, undefined, true)], { checklist: afternoon });
  await booking(s1607_1430.id, [E("Stefano", "Becker", 11, "1 204 232 3237", true), E("Francesco", "Becker", 9, "1 204 232 3237", true), E("Matteo", "Becker", 8, "1 204 232 3237", true)], {
    mode: "CAR",
    notes: "Payé via avance excursion (cash)",
    checklist: afternoon,
  });

  const s1607_1530 = await session(accrobranche.id, "2026-07-08", "15:30", "16:30", { staffId: gaelle.id, capaciteMax: 14 });
  await booking(s1607_1530.id, [E("Ralph", "Assaf", 13, "961 3 866 369", true)], { checklist: afternoon });

  const s1607_1600 = await session(accrobranche.id, "2026-07-08", "16:00", "17:00", { staffId: gaelle.id, capaciteMax: 14 });
  await booking(s1607_1600.id, [E("Elisabeth", "Parker", 12, "44 78 259 344 52", true), A("Max", "Parker", "44 78 259 344 52")], {
    checklist: afternoon,
  });

  // Semaine plus calme (contraste de remplissage pour la jauge du planning)
  const s2307_0930 = await session(accrobranche.id, "2026-07-15", "09:30", "10:30", { staffId: oceane.id, capaciteMax: 14 });
  await booking(s2307_0930.id, [E("Olivia", "Van Lint / Capron", 9, "32 47 49 60 478")], { checklist: morning });
  await booking(s2307_0930.id, [E("Chiara", "Roobaert", 9, "32 47 79 22 790")], { checklist: morning });

  const s2307_1530 = await session(accrobranche.id, "2026-07-15", "15:30", "16:30", { staffId: gaelle.id, capaciteMax: 14 });
  await booking(s2307_1530.id, [E("Gabriel", "Sejourne", 8, "06 77 08 94 01", true), E("Justine", "Sejourne", 12, "06 77 08 94 01", true), E("Clémence", "Sejourne", 14, "06 77 08 94 01", true)], {
    checklist: afternoon,
  });

  const s2307_1630 = await session(accrobranche.id, "2026-07-15", "16:30", "17:30", { staffId: gaelle.id, capaciteMax: 14 });
  await booking(s2307_1630.id, [A("Salomé", "Fatyga", undefined, true), A("Romane", "Fatyga", undefined, true), A("Julie", "Fatyga", undefined, true), A("Tania", "Fatyga", undefined, true)], {
    montant: 0,
    mode: "GRATUIT",
    checklist: afternoon,
  });

  // ---------------------------------------------------------------------
  // À VENIR (juillet 2026) - EXCURSIONS, ATELIER, SÉMINAIRE, BATEAU
  // ---------------------------------------------------------------------
  console.log("Sessions & réservations - juillet 2026 (excursions & autres)...");

  const grasse1507 = await session(grasseMougins.id, "2026-07-07", "13:30", "17:00", { staffId: gaelle.id });
  await booking(grasse1507.id, [A("Adulte", "Montembault"), E("Enfant 1", "Montembault", 10), E("Enfant 2", "Montembault", 8)], {
    montant: 150,
  });
  await booking(grasse1507.id, [A("Adulte 1", "Richomme"), A("Adulte 2", "Richomme")], { montant: 100 });

  const grasse2207 = await session(grasseMougins.id, "2026-07-14", "13:30", "17:00", { staffId: gaelle.id });
  await booking(grasse2207.id, [A("Adulte", "Rosenplaenter"), E("Enfant 1", "Rosenplaenter", 12), E("Enfant 2", "Rosenplaenter", 10), E("Enfant 3", "Rosenplaenter", 8)], {
    montant: 200,
  });
  await booking(grasse2207.id, [A("Adulte 1", "Goodwin"), A("Adulte 2", "Goodwin")], { montant: 100 });
  await booking(grasse2207.id, [E("Ado 1", "Zeitoun", 15), E("Ado 2", "Zeitoun", 16)], { montant: 100 });
  await booking(grasse2207.id, [A("Client", "Costantino")], {
    montant: 50,
    statut: "ANNULE",
    notes: "Annulé",
  });

  const stPaul1707 = await session(stPaul.id, "2026-07-09", "13:30", "17:00", { staffId: oceane.id });
  await booking(stPaul1707.id, [A("Client", "Verhaeghe", "06 32 55 24 69")], { montant: 65 });
  await booking(stPaul1707.id, [A("Adulte 1", "Cattersel"), A("Adulte 2", "Heeman"), E("Enfant 1", "Heeman", 11), E("Enfant 2", "Heeman", 9)], {
    montant: 260,
  });

  const atelier1907 = await session(atelierParfum.id, "2026-07-11", "10:00", "12:00", { staffId: oceane.id });
  await booking(atelier1907.id, [A("Client", "Oudoul", "06 09 72 36 90")], { montant: 62 });
  await booking(atelier1907.id, [A("Client", "Beccavin", "06 71 96 09 57")], { montant: 62, mode: "CAR" });

  const atelier2607 = await session(atelierParfum.id, "2026-07-18", "10:00", "12:00", { staffId: gaelle.id });
  await booking(atelier2607.id, [A("Client", "Borelli", "06 77 08 22 98")], { montant: 84, mode: "CAR" });
  await booking(atelier2607.id, [A("Adulte 1", "Guisset", "06 60 80 88 77"), A("Adulte 2", "Guisset", "06 60 80 88 77"), E("Enfant", "Guisset", 9, "06 60 80 88 77")], {
    montant: 180.5,
  });
  await booking(atelier2607.id, [A("Adulte", "Corthay"), E("Enfant 1", "Corthay", 8), E("Enfant 2", "Corthay", 10)], { montant: 128 });
  await booking(atelier2607.id, [A("Adulte", "Van De Wall", "0031 65 380 71 82"), E("Ado", "Van De Wall", 15, "0031 65 380 71 82")], {
    montant: 118.5,
    statut: "ANNULE",
    notes: "Annulé",
  });

  const seminaire2407 = await session(seminaire.id, "2026-07-10", "09:00", "17:00", { staffId: gaelle.id, capaciteMax: 50 });
  await booking(seminaire2407.id, [A("Contact groupe", "SC Riviera Réalisation")], {
    montant: 2880,
    nombrePax: 40,
    notes: "Réservation groupe entreprise - 40 pax",
    checklist: [true, true, true, true, true],
  });

  const bateau1h30_2407 = await session(bateau1h30.id, "2026-07-10", "14:00", "15:30", { staffId: oceane.id });
  await booking(bateau1h30_2407.id, [A("Adulte 1", "Paterson"), A("Adulte 2", "Paterson")], {
    montant: 90,
    mode: "ESP",
    notes: "Payé via avance excursion (cash)",
  });

  const bateau2h30_2407 = await session(bateau2h30.id, "2026-07-10", "16:00", "18:30", { staffId: gaelle.id });
  await booking(bateau2h30_2407.id, [A("Jean Christophe", "Le Brun", "32 49 94 88 488"), A("Eve", "Maury", "32 49 94 88 488")], {
    montant: 130,
    mode: "CB",
  });

  const [totalBookings, totalParticipants, totalSessions] = await Promise.all([
    prisma.booking.count(),
    prisma.participant.count(),
    prisma.session.count(),
  ]);
  console.log(`Terminé : ${totalSessions} sessions, ${totalBookings} réservations, ${totalParticipants} participants.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
