# CoursePilot — Complete PRD

> **Resume-bullet rule.** Every bullet should include:
> **1) what was built/done + 2) technology/implementation + 3) quantified scope/result.**
> Every number must be true and explainable at the time it is used.

## 1. Product Overview

**CoursePilot** is a full-stack college schedule-planning application that helps students generate valid semester schedules from available course sections.

A student selects the courses they want to take, and CoursePilot:

* retrieves the available sections for each course
* generates possible combinations
* eliminates schedules with overlapping class times
* applies student preferences
* displays valid schedules visually
* allows users to save their favorite schedules

The project is designed to demonstrate practical software engineering skills without depending on advanced infrastructure or systems concepts that would be difficult to explain in an interview.

The focus is:

**full-stack development + algorithms + APIs + databases + authentication + testing + deployment**

---

# 2. Project Goal

The final project should prove the ability to:

* build a complete frontend
* build a backend API
* connect a frontend to a backend
* design a relational database
* implement authentication
* write nontrivial scheduling logic
* test the logic
* deploy a real application
* explain the architecture clearly

The project should look like something a **strong junior CS student** could realistically build.

---

# 3. Problem Statement

College students often have to manually compare several class sections to create a semester schedule.

For example, a student may want to take:

```text
CSCI 1302
MATH 2250
STAT 2000
ENGL 1102
```

Each course might have:

```text
3–5 available sections
```

That can create dozens or hundreds of possible combinations.

Students then have to manually check:

* overlapping classes
* early morning classes
* late classes
* preferred days off
* large gaps
* total course load

CoursePilot automates this process.

---

# 4. Primary User

The primary user is:

**A college student building their next semester schedule.**

The application should be understandable even if the user has never used it before.

---

# 5. Core User Flow

```text
Register / Login
       ↓
Search Courses
       ↓
Select Courses
       ↓
Review Sections
       ↓
Choose Preferences
       ↓
Generate Combinations
       ↓
Remove Time Conflicts
       ↓
Apply Filters
       ↓
View Valid Schedules
       ↓
Save Favorite Schedule
```

---

# 6. Recommended Tech Stack

## Frontend

* React
* TypeScript
* Vite
* React Router
* Tailwind CSS

## Backend

* Python
* FastAPI
* Pydantic
* SQLAlchemy

FastAPI is a good fit because it is relatively simple, has good REST API support, and leaves more time for the application logic.

## Database

* PostgreSQL

## Authentication

* JWT
* bcrypt-compatible password hashing

## Testing

* Pytest for backend logic
* Vitest for selected frontend tests if useful

## Version Control

* Git
* GitHub

---

# 7. MVP Requirements

The minimum finished version should contain:

1. Registration
2. Login/logout
3. Course search
4. Course details
5. Multiple course sections
6. Course selection
7. Schedule generation
8. Conflict detection
9. Preference filters
10. Valid schedule results
11. Weekly schedule display
12. Save schedule
13. Delete saved schedule
14. PostgreSQL persistence
15. Automated tests
16. Responsive UI
17. Error handling
18. README
19. Deployment

Anything beyond these is a stretch goal.

---

# 8. Authentication

Users should be able to create an account.

Fields:

```text
Name
Email
Password
Confirm Password
```

The system should:

* reject duplicate emails
* hash passwords
* authenticate login requests
* issue a JWT
* use the JWT on protected requests
* prevent users from accessing another user's schedules

Example flow:

```text
Register
   ↓
Password is hashed
   ↓
User saved to PostgreSQL
   ↓
Login
   ↓
JWT returned
   ↓
Token sent with protected API requests
```

---

# 9. Dashboard

After logging in, users should see:

```text
CoursePilot

Welcome, Idhanth

[Build New Schedule]

Saved Schedules

Fall Schedule
Spring Schedule
```

Dashboard requirements:

* user name
* new schedule button
* saved schedules
* open action
* delete action

---

# 10. Course Search

Users should be able to search by:

* course code
* course name
* department

Examples:

```text
CSCI
CSCI 1302
Software Development
MATH
```

Result:

```text
CSCI 1302
Software Development
4 Credits

[View Sections]
[Add]
```

