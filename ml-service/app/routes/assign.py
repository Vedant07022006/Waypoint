"""
POST /api/rank — Main ML ranking endpoint.

Flow:
1. Receive stage_id, stage_type, pr_id from Node.js
2. Fetch the PR's changedPaths from MongoDB
3. Fetch all eligible reviewers (active, verified, non-owner)
4. Run TF-IDF ranking
5. Return ranked reviewer IDs → Node.js assigns them to the stage
"""
import logging
from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient

from ..schemas.request import RankRequest
from ..core.ranker import ReviewerRanker
from ..config import settings

logger = logging.getLogger("assign")
router = APIRouter()

# Shared ranker instance
ranker = ReviewerRanker(top_n=settings.TOP_REVIEWERS_PER_STAGE)


def get_db():
    """Returns a fresh Motor DB handle per request."""
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    return client, client[settings.MONGODB_DB_NAME]


@router.post("/rank")
async def rank_reviewers(request: RankRequest):
    """
    Ranks the best reviewers for a given PR stage.

    Returns reviewer_ids sorted by expertise + workload score.
    Node.js then calls PATCH /api/v1/stages/:stageId/assign with these IDs.
    """
    # ── Validate ObjectIds ────────────────────────────────────────────────────
    try:
        pr_oid    = ObjectId(request.pr_id)
        stage_oid = ObjectId(request.stage_id)
        repo_oid  = ObjectId(request.repo_id)
    except InvalidId as e:
        raise HTTPException(status_code=400, detail=f"Invalid ObjectId: {e}")

    client, db = get_db()

    try:
        # ── Fetch the PR to get changedPaths ──────────────────────────────────
        pr = await db.pullrequests.find_one(
            {"_id": pr_oid},
            {"changedPaths": 1, "authorId": 1, "repoId": 1},
        )
        if not pr:
            raise HTTPException(status_code=404, detail="Pull Request not found")

        changed_paths = pr.get("changedPaths", [])
        author_id     = pr.get("authorId")

        # ── Fetch the repo to get the member list and team lead ───────────────
        repo = await db.repos.find_one(
            {"_id": repo_oid},
            {"members": 1, "ownerId": 1, "teamLeadId": 1},
        )
        if not repo:
            raise HTTPException(status_code=404, detail="Repository not found")

        repo_member_ids = repo.get("members", [])

        # ── Build reviewer filter ─────────────────────────────────────────────
        # Prioritize active, verified reviewers / developer_reviewers under capacity (<10 open reviews)
        # Exclude the PR author (they shouldn't review their own code)
        exclude_ids = [author_id] if author_id else []

        reviewer_filter = {
            "_id": {
                "$in":  [m for m in repo_member_ids if m not in exclude_ids],
                "$nin": exclude_ids,
            },
            "isActive":   True,
            "isVerified": True,
            "role":       {"$in": ["reviewer", "developer_reviewer", "team_lead"]},
            "currentOpenReviews": {"$lt": 10},
        }

        reviewers = await db.users.find(
            reviewer_filter,
            {
                "_id":               1,
                "fullName":          1,
                "commitHistory":     1,
                "currentOpenReviews":1,
                "expertiseTags":     1,
                "role":              1,
            },
        ).to_list(length=200)  # cap at 200 for performance

        # Fallback to any active verified member (except author) if no dedicated reviewers found
        if not reviewers:
            fallback_filter = {
                "_id": {
                    "$in":  [m for m in repo_member_ids if m not in exclude_ids],
                    "$nin": exclude_ids,
                },
                "isActive":   True,
                "isVerified": True,
            }
            reviewers = await db.users.find(
                fallback_filter,
                {
                    "_id":               1,
                    "fullName":          1,
                    "commitHistory":     1,
                    "currentOpenReviews":1,
                    "expertiseTags":     1,
                    "role":              1,
                },
            ).to_list(length=200)

        # Fallback directly to repo Team Lead / Owner if no eligible peer reviewer found
        if not reviewers:
            lead_id = repo.get("teamLeadId") or repo.get("ownerId")
            if lead_id and lead_id != author_id:
                logger.info(f"Fallback to Team Lead {lead_id} for stage {request.stage_id}")
                return {
                    "success": True,
                    "data": {
                        "stage_id":    request.stage_id,
                        "reviewer_ids": [str(lead_id)],
                        "scores":       {str(lead_id): 1.0},
                        "message":      "Fallback to Team Lead — no eligible peer reviewer found",
                    },
                    "message": "Assigned to Team Lead as fallback",
                }

            logger.warning(f"No eligible reviewers found for stage {request.stage_id}")
            return {
                "success": True,
                "data": {
                    "stage_id": request.stage_id,
                    "reviewer_ids": [],
                    "scores": {},
                    "message": "No eligible reviewers found",
                },
                "message": "Ranking complete — no reviewers available",
            }

        # ── Run TF-IDF ranking ────────────────────────────────────────────────
        ranked = ranker.rank(changed_paths, reviewers, request.stage_type)

        reviewer_ids = [r["reviewer_id"] for r in ranked]
        scores       = {r["reviewer_id"]: r["score"] for r in ranked}

        logger.info(
            f"Ranked reviewers for stage {request.stage_id} ({request.stage_type}): "
            f"{reviewer_ids}"
        )

        return {
            "success": True,
            "data": {
                "stage_id":    request.stage_id,
                "reviewer_ids": reviewer_ids,
                "scores":       scores,
            },
            "message": f"Ranked {len(ranked)} reviewer(s) successfully",
        }

    finally:
        client.close()


@router.get("/health")
async def health():
    return {"status": "ok", "service": "waypoint-ml"}
