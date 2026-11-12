import { Router } from "express";
import verifyJWT from "../middlewares/auth.middleware.js";
import validate from "../middlewares/validate.middleware.js";
import { validateCreateCommit, validateGetCommits } from "../validators/commit.validator.js";
import {
    createCommitController,
    getCommitsController,
    getCommitByIdController,
} from "../controllers/commit.controller.js";
import { Branch } from "../models/branch.model.js";
import { Repo } from "../models/repo.model.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";

// mergeParams: true — inherits :repoId and :branchId from parent routers
const router = Router({ mergeParams: true });

router.use(verifyJWT);

// ── Membership + branch guard ─────────────────────────────────────────────────
// Confirms user is a repo member AND the branch belongs to that repo
const branchAccessGuard = asyncHandler(async (req, res, next) => {
    const { repoId, branchId } = req.params;
    const userId = req.user._id;

    const repo = await Repo.findById(repoId).select("ownerId members isArchived");

    if (!repo) throw new ApiError(404, "Repository not found");
    if (repo.isArchived) throw new ApiError(410, "Repository is archived");

    const isMember =
        repo.ownerId.toString() === userId.toString() ||
        repo.members.some((m) => m.toString() === userId.toString());

    if (!isMember) throw new ApiError(403, "You are not a member of this repository");

    // Verify branch belongs to this repo
    const branch = await Branch.findOne({ _id: branchId, repoId }).select("_id name isProtected");
    if (!branch) throw new ApiError(404, "Branch not found in this repository");

    req.repo   = repo;
    req.branch = branch;
    next();
});

// ── Routes ────────────────────────────────────────────────────────────────────

// Push a commit to a branch (Monaco editor → Commit & Push button)
router.post("/", validateCreateCommit, validate, branchAccessGuard, createCommitController);

// Commit history for a branch (paginated)
router.get("/", validateGetCommits, validate, branchAccessGuard, getCommitsController);

// Single commit with full file snapshot
router.get("/:commitId", branchAccessGuard, getCommitByIdController);

export default router;
