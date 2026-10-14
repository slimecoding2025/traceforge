from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class OutcomeEnum(str, Enum):
    SUCCESS = "success"
    FAILURE = "failure"
    UNKNOWN = "unknown"


class SourceTypeEnum(str, Enum):
    LINUX_AUTH = "linux_auth"
    JSONL = "jsonl"
    SYNTHETIC = "synthetic"


class EventTypeEnum(str, Enum):
    SSH_LOGIN_FAILED = "ssh_login_failed"
    SSH_LOGIN_SUCCESS = "ssh_login_success"
    INVALID_USER = "invalid_user"
    SUDO_ELEVATION = "sudo_elevation"
    SESSION_OPENED = "session_opened"
    SESSION_CLOSED = "session_closed"
    PASSWORD_CHANGE = "password_change"
    SERVICE_STARTED = "service_started"
    UNKNOWN = "unknown"


class NormalizedEvent(BaseModel):
    event_id: str = Field(..., description="Unique event identifier")
    timestamp: datetime = Field(..., description="UTC-aware timestamp of the event")
    source_type: SourceTypeEnum = Field(..., description="Origin parser format")
    event_type: EventTypeEnum = Field(..., description="Normalized taxonomy event type")
    source_ip: Optional[str] = Field(None, description="Client source IPv4/IPv6 address")
    username: Optional[str] = Field(None, description="Account or identity associated")
    hostname: Optional[str] = Field(None, description="Reporting host or target system")
    outcome: OutcomeEnum = Field(default=OutcomeEnum.UNKNOWN, description="Outcome of action")
    message: str = Field(..., description="Sanitized descriptive text")
    raw_event_reference: str = Field(..., description="Original raw line or record reference")
    attributes: Dict[str, Any] = Field(default_factory=dict, description="Extracted telemetry attributes")


class ParseSummary(BaseModel):
    total_lines: int = 0
    parsed_events: int = 0
    malformed_lines: int = 0
    skipped_lines: int = 0
    source_type: str = ""
    errors: List[str] = Field(default_factory=list)
