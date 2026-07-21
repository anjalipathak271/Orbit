const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

// Small wrapper around fetch: adds the base URL, JSON headers, and the
// auth token (if we have one). Throws a readable error message on failure
// so components can just try/catch and show it.
async function request(path, { method = "GET", body, token } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }

  return data;
}

export const api = {
  register: (name, email, password) =>
    request("/api/auth/register", { method: "POST", body: { name, email, password } }),

  login: (email, password) =>
    request("/api/auth/login", { method: "POST", body: { email, password } }),

  listWorkspaces: (token) => request("/api/workspaces", { token }),

  createWorkspace: (token, name) =>
    request("/api/workspaces", { method: "POST", body: { name }, token }),

  listProjects: (token, workspaceId) =>
    request(`/api/workspaces/${workspaceId}/projects`, { token }),

  createProject: (token, workspaceId, name) =>
    request(`/api/workspaces/${workspaceId}/projects`, {
      method: "POST",
      body: { name },
      token,
    }),

  listTasks: (token, projectId) => request(`/api/projects/${projectId}/tasks`, { token }),

  createTask: (token, projectId, title) =>
    request(`/api/projects/${projectId}/tasks`, {
      method: "POST",
      body: { title },
      token,
    }),

  updateTask: (token, projectId, taskId, updates) =>
    request(`/api/projects/${projectId}/tasks/${taskId}`, {
      method: "PATCH",
      body: updates,
      token,
    }),

  deleteTask: (token, projectId, taskId) =>
    request(`/api/projects/${projectId}/tasks/${taskId}`, { method: "DELETE", token }),
};
