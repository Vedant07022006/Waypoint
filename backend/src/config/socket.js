import { Server } from "socket.io";
import logger from "./logger.js";

let io = null;

/**
 * initSocket(httpServer)
 * Call this ONCE at startup with the http.Server instance.
 * Returns the Socket.io server.
 */
export const initSocket = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: [
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                process.env.FRONTEND_URL,
            ].filter(Boolean),
            credentials: true,
            methods: ["GET", "POST"],
        },
    });

    io.on("connection", (socket) => {
        logger.info(`Socket connected: ${socket.id}`);

        // ── Room: join a repo room to receive PR/stage updates ────────────────
        // Frontend calls: socket.emit('join_repo', { repoId })
        socket.on("join_repo", ({ repoId }) => {
            if (!repoId) return;
            socket.join(`repo_${repoId}`);
            logger.info(`Socket ${socket.id} joined repo_${repoId}`);
        });

        // ── Room: join a PR room for targeted PR-level events ─────────────────
        socket.on("join_pr", ({ prId }) => {
            if (!prId) return;
            socket.join(`pr_${prId}`);
            logger.info(`Socket ${socket.id} joined pr_${prId}`);
        });

        socket.on("leave_repo", ({ repoId }) => {
            socket.leave(`repo_${repoId}`);
        });

        socket.on("disconnect", () => {
            logger.info(`Socket disconnected: ${socket.id}`);
        });
    });

    logger.info("Socket.io server initialized");
    return io;
};

/**
 * getIO()
 * Returns the Socket.io instance from anywhere in the codebase.
 * Fails silently (returns null) if not yet initialized — avoids crashes during startup.
 */
export const getIO = () => io;

/**
 * emitToRepo(repoId, event, data)
 * Convenience helper — emit an event to all clients in a repo room.
 */
export const emitToRepo = (repoId, event, data) => {
    if (!io) return;
    io.to(`repo_${repoId}`).emit(event, data);
};

/**
 * emitToPR(prId, event, data)
 * Convenience helper — emit an event to all clients watching a specific PR.
 */
export const emitToPR = (prId, event, data) => {
    if (!io) return;
    io.to(`pr_${prId}`).emit(event, data);
};
