import mongoose, { Schema } from "mongoose";

// ── File snapshot sub-schema ─────────────────────────────────────────────────
// Each commit stores the FULL file snapshot of the branch at that point in time.
// This is Waypoint's MongoDB-based simulated git — no real git CLI.
const fileSchema = new Schema(
    {
        path: { type: String, required: true, trim: true },
        content: { type: String, default: "" },
    },
    { _id: false }
);

// ── Commit schema ────────────────────────────────────────────────────────────
const commitSchema = new Schema(
    {
        branchId: {
            type: Schema.Types.ObjectId,
            ref: "Branch",
            required: true,
            index: true,
        },
        repoId: {
            type: Schema.Types.ObjectId,
            ref: "Repo",
            required: true,
            index: true,
        },
        authorId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        message: {
            type: String,
            required: [true, "Commit message is required"],
            trim: true,
        },
        // Full snapshot of ALL files on the branch after this commit
        files: [fileSchema],
        // Only the paths that changed in this commit (used by stageDetector + ML)
        changedFiles: [{ type: String }],
        // True only for auto-generated merge commits created by the merge service
        isMergeCommit: {
            type: Boolean,
            default: false,
        },
        // Set only on merge commits — references the PR that was merged
        mergedFromPR: {
            type: Schema.Types.ObjectId,
            ref: "PullRequest",
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

// Index for commit history queries (most recent first per branch)
commitSchema.index({ branchId: 1, createdAt: -1 });

export const Commit = mongoose.model("Commit", commitSchema);
