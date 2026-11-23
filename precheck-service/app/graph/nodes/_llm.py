"""
Shared LLM instance and JSON parsing utility for all check nodes.
"""
import json
import re
from langchain_groq import ChatGroq
from ...config import settings

# Single shared LLM instance — all check nodes use this
_llm: ChatGroq | None = None


def get_llm() -> ChatGroq:
    global _llm
    if _llm is None:
        _llm = ChatGroq(
            model=settings.GROQ_MODEL,
            groq_api_key=settings.GROQ_API_KEY,
            temperature=0,
            max_retries=2,
        )
    return _llm


def parse_json_safely(text: str, fallback_key: str = "items") -> list:
    """
    Robustly extracts a JSON list from LLM output even if:
    - Wrapped in ```json ... ``` code blocks
    - Has leading/trailing prose text
    Returns an empty list on any parse failure.
    """
    # 1. Try direct JSON parse of the whole string
    try:
        data = json.loads(text)
        if isinstance(data, dict):
            # Return the first list value found
            for v in data.values():
                if isinstance(v, list):
                    return v
        if isinstance(data, list):
            return data
    except (json.JSONDecodeError, ValueError):
        pass

    # 2. Try extracting from ```json ... ``` block
    match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', text)
    if match:
        try:
            data = json.loads(match.group(1))
            if isinstance(data, dict):
                for v in data.values():
                    if isinstance(v, list):
                        return v
            if isinstance(data, list):
                return data
        except (json.JSONDecodeError, ValueError):
            pass

    # 3. Try finding first {...} or [...] block
    match = re.search(r'(\{[\s\S]*\}|\[[\s\S]*\])', text)
    if match:
        try:
            data = json.loads(match.group(1))
            if isinstance(data, dict):
                for v in data.values():
                    if isinstance(v, list):
                        return v
            if isinstance(data, list):
                return data
        except (json.JSONDecodeError, ValueError):
            pass

    return []
