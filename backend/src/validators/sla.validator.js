import { body, param } from "express-validator";

const VALID_STAGE_TYPES = [
    "AUTH_REVIEW",
    "DB_REVIEW",
    "SECURITY_SIGNOFF",
    "INFRA_REVIEW",
    "GENERAL_REVIEW",
];

export const validateRepoId = [
    param("repoId").isMongoId().withMessage("Invalid repo ID"),
];

export const validateUpsertSLAConfig = [
    param("repoId").isMongoId().withMessage("Invalid repo ID"),

    body("stageSLAs")
        .isArray({ min: 1 })
        .withMessage("stageSLAs must be a non-empty array"),

    body("stageSLAs.*.stageType")
        .isIn(VALID_STAGE_TYPES)
        .withMessage(`stageType must be one of: ${VALID_STAGE_TYPES.join(", ")}`),

    body("stageSLAs.*.hoursAllowed")
        .isInt({ min: 1, max: 720 })
        .withMessage("hoursAllowed must be an integer between 1 and 720 (30 days)"),
];
