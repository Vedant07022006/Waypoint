import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import {
    createBranch,
    getBranches,
    getBranchById,
} from "../services/branch.service.js";

// POST /api/v1/repos/:repoId/branches
export const createBranchController = asyncHandler(async (req, res) => {
    const { repoId } = req.params;
    const { name, sourceBranch } = req.body;
    const userId = req.user._id;

    const branch = await createBranch({ name, repoId, sourceBranchName: sourceBranch, userId });

    return res
        .status(201)
        .json(new ApiResponse(201, branch, "Branch created successfully"));
});

// GET /api/v1/repos/:repoId/branches
export const getBranchesController = asyncHandler(async (req, res) => {
    const { repoId } = req.params;

    const branches = await getBranches(repoId);

    return res
        .status(200)
        .json(new ApiResponse(200, branches, "Branches fetched successfully"));
});

// GET /api/v1/repos/:repoId/branches/:branchId
export const getBranchByIdController = asyncHandler(async (req, res) => {
    const { repoId, branchId } = req.params;

    const branch = await getBranchById({ branchId, repoId });

    return res
        .status(200)
        .json(new ApiResponse(200, branch, "Branch fetched successfully"));
});
