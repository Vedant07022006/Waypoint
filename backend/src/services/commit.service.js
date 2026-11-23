import { Commit } from "../models/commit.model.js";
import { Branch } from "../models/branch.model.js";
import { User } from "../models/user.model.js";
import { PullRequest } from "../models/pr.model.js";
import { ReviewStage } from "../models/stage.model.js";
import { generateDiff } from "../utils/diffGenerator.js";
import { triggerPreCheck } from "./precheck.service.js";
import { emitToPR } from "../config/socket.js";
import ApiError from "../utils/ApiError.js";
import logger from "../config/logger.js";

// ── createCommit ─────────────────────────────────────────────────────────────
// Saves a new commit to a feature branch.
// Rules:
//  - Protected branches (main, develop) cannot receive direct commits.
//  - files[] is the complete new snapshot of the branch after this commit.
//  - changedFiles[] contains only the paths that were modified — derived here
//    by comparing the new snapshot with the previous one.
//  - Author's commitHistory is updated for ML expertise profiling.
export const createCommit = async ({ branchId, repoId, authorId, message, files }) => {
    // 1. Fetch the branch
    const branch = await Branch.findOne({ _id: branchId, repoId });

    if (!branch) throw new ApiError(404, "Branch not found");

    // 2. Block direct commits to protected branches
    if (branch.isProtected) {
        throw new ApiError(
            403,
            `Cannot commit directly to protected branch "${branch.name}". ` +
            "Use a feature branch and open a Pull Request."
        );
    }

    // 3. Merge incoming files with existing branch files to preserve all other files
    const existingMap = new Map((branch.files || []).map((f) => [f.path, f.content]));
    const incomingMap = new Map(files.map((f) => [f.path, f.content || ""]));

    const changedFiles = [];
    for (const [path, content] of incomingMap) {
        if (!existingMap.has(path) || existingMap.get(path) !== content) {
            changedFiles.push(path);
        }
        existingMap.set(path, content);
    }

    const fullSnapshot = Array.from(existingMap.entries()).map(([path, content]) => ({ path, content }));

    // 4. Persist the commit
    const commit = await Commit.create({
        branchId,
        repoId,
        authorId,
        message,
        files: fullSnapshot,
        changedFiles,
    });

    // 5. Update branch: new file snapshot + pointer to latest commit
    await Branch.findByIdAndUpdate(branchId, {
        files: fullSnapshot,
        latestCommitId: commit._id,
    });

    // 6. Append to author's commitHistory for ML expertise profiling
    //    Using $push with $each to append cleanly
    await User.findByIdAndUpdate(authorId, {
        $push: {
            commitHistory: {
                $each: [{ files: changedFiles, message }],
                // Keep only the latest 200 entries to avoid unbounded growth
                $slice: -200,
            },
        },
    });

    logger.info("Commit created", {
        commitId: commit._id,
        branchId,
        authorId,
        changedFiles: changedFiles.length,
    });

    // 7. Check if any open Pull Requests exist for this branch and synchronize them
    try {
        const openPRs = await PullRequest.find({
            fromBranch: branchId,
            status: { $nin: ["MERGED", "CLOSED"] },
        }).populate("toBranch");

        for (const pr of openPRs) {
            if (pr.toBranch && pr.toBranch.files) {
                const { unifiedDiff, changedPaths } = generateDiff(pr.toBranch.files, fullSnapshot);
                pr.diff = unifiedDiff;
                pr.changedPaths = changedPaths;
                pr.status = "PRECHECK_RUNNING";
                await pr.save();

                // Reset any REJECTED stages back to IN_PROGRESS so reviewers can re-review the updated code
                await ReviewStage.updateMany(
                    { prId: pr._id, status: "REJECTED" },
                    { $set: { status: "IN_PROGRESS" } }
                );

                // Re-trigger pre-check with new diff
                triggerPreCheck(pr._id, unifiedDiff);

                emitToPR(pr._id.toString(), "stage_updated", { prId: pr._id });
            }
        }
    } catch (err) {
        logger.error("Error refreshing open PRs after commit", { error: err.message, branchId });
    }

    return commit;
};

// ── getCommits ────────────────────────────────────────────────────────────────
// Returns paginated commit history for a branch (newest first).
// Excludes the full files[] snapshot — too large for history views.
export const getCommits = async ({ branchId, repoId, page = 1, limit = 20 }) => {
    const branch = await Branch.findOne({ _id: branchId, repoId }).select("_id name");
    if (!branch) throw new ApiError(404, "Branch not found");

    const skip = (page - 1) * limit;

    const [commits, total] = await Promise.all([
        Commit.find({ branchId })
            .select("-files") // exclude full snapshot from history list
            .populate("authorId", "fullName username")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        Commit.countDocuments({ branchId }),
    ]);

    return {
        commits,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
};

// ── getCommitById ─────────────────────────────────────────────────────────────
// Returns a single commit with its full file snapshot.
// Used when the editor needs to restore a specific commit's state.
export const getCommitById = async ({ commitId, branchId }) => {
    const commit = await Commit.findOne({ _id: commitId, branchId })
        .populate("authorId", "fullName username")
        .lean();

    if (!commit) throw new ApiError(404, "Commit not found");

    return commit;
};
