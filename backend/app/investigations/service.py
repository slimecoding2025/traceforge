from datetime import datetime, timezone
import uuid
from typing import Any, Dict, List, Optional, Tuple
from ..models.events import NormalizedEvent, ParseSummary
from ..models.findings import AnalystNote, Finding, FindingStatusEnum, SeverityEnum
from ..parsers import parse_log_data
from ..detections.engine import DetectionEngine
from .storage import SQLiteStorage


class InvestigationService:
    def __init__(self, storage: Optional[SQLiteStorage] = None, engine: Optional[DetectionEngine] = None):
        self.storage = storage or SQLiteStorage()
        self.engine = engine or DetectionEngine()

    def import_and_analyze(
        self,
        raw_text: str,
        filename: str = "upload.log",
        custom_thresholds: Optional[Dict[str, Dict[str, Any]]] = None,
        clear_previous: bool = False,
    ) -> Tuple[List[NormalizedEvent], List[Finding], ParseSummary]:
        if clear_previous:
            self.storage.clear_all()

        events, summary = parse_log_data(raw_text, filename)
        if events:
            self.storage.save_events(events)

        findings = self.engine.run_detections(events, custom_thresholds=custom_thresholds)
        if findings:
            self.storage.save_findings(findings)

        return events, findings, summary

    def get_findings(
        self,
        severity: Optional[str] = None,
        status: Optional[str] = None,
        rule_id: Optional[str] = None,
    ) -> List[Finding]:
        return self.storage.get_all_findings(severity=severity, status=status, rule_id=rule_id)

    def get_finding_by_id(self, finding_id: str) -> Optional[Finding]:
        return self.storage.get_finding_by_id(finding_id)

    def get_finding_evidence(self, finding_id: str) -> List[NormalizedEvent]:
        finding = self.storage.get_finding_by_id(finding_id)
        if not finding:
            return []
        return self.storage.get_events_by_ids(finding.evidence_event_ids)

    def update_finding_status(
        self,
        finding_id: str,
        new_status: str,
        note_text: Optional[str] = None,
        author: str = "Analyst",
    ) -> Optional[Finding]:
        valid_statuses = [s.value for s in FindingStatusEnum]
        if new_status not in valid_statuses:
            raise ValueError(f"Invalid status '{new_status}'. Must be one of {valid_statuses}")

        success = self.storage.update_finding_status(finding_id, new_status)
        if not success:
            return None

        if note_text and note_text.strip():
            note = AnalystNote(
                note_id=f"nt-{uuid.uuid4().hex[:8]}",
                author=author,
                timestamp=datetime.now(timezone.utc),
                content=f"[Status change to {new_status}]: {note_text.strip()}",
            )
            self.storage.add_note(note, finding_id)

        return self.storage.get_finding_by_id(finding_id)

    def add_note_to_finding(
        self,
        finding_id: str,
        content: str,
        author: str = "Analyst",
    ) -> Optional[AnalystNote]:
        finding = self.storage.get_finding_by_id(finding_id)
        if not finding:
            return None

        note = AnalystNote(
            note_id=f"nt-{uuid.uuid4().hex[:8]}",
            author=author,
            timestamp=datetime.now(timezone.utc),
            content=content.strip(),
        )
        self.storage.add_note(note, finding_id)
        return note

    def get_overview_statistics(self) -> Dict[str, Any]:
        events = self.storage.get_all_events(limit=10000)
        findings = self.storage.get_all_findings()

        severity_counts = {s.value: 0 for s in SeverityEnum}
        status_counts = {st.value: 0 for st in FindingStatusEnum}
        for f in findings:
            severity_counts[f.severity.value] = severity_counts.get(f.severity.value, 0) + 1
            status_counts[f.status.value] = status_counts.get(f.status.value, 0) + 1

        top_ips: Dict[str, int] = {}
        top_users: Dict[str, int] = {}
        timeline_buckets: Dict[str, int] = {}

        for ev in events:
            if ev.source_ip:
                top_ips[ev.source_ip] = top_ips.get(ev.source_ip, 0) + 1
            if ev.username:
                top_users[ev.username] = top_users.get(ev.username, 0) + 1

            bucket_key = ev.timestamp.strftime("%Y-%m-%d %H:%M")
            timeline_buckets[bucket_key] = timeline_buckets.get(bucket_key, 0) + 1

        timeline = [
            {"time": k, "count": v}
            for k, v in sorted(timeline_buckets.items())
        ]

        top_ips_sorted = sorted([{"ip": k, "count": v} for k, v in top_ips.items()], key=lambda x: x["count"], reverse=True)[:5]
        top_users_sorted = sorted([{"username": k, "count": v} for k, v in top_users.items()], key=lambda x: x["count"], reverse=True)[:5]

        time_range = None
        if events:
            time_range = {
                "start": events[0].timestamp.isoformat(),
                "end": events[-1].timestamp.isoformat(),
            }

        return {
            "total_events": len(events),
            "total_findings": len(findings),
            "severity_counts": severity_counts,
            "status_counts": status_counts,
            "top_ips": top_ips_sorted,
            "top_users": top_users_sorted,
            "timeline": timeline,
            "time_range": time_range,
        }
