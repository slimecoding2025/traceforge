import os
import tempfile
from datetime import datetime, timezone
from backend.app.models.events import NormalizedEvent, EventTypeEnum, OutcomeEnum, SourceTypeEnum
from backend.app.models.findings import Finding, SeverityEnum, ConfidenceEnum, FindingStatusEnum, AnalystNote
from backend.app.investigations.storage import SQLiteStorage
from backend.app.investigations.service import InvestigationService


def test_sqlite_storage_and_status_persistence():
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tf:
        db_path = tf.name

    try:
        storage = SQLiteStorage(db_path=db_path)
        service = InvestigationService(storage=storage)

        ev = NormalizedEvent(
            event_id="ev-100",
            timestamp=datetime(2026, 10, 12, 12, 0, 0, tzinfo=timezone.utc),
            source_type=SourceTypeEnum.LINUX_AUTH,
            event_type=EventTypeEnum.SSH_LOGIN_FAILED,
            source_ip="198.51.100.5",
            username="testuser",
            hostname="node1",
            outcome=OutcomeEnum.FAILURE,
            message="Failed login",
            raw_event_reference="Oct 12 Failed login...",
            attributes={},
        )
        storage.save_events([ev])
        assert storage.count_events() == 1

        finding = Finding(
            finding_id="fnd-100",
            rule_id="TF-DET-001",
            rule_name="SSH Brute-Force",
            severity=SeverityEnum.HIGH,
            confidence=ConfidenceEnum.HIGH,
            first_seen=ev.timestamp,
            last_seen=ev.timestamp,
            source_ip="198.51.100.5",
            username="testuser",
            hostname="node1",
            match_count=1,
            evidence_event_ids=["ev-100"],
            explanation="Brute force activity",
            trigger_reason="Count threshold met",
            threshold_details={},
            defensive_steps=["Check firewall"],
            known_limitations=[],
            status=FindingStatusEnum.NEW,
        )
        storage.save_findings([finding])

        updated = service.update_finding_status("fnd-100", "investigating", note_text="Assigned to SOC analyst", author="LeadAnalyst")
        assert updated is not None
        assert updated.status == FindingStatusEnum.INVESTIGATING
        assert len(updated.notes) == 1
        assert "investigating" in updated.notes[0].content

        service.add_note_to_finding("fnd-100", "Confirmed internal penetration test", author="SecurityLead")
        refreshed = service.get_finding_by_id("fnd-100")
        assert len(refreshed.notes) == 2

        evidence = service.get_finding_evidence("fnd-100")
        assert len(evidence) == 1
        assert evidence[0].event_id == "ev-100"

    finally:
        if os.path.exists(db_path):
            os.remove(db_path)
