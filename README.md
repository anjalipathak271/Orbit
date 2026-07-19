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

## Project status

- [x] Week 1: Docker Compose skeleton (frontend + backend + db talking to each other)
- [ ] Week 2–3: Auth & core data (users, workspaces, projects, tasks)
- [ ] Week 4–5: Board UI, comments, real-time updates
- [ ] Week 6: Search, algorithms, dashboard
- [ ] Week 7: Integrations, security hardening, notifications
- [ ] Week 8: Deploy & documentation

See `docs/er-diagram.md` for the database schema.
