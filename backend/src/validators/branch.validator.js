import { body, param } from "express-validator";

// ── Create Branch ─────────────────────────────────────────────────────────────
export const validateCreateBranch = [
    param("repoId")
        .isMongoId().withMessage("Invalid repository ID"),

    body("name")
        .trim()
        .notEmpty().withMessage("Branch name is required")
        .isLength({ min: 3, max: 100 }).withMessage("Branch name must be between 3 and 100 characters")
        .matches(/^feature\/[a-zA-Z0-9_\-]+$/)
        .withMessage('Branch name must start with "feature/" followed by alphanumeric characters, hyphens, or underscores (e.g. feature/add-login)'),

    body("sourceBranch")
        .optional()
        .trim()
        .notEmpty().withMessage("sourceBranch cannot be blank if provided"),
];

// ── Branch ID param ───────────────────────────────────────────────────────────
export const validateBranchId = [
    param("repoId").isMongoId().withMessage("Invalid repository ID"),
    param("branchId").isMongoId().withMessage("Invalid branch ID"),
];
