import mongoose, { Schema } from "mongoose";

const STAGE_TYPES = [
    "AUTH_REVIEW",
    "DB_REVIEW",
    "SECURITY_SIGNOFF",
    "INFRA_REVIEW",
    "GENERAL_REVIEW",
];

// ── Default SLA hours (used when no custom config exists for a repo) ───────────
// Stored here as a named export so sla.service.js can reference them too
export const DEFAULT_SLA_HOURS = {
    GENERAL_REVIEW:   24,   // 1 day
    AUTH_REVIEW:      48,   // 2 days
    DB_REVIEW:        48,   // 2 days
    INFRA_REVIEW:     72,   // 3 days
    SECURITY_SIGNOFF: 48,   // 2 days
};

// Maximum number of ML auto-reassignments before hard escalation to team lead
export const MAX_AUTO_REASSIGNMENTS = 3;

const stageSLAEntrySchema = new Schema(
    {
        stageType: {
            type: String,
            enum: STAGE_TYPES,
            required: true,
        },
        hoursAllowed: {
            type: Number,
            required: true,
            min: 1,
            max: 720, // 30 days max
        },
    },
    { _id: false }
);

const slaConfigSchema = new Schema(
    {
        repoId: {
            type: Schema.Types.ObjectId,
            ref: "Repo",
            required: true,
            unique: true, // one SLA config per repo
            index: true,
        },
        // Per-stage type SLA overrides. Any stage type not listed falls back to DEFAULT_SLA_HOURS
        stageSLAs: [stageSLAEntrySchema],
    },
    { timestamps: true }
);

export const SLAConfig = mongoose.model("SLAConfig", slaConfigSchema);
