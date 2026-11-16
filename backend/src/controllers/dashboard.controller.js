import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import {
    getDeveloperDashboard,
    getReviewerDashboard,
    getTeamLeadDashboard,
} from "../services/dashboard.service.js";

// GET /api/v1/dashboard/developer
export const getDeveloperDashboardController = asyncHandler(async (req, res) => {
    const data = await getDeveloperDashboard(req.user._id);
    return res
        .status(200)
        .json(new ApiResponse(200, data, "Developer dashboard metrics loaded"));
});

// GET /api/v1/dashboard/reviewer
export const getReviewerDashboardController = asyncHandler(async (req, res) => {
    const data = await getReviewerDashboard(req.user._id);
    return res
        .status(200)
        .json(new ApiResponse(200, data, "Reviewer dashboard metrics loaded"));
});

// GET /api/v1/dashboard/teamlead/:repoId
export const getTeamLeadDashboardController = asyncHandler(async (req, res) => {
    const { repoId } = req.params;
    const data = await getTeamLeadDashboard(repoId);
    return res
        .status(200)
        .json(new ApiResponse(200, data, "Team Lead dashboard metrics loaded"));
});
