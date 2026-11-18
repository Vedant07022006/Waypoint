"""
rule_check node — checks for code rule violations using LangChain + Groq.
Runs in parallel with bug_check and security_check.
"""
import re
from langchain_core.prompts import ChatPromptTemplate
from ..state import ReviewState
from ._llm import get_llm, parse_json_safely

RULE_CHECK_PROMPT = ChatPromptTemplate.from_messages([
    (
        "system",
        """You are a strict code rule auditor. Analyze the given code diff for rule violations.

Rules to enforce:
1. No hardcoded secrets, API keys, passwords, JWT tokens, or credentials
2. All async functions must have try/catch or equivalent error handling
3. No console.log(), print() or debug logging in production code paths
4. No single function exceeding 50 lines of code
5. No TODO or FIXME comments left in production code

Respond ONLY with a valid JSON object. No explanation, no prose.
Format: {{"violations": [{{"rule": "rule-name", "line": <number or null>, "description": "what was found", "severity": "BLOCKING or WARNING"}}]}}

Hardcoded secrets = BLOCKING. Everything else = WARNING.
If nothing found: {{"violations": []}}""",
    ),
    ("human", "Code diff to analyze:\n\n{diff_text}"),
])


def scan_rule_heuristics(diff_text: str) -> list:
    """Deterministic static regex scanner for critical rules."""
    findings = []
    lines = diff_text.splitlines()

    for idx, line in enumerate(lines, start=1):
        if not line.startswith("+") or line.startswith("+++"):
            continue
        code = line[1:].strip()

        # 1. Hardcoded Secret / Token / Password Pattern
        if re.search(r'(?:jwt_secret|secret_key|api_key|password|token)\s*=\s*["\'][a-zA-Z0-9_\-.~!@#$%^&*]{6,}["\']', code, re.IGNORECASE):
            findings.append({
                "type": "RULE",
                "rule": "no-hardcoded-secrets",
                "line": idx,
                "description": "Hardcoded secret or credential detected in source code.",
                "severity": "BLOCKING",
            })

        # 2. Console.log / Debugger Pattern
        if re.search(r'\bconsole\.(?:log|debug|info)\s*\(|\bdebugger\s*;', code):
            findings.append({
                "type": "RULE",
                "rule": "no-console-log",
                "line": idx,
                "description": "Console debug logging or debugger statement found in production code path.",
                "severity": "WARNING",
            })

    return findings


async def rule_check_node(state: ReviewState) -> dict:
    """LangChain call for rule compliance with deterministic fallback."""
    heuristic_findings = scan_rule_heuristics(state.get("diff_text", ""))
    llm_findings = []

    try:
        llm = get_llm()
        chain = RULE_CHECK_PROMPT | llm
        response = await chain.ainvoke({"diff_text": state["diff_text"][:6000]})
        violations = parse_json_safely(response.content, "violations")
        llm_findings = [
            {
                "type": "RULE",
                "rule": v.get("rule", "unknown-rule"),
                "line": v.get("line"),
                "description": v.get("description", ""),
                "severity": v.get("severity", "WARNING"),
            }
            for v in violations
            if isinstance(v, dict)
        ]
    except Exception:
        pass

    # Merge heuristic and LLM findings
    combined = heuristic_findings + llm_findings
    seen = set()
    dedup = []
    for f in combined:
        key = (f["rule"], f.get("description", "")[:40])
        if key not in seen:
            seen.add(key)
            dedup.append(f)

    return {"rule_violations": dedup}
