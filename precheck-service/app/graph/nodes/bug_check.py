"""
bug_check node — detects runtime bugs and logic errors using LangChain + Groq.
Runs in parallel with rule_check and security_check.
"""
from langchain_core.prompts import ChatPromptTemplate
from ..state import ReviewState
from ._llm import get_llm, parse_json_safely

BUG_CHECK_PROMPT = ChatPromptTemplate.from_messages([
    (
        "system",
        """You are an expert bug detection assistant. Analyze the provided code diff for runtime bugs and logic errors.

Look for:
1. Null/undefined dereferences without null checks
2. Off-by-one errors in loops or array access
3. Unhandled promise rejections or missing await keywords
4. Race conditions or incorrect async/await usage
5. Incorrect comparison (= instead of ==, or == instead of ===)
6. Infinite loops or missing loop termination
7. Missing return statements in functions expected to return values
8. Resource leaks (unclosed connections, files, or streams)

Respond ONLY with valid JSON. No explanation.
Format: {{"bugs": [{{"rule": "bug-type", "line": <number or null>, "description": "precise description of the bug", "severity": "BLOCKING or WARNING"}}]}}

BLOCKING: null dereference, missing await, unhandled rejection, infinite loop.
WARNING: everything else.
If nothing found: {{"bugs": []}}""",
    ),
    ("human", "Code diff to analyze:\n\n{diff_text}"),
])


async def bug_check_node(state: ReviewState) -> dict:
    """LangChain call for bug detection — writes bug_findings to state."""
    try:
        llm = get_llm()
        chain = BUG_CHECK_PROMPT | llm
        response = await chain.ainvoke({"diff_text": state["diff_text"][:6000]})
        bugs = parse_json_safely(response.content, "bugs")
        normalized = [
            {
                "type": "BUG",
                "rule": b.get("rule", "unknown-bug"),
                "line": b.get("line"),
                "description": b.get("description", ""),
                "severity": b.get("severity", "WARNING"),
            }
            for b in bugs
            if isinstance(b, dict)
        ]
        return {"bug_findings": normalized}
    except Exception:
        return {"bug_findings": []}
