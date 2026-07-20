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

Authenticated requests need a header: `Authorization: Bearer <token>` (token comes back from register/login).

## Project status

- [x] Week 1: Docker Compose skeleton (frontend + backend + db talking to each other)
- [x] Week 2: Auth (register/login, password hashing, JWT), workspaces & projects CRUD with role-based access
- [x] Week 3: Tasks CRUD (create, list with filters, update status, delete)
- [ ] Week 4–5: Board UI, comments, real-time updates
- [ ] Week 6: Search, algorithms, dashboard
- [ ] Week 7: Integrations, security hardening, notifications
- [ ] Week 8: Deploy & documentation

See `docs/er-diagram.md` for the database schema.
