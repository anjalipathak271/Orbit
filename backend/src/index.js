import "dotenv/config";
import express from "express";
import cors from "cors";
import { pool } from "./db/pool.js";

const app = express();
app.use(cors());
app.use(express.json());

// Basic health check — confirms the server is up.
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

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

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Orbit backend listening on port ${PORT}`);
});