Optional filters:

* department
* credit hours

---

# 11. Course Data Model

Each course should contain:

```text
id
course_code
course_name
department
description
credit_hours
```

Example:

```text
CSCI 1302
Software Development
Computer Science
4 Credits
```

---

# 12. Course Sections

A course can contain multiple sections.

Example:

```text
CSCI 1302

Section 001
Professor Smith
MWF
10:10 AM–11:00 AM
Boyd 328

Section 002
Professor Lee
TR
2:20 PM–3:35 PM
Boyd 208
```

Store:

```text
id
course_id
section_number
instructor
location
```

Do not store all meeting times in this table.

---

# 13. Section Meetings

Use a separate table:

```text
section_meetings
```

Fields:

```text
id
section_id
day_of_week
start_time
end_time
```

Example:

```text
Section 001

Monday     10:10–11:00
Wednesday  10:10–11:00
Friday     10:10–11:00
```

Interview talking point:

> A section can have multiple meeting times, so I normalized them into their own table instead of storing a string such as "MWF."

---

# 14. Selected Courses

Users should be able to build a temporary selection.

Example:

```text
Selected Courses

CSCI 1302
MATH 2250
STAT 2000
ENGL 1102

[Generate Schedules]
```

Actions:

* add
* remove
* clear
* view sections

---

# 15. Schedule Generation

This is the primary technical feature.

Suppose:

```text
CSCI → 4 sections
MATH → 4 sections
STAT → 4 sections
ENGL → 4 sections
```

The number of possible combinations is:

```text
4 × 4 × 4 × 4 = 256
```

With five courses of four sections each:

```text
4^5 = 1,024 combinations
```

CoursePilot should generate one section from every selected course.

Example:

```text
CSCI-001 + MATH-001 + STAT-001
CSCI-001 + MATH-001 + STAT-002
CSCI-001 + MATH-002 + STAT-001
...
```

Python's `itertools.product()` is perfectly reasonable — but its behavior must be understood.

---

# 16. Conflict Detection

Two meetings conflict when:

1. they occur on the same day
2. their time ranges overlap

Use:

```python
start_a < end_b and start_b < end_a
```

Example — conflict:

```text
CSCI  Monday  10:00–11:00
MATH  Monday  10:30–11:45
```

No conflict (different day):

```text
CSCI  Monday   10:00–11:00
MATH  Tuesday  10:30–11:45
```

No conflict (touching):

```text
CSCI  Monday  10:00–11:00
MATH  Monday  11:00–12:00
```

---

# 17. Core Scheduling Functions

```python
def times_overlap(start_a, end_a, start_b, end_b):
def meetings_conflict(meeting_a, meeting_b):
def sections_conflict(section_a, section_b):
def schedule_has_conflict(sections):
def generate_combinations(course_sections):
def generate_valid_schedules(course_sections):
```

Later:

```python
def calculate_schedule_score(schedule, preferences):
```

---

# 18. Schedule Preferences

Users should be able to specify:

* earliest start
* latest end
* preferred day off
* maximum classes per day

Example:

```text
Earliest class:       10:00 AM
Latest class:         5:00 PM
Preferred day off:    Friday
Maximum classes/day:  3
```

These are **4 concrete filters**.

---

# 19. Filtering Logic

CoursePilot should remove schedules that violate the user's requirements.

If the student says `No classes before 10:00 AM`, remove any schedule containing a section starting before 10.

If `Preferred day off = Friday`, either:

* strictly remove Friday schedules, or
* rank Friday-free schedules higher

For MVP, strict filtering is simpler.

---

# 20. Schedule Results

Example:

```text
42 valid schedules found
```

Each result should show:

```text
Schedule 1

15 credits
4 courses
Friday off
Earliest class: 10:10 AM

[View]
[Save]
```

Users should be able to move between results.

---

# 21. Weekly Calendar View

Create a weekly visualization.

| Time  | Monday | Tuesday | Wednesday | Thursday | Friday |
| ----- | ------ | ------- | --------- | -------- | ------ |
| 9 AM  |        | MATH    |           | MATH     |        |
| 10 AM | CSCI   |         | CSCI      |          | CSCI   |
| 11 AM |        |         |           |          |        |
| 12 PM | STAT   | STAT    | STAT      | STAT     |        |

