import { body, param, query } from "express-validator";

const VALID_STATUSES = ["PRECHECK_RUNNING", "PRECHECK_FAILED", "REVIEW_PENDING", "APPROVED", "MERGED", "CLOSED"];
const VALID_STAGE_TYPES = ["AUTH_REVIEW", "DB_REVIEW", "SECURITY_SIGNOFF", "INFRA_REVIEW", "GENERAL_REVIEW"];

// ── Create PR ─────────────────────────────────────────────────────────────────
export const validateCreatePR = [
    param("repoId").isMongoId().withMessage("Invalid repository ID"),

    body("fromBranchId")
        .notEmpty().withMessage("fromBranchId is required")
        .isMongoId().withMessage("fromBranchId must be a valid branch ID"),

    body("toBranchId")
        .notEmpty().withMessage("toBranchId is required")
        .isMongoId().withMessage("toBranchId must be a valid branch ID"),

    body("title")
        .trim()
        .notEmpty().withMessage("PR title is required")
        .isLength({ min: 3, max: 200 }).withMessage("Title must be between 3 and 200 characters"),

    body("description")
        .optional()
        .trim()
        .isLength({ max: 2000 }).withMessage("Description cannot exceed 2000 characters"),
];

// ── List PRs ──────────────────────────────────────────────────────────────────
export const validateGetPRs = [
    param("repoId").isMongoId().withMessage("Invalid repository ID"),

    query("status")
        .optional()
        .isIn(VALID_STATUSES)
        .withMessage(`status must be one of: ${VALID_STATUSES.join(", ")}`),

    query("page")
        .optional()
        .isInt({ min: 1 }).withMessage("page must be a positive integer"),

    query("limit")
        .optional()
        .isInt({ min: 1, max: 100 }).withMessage("limit must be between 1 and 100"),
];

// ── PR ID param ───────────────────────────────────────────────────────────────
export const validatePRId = [
    param("prId").isMongoId().withMessage("Invalid PR ID"),
];

// ── Override Stage Types ──────────────────────────────────────────────────────
export const validateOverrideStages = [
    param("prId").isMongoId().withMessage("Invalid PR ID"),

    body("stageTypes")
        .isArray({ min: 1 }).withMessage("stageTypes must be a non-empty array"),

    body("stageTypes.*")
        .isIn(VALID_STAGE_TYPES)
        .withMessage(`Each stage type must be one of: ${VALID_STAGE_TYPES.join(", ")}`),
];
