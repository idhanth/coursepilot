# CoursePilot

A full-stack college schedule planner. Pick the courses you want, and CoursePilot generates
every combination of their sections, removes the ones with overlapping class times, applies
your preferences, and shows the valid schedules on a weekly calendar.

**Stack:** React · TypeScript · Vite · Tailwind CSS · FastAPI · SQLAlchemy · PostgreSQL

> Status: early development — the frontend, backend and database are connected. Features are
> being built in the phases described in [docs/PRD.md](docs/PRD.md#41-development-plan).

## Project layout

```text
coursepilot/
├── frontend/   React + TypeScript app (Vite)
├── backend/    FastAPI app and pytest suite
├── scripts/    local PostgreSQL helpers
└── docs/       product requirements
```

## Running locally

### Prerequisites

- Python 3.12
- Node.js 20 or newer
- PostgreSQL 16

### 1. Database

Any PostgreSQL 16 server works. The helper script runs one on port 5435 with its data in
`.localdev/` (git-ignored), and creates the `coursepilot` and `coursepilot_test` databases:

```bash
./scripts/services.sh start     # also: stop | status | reset
```

It needs `pg_ctl` on your `PATH` (or `CP_PG_BIN` set to the directory containing it).
If you use a different server, set `DATABASE_URL` in `backend/.env` (see `backend/.env.example`).

### 2. Backend (http://localhost:8020)

```bash
cd backend
python3.12 -m venv .venv
.venv/bin/pip install -r requirements-dev.txt
.venv/bin/uvicorn app.main:app --reload --port 8020
```

Interactive API docs are at http://localhost:8020/docs.

### 3. Frontend (http://localhost:5173)

```bash
cd frontend
npm install
npm run dev
```

During development Vite forwards `/api` requests to the backend, so no extra configuration is
needed. Open http://localhost:5173 — the status card should show the backend and database as
connected.

## Tests

```bash
cd backend
.venv/bin/pytest
```

The tests use the `coursepilot_test` database. Point them elsewhere with `TEST_DATABASE_URL`.

## Environment variables

| Variable       | Where    | Purpose                                               |
| -------------- | -------- | ----------------------------------------------------- |
| `DATABASE_URL` | backend  | SQLAlchemy connection URL                             |
| `FRONTEND_URL` | backend  | Origin allowed by CORS                                |
| `VITE_API_URL` | frontend | Backend URL in production (empty in development)      |

Copy the `.env.example` files to `.env` to override them. `.env` files are never committed.

## License

[MIT](LICENSE)
