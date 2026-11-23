from pydantic import BaseModel, Field


class PrecheckRequest(BaseModel):
    pr_id: str = Field(..., description="MongoDB ObjectId of the Pull Request")
    diff_text: str = Field(..., description="Unified diff string of the PR")
    callback_url: str = Field(..., description="Node.js callback URL for results")


class PrecheckIssue(BaseModel):
    type: str           # RULE | BUG | SECURITY
    rule: str = ""
    line: int | None = None
    description: str
    severity: str       # BLOCKING | WARNING | INFO


class PrecheckResponse(BaseModel):
    success: bool
    data: dict
    message: str
