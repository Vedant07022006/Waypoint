import axios from "axios";
import { ReviewStage } from "../models/stage.model.js";
import { PullRequest } from "../models/pr.model.js";
import { Repo } from "../models/repo.model.js";
import { User } from "../models/user.model.js";
import { emitToPR } from "../config/socket.js";
import { setSLADeadline } from "./sla.service.js";
import logger from "../config/logger.js";

/**
 * triggerMLAssignment(stage)
 *
 * Fire-and-forget: calls the Python ML service to rank reviewers for a stage,
 * then assigns the top-ranked reviewers directly via the stage model.
 * If no eligible peer reviewer is available, automatically falls back to Team Lead.
 */
export const triggerMLAssignment = async (stage) => {
    const serviceUrl = process.env.ML_SERVICE_URL;

    if (!serviceUrl) {
        logger.warn("ML_SERVICE_URL not set — skipping auto-assignment", {
            stageId: stage._id,
        });
        return;
    }

    if (stage.status !== "PENDING") return; // Only assign PENDING stages

    try {
        // 1. Call ML service to get ranked reviewer IDs
        const response = await axios.post(
            `${serviceUrl}/api/rank`,
            {
                stage_id:   stage._id.toString(),
                stage_type: stage.stageType,
                pr_id:      stage.prId.toString(),
                repo_id:    stage.repoId.toString(),
            },
            { timeout: 15000 }
        );

        let { reviewer_ids: reviewerIds, scores } = response.data.data;

        // Fallback: if ML returns no peer reviewers, fall back to repo Team Lead
        if (!reviewerIds || reviewerIds.length === 0) {
            const repo = await Repo.findById(stage.repoId);
            const pr = await PullRequest.findById(stage.prId);
            const leadId = repo?.teamLeadId || repo?.ownerId;
            if (leadId && leadId.toString() !== pr?.authorId?.toString()) {
                reviewerIds = [leadId];
                scores = { [leadId.toString()]: 1.0 };
                logger.info("Assigned Team Lead as fallback reviewer", {
                    stageId: stage._id,
                    leadId,
                });
            } else {
                logger.warn("ML service returned no reviewers and Team Lead is PR author", {
                    stageId: stage._id,
                    stageType: stage.stageType,
                });
                return;
            }
        }

        // 2. Assign reviewers directly (system-level, no auth check)
        const updatedStage = await ReviewStage.findByIdAndUpdate(
            stage._id,
            {
                assignedReviewers: reviewerIds,
                status: "IN_PROGRESS",
                assignmentMetadata: {
                    scores: scores || {},
                    assignedAt: new Date(),
                    mode: "ML_TFIDF",
                },
            },
            { new: true }
        ).populate("assignedReviewers", "fullName username email role");

        if (!updatedStage) return;

        // 3. Set SLA deadline now that the stage is IN_PROGRESS
        await setSLADeadline(stage._id, stage.stageType, stage.repoId).catch(() => {});

        // 4. Increment currentOpenReviews for each assigned reviewer
        await User.updateMany(
            { _id: { $in: reviewerIds } },
            { $inc: { currentOpenReviews: 1 } }
        );

        logger.info("ML auto-assignment complete", {
            stageId:    stage._id,
            stageType:  stage.stageType,
            reviewerIds,
            scores,
        });

        // 5. Emit real-time assignment event
        emitToPR(stage.prId.toString(), "reviewers_assigned", {
            stageId:    stage._id,
            stageType:  stage.stageType,
            reviewers:  updatedStage.assignedReviewers,
            autoAssigned: true,
        });

    } catch (err) {
        logger.warn("ML service error — executing Team Lead fallback", {
            stageId: stage._id,
            error:   err.message,
        });
        try {
            const repo = await Repo.findById(stage.repoId);
            const pr = await PullRequest.findById(stage.prId);
            const leadId = repo?.teamLeadId || repo?.ownerId;
            if (leadId && leadId.toString() !== pr?.authorId?.toString()) {
                const updatedStage = await ReviewStage.findByIdAndUpdate(
                    stage._id,
                    {
                        assignedReviewers: [leadId],
                        status: "IN_PROGRESS",
                        assignmentMetadata: {
                            scores: { [leadId.toString()]: 1.0 },
                            assignedAt: new Date(),
                            mode: "LEAD_FALLBACK",
                        },
                    },
                    { new: true }
                ).populate("assignedReviewers", "fullName username email role");

                await setSLADeadline(stage._id, stage.stageType, stage.repoId).catch(() => {});
                await User.findByIdAndUpdate(leadId, { $inc: { currentOpenReviews: 1 } });

                emitToPR(stage.prId.toString(), "reviewers_assigned", {
                    stageId:    stage._id,
                    stageType:  stage.stageType,
                    reviewers:  updatedStage.assignedReviewers,
                    autoAssigned: true,
                });
            }
        } catch (fallbackErr) {
            logger.error("Team Lead fallback assignment failed", { error: fallbackErr.message });
        }
    }
};
