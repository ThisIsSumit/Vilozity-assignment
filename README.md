# Velozity — Real-Time Client Project Dashboard

An internal dashboard for a software agency to manage clients, projects, tasks,
team members, activity, and notifications in real time, with strict
role-based and resource-level authorization.

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Database schema & relationships](#database-schema--relationships)
- [Indexing decisions](#indexing-decisions)
- [Authentication architecture](#authentication-architecture)
- [RBAC & resource-ownership authorization](#rbac--resource-ownership-authorization)
- [WebSocket architecture](#websocket-architecture)
- [Notification architecture](#notification-architecture)
- [Background job architecture](#background-job-architecture)
- [API documentation](#api-documentation)
- [Environment variables](#environment-variables)
- [Local setup](#local-setup)
- [Docker setup](#docker-setup)
- [Demo accounts](#demo-accounts)
- [Testing](#testing)
- [Deployment](#deployment)
- [Known limitations & future improvements](#known-limitations--future-improvements)

## Features

- JWT access + refresh authentication, refresh token in an HttpOnly cookie
- Three roles (Admin, Project Manager, Developer) with API-level RBAC **and**
  resource-ownership checks — never role-only
- Client / Project / Task CRUD, all scoped per role at the database level
- Live activity feed over Socket.IO, with missed-event recovery from Postgres
- Live presence ("who's online right now"), multi-tab aware
- Real-time, database-backed notifications with unread counts
- URL-persisted task filters (status/priority/due-date range) + pagination
- Scheduled background job that flags overdue tasks (no page-load hacks)
- Seed script with realistic demo data across all roles and statuses

## Tech stack

**Frontend:** React, TypeScript, Vite, React Router, TanStack Query, Zustand,
Tailwind CSS, Lucide icons, Socket.IO client, React Hook Form, Zod, Axios.

**Backend:** Node.js, TypeScript, Express, Socket.IO, Prisma, PostgreSQL,
Zod, JWT, bcrypt, node-cron (default) / BullMQ + Redis (optional).

**Why Express over Fastify:** both would satisfy the requirement equally
well technically. Express was chosen because (a) Socket.IO's official
integration examples and most community middleware target Express first,
which matters given how central WebSockets are to this project, and (b) the
`requireAuth` → `requireRole` → ownership-check middleware chain this app
relies on is a very standard Express pattern with no framework-specific
gymnastics needed. Fastify's schema-based validation is arguably a better
native fit for the "everything must be Zod-validated" requirement, but since
Zod is used directly here (via a small `validate()` middleware) rather than
relying on the framework's built-in validation, that advantage doesn't
apply. This is a defensible either-way choice, not a hard technical
constraint.

**Why Socket.IO over a native WebSocket:** native `ws` would work, but
Socket.IO's built-in room abstraction (`socket.join(...)` /
`io.to(room).emit(...)`) is exactly the primitive this app's authorization
model needs — role-scoped delivery via `project:{id}` / `user:{id}` /
`global:activity` rooms — without hand-rolling a room registry. It also
handles reconnection and transport fallback out of the box, which the
missed-event-recovery flow (see below) builds on top of rather than
replacing.

**Infra:** Docker, Docker Compose, GitHub Actions, Vercel (frontend),
any Node hosting provider (backend).

## Architecture

```
Browser
  │  HTTPS
  ▼
React + TypeScript (Vite)
  │  REST (Axios)              │  WebSocket (Socket.IO client)
  ▼                            ▼
Express API  ───────────────  Socket.IO server
  │
  ├── Prisma ────────────── PostgreSQL
  │
  └── node-cron / BullMQ ── (Redis, only if BULLMQ_ENABLED=true)
```

**Authorization flow (every protected request):**

```
Request
  │
  ▼
requireAuth  — verifies JWT signature, loads the user fresh from DB
  │
  ▼
requireRole(...)  — coarse allow-list (e.g. "Admin or PM only")
  │
  ▼
Service-layer ownership check  — e.g. projectService.assertMutable():
  does THIS user own / have a task on THIS specific resource?
  │
  ├── No  → 403 / 404
  └── Yes → proceed, using a DB WHERE clause scoped to the caller
```

Backend folder structure:

```
server/src/
  config/       env loading, Prisma client singleton
  middleware/   requireAuth, requireRole, validate, errorHandler
  controllers/  thin HTTP glue — no business logic
  services/     business logic + authorization/ownership rules
  repositories/ Prisma queries only
  routes/       route wiring + per-route role gates
  validators/   Zod schemas
  websocket/    Socket.IO bootstrap, room strategy, typed emitter
  jobs/         overdue-task scheduler (node-cron / BullMQ)
  utils/        AppError, JWT helpers, password hashing, asyncHandler
```

Frontend folder structure:

```
client/src/
  components/   Layout, TaskTable, ActivityFeed, NotificationBell, ...
  pages/        one file per route
  services/     api.ts (Axios + silent refresh), socket.ts (socket service)
  store/        Zustand: authStore (in-memory token), uiStore
  hooks/        useAuthBootstrap, useSocket
  lib/          format helpers, query-key factory
```

## Database schema & relationships

- **User** 1—N **Project** (`createdBy`), 1—N **Task** (`assignedDeveloper`),
  1—N **ActivityLog**, 1—N **Notification**, 1—N **RefreshToken**
- **Client** 1—N **Project**
- **Project** 1—N **Task**, 1—N **ActivityLog**
- **Task** 1—N **ActivityLog** (nullable — a log entry survives task deletion
  via `onDelete: SetNull`)
- Enums: `Role`, `TaskStatus` (`TODO / IN_PROGRESS / IN_REVIEW / DONE`),
  `Priority`, `NotificationType`

**Why `Task.number`:** the activity feed's required format
("Ravi moved Task #12 from...") calls for a short, human-readable task
reference. `Task.id` is a UUID (needed for foreign keys and to avoid
enumeration attacks on `GET /api/tasks/:id`), so a separate
`number Int @unique @default(autoincrement())` column provides the "#12"
without weakening the primary key.

**Why no `OVERDUE` status:** the brief explicitly calls this out — a task's
*workflow* status (`TODO` → `IN_PROGRESS` → `IN_REVIEW` → `DONE`) and whether
it's *late* are orthogonal. Baking `OVERDUE` into the status enum would mean
losing the real workflow state the moment a task goes overdue (was it
`TODO` or `IN_PROGRESS`?). Instead, `Task.isOverdue: Boolean` is maintained
independently by the background job.

Cascading: deleting a `Project` cascades to its `Task`s and `ActivityLog`s
(a project's history has no meaning without the project). Deleting a `User`
who is a developer sets their assigned tasks' `assignedDeveloperId` to
`null` rather than deleting the tasks. Clients and PM-created projects use
`onDelete: Restrict` — you can't delete a client or user out from under
projects that still reference them.

## Indexing decisions

| Table | Index | Why |
|---|---|---|
| User | `email` | unique lookup on every login |
| User | `role` | role-filtered admin queries |
| Project | `createdById` | PM's "my projects" scope, hit on every project list/lookup |
| Project | `clientId` | client → projects lookups |
| Task | `projectId` | project detail page task list |
| Task | `assignedDeveloperId` | developer's "my tasks" scope, hit on every task list/lookup |
| Task | `status`, `priority`, `dueDate` | the three supported task filters, applied at the DB level |
| ActivityLog | `projectId`, `taskId`, `userId`, `createdAt` | role-scoped recent-activity queries, always ordered by `createdAt desc` |
| Notification | `recipientId`, `isRead`, `createdAt` | bell dropdown + unread-count queries, run on nearly every page load |

## Authentication architecture

- **Access token:** short-lived JWT (default 15m), returned in the login/refresh
  response body and kept **only in memory** on the frontend (a Zustand store —
  never localStorage/sessionStorage). It is lost on page reload by design.
- **Refresh token:** longer-lived JWT (default 7d), delivered **only** as an
  `HttpOnly`, `SameSite`, `Secure`-in-production cookie scoped to `/api/auth`.
  JavaScript can never read it, which is the whole point — it's the primary
  defense against token theft via XSS.
- On every refresh, the token is **rotated**: the old one is marked
  `revokedAt` in the `RefreshToken` table and a new one is issued **in the
  same token family** (`RefreshToken.familyId`, assigned once at login and
  carried forward through every rotation).
- **Reuse detection with full-family revocation:** if a refresh token is
  ever presented *after* it's already been rotated away (`revokedAt` set),
  that can only mean it leaked — a legitimate client would already be using
  the token it was rotated into, never the dead one. `authService.refresh()`
  treats this as a compromise signal and revokes **every** still-live token
  in that family in one shot, not just the replayed one — forcing
  re-authentication on every device tied to that login line, not only the
  request that got caught reusing it. See
  `server/tests/refreshTokenSecurity.test.ts` for an automated proof: it
  rotates a token twice, replays the very first (now-dead) token, and
  confirms the token that was valid a moment earlier is rejected too.
- Only a **hash** of the refresh token is stored in Postgres — a DB leak
  alone doesn't hand out valid sessions.
- **Login rate limiting:** `POST /api/auth/login` is behind
  `express-rate-limit` (`server/src/middleware/rateLimit.ts`) — 10 failed
  attempts per 15 minutes per IP, successful logins don't count against the
  limit. This is in-memory and per-process, which is fine for the single
  backend instance this project ships as; a horizontally-scaled deployment
  should swap in a shared store (e.g. `rate-limit-redis`) so the limit holds
  across instances instead of resetting whenever a request lands on a
  different one.
- On page reload, the frontend calls `POST /api/auth/refresh` once
  (`useAuthBootstrap`) to silently re-hydrate the access token from the
  cookie; if that fails, the user lands on `/login`.
- `passwordHash`, refresh tokens, and other secrets are **never** returned in
  any API response.

**Why HttpOnly cookies over localStorage:** a JWT in localStorage is
readable by any script running on the page — including anything injected via
XSS. An HttpOnly cookie is invisible to JavaScript entirely, so an XSS bug
can't be turned into a stolen long-lived session. The short-lived access
token still needs to be usable by JS (to set the `Authorization` header), so
it's kept in memory — an XSS payload could steal it while it's live, but
only for a few minutes, and the refresh token that could mint a new one
indefinitely stays out of reach.

## RBAC & resource-ownership authorization

Role middleware (`requireRole`) is intentionally treated as **necessary but
not sufficient**. Every resource-reading or resource-mutating service method
also applies (or checks) a `scopeFor(user)` / `assertMutable(id, user)` rule:

- **Projects:** Admin sees/edits all. A PM sees/edits only projects where
  `createdById === user.id`. A developer sees only projects containing a
  task assigned to them (read-only).
- **Tasks:** Admin sees/edits all. A PM sees/edits only tasks whose project
  they created. A developer sees only tasks where
  `assignedDeveloperId === user.id`, and may change status (but not other
  fields) on those tasks only.
- Every "get one" endpoint returns **404, not 403**, when the resource
  exists but is out of the caller's scope — this avoids leaking "this ID
  exists, you're just not allowed to see it" to an attacker probing IDs.
- List endpoints build the scope into the Prisma `WHERE` clause and never
  fetch broadly and filter in application code.
- The same `userCanAccessProject` check backs the Socket.IO `project:join`
  handler, so the exact same rule governs REST reads and WebSocket room
  membership — there's one source of truth, not two rules that can drift
  apart.

See `server/tests/authorization.test.ts` for automated proof of the five
security cases called out in the assessment (cross-tenant task/project
access, forged-role JWT, direct-call privilege escalation).

## WebSocket architecture

- Socket.IO authenticates each connection via the **same JWT access token**
  used for REST (`socket.handshake.auth.token`) — never a client-supplied
  `userId` or `role`.
- Rooms:
  - `user:{userId}` — every socket joins its own user room (personal
    notifications, personal activity)
  - `global:activity` — joined only by Admin sockets
  - `presence` — joined by everyone, used for the online-users broadcast
  - `project:{projectId}` — joined **on request** (`project:join`), and only
    after the server re-runs `projectService.userCanAccessProject` — a
    client cannot subscribe its way into a project it doesn't own or have a
    task on.
- **Missed-event recovery:** the frontend has no in-memory event buffer to
  trust. On every socket `connect` (including reconnects after being
  offline), it invalidates the activity/notification queries, which re-fetch
  from `GET /api/activity/recent` — a role-scoped read straight from
  Postgres. The socket layer is for low-latency delivery while connected;
  Postgres is the durable source of truth for anything that might have been
  missed.
- **Presence:** an in-memory `Map<userId, connectionCount>` on the server
  tracks how many active sockets each user has (multiple tabs/devices don't
  flicker the status) — a user is only marked offline once their last socket
  disconnects. Broadcast via `presence:update`, no polling.

## Notification architecture

Notifications are always persisted first (`Notification` table), then pushed
live via `notification:new` / `notification:count` to the recipient's
`user:{id}` room. Two triggers are implemented end-to-end:

1. **Task assigned** → notify the developer.
2. **Task moved to `IN_REVIEW`** → notify the PM who owns the project.

Both go through the identical path: create in Postgres → emit `notification:new`
→ emit a fresh `notification:count`. The frontend never polls for either.

## Background job architecture

`jobs/overdueJob.ts` runs `runOverdueCheck()` — a single indexed query for
`isOverdue = false AND status != DONE AND dueDate < now()`, followed by a
bulk update. This must run on a schedule, not on page load, so a task
becomes overdue for every viewer at the same moment regardless of who has a
tab open.

**Why node-cron by default:** zero extra infrastructure — a single Express
process can schedule its own in-process cron tick. This is the right choice
for the assessment's default single-instance deployment.

**Why BullMQ + Redis is offered as an opt-in (`BULLMQ_ENABLED=true`):** in a
horizontally-scaled deployment (multiple backend instances), plain
`node-cron` on every instance would run the same job N times. BullMQ's
repeatable jobs are deduplicated by the queue itself — only one worker across
the fleet actually executes a given tick — which is the correct behavior
once you're running more than one API instance. Both paths call the same
`runOverdueCheck()` so behavior is identical either way; only the scheduler
differs.

## API documentation

All responses follow:

```jsonc
// success
{ "success": true, "data": { /* ... */ } }
// error
{ "success": false, "error": { "code": "...", "message": "...", "details": [...] } }
```

### Auth

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/auth/login` | none | body `{ email, password }`; sets refresh cookie |
| POST | `/api/auth/refresh` | refresh cookie | rotates the refresh token |
| POST | `/api/auth/logout` | refresh cookie | revokes + clears cookie |
| GET | `/api/auth/me` | Bearer | current user |

### Users (Admin only)

`GET /api/users`, `GET /api/users/:id`, `POST /api/users`,
`PATCH /api/users/:id`, `DELETE /api/users/:id`

### Clients

`GET /api/clients`, `GET /api/clients/:id` — any authenticated role.
`POST` / `PATCH` — Admin or PM. `DELETE` — Admin only.

### Projects

`GET /api/projects?page=&limit=`, `GET /api/projects/:id` — role-scoped
automatically (see [RBAC](#rbac--resource-ownership-authorization)).
`POST` / `PATCH` / `DELETE` — Admin or the owning PM.

### Tasks

`GET /api/tasks?status=&priority=&from=&to=&projectId=&page=&limit=` — role-scoped.
`GET /api/tasks/:id`, `POST /api/tasks`, `PATCH /api/tasks/:id`,
`DELETE /api/tasks/:id` — Admin or owning PM.

`PATCH /api/tasks/:id/status` — body `{ status }`. Allowed for Admin, the
owning PM, **or** the assigned developer; exact ownership is re-verified
server-side regardless of role. Triggers the full activity+notification
flow described above.

### Activity

`GET /api/activity/recent?limit=20` — role-scoped, source of truth for
missed-event recovery.

### Dashboard

`GET /api/dashboard/summary` — role-scoped aggregate stats (`totalProjects`,
`totalTasks`, `tasksByStatus`, `overdueCount`, plus `tasksByPriority` and
`upcomingDueThisWeek` for PMs). Computed via `count`/`groupBy` over the
full scoped dataset, not derived from a paginated list — see
[Known limitations](#known-limitations--future-improvements) for the bug
this replaced. Live "online now" count is not part of this endpoint; the
frontend reads it from the `presence:update` socket event instead.

### Notifications

`GET /api/notifications?page=&limit=`, `GET /api/notifications/unread-count`,
`PATCH /api/notifications/:id/read`, `PATCH /api/notifications/read-all`.

## Environment variables

See `.env.example`. Required (server refuses to boot without these):
`DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`.

## Local setup

```bash
cp .env.example .env
# start Postgres (+ Redis if you plan to try BULLMQ_ENABLED=true) however you like,
# or just run: docker compose up -d postgres redis

cd server
npm install
npx prisma migrate dev --name init
npm run seed
npm run dev        # http://localhost:4000

cd ../client
npm install
npm run dev         # http://localhost:5173
```

> **Sandbox note:** this project was scaffolded and type-checked in an
> environment whose network egress does not allow reaching
> `binaries.prisma.sh`, so `npx prisma generate` / `migrate` could not be
> executed here. Everything else — `npm install`, `tsc --noEmit` on both
> server and client, and `vite build` — was run successfully. On a normal
> machine/CI runner with full internet access, `prisma generate` and
> `migrate dev` work exactly as documented above.

## Docker setup

```bash
cp .env.example .env
docker compose up --build
```

This brings up Postgres, Redis, the backend (runs migrations + seed on
start), and the frontend (Nginx-served static build) — see
`docker-compose.yml`. Set real secrets in `.env` before anything resembling
production use.

## Demo accounts

All demo accounts share the password **`Password123!`** (set in
`prisma/seed.ts`, never a production credential):

| Email | Role |
|---|---|
| admin@example.com | Admin |
| pm1@example.com | Project Manager |
| pm2@example.com | Project Manager |
| dev1@example.com – dev4@example.com | Developer |

## Testing

```bash
cd server
# requires a real Postgres reachable at DATABASE_URL — these tests exercise
# the actual authorization logic through Prisma, not a mock, because the
# whole point is proving the real query layer enforces ownership.
npm test
```

Covers (matching spec section 32 exactly):

- Developer A cannot `GET` Developer B's task (403/404)
- PM A cannot `GET` PM B's project (403/404)
- Developer cannot `PATCH` status on a task not assigned to them (403)
- A JWT forged with a different signing secret is rejected (401)
- A developer calling an Admin-only API is forbidden (403)
- List endpoints are correctly scoped per role
- The full task-status-change transaction persists an `ActivityLog` row and
  the right `Notification`
- `GET /api/activity/recent` is scoped per role
- Refresh-token rotation and reuse detection: replaying an already-rotated
  refresh token is rejected AND revokes every other live token in that
  login's family, not just the replayed one

## Deployment

- **Frontend:** deploy `client/` to Vercel; set `VITE_API_URL` /
  `VITE_SOCKET_URL` to the deployed backend's URL.
- **Backend:** deploy `server/` to any Node host (Render, Railway, Fly.io,
  a VM, etc.); set `CLIENT_URL` to the deployed frontend's origin so CORS
  and the cookie's implicit origin checks work, and set `NODE_ENV=production`
  so the refresh cookie gets `Secure` + `SameSite=strict`.
- **Database / Redis:** use a hosted Postgres and (if `BULLMQ_ENABLED=true`)
  a hosted Redis; point `DATABASE_URL` / `REDIS_URL` at them.
- Ensure the hosting provider supports long-lived WebSocket connections
  (Socket.IO) — most serverless platforms do not; a persistent-process host
  is required for the backend.

## Known limitations & future improvements

- The Admin dashboard originally computed "tasks by status" and "overdue
  count" from a 10-item paginated slice of `/api/tasks`, which silently
  under-reported totals past the first page. Fixed by adding
  `GET /api/dashboard/summary`, computed via `count`/`groupBy` over the
  full scoped dataset — noted here so the fix is traceable, not because
  it's still open.
- The frontend's create/edit forms are intentionally minimal (native
  `<form>` + `FormData` rather than fully wired `react-hook-form` +
  `zod` resolvers on every modal) to keep the assessment's scope
  shippable; the pattern is established (see `LoginPage.tsx`) and the
  remaining forms follow the same shape.
- `ProjectMember` (many-to-many project membership beyond "creator") and
  `TaskStatusHistory` (full audit trail beyond the latest `ActivityLog`
  entries) were listed as optional in the brief and are not implemented.
- Toast notifications, confirmation dialogs for destructive actions, and
  keyboard-accessible modal focus-trapping are not yet built — the current
  modals are functional but not fully polished for accessibility.
- This was scaffolded in a network-restricted sandbox that could not reach
  `binaries.prisma.sh`, so `prisma generate`/`migrate` were not run here;
  do that as the first step locally (see [Local setup](#local-setup)).