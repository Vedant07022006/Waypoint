import { Router } from "express";
import verifyJWT from "../middlewares/auth.middleware.js";
import validate from "../middlewares/validate.middleware.js";
import {
    validateStageId,
    validateUpdateStageStatus,
    validateAssignReviewers,
    validateGetStages,
} from "../validators/stage.validator.js";
import {
    getStagesController,
    getStageByIdController,
    updateStageStatusController,
    assignReviewersController,
    demoExpireSLAController,
} from "../controllers/stage.controller.js";

const router = Router();
router.use(verifyJWT);

// ── PR-scoped stage routes ────────────────────────────────────────────────────
// GET /api/v1/pullrequests/:prId/stages — list all stages for a PR
router.get("/pr/:prId",           validateGetStages, validate, getStagesController);

// ── Stage-scoped routes ───────────────────────────────────────────────────────
// GET  /api/v1/stages/:stageId         — get single stage detail
router.get("/:stageId",           validateStageId, validate, getStageByIdController);

// PATCH /api/v1/stages/:stageId/status — reviewer marks COMPLETED or REJECTED
router.patch("/:stageId/status",  validateUpdateStageStatus, validate, updateStageStatusController);

// PATCH /api/v1/stages/:stageId/assign — assign reviewer(s) to a stage
router.patch("/:stageId/assign",  validateAssignReviewers, validate, assignReviewersController);

// POST /api/v1/stages/:stageId/demo-expire-sla — demo trigger to immediately expire SLA
router.post("/:stageId/demo-expire-sla", validateStageId, validate, demoExpireSLAController);

export default router;
