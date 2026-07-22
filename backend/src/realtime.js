// Route files import emitToProject() to broadcast an event to everyone
// currently viewing a given project's board -- without needing to import
// the whole Express app or create circular imports.
let io = null;

export function setIO(instance) {
  io = instance;
}

export function emitToProject(projectId, event, payload) {
  if (io) {
    io.to(`project:${projectId}`).emit(event, payload);
  }
}
