from typing import List, Tuple
from ..models.events import NormalizedEvent, ParseSummary
from .base import BaseParser, MAX_FILE_SIZE_BYTES, MAX_EVENTS_COUNT, ParserError
from .linux_auth import LinuxAuthParser
from .jsonl_parser import JSONLParser


def parse_log_data(content: str, filename: str = "") -> Tuple[List[NormalizedEvent], ParseSummary]:
    """Auto-detect format (JSONL vs Linux auth) and parse safely."""
    if len(content.encode("utf-8")) > MAX_FILE_SIZE_BYTES:
        raise ParserError(f"File size exceeds safety limit of {MAX_FILE_SIZE_BYTES // (1024 * 1024)} MB.")

    first_few_lines = [line.strip() for line in content.splitlines()[:10] if line.strip()]
    is_jsonl = False
    if filename.endswith(".jsonl") or filename.endswith(".json"):
        is_jsonl = True
    elif first_few_lines and all(l.startswith("{") and l.endswith("}") for l in first_few_lines[:3]):
        is_jsonl = True

    if is_jsonl:
        parser = JSONLParser()
    else:
        parser = LinuxAuthParser()

    return parser.parse_content(content, source_name=filename)


__all__ = ["BaseParser", "LinuxAuthParser", "JSONLParser", "parse_log_data", "ParserError"]
