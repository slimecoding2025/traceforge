from datetime import datetime, timezone, timedelta
from pathlib import Path
from backend.app.models.events import NormalizedEvent, EventTypeEnum, OutcomeEnum, SourceTypeEnum
from backend.app.detections.rules.brute_force import SSHBruteForceRule
from backend.app.detections.rules.password_spray import PasswordSprayingRule
from backend.app.detections.rules.success_after_failure import SuccessAfterFailureRule
from backend.app.detections.rules.privilege_abuse import SuspiciousPrivilegedActivityRule
from backend.app.detections.rules.invalid_user_probe import InvalidUserProbeRule
from backend.app.detections.engine import DetectionEngine
from backend.app.parsers import parse_log_data


def make_event(
    event_id: str,
    ts: datetime,
    event_type: EventTypeEnum,
    outcome: OutcomeEnum,
    source_ip: str = "198.51.100.1",
    username: str = "root",
    attributes: dict = None,
) -> NormalizedEvent:
    return NormalizedEvent(
        event_id=event_id,
        timestamp=ts,
        source_type=SourceTypeEnum.LINUX_AUTH,
        event_type=event_type,
        source_ip=source_ip,
        username=username,
        hostname="srv-test",
        outcome=outcome,
        message=f"Test message {event_id}",
        raw_event_reference=f"raw {event_id}",
        attributes=attributes or {},
    )


def test_ssh_brute_force_thresholds():
    rule = SSHBruteForceRule()
    base_time = datetime(2026, 10, 12, 10, 0, 0, tzinfo=timezone.utc)

    events_4 = [
        make_event(f"ev-{i}", base_time + timedelta(seconds=i * 5), EventTypeEnum.SSH_LOGIN_FAILED, OutcomeEnum.FAILURE)
        for i in range(4)
    ]
    findings = rule.evaluate(events_4, thresholds={"min_failed_attempts": 5, "window_seconds": 300})
    assert len(findings) == 0

    events_5 = [
        make_event(f"ev-{i}", base_time + timedelta(seconds=i * 5), EventTypeEnum.SSH_LOGIN_FAILED, OutcomeEnum.FAILURE)
        for i in range(5)
    ]
    findings = rule.evaluate(events_5, thresholds={"min_failed_attempts": 5, "window_seconds": 300})
    assert len(findings) == 1
    assert findings[0].rule_id == "TF-DET-001"
    assert findings[0].match_count == 5


def test_ssh_brute_force_time_window_boundary():
    rule = SSHBruteForceRule()
    base_time = datetime(2026, 10, 12, 10, 0, 0, tzinfo=timezone.utc)

    events = [
        make_event(f"ev-{i}", base_time + timedelta(seconds=i * 100), EventTypeEnum.SSH_LOGIN_FAILED, OutcomeEnum.FAILURE)
        for i in range(5)
    ]
    findings = rule.evaluate(events, thresholds={"min_failed_attempts": 5, "window_seconds": 300})
    assert len(findings) == 0


def test_password_spraying_detection():
    rule = PasswordSprayingRule()
    base_time = datetime(2026, 10, 12, 10, 0, 0, tzinfo=timezone.utc)

    users_2 = ["alice", "bob"]
    events_2 = [
        make_event(f"ev-{i}", base_time + timedelta(seconds=i * 10), EventTypeEnum.SSH_LOGIN_FAILED, OutcomeEnum.FAILURE, username=users_2[i])
        for i in range(2)
    ]
    assert len(rule.evaluate(events_2, thresholds={"min_distinct_users": 3, "window_seconds": 600})) == 0

    users_3 = ["alice", "bob", "charlie"]
    events_3 = [
        make_event(f"ev-{i}", base_time + timedelta(seconds=i * 10), EventTypeEnum.SSH_LOGIN_FAILED, OutcomeEnum.FAILURE, username=users_3[i])
        for i in range(3)
    ]
    findings = rule.evaluate(events_3, thresholds={"min_distinct_users": 3, "window_seconds": 600})
    assert len(findings) == 1
    assert findings[0].rule_id == "TF-DET-002"
    assert "distinct" in findings[0].explanation


def test_success_after_failure_correlation():
    rule = SuccessAfterFailureRule()
    base_time = datetime(2026, 10, 12, 10, 0, 0, tzinfo=timezone.utc)

    failures = [
        make_event(f"fail-{i}", base_time + timedelta(seconds=i * 10), EventTypeEnum.SSH_LOGIN_FAILED, OutcomeEnum.FAILURE, username="deploy")
        for i in range(3)
    ]
    success = make_event("succ-1", base_time + timedelta(seconds=40), EventTypeEnum.SSH_LOGIN_SUCCESS, OutcomeEnum.SUCCESS, username="deploy")

    findings = rule.evaluate(failures + [success], thresholds={"min_prior_failures": 3, "window_seconds": 900})
    assert len(findings) == 1
    f = findings[0]
    assert f.rule_id == "TF-DET-003"
    assert f.severity.value == "critical"
    assert f.match_count == 4
    assert f.evidence_event_ids[-1] == "succ-1"


def test_suspicious_privileged_activity():
    rule = SuspiciousPrivilegedActivityRule()
    base_time = datetime(2026, 10, 12, 10, 0, 0, tzinfo=timezone.utc)

    safe_ev = make_event(
        "sudo-1", base_time, EventTypeEnum.SUDO_ELEVATION, OutcomeEnum.SUCCESS,
        username="admin", attributes={"command": "/usr/bin/apt-get update", "target_user": "root"}
    )
    assert len(rule.evaluate([safe_ev], {})) == 0

    shell_ev = make_event(
        "sudo-2", base_time, EventTypeEnum.SUDO_ELEVATION, OutcomeEnum.SUCCESS,
        username="deploy", attributes={"command": "/bin/bash", "target_user": "root"}
    )
    findings = rule.evaluate([shell_ev], {})
    assert len(findings) == 1
    assert findings[0].rule_id == "TF-DET-004"


def test_normal_baseline_zero_false_positives():
    baseline_path = Path("sample-data/normal_baseline.log")
    if not baseline_path.exists():
        return
    content = baseline_path.read_text()
    events, summary = parse_log_data(content, "normal_baseline.log")
    engine = DetectionEngine()
    findings = engine.run_detections(events)
    assert len(findings) == 0, f"Expected 0 findings on normal baseline, got {len(findings)}"
