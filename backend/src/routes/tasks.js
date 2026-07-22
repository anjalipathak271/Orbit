import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";
import { emitToProject } from "../realtime.js";

const router = Router();
router.use(requireAuth);

const VALID_STATUSES = ["todo", "in_progress", "done"];
const VALID_PRIORITIES = ["low", "medium", "high"];

// Confirms the logged-in user belongs to the workspace that owns this
// project, by joining projects -> workspace_members. This is what stops a
// Member from one team reading/editing another team's tasks by guessing
// a project ID (Section 5.5 -- broken access control).
async function getProjectMembership(userId, projectId) {
  try {
    const result = await pool.query(
      `SELECT wm.role
       FROM projects p
       JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
       WHERE p.id = $1 AND wm.user_id = $2`,
      [projectId, userId]
    );
    return result.rows[0]?.role ?? null;
  } catch (err) {
    // e.g. projectId wasn't a valid UUID -- treat as "no access" rather
    // than crashing.
    return null;
  }
}

// POST /api/projects/:projectId/tasks -- create a task.
router.post("/:projectId/tasks", async (req, res) => {
  const { projectId } = req.params;
  const { title, description, status, priority, assignee_id, due_date } = req.body;

  if (!title) return res.status(400).json({ error: "title is required" });
  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(", ")}` });
  }
  if (priority && !VALID_PRIORITIES.includes(priority)) {
    return res.status(400).json({ error: `priority must be one of: ${VALID_PRIORITIES.join(", ")}` });
  }

  const role = await getProjectMembership(req.user.id, projectId);
  if (!role) return res.status(403).json({ error: "You do not have access to this project" });

  try {
    const result = await pool.query(
      `INSERT INTO tasks (project_id, title, description, status, priority, assignee_id, due_date)
       VALUES ($1, $2, $3, COALESCE($4, 'todo'), COALESCE($5, 'medium'), $6, $7)
       RETURNING *`,
      [projectId, title, description ?? null, status, priority, assignee_id ?? null, due_date ?? null]
    );
    emitToProject(projectId, "task_created", result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not create task" });
  }
});

// GET /api/projects/:projectId/tasks -- list tasks, with optional filters.
// Supports ?status=, ?assignee_id=, ?search= (keyword in title/description).
router.get("/:projectId/tasks", async (req, res) => {
  const { projectId } = req.params;
  const { status, assignee_id, search } = req.query;

  const role = await getProjectMembership(req.user.id, projectId);
  if (!role) return res.status(403).json({ error: "You do not have access to this project" });

  const conditions = ["project_id = $1"];
  const values = [projectId];

  if (status) {
    values.push(status);
    conditions.push(`status = $${values.length}`);
  }
  if (assignee_id) {
    values.push(assignee_id);
    conditions.push(`assignee_id = $${values.length}`);
  }
  if (search) {
    values.push(`%${search}%`);
    conditions.push(`(title ILIKE $${values.length} OR description ILIKE $${values.length})`);
  }

  try {
    const result = await pool.query(
      `SELECT * FROM tasks WHERE ${conditions.join(" AND ")} ORDER BY created_at DESC`,
      values
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not fetch tasks" });
  }
});

// PATCH /api/projects/:projectId/tasks/:taskId -- update any subset of fields.
// This is the endpoint the board UI will call when a task is dragged to a
// new column (it just sends { status: "in_progress" }).
router.patch("/:projectId/tasks/:taskId", async (req, res) => {
  const { projectId, taskId } = req.params;
  const { title, description, status, priority, assignee_id, due_date } = req.body;

  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(", ")}` });
  }
  if (priority && !VALID_PRIORITIES.includes(priority)) {
    return res.status(400).json({ error: `priority must be one of: ${VALID_PRIORITIES.join(", ")}` });
  }

  const role = await getProjectMembership(req.user.id, projectId);
  if (!role) return res.status(403).json({ error: "You do not have access to this project" });

  try {
    const result = await pool.query(
      `UPDATE tasks SET
         title = COALESCE($1, title),
         description = COALESCE($2, description),
         status = COALESCE($3, status),
         priority = COALESCE($4, priority),
         assignee_id = COALESCE($5, assignee_id),
         due_date = COALESCE($6, due_date)
       WHERE id = $7 AND project_id = $8
       RETURNING *`,
      [title, description, status, priority, assignee_id, due_date, taskId, projectId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Task not found in this project" });
    }
    emitToProject(projectId, "task_updated", result.rows[0]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not update task" });
  }
});

// DELETE /api/projects/:projectId/tasks/:taskId
router.delete("/:projectId/tasks/:taskId", async (req, res) => {
  const { projectId, taskId } = req.params;

  const role = await getProjectMembership(req.user.id, projectId);
  if (!role) return res.status(403).json({ error: "You do not have access to this project" });

  try {
    const result = await pool.query(
      "DELETE FROM tasks WHERE id = $1 AND project_id = $2 RETURNING id",
      [taskId, projectId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Task not found in this project" });
    }
    emitToProject(projectId, "task_deleted", { id: taskId });
    res.json({ message: "Task deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not delete task" });
  }
});

export default router;
