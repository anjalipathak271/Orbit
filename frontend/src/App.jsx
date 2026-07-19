import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function App() {
  const [status, setStatus] = useState("loading"); // loading | ok | error
  const [dbTime, setDbTime] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/api/db-check`)
      .then((res) => {
        if (!res.ok) throw new Error("Backend responded with an error");
        return res.json();
      })
      .then((data) => {
        setStatus("ok");
        setDbTime(data.db_time);
      })
      .catch(() => setStatus("error"));
  }, []);

  return (
    <div style={{ fontFamily: "sans-serif", padding: "2rem" }}>
      <h1>🪐 Orbit</h1>
      <p>Week 1 hello-world check: frontend → backend → database.</p>

      {status === "loading" && <p>Checking connection...</p>}
      {status === "ok" && (
        <p style={{ color: "green" }}>
          ✅ Connected. Database time: {dbTime}
        </p>
      )}
      {status === "error" && (
        <p style={{ color: "red" }}>
          ❌ Could not reach the backend/database. Is Docker Compose running?
        </p>
      )}
    </div>
  );
}
