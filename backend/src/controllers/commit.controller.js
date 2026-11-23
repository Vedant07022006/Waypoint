import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import {
    createCommit,
    getCommits,
    getCommitById,
} from "../services/commit.service.js";

// POST /api/v1/repos/:repoId/branches/:branchId/commits
export const createCommitController = asyncHandler(async (req, res) => {
    const { repoId, branchId } = req.params;
    const { message, files } = req.body;
    const authorId = req.user._id;

    const commit = await createCommit({ branchId, repoId, authorId, message, files });

    return res
        .status(201)
        .json(new ApiResponse(201, commit, "Commit pushed successfully"));
});

// GET /api/v1/repos/:repoId/branches/:branchId/commits
export const getCommitsController = asyncHandler(async (req, res) => {
    const { repoId, branchId } = req.params;
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 20;

    const result = await getCommits({ branchId, repoId, page, limit });

    return res
        .status(200)
        .json(new ApiResponse(200, result.commits, "Commits fetched successfully", result.pagination));
});

// GET /api/v1/repos/:repoId/branches/:branchId/commits/:commitId
export const getCommitByIdController = asyncHandler(async (req, res) => {
    const { branchId, commitId } = req.params;

    const commit = await getCommitById({ commitId, branchId });

    return res
        .status(200)
        .json(new ApiResponse(200, commit, "Commit fetched successfully"));
});
