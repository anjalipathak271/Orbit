import { useEffect, useState } from "react";
import { api } from "../api";
import { socket } from "../socket";
import TaskModal from "./TaskModal";

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
  const [openTask, setOpenTask] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    load();
  }, [project.id]);

  // Real-time: connect the socket, join this project's "room", and listen
  // for events other people's actions trigger on the server. We leave the
  // room and disconnect when navigating away or switching projects.
  useEffect(() => {
    socket.connect();

    function joinRoom() {
      socket.emit("join_project", project.id);
      setConnected(true);
    }
    // Join immediately if already connected, and again on every
    // (re)connect -- covers the case where the connection drops and
    // Socket.IO's client reconnects automatically.
    if (socket.connected) joinRoom();
    socket.on("connect", joinRoom);
    socket.on("disconnect", () => setConnected(false));

    function handleTaskCreated(task) {
      // Skip if we already added this task ourselves (optimistic update).
      setTasks((prev) => (prev.some((t) => t.id === task.id) ? prev : [task, ...prev]));
    }
    function handleTaskUpdated(task) {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
    }
    function handleTaskDeleted({ id }) {
      setTasks((prev) => prev.filter((t) => t.id !== id));
    }

    socket.on("task_created", handleTaskCreated);
    socket.on("task_updated", handleTaskUpdated);
    socket.on("task_deleted", handleTaskDeleted);

    return () => {
      socket.emit("leave_project", project.id);
      socket.off("connect", joinRoom);
      socket.off("disconnect");
      socket.off("task_created", handleTaskCreated);
      socket.off("task_updated", handleTaskUpdated);
      socket.off("task_deleted", handleTaskDeleted);
      socket.disconnect();
    };
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
        <div>
          <h1>{project.name}</h1>
          <span className={`live-indicator ${connected ? "live-on" : "live-off"}`}>
            {connected ? "● Live" : "○ Connecting..."}
          </span>
        </div>
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
                    <div className="task-actions">
                      <button
                        className="btn-icon"
                        onClick={() => setOpenTask(task)}
                        title="Comments"
                      >
                        💬
                      </button>
                      <button
                        className="btn-icon"
                        onClick={() => handleDelete(task.id)}
                        title="Delete task"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {openTask && (
        <TaskModal token={token} task={openTask} onClose={() => setOpenTask(null)} />
      )}
    </div>
  );
}
