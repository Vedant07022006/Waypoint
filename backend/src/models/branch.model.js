import mongoose, { Schema } from "mongoose";

// ── File snapshot sub-schema ─────────────────────────────────────────────────
// Each branch holds a full snapshot of all its files (Waypoint's MongoDB-based
// simulated git). There is no real git CLI — file content lives in MongoDB.
const fileSchema = new Schema(
    {
        path: {
            type: String,
            required: true,
            trim: true,
        },
        content: {
            type: String,
            default: "",
        },
    },
    { _id: false }
);

// ── Branch schema ────────────────────────────────────────────────────────────
const branchSchema = new Schema(
    {
        name: {
            type: String,
            required: [true, "Branch name is required"],
            trim: true,
        },
        repoId: {
            type: Schema.Types.ObjectId,
            ref: "Repo",
            required: true,
            index: true,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        // Name of the branch this was forked from (null for main)
        sourceBranch: {
            type: String,
            default: null,
        },
        // Full file snapshot — updated on every commit
        files: [fileSchema],
        // Points to the latest commit document for this branch
        latestCommitId: {
            type: Schema.Types.ObjectId,
            ref: "Commit",
            default: null,
        },
        // main and develop branches are protected — direct push blocked by API
        isProtected: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

// Unique branch name per repo
branchSchema.index({ name: 1, repoId: 1 }, { unique: true });

export const Branch = mongoose.model("Branch", branchSchema);
