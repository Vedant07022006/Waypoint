"""
merge_results node — fan-in after the three parallel checks.
Combines rule_violations + bug_findings + security_findings into one flat list.
Runs after ALL three parallel nodes have completed (LangGraph guarantees this).
"""
from ..state import ReviewState


def merge_results_node(state: ReviewState) -> dict:
    """
    Merges findings from all three parallel check nodes into a single list.
    Because the state fields use Annotated[list, operator.add], they already
    contain concatenated results from all parallel branches by the time this runs.
    """
    all_issues = (
        state.get("rule_violations", []) +
        state.get("bug_findings", []) +
        state.get("security_findings", [])
    )

    # De-duplicate by (type, description) to avoid the same issue being
    # reported twice if multiple checks detect it
    seen = set()
    deduplicated = []
    for issue in all_issues:
        key = (issue.get("type"), issue.get("description", ""))
        if key not in seen:
            seen.add(key)
            deduplicated.append(issue)

    return {"all_issues": deduplicated}
