import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import {
    getStagesForPR,
    getStageById,
    updateStageStatus,
    assignReviewers,
    demoExpireSLA,
} from "../services/stage.service.js";

// GET /api/v1/pullrequests/:prId/stages
export const getStagesController = asyncHandler(async (req, res) => {
    const { prId } = req.params;
    const stages = await getStagesForPR(prId);
    return res
        .status(200)
        .json(new ApiResponse(200, stages, "Stages fetched successfully"));
});

// GET /api/v1/stages/:stageId
export const getStageByIdController = asyncHandler(async (req, res) => {
    const { stageId } = req.params;
    const stage = await getStageById(stageId);
    return res
        .status(200)
        .json(new ApiResponse(200, stage, "Stage fetched successfully"));
});

// PATCH /api/v1/stages/:stageId/status
export const updateStageStatusController = asyncHandler(async (req, res) => {
    const { stageId } = req.params;
    const { status, reviewComments } = req.body;
    const requestingUserId = req.user._id;

    const stage = await updateStageStatus({ stageId, status, reviewComments, requestingUserId });

    return res
        .status(200)
        .json(new ApiResponse(200, stage, `Stage marked as ${status}`));
});

// PATCH /api/v1/stages/:stageId/assign
// Called by ML service (Phase 7) or team lead manually
export const assignReviewersController = asyncHandler(async (req, res) => {
    const { stageId } = req.params;
    const { reviewerIds } = req.body;
    const requestingUserId = req.user._id;

    const stage = await assignReviewers({ stageId, reviewerIds, requestingUserId });

    return res
        .status(200)
        .json(new ApiResponse(200, stage, "Reviewers assigned successfully"));
});

// POST /api/v1/stages/:stageId/demo-expire-sla (Demo Only)
export const demoExpireSLAController = asyncHandler(async (req, res) => {
    const { stageId } = req.params;
    const result = await demoExpireSLA(stageId);
    return res
        .status(200)
        .json(new ApiResponse(200, result, "Demo SLA expiry triggered and evaluated"));
});
