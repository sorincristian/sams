# SAMS

Seat Inserts Management System for TTC bus garages.

## Stack

- React + Vite + TypeScript
- Node.js + Express + TypeScript
- Prisma + PostgreSQL
- Render Blueprint deploy via `render.yaml`

## Repo layout

- `apps/api` – backend API
- `apps/web` – frontend dashboard
- `packages/types` – shared types

## Local development

### 1) Install
```bash
pnpm install
```

### 2) Configure env
Copy:
- `apps/api/.env.example` → `apps/api/.env`
- `apps/web/.env.example` → `apps/web/.env`

### 3) Generate Prisma client
```bash
pnpm db:generate
```

### 4) Run migrations
```bash
pnpm db:migrate
```

### 5) Seed
```bash
pnpm db:seed
```

### 6) Start
```bash
pnpm dev
```

Frontend: `http://localhost:5173`  
API: `http://localhost:4000`

## Default seeded admin

- email: `admin@sams.local`
- password: `password123`

## Render deploy

1. Push this repo to GitHub.
2. Create a new Render Blueprint from the repo.
3. Set `JWT_SECRET` in Render.
4. Deploy.

The Blueprint provisions:
- `sams-api`
- `sams-web`
- `sams-postgres`
