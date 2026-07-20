import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// All workspace routes require login.
router.use(requireAuth);

// POST /api/workspaces -- create a workspace. Creator becomes admin.
router.post("/", async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "name is required" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const workspaceResult = await client.query(
      "INSERT INTO workspaces (name, owner_id) VALUES ($1, $2) RETURNING id, name, created_at",
      [name, req.user.id]
    );
    const workspace = workspaceResult.rows[0];

    await client.query(
      "INSERT INTO workspace_members (user_id, workspace_id, role) VALUES ($1, $2, 'admin')",
      [req.user.id, workspace.id]
    );

    await client.query("COMMIT");
    res.status(201).json(workspace);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Could not create workspace" });
  } finally {
    client.release();
  }
});

// GET /api/workspaces -- list workspaces the logged-in user belongs to.
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT w.id, w.name, w.created_at, wm.role
       FROM workspaces w
       JOIN workspace_members wm ON wm.workspace_id = w.id
       WHERE wm.user_id = $1`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not fetch workspaces" });
  }
});

// POST /api/workspaces/:id/members -- invite a member by email. Admin only.
router.post("/:id/members", async (req, res) => {
  const { id: workspaceId } = req.params;
  const { email, role = "member" } = req.body;

  if (!email) return res.status(400).json({ error: "email is required" });
  if (!["admin", "member"].includes(role)) {
    return res.status(400).json({ error: "role must be 'admin' or 'member'" });
  }

  try {
    // Enforce on the server that only an admin of THIS workspace can invite.
    // Never trust a role claim from the client -- look it up ourselves.
    const membership = await pool.query(
      "SELECT role FROM workspace_members WHERE user_id = $1 AND workspace_id = $2",
      [req.user.id, workspaceId]
    );
    if (membership.rows.length === 0 || membership.rows[0].role !== "admin") {
      return res.status(403).json({ error: "Only workspace admins can invite members" });
    }

    const userResult = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "No user found with that email" });
    }

    const invitedUserId = userResult.rows[0].id;

    await pool.query(
      "INSERT INTO workspace_members (user_id, workspace_id, role) VALUES ($1, $2, $3) ON CONFLICT (user_id, workspace_id) DO NOTHING",
      [invitedUserId, workspaceId, role]
    );

    res.status(201).json({ message: "Member added" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not add member" });
  }
});

export default router;
