# 🌲 Activités & Excursions — Gestion B2C

Application web de gestion des **activités de loisirs** (accrobranche…) et des **excursions** (Grasse-Mougins, Antibes, St-Paul-de-Vence, atelier parfum…).
Elle remplace les anciens fichiers Google Sheets (`suivi CA`, `récap B2C`, `planning excu`, `accrobranche`) par une base de données unique et une interface claire.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma)
![SQLite](https://img.shields.io/badge/SQLite-local-003B57?logo=sqlite)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-4-38BDF8?logo=tailwindcss&logoColor=white)

---

## ✨ Fonctionnalités

| Module | Description |
| --- | --- |
| 📊 **Tableau de bord** | KPI (CA, pax, fréquentation), graphiques, journal des ventes, filtres par période, export **PDF** et **CSV**, sauvegarde de la base |
| 📅 **Planning** | Vues jour / semaine / mois, sessions avec jauge de capacité, affectation du personnel, check-lists |
| 🎟️ **Réservations** | Création et suivi des réservations, participants (mineurs / adultes, présence parent), statut (en attente, payé, annulé), modes de règlement (CMP, espèces, CB, carte cadeau, offert…), prix libre |
| 🧗 **Activités** | Parcs (créneaux récurrents, capacité fixe) et excursions (pax minimum), créneaux, couleur calendrier |
| 👥 **Personnel** | Gestion de l'équipe et affectation aux sessions |
| 🌗 **Thème** | Mode clair / sombre |

## 🛠️ Stack technique

- **[Next.js 16](https://nextjs.org)** (App Router, Server Actions) + **React 19** + **TypeScript**
- **[Prisma 7](https://www.prisma.io)** avec adaptateur **better-sqlite3** — base SQLite locale (`dev.db`)
- **Tailwind CSS 4**, **lucide-react**, **next-themes**
- **Recharts** (graphiques), **@react-pdf/renderer** (rapports PDF), **date-fns**, **zod**

## 🚀 Démarrage (développeurs)

Prérequis : **Node.js 20+**

```bash
git clone https://github.com/Rjk3d/Site_Gestion_Evenement.git
cd <le-repo>
cp .env.example .env        # DATABASE_URL="file:./dev.db"
npm install                 # génère aussi le client Prisma
npx prisma migrate deploy   # crée la base SQLite
npm run db:seed             # (optionnel) données d'exemple
npm run dev                 # http://localhost:3000
```

### Scripts utiles

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run build` / `npm start` | Build et serveur de production |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Nouvelle migration Prisma |
| `npm run db:seed` | Remplit la base avec des données d'exemple |
| `npm run db:reset` | Réinitialise la base (⚠️ efface tout) |
| `npm run db:studio` | Explorateur de données Prisma Studio |

## 💻 Installation sur un poste Windows (utilisateurs)

Des scripts sont fournis pour une installation « double-clic », sans connaissance technique :

- **`INSTALLER-SUR-CE-PC.bat`** — installe Node.js si besoin, les dépendances, la base, compile l'app et crée un raccourci sur le Bureau.
- **`LANCER-Activites-Excursions.bat`** — lance l'application au quotidien et ouvre le navigateur.
- **`PACKAGER-POUR-AUTRE-PC.bat`** — prépare une copie propre du dossier à transférer sur un autre ordinateur.

Le guide détaillé est dans [`LISEZ-MOI-Installation.txt`](LISEZ-MOI-Installation.txt).

> 💾 **Données** : tout est stocké dans `dev.db`. Pour sauvegarder, il suffit de copier ce fichier. Chaque PC possède sa propre base (pas de partage multi-postes).

## 📁 Structure du projet

```
├── prisma/
│   ├── schema.prisma        # Modèles : Activity, ActivitySlot, Session, Booking, Participant, Staff, Checklist
│   ├── migrations/          # Historique des migrations SQLite
│   └── seed.ts              # Données d'exemple
├── src/
│   ├── app/                 # Pages (dashboard, planning, réservations, activités, personnel) + routes API d'export
│   ├── components/          # Composants UI par module
│   └── lib/
│       ├── actions/         # Server Actions (CRUD)
│       ├── pdf/             # Rapport CA en PDF
│       └── *-data.ts        # Requêtes de lecture par module
└── *.bat                    # Scripts d'installation / lancement Windows
```

## 🔒 Confidentialité

Les fichiers de données métier (`*.csv`, brochures `*.pdf`), la base `dev.db` et le fichier `.env` sont exclus du dépôt via `.gitignore`.

---

<sub>Projet privé — © Evo2</sub>
