import { Router } from "express";
import verifyJWT from "../middlewares/auth.middleware.js";
import validate from "../middlewares/validate.middleware.js";
import {
    validateCreatePR,
    validateGetPRs,
    validatePRId,
    validateOverrideStages,
} from "../validators/pr.validator.js";
import {
    createPRController,
    getPRsController,
    getPRByIdController,
    closePRController,
    overrideStagesController,
    mergePRController,
} from "../controllers/pr.controller.js";
import { Repo } from "../models/repo.model.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";

// ── Two routers — one repo-scoped, one PR-scoped ─────────────────────────────
const repoScopedRouter  = Router({ mergeParams: true }); // mounted at /repos/:repoId/pullrequests
const prScopedRouter    = Router();                       // mounted at /pullrequests

repoScopedRouter.use(verifyJWT);
prScopedRouter.use(verifyJWT);

// ── Shared repo membership guard ──────────────────────────────────────────────
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

// ── Repo-scoped PR routes (/api/v1/repos/:repoId/pullrequests) ────────────────
// List PRs for a repo
repoScopedRouter.get("/",  validateGetPRs, validate, repoMemberGuard, getPRsController);

// Open a new PR
repoScopedRouter.post("/", validateCreatePR, validate, repoMemberGuard, createPRController);

// ── PR-scoped routes (/api/v1/pullrequests/:prId) ─────────────────────────────
// Get full PR details (diff, precheck result, stage types)
prScopedRouter.get("/:prId", validatePRId, validate, getPRByIdController);

// Close PR without merging
prScopedRouter.post("/:prId/close", validatePRId, validate, closePRController);

// Override detected stage types (StageOverride UI component)
prScopedRouter.patch("/:prId/stages", validateOverrideStages, validate, overrideStagesController);

// Merge an approved PR into the target branch
prScopedRouter.post("/:prId/merge", validatePRId, validate, mergePRController);

export { repoScopedRouter, prScopedRouter };
