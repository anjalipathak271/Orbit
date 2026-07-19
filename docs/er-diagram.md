# Orbit — Entity Relationship Diagram

This diagram shows the core database schema for Orbit: users, workspaces, projects, tasks, comments, and notifications.

```mermaid
erDiagram
  USERS ||--o{ WORKSPACE_MEMBERS : has
  WORKSPACES ||--o{ WORKSPACE_MEMBERS : contains
  WORKSPACES ||--o{ PROJECTS : contains
  PROJECTS ||--o{ TASKS : contains
  USERS ||--o{ TASKS : assigned_to
  TASKS ||--o{ COMMENTS : has
  USERS ||--o{ COMMENTS : writes
  USERS ||--o{ NOTIFICATIONS : receives

  USERS {
    uuid id PK
    string name
    string email
    string password_hash
    timestamp created_at
  }

  WORKSPACES {
    uuid id PK
    string name
    uuid owner_id FK
    timestamp created_at
  }

  WORKSPACE_MEMBERS {
    uuid id PK
    uuid user_id FK
    uuid workspace_id FK
    string role "admin | member"
  }

  PROJECTS {
    uuid id PK
    uuid workspace_id FK
    string name
    timestamp created_at
  }

  TASKS {
    uuid id PK
    uuid project_id FK
    uuid assignee_id FK
    string title
    string description
    string status "todo | in_progress | done"
    string priority "low | medium | high"
    date due_date
    timestamp created_at
  }

  COMMENTS {
    uuid id PK
    uuid task_id FK
    uuid user_id FK
    string body
    timestamp created_at
  }

  NOTIFICATIONS {
    uuid id PK
    uuid user_id FK
    string message
    boolean read
    timestamp created_at
  }
```

## Notes

- **WORKSPACE_MEMBERS** is a join table: one user can belong to many workspaces, and one workspace can have many users. The `role` column here drives role-based access control (Admin vs Member).
- **TASKS** is the central table — it links to a project (what it belongs to), an assignee (who owns it), and holds the fields the board UI and dashboard depend on (`status`, `priority`, `due_date`).
- **COMMENTS** and **NOTIFICATIONS** both reference `USERS` because we need to know who wrote a comment and who a notification is for.
- All primary keys use `uuid` rather than auto-increment integers — this avoids leaking sequential IDs (e.g. guessing `/tasks/43`) which matters for the broken-access-control requirement in Section 5.5.
