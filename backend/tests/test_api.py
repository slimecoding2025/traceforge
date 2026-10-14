import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_api_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"


def test_api_rules():
    res = client.get("/api/rules")
    assert res.status_code == 200
    rules = res.json()
    assert len(rules) >= 5
    rule_ids = [r["rule_id"] for r in rules]
    assert "TF-DET-001" in rule_ids
    assert "TF-DET-003" in rule_ids


def test_api_ingest_and_overview():
    log_content = """
    Oct 12 09:10:02 srv1 sshd[1]: Failed password for root from 198.51.100.23 port 39101 ssh2
    Oct 12 09:10:07 srv1 sshd[2]: Failed password for root from 198.51.100.23 port 39102 ssh2
    Oct 12 09:10:13 srv1 sshd[3]: Failed password for root from 198.51.100.23 port 39103 ssh2
    Oct 12 09:10:19 srv1 sshd[4]: Failed password for root from 198.51.100.23 port 39104 ssh2
    Oct 12 09:10:25 srv1 sshd[5]: Failed password for root from 198.51.100.23 port 39105 ssh2
    """
    res = client.post("/api/logs/ingest", json={"content": log_content, "filename": "test.log", "clear_previous": True})
    assert res.status_code == 200
    data = res.json()
    assert data["events_count"] == 5
    assert data["findings_count"] >= 1

    ov_res = client.get("/api/overview")
    assert ov_res.status_code == 200
    overview = ov_res.json()
    assert overview["total_events"] == 5
    assert overview["total_findings"] >= 1

    f_res = client.get("/api/findings")
    assert f_res.status_code == 200
    findings = f_res.json()
    assert len(findings) >= 1
    f_id = findings[0]["finding_id"]

    stat_res = client.patch(f"/api/findings/{f_id}/status", json={"status": "triaged", "note": "Checked via API test"})
    assert stat_res.status_code == 200
    assert stat_res.json()["status"] == "triaged"

    rep_res = client.post("/api/reports/generate", json={"format": "json", "redact_ips": True})
    assert rep_res.status_code == 200
    assert "findings" in rep_res.json()

    rep_html = client.post("/api/reports/generate", json={"format": "html", "redact_ips": True})
    assert rep_html.status_code == 200
    assert "text/html" in rep_html.headers["content-type"]
