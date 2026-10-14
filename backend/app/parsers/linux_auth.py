import hashlib
import re
from datetime import datetime, timezone
from typing import List, Optional, Tuple
from ..models.events import (
    EventTypeEnum,
    NormalizedEvent,
    OutcomeEnum,
    ParseSummary,
    SourceTypeEnum,
)
from .base import BaseParser, MAX_EVENTS_COUNT

MONTHS = {
    "Jan": 1, "Feb": 2, "Mar": 3, "Apr": 4, "May": 5, "Jun": 6,
    "Jul": 7, "Aug": 8, "Sep": 9, "Oct": 10, "Nov": 11, "Dec": 12
}
BSD_SYSLOG_REGEX = re.compile(
    r"^([A-Z][a-z]{2})\s+([0-9]{1,2})\s+([0-9]{2}:[0-9]{2}:[0-9]{2})\s+([^\s]+)\s+([^:]+):\s*(.*)$"
)
ISO_SYSLOG_REGEX = re.compile(
    r"^([0-9]{4}-[0-9]{2}-[0-9]{2}[T\s][0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]+)?(?:Z|[+-][0-9]{2}:?[0-9]{2})?)\s+([^\s]+)\s+([^:]+):\s*(.*)$"
)

SSH_FAILED_REGEX = re.compile(
    r"Failed\s+(?:password|publickey|none)\s+for\s+(?:invalid\s+user\s+)?([^\s]+)\s+from\s+([0-9a-fA-F:.]+)\s+port\s+([0-9]+)",
    re.IGNORECASE
)
SSH_ACCEPTED_REGEX = re.compile(
    r"Accepted\s+(?:password|publickey|keyboard-interactive/pam)\s+for\s+([^\s]+)\s+from\s+([0-9a-fA-F:.]+)\s+port\s+([0-9]+)",
    re.IGNORECASE
)
SSH_INVALID_USER_REGEX = re.compile(
    r"Invalid\s+user\s+([^\s]+)\s+from\s+([0-9a-fA-F:.]+)",
    re.IGNORECASE
)
SUDO_COMMAND_REGEX = re.compile(
    r"([^\s]+)\s*:\s*TTY=([^\s]+)\s*;\s*PWD=([^\s]+)\s*;\s*USER=([^\s]+)\s*;\s*COMMAND=(.*)",
    re.IGNORECASE
)
PAM_SESSION_OPEN_REGEX = re.compile(
    r"pam_unix\([^)]+\):\s*session opened for user ([^\s\(]+)(?:\(uid=[0-9]+\))?",
    re.IGNORECASE
)
PAM_SESSION_CLOSED_REGEX = re.compile(
    r"pam_unix\([^)]+\):\s*session closed for user ([^\s\(]+)",
    re.IGNORECASE
)


