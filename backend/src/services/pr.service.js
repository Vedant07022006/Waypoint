import { PullRequest } from "../models/pr.model.js";
import { Branch } from "../models/branch.model.js";
import { Repo } from "../models/repo.model.js";
import { ReviewStage } from "../models/stage.model.js";
import { User } from "../models/user.model.js";
import { CodeCheckResult } from "../models/precheck.model.js";
import ApiError from "../utils/ApiError.js";
import { generateDiff } from "../utils/diffGenerator.js";
import { detectStages } from "../utils/stageDetector.js";
import { triggerPreCheck } from "./precheck.service.js";
import { emitToPR, emitToRepo } from "../config/socket.js";
import logger from "../config/logger.js";

// ── createPR ──────────────────────────────────────────────────────────────────
// Full PR creation flow:
//  1. Validate branches belong to the repo
//  2. Enforce: fromBranch must be a feature branch, toBranch must be develop
//  3. Generate unified diff (fromBranch → toBranch)
//  4. Detect stage types from changedPaths + repo stageRules
//  5. Save the PR in PRECHECK_RUNNING status
//  6. Create an initial CodeCheckResult (RUNNING)
//  7. Fire-and-forget: trigger Python pre-check service
export const createPR = async ({ repoId, fromBranchId, toBranchId, title, description, authorId }) => {
    // 1. Load repo for stageRules
    const repo = await Repo.findById(repoId).select("stageRules members ownerId");
    if (!repo) throw new ApiError(404, "Repository not found");

    // 2. Load branches and verify they belong to this repo
    const [fromBranch, toBranch] = await Promise.all([
        Branch.findOne({ _id: fromBranchId, repoId }),
        Branch.findOne({ _id: toBranchId, repoId }),
    ]);

    if (!fromBranch) throw new ApiError(404, "Source branch not found in this repository");
    if (!toBranch) throw new ApiError(404, "Target branch not found in this repository");

    // 3. Enforce branch rules
    if (fromBranch._id.toString() === toBranch._id.toString()) {
        throw new ApiError(400, "Source and target branches cannot be identical");
    }

    if (toBranch.name !== "develop" && toBranch.name !== "main") {
        throw new ApiError(400, 'Pull Requests can only target "main" or "develop" branches');
    }

    // 4. Prevent duplicate open PRs for the same branch pair
    const existingPR = await PullRequest.findOne({
        repoId,
        fromBranch: fromBranchId,
        toBranch: toBranchId,
        status: { $nin: ["MERGED", "CLOSED"] },
    });

    if (existingPR) {
        throw new ApiError(409, "An open Pull Request already exists for this branch");
    }

    // 5. Generate unified diff
    const { unifiedDiff, changedPaths } = generateDiff(toBranch.files, fromBranch.files);

    if (changedPaths.length === 0) {
        throw new ApiError(400, "No changes detected between branches — nothing to review");
    }

    // 6. Detect stage types
    const stageTypes = detectStages(changedPaths, repo.stageRules);

    // Calculate auto-incremented prNumber per repository
    const prCount = await PullRequest.countDocuments({ repoId });
    const prNumber = prCount + 1;

    // 7. Save the PR
    const pr = await PullRequest.create({
        repoId,
        fromBranch: fromBranchId,
        toBranch: toBranchId,
        prNumber,
        title: title.trim(),
        description: description?.trim() || "",
        authorId,
        diff: unifiedDiff,
        changedPaths,
        stageTypes,
        status: "PRECHECK_RUNNING",
    });

    // 8. Create initial code check record (RUNNING state)
    await CodeCheckResult.create({
        prId: pr._id,
        status: "RUNNING",
    });

    logger.info("Pull Request created", {
        prId: pr._id,
        repoId,
        fromBranch: fromBranch.name,
        toBranch: toBranch.name,
        changedFiles: changedPaths.length,
        stageTypes,
    });

    // 9. Fire-and-forget: trigger Python pre-check service (Layer 3)
    // Does NOT await — PR response returns immediately, pre-check runs async
    triggerPreCheck(pr._id, unifiedDiff);

    return pr;
};

