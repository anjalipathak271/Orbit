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
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [smartSort, setSmartSort] = useState(false);
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [openTask, setOpenTask] = useState(null);
  const [connected, setConnected] = useState(false);

  // Reload whenever the project changes, or the status filter / smart-sort
  // toggle changes. Search is triggered separately on form submit (see
  // handleSearchSubmit) rather than on every keystroke.
  useEffect(() => {
    load();
  }, [project.id, statusFilter, smartSort]);

  async function load(searchOverride) {
    setStatus("loading");
    try {
      const data = await api.listTasks(token, project.id, {
        status: statusFilter,
        sort: smartSort ? "smart" : "",
        search: searchOverride !== undefined ? searchOverride : searchInput,
      });
      setTasks(data);
      setStatus("ok");
    } catch (err) {
      setStatus("error");
    }
  }

  function handleSearchSubmit(e) {
    e.preventDefault();
    load();
  }

  function clearSearch() {
    setSearchInput("");
    load("");
  }

  // Real-time: connect the socket, join this project's "room", and listen
  // for events other people's actions trigger on the server. We leave the
  // room and disconnect when navigating away or switching projects.
  useEffect(() => {
    socket.connect();

    function joinRoom() {
      socket.emit("join_project", project.id);
      setConnected(true);
    }
    if (socket.connected) joinRoom();
    socket.on("connect", joinRoom);
    socket.on("disconnect", () => setConnected(false));

    function handleTaskCreated(task) {
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
      </div>

      <div className="toolbar">
        <form onSubmit={handleSearchSubmit} className="search-form">
          <input
            className="search-input"
            placeholder="Search tasks (ranked by relevance)..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <button type="submit" className="btn-ghost">Search</button>
          {searchInput && (
            <button type="button" className="btn-ghost" onClick={clearSearch}>Clear</button>
          )}
        </form>

        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="todo">To Do</option>
          <option value="in_progress">In Progress</option>
          <option value="done">Done</option>
        </select>

        <label className="smart-sort-toggle">
          <input
            type="checkbox"
            checked={smartSort}
            onChange={(e) => setSmartSort(e.target.checked)}
          />
          Smart priority sort
        </label>
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
          const colTasks = tasks.filter((t) => t.status === col.key);
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
