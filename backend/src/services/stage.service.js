import { ReviewStage } from "../models/stage.model.js";
import { PullRequest } from "../models/pr.model.js";
import { User } from "../models/user.model.js";
import ApiError from "../utils/ApiError.js";
import { advanceDAG } from "./dag.service.js";
import { triggerMLAssignment } from "./ml.service.js";
import { emitToPR, emitToRepo } from "../config/socket.js";
import logger from "../config/logger.js";

// ── getStagesForPR ────────────────────────────────────────────────────────────
// Returns all stages for a given PR, populated with reviewer data.
export const getStagesForPR = async (prId) => {
    const stages = await ReviewStage.find({ prId })
        .populate("assignedReviewers", "fullName username email role")
        .sort({ createdAt: 1 })
        .lean();
    return stages;
};

// ── getStageById ──────────────────────────────────────────────────────────────
export const getStageById = async (stageId) => {
    const stage = await ReviewStage.findById(stageId)
        .populate("assignedReviewers", "fullName username email role")
        .lean();
    if (!stage) throw new ApiError(404, "Stage not found");
    return stage;
};

// ── updateStageStatus ─────────────────────────────────────────────────────────
// Called by a reviewer to mark a stage as COMPLETED or REJECTED.
// Triggers the DAG to advance after a COMPLETED update.
export const updateStageStatus = async ({ stageId, status, reviewComments, requestingUserId }) => {
    const stage = await ReviewStage.findById(stageId);
    if (!stage) throw new ApiError(404, "Stage not found");

    // PENDING, IN_PROGRESS, or REJECTED stages can be updated (allows approving after changes made)
    if (!["PENDING", "IN_PROGRESS", "REJECTED"].includes(stage.status)) {
        throw new ApiError(
            400,
            `Cannot update a stage that is already ${stage.status}`
        );
    }

    // Verify the requesting user is an assigned reviewer OR a team lead/owner
    const pr = await PullRequest.findById(stage.prId).populate("repoId", "ownerId teamLeadId");
    const isAuthor = pr?.authorId?.toString() === requestingUserId.toString();
    if (isAuthor) {
        throw new ApiError(403, "PR authors cannot review or approve their own pull request");
    }

    const isAssigned = stage.assignedReviewers.some(
        (r) => r.toString() === requestingUserId.toString()
    );
    const isTeamLead = pr?.repoId?.teamLeadId?.toString() === requestingUserId.toString();
    const isOwner = pr?.repoId?.ownerId?.toString() === requestingUserId.toString();

    if (!isAssigned && !isTeamLead && !isOwner) {
        throw new ApiError(403, "Only an assigned reviewer, team lead, or owner can update stage status");
    }

    const updateData = {
        status,
        reviewComments: reviewComments || "",
    };

    if (status === "COMPLETED") {
        updateData.completedAt = new Date();
    }
    if (status === "REJECTED") {
        updateData.rejectedAt = new Date();
    }

    const updatedStage = await ReviewStage.findByIdAndUpdate(stageId, updateData, { new: true });

    logger.info("Stage status updated", {
        stageId,
        stageType: stage.stageType,
        status,
        prId: stage.prId,
    });

    // Workload decrement: only decrement if stage was actively IN_PROGRESS
    if (stage.status === "IN_PROGRESS" && (status === "COMPLETED" || status === "REJECTED")) {
        await User.updateMany(
            { _id: { $in: stage.assignedReviewers }, currentOpenReviews: { $gt: 0 } },
            { $inc: { currentOpenReviews: -1 } }
        ).catch(() => {});
    }

    // Emit real-time event to the PR room
    emitToPR(stage.prId.toString(), "stage_updated", {
        stageId,
        stageType: stage.stageType,
        status,
    });

    // If COMPLETED — advance the DAG (may unblock dependent stages or approve PR)
    if (status === "COMPLETED") {
        const dagResult = await advanceDAG(stage.prId);
        // Trigger ML for newly unblocked stages
        if (dagResult.unblocked && dagResult.unblocked.length > 0) {
            for (const unblocked of dagResult.unblocked) {
                if (unblocked) triggerMLAssignment(unblocked).catch(() => {});
            }
        }
    }

    // If REJECTED — emit stage_rejected event
    if (status === "REJECTED") {
        emitToRepo(stage.repoId.toString(), "stage_rejected", {
            prId: stage.prId,
            stageType: stage.stageType,
            comments: reviewComments,
        });
    }

    return updatedStage.populate("assignedReviewers", "fullName username email role");
};

