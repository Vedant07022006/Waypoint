import { ReviewStage } from "../models/stage.model.js";
import { PullRequest } from "../models/pr.model.js";
import { User } from "../models/user.model.js";
import { emitToPR, emitToRepo } from "../config/socket.js";
import logger from "../config/logger.js";
import { triggerMLAssignment } from "./ml.service.js";

// ── Stage dependency map ──────────────────────────────────────────────────────
// Defines which stage types must COMPLETE before another stage can start.
// SECURITY_SIGNOFF is a terminal blocking stage — always runs last when present.
export const STAGE_DEPENDENCIES = {
    GENERAL_REVIEW:   [],
    INFRA_REVIEW:     [],
    AUTH_REVIEW:      [],
    DB_REVIEW:        [],
    SECURITY_SIGNOFF: ["AUTH_REVIEW", "DB_REVIEW"],
};

// ── createStagesForPR ─────────────────────────────────────────────────────────
// Creates ReviewStage documents for each detected stage type.
// Stages with unfulfilled dependencies start as BLOCKED; others start as PENDING.
export const createStagesForPR = async (prId, repoId, stageTypes) => {
    const stageDocs = stageTypes.map((stageType) => {
        const allDeps = STAGE_DEPENDENCIES[stageType] || [];
        // Only set dependsOn for deps that are actually part of this PR's stage set
        const activeDeps = allDeps.filter((dep) => stageTypes.includes(dep));
        const status = activeDeps.length > 0 ? "BLOCKED" : "PENDING";

        return {
            prId,
            repoId,
            stageType,
            status,
            dependsOn: activeDeps,
        };
    });

    const stages = await ReviewStage.insertMany(stageDocs);
    logger.info("Stages created for PR", {
        prId,
        stageTypes,
        blockedCount: stageDocs.filter((s) => s.status === "BLOCKED").length,
    });

    // Trigger ML auto-assignment for all PENDING stages (fire-and-forget)
    const pendingStages = stages.filter((s) => s.status === "PENDING");
    for (const stage of pendingStages) {
        triggerMLAssignment(stage).catch(() => {}); // never throw
    }

    return stages;
};

// ── advanceDAG ────────────────────────────────────────────────────────────────
// Called whenever a stage changes status.
// Unblocks dependent stages whose dependencies are now all COMPLETED.
// Checks if all stages are COMPLETED and transitions PR to APPROVED.
export const advanceDAG = async (prId) => {
    const allStages = await ReviewStage.find({ prId });

    if (allStages.length === 0) return { prApproved: false };

    // Collect all currently COMPLETED stage types
    const completedTypes = new Set(
        allStages.filter((s) => s.status === "COMPLETED").map((s) => s.stageType)
    );

    // Find BLOCKED stages and check if their dependencies are now all met
    const blockedStages = allStages.filter((s) => s.status === "BLOCKED");
    const unblockPromises = [];

    for (const stage of blockedStages) {
        const allDepsComplete = stage.dependsOn.every((dep) => completedTypes.has(dep));
        if (allDepsComplete) {
            unblockPromises.push(
                ReviewStage.findByIdAndUpdate(stage._id, { status: "PENDING" }, { new: true })
            );
            logger.info("Stage unblocked by DAG", {
                prId,
                stageType: stage.stageType,
                deps: stage.dependsOn,
            });
        }
    }

    const unblocked = await Promise.all(unblockPromises);

    // ── Check if all stages are COMPLETED ─────────────────────────────────────
    const allComplete = allStages.every((s) => s.status === "COMPLETED");

    if (allComplete) {
        // All stages done — transition PR to APPROVED
        const pr = await PullRequest.findByIdAndUpdate(
            prId,
            { status: "APPROVED" },
            { new: true }
        );

        logger.info("PR APPROVED — all stages completed", { prId });

        // Emit real-time event to both PR room and repo room
        emitToPR(prId.toString(), "pr_approved", { prId });
        if (pr) {
            emitToRepo(pr.repoId.toString(), "pr_status_changed", {
                prId,
                status: "APPROVED",
            });
        }

        return { prApproved: true, unblocked };
    }

    // Emit event for newly unblocked stages
    if (unblocked.length > 0) {
        emitToPR(prId.toString(), "stages_unblocked", {
            prId,
            stages: unblocked.map((s) => ({ _id: s._id, stageType: s.stageType })),
        });
    }

    return { prApproved: false, unblocked };
};
