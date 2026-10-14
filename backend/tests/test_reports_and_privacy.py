from datetime import datetime, timezone
from backend.app.models.events import NormalizedEvent, EventTypeEnum, OutcomeEnum, SourceTypeEnum
from backend.app.models.findings import Finding, SeverityEnum, ConfidenceEnum, FindingStatusEnum
from backend.app.reports.redaction import PrivacyRedactor
from backend.app.reports.generator import ReportGenerator


def test_privacy_redactor_determinism():
    redactor = PrivacyRedactor(redact_ips=True, redact_users=True, redact_hosts=True)

    ip = "198.51.100.23"
    anon1 = redactor.pseudonymize_ip(ip)
    anon2 = redactor.pseudonymize_ip(ip)
    assert anon1 == anon2
    assert "ANON_IP_1" == anon1

    ip2 = "203.0.113.50"
    anon_ip2 = redactor.pseudonymize_ip(ip2)
    assert anon_ip2 == "ANON_IP_2"

    u1 = redactor.pseudonymize_user("admin")
    u2 = redactor.pseudonymize_user("admin")
    assert u1 == u2
    assert u1 == "user_1"

    raw_text = f"Connection from {ip} for user admin failed."
    sanitized = redactor.sanitize_text(raw_text)
    assert ip not in sanitized
    assert "admin" not in sanitized
    assert "ANON_IP_1" in sanitized
    assert "user_1" in sanitized


def test_html_report_xss_escaping():
    generator = ReportGenerator()
    ev = NormalizedEvent(
        event_id="ev-xss",
        timestamp=datetime.now(timezone.utc),
        source_type=SourceTypeEnum.LINUX_AUTH,
        event_type=EventTypeEnum.SSH_LOGIN_FAILED,
        source_ip="198.51.100.99",
        username="<script>alert('xss')</script>",
        hostname="srv<img src=x onerror=alert(1)>",
        outcome=OutcomeEnum.FAILURE,
        message="Failed password with payload <script>evil()</script>",
        raw_event_reference="raw <script>evil()</script>",
        attributes={},
    )
    finding = Finding(
        finding_id="fnd-xss",
        rule_id="TF-DET-001",
        rule_name="Brute Force",
        severity=SeverityEnum.HIGH,
        confidence=ConfidenceEnum.HIGH,
        first_seen=ev.timestamp,
        last_seen=ev.timestamp,
        source_ip="198.51.100.99",
        username="<script>alert('xss')</script>",
        hostname="srv<img src=x onerror=alert(1)>",
        match_count=1,
        evidence_event_ids=["ev-xss"],
        explanation="Attempted XSS injection in log message <script>alert(1)</script>",
        trigger_reason="Trigger <script>",
        threshold_details={},
        defensive_steps=["Review <script>"],
        known_limitations=[],
        status=FindingStatusEnum.NEW,
    )

    html_out = generator.generate_html_report(
        findings=[finding],
        events_by_id={"ev-xss": ev},
        total_events_processed=1,
        source_name="XSS-Test",
    )

    assert "<script>alert('xss')</script>" not in html_out
    assert "&lt;script&gt;alert(&#x27;xss&#x27;)&lt;/script&gt;" in html_out or "&lt;script&gt;" in html_out
    assert "<img src=x onerror=alert(1)>" not in html_out
