from typing import TypedDict, Annotated
import operator


class ReviewState(TypedDict):
    """
    Shared state that flows through the entire LangGraph pipeline.
    Each node reads from this and returns a partial dict to update it.
    """
    # Input fields (set at graph entry)
    pr_id: str
    diff_text: str
    callback_url: str

    # Set by parse_diff node
    parsed_summary: str          # Human-readable summary of what changed

    # Set by the three parallel check nodes
    # Using Annotated with operator.add so parallel writes are MERGED, not overwritten
    rule_violations: Annotated[list, operator.add]
    bug_findings:    Annotated[list, operator.add]
    security_findings: Annotated[list, operator.add]

    # Set by classify_severity node
    severity: str                # BLOCKING | WARNING | PASS
    final_summary: str
    all_issues: list             # Flat merged list for callback
