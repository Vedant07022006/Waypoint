"""
parse_diff node — first node in the pipeline.
Summarizes the diff into a compact readable description to reduce LLM context.
"""
import re
from ..state import ReviewState


def parse_diff_node(state: ReviewState) -> dict:
    """
    Parses the unified diff and produces a human-readable summary.
    This reduces token cost for the subsequent LangChain calls.
    """
    diff_text = state.get("diff_text", "")
    lines = diff_text.splitlines()

    added_lines   = [l[1:].strip() for l in lines if l.startswith("+") and not l.startswith("+++")]
    removed_lines = [l[1:].strip() for l in lines if l.startswith("-") and not l.startswith("---")]

    # Extract changed file names from diff headers
    file_headers = [l for l in lines if l.startswith("diff --git") or l.startswith("+++")]
    files_changed = []
    for header in file_headers:
        match = re.search(r'b/(.+)', header)
        if match:
            files_changed.append(match.group(1))

    summary = (
        f"Files changed: {', '.join(set(files_changed)) or 'unknown'}\n"
        f"Lines added: {len(added_lines)} | Lines removed: {len(removed_lines)}\n\n"
        f"Added code (first 100 lines):\n" +
        "\n".join(added_lines[:100])
    )

    return {"parsed_summary": summary}
