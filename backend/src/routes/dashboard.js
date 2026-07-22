import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

// GET /api/workspaces/:workspaceId/dashboard
// Returns: tasks per status, overdue count, and tasks per assignee --
// all scoped to projects inside this workspace.
// Section 5.3 requires at least one query joining 3+ tables; each query
// below joins tasks -> projects -> workspace_members (or users).
router.get("/:workspaceId/dashboard", async (req, res) => {
  const { workspaceId } = req.params;

  try {
    // Confirm the user actually belongs to this workspace before showing
    // any of its data (Section 5.5 -- broken access control).
    const membership = await pool.query(
      "SELECT role FROM workspace_members WHERE user_id = $1 AND workspace_id = $2",
      [req.user.id, workspaceId]
    );
    if (membership.rows.length === 0) {
      return res.status(403).json({ error: "You are not a member of this workspace" });
    }

    // Tasks grouped by status -- joins tasks, projects, workspace_members.
    const byStatusResult = await pool.query(
      `SELECT t.status, COUNT(*)::int AS count
       FROM tasks t
       JOIN projects p ON p.id = t.project_id
       JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
       WHERE p.workspace_id = $1 AND wm.user_id = $2
       GROUP BY t.status`,
      [workspaceId, req.user.id]
    );

    // Overdue tasks: due date has passed and it's not marked done.
    const overdueResult = await pool.query(
      `SELECT COUNT(*)::int AS count
       FROM tasks t
       JOIN projects p ON p.id = t.project_id
       JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
       WHERE p.workspace_id = $1 AND wm.user_id = $2
         AND t.due_date < CURRENT_DATE AND t.status != 'done'`,
      [workspaceId, req.user.id]
    );

    // Tasks per assignee -- joins tasks, projects, and users.
    const byAssigneeResult = await pool.query(
      `SELECT u.id AS user_id, u.name, COUNT(t.id)::int AS count
       FROM tasks t
       JOIN projects p ON p.id = t.project_id
       JOIN users u ON u.id = t.assignee_id
       WHERE p.workspace_id = $1
       GROUP BY u.id, u.name
       ORDER BY count DESC`,
      [workspaceId]
    );

    res.json({
      byStatus: byStatusResult.rows,
      overdueCount: overdueResult.rows[0].count,
      byAssignee: byAssigneeResult.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load dashboard" });
  }
});

export default router;
