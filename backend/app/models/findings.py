from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class SeverityEnum(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFORMATIONAL = "informational"


class ConfidenceEnum(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class FindingStatusEnum(str, Enum):
    NEW = "new"
    TRIAGED = "triaged"
    INVESTIGATING = "investigating"
    RESOLVED = "resolved"
    FALSE_POSITIVE = "false_positive"


class MitreAttackRef(BaseModel):
    technique_id: str = Field(..., description="MITRE ATT&CK Technique ID e.g. T1110.001")
    technique_name: str = Field(..., description="Official Technique Name")
    tactic: str = Field(..., description="Primary Tactic e.g. Credential Access")
    url: str = Field(..., description="Link to official MITRE matrix reference")
    relationship: str = Field(
        ...,
        description="Analytical rationale explaining why this detection classifies under this technique"
    )


class AnalystNote(BaseModel):
    note_id: str
    author: str = "Analyst"
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    content: str


class Finding(BaseModel):
    finding_id: str = Field(..., description="Deterministic or unique finding identifier")
    rule_id: str = Field(..., description="Stable detection rule ID e.g. TF-DET-001")
    rule_name: str = Field(..., description="Human-readable rule name")
    severity: SeverityEnum = Field(..., description="Impact severity classification")
    confidence: ConfidenceEnum = Field(..., description="Analytical strength of supporting evidence")
    first_seen: datetime = Field(..., description="Timestamp of first correlated event")
    last_seen: datetime = Field(..., description="Timestamp of most recent correlated event")
    source_ip: Optional[str] = Field(None, description="Identified source IP address")
    username: Optional[str] = Field(None, description="Targeted or associated account name")
    hostname: Optional[str] = Field(None, description="Host system identifier")
    match_count: int = Field(..., description="Total count of matching evidence events")
    evidence_event_ids: List[str] = Field(default_factory=list, description="IDs of correlated events")
    explanation: str = Field(..., description="Plain-language explanation of finding")
    trigger_reason: str = Field(..., description="Exact condition that tripped detection threshold")
    threshold_details: Dict[str, Any] = Field(default_factory=dict, description="Configured thresholds used")
    defensive_steps: List[str] = Field(default_factory=list, description="Prescribed investigation steps")
    known_limitations: List[str] = Field(default_factory=list, description="False-positive scenarios & caveats")
    mitre_attack: Optional[MitreAttackRef] = None
    status: FindingStatusEnum = Field(default=FindingStatusEnum.NEW, description="Investigation lifecycle status")
    notes: List[AnalystNote] = Field(default_factory=list, description="Analyst timeline notes")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
