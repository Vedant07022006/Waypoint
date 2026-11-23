"""
security_check node — detects security vulnerabilities using LangChain + Groq.
Runs in parallel with rule_check and bug_check.
"""
import re
from langchain_core.prompts import ChatPromptTemplate
from ..state import ReviewState
from ._llm import get_llm, parse_json_safely

SECURITY_CHECK_PROMPT = ChatPromptTemplate.from_messages([
    (
        "system",
        """You are a cybersecurity code reviewer. Analyze the code diff for security vulnerabilities.

Look for:
1. SQL/NoSQL injection vulnerabilities (unsanitized user input in queries)
2. Cross-Site Scripting (XSS) — unescaped user input rendered to HTML
3. Insecure direct object reference (IDOR) — no authorization check before data access
4. Broken authentication — missing token validation, weak session management
5. Sensitive data exposure — PII, passwords, or keys in logs or responses
6. Insecure deserialization of user-supplied data
7. Missing input validation or rate limiting on public endpoints
8. Use of deprecated or vulnerable cryptographic algorithms (MD5, SHA1, DES)

Respond ONLY with valid JSON. No explanation, no prose.
Format: {{"vulnerabilities": [{{"rule": "vuln-type", "line": <number or null>, "description": "precise description", "severity": "BLOCKING or WARNING"}}]}}

BLOCKING: injection, missing auth check, sensitive data exposure, broken authentication.
WARNING: everything else.
If nothing found: {{"vulnerabilities": []}}""",
    ),
    ("human", "Code diff to analyze:\n\n{diff_text}"),
])


def scan_security_heuristics(diff_text: str) -> list:
    """Deterministic scanner for critical security patterns."""
    findings = []
    lines = diff_text.splitlines()

    for idx, line in enumerate(lines, start=1):
        if not line.startswith("+") or line.startswith("+++"):
            continue
        code = line[1:].strip()

        # Insecure eval / Function constructor
        if re.search(r'\beval\s*\(|\bnew\s+Function\s*\(', code):
            findings.append({
                "type": "SECURITY",
                "rule": "no-eval",
                "line": idx,
                "description": "Dynamic code execution via eval() or Function constructor is unsafe.",
                "severity": "BLOCKING",
            })

        # NoSQL injection / $where pattern
        if re.search(r'\$where\b|\$regex.*req\.(?:body|query|params)', code):
            findings.append({
                "type": "SECURITY",
                "rule": "nosql-injection-risk",
                "line": idx,
                "description": "Potential NoSQL injection vulnerability with unsanitized request parameter.",
                "severity": "BLOCKING",
            })

    return findings


async def security_check_node(state: ReviewState) -> dict:
    """LangChain call for security vulnerabilities with deterministic fallback."""
    heuristic_findings = scan_security_heuristics(state.get("diff_text", ""))
    llm_findings = []

    try:
        llm = get_llm()
        chain = SECURITY_CHECK_PROMPT | llm
        response = await chain.ainvoke({"diff_text": state["diff_text"][:6000]})
        vulns = parse_json_safely(response.content, "vulnerabilities")
        llm_findings = [
            {
                "type": "SECURITY",
                "rule": v.get("rule", "unknown-vulnerability"),
                "line": v.get("line"),
                "description": v.get("description", ""),
                "severity": v.get("severity", "WARNING"),
            }
            for v in vulns
            if isinstance(v, dict)
        ]
    except Exception:
        pass

    combined = heuristic_findings + llm_findings
    seen = set()
    dedup = []
    for f in combined:
        key = (f["rule"], f.get("description", "")[:40])
        if key not in seen:
            seen.add(key)
            dedup.append(f)

    return {"security_findings": dedup}
