from pydantic import BaseModel
from typing import Optional


class RankRequest(BaseModel):
    stage_id: str
    stage_type: str
    pr_id: str
    repo_id: str
    # Optional: if provided, exclude author from candidates
    author_id: Optional[str] = None


class RankResponse(BaseModel):
    success: bool
    data: dict
    message: str
