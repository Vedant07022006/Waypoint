import { Router } from "express";
import verifyJWT from "../middlewares/auth.middleware.js";
import { param } from "express-validator";
import validate from "../middlewares/validate.middleware.js";
import {
    precheckResultController,
    getPrecheckResultController,
} from "../controllers/precheck.controller.js";

const router = Router();

// ── POST /api/v1/precheck/result ──────────────────────────────────────────────
// Callback from the Python pre-check service (Layer 3).
// Public — NO JWT, protected by X-Precheck-Secret header instead.
router.post("/result", precheckResultController);

// ── GET /api/v1/precheck/:prId ────────────────────────────────────────────────
// Frontend polls this until Socket.io is set up (Phase 6).
router.get(
    "/:prId",
    verifyJWT,
    [param("prId").isMongoId().withMessage("Invalid PR ID")],
    validate,
    getPrecheckResultController
);

export default router;
