import pg from "pg";

const { Pool } = pg;

// Single shared connection pool for the whole app.
// Never build SQL by hand-inserting variables — always use
// parameterized queries (pool.query("... WHERE id = $1", [id]))
// to avoid SQL injection.
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
