import { useEffect, useState } from "react";
import { api } from "../api";

const STATUS_LABELS = { todo: "To Do", in_progress: "In Progress", done: "Done" };

export default function Dashboard({ token, workspace, onBack }) {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    load();
  }, [workspace.id]);

  async function load() {
    setStatus("loading");
    try {
      const result = await api.getDashboard(token, workspace.id);
      setData(result);
      setStatus("ok");
    } catch (err) {
      setStatus("error");
    }
  }

  if (status === "loading") return <p className="hint">Loading dashboard...</p>;
  if (status === "error") return <p className="error-banner">Could not load dashboard.</p>;

  const totalTasks = data.byStatus.reduce((sum, s) => sum + s.count, 0);

  return (
    <div>
      <div className="section-header">
        <div>
          <h1>Dashboard</h1>
          <p className="subtitle">{workspace.name} — across all projects</p>
        </div>
        <button className="btn-ghost" onClick={onBack}>← Back to projects</button>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-value">{totalTasks}</div>
          <div className="stat-label">Total tasks</div>
        </div>
        <div className="stat-card stat-warning">
          <div className="stat-value">{data.overdueCount}</div>
          <div className="stat-label">Overdue</div>
        </div>
        {["todo", "in_progress", "done"].map((key) => {
          const entry = data.byStatus.find((s) => s.status === key);
          return (
            <div className="stat-card" key={key}>
              <div className="stat-value">{entry ? entry.count : 0}</div>
              <div className="stat-label">{STATUS_LABELS[key]}</div>
            </div>
          );
        })}
      </div>

      <h2 className="sub-heading">Tasks per assignee</h2>
      {data.byAssignee.length === 0 && <p className="hint">No tasks assigned yet.</p>}
      <div className="assignee-list">
        {data.byAssignee.map((a) => (
          <div key={a.user_id} className="assignee-row">
            <span>{a.name}</span>
            <span className="assignee-count">{a.count} task{a.count !== 1 ? "s" : ""}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
