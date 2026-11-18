import mongoose, { Schema } from "mongoose";

// ── Individual issue sub-schema ───────────────────────────────────────────────
const issueSchema = new Schema(
    {
        // Which of the three parallel LangChain check nodes found this
        type: {
            type: String,
            enum: ["RULE", "BUG", "SECURITY"],
            required: true,
        },
        rule: {
            type: String,
            default: "",
        },
        line: {
            type: Number,
            default: null,
        },
        description: {
            type: String,
            required: true,
        },
        severity: {
            type: String,
            enum: ["BLOCKING", "WARNING", "INFO"],
            required: true,
        },
    },
    { _id: false }
);

// ── Code check result schema ──────────────────────────────────────────────────
const codeCheckSchema = new Schema(
    {
        prId: {
            type: Schema.Types.ObjectId,
            ref: "PullRequest",
            required: true,
            index: true,
            unique: true, // one result per PR (gets overwritten on re-check)
        },
        status: {
            type: String,
            enum: ["RUNNING", "PASSED", "ISSUES_FOUND"],
            default: "RUNNING",
        },
        issues: [issueSchema],
        // Short human-readable summary: "1 blocking issue, 2 warnings"
        summary: {
            type: String,
            default: "",
        },
        checkedAt: {
            type: Date,
            default: null,
        },
        // When the developer was notified via Socket.io (set in Phase 6)
        notifiedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

export const CodeCheckResult = mongoose.model("CodeCheckResult", codeCheckSchema);
