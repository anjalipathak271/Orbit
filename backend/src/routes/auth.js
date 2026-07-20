import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { pool } from "../db/pool.js";

const router = Router();

// Login endpoint gets its own rate limit -- without this, an attacker can
// try unlimited passwords against one account (brute force). Section 5.5.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per IP per window
  message: { error: "Too many login attempts. Try again later." },
});

function signToken(userId) {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

// POST /api/auth/register
router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  // Never trust client input -- validate everything server-side (Section 5.2).
  if (!name || !email || !password) {
    return res.status(400).json({ error: "name, email, and password are required" });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }

  try {
    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }

    // bcrypt hashes + salts automatically -- the plain password is never stored.
    const passwordHash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      "INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email, created_at",
      [name, email, passwordHash]
    );

    const user = result.rows[0];
    const token = signToken(user.id);

    res.status(201).json({ user, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

// POST /api/auth/login
router.post("/login", loginLimiter, async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  try {
    const result = await pool.query(
      "SELECT id, name, email, password_hash FROM users WHERE email = $1",
      [email]
    );

    // Same generic error whether the email doesn't exist or the password is
    // wrong -- don't reveal which one, that helps attackers enumerate emails.
    const genericError = { error: "Invalid email or password" };

    if (result.rows.length === 0) {
      return res.status(401).json(genericError);
    }

    const user = result.rows[0];
    const passwordMatches = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatches) {
      return res.status(401).json(genericError);
    }

    const token = signToken(user.id);
    delete user.password_hash;

    res.json({ user, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

export default router;
