import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import {
    createPR,
    getPRs,
    getPRById,
    closePR,
    overrideStageTypes,
    mergePR,
} from "../services/pr.service.js";

// POST /api/v1/repos/:repoId/pullrequests
export const createPRController = asyncHandler(async (req, res) => {
    const { repoId } = req.params;
    const { fromBranchId, toBranchId, title, description } = req.body;
    const authorId = req.user._id;

    const pr = await createPR({ repoId, fromBranchId, toBranchId, title, description, authorId });

    return res
        .status(201)
        .json(new ApiResponse(201, pr, "Pull Request created — pre-check running"));
});

// GET /api/v1/repos/:repoId/pullrequests
export const getPRsController = asyncHandler(async (req, res) => {
    const { repoId } = req.params;
    const { status } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const result = await getPRs({ repoId, status, page, limit });

    return res
        .status(200)
        .json(new ApiResponse(200, result.prs, "Pull Requests fetched successfully", result.pagination));
});

// GET /api/v1/pullrequests/:prId
export const getPRByIdController = asyncHandler(async (req, res) => {
    const { prId } = req.params;

    const pr = await getPRById(prId);

    return res
        .status(200)
        .json(new ApiResponse(200, pr, "Pull Request fetched successfully"));
});

// POST /api/v1/pullrequests/:prId/close
export const closePRController = asyncHandler(async (req, res) => {
    const { prId } = req.params;
    const requestingUserId = req.user._id;

    const result = await closePR({ prId, requestingUserId });

    return res
        .status(200)
        .json(new ApiResponse(200, result, "Pull Request closed successfully"));
});

// PATCH /api/v1/pullrequests/:prId/stages
export const overrideStagesController = asyncHandler(async (req, res) => {
    const { prId } = req.params;
    const { stageTypes } = req.body;
    const requestingUserId = req.user._id;

    const pr = await overrideStageTypes({ prId, stageTypes, requestingUserId });

    return res
        .status(200)
        .json(new ApiResponse(200, pr, "Stage types updated successfully"));
});

// POST /api/v1/pullrequests/:prId/merge
export const mergePRController = asyncHandler(async (req, res) => {
    const { prId } = req.params;
    const requestingUserId = req.user._id;

    const pr = await mergePR({ prId, requestingUserId });

    return res
        .status(200)
        .json(new ApiResponse(200, pr, "Pull Request merged successfully"));
});
