import { Branch } from "../models/branch.model.js";
import { Repo } from "../models/repo.model.js";
import ApiError from "../utils/ApiError.js";
import logger from "../config/logger.js";

// ── createBranch ─────────────────────────────────────────────────────────────
// Creates a feature/* branch by inheriting the file snapshot from sourceBranch.
// Only feature/* names are allowed — main and develop are protected.
export const createBranch = async ({ name, repoId, sourceBranchName = "develop", userId }) => {
    // 1. Confirm repo exists and user is a member (caller ensures this via repoMemberGuard,
    //    but we still need the repo to verify membership for extra safety)
    const repo = await Repo.findById(repoId);
    if (!repo) throw new ApiError(404, "Repository not found");

    // 2. Enforce feature/* naming — protected branch names are blocked
    if (!name.startsWith("feature/")) {
        throw new ApiError(400, 'Branch name must start with "feature/"');
    }

    // 3. Find the source branch (defaults to develop)
    const sourceBranch = await Branch.findOne({ name: sourceBranchName, repoId });
    if (!sourceBranch) {
        throw new ApiError(404, `Source branch "${sourceBranchName}" not found in this repository`);
    }

    // 4. Create the new branch — inherits current file snapshot from source
    let branch;
    try {
        branch = await Branch.create({
            name,
            repoId,
            createdBy: userId,
            sourceBranch: sourceBranchName,
            files: sourceBranch.files, // inherit current state
            isProtected: false,
        });
    } catch (err) {
        if (err.code === 11000) {
            throw new ApiError(409, `Branch "${name}" already exists in this repository`);
        }
        throw err;
    }

    logger.info("Branch created", { branchId: branch._id, name, repoId, sourceBranch: sourceBranchName });

    return branch;
};

// ── getBranches ───────────────────────────────────────────────────────────────
// Returns all branches for a repo including their files snapshot.
export const getBranches = async (repoId) => {
    const branches = await Branch.find({ repoId })
        .populate("createdBy", "fullName username")
        .sort({ createdAt: -1 })
        .lean();

    return branches;
};

// ── getBranchById ─────────────────────────────────────────────────────────────
// Returns full branch details including the complete files array.
// Used by the Monaco editor to load existing files.
export const getBranchById = async ({ branchId, repoId }) => {
    const branch = await Branch.findOne({ _id: branchId, repoId })
        .populate("createdBy", "fullName username")
        .lean();

    if (!branch) throw new ApiError(404, "Branch not found");

    return branch;
};
