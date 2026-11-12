import { Router } from "express";
import verifyJWT from "../middlewares/auth.middleware.js";
import validate from "../middlewares/validate.middleware.js";
import { validateCreateBranch, validateBranchId } from "../validators/branch.validator.js";
import {
    createBranchController,
    getBranchesController,
    getBranchByIdController,
} from "../controllers/branch.controller.js";
import { Repo } from "../models/repo.model.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";

// mergeParams: true — allows access to :repoId from the parent router (index.js)
const router = Router({ mergeParams: true });

// All branch routes require authentication
router.use(verifyJWT);

// ── Membership guard ─────────────────────────────────────────────────────────
// Re-used from repo routes concept — confirms user is a repo member
const repoMemberGuard = asyncHandler(async (req, res, next) => {
    const { repoId } = req.params;
    const userId = req.user._id;

    const repo = await Repo.findById(repoId).select("ownerId members isArchived");

    if (!repo) throw new ApiError(404, "Repository not found");
    if (repo.isArchived) throw new ApiError(410, "Repository is archived");

    const isMember =
        repo.ownerId.toString() === userId.toString() ||
        repo.members.some((m) => m.toString() === userId.toString());

    if (!isMember) throw new ApiError(403, "You are not a member of this repository");

    req.repo = repo;
    next();
});

// ── Routes ───────────────────────────────────────────────────────────────────

// List all branches for a repo
router.get("/", repoMemberGuard, getBranchesController);

// Create a new feature branch
router.post("/", validateCreateBranch, validate, repoMemberGuard, createBranchController);

// Get a single branch with its full file snapshot (used by Monaco editor)
router.get("/:branchId", validateBranchId, validate, repoMemberGuard, getBranchByIdController);

export default router;