// ── assignReviewers ───────────────────────────────────────────────────────────
// Sets assignedReviewers on a stage and transitions it to IN_PROGRESS.
// Called by the ML ranking service (Phase 7) or manually by team lead/owner.
export const assignReviewers = async ({ stageId, reviewerIds, requestingUserId }) => {
    const stage = await ReviewStage.findById(stageId);
    if (!stage) throw new ApiError(404, "Stage not found");

    if (!["PENDING", "IN_PROGRESS", "REJECTED"].includes(stage.status)) {
        throw new ApiError(400, `Cannot assign reviewers to a stage that is ${stage.status}`);
    }

    // Verify all reviewerIds are real users
    const reviewers = await User.find({ _id: { $in: reviewerIds } }).select("_id");
    if (reviewers.length !== reviewerIds.length) {
        throw new ApiError(404, "One or more reviewer IDs not found");
    }

    const oldReviewerIds = (stage.assignedReviewers || []).map((id) => id.toString());
    const newReviewerIds = reviewerIds.map((id) => id.toString());

    // Release workload for removed reviewers if stage was IN_PROGRESS
    const removed = oldReviewerIds.filter((id) => !newReviewerIds.includes(id));
    if (removed.length > 0 && stage.status === "IN_PROGRESS") {
        await User.updateMany(
            { _id: { $in: removed }, currentOpenReviews: { $gt: 0 } },
            { $inc: { currentOpenReviews: -1 } }
        ).catch(() => {});
    }

    // Increment workload for newly added reviewers
    const added = newReviewerIds.filter((id) => !oldReviewerIds.includes(id));
    if (added.length > 0) {
        await User.updateMany(
            { _id: { $in: added } },
            { $inc: { currentOpenReviews: 1 } }
        ).catch(() => {});
    }

    const updatedStage = await ReviewStage.findByIdAndUpdate(
        stageId,
        {
            assignedReviewers: reviewerIds,
            status: "IN_PROGRESS",
        },
        { new: true }
    ).populate("assignedReviewers", "fullName username email role");

    // Ensure SLA deadline is set
    const { setSLADeadline } = await import("./sla.service.js");
    await setSLADeadline(stage._id, stage.stageType, stage.repoId).catch(() => {});

    logger.info("Reviewers assigned to stage", {
        stageId,
        stageType: stage.stageType,
        reviewerIds,
    });

    // Emit real-time assignment event
    emitToPR(stage.prId.toString(), "reviewers_assigned", {
        stageId,
        stageType: stage.stageType,
        reviewers: updatedStage.assignedReviewers,
    });

    return updatedStage;
};

// ── demoExpireSLA ─────────────────────────────────────────────────────────────
// Demo-only helper: fast-forwards SLA deadline to the past and triggers
// the SLA check immediately to demonstrate automatic escalation/reassignment.
export const demoExpireSLA = async (stageId) => {
    const stage = await ReviewStage.findById(stageId);
    if (!stage) throw new ApiError(404, "Stage not found");

    if (stage.status !== "IN_PROGRESS") {
        throw new ApiError(400, "Can only trigger SLA expiry on an IN_PROGRESS stage");
    }

    // Set deadline to 5 minutes ago
    stage.slaDeadline = new Date(Date.now() - 5 * 60 * 1000);
    stage.slaBreached = false; // ensure checkExpiredStages picks it up
    await stage.save();

    logger.info("Demo: Stage SLA deadline fast-forwarded to the past", { stageId });

    // Dynamically import and run checkExpiredStages
    const { checkExpiredStages } = await import("./sla.service.js");
    const count = await checkExpiredStages();

    const updated = await ReviewStage.findById(stageId)
        .populate("assignedReviewers", "fullName username email role")
        .lean();

    return { stage: updated, breachedCount: count };
};
