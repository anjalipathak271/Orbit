# Orbit

A lightweight team collaboration & task management platform (Trello + Asana + Slack, mini version).

## Stack

- **Frontend:** React + Vite
- **Backend:** Node.js + Express
- **Database:** PostgreSQL
- **Real-time:** Socket.IO (added in Week 4–5)
- **Containers:** Docker + Docker Compose

*Why this stack:* everything runs on JavaScript, which keeps context-switching low for a solo build across frontend, backend, and DevOps.

## Running locally

Requires Docker + Docker Compose installed.

```bash
git clone <your-repo-url>
cd orbit
docker compose up
```

- Frontend: http://localhost:5173
- Backend: http://localhost:4000/api/health
- Postgres: localhost:5432 (user: `orbit`, password: `orbit_dev_password`, db: `orbit`)

The frontend home page pings the backend, which pings Postgres — if you see a green "Connected" message, the whole stack is wired up correctly.

## Running database migrations (Week 2+)

After `docker compose up` is running, open a **second terminal** in the project folder and run:

```bash
docker compose exec backend node src/migrate.js
```

This creates all the tables (users, workspaces, projects, tasks, comments, notifications) inside the Postgres container. You only need to do this once — re-run it after adding new migration files.

## API quick reference (Week 2)

| Method | Endpoint | Auth required | Description |
|---|---|---|---|
| POST | `/api/auth/register` | No | Create an account |
| POST | `/api/auth/login` | No | Log in, get a token |
| POST | `/api/workspaces` | Yes | Create a workspace (you become admin) |
| GET | `/api/workspaces` | Yes | List your workspaces |
| POST | `/api/workspaces/:id/members` | Yes (admin) | Invite a member by email |
| POST | `/api/workspaces/:id/projects` | Yes | Create a project |
| GET | `/api/workspaces/:id/projects` | Yes | List projects |
| DELETE | `/api/workspaces/:id/projects/:projectId` | Yes (admin) | Delete a project |
| POST | `/api/projects/:id/tasks` | Yes | Create a task |
| GET | `/api/projects/:id/tasks` | Yes | List tasks (supports `?status=`, `?assignee_id=`, `?search=`) |
| PATCH | `/api/projects/:id/tasks/:taskId` | Yes | Update a task (e.g. change status) |
| DELETE | `/api/projects/:id/tasks/:taskId` | Yes | Delete a task |
| GET | `/api/tasks/:taskId/comments` | Yes | List comments on a task |
| POST | `/api/tasks/:taskId/comments` | Yes | Add a comment to a task |
| GET | `/api/workspaces/:id/dashboard` | Yes | Task stats (by status, overdue, by assignee) |

Authenticated requests need a header: `Authorization: Bearer <token>` (token comes back from register/login).

## Project status

- [x] Week 1: Docker Compose skeleton (frontend + backend + db talking to each other)
- [x] Week 2: Auth (register/login, password hashing, JWT), workspaces & projects CRUD with role-based access
- [x] Week 3: Tasks CRUD (create, list with filters, update status, delete)
- [x] Week 4: Real UI — login/signup screen, workspace list, project list, and a drag-and-drop task board
- [x] Week 5: Comments on tasks, real-time updates via WebSockets (Socket.IO)
- [x] Week 6: Search/filter UI, two hand-written algorithms, and a dashboard

## Algorithms (Week 6, see `backend/src/algorithms.js`)

Two algorithms are implemented from scratch (no library does the core logic):

1. **Relevance-ranked search** — scores each task by how many times the search
   terms appear in its title (weighted higher) and description (weighted
   lower), similar to the "term frequency" part of TF-IDF. Non-matching
   tasks are dropped; the rest are sorted highest-score first.
   Time: O(n · m · L), Space: O(n) — n = tasks, m = query words, L = text length.

2. **Smart priority sort** — computes a weighted score per task from its
   priority level, how soon (or overdue) its due date is, and whether it's
   already done (done tasks sink to the bottom). Tasks are then sorted by
   that score. Time: O(n log n), Space: O(n).

Both are wired into `GET /api/projects/:id/tasks` via the `?search=` and
`?sort=smart` query parameters, and exposed in the UI as the search box and
"Smart priority sort" checkbox on the board.

## Dashboard (Week 6)

`GET /api/workspaces/:id/dashboard` returns tasks-per-status, an overdue
count, and tasks-per-assignee — each computed with a query joining across
3+ tables (`tasks` → `projects` → `workspace_members`/`users`), satisfying
the multi-table JOIN requirement in Section 5.3. Accessible from the
"📊 Dashboard" button on the projects screen.

## Real-time updates (Week 5)

The board connects to the backend over WebSockets and joins a room scoped to
the project being viewed (`project:<id>`). When any task is created, moved,
or deleted, or a comment is added, the server broadcasts an event to
everyone in that room — so if you open the same project in two browser
tabs (or two people are viewing it), changes appear instantly without a
refresh. The "● Live" indicator on the board shows the connection status.

## Using the app (Week 4+)

Open http://localhost:5173 — you'll see a real login/signup screen now (not just a connection check).

1. Sign up for an account
2. Create a workspace (you become its admin)
3. Inside the workspace, create a project
4. Inside the project, add tasks and drag them between To Do / In Progress / Done
5. Click the 💬 icon on a task to view/add comments
- [ ] Week 6: Search, algorithms, dashboard
- [ ] Week 7: Integrations, security hardening, notifications
- [ ] Week 8: Deploy & documentation

See `docs/er-diagram.md` for the database schema.