class LinuxAuthParser(BaseParser):
    """Robust parser for Linux /var/log/auth.log and /var/log/secure syslog files."""

    def __init__(self, fallback_year: Optional[int] = None):
        self.fallback_year = fallback_year or datetime.now(timezone.utc).year

    def parse_timestamp(self, ts_str: str) -> Optional[datetime]:
        try:
            cleaned = ts_str.replace(" ", "T")
            if cleaned.endswith("Z"):
                cleaned = cleaned[:-1] + "+00:00"
            return datetime.fromisoformat(cleaned).astimezone(timezone.utc)
        except Exception:
            pass

        parts = ts_str.split()
        if len(parts) >= 3 and parts[0] in MONTHS:
            try:
                month = MONTHS[parts[0]]
                day = int(parts[1])
                h, m, s = [int(x) for x in parts[2].split(":")]
                return datetime(
                    year=self.fallback_year,
                    month=month,
                    day=day,
                    hour=h,
                    minute=m,
                    second=s,
                    tzinfo=timezone.utc,
                )
            except Exception:
                return None
        return None

    def parse_content(self, text: str, source_name: str = "") -> Tuple[List[NormalizedEvent], ParseSummary]:
        lines = text.splitlines()
        summary = ParseSummary(
            total_lines=len(lines),
            source_type=SourceTypeEnum.LINUX_AUTH.value
        )
        events: List[NormalizedEvent] = []

        for line_idx, raw_line in enumerate(lines):
            line = raw_line.strip()
            if not line or line.startswith("#"):
                summary.skipped_lines += 1
                continue

            if len(events) >= MAX_EVENTS_COUNT:
                summary.errors.append(f"Reached maximum safe event processing limit ({MAX_EVENTS_COUNT}).")
                break

            parsed_event = self._parse_line(line, line_idx, source_name)
            if parsed_event:
                events.append(parsed_event)
                summary.parsed_events += 1
            else:
                summary.malformed_lines += 1

        return events, summary

    def _parse_line(self, line: str, line_idx: int, source_name: str) -> Optional[NormalizedEvent]:
        bsd_match = BSD_SYSLOG_REGEX.match(line)
        iso_match = ISO_SYSLOG_REGEX.match(line) if not bsd_match else None

        dt: Optional[datetime] = None
        hostname: Optional[str] = None
        process: Optional[str] = None
        message: Optional[str] = None

        if bsd_match:
            month_str, day_str, time_str, hostname, process, message = bsd_match.groups()
            dt = self.parse_timestamp(f"{month_str} {day_str} {time_str}")
        elif iso_match:
            ts_str, hostname, process, message = iso_match.groups()
            dt = self.parse_timestamp(ts_str)
        else:
            return None

        if not dt:
            return None

        event_type = EventTypeEnum.UNKNOWN
        outcome = OutcomeEnum.UNKNOWN
        username: Optional[str] = None
        source_ip: Optional[str] = None
        attributes = {"process": process, "line_index": line_idx}

        m_failed = SSH_FAILED_REGEX.search(message)
        if m_failed:
            username, source_ip, port = m_failed.groups()
            event_type = EventTypeEnum.SSH_LOGIN_FAILED
            outcome = OutcomeEnum.FAILURE
            attributes["port"] = int(port)
            if "invalid user" in message.lower():
                attributes["is_invalid_user"] = True

        elif (m_acc := SSH_ACCEPTED_REGEX.search(message)):
            username, source_ip, port = m_acc.groups()
            event_type = EventTypeEnum.SSH_LOGIN_SUCCESS
            outcome = OutcomeEnum.SUCCESS
            attributes["port"] = int(port)

        elif (m_inv := SSH_INVALID_USER_REGEX.search(message)):
            username, source_ip = m_inv.groups()
            event_type = EventTypeEnum.INVALID_USER
            outcome = OutcomeEnum.FAILURE
            attributes["is_invalid_user"] = True

        elif (m_sudo := SUDO_COMMAND_REGEX.search(message)):
            target_account, tty, pwd, elev_user, cmd = m_sudo.groups()
            username = target_account.strip()
            event_type = EventTypeEnum.SUDO_ELEVATION
            outcome = OutcomeEnum.SUCCESS
            attributes["target_user"] = elev_user.strip()
            attributes["command"] = cmd.strip()
            attributes["pwd"] = pwd.strip()
            attributes["tty"] = tty.strip()

        elif (m_open := PAM_SESSION_OPEN_REGEX.search(message)):
            username = m_open.group(1).strip()
            event_type = EventTypeEnum.SESSION_OPENED
            outcome = OutcomeEnum.SUCCESS

        elif (m_close := PAM_SESSION_CLOSED_REGEX.search(message)):
            username = m_close.group(1).strip()
            event_type = EventTypeEnum.SESSION_CLOSED
            outcome = OutcomeEnum.SUCCESS

        else:
            event_type = EventTypeEnum.UNKNOWN
            outcome = OutcomeEnum.UNKNOWN

        hash_input = f"{dt.isoformat()}|{line_idx}|{line}"
        event_id = "ev-" + hashlib.sha256(hash_input.encode("utf-8")).hexdigest()[:16]

        return NormalizedEvent(
            event_id=event_id,
            timestamp=dt,
            source_type=SourceTypeEnum.LINUX_AUTH,
            event_type=event_type,
            source_ip=source_ip,
            username=username,
            hostname=hostname,
            outcome=outcome,
            message=message,
            raw_event_reference=line,
            attributes=attributes,
        )
