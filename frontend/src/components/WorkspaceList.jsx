import { useEffect, useState } from "react";
import { api } from "../api";

export default function WorkspaceList({ token, onSelect }) {
  const [workspaces, setWorkspaces] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ok | error
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setStatus("loading");
    try {
      const data = await api.listWorkspaces(token);
      setWorkspaces(data);
      setStatus("ok");
    } catch (err) {
      setStatus("error");
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const ws = await api.createWorkspace(token, newName.trim());
      setNewName("");
      setWorkspaces((prev) => [...prev, { ...ws, role: "admin" }]);
    } catch (err) {
      alert(err.message);
    } finally {
      setCreating(false);
    }
  }

  if (status === "loading") return <p className="hint">Loading workspaces...</p>;
  if (status === "error") return <p className="error-banner">Could not load workspaces. Is the backend running?</p>;

  return (
    <div>
      <div className="section-header">
        <h1>Your workspaces</h1>
      </div>

      {workspaces.length === 0 && (
        <div className="empty-state">
          <p>You're not in any workspace yet. Create your first one below.</p>
        </div>
      )}

      <div className="card-grid">
        {workspaces.map((ws) => (
          <button key={ws.id} className="card" onClick={() => onSelect(ws)}>
            <div className="card-title">{ws.name}</div>
            <div className="card-meta">Role: {ws.role}</div>
          </button>
        ))}
      </div>

      <form onSubmit={handleCreate} className="inline-form">
        <input
          placeholder="New workspace name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button type="submit" className="btn-primary" disabled={creating}>
          {creating ? "Creating..." : "Create workspace"}
        </button>
      </form>
    </div>
  );
}
