# CoursePilot

A full-stack college schedule planner. Pick the courses you want, and CoursePilot generates
every combination of their sections, removes the ones with overlapping class times, applies
your preferences, and shows the valid schedules on a weekly calendar.

**Stack:** React · TypeScript · Vite · Tailwind CSS · FastAPI · SQLAlchemy · PostgreSQL

> Status: early development — the frontend, backend and database are connected, the database
> schema is in place, the API supports registration, login and JWT authentication, and students can search the
> course catalog and build a course selection. The backend can detect time conflicts between
> sections and generate every conflict-free schedule for a set of courses, filtered by optional
> time and day preferences. The frontend runs the whole flow: search, select, set preferences,
> generate, and browse the results on a weekly calendar. Logged-in students can save schedules and
> open or delete them from a dashboard. Features are being built in the phases described in
> [docs/PRD.md](docs/PRD.md#41-development-plan).

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
cp .env.example .env                    # then set JWT_SECRET (see the comment in the file)
.venv/bin/alembic upgrade head          # create or update the tables
.venv/bin/python -m app.seed            # load the sample catalog (adds only missing courses)
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
needed. Open http://localhost:5173 to search courses; http://localhost:5173/status shows whether
the backend and database are connected.

## Database schema

Six tables, defined as SQLAlchemy models in [backend/app/models/](backend/app/models/) and created
by Alembic migrations in [backend/alembic/versions/](backend/alembic/versions/).

| Table                     | Holds                                   | Relationships                                   |
| ------------------------- | --------------------------------------- | ----------------------------------------------- |
| `users`                   | name, unique email, password hash       | one user → many saved schedules                 |
| `courses`                 | unique course code, name, department    | one course → many sections                      |
| `sections`                | section number, instructor, location    | one section → many meetings                     |
| `section_meetings`        | day of week, start time, end time       | a MWF section has 3 rows                        |
| `saved_schedules`         | name, semester, owner                   | many-to-many with sections                      |
| `saved_schedule_sections` | (schedule, section) pairs               | join table for that many-to-many                |

Deleting a course deletes its sections and meetings; deleting a user deletes their saved
schedules. A section that appears in a saved schedule cannot be deleted.

After changing a model, create a migration, review it, and apply it:

```bash
.venv/bin/alembic revision --autogenerate -m "describe the change"
.venv/bin/alembic upgrade head
```

## Authentication

| Endpoint                  | Auth   | Description                                                   |
| ------------------------- | ------ | ------------------------------------------------------------- |
| `POST /api/auth/register` | —      | Create an account from `name`, `email`, `password` → the user |
| `POST /api/auth/login`    | —      | Exchange `email` + `password` for a JWT access token          |
| `GET /api/auth/me`        | Bearer | The user the token belongs to                                 |

Passwords are hashed with bcrypt before they are stored; the API never returns the hash.
Login returns a JWT signed with `JWT_SECRET` (HS256) that contains only the user's id and its
issue and expiry times. Protected endpoints read it from the `Authorization: Bearer <token>`
header.

```bash
curl -X POST localhost:8020/api/auth/register -H 'Content-Type: application/json' \
  -d '{"name": "Test Student", "email": "student@uga.edu", "password": "correct-horse-battery"}'
TOKEN=$(curl -s -X POST localhost:8020/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email": "student@uga.edu", "password": "correct-horse-battery"}' | python3 -c 'import sys, json; print(json.load(sys.stdin)["access_token"])')
curl localhost:8020/api/auth/me -H "Authorization: Bearer $TOKEN"
```

## Courses

| Endpoint                         | Description                                                    |
| -------------------------------- | -------------------------------------------------------------- |
| `GET /api/courses`               | All courses, sorted by course code                             |
| `GET /api/courses/search?q=...`  | Courses whose code, name or department contains `q` (any case) |
| `GET /api/courses/{id}`          | One course                                                     |
| `GET /api/courses/{id}/sections` | A course's sections, each with its weekly meeting times        |
| `GET /api/sections/{id}`         | One section with its meeting times                             |

These endpoints are public. Missing courses and sections return 404. Meeting days are numbers
(0 = Monday … 6 = Sunday) and times are `HH:MM:SS`.

The sample catalog (`python -m app.seed`) has the 12 courses listed in PRD §33, each with
3 sections: 36 sections and 94 weekly meeting times.

## Scheduling logic

Conflict detection lives in [backend/app/services/schedule_service.py](backend/app/services/schedule_service.py):

- `times_overlap(start_a, end_a, start_b, end_b)` is `start_a < end_b and start_b < end_a`.
  The comparisons are strict, so a class ending at 11:00 and one starting at 11:00 don't overlap.
- `meetings_conflict(a, b)` is true only when both meetings are on the same day and their times overlap.
- `sections_conflict(a, b)` compares every meeting of one section with every meeting of the other
  (at most `meetings_a × meetings_b` checks) and stops at the first conflict.
- `schedule_has_conflict(sections)` checks every unique pair of sections in one schedule:
  `n × (n − 1) / 2` pairs, e.g. 6 for 4 courses.
- `generate_combinations(course_sections)` uses `itertools.product` to pick one section from each
  course in every possible way. The count is the product of the section counts (3 × 3 × 3 = 27).
- `generate_valid_schedules(course_sections)` keeps the combinations with no conflicting pair.

### `POST /api/schedules/generate`

```json
{ "course_ids": [1, 2, 4] }
```

The ids are course ids from `GET /api/courses`. The endpoint loads the courses with their sections and meetings (three queries), generates the combinations and
returns the valid ones. With the sample catalog, CSCI 1302, MATH 2250 and ENGL 1102 give
3 × 3 × 3 = 27 combinations, of which 24 are valid (CSCI 1302-001 and MATH 2250-002 both meet
MWF 10:20):

```json
{
  "total_combinations": 27,
  "conflict_free_count": 24,
  "count": 24,
  "schedules": [{ "sections": ["…one section per course, with its course and meetings…"], "total_credits": 11 }]
}
```

`course_ids` must contain 1–8 different course ids. Unknown ids return 404, and a course with no
sections returns 422. If every combination conflicts, `count` is 0.

#### Preferences

An optional `preferences` object applies strict filters after conflicts are removed. Each one
either keeps a schedule or removes it; nothing is ranked. Leaving a preference out removes nothing.

```json
{
  "course_ids": [1, 2, 4],
  "preferences": {
    "earliest_start": "09:00",
    "latest_end": "15:00",
    "preferred_day_off": "Friday",
    "max_classes_per_day": 3
  }
}
```

| Preference            | A schedule is removed if…                                  |
| --------------------- | ---------------------------------------------------------- |
| `earliest_start`      | any class starts before this time (`HH:MM`)                 |
| `latest_end`          | any class ends after this time (`HH:MM`)                    |
| `preferred_day_off`   | any class meets on this day (`"Monday"` … `"Sunday"`)       |
| `max_classes_per_day` | any day has more than this many classes (a positive number) |

`conflict_free_count` is the number of schedules before preferences and `count` the number after.
Malformed values, a `latest_end` that isn't after `earliest_start`, and unknown preference names
return 422.

### Saved schedules

Every saved-schedule endpoint requires `Authorization: Bearer <token>` and only ever reads or changes
the logged-in user's own schedules.

| Endpoint                           | Description                                                          |
| ---------------------------------- | -------------------------------------------------------------------- |
| `GET /api/schedules/saved`         | The user's saved schedules, newest first                             |
| `POST /api/schedules/saved`        | Save `{ "name", "semester", "section_ids" }` → the saved schedule (201) |
| `GET /api/schedules/saved/{id}`    | One saved schedule with its sections and meeting times               |
| `DELETE /api/schedules/saved/{id}` | Delete one saved schedule (204)                                      |

Saving stores the given sections in `saved_schedule_sections`; nothing is regenerated. The sections
must exist (404 otherwise), be different, belong to different courses, and not conflict (422
otherwise). Asking for another user's schedule returns the same 404 as a schedule that doesn't
exist.

## Frontend flow

| Page                | What happens                                                                        |
| ------------------- | ----------------------------------------------------------------------------------- |
| `/courses`          | Search the catalog, view sections, and add courses to the selection                 |
| `/planner`          | Review the selection and set the 4 optional preferences                             |
| `/results`          | Calls `POST /api/schedules/generate` and shows one schedule at a time with its counts |
| `/register`, `/login` | Create an account or log in                                                       |
| `/dashboard`        | The user's saved schedules, with Open, Delete and Log out (login required)          |
| `/saved/:id`        | One saved schedule on the same weekly calendar (login required)                      |

The selection and preferences are React state in `App.tsx`, passed to the pages as props, so every
page sees the same values (a page refresh clears them). The results page shows the backend's three
counts, a section list and a weekly calendar for the current schedule, with Previous and Next to
move through the rest. When nothing is returned, it uses the counts to say whether the courses
conflict (`conflict_free_count` is 0) or the preferences removed every schedule.

Logging in stores the JWT from `POST /api/auth/login` in `localStorage`. `AuthProvider` checks it with
`GET /api/auth/me` when the app loads, so a refresh keeps the user logged in. Requests to protected
endpoints add the `Authorization: Bearer <token>` header; if one is rejected with 401, the token is
removed and the user is logged out. Logging out deletes the stored token. Generated schedules are
kept only in memory until they are saved.

## Tests

```bash
cd backend
.venv/bin/pytest

cd frontend
npm test          # Vitest: request building, calendar layout, and the planner and results pages
```

The tests use the `coursepilot_test` database, which they rebuild from the migrations on every
run. Point them elsewhere with `TEST_DATABASE_URL`.

## Environment variables

| Variable       | Where    | Purpose                                               |
| -------------- | -------- | ----------------------------------------------------- |
| `DATABASE_URL` | backend  | SQLAlchemy connection URL                             |
| `FRONTEND_URL` | backend  | Origin allowed by CORS                                |
| `JWT_SECRET`   | backend  | Key that signs login tokens (required, 32+ characters) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | backend | Token lifetime (default 60)             |
| `VITE_API_URL` | frontend | Backend URL in production (empty in development)      |

Copy the `.env.example` files to `.env` to override them. `.env` files are never committed.

## Deployment

| Part     | Host                           | Configuration                                                                                   |
| -------- | ------------------------------ | ----------------------------------------------------------------------------------------------- |
| Frontend | Vercel                         | Root directory `frontend`, build `npm run build`, output `dist`. `frontend/vercel.json` sends every path to `index.html`, so routes such as `/saved/3` work when refreshed. |
| API      | Render (free web service)      | `render.yaml`: root directory `backend`, build `pip install -r requirements.txt`, start `uvicorn app.main:app --host 0.0.0.0 --port $PORT`, health check `/api/health`. Python version from `backend/.python-version`. |
| Database | Neon (managed PostgreSQL)      | Created and migrated once; see below.                                                           |

```text
Browser ──HTTPS──> Vercel (static React build)
   │
   └──HTTPS, Authorization: Bearer <JWT>──> Render (FastAPI) ──TLS──> Neon (PostgreSQL)
```

Production environment variables (set in each host's dashboard, never committed):

| Host   | Variable       | Value                                                                                  |
| ------ | -------------- | -------------------------------------------------------------------------------------- |
| Render | `DATABASE_URL` | The Neon connection string. `postgresql://` URLs are switched to the psycopg driver automatically. |
| Render | `JWT_SECRET`   | A new random value used only in production (at least 32 characters).                   |
| Render | `FRONTEND_URL` | The exact Vercel origin, e.g. `https://example.vercel.app`. CORS allows only this origin. |
| Vercel | `VITE_API_URL` | The Render service URL. It is built into the JavaScript bundle, so redeploy after changing it. |

Create the tables and load the sample catalog once, from `backend/`, with the production
connection string:

```bash
DATABASE_URL='<Neon connection string>' JWT_SECRET='<the production secret>' .venv/bin/alembic upgrade head
DATABASE_URL='<Neon connection string>' JWT_SECRET='<the production secret>' .venv/bin/python -m app.seed
```

Render's free plan stops the API after a period of inactivity, so the first request after a
break can be slow while it starts again; the app shows "Can't reach the CoursePilot server right
now" with a Try again button if that request times out.

## License

[MIT](LICENSE)
