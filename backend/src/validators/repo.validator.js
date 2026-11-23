import { body, param } from "express-validator";

// ── Create Repository ────────────────────────────────────────────────────────
export const validateCreateRepo = [
    body("name")
        .trim()
        .notEmpty().withMessage("Repository name is required")
        .isLength({ min: 2, max: 100 }).withMessage("Name must be between 2 and 100 characters")
        .matches(/^[a-zA-Z0-9_\-. ]+$/).withMessage("Name can only contain letters, numbers, spaces, hyphens, underscores, and dots"),

    body("description")
        .optional()
        .trim()
        .isLength({ max: 500 }).withMessage("Description cannot exceed 500 characters"),

    body("teamLeadId")
        .optional()
        .isMongoId().withMessage("teamLeadId must be a valid user ID"),
];

// ── Add Member ───────────────────────────────────────────────────────────────
export const validateAddMember = [
    param("repoId")
        .isMongoId().withMessage("Invalid repository ID"),

    body("userId")
        .notEmpty().withMessage("User identifier (ID, email, or username) is required"),
];

// ── Remove Member ────────────────────────────────────────────────────────────
export const validateRemoveMember = [
    param("repoId")
        .isMongoId().withMessage("Invalid repository ID"),

    param("userId")
        .isMongoId().withMessage("Invalid user ID"),
];

// ── Set Team Lead ────────────────────────────────────────────────────────────
export const validateSetTeamLead = [
    param("repoId")
        .isMongoId().withMessage("Invalid repository ID"),

    body("teamLeadId")
        .notEmpty().withMessage("teamLeadId is required")
        .isMongoId().withMessage("teamLeadId must be a valid user ID"),
];

// ── Update Stage Rules ───────────────────────────────────────────────────────
export const validateUpdateStageRules = [
    param("repoId")
        .isMongoId().withMessage("Invalid repository ID"),

    body("stageRules")
        .isArray({ min: 1 }).withMessage("stageRules must be a non-empty array"),

    body("stageRules.*.pattern")
        .notEmpty().withMessage("Each rule must have a pattern")
        .isString().withMessage("Pattern must be a string"),

    body("stageRules.*.stage")
        .notEmpty().withMessage("Each rule must have a stage")
        .isIn(["AUTH_REVIEW", "DB_REVIEW", "SECURITY_SIGNOFF", "INFRA_REVIEW", "GENERAL_REVIEW"])
        .withMessage("Invalid stage type"),
];

// ── Repo ID param (shared) ───────────────────────────────────────────────────
export const validateRepoId = [
    param("repoId")
        .isMongoId().withMessage("Invalid repository ID"),
];