Build it first using simple CSS grid. Don't add a complex calendar dependency unless it actually helps.

---

# 22. Saved Schedules

Users should be able to save a valid schedule.

Fields:

```text
id
user_id
name
semester
created_at
```

Example:

```text
Fall 2027 - Friday Off
Fall 2027 - Late Start
Fall 2027 - Option 3
```

Users should be able to:

* open
* delete
* optionally rename

---

# 23. Database Schema

## users

```text
id
name
email
password_hash
created_at
```

## courses

```text
id
course_code
course_name
department
description
credit_hours
```

## sections

```text
id
course_id
section_number
instructor
location
```

## section_meetings

```text
id
section_id
day_of_week
start_time
end_time
```

## saved_schedules

```text
id
user_id
name
semester
created_at
```

## saved_schedule_sections

```text
schedule_id
section_id
```

That gives **6 core database entities/tables**.

---

# 24. Relationships

```text
User
  ↓
SavedSchedules

Course
  ↓
Sections
  ↓
SectionMeetings

SavedSchedule
  ↔
Sections
```

* one course → many sections
* one section → many meetings
* one user → many saved schedules
* saved schedules ↔ many sections

---

# 25. REST API

## Authentication

```http
POST /api/auth/register
POST /api/auth/login
GET /api/auth/me
```

## Courses

```http
GET /api/courses
GET /api/courses/{id}
GET /api/courses/search?q=CSCI
```

## Sections

```http
GET /api/courses/{id}/sections
GET /api/sections/{id}
```

## Schedule Generation

```http
POST /api/schedules/generate
```

## Saved Schedules

```http
GET /api/schedules/saved
POST /api/schedules/saved
GET /api/schedules/saved/{id}
DELETE /api/schedules/saved/{id}
```

Optional:

```http
PATCH /api/schedules/saved/{id}
```

Roughly **10–12 meaningful API endpoints**. Only use the final number after the endpoints actually exist.

---

# 26. Example Generation Request

```json
{
  "course_ids": [1, 4, 8, 12],
  "preferences": {
    "earliest_start": "10:00",
    "latest_end": "17:00",
    "preferred_day_off": "Friday",
    "max_classes_per_day": 3
  }
}
```

Response:

```json
{
  "count": 42,
  "schedules": [
    {
      "sections": [],
      "total_credits": 15
    }
  ]
}
```

---

# 27. Backend Structure

```text
backend/
│
├── app/
│   ├── main.py
│   ├── database.py
│   ├── dependencies.py
│   │
│   ├── models/
│   │   ├── user.py
│   │   ├── course.py
│   │   ├── section.py
│   │   └── schedule.py
│   │
│   ├── schemas/
│   │   ├── auth.py
│   │   ├── course.py
│   │   └── schedule.py
│   │
│   ├── routes/
│   │   ├── auth.py
│   │   ├── courses.py
│   │   └── schedules.py
│   │
│   └── services/
│       ├── auth_service.py
│       └── schedule_service.py
│
├── tests/
│   ├── test_conflicts.py
│   ├── test_generation.py
│   ├── test_auth.py
│   └── test_courses.py
│
└── requirements.txt
```

---

# 28. Frontend Structure

```text
frontend/
│
├── src/
│   ├── components/
│   │   ├── Navbar.tsx
│   │   ├── CourseCard.tsx
│   │   ├── SectionCard.tsx
│   │   ├── ScheduleCard.tsx
│   │   └── WeeklyCalendar.tsx
│   │
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── CourseSearchPage.tsx
│   │   ├── PlannerPage.tsx
│   │   ├── ResultsPage.tsx
│   │   └── SavedSchedulePage.tsx
│   │
│   ├── services/
│   │   ├── api.ts
│   │   ├── auth.ts
│   │   └── schedules.ts
│   │
│   ├── types/
│   ├── App.tsx
│   └── main.tsx
```

---

# 29. UI Pages

Around **7 main pages**:

1. Login
2. Register
3. Dashboard
4. Course Search
5. Schedule Builder
6. Schedule Results
7. Saved Schedule Detail

