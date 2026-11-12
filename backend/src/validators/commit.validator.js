import { body, param } from "express-validator";

// ── Create Commit ─────────────────────────────────────────────────────────────
export const validateCreateCommit = [
    param("repoId").isMongoId().withMessage("Invalid repository ID"),
    param("branchId").isMongoId().withMessage("Invalid branch ID"),

    body("message")
        .trim()
        .notEmpty().withMessage("Commit message is required")
        .isLength({ min: 3, max: 300 }).withMessage("Commit message must be between 3 and 300 characters"),

    body("files")
        .isArray({ min: 1 }).withMessage("files must be a non-empty array"),

    body("files.*.path")
        .trim()
        .notEmpty().withMessage("Each file must have a path"),

    body("files.*.content")
        .optional()
        .isString().withMessage("File content must be a string"),
];

// ── Get Commits ───────────────────────────────────────────────────────────────
export const validateGetCommits = [
    param("repoId").isMongoId().withMessage("Invalid repository ID"),
    param("branchId").isMongoId().withMessage("Invalid branch ID"),
];
