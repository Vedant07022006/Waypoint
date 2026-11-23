import axios from "axios";
import { PullRequest } from "../models/pr.model.js";
import { CodeCheckResult } from "../models/precheck.model.js";
import { createStagesForPR } from "./dag.service.js";
import { emitToPR, emitToRepo } from "../config/socket.js";
import logger from "../config/logger.js";

// ── triggerPreCheck ───────────────────────────────────────────────────────────
// Fire-and-forget POST to the Python pre-check service (Layer 3).
// Does NOT block — PR creation response returns immediately.
export const triggerPreCheck = async (prId, diffText) => {
    const serviceUrl = process.env.PRECHECK_SERVICE_URL;

    if (!serviceUrl) {
        logger.warn("PRECHECK_SERVICE_URL not set — skipping pre-check trigger", { prId });
        return;
    }

    try {
        await axios.post(
            `${serviceUrl}/api/run`,
            {
                pr_id: prId.toString(),
                diff_text: diffText,
                callback_url: `${process.env.NODE_BACKEND_CALLBACK_URL || "http://localhost:8000"}/api/v1/precheck/result`,
            },
            { timeout: 10000 }
        );
        logger.info("Pre-check triggered successfully", { prId });
    } catch (err) {
        logger.warn("Pre-check service unavailable — PR remains in PRECHECK_RUNNING", {
            prId,
            error: err.message,
        });
    }
};

// ── handlePrecheckResult ──────────────────────────────────────────────────────
// Callback from the Python service — updates CodeCheckResult and PR status.
// If pre-check passed → transitions to REVIEW_PENDING and auto-creates stages.
export const handlePrecheckResult = async ({ prId, status, issues = [], summary = "" }) => {
    // 1. Upsert code check result (replace on re-check)
    await CodeCheckResult.findOneAndUpdate(
        { prId },
        { prId, status, issues, summary, checkedAt: new Date() },
        { upsert: true, new: true }
    );

    // 2. Determine PR transition
    const hasBlockingIssues =
        status === "ISSUES_FOUND" &&
        issues.some((i) => i.severity === "BLOCKING");

    const newPRStatus = hasBlockingIssues ? "PRECHECK_FAILED" : "REVIEW_PENDING";

    const pr = await PullRequest.findByIdAndUpdate(
        prId,
        { status: newPRStatus },
        { new: true }
    );

    logger.info("Pre-check result processed", {
        prId,
        checkStatus: status,
        prStatus: newPRStatus,
        issueCount: issues.length,
    });

    // 3. Emit real-time events
    emitToPR(prId.toString(), "precheck_result", {
        prId,
        checkStatus: status,
        prStatus: newPRStatus,
        issues,
        summary,
    });

    if (pr) {
        emitToRepo(pr.repoId.toString(), "pr_status_changed", {
            prId,
            status: newPRStatus,
        });
    }

    // 4. If pre-check passed → auto-create review stages
    if (newPRStatus === "REVIEW_PENDING" && pr) {
        try {
            const stages = await createStagesForPR(prId, pr.repoId, pr.stageTypes);

            // Notify clients that stages are ready
            emitToPR(prId.toString(), "stages_created", {
                prId,
                stages: stages.map((s) => ({
                    _id: s._id,
                    stageType: s.stageType,
                    status: s.status,
                    dependsOn: s.dependsOn,
                })),
            });

            logger.info("Stages auto-created after precheck pass", {
                prId,
                stageCount: stages.length,
            });
        } catch (err) {
            logger.error("Stage creation failed after precheck", {
                prId,
                error: err.message,
            });
        }
    }

    return { prId, checkStatus: status, prStatus: newPRStatus };
};

// ── getPrecheckResult ─────────────────────────────────────────────────────────
export const getPrecheckResult = async (prId) => {
    return await CodeCheckResult.findOne({ prId }).lean();
};
