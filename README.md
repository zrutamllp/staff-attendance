# Staff Attendance Ledger

A mobile-first staff attendance management web app built with **Next.js** (JavaScript) and **Neon PostgreSQL**.

## Features

- **Master Admin** — organization dashboard, manager management, employee transfers (single + bulk), analytics, backup/restore, reports
- **Manager** — mobile-optimized attendance marking, employee roster, reports, profile
- **Attendance ledger** — P / A / L / H status cycling with monthly totals and attendance %
- **Business rules** — employee ownership, manager deactivation auto-transfer, attendance history preserved on transfer
- **Backup & restore** — yearly JSON export with merge or overwrite restore
- **Reports** — monthly summary, manager comparison, yearly trends, CSV export
- **Warm premium UI** — inspired by the supplied reference design (off-white, charcoal, rounded cards)

## Tech Stack

- Next.js 16 (App Router, JavaScript)
- Neon PostgreSQL + Drizzle ORM
- NextAuth.js (credentials)
- Tailwind CSS 4
- Recharts (admin analytics)

## Setup

### 1. Create a Neon database

1. Go to [neon.tech](https://neon.tech) and create a project
2. Copy your connection string

### 2. Configure environment

```bash
cd staff-attendance-ledger
cp .env.example .env.local
```

Edit `.env.local`:

```env
DATABASE_URL=postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
AUTH_SECRET=your-random-secret-at-least-32-characters-long
NEXTAUTH_URL=http://localhost:3000
```

Generate `AUTH_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Push schema and seed demo data

```bash
npm run db:push
npm run db:seed
```

### 4. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Demo Accounts

| Role         | Login             | Password    |
|--------------|-------------------|-------------|
| Master Admin | admin@example.com | admin123    |
| Manager A    | 9876543210        | manager123  |
| Manager B    | 9876543211        | manager123  |

## Project Structure

```
src/
├── app/
│   ├── admin/          # Master Admin desktop dashboard
│   ├── manager/        # Manager mobile workflows
│   ├── login/
│   └── api/            # REST API routes
├── components/         # UI components
└── lib/
    ├── db/             # Drizzle schema + Neon client
    ├── services/       # Business logic
    ├── auth.js
    ├── attendance.js
    └── permissions.js
```

## Attendance Formula

```
Attendance % = (Present + 0.5 × Half-day) / Total marked working days × 100
```

- **Default Present:** All days (Mon–Sun) count as Present from **10:00 AM** (org timezone) — only mark exceptions (Absent, Leave, Sick leave, Half-day). Before 10 AM today and all **future dates** stay unmarked.
- **Leave (L):** 1 day per week per employee (Mon–Sun week)
- **Sick leave (SL):** 6 days per calendar year per employee

## Backup & Restore

1. Go to **Admin → Backup**
2. Export a year as JSON
3. Upload a backup file — the app validates structure first
4. Choose **Merge** (upsert records) or **Overwrite** (replace year attendance, then upsert employees)
5. Confirm restore

## Scripts

| Command           | Description              |
|-------------------|--------------------------|
| `npm run dev`     | Start development server |
| `npm run build`   | Production build         |
| `npm run db:push` | Push schema to Neon      |
| `npm run db:seed` | Seed demo organization   |
| `npm run mark-present` | Run auto-present job manually |

## Notes

- All managers see and can mark attendance for **all organization employees**
- Employees belong to the organization — there is no per-manager team assignment
- Master Admin manages manager accounts, backup, and organization settings
- Deactivating a manager only blocks their login — employees are unchanged
- Attendance records belong to employees — history is preserved across staff changes
- Managers log in with phone number; Master Admin uses email
