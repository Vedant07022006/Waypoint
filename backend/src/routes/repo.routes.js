import { Router } from "express";
import verifyJWT from "../middlewares/auth.middleware.js";
import validate from "../middlewares/validate.middleware.js";
import {
    validateCreateRepo,
    validateAddMember,
    validateRemoveMember,
    validateSetTeamLead,
    validateUpdateStageRules,
    validateRepoId,
} from "../validators/repo.validator.js";
import {
    createRepoController,
    getReposController,
    getRepoByIdController,
    getRepoMembersController,
    addMemberController,
    removeMemberController,
    setTeamLeadController,
    updateStageRulesController,
} from "../controllers/repo.controller.js";
import authorize from "../middlewares/authorize.middleware.js";
import { Repo } from "../models/repo.model.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";

const router = Router();

// ── All repo routes require authentication ───────────────────────────────────
router.use(verifyJWT);

// ── Membership guard middleware ──────────────────────────────────────────────
// Verifies the authenticated user is a member (or owner) of the requested repo.
// Must be placed on all routes that include :repoId.
const repoMemberGuard = asyncHandler(async (req, res, next) => {
    const { repoId } = req.params;
    const userId = req.user._id;

    const repo = await Repo.findById(repoId).select("ownerId members isArchived");

    if (!repo) throw new ApiError(404, "Repository not found");
    if (repo.isArchived) throw new ApiError(410, "Repository is archived");

    const isMember =
        repo.ownerId.toString() === userId.toString() ||
        repo.members.some((m) => m.toString() === userId.toString());

    if (!isMember) {
        throw new ApiError(403, "You are not a member of this repository");
    }

    // Attach repo and ownership flag to request for downstream use
    req.repo = repo;
    req.isRepoOwner = repo.ownerId.toString() === userId.toString();

    next();
});

// ── Routes ───────────────────────────────────────────────────────────────────

// Create a new repository (Restricted to Team Leads and Owners)
router.post("/", authorize("team_lead", "owner"), validateCreateRepo, validate, createRepoController);

// List all repos for the authenticated user
router.get("/", getReposController);

// Get a single repo's details (with branches list)
router.get("/:repoId", validateRepoId, validate, repoMemberGuard, getRepoByIdController);

// Get all members of a repository
router.get("/:repoId/members", validateRepoId, validate, repoMemberGuard, getRepoMembersController);

// Add a member to the repo (Team Lead or Owner only)
router.post("/:repoId/members", validateAddMember, validate, repoMemberGuard, addMemberController);

// Remove a member from the repo (owner only — enforced in service)
router.delete("/:repoId/members/:userId", validateRemoveMember, validate, repoMemberGuard, removeMemberController);

// Set or change the team lead (owner only — enforced in service)
router.patch("/:repoId/team-lead", validateSetTeamLead, validate, repoMemberGuard, setTeamLeadController);

// Replace stage rules for a repo (owner only — enforced in service)
router.put("/:repoId/stage-rules", validateUpdateStageRules, validate, repoMemberGuard, updateStageRulesController);

export default router;
