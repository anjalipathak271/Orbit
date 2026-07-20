import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

// Small helper: confirms the logged-in user belongs to a workspace,
// and returns their role there (or null if they're not a member).
// Used to enforce "a Member must not access another team's data by
// guessing an ID" -- Section 5.5.
async function getMembership(userId, workspaceId) {
  try {
    const result = await pool.query(
      "SELECT role FROM workspace_members WHERE user_id = $1 AND workspace_id = $2",
      [userId, workspaceId]
    );
    return result.rows[0]?.role ?? null;
  } catch (err) {
    // e.g. workspaceId wasn't a valid UUID -- treat as "no access" rather
    // than crashing.
    return null;
  }
}

// POST /api/workspaces/:workspaceId/projects -- create a project.
router.post("/:workspaceId/projects", async (req, res) => {
  const { workspaceId } = req.params;
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "name is required" });

  const role = await getMembership(req.user.id, workspaceId);
  if (!role) return res.status(403).json({ error: "You are not a member of this workspace" });

  try {
    const result = await pool.query(
      "INSERT INTO projects (workspace_id, name) VALUES ($1, $2) RETURNING id, name, created_at",
      [workspaceId, name]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not create project" });
  }
});

// GET /api/workspaces/:workspaceId/projects -- list projects in a workspace.
router.get("/:workspaceId/projects", async (req, res) => {
  const { workspaceId } = req.params;

  const role = await getMembership(req.user.id, workspaceId);
  if (!role) return res.status(403).json({ error: "You are not a member of this workspace" });

  try {
    const result = await pool.query(
      "SELECT id, name, created_at FROM projects WHERE workspace_id = $1 ORDER BY created_at DESC",
      [workspaceId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not fetch projects" });
  }
});

// DELETE /api/workspaces/:workspaceId/projects/:projectId -- admin only.
router.delete("/:workspaceId/projects/:projectId", async (req, res) => {
  const { workspaceId, projectId } = req.params;

  const role = await getMembership(req.user.id, workspaceId);
  if (role !== "admin") {
    return res.status(403).json({ error: "Only workspace admins can delete projects" });
  }

  try {
    const result = await pool.query(
      "DELETE FROM projects WHERE id = $1 AND workspace_id = $2 RETURNING id",
      [projectId, workspaceId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Project not found in this workspace" });
    }
    res.json({ message: "Project deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not delete project" });
  }
});

export default router;
