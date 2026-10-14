import os
import tempfile
from pathlib import Path
from backend.app.investigations.storage import SQLiteStorage
from backend.app.investigations.service import InvestigationService
from backend.app.reports.generator import ReportGenerator
from backend.app.reports.redaction import PrivacyRedactor


def test_end_to_end_investigation_workflow():
    synthetic_file = Path("sample-data/auth_synthetic.log")
    assert synthetic_file.exists(), "Synthetic dataset file must exist"
    content = synthetic_file.read_text(encoding="utf-8")

    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tf:
        temp_db = tf.name

    try:
        storage = SQLiteStorage(db_path=temp_db)
        service = InvestigationService(storage=storage)

        events, findings, summary = service.import_and_analyze(
            raw_text=content,
            filename="auth_synthetic.log",
            clear_previous=True,
        )

        assert summary.parsed_events > 15
        assert summary.malformed_lines >= 1
        assert len(findings) >= 4

        rule_ids = {f.rule_id for f in findings}
        assert "TF-DET-001" in rule_ids
        assert "TF-DET-002" in rule_ids
        assert "TF-DET-003" in rule_ids
        assert "TF-DET-004" in rule_ids

        critical_findings = [f for f in findings if f.rule_id == "TF-DET-003"]
        assert len(critical_findings) >= 1
        crit = critical_findings[0]
        evidence = service.get_finding_evidence(crit.finding_id)
        assert len(evidence) >= 4

        updated = service.update_finding_status(
            finding_id=crit.finding_id,
            new_status="investigating",
            note_text="Compromise confirmed with system administrator.",
            author="SOC_Tier2_Analyst",
        )
        assert updated.status.value == "investigating"
        assert len(updated.notes) == 1

        all_stored_events = {e.event_id: e for e in service.storage.get_all_events(limit=1000)}
        redactor = PrivacyRedactor(redact_ips=True, redact_users=True)
        generator = ReportGenerator(redactor=redactor)

        json_rep = generator.generate_json_report(
            findings=service.get_findings(),
            events_by_id=all_stored_events,
            total_events_processed=len(events),
            source_name="auth_synthetic.log",
            notes_summary="Automated integration test investigation",
        )
        assert json_rep["summary"]["total_findings"] == len(findings)
        assert json_rep["metadata"]["privacy_redaction_applied"]["redact_ips"] is True

        html_rep = generator.generate_html_report(
            findings=service.get_findings(),
            events_by_id=all_stored_events,
            total_events_processed=len(events),
            source_name="auth_synthetic.log",
            notes_summary="Automated integration test investigation",
        )
        assert "<!DOCTYPE html>" in html_rep
        assert "TraceForge" in html_rep
        assert "Executive Summary" in html_rep
        assert "198.51.100.99" not in html_rep
        assert "ANON_IP_" in html_rep

    finally:
        if os.path.exists(temp_db):
            os.remove(temp_db)
