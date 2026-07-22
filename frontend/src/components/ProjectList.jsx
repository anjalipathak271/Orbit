import { useEffect, useState } from "react";
import { api } from "../api";

export default function ProjectList({ token, workspace, onSelect, onShowDashboard }) {
  const [projects, setProjects] = useState([]);
  const [status, setStatus] = useState("loading");
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    load();
  }, [workspace.id]);

  async function load() {
    setStatus("loading");
    try {
      const data = await api.listProjects(token, workspace.id);
      setProjects(data);
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
      const project = await api.createProject(token, workspace.id, newName.trim());
      setNewName("");
      setProjects((prev) => [project, ...prev]);
    } catch (err) {
      alert(err.message);
    } finally {
      setCreating(false);
    }
  }

  if (status === "loading") return <p className="hint">Loading projects...</p>;
  if (status === "error") return <p className="error-banner">Could not load projects.</p>;

  return (
    <div>
      <div className="section-header">
        <div>
          <h1>{workspace.name}</h1>
          <p className="subtitle">Projects in this workspace</p>
        </div>
        <button className="btn-ghost" onClick={onShowDashboard}>📊 Dashboard</button>
      </div>

      {projects.length === 0 && (
        <div className="empty-state">
          <p>No projects yet. Create the first one below.</p>
        </div>
      )}

      <div className="card-grid">
        {projects.map((p) => (
          <button key={p.id} className="card" onClick={() => onSelect(p)}>
            <div className="card-title">{p.name}</div>
          </button>
        ))}
      </div>

      <form onSubmit={handleCreate} className="inline-form">
        <input
          placeholder="New project name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button type="submit" className="btn-primary" disabled={creating}>
          {creating ? "Creating..." : "Create project"}
        </button>
      </form>
    </div>
  );
}
