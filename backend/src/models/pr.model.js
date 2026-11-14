import mongoose, { Schema } from "mongoose";

const prSchema = new Schema(
    {
        repoId: {
            type: Schema.Types.ObjectId,
            ref: "Repo",
            required: true,
            index: true,
        },
        // Source branch (feature branch — what is being merged)
        fromBranch: {
            type: Schema.Types.ObjectId,
            ref: "Branch",
            required: true,
        },
        // Target branch (always develop — main is only via team lead)
        toBranch: {
            type: Schema.Types.ObjectId,
            ref: "Branch",
            required: true,
        },
        prNumber: {
            type: Number,
            index: true,
        },
        title: {
            type: String,
            required: [true, "PR title is required"],
            trim: true,
        },
        description: {
            type: String,
            trim: true,
            default: "",
        },
        authorId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        // Unified diff string — sent to Layer 3 pre-check service
        diff: {
            type: String,
            default: "",
        },
        // File paths that changed — used by stageDetector to create review stages
        changedPaths: [{ type: String }],
        // Stage types detected from changedPaths + repo stageRules
        stageTypes: [
            {
                type: String,
                enum: [
                    "AUTH_REVIEW",
                    "DB_REVIEW",
                    "SECURITY_SIGNOFF",
                    "INFRA_REVIEW",
                    "GENERAL_REVIEW",
                ],
            },
        ],
        status: {
            type: String,
            enum: [
                "PRECHECK_RUNNING",  // Pre-check service is processing
                "PRECHECK_FAILED",   // Pre-check found BLOCKING issues
                "REVIEW_PENDING",    // Pre-check passed — stages being assigned
                "APPROVED",          // All stages COMPLETED — ready to merge
                "MERGED",            // Successfully merged into target branch
                "CLOSED",            // Closed without merging
            ],
            default: "PRECHECK_RUNNING",
            index: true,
        },
        mergedAt: {
            type: Date,
            default: null,
        },
        closedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

// Index for listing PRs by repo (most recent first)
prSchema.index({ repoId: 1, createdAt: -1 });

export const PullRequest = mongoose.model("PullRequest", prSchema);
