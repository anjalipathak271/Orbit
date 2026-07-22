import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";
import { emitToProject } from "../realtime.js";

const router = Router();
router.use(requireAuth);

// Confirms the user has access to the task (via its project's workspace),
// and also hands back the project_id -- we need it to broadcast the
// real-time event to the right room.
async function getTaskAccess(userId, taskId) {
  try {
    const result = await pool.query(
      `SELECT t.project_id
       FROM tasks t
       JOIN projects p ON p.id = t.project_id
       JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
       WHERE t.id = $1 AND wm.user_id = $2`,
      [taskId, userId]
    );
    return result.rows[0]?.project_id ?? null;
  } catch (err) {
    return null;
  }
}

// GET /api/tasks/:taskId/comments
router.get("/:taskId/comments", async (req, res) => {
  const { taskId } = req.params;

  const projectId = await getTaskAccess(req.user.id, taskId);
  if (!projectId) return res.status(403).json({ error: "You do not have access to this task" });

  try {
    const result = await pool.query(
      `SELECT c.id, c.body, c.created_at, c.user_id, u.name AS user_name
       FROM comments c
       JOIN users u ON u.id = c.user_id
       WHERE c.task_id = $1
       ORDER BY c.created_at ASC`,
      [taskId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not fetch comments" });
  }
});

// POST /api/tasks/:taskId/comments
router.post("/:taskId/comments", async (req, res) => {
  const { taskId } = req.params;
  const { body } = req.body;

  if (!body || !body.trim()) {
    return res.status(400).json({ error: "Comment body is required" });
  }

  const projectId = await getTaskAccess(req.user.id, taskId);
  if (!projectId) return res.status(403).json({ error: "You do not have access to this task" });

  try {
    const result = await pool.query(
      `INSERT INTO comments (task_id, user_id, body) VALUES ($1, $2, $3)
       RETURNING id, body, created_at, user_id`,
      [taskId, req.user.id, body.trim()]
    );

    const userResult = await pool.query("SELECT name FROM users WHERE id = $1", [req.user.id]);

    const comment = {
      ...result.rows[0],
      task_id: taskId,
      user_name: userResult.rows[0]?.name ?? "Unknown",
    };

    // Broadcast to everyone else currently viewing this project's board.
    emitToProject(projectId, "comment_created", comment);

    res.status(201).json(comment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not create comment" });
  }
});

export default router;
