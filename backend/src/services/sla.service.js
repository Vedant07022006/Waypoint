import { ReviewStage } from "../models/stage.model.js";
import { PullRequest } from "../models/pr.model.js";
import { User } from "../models/user.model.js";
import { SLAConfig, DEFAULT_SLA_HOURS, MAX_AUTO_REASSIGNMENTS } from "../models/slaConfig.model.js";
import { triggerMLAssignment } from "./ml.service.js";
import { emitToPR, emitToRepo } from "../config/socket.js";
import ApiError from "../utils/ApiError.js";
import logger from "../config/logger.js";

// ── getSLAHours ───────────────────────────────────────────────────────────────
// Returns hours allowed for a given stageType in a given repo.
// Falls back to DEFAULT_SLA_HOURS if no custom config exists.
export const getSLAHours = async (repoId, stageType) => {
    const config = await SLAConfig.findOne({ repoId }).lean();
    if (config) {
        const custom = config.stageSLAs.find((s) => s.stageType === stageType);
        if (custom) return custom.hoursAllowed;
    }
    return DEFAULT_SLA_HOURS[stageType] ?? 48;
};

// ── setSLADeadline ────────────────────────────────────────────────────────────
// Called when a stage transitions to IN_PROGRESS (reviewer assigned).
// Testing mode: set to 2 minutes for manual testing.
export const setSLADeadline = async (stageId, stageType, repoId) => {
    // 2 minutes for testing SLA breach & auto-reassignment
    const TEST_SLA_MINUTES = 2;
    const deadline = new Date(Date.now() + TEST_SLA_MINUTES * 60 * 1000);

    await ReviewStage.findByIdAndUpdate(stageId, {
        slaDeadline: deadline,
        slaBreached: false, // reset on reassignment
    });
    logger.info("SLA deadline set (test mode: 2 min)", { stageId, stageType, deadline });
    return deadline;
};

// ── getRepoSLAConfig ──────────────────────────────────────────────────────────
export const getRepoSLAConfig = async (repoId) => {
    const config = await SLAConfig.findOne({ repoId }).lean();
    // Return config (or defaults if not set)
    return {
        repoId,
        stageSLAs: config?.stageSLAs ?? [],
        defaults: DEFAULT_SLA_HOURS,
        effectiveSLAs: Object.fromEntries(
            Object.entries(DEFAULT_SLA_HOURS).map(([type, hours]) => {
                const custom = config?.stageSLAs?.find((s) => s.stageType === type);
                return [type, custom ? custom.hoursAllowed : hours];
            })
        ),
    };
};

// ── upsertRepoSLAConfig ───────────────────────────────────────────────────────
export const upsertRepoSLAConfig = async (repoId, stageSLAs) => {
    const config = await SLAConfig.findOneAndUpdate(
        { repoId },
        { repoId, stageSLAs },
        { upsert: true, new: true, runValidators: true }
    );
    logger.info("SLA config updated", { repoId, stageSLAs });
    return config;
};

// ── checkExpiredStages ────────────────────────────────────────────────────────
// Called by the cron job every 15 minutes.
// Finds all IN_PROGRESS stages whose slaDeadline has passed and haven't been
// marked as breached yet. For each one, triggers handleSLABreach().
export const checkExpiredStages = async () => {
    const now = new Date();

    const breachedStages = await ReviewStage.find({
        status: "IN_PROGRESS",
        slaDeadline: { $lt: now, $ne: null },
        slaBreached: { $ne: true },
    });

    if (breachedStages.length === 0) return 0;

    logger.warn(`SLA check: ${breachedStages.length} breached stage(s) found`);

    for (const stage of breachedStages) {
        try {
            await handleSLABreach(stage);
        } catch (err) {
            // Never let one failure stop the loop
            logger.error("handleSLABreach failed", {
                stageId: stage._id,
                error:   err.message,
            });
        }
    }

    return breachedStages.length;
};

// ── handleSLABreach ───────────────────────────────────────────────────────────
// Core escalation logic for a single breached stage:
//   escalationCount < MAX  → decrement reviewer workload, reset to PENDING, re-run ML
//   escalationCount >= MAX → hard escalation: emit event for team lead intervention
const handleSLABreach = async (stage) => {
    // 1. Mark breached and increment escalation counter atomically
    const updated = await ReviewStage.findByIdAndUpdate(
        stage._id,
        {
            slaBreached: true,
            $inc: { escalationCount: 1 },
        },
        { new: true }
    );

    const count = updated.escalationCount;

    logger.warn("SLA breach handled", {
        stageId:         stage._id,
        stageType:       stage.stageType,
        escalationCount: count,
    });

    // 2. Decrement workload for the reviewers who missed the deadline
    if (stage.assignedReviewers?.length > 0) {
        await User.updateMany(
            { _id: { $in: stage.assignedReviewers } },
            { $inc: { currentOpenReviews: -1 } }
        ).catch(() => {});
    }

    // 3. Emit breach event to the PR room (UI shows SLA badge)
    emitToPR(stage.prId.toString(), "sla_breached", {
        stageId:         stage._id,
        stageType:       stage.stageType,
        escalationCount: count,
    });

    if (count < MAX_AUTO_REASSIGNMENTS) {
        // ── Auto-reassign via ML ──────────────────────────────────────────────
        await ReviewStage.findByIdAndUpdate(stage._id, {
            status:            "PENDING",
            assignedReviewers: [],
            slaBreached:       false, // cleared so next tick doesn't re-trigger
        });

        // triggerMLAssignment expects a stage-like object with status=PENDING
        const stageForML = {
            _id:       stage._id,
            prId:      stage.prId,
            repoId:    stage.repoId,
            stageType: stage.stageType,
            status:    "PENDING",
        };
        await triggerMLAssignment(stageForML).catch(() => {});

        logger.info("Stage auto-reassigned after SLA breach", {
            stageId:         stage._id,
            escalationCount: count,
        });

        emitToPR(stage.prId.toString(), "stage_reassigned", {
            stageId:         stage._id,
            stageType:       stage.stageType,
            escalationCount: count,
            reason:          "SLA_BREACH",
        });
    } else {
        // ── Hard escalation — requires team lead manual intervention ──────────
        const pr = await PullRequest.findById(stage.prId)
            .populate("repoId", "teamLeadId ownerId name")
            .lean();

        const escalationTargetId =
            pr?.repoId?.teamLeadId?.toString() ||
            pr?.repoId?.ownerId?.toString() ||
            null;

        const escalationPayload = {
            stageId:            stage._id,
            stageType:          stage.stageType,
            prId:               stage.prId,
            repoName:           pr?.repoId?.name ?? "Unknown repo",
            escalationCount:    count,
            escalationTargetId,
            message: `Stage "${stage.stageType}" has been auto-reassigned ${count} time(s) ` +
                     `and still has not been reviewed. Manual assignment required.`,
        };

        // Notify the whole repo room — team lead sees it in EscalationPanel
        emitToRepo(stage.repoId.toString(), "sla_escalated", escalationPayload);

        logger.warn("Hard escalation triggered — team lead intervention required", {
            stageId:         stage._id,
            stageType:       stage.stageType,
            escalationCount: count,
            escalationTargetId,
        });
    }
};
