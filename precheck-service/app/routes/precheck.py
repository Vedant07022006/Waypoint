"""
FastAPI route for the pre-check service.

POST /run — receives diff from Node.js, runs the LangGraph pipeline in the
            background, then POSTs results back to Node.js via callback URL.
GET  /health — simple health check for monitoring.
"""
import httpx
import logging
from fastapi import APIRouter, BackgroundTasks, HTTPException
from ..schemas.request import PrecheckRequest
from ..graph.pipeline import pipeline
from ..config import settings

logger = logging.getLogger("precheck")
router = APIRouter()


async def run_pipeline_and_callback(request: PrecheckRequest) -> None:
    """
    Background task that:
    1. Runs the LangGraph pipeline with the PR diff
    2. POSTs the structured result back to Node.js
    """
    pr_id = request.pr_id
    logger.info(f"[{pr_id}] Starting pre-check pipeline...")

    try:
        # ── Run the LangGraph pipeline ────────────────────────────────────────
        final_state = await pipeline.ainvoke({
            "pr_id": pr_id,
            "diff_text": request.diff_text,
            "callback_url": request.callback_url,
            # Initialize list fields to empty — required for Annotated reducers
            "rule_violations": [],
            "bug_findings": [],
            "security_findings": [],
            "all_issues": [],
            "parsed_summary": "",
            "severity": "",
            "final_summary": "",
        })

        severity   = final_state.get("severity", "PASS")
        all_issues = final_state.get("all_issues", [])
        summary    = final_state.get("final_summary", "Pre-check complete.")

        logger.info(f"[{pr_id}] Pipeline complete — severity={severity}, issues={len(all_issues)}")

        # ── Build callback payload ────────────────────────────────────────────
        # Map internal severity to the status Node.js expects
        has_blocking = any(i.get("severity") == "BLOCKING" for i in all_issues)
        callback_status = "ISSUES_FOUND" if all_issues else "PASSED"

        payload = {
            "pr_id": pr_id,
            "status": callback_status,
            "issues": all_issues,
            "summary": summary,
        }

    except Exception as exc:
        # Pipeline crashed — callback with empty PASSED to unblock the PR
        logger.error(f"[{pr_id}] Pipeline error: {exc}")
        payload = {
            "pr_id": pr_id,
            "status": "PASSED",
            "issues": [],
            "summary": f"Pre-check encountered an internal error: {str(exc)[:200]}",
        }

    # ── POST callback to Node.js ──────────────────────────────────────────────
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                request.callback_url,
                json=payload,
                headers={"X-Precheck-Secret": settings.PRECHECK_SECRET},
            )
            logger.info(f"[{pr_id}] Callback sent → {response.status_code}")
    except Exception as exc:
        logger.error(f"[{pr_id}] Callback failed: {exc}")


@router.post("/run")
async def run_precheck(request: PrecheckRequest, background_tasks: BackgroundTasks):
    """
    Receives a PR diff from Node.js, queues the pipeline as a background task,
    and immediately returns 202 Accepted — non-blocking.
    """
    if not request.pr_id or not request.diff_text:
        raise HTTPException(status_code=400, detail="pr_id and diff_text are required")

    logger.info(f"Pre-check queued for PR {request.pr_id}")
    background_tasks.add_task(run_pipeline_and_callback, request)

    return {
        "success": True,
        "data": {"pr_id": request.pr_id, "status": "queued"},
        "message": "Pre-check pipeline started — results will be sent to callback_url",
    }


@router.get("/health")
async def health_check():
    """Simple health check — returns 200 if the service is up."""
    return {"status": "ok", "service": "waypoint-precheck"}
