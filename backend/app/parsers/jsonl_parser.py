import hashlib
import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from ..models.events import (
    EventTypeEnum,
    NormalizedEvent,
    OutcomeEnum,
    ParseSummary,
    SourceTypeEnum,
)
from .base import BaseParser, MAX_EVENTS_COUNT


class JSONLParser(BaseParser):
    """Parser for structured JSON Lines (.jsonl) security events."""

    def parse_timestamp(self, ts_raw: Any) -> Optional[datetime]:
        if isinstance(ts_raw, (int, float)):
            if ts_raw > 1e11:
                return datetime.fromtimestamp(ts_raw / 1000.0, tz=timezone.utc)
            return datetime.fromtimestamp(ts_raw, tz=timezone.utc)

        if isinstance(ts_raw, str):
            try:
                cleaned = ts_raw.replace("Z", "+00:00")
                return datetime.fromisoformat(cleaned).astimezone(timezone.utc)
            except Exception:
                pass
        return None

    def normalize_event_type(self, raw_type: Optional[str]) -> EventTypeEnum:
        if not raw_type:
            return EventTypeEnum.UNKNOWN
        t = str(raw_type).lower().replace(" ", "_").replace("-", "_")
        for val in EventTypeEnum:
            if val.value == t or val.value in t:
                return val
        if "fail" in t or "denied" in t:
            return EventTypeEnum.SSH_LOGIN_FAILED
        if "success" in t or "accept" in t:
            return EventTypeEnum.SSH_LOGIN_SUCCESS
        if "sudo" in t or "priv" in t:
            return EventTypeEnum.SUDO_ELEVATION
        return EventTypeEnum.UNKNOWN

    def normalize_outcome(self, raw_outcome: Optional[str]) -> OutcomeEnum:
        if not raw_outcome:
            return OutcomeEnum.UNKNOWN
        o = str(raw_outcome).lower()
        if o in ("success", "ok", "allowed", "0", "true", "pass"):
            return OutcomeEnum.SUCCESS
        if o in ("failure", "fail", "failed", "denied", "error", "false"):
            return OutcomeEnum.FAILURE
        return OutcomeEnum.UNKNOWN

    def parse_content(self, text: str, source_name: str = "") -> Tuple[List[NormalizedEvent], ParseSummary]:
        lines = text.splitlines()
        summary = ParseSummary(
            total_lines=len(lines),
            source_type=SourceTypeEnum.JSONL.value
        )
        events: List[NormalizedEvent] = []

        for line_idx, raw_line in enumerate(lines):
            line = raw_line.strip()
            if not line or line.startswith("//"):
                summary.skipped_lines += 1
                continue

            if len(events) >= MAX_EVENTS_COUNT:
                summary.errors.append(f"Reached maximum safe event processing limit ({MAX_EVENTS_COUNT}).")
                break

            try:
                data = json.loads(line)
                if not isinstance(data, dict):
                    summary.malformed_lines += 1
                    continue
            except json.JSONDecodeError:
                summary.malformed_lines += 1
                continue

            ts_val = data.get("timestamp") or data.get("@timestamp") or data.get("time") or data.get("datetime")
            dt = self.parse_timestamp(ts_val)
            if not dt:
                summary.malformed_lines += 1
                continue

            source_ip = (
                data.get("source_ip") or data.get("src_ip") or data.get("client_ip") or data.get("ip")
            )
            username = (
                data.get("username") or data.get("user") or data.get("account") or data.get("target_user")
            )
            hostname = (
                data.get("hostname") or data.get("host") or data.get("server") or data.get("node")
            )
            raw_event_type = (
                data.get("event_type") or data.get("action") or data.get("type") or data.get("category")
            )
            raw_outcome = (
                data.get("outcome") or data.get("status") or data.get("result")
            )
            message = (
                data.get("message") or data.get("msg") or data.get("description") or f"Event {raw_event_type or 'record'}"
            )

            event_type = self.normalize_event_type(raw_event_type)
            outcome = self.normalize_outcome(raw_outcome)

            if outcome == OutcomeEnum.UNKNOWN:
                if event_type in (EventTypeEnum.SSH_LOGIN_FAILED, EventTypeEnum.INVALID_USER):
                    outcome = OutcomeEnum.FAILURE
                elif event_type in (EventTypeEnum.SSH_LOGIN_SUCCESS, EventTypeEnum.SESSION_OPENED):
                    outcome = OutcomeEnum.SUCCESS

            hash_input = f"{dt.isoformat()}|{line_idx}|{json.dumps(data, sort_keys=True)}"
            event_id = "ev-" + hashlib.sha256(hash_input.encode("utf-8")).hexdigest()[:16]

            std_keys = {
                "timestamp", "@timestamp", "time", "datetime",
                "source_ip", "src_ip", "client_ip", "ip",
                "username", "user", "account", "target_user",
                "hostname", "host", "server", "node",
                "event_type", "action", "type", "category",
                "outcome", "status", "result",
                "message", "msg", "description"
            }
            attributes = {k: v for k, v in data.items() if k not in std_keys}
            attributes["line_index"] = line_idx

            event = NormalizedEvent(
                event_id=event_id,
                timestamp=dt,
                source_type=SourceTypeEnum.JSONL,
                event_type=event_type,
                source_ip=str(source_ip) if source_ip else None,
                username=str(username) if username else None,
                hostname=str(hostname) if hostname else None,
                outcome=outcome,
                message=str(message),
                raw_event_reference=line,
                attributes=attributes,
            )
            events.append(event)
            summary.parsed_events += 1

        return events, summary
