"""
LangGraph pipeline definition for the pre-check service.

Architecture:
                    ┌─────────────┐
                    │ parse_diff  │  (summarize diff)
                    └──────┬──────┘
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
    ┌────────────┐  ┌────────────┐  ┌──────────────┐
    │ rule_check │  │ bug_check  │  │security_check│  (parallel LLM calls)
    └─────┬──────┘  └─────┬──────┘  └──────┬───────┘
           └───────────────┼───────────────┘
                           ▼
                  ┌──────────────┐
                  │ merge_results│  (fan-in + de-duplicate)
                  └──────┬───────┘
                         ▼
               ┌──────────────────┐
               │classify_severity │  (final severity + summary)
               └──────────────────┘
"""
from langgraph.graph import StateGraph, END
from .state import ReviewState
from .nodes.parse_diff       import parse_diff_node
from .nodes.rule_check       import rule_check_node
from .nodes.bug_check        import bug_check_node
from .nodes.security_check   import security_check_node
from .nodes.merge_results    import merge_results_node
from .nodes.classify_severity import classify_severity_node


def build_pipeline():
    """Builds and compiles the LangGraph review pipeline."""
    builder = StateGraph(ReviewState)

    # Register all nodes
    builder.add_node("parse_diff",         parse_diff_node)
    builder.add_node("rule_check",         rule_check_node)
    builder.add_node("bug_check",          bug_check_node)
    builder.add_node("security_check",     security_check_node)
    builder.add_node("merge_results",      merge_results_node)
    builder.add_node("classify_severity",  classify_severity_node)

    # Entry point
    builder.set_entry_point("parse_diff")

    # Fan-out: parse_diff → all three checks in parallel
    builder.add_edge("parse_diff",   "rule_check")
    builder.add_edge("parse_diff",   "bug_check")
    builder.add_edge("parse_diff",   "security_check")

    # Fan-in: all three checks → merge_results
    # LangGraph waits for ALL predecessors before running merge_results
    builder.add_edge("rule_check",     "merge_results")
    builder.add_edge("bug_check",      "merge_results")
    builder.add_edge("security_check", "merge_results")

    # Final classification → end
    builder.add_edge("merge_results",     "classify_severity")
    builder.add_edge("classify_severity", END)

    return builder.compile()


# Compiled pipeline — import this in the route handler
pipeline = build_pipeline()
