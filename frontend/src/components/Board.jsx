import { useEffect, useState } from "react";
import { api } from "../api";

const COLUMNS = [
  { key: "todo", label: "To Do" },
  { key: "in_progress", label: "In Progress" },
  { key: "done", label: "Done" },
];

export default function Board({ token, project }) {
  const [tasks, setTasks] = useState([]);
  const [status, setStatus] = useState("loading");
  const [newTitle, setNewTitle] = useState("");
  const [search, setSearch] = useState("");
  const [draggedTaskId, setDraggedTaskId] = useState(null);

  useEffect(() => {
    load();
  }, [project.id]);

  async function load() {
    setStatus("loading");
    try {
      const data = await api.listTasks(token, project.id);
      setTasks(data);
      setStatus("ok");
    } catch (err) {
      setStatus("error");
    }
  }

  async function handleCreateTask(e) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const title = newTitle.trim();
    setNewTitle("");
    try {
      const task = await api.createTask(token, project.id, title);
      setTasks((prev) => [task, ...prev]);
    } catch (err) {
      alert(err.message);
    }
  }

  // Optimistic update: move the card immediately in the UI, then confirm
  // with the server. If the server call fails, put it back.
  async function moveTask(taskId, newStatus) {
    const previous = tasks;
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
    try {
      await api.updateTask(token, project.id, taskId, { status: newStatus });
    } catch (err) {
      setTasks(previous);
      alert("Could not move task: " + err.message);
    }
  }

  async function handleDelete(taskId) {
    if (!confirm("Delete this task?")) return;
    const previous = tasks;
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    try {
      await api.deleteTask(token, project.id, taskId);
    } catch (err) {
      setTasks(previous);
      alert("Could not delete task: " + err.message);
    }
  }

  const visibleTasks = search
    ? tasks.filter((t) => t.title.toLowerCase().includes(search.toLowerCase()))
    : tasks;

  if (status === "loading") return <p className="hint">Loading tasks...</p>;
  if (status === "error") return <p className="error-banner">Could not load tasks.</p>;

  return (
    <div>
      <div className="section-header">
        <h1>{project.name}</h1>
        <input
          className="search-input"
          placeholder="Search tasks..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <form onSubmit={handleCreateTask} className="inline-form">
        <input
          placeholder="New task title"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
        />
        <button type="submit" className="btn-primary">Add task</button>
      </form>

      <div className="board">
        {COLUMNS.map((col) => {
          const colTasks = visibleTasks.filter((t) => t.status === col.key);
          return (
            <div
              key={col.key}
              className="board-column"
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (draggedTaskId) moveTask(draggedTaskId, col.key);
              }}
            >
              <div className="column-header">
                <span>{col.label}</span>
                <span className="column-count">{colTasks.length}</span>
              </div>

              {colTasks.length === 0 && (
                <div className="column-empty">Drop tasks here</div>
              )}

              {colTasks.map((task) => (
                <div
                  key={task.id}
                  className="task-card"
                  draggable
                  onDragStart={() => setDraggedTaskId(task.id)}
                  onDragEnd={() => setDraggedTaskId(null)}
                >
                  <div className="task-title">{task.title}</div>
                  <div className="task-footer">
                    <span className={`priority-badge priority-${task.priority}`}>
                      {task.priority}
                    </span>
                    <button
                      className="btn-icon"
                      onClick={() => handleDelete(task.id)}
                      title="Delete task"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
