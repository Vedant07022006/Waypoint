import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:8000";

let socketInstance = null;

export const getSocket = () => {
  if (!socketInstance) {
    socketInstance = io(SOCKET_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
  }
  return socketInstance;
};

export const joinRepoRoom = (repoId) => {
  const socket = getSocket();
  if (socket && repoId) {
    socket.emit("join_repo", { repoId });
  }
};

export const joinPRRoom = (prId) => {
  const socket = getSocket();
  if (socket && prId) {
    socket.emit("join_pr", { prId });
  }
};

export const leaveRepoRoom = (repoId) => {
  const socket = getSocket();
  if (socket && repoId) {
    socket.emit("leave_repo", { repoId });
  }
};
