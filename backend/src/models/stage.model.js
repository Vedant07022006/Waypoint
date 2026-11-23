import mongoose, { Schema } from "mongoose";

const reviewStageSchema = new Schema(
    {
        prId: {
            type: Schema.Types.ObjectId,
            ref: "PullRequest",
            required: true,
            index: true,
        },
        repoId: {
            type: Schema.Types.ObjectId,
            ref: "Repo",
            required: true,
            index: true,
        },
        stageType: {
            type: String,
            enum: [
                "AUTH_REVIEW",
                "DB_REVIEW",
                "SECURITY_SIGNOFF",
                "INFRA_REVIEW",
                "GENERAL_REVIEW",
            ],
            required: true,
        },
        status: {
            type: String,
            enum: [
                "PENDING",      // Waiting for reviewer assignment
                "IN_PROGRESS",  // Reviewer assigned and actively reviewing
                "COMPLETED",    // Reviewer approved
                "REJECTED",     // Reviewer requested changes
                "BLOCKED",      // Waiting for dependency stages to complete
            ],
            default: "PENDING",
            index: true,
        },
        // Set by ML ranking service (Phase 7) — can be multiple reviewers
        assignedReviewers: [
            {
                type: Schema.Types.ObjectId,
                ref: "User",
            },
        ],
        // Stage types that must be COMPLETED before this stage can start
        // e.g. SECURITY_SIGNOFF depends on ['AUTH_REVIEW', 'DB_REVIEW']
        dependsOn: [{ type: String }],
        // Reviewer feedback
        reviewComments: {
            type: String,
            default: "",
        },
        completedAt: {
            type: Date,
            default: null,
        },
        rejectedAt: {
            type: Date,
            default: null,
        },
        // SLA deadline — set when stage becomes IN_PROGRESS
        slaDeadline: {
            type: Date,
            default: null,
        },
        // True once the cron detects this stage missed its deadline
        slaBreached: {
            type: Boolean,
            default: false,
            index: true,
        },
        // How many times this stage has been auto-reassigned due to SLA breach
        // escalationCount >= 3 → hard escalation to team lead
        escalationCount: {
            type: Number,
            default: 0,
        },
        // ML assignment metrics, explainability scores, and timestamps
        assignmentMetadata: {
            type: Schema.Types.Mixed,
            default: {},
        },
    },
    {
        timestamps: true,
    }
);

// One stageType per PR — no duplicate stages
reviewStageSchema.index({ prId: 1, stageType: 1 }, { unique: true });

export const ReviewStage = mongoose.model("ReviewStage", reviewStageSchema);
