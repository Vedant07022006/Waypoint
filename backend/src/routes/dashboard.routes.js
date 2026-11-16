import { Router } from "express";
import verifyJWT from "../middlewares/auth.middleware.js";
import {
    getDeveloperDashboardController,
    getReviewerDashboardController,
    getTeamLeadDashboardController,
} from "../controllers/dashboard.controller.js";

const router = Router();
router.use(verifyJWT);

// GET /api/v1/dashboard/developer
router.get("/developer", getDeveloperDashboardController);

// GET /api/v1/dashboard/reviewer
router.get("/reviewer", getReviewerDashboardController);

// GET /api/v1/dashboard/teamlead/:repoId
router.get("/teamlead/:repoId", getTeamLeadDashboardController);

export default router;
