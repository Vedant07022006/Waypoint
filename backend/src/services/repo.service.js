import { Repo } from "../models/repo.model.js";
import { Branch } from "../models/branch.model.js";
import { User } from "../models/user.model.js";
import ApiError from "../utils/ApiError.js";
import logger from "../config/logger.js";
import { detectLanguages } from "../utils/languageDetector.js";

// ── Default stage rules applied to every newly created repo ─────────────────
// Owner can override these via PUT /repos/:repoId/stage-rules
const DEFAULT_STAGE_RULES = [
    { pattern: "src/auth/",        stage: "AUTH_REVIEW"      },
    { pattern: "src/middleware/",  stage: "AUTH_REVIEW"      },
    { pattern: "src/db/",          stage: "DB_REVIEW"        },
    { pattern: "src/models/",      stage: "DB_REVIEW"        },
    { pattern: "(infrastructure/|Dockerfile)", stage: "INFRA_REVIEW" },
    { pattern: ".env",             stage: "SECURITY_SIGNOFF" },
    { pattern: "src/payments/",    stage: "SECURITY_SIGNOFF" },
];

// ── createRepo ───────────────────────────────────────────────────────────────
// Creates a new repo and auto-creates main + develop branches.
// Owner is automatically added as the first member.
export const createRepo = async ({ name, description, ownerId, teamLeadId, stageRules }) => {
    // 1. Validate teamLead exists and is a member of the platform
    if (teamLeadId) {
        const teamLead = await User.findById(teamLeadId);
        if (!teamLead) {
            throw new ApiError(404, "Team lead user not found");
        }
    }

    let finalRules = DEFAULT_STAGE_RULES;
    if (stageRules && Array.isArray(stageRules) && stageRules.length > 0) {
        finalRules = stageRules.map((r) => ({
            pattern: r.pattern,
            stage: r.stage || r.stageType,
        }));
    }

    // 2. Create the repo (duplicate name per owner is caught by unique index)
    let repo;
    try {
        repo = await Repo.create({
            name: name.trim(),
            description: description?.trim() || "",
            ownerId,
            teamLeadId: teamLeadId || ownerId,
            members: [ownerId],
            stageRules: finalRules,
        });
    } catch (err) {
        if (err.code === 11000) {
            throw new ApiError(409, `A repository named "${name}" already exists in your account`);
        }
        throw err;
    }

    // 3. Auto-create main branch (protected)
    await Branch.create({
        name: "main",
        repoId: repo._id,
        createdBy: ownerId,
        sourceBranch: null,
        files: [],
        isProtected: true,
    });

    // 4. Auto-create develop branch (protected, forked from main)
    await Branch.create({
        name: "develop",
        repoId: repo._id,
        createdBy: ownerId,
        sourceBranch: "main",
        files: [],
        isProtected: true,
    });

    logger.info("Repository created", { repoId: repo._id, name, ownerId });

    return repo;
};

// ── getRepos ─────────────────────────────────────────────────────────────────
// Returns all repos where the user is the owner OR a member.
export const getRepos = async (userId) => {
    const repos = await Repo.find({
        $or: [{ ownerId: userId }, { members: userId }],
        isArchived: false,
    })
        .populate("ownerId", "fullName username email")
        .populate("teamLeadId", "fullName username email")
        .sort({ createdAt: -1 })
        .lean();

    if (!repos.length) return [];

    const repoIds = repos.map((r) => r._id);
    const branches = await Branch.find({ repoId: { $in: repoIds } })
        .select("name repoId files isProtected")
        .lean();

    const branchMap = {};
    for (const b of branches) {
        const id = b.repoId.toString();
        if (!branchMap[id]) branchMap[id] = [];
        branchMap[id].push(b);
    }

    return repos.map((repo) => {
        const rBranches = branchMap[repo._id.toString()] || [];
        const mainBranch = rBranches.find((b) => b.name === "main") || rBranches[0];
        const files = mainBranch ? mainBranch.files : [];
        const { languages, primaryLanguage } = detectLanguages(files);

        return {
            ...repo,
            primaryLanguage,
            languages,
            branchNames: rBranches.map((b) => b.name),
            branchCount: rBranches.length,
        };
    });
};

// ── getRepoById ──────────────────────────────────────────────────────────────
// Returns full repo details. Caller must have already confirmed membership.
export const getRepoById = async (repoId) => {
    const repo = await Repo.findById(repoId)
        .populate("ownerId", "fullName username email")
        .populate("teamLeadId", "fullName username email")
        .populate("members", "fullName username email role")
        .lean();

    if (!repo) {
        throw new ApiError(404, "Repository not found");
    }

    // Attach branches summary with files for language calculation
    const branches = await Branch.find({ repoId })
        .select("name isProtected sourceBranch latestCommitId createdAt files")
        .lean();

    const mainBranch = branches.find((b) => b.name === "main") || branches[0];
    const { languages, primaryLanguage } = detectLanguages(mainBranch?.files || []);

    return {
        ...repo,
        languages,
        primaryLanguage,
        branches,
    };
};

