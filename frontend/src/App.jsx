import { useEffect, useState } from "react";
import Login from "./components/Login";
import WorkspaceList from "./components/WorkspaceList";
import ProjectList from "./components/ProjectList";
import Board from "./components/Board";
import "./styles.css";

export default function App() {
  // Auth state persists across page refreshes via localStorage, so you
  // don't get logged out every time Vite hot-reloads.
  const [token, setToken] = useState(() => localStorage.getItem("orbit_token"));
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("orbit_user");
    return saved ? JSON.parse(saved) : null;
  });

  // Simple "which screen am I on" state instead of a full router --
  // enough for this stage of the project.
  const [workspace, setWorkspace] = useState(null);
  const [project, setProject] = useState(null);

  useEffect(() => {
    if (token) localStorage.setItem("orbit_token", token);
    else localStorage.removeItem("orbit_token");
  }, [token]);

  useEffect(() => {
    if (user) localStorage.setItem("orbit_user", JSON.stringify(user));
    else localStorage.removeItem("orbit_user");
  }, [user]);

  function handleAuthed({ token, user }) {
    setToken(token);
    setUser(user);
  }

  function logout() {
    setToken(null);
    setUser(null);
    setWorkspace(null);
    setProject(null);
  }

  if (!token || !user) {
    return <Login onAuthed={handleAuthed} />;
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">🪐 Orbit</div>
        <nav className="breadcrumbs">
          <button className="crumb" onClick={() => { setWorkspace(null); setProject(null); }}>
            Workspaces
          </button>
          {workspace && (
            <>
              <span className="crumb-sep">/</span>
              <button className="crumb" onClick={() => setProject(null)}>{workspace.name}</button>
            </>
          )}
          {project && (
            <>
              <span className="crumb-sep">/</span>
              <span className="crumb crumb-current">{project.name}</span>
            </>
          )}
        </nav>
        <div className="user-chip">
          <span>{user.name}</span>
          <button className="btn-ghost" onClick={logout}>Log out</button>
        </div>
      </header>

      <main className="content">
        {!workspace && (
          <WorkspaceList token={token} onSelect={setWorkspace} />
        )}
        {workspace && !project && (
          <ProjectList token={token} workspace={workspace} onSelect={setProject} />
        )}
        {workspace && project && (
          <Board token={token} project={project} />
        )}
      </main>
    </div>
  );
}
