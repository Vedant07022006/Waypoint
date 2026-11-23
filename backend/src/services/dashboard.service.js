import { PullRequest } from "../models/pr.model.js";
import { ReviewStage } from "../models/stage.model.js";
import { Repo } from "../models/repo.model.js";
import { User } from "../models/user.model.js";

// ── getDeveloperDashboard ─────────────────────────────────────────────────────
export const getDeveloperDashboard = async (userId) => {
    const [myPRs, myStats] = await Promise.all([
        PullRequest.find({ authorId: userId })
            .populate("repoId", "name")
            .populate("fromBranch", "name")
            .populate("toBranch", "name")
            .sort({ createdAt: -1 })
            .limit(10)
            .lean(),
        PullRequest.aggregate([
            { $match: { authorId: userId } },
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 },
                },
            },
        ]),
    ]);

    const statusCounts = {
        PRECHECK_RUNNING: 0,
        PRECHECK_FAILED: 0,
        REVIEW_PENDING: 0,
        APPROVED: 0,
        MERGED: 0,
        CLOSED: 0,
    };

    myStats.forEach((s) => {
        if (s._id) statusCounts[s._id] = s.count;
    });

    return {
        recentPRs: myPRs,
        stats: statusCounts,
        totalCreated: Object.values(statusCounts).reduce((a, b) => a + b, 0),
    };
};

// ── getReviewerDashboard ──────────────────────────────────────────────────────
export const getReviewerDashboard = async (userId) => {
    const [pendingReviews, completedReviews] = await Promise.all([
        ReviewStage.find({
            assignedReviewers: userId,
            status: { $in: ["IN_PROGRESS", "PENDING"] },
        })
            .populate("prId", "title authorId repoId status createdAt")
            .populate("repoId", "name")
            .sort({ slaDeadline: 1 })
            .lean(),
        ReviewStage.find({
            assignedReviewers: userId,
            status: "COMPLETED",
        })
            .populate("prId", "title repoId")
            .sort({ completedAt: -1 })
            .limit(10)
            .lean(),
    ]);

    const now = new Date();
    const urgentCount = pendingReviews.filter(
        (s) => s.slaDeadline && new Date(s.slaDeadline).getTime() - now.getTime() < 6 * 3600 * 1000
    ).length;

    return {
        assignedCount: pendingReviews.length,
        urgentCount,
        completedCount: completedReviews.length,
        pendingReviews,
        recentCompleted: completedReviews,
    };
};

// ── getTeamLeadDashboard ──────────────────────────────────────────────────────
export const getTeamLeadDashboard = async (repoId) => {
    const repo = await Repo.findById(repoId).populate("members", "fullName username email currentOpenReviews role");

    const [prStats, openPRs, escalations, stageDistribution] = await Promise.all([
        PullRequest.aggregate([
            { $match: { repoId: repo._id } },
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 },
                },
            },
        ]),
        PullRequest.find({
            repoId: repo._id,
            status: { $in: ["REVIEW_PENDING", "APPROVED", "PRECHECK_RUNNING"] },
        })
            .populate("authorId", "fullName username")
            .sort({ createdAt: -1 })
            .lean(),
        ReviewStage.find({
            repoId: repo._id,
            $or: [{ slaBreached: true }, { escalationCount: { $gt: 0 } }],
            status: { $in: ["IN_PROGRESS", "PENDING", "BLOCKED"] },
        })
            .populate("prId", "title authorId")
            .populate("assignedReviewers", "fullName username")
            .lean(),
        ReviewStage.aggregate([
            { $match: { repoId: repo._id } },
            {
                $group: {
                    _id: "$stageType",
                    total: { $sum: 1 },
                    completed: {
                        $sum: { $cond: [{ $eq: ["$status", "COMPLETED"] }, 1, 0] },
                    },
                },
            },
        ]),
    ]);

    // Reviewer workload fairness metrics
    const reviewerWorkload = (repo.members || []).map((m) => ({
        id: m._id,
        fullName: m.fullName,
        username: m.username,
        role: m.role,
        currentOpenReviews: m.currentOpenReviews || 0,
    }));

    return {
        repo: {
            id: repo._id,
            name: repo.name,
            totalMembers: repo.members.length,
        },
        prStats,
        openPRsCount: openPRs.length,
        openPRs,
        escalations,
        stageDistribution,
        reviewerWorkload,
    };
};
