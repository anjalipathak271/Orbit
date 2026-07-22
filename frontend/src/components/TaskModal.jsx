import { useEffect, useState } from "react";
import { api } from "../api";
import { socket } from "../socket";

export default function TaskModal({ token, task, onClose }) {
  const [comments, setComments] = useState([]);
  const [status, setStatus] = useState("loading");
  const [newComment, setNewComment] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    load();

    // Listen for comments other people add in real time while this
    // modal is open, and append them if they belong to this task.
    function handleNewComment(comment) {
      if (comment.task_id === task.id) {
        setComments((prev) => [...prev, comment]);
      }
    }
    socket.on("comment_created", handleNewComment);
    return () => socket.off("comment_created", handleNewComment);
  }, [task.id]);

  async function load() {
    setStatus("loading");
    try {
      const data = await api.listComments(token, task.id);
      setComments(data);
      setStatus("ok");
    } catch (err) {
      setStatus("error");
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!newComment.trim()) return;
    setSending(true);
    try {
      const comment = await api.createComment(token, task.id, newComment.trim());
      setNewComment("");
      // We already get our own comment back here; the socket broadcast
      // is only for OTHER people viewing the board, so no duplicate.
      setComments((prev) => [...prev, comment]);
    } catch (err) {
      alert(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{task.title}</h2>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        <div className="comments-list">
          {status === "loading" && <p className="hint">Loading comments...</p>}
          {status === "error" && <p className="error-banner">Could not load comments.</p>}
          {status === "ok" && comments.length === 0 && (
            <p className="hint">No comments yet. Start the conversation below.</p>
          )}
          {comments.map((c) => (
            <div key={c.id} className="comment">
              <div className="comment-meta">
                <strong>{c.user_name}</strong>
                <span>{new Date(c.created_at).toLocaleString()}</span>
              </div>
              <div className="comment-body">{c.body}</div>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="comment-form">
          <input
            placeholder="Write a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
          />
          <button type="submit" className="btn-primary" disabled={sending}>
            {sending ? "..." : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
}
