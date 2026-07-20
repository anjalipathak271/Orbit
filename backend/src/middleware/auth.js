import jwt from "jsonwebtoken";

// Protects a route: checks for a valid "Authorization: Bearer <token>" header.
// If valid, attaches the user's id to req.user so route handlers can use it.
// This is what makes role-based access control actually enforceable on the
// server -- the frontend hiding a button is not security (Section 5.4/5.5).
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid authorization header" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.sub };
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
