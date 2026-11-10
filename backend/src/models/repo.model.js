import mongoose, { Schema } from "mongoose";

// ── Stage rule sub-schema ────────────────────────────────────────────────────
// Each rule maps a file path pattern (stored as string, used as regex) to a
// review stage type. The owner configures these per repo.
const stageRuleSchema = new Schema(
    {
        pattern: {
            type: String,
            required: [true, "Pattern is required"],
            trim: true,
        },
        stage: {
            type: String,
            enum: [
                "AUTH_REVIEW",
                "DB_REVIEW",
                "SECURITY_SIGNOFF",
                "INFRA_REVIEW",
                "GENERAL_REVIEW",
            ],
            required: [true, "Stage type is required"],
        },
    },
    { _id: false }
);

// ── Repository schema ────────────────────────────────────────────────────────
const repoSchema = new Schema(
    {
        name: {
            type: String,
            required: [true, "Repository name is required"],
            trim: true,
        },
        description: {
            type: String,
            trim: true,
            default: "",
        },
        ownerId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        teamLeadId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        // All users who can access this repo (owner is always included)
        members: [
            {
                type: Schema.Types.ObjectId,
                ref: "User",
            },
        ],
        // Owner-defined file pattern → stage type mapping
        stageRules: [stageRuleSchema],
        isArchived: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

// Unique repo name per owner
repoSchema.index({ name: 1, ownerId: 1 }, { unique: true });

export const Repo = mongoose.model("Repo", repoSchema);
