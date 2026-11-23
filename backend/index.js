import dotenv from "dotenv";
dotenv.config();

import http from "http";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import connectDB from "./src/config/db.js";
import logger from "./src/config/logger.js";
import { initSocket } from "./src/config/socket.js";

// ── Route imports ─────────────────────────────────────────────────────────────
import userRoutes    from "./src/routes/user.routes.js";
import repoRoutes    from "./src/routes/repo.routes.js";
import branchRoutes  from "./src/routes/branch.routes.js";
import commitRoutes  from "./src/routes/commit.routes.js";
import { repoScopedRouter as prRepoRouter, prScopedRouter } from "./src/routes/pr.routes.js";
import precheckRoutes from "./src/routes/precheck.routes.js";
import stageRoutes   from "./src/routes/stage.routes.js";
import slaRoutes     from "./src/routes/sla.routes.js";
import dashboardRoutes from "./src/routes/dashboard.routes.js";
import { startSLAScheduler } from "./src/config/slaScheduler.js";
import { apiLimiter, authLimiter } from "./src/middlewares/rateLimiter.middleware.js";

// ── App setup ─────────────────────────────────────────────────────────────────
const app  = express();
const port = process.env.PORT || 5000;

// HTTP server — required for Socket.io to attach to the same port
const server = http.createServer(app);

// Attach Socket.io BEFORE routes so emitToPR/emitToRepo work during requests
initSocket(server);

// Connect to DB, then start the SLA cron scheduler
connectDB().then(() => {
    startSLAScheduler();
}).catch(() => {
    // DB connection errors are logged inside connectDB; scheduler won't start
});

// ── Middlewares ───────────────────────────────────────────────────────────────
const allowedOrigins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) {
                return callback(null, true);
            }
            return callback(new Error(`CORS blocked for origin: ${origin}`));
        },
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
    })
);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use("/api", apiLimiter);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/v1/users",                                         authLimiter, userRoutes);
app.use("/api/v1/repos",                                         repoRoutes);
app.use("/api/v1/repos/:repoId/branches",                        branchRoutes);
app.use("/api/v1/repos/:repoId/branches/:branchId/commits",      commitRoutes);
app.use("/api/v1/repos/:repoId/pullrequests",                    prRepoRouter);
app.use("/api/v1/pullrequests",                                  prScopedRouter);
app.use("/api/v1/precheck",                                      precheckRoutes);
app.use("/api/v1/stages",                                        stageRoutes);
app.use("/api/v1/repos/:repoId/sla",                             slaRoutes);
app.use("/api/v1/dashboard",                                     dashboardRoutes);

app.get("/", (req, res) => {
    res.send("Waypoint Backend is Running ✅");
});

// ── Global Error Handler (must be BEFORE server.listen) ───────────────────────
app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message    = err.message    || "Internal Server Error";

    logger.error(message, {
        statusCode,
        errors: err.errors || [],
        stack: err.stack,
    });

    return res.status(statusCode).json({
        statusCode,
        success: false,
        message,
        errors: err.errors || [],
    });
});

// ── Start server via http.Server (not app.listen) ─────────────────────────────
server.listen(port, () => {
    logger.info(`Server running at http://localhost:${port}`);
});