// ── getRepoMembers ───────────────────────────────────────────────────────────
// Returns list of members with roles and expertise for the repository.
export const getRepoMembers = async (repoId) => {
    const repo = await Repo.findById(repoId)
        .populate("members", "fullName username email role currentOpenReviews expertiseTags")
        .populate("ownerId", "fullName username email role")
        .populate("teamLeadId", "fullName username email role");

    if (!repo) throw new ApiError(404, "Repository not found");

    return repo.members;
};

// ── addMember ────────────────────────────────────────────────────────────────
// Adds a registered user to the repo's members list. Team Lead or Owner only.
export const addMember = async ({ repoId, userId, requestingUserId }) => {
    const repo = await Repo.findById(repoId);

    if (!repo) throw new ApiError(404, "Repository not found");

    // Only owner or team lead can add members
    const isOwner = repo.ownerId.toString() === requestingUserId.toString();
    const isTeamLead = repo.teamLeadId && repo.teamLeadId.toString() === requestingUserId.toString();
    if (!isOwner && !isTeamLead) {
        throw new ApiError(403, "Only the repository Team Lead or Owner can invite members");
    }

    // Confirm the user being added exists (support ObjectId or username or email)
    let userToAdd = null;
    const isObjectId = typeof userId === "string" && userId.match(/^[0-9a-fA-F]{24}$/);
    if (isObjectId) {
        userToAdd = await User.findById(userId);
    }
    if (!userToAdd && typeof userId === "string") {
        const query = userId.trim().toLowerCase();
        userToAdd = await User.findOne({
            $or: [{ email: query }, { username: query }],
        });
    }

    if (!userToAdd) throw new ApiError(404, "User not found with the provided identifier");

    // Prevent duplicates
    if (repo.members.some((m) => m.toString() === userToAdd._id.toString())) {
        throw new ApiError(409, `User "${userToAdd.username}" is already a member of this repository`);
    }

    repo.members.push(userToAdd._id);
    await repo.save();

    logger.info("Member added to repo", { repoId, userId: userToAdd._id, addedBy: requestingUserId });

    return repo.populate("members", "fullName username email role currentOpenReviews");
};

// ── removeMember ─────────────────────────────────────────────────────────────
// Removes a member from the repo. Owner cannot be removed. Team Lead or Owner only.
export const removeMember = async ({ repoId, userId, requestingUserId }) => {
    const repo = await Repo.findById(repoId);

    if (!repo) throw new ApiError(404, "Repository not found");

    const isOwner = repo.ownerId.toString() === requestingUserId.toString();
    const isTeamLead = repo.teamLeadId && repo.teamLeadId.toString() === requestingUserId.toString();
    if (!isOwner && !isTeamLead) {
        throw new ApiError(403, "Only the repository Team Lead or Owner can remove members");
    }

    // Owner cannot be removed from their own repo
    if (repo.ownerId.toString() === userId.toString()) {
        throw new ApiError(400, "The repository owner cannot be removed from the members list");
    }

    const before = repo.members.length;
    repo.members = repo.members.filter((m) => m.toString() !== userId.toString());

    if (repo.members.length === before) {
        throw new ApiError(404, "User is not a member of this repository");
    }

    // If removed member was the team lead, clear teamLeadId
    if (repo.teamLeadId?.toString() === userId.toString()) {
        repo.teamLeadId = null;
    }

    await repo.save();

    logger.info("Member removed from repo", { repoId, userId, removedBy: requestingUserId });

    return { message: "Member removed successfully" };
};

// ── setTeamLead ──────────────────────────────────────────────────────────────
// Sets a repo member as the team lead. Owner only.
export const setTeamLead = async ({ repoId, teamLeadId, requestingUserId }) => {
    const repo = await Repo.findById(repoId);

    if (!repo) throw new ApiError(404, "Repository not found");

    if (repo.ownerId.toString() !== requestingUserId.toString()) {
        throw new ApiError(403, "Only the repository owner can appoint a team lead");
    }

    // Team lead must already be a repo member
    const isMember = repo.members.some((m) => m.toString() === teamLeadId.toString());
    if (!isMember) {
        throw new ApiError(400, "The designated team lead must first be a member of this repository");
    }

    repo.teamLeadId = teamLeadId;
    await repo.save();

    logger.info("Team lead set", { repoId, teamLeadId, setBy: requestingUserId });

    return repo.populate("teamLeadId", "fullName username email");
};

// ── updateStageRules ─────────────────────────────────────────────────────────
// Replaces the repo's stage rules entirely. Owner only.
export const updateStageRules = async ({ repoId, stageRules, requestingUserId }) => {
    const repo = await Repo.findById(repoId);

    if (!repo) throw new ApiError(404, "Repository not found");

    if (repo.ownerId.toString() !== requestingUserId.toString()) {
        throw new ApiError(403, "Only the repository owner can update stage rules");
    }

    repo.stageRules = stageRules;
    await repo.save();

    logger.info("Stage rules updated", { repoId, ruleCount: stageRules.length });

    return repo;
};
