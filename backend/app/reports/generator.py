from datetime import datetime, timezone
import html
import json
from typing import Any, Dict, List, Optional
from ..models.events import NormalizedEvent
from ..models.findings import Finding, SeverityEnum
from .redaction import PrivacyRedactor


class ReportGenerator:
    """Generates sanitized, offline JSON and self-contained HTML investigation reports."""

    def __init__(self, redactor: Optional[PrivacyRedactor] = None):
        self.redactor = redactor or PrivacyRedactor(redact_ips=False, redact_users=False, redact_hosts=False)

    def generate_json_report(
        self,
        findings: List[Finding],
        events_by_id: Dict[str, NormalizedEvent],
        total_events_processed: int,
        source_name: str = "Investigation",
        notes_summary: str = "",
    ) -> Dict[str, Any]:
        report_ts = datetime.now(timezone.utc).isoformat()

        sev_counts = {s.value: 0 for s in SeverityEnum}
        for f in findings:
            sev_counts[f.severity.value] = sev_counts.get(f.severity.value, 0) + 1

        sanitized_findings = []
        for f in findings:
            f_dict = f.model_dump(mode="json")
            if self.redactor.redact_ips and f.source_ip:
                f_dict["source_ip"] = self.redactor.pseudonymize_ip(f.source_ip)
            if self.redactor.redact_users and f.username:
                f_dict["username"] = self.redactor.pseudonymize_user(f.username)
            if self.redactor.redact_hosts and f.hostname:
                f_dict["hostname"] = self.redactor.pseudonymize_host(f.hostname)

            f_dict["explanation"] = self.redactor.sanitize_text(f.explanation)
            f_dict["trigger_reason"] = self.redactor.sanitize_text(f.trigger_reason)
            f_dict["defensive_steps"] = [self.redactor.sanitize_text(step) for step in f.defensive_steps]
            if "notes" in f_dict and f_dict["notes"]:
                for n in f_dict["notes"]:
                    if isinstance(n, dict) and "content" in n:
                        n["content"] = self.redactor.sanitize_text(n["content"])

            evidence_list = []
            for ev_id in f.evidence_event_ids:
                if ev_id in events_by_id:
                    ev = events_by_id[ev_id]
                    ev_dict = ev.model_dump(mode="json")
                    if self.redactor.redact_ips and ev.source_ip:
                        ev_dict["source_ip"] = self.redactor.pseudonymize_ip(ev.source_ip)
                    if self.redactor.redact_users and ev.username:
                        ev_dict["username"] = self.redactor.pseudonymize_user(ev.username)
                    if self.redactor.redact_hosts and ev.hostname:
                        ev_dict["hostname"] = self.redactor.pseudonymize_host(ev.hostname)
                    ev_dict["message"] = self.redactor.sanitize_text(ev.message)
                    ev_dict["raw_event_reference"] = self.redactor.sanitize_text(ev.raw_event_reference)
                    evidence_list.append(ev_dict)
            f_dict["evidence_events"] = evidence_list

            sanitized_findings.append(f_dict)

        return {
            "metadata": {
                "tool": "TraceForge Security Investigation Workbench",
                "version": "1.0.0",
                "report_generated_at": report_ts,
                "dataset_source": source_name,
                "privacy_redaction_applied": {
                    "redact_ips": self.redactor.redact_ips,
                    "redact_users": self.redactor.redact_users,
                    "redact_hosts": self.redactor.redact_hosts,
                },
                "disclaimer": "TraceForge is an educational and defensive investigation tool, not an enterprise SIEM. MITRE mappings represent analytical classification, not attribution proof.",
            },
            "summary": {
                "total_events_processed": total_events_processed,
                "total_findings": len(findings),
                "severity_counts": sev_counts,
                "analyst_summary_notes": notes_summary,
            },
            "findings": sanitized_findings,
        }

    def generate_html_report(
        self,
        findings: List[Finding],
        events_by_id: Dict[str, NormalizedEvent],
        total_events_processed: int,
        source_name: str = "Investigation",
        notes_summary: str = "",
    ) -> str:
        data = self.generate_json_report(
            findings=findings,
            events_by_id=events_by_id,
            total_events_processed=total_events_processed,
            source_name=source_name,
            notes_summary=notes_summary,
        )

        meta = data["metadata"]
        summary = data["summary"]
        findings_list = data["findings"]

        findings_html = ""
        for f in findings_list:
            f_id = html.escape(str(f.get("finding_id", "")))
            r_id = html.escape(str(f.get("rule_id", "")))
            r_name = html.escape(str(f.get("rule_name", "")))
            sev = html.escape(str(f.get("severity", "")))
            conf = html.escape(str(f.get("confidence", "")))
            status = html.escape(str(f.get("status", "")))
            src_ip = html.escape(str(f.get("source_ip") or "N/A"))
            user = html.escape(str(f.get("username") or "N/A"))
            explanation = html.escape(str(f.get("explanation", "")))
            trigger = html.escape(str(f.get("trigger_reason", "")))
            first_seen = html.escape(str(f.get("first_seen", "")))
            last_seen = html.escape(str(f.get("last_seen", "")))

            mitre_html = ""
            if f.get("mitre_attack"):
                m = f["mitre_attack"]
                m_id = html.escape(str(m.get("technique_id", "")))
                m_name = html.escape(str(m.get("technique_name", "")))
                m_tactic = html.escape(str(m.get("tactic", "")))
                m_rel = html.escape(str(m.get("relationship", "")))
                mitre_html = f"""
                <div class="meta-section">
                    <strong>MITRE ATT&amp;CK:</strong> {m_id} - {m_name} ({m_tactic})<br/>
                    <small class="muted">{m_rel}</small>
                </div>
                """

            steps_html = "".join(f"<li>{html.escape(s)}</li>" for s in f.get("defensive_steps", []))

            evidence_rows = ""
            for ev in f.get("evidence_events", []):
                ev_ts = html.escape(str(ev.get("timestamp", "")))
                ev_type = html.escape(str(ev.get("event_type", "")))
                ev_ip = html.escape(str(ev.get("source_ip") or "-"))
                ev_u = html.escape(str(ev.get("username") or "-"))
                ev_msg = html.escape(str(ev.get("message", "")))
                evidence_rows += f"""
                <tr>
                    <td class="font-mono">{ev_ts}</td>
                    <td>{ev_type}</td>
                    <td class="font-mono">{ev_ip}</td>
                    <td class="font-mono">{ev_u}</td>
                    <td>{ev_msg}</td>
                </tr>
                """

            notes_html = ""
            if f.get("notes"):
                notes_items = "".join(
                    f"<li><strong>{html.escape(n.get('author','Analyst'))} ({html.escape(str(n.get('timestamp','')))}):</strong> {html.escape(n.get('content',''))}</li>"
                    for n in f["notes"]
                )
                notes_html = f"""
                <div class="meta-section">
                    <strong>Analyst Notes:</strong>
                    <ul>{notes_items}</ul>
                </div>
                """

            sev_class = f"sev-{sev.lower()}"

            findings_html += f"""
            <div class="finding-card">
                <div class="finding-header">
                    <div>
                        <span class="finding-badge {sev_class}">{sev.upper()}</span>
                        <span class="muted font-mono">{r_id}</span>
                        <h3 class="finding-title">{r_name}</h3>
                    </div>
                    <div class="finding-meta text-right">
                        <div>Status: <strong>{status}</strong> &middot; Confidence: <strong>{conf}</strong></div>
                        <div class="muted font-mono">{f_id}</div>
                    </div>
                </div>

                <p class="finding-desc">{explanation}</p>
                <p><strong>Trigger Condition:</strong> {trigger}</p>

                <div class="grid-2">
                    <div><strong>Source Entity:</strong> <span class="font-mono">{src_ip}</span></div>
                    <div><strong>Target Account:</strong> <span class="font-mono">{user}</span></div>
                    <div><strong>First Observed:</strong> <span class="font-mono">{first_seen}</span></div>
                    <div><strong>Last Observed:</strong> <span class="font-mono">{last_seen}</span></div>
                </div>

                {mitre_html}
                {notes_html}

                <div class="meta-section">
                    <strong>Recommended Defensive Actions:</strong>
                    <ul class="steps-list">{steps_html}</ul>
                </div>

                <div class="meta-section">
                    <strong>Correlated Evidence Events ({len(f.get('evidence_events', []))}):</strong>
                    <table class="evidence-table">
                        <thead>
                            <tr>
                                <th>Timestamp (UTC)</th>
                                <th>Event Type</th>
                                <th>Source IP</th>
                                <th>User</th>
                                <th>Log Message</th>
                            </tr>
                        </thead>
                        <tbody>
                            {evidence_rows}
                        </tbody>
                    </table>
                </div>
            </div>
            """

        sev_summary_badges = " &nbsp;&middot;&nbsp; ".join(
            f"<strong>{k.upper()}:</strong> {v}" for k, v in summary["severity_counts"].items()
        )

        return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TraceForge Investigation Report - {html.escape(source_name)}</title>
    <style>
        :root {{
            --bg: #090d16;
            --surface: #111827;
            --surface-subtle: #1f2937;
            --border: #2e3b52;
            --text: #f3f4f6;
            --muted: #9ca3af;
            --accent: #38bdf8;
            --critical: #ef4444;
            --high: #f97316;
            --medium: #f59e0b;
            --low: #3b82f6;
            --info: #6b7280;
        }}
        * {{ box-sizing: border-box; margin: 0; padding: 0; }}
        body {{
            background-color: var(--bg);
            color: var(--text);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            line-height: 1.5;
            padding: 32px 24px;
        }}
        .container {{ max-width: 1100px; margin: 0 auto; }}
        header {{
            border-bottom: 1px solid var(--border);
            padding-bottom: 24px;
            margin-bottom: 32px;
        }}
        .brand {{
            font-size: 24px;
            font-weight: 700;
            color: var(--accent);
            letter-spacing: -0.02em;
        }}
        .disclaimer-banner {{
            background: rgba(56, 189, 248, 0.08);
            border: 1px solid rgba(56, 189, 248, 0.2);
            padding: 12px 16px;
            border-radius: 6px;
            font-size: 13px;
            color: #bae6fd;
            margin-top: 16px;
        }}
        .summary-card {{
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 32px;
        }}
        .summary-stats {{
            display: flex;
            gap: 24px;
            flex-wrap: wrap;
            margin-top: 12px;
            font-size: 14px;
        }}
        .finding-card {{
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 24px;
            margin-bottom: 24px;
        }}
        .finding-header {{
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 1px solid var(--surface-subtle);
            padding-bottom: 12px;
            margin-bottom: 16px;
        }}
        .finding-title {{ font-size: 18px; margin-top: 4px; }}
        .finding-badge {{
            display: inline-block;
            font-size: 11px;
            font-weight: 700;
            padding: 2px 8px;
            border-radius: 4px;
            margin-right: 8px;
        }}
        .sev-critical {{ background: rgba(239, 68, 68, 0.2); color: var(--critical); border: 1px solid var(--critical); }}
        .sev-high {{ background: rgba(249, 115, 22, 0.2); color: var(--high); border: 1px solid var(--high); }}
        .sev-medium {{ background: rgba(245, 158, 11, 0.2); color: var(--medium); border: 1px solid var(--medium); }}
        .sev-low {{ background: rgba(59, 130, 246, 0.2); color: var(--low); border: 1px solid var(--low); }}
        .sev-informational {{ background: rgba(107, 114, 128, 0.2); color: var(--info); border: 1px solid var(--info); }}
        .finding-desc {{ font-size: 15px; margin-bottom: 12px; color: #e5e7eb; }}
        .grid-2 {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 12px;
            background: var(--surface-subtle);
            padding: 12px 16px;
            border-radius: 6px;
            margin: 16px 0;
            font-size: 13px;
        }}
        .meta-section {{ margin-top: 16px; font-size: 14px; }}
        .steps-list {{ margin: 8px 0 0 20px; }}
        .steps-list li {{ margin-bottom: 4px; color: #d1d5db; }}
        .evidence-table {{
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
            font-size: 12px;
        }}
        .evidence-table th, .evidence-table td {{
            border: 1px solid var(--border);
            padding: 6px 10px;
            text-align: left;
        }}
        .evidence-table th {{ background: var(--surface-subtle); color: var(--muted); }}
        .font-mono {{ font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }}
        .muted {{ color: var(--muted); }}
        footer {{
            border-top: 1px solid var(--border);
            padding-top: 20px;
            margin-top: 40px;
            font-size: 12px;
            color: var(--muted);
            text-align: center;
        }}
    </style>
</head>
<body>
    <div class="container">
        <header>
            <div class="brand">TraceForge &middot; Investigation Report</div>
            <div class="muted">Generated on {meta['report_generated_at']} | Source: {html.escape(source_name)}</div>
            <div class="disclaimer-banner">
                <strong>Defensive Workbench Notice:</strong> {meta['disclaimer']}
            </div>
        </header>

        <section class="summary-card">
            <h2>Executive Summary</h2>
            <div class="summary-stats">
                <div>Total Events Processed: <strong>{summary['total_events_processed']}</strong></div>
                <div>Total Findings Detected: <strong>{summary['total_findings']}</strong></div>
            </div>
            <div style="margin-top: 12px; font-size: 14px;">
                Severity Distribution: {sev_summary_badges}
            </div>
        </section>

        <section>
            <h2>Security Findings Detail</h2>
            {findings_html}
        </section>

        <footer>
            TraceForge Security Workbench &middot; Privacy-First Defensive Investigation Engine &middot; Generated Locally Without External APIs
        </footer>
    </div>
</body>
</html>
"""