// ── getPRs ────────────────────────────────────────────────────────────────────
// List PRs for a repo. Supports filtering by status.
export const getPRs = async ({ repoId, status, page = 1, limit = 20 }) => {
    const filter = { repoId };
    if (status) filter.status = status;

    const skip = (page - 1) * limit;

    const [prs, total] = await Promise.all([
        PullRequest.find(filter)
            .select("-diff") // exclude large diff string from list view
            .populate("authorId", "fullName username")
            .populate("fromBranch", "name")
            .populate("toBranch", "name")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        PullRequest.countDocuments(filter),
    ]);

    return {
        prs,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
};

// ── getPRById ─────────────────────────────────────────────────────────────────
// Full PR detail including diff, pre-check results, and detected stage types.
export const getPRById = async (prId) => {
    const pr = await PullRequest.findById(prId)
        .populate("authorId", "fullName username")
        .populate("fromBranch", "name")
        .populate("toBranch", "name")
        .populate({
            path: "repoId",
            populate: { path: "members", select: "fullName username email role" },
        })
        .lean();

    if (!pr) throw new ApiError(404, "Pull Request not found");

    // Attach latest pre-check result
    const precheckResult = await CodeCheckResult.findOne({ prId }).lean();

    return { ...pr, precheckResult: precheckResult || null };
};

// ── closePR ───────────────────────────────────────────────────────────────────
// Closes a PR without merging. Only the PR author, team lead, or repo owner can do this.
export const closePR = async ({ prId, requestingUserId }) => {
    const pr = await PullRequest.findById(prId).populate("repoId", "ownerId teamLeadId");

    if (!pr) throw new ApiError(404, "Pull Request not found");

    if (["MERGED", "CLOSED"].includes(pr.status)) {
        throw new ApiError(400, `Pull Request is already ${pr.status.toLowerCase()}`);
    }

    const isAuthor = pr.authorId.toString() === requestingUserId.toString();
    const isOwner = pr.repoId?.ownerId?.toString() === requestingUserId.toString();
    const isTeamLead = pr.repoId?.teamLeadId?.toString() === requestingUserId.toString();

    if (!isAuthor && !isOwner && !isTeamLead) {
        throw new ApiError(403, "Only the PR author, Team Lead, or repository owner can close this Pull Request");
    }

    pr.status = "CLOSED";
    pr.closedAt = new Date();
    await pr.save();

    // Release open review load for assigned reviewers on active (IN_PROGRESS) stages only
    const stages = await ReviewStage.find({ prId, status: "IN_PROGRESS" });
    const reviewerIds = stages.flatMap((s) => s.assignedReviewers || []);
    if (reviewerIds.length > 0) {
        await User.updateMany(
            { _id: { $in: reviewerIds }, currentOpenReviews: { $gt: 0 } },
            { $inc: { currentOpenReviews: -1 } }
        );
    }

    emitToPR(prId.toString(), "pr_status_changed", {
        prId,
        status: "CLOSED",
        closedAt: pr.closedAt,
    });

    emitToRepo(pr.repoId._id?.toString() || pr.repoId?.toString(), "pr_status_changed", {
        prId,
        status: "CLOSED",
    });

    logger.info("Pull Request closed", { prId, closedBy: requestingUserId });

    return { message: "Pull Request closed successfully", pr };
};

// ── overrideStageTypes ────────────────────────────────────────────────────────
// Allows the developer to manually add/remove stage types before review starts.
// Only available while PR is in PRECHECK_RUNNING or PRECHECK_FAILED status.
export const overrideStageTypes = async ({ prId, stageTypes, requestingUserId }) => {
    const pr = await PullRequest.findById(prId);

    if (!pr) throw new ApiError(404, "Pull Request not found");

    if (!["PRECHECK_RUNNING", "PRECHECK_FAILED", "REVIEW_PENDING"].includes(pr.status)) {
        throw new ApiError(400, "Stage types can only be modified before review stages are assigned");
    }

    const isAuthor = pr.authorId.toString() === requestingUserId.toString();
    if (!isAuthor) {
        throw new ApiError(403, "Only the PR author can override stage types");
    }

    await PullRequest.findByIdAndUpdate(prId, { stageTypes });

    logger.info("PR stage types overridden", { prId, stageTypes, by: requestingUserId });

    return PullRequest.findById(prId).lean();
};

// ── mergePR ───────────────────────────────────────────────────────────────────
// Merges an approved PR: verifies all DAG stages are COMPLETED, copies file snapshot,
// marks PR as MERGED, updates reviewer active counts, and broadcasts real-time socket events.
export const mergePR = async ({ prId, requestingUserId }) => {
    const pr = await PullRequest.findById(prId)
        .populate("fromBranch")
        .populate("toBranch");

    if (!pr) throw new ApiError(404, "Pull Request not found");

    if (pr.status === "MERGED") {
        throw new ApiError(400, "Pull Request is already merged");
    }

    if (pr.status === "CLOSED") {
        throw new ApiError(400, "Cannot merge a closed Pull Request");
    }

    // 1. Verify all review stages for this PR are COMPLETED
    const stages = await ReviewStage.find({ prId });
    const pendingStages = stages.filter((s) => s.status !== "COMPLETED");
    if (pendingStages.length > 0) {
        throw new ApiError(400, `Cannot merge: ${pendingStages.length} review stage(s) are not completed`);
    }

    // 2. Fetch the actual branches
    const fromBranchId = pr.fromBranch._id || pr.fromBranch;
    const toBranchId = pr.toBranch._id || pr.toBranch;

    const [fromBranch, toBranch] = await Promise.all([
        Branch.findById(fromBranchId),
        Branch.findById(toBranchId),
    ]);

    if (!fromBranch || !toBranch) {
        throw new ApiError(404, "Branches associated with this Pull Request could not be found");
    }

    // Role check: merging into 'main' requires Team Lead or Repo Owner authorization
    if (toBranch.name === "main") {
        const repo = await Repo.findById(pr.repoId);
        if (!repo) throw new ApiError(404, "Repository not found");
        const requestingUser = await User.findById(requestingUserId);
        const isOwner = repo.ownerId.toString() === requestingUserId.toString();
        const isTeamLead =
            (repo.teamLeadId && repo.teamLeadId.toString() === requestingUserId.toString()) ||
            (requestingUser && (requestingUser.role === "team_lead" || requestingUser.role === "owner"));

        if (!isOwner && !isTeamLead) {
            throw new ApiError(403, "Production merges to 'main' branch require Team Lead or Repository Owner authorization");
        }
    }

    // 3. Merge file snapshots: copy files from source branch into target branch
    toBranch.files = fromBranch.files;
    await toBranch.save();

    // 4. Update PR status to MERGED
    pr.status = "MERGED";
    pr.mergedAt = new Date();
    await pr.save();

    // 5. Reviewer open review load was already decremented when individual stages COMPLETED
    // in updateStageStatus to avoid double-decrementing.

    // 6. Broadcast real-time Socket.io events
    emitToPR(prId.toString(), "pr_merged", {
        prId,
        status: "MERGED",
        mergedAt: pr.mergedAt,
    });

    emitToRepo(pr.repoId.toString(), "pr_status_changed", {
        prId,
        status: "MERGED",
        toBranch: toBranch.name,
    });

    logger.info("Pull Request merged successfully", {
        prId,
        fromBranch: fromBranch.name,
        toBranch: toBranch.name,
        mergedBy: requestingUserId,
    });

    return pr;
};
