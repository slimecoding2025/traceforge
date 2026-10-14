from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from .events import NormalizedEvent, ParseSummary
from .findings import Finding, SeverityEnum


class InvestigationSession(BaseModel):
    session_id: str
    created_at: datetime
    updated_at: datetime
    source_name: str
    total_events: int = 0
    total_findings: int = 0
    severity_counts: Dict[SeverityEnum, int] = Field(default_factory=dict)
    summary: str = ""


class RuleDefinition(BaseModel):
    rule_id: str
    name: str
    description: str
    severity: SeverityEnum
    default_thresholds: Dict[str, Any]
    required_fields: List[str]
    mitre_attack: Optional[Dict[str, str]] = None
    limitations: List[str]
    test_scenario: str


class UpdateFindingStatusRequest(BaseModel):
    status: str
    note: Optional[str] = None
    author: Optional[str] = "Analyst"


class AddNoteRequest(BaseModel):
    content: str
    author: Optional[str] = "Analyst"
