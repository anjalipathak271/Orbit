import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { pool } from "./db/pool.js";
import { setIO } from "./realtime.js";
import authRoutes from "./routes/auth.js";
import workspaceRoutes from "./routes/workspaces.js";
import projectRoutes from "./routes/projects.js";
import taskRoutes from "./routes/tasks.js";
import commentRoutes from "./routes/comments.js";

const app = express();
app.use(cors());
app.use(express.json());

// Basic health check — confirms the server is up.
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/workspaces", workspaceRoutes);
// Project routes are nested under /workspaces/:workspaceId/projects,
// so they're mounted on the same base path.
app.use("/api/workspaces", projectRoutes);
// Task routes are nested under /projects/:projectId/tasks.
app.use("/api/projects", taskRoutes);
// Comment routes are nested under /tasks/:taskId/comments.
app.use("/api/tasks", commentRoutes);

// Confirms the server can actually talk to Postgres.
app.get("/api/db-check", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({ status: "ok", db_time: result.rows[0].now });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: "error", message: "Could not reach database" });
  }
});

// Socket.IO runs on top of the same HTTP server as the REST API --
// no separate port needed. Clients "join" a room per project (e.g.
// "project:<uuid>"), so updates only broadcast to people viewing that
// specific board, not every connected client.
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" },
});
setIO(io);

io.on("connection", (socket) => {
  socket.on("join_project", (projectId) => {
    socket.join(`project:${projectId}`);
  });

  socket.on("leave_project", (projectId) => {
    socket.leave(`project:${projectId}`);
  });

  // Socket.IO's client library already handles reconnection (retrying
  // with backoff) automatically -- nothing extra needed here. The
  // frontend just re-emits "join_project" on every "connect" event,
  // including reconnects, so the client ends up back in the right room.
});

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`Orbit backend listening on port ${PORT}`);
});

// Safety net: if any route handler throws an error we didn't catch
// ourselves (e.g. malformed input causing a database error), log it and
// keep the server running instead of crashing the whole process.
process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection (server kept running):", err.message);
});
