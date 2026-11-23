import { Router } from "express";
import verifyJWT from "../middlewares/auth.middleware.js";
import validate from "../middlewares/validate.middleware.js";
import { validateRepoId, validateUpsertSLAConfig } from "../validators/sla.validator.js";
import { getSLAConfigController, upsertSLAConfigController } from "../controllers/sla.controller.js";

const router = Router({ mergeParams: true }); // mergeParams: inherits :repoId from parent
router.use(verifyJWT);

// GET  /api/v1/repos/:repoId/sla  — view SLA config (any member)
router.get("/", validateRepoId, validate, getSLAConfigController);

// POST /api/v1/repos/:repoId/sla  — set/replace SLA config (owner / team lead)
router.post("/", validateUpsertSLAConfig, validate, upsertSLAConfigController);

export default router;