---

# 30. UI Style

Aim for:

* clean
* minimal
* polished
* responsive
* readable
* college-oriented

Avoid:

* excessive gradients
* too many animations
* complicated dashboards
* AI-looking visual clutter
* unnecessary charts

---

# 31. Error Handling

Handle at least these cases:

* no courses selected
* duplicate registration
* incorrect password
* missing course
* invalid schedule
* no valid schedule combinations
* unauthorized saved schedule access
* backend unavailable

Example:

```text
No conflict-free schedules were found.
Try adjusting your selected courses or preferences.
```

---

# 32. Automated Testing

## Conflict tests

1. Same day + overlapping time → conflict
2. Same day + touching times → no conflict
3. Different day + same time → no conflict
4. One class inside another → conflict
5. Partial overlap → conflict

## Generation tests

1. One course
2. Two courses
3. Multiple sections
4. All valid
5. Some conflicts
6. All conflicts

## Authentication tests

1. registration
2. duplicate registration
3. valid login
4. wrong password
5. protected route without token

## API tests

1. course search
2. course sections
3. schedule generation
4. save schedule
5. delete schedule
6. unauthorized schedule access

Do not decide the test count first. Build the tests, then count them.

---

# 33. Seed Data

Start with sample data rather than scraping a university system. For example:

```text
12 courses
36–48 sections
60–100 meeting records
```

Potential courses:

```text
CSCI 1301
CSCI 1302
CSCI 1730
MATH 2250
MATH 2260
STAT 2000
ENGL 1101
ENGL 1102
ECON 2105
PHYS 1211
CHEM 1211
COMM 1110
```

Use whatever final number is actually seeded.

---

# 34. Security

Implement:

* password hashing
* JWT authentication
* protected endpoints
* ownership checks
* environment variables
* input validation

Do not implement:

* custom cryptography
* enterprise SSO
* complex roles
* OAuth unless genuinely needed

---

# 35. Deployment

Frontend: **Vercel**

Backend: **Render** or **Railway**

Database: **PostgreSQL** (Neon, Railway, Supabase, or Render)

---

# 36. Environment Variables

```text
DATABASE_URL=
JWT_SECRET=
FRONTEND_URL=
```

Commit `.env.example`. Never commit `.env`.

---

# 37. Repository Structure

```text
coursepilot/
│
├── frontend/
├── backend/
├── README.md
├── .gitignore
└── LICENSE
```

Avoid unnecessary infrastructure directories.

---

# 38. GitHub Rules

The repository lives under the GitHub account `idhanth`.

Author identity is configured per repository:

```bash
git config user.name "Idhanth Premkumar"
git config user.email "YOUR_GITHUB_EMAIL"
```

---

# 39. Contributor Rules

The repository shows its owner as the sole contributor. Do not add assistant
co-author trailers to commits, and keep assistant names out of:

* commit messages
* README authorship
* code comments
* contributor files
* package author metadata

Workflow:

```text
Review code
   ↓
Understand code
   ↓
Commit locally
   ↓
Push with own Git account
```

---

# 40. Commit History

Use normal development commits, for example:

```text
chore: initialize CoursePilot frontend and backend
feat: add PostgreSQL course models
feat: implement user registration and login
feat: add course search
feat: add section selection
feat: implement schedule conflict detection
feat: generate valid schedule combinations
feat: add schedule preference filters
feat: add saved schedules
test: add scheduling and auth tests
style: improve weekly schedule view
docs: document project setup and architecture
```

---

# 41. Development Plan

## Phase 1 — Setup

Build a React frontend, FastAPI backend and PostgreSQL database. Goal:
`React → FastAPI → PostgreSQL` working locally.

## Phase 2 — Database

Build users, courses, sections, meeting times. Seed data.

## Phase 3 — Authentication

Registration, login, JWT, protected routes.

## Phase 4 — Course Search

Search, section display, add/remove course.

## Phase 5 — Conflict Detection

Implement and test `times_overlap()`, `meetings_conflict()`, `sections_conflict()`.

## Phase 6 — Schedule Generation

Generate combinations, filter conflicts, return valid schedules. The core technical milestone.

