import { body, param } from "express-validator";

const VALID_STATUSES   = ["COMPLETED", "REJECTED"];
const VALID_STAGE_TYPES = ["AUTH_REVIEW", "DB_REVIEW", "SECURITY_SIGNOFF", "INFRA_REVIEW", "GENERAL_REVIEW"];

// ── Stage ID param (shared) ───────────────────────────────────────────────────
export const validateStageId = [
    param("stageId").isMongoId().withMessage("Invalid stage ID"),
];

// ── Update Stage Status ───────────────────────────────────────────────────────
export const validateUpdateStageStatus = [
    param("stageId").isMongoId().withMessage("Invalid stage ID"),

    body("status")
        .notEmpty().withMessage("status is required")
        .isIn(VALID_STATUSES)
        .withMessage(`status must be one of: ${VALID_STATUSES.join(", ")}`),

    body("reviewComments")
        .optional()
        .trim()
        .isLength({ max: 1000 }).withMessage("Review comments cannot exceed 1000 characters"),
];

// ── Assign Reviewers ──────────────────────────────────────────────────────────
export const validateAssignReviewers = [
    param("stageId").isMongoId().withMessage("Invalid stage ID"),

    body("reviewerIds")
        .isArray({ min: 1 }).withMessage("reviewerIds must be a non-empty array"),

    body("reviewerIds.*")
        .isMongoId().withMessage("Each reviewer ID must be a valid user ID"),
];

// ── Get Stages for PR ─────────────────────────────────────────────────────────
export const validateGetStages = [
    param("prId").isMongoId().withMessage("Invalid PR ID"),
];
