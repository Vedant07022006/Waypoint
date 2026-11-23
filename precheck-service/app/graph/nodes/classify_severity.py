"""
classify_severity node — final node before the graph ends.
Determines overall severity and generates a human-readable summary.
"""
from ..state import ReviewState


def classify_severity_node(state: ReviewState) -> dict:
    """
    Determines the overall worst-case severity and builds a summary string.

    Severity hierarchy: BLOCKING > WARNING > PASS
    - Any BLOCKING issue → severity = BLOCKING
    - No BLOCKING but WARNING exists → severity = WARNING
    - No issues at all → severity = PASS
    """
    issues = state.get("all_issues", [])

    if not issues:
        return {
            "severity": "PASS",
            "final_summary": "No issues found. Code looks clean.",
        }

    blocking = [i for i in issues if i.get("severity") == "BLOCKING"]
    warnings  = [i for i in issues if i.get("severity") == "WARNING"]
    info      = [i for i in issues if i.get("severity") == "INFO"]

    # Determine overall severity
    if blocking:
        severity = "BLOCKING"
    elif warnings:
        severity = "WARNING"
    else:
        severity = "PASS"

    # Build human-readable summary
    parts = []
    if blocking:
        parts.append(f"{len(blocking)} blocking issue{'s' if len(blocking) > 1 else ''}")
    if warnings:
        parts.append(f"{len(warnings)} warning{'s' if len(warnings) > 1 else ''}")
    if info:
        parts.append(f"{len(info)} info item{'s' if len(info) > 1 else ''}")

    total = len(issues)
    summary = f"{total} issue{'s' if total > 1 else ''} found: {', '.join(parts)}."

    if severity == "BLOCKING":
        summary += " This PR has blocking issues that must be resolved before review."
    elif severity == "WARNING":
        summary += " No blocking issues — review can proceed with warnings noted."

    return {
        "severity": severity,
        "final_summary": summary,
    }