## Phase 7 — Preferences

Implement **4 filters**: earliest start, latest end, preferred day off, max classes per day.

## Phase 8 — Results UI

Valid schedule count, cards, weekly view.

## Phase 9 — Saved Schedules

Save, open, delete.

## Phase 10 — Tests

Enough tests that the core scheduling and auth paths are covered.

## Phase 11 — Polish

Responsive design, loading states, empty states, clear error messages.

## Phase 12 — Deployment

Deploy frontend, backend and database. Test the production version.

---

# 42. Stretch Features

After MVP, choose only **1–3**:

* schedule scoring
* gap minimization
* credit-hour totals
* prerequisite warnings
* instructor filters
* export schedule to calendar
* dark mode

---

# 43. Features to Avoid

Kubernetes, Kafka, Redis, Celery, RabbitMQ, microservices, distributed locks,
reverse proxies, Terraform, WebSockets, event sourcing, custom caching, load
balancing. None are necessary.

---

# 44. Technical Interview Questions

**Architecture** — How does the frontend talk to the backend? What happens when the user clicks Generate?

**Database** — Why PostgreSQL? Why is `section_meetings` separate? What is the many-to-many relationship?

**Algorithms** — How are combinations generated? How is overlap detected? What's the worst case with many sections?

**Authentication** — How are passwords stored? What is a JWT? How do protected routes work?

**Testing** — What edge cases were tested?

**Deployment** — Where are the frontend, backend, and database hosted?

**Debugging** — What was one bug encountered?

---

# 45. Quantification Strategy

Metrics come from **real scope**, not fake performance claims. Candidate metrics
(valid only once true):

* 1,024 section combinations
* 4 schedule filters
* 6 relational tables
* 10–12 REST endpoints
* 7 UI pages
* 12 seeded courses
* 40 sections
* 20 tests
* 3 deployment components

---

# 46. Resume Bullet Formula

> **Action + implementation/technology + quantified result/scope**

Instead of "Built a schedule generator":

> Generated conflict-free semester schedules across 1,024 possible section combinations using Python/FastAPI and Cartesian-product logic with time-overlap detection.

Instead of "Added schedule preferences":

> Implemented 4 schedule-preference filters in React/TypeScript for start time, end time, days off, and daily course limits to narrow generated schedule options.

Instead of "Designed database":

> Modeled 6 relational entities in PostgreSQL with SQLAlchemy for users, courses, sections, meeting times, saved schedules, and schedule-section mappings.

---

# 47. Target Resume Version

Once the project is actually complete:

**CoursePilot | React, TypeScript, FastAPI, PostgreSQL**

* Generated conflict-free schedules across up to 1,024 possible section combinations using Python/FastAPI and Cartesian-product logic with pairwise time-overlap detection.
* Implemented 4 schedule-preference filters in React/TypeScript for earliest start, latest end, preferred day off, and maximum classes per day to narrow valid schedule results.
* Modeled 6 relational entities in PostgreSQL with SQLAlchemy and exposed 10+ FastAPI REST endpoints for authentication, course search, schedule generation, and saved schedules.

---

# 48. What Not to Put on the Resume

* "Reduced scheduling time by 85%" — unless actual users were timed.
* "Improved student productivity by 40%" — unless measured.
* "Supported thousands of users" — unless true.
* "0% errors" — unless a defined test was performed and can be explained.

Scope metrics are perfectly acceptable for student projects.

---

# 49. Definition of Done

CoursePilot is resume-ready when:

* registration works
* login works
* passwords are hashed
* JWT auth works
* course search works
* multiple sections work
* selected courses work
* section combinations generate
* time conflicts are correctly removed
* all 4 preference filters work
* weekly schedule view works
* saved schedules work
* saved schedules persist
* users cannot access each other's schedules
* automated tests pass
* frontend is deployed
* backend is deployed
* PostgreSQL is deployed
* README is complete
* screenshots exist
* repository is clean
* no secrets exist in Git
* no fake metrics exist
* no assistant co-author metadata exists
* the code is understood
* the scheduling algorithm can be explained
* the database can be explained
* the API flow can be explained
* at least one solved bug can be explained
