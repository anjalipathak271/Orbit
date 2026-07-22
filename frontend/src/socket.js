import { io } from "socket.io-client";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

// autoConnect: false -- we connect manually inside the Board component,
// so the socket only opens while someone is actually looking at a board.
export const socket = io(API_URL, { autoConnect: false });
