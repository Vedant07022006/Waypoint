import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";
import { handlePrecheckResult, getPrecheckResult } from "../services/precheck.service.js";

// POST /api/v1/precheck/result
// Called by the Python pre-check service (Layer 3) — NOT by the frontend.
// Validates a shared secret header to ensure only the Python service can call this.
export const precheckResultController = asyncHandler(async (req, res) => {
    // Shared secret validation — prevents anyone else from posting fake results
    const incomingSecret = req.headers["x-precheck-secret"];
    if (incomingSecret !== process.env.PRECHECK_SECRET) {
        throw new ApiError(403, "Invalid pre-check secret");
    }

    const { pr_id, status, issues, summary } = req.body;

    if (!pr_id || !status) {
        throw new ApiError(400, "pr_id and status are required");
    }

    if (!["PASSED", "ISSUES_FOUND"].includes(status)) {
        throw new ApiError(400, "status must be PASSED or ISSUES_FOUND");
    }

    const result = await handlePrecheckResult({
        prId: pr_id,
        status,
        issues: issues || [],
        summary: summary || "",
    });

    return res
        .status(200)
        .json(new ApiResponse(200, result, "Pre-check result processed successfully"));
});

// GET /api/v1/precheck/:prId
// Frontend polls this to get the latest pre-check result for a PR.
export const getPrecheckResultController = asyncHandler(async (req, res) => {
    const { prId } = req.params;

    const result = await getPrecheckResult(prId);

    if (!result) {
        throw new ApiError(404, "No pre-check result found for this PR");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, result, "Pre-check result fetched successfully"));
});
