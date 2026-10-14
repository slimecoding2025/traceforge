import argparse
import json
import sys
from pathlib import Path
from .parsers import parse_log_data
from .detections.engine import DetectionEngine
from .reports.generator import ReportGenerator
from .reports.redaction import PrivacyRedactor


def main():
    parser = argparse.ArgumentParser(
        description="TraceForge CLI - Privacy-first security log investigation tool"
    )
    parser.add_argument("--input", "-i", required=True, help="Path to input auth.log or .jsonl file")
    parser.add_argument("--html-report", "-o", help="Path to save HTML investigation report")
    parser.add_argument("--json-report", "-j", help="Path to save JSON investigation report")
    parser.add_argument("--redact", action="store_true", help="Redact IPs and usernames in report")

    args = parser.parse_args()

    input_path = Path(args.input)
    if not input_path.exists():
        print(f"Error: Input file {args.input} does not exist.", file=sys.stderr)
        sys.exit(1)

    print(f"[*] Reading {args.input}...")
    content = input_path.read_text(encoding="utf-8", errors="replace")

    print("[*] Parsing log events...")
    events, summary = parse_log_data(content, filename=input_path.name)
    print(f"[+] Parsed {summary.parsed_events} events ({summary.malformed_lines} malformed lines).")

    print("[*] Executing detection rules...")
    engine = DetectionEngine()
    findings = engine.run_detections(events)
    print(f"[+] Generated {len(findings)} findings.")

    for f in findings:
        print(f"  - [{f.severity.upper()}] {f.rule_name} (Rule: {f.rule_id}) | Entity: {f.source_ip or f.username}")

    if args.html_report or args.json_report:
        events_map = {e.event_id: e for e in events}
        redactor = PrivacyRedactor(
            redact_ips=args.redact,
            redact_users=args.redact,
            redact_hosts=args.redact,
        )
        generator = ReportGenerator(redactor=redactor)

        if args.html_report:
            html_content = generator.generate_html_report(
                findings=findings,
                events_by_id=events_map,
                total_events_processed=len(events),
                source_name=input_path.name,
            )
            Path(args.html_report).write_text(html_content, encoding="utf-8")
            print(f"[+] HTML report written to {args.html_report}")

        if args.json_report:
            json_data = generator.generate_json_report(
                findings=findings,
                events_by_id=events_map,
                total_events_processed=len(events),
                source_name=input_path.name,
            )
            Path(args.json_report).write_text(json.dumps(json_data, indent=2), encoding="utf-8")
            print(f"[+] JSON report written to {args.json_report}")


if __name__ == "__main__":
    main()
