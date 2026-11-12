import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import {
    createRepo,
    getRepos,
    getRepoById,
    getRepoMembers,
    addMember,
    removeMember,
    setTeamLead,
    updateStageRules,
} from "../services/repo.service.js";

// POST /api/v1/repos
export const createRepoController = asyncHandler(async (req, res) => {
    const { name, description, teamLeadId, stageRules } = req.body;
    const ownerId = req.user._id;

    const repo = await createRepo({ name, description, ownerId, teamLeadId, stageRules });

    return res
        .status(201)
        .json(new ApiResponse(201, repo, "Repository created successfully"));
});

// GET /api/v1/repos
export const getReposController = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const repos = await getRepos(userId);

    return res
        .status(200)
        .json(new ApiResponse(200, repos, "Repositories fetched successfully"));
});

// GET /api/v1/repos/:repoId
export const getRepoByIdController = asyncHandler(async (req, res) => {
    const { repoId } = req.params;

    const repo = await getRepoById(repoId);

    return res
        .status(200)
        .json(new ApiResponse(200, repo, "Repository fetched successfully"));
});

// GET /api/v1/repos/:repoId/members
export const getRepoMembersController = asyncHandler(async (req, res) => {
    const { repoId } = req.params;
    const members = await getRepoMembers(repoId);
    return res
        .status(200)
        .json(new ApiResponse(200, members, "Repository members fetched successfully"));
});

// POST /api/v1/repos/:repoId/members
export const addMemberController = asyncHandler(async (req, res) => {
    const { repoId } = req.params;
    const { userId } = req.body;
    const requestingUserId = req.user._id;

    const repo = await addMember({ repoId, userId, requestingUserId });

    return res
        .status(200)
        .json(new ApiResponse(200, repo, "Member added successfully"));
});

// DELETE /api/v1/repos/:repoId/members/:userId
export const removeMemberController = asyncHandler(async (req, res) => {
    const { repoId, userId } = req.params;
    const requestingUserId = req.user._id;

    const result = await removeMember({ repoId, userId, requestingUserId });

    return res
        .status(200)
        .json(new ApiResponse(200, result, "Member removed successfully"));
});

// PATCH /api/v1/repos/:repoId/team-lead
export const setTeamLeadController = asyncHandler(async (req, res) => {
    const { repoId } = req.params;
    const { teamLeadId } = req.body;
    const requestingUserId = req.user._id;

    const repo = await setTeamLead({ repoId, teamLeadId, requestingUserId });

    return res
        .status(200)
        .json(new ApiResponse(200, repo, "Team lead updated successfully"));
});

// PUT /api/v1/repos/:repoId/stage-rules
export const updateStageRulesController = asyncHandler(async (req, res) => {
    const { repoId } = req.params;
    const { stageRules } = req.body;
    const requestingUserId = req.user._id;

    const repo = await updateStageRules({ repoId, stageRules, requestingUserId });

    return res
        .status(200)
        .json(new ApiResponse(200, repo, "Stage rules updated successfully"));
});
