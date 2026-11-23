import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import { getRepoSLAConfig, upsertRepoSLAConfig } from "../services/sla.service.js";

// GET /api/v1/repos/:repoId/sla
// Returns effective SLA hours for every stage type (custom overrides + defaults)
export const getSLAConfigController = asyncHandler(async (req, res) => {
    const { repoId } = req.params;
    const config = await getRepoSLAConfig(repoId);
    return res
        .status(200)
        .json(new ApiResponse(200, config, "SLA config fetched successfully"));
});

// POST /api/v1/repos/:repoId/sla
// Create or fully replace the SLA config for a repo (owner / team lead only)
export const upsertSLAConfigController = asyncHandler(async (req, res) => {
    const { repoId } = req.params;
    const { stageSLAs } = req.body;
    const config = await upsertRepoSLAConfig(repoId, stageSLAs);
    return res
        .status(200)
        .json(new ApiResponse(200, config, "SLA config saved successfully"));
});
