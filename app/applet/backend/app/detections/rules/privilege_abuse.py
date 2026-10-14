import hashlib
import re
from typing import Any, Dict, List
from ...models.events import EventTypeEnum, NormalizedEvent
from ...models.findings import (
    ConfidenceEnum,
    Finding,
    MitreAttackRef,
    SeverityEnum,
)
from .base import BaseRule

SUSPICIOUS_SUDO_COMMANDS = [
    r"/bin/(?:bash|sh|zsh|dash)",
    r"su\s+(?:-\s+)?root",
    r"/etc/shadow",
    r"chmod\s+(?:[-+]x|777|[0-7]?777|\+s)",
    r"visudo",
    r"curl\s+.*\|\s*(?:bash|sh)",
    r"wget\s+.*\|\s*(?:bash|sh)",
    r"nc\s+-[le]",
    r"python[23]?\s+-c",
    r"perl\s+-e",
    r"iptables\s+-F",
    r"useradd",
    r"usermod",
]
SUSPICIOUS_REGEX = re.compile("|".join(SUSPICIOUS_SUDO_COMMANDS), re.IGNORECASE)


class SuspiciousPrivilegedActivityRule(BaseRule):
    rule_id = "TF-DET-004"
    name = "Suspicious Privileged Command Execution"
    description = (
        "Detects privilege elevation events executing high-risk administrative binaries, shell spawns, "
        "or security-sensitive commands via sudo only when log telemetry contains explicit evidence."
    )
    severity = SeverityEnum.HIGH
    default_thresholds = {
        "alert_on_shell_spawn": True,
        "alert_on_credential_file_access": True,
    }
    required_fields = ["event_type", "username", "attributes.command"]
    limitations = [
        "System administrators regularly use interactive sudo bash or root shells during standard maintenance.",
        "Configuration management agents (Ansible, Puppet, Chef) run root commands programmatically.",
        "Logs without sudo command details cannot be evaluated by this rule."
    ]
    test_scenario = "Sudo log record where command contains an interactive root shell or sensitive file access."
    mitre_dict = {
        "technique_id": "T1548.003",
        "technique_name": "Abuse Elevation Control Mechanism: Sudo and Sudo Caching",
        "tactic": "Privilege Escalation / Defense Evasion",
        "url": "https://attack.mitre.org/techniques/T1548/003/",
        "relationship": "Adversaries execute commands with sudo to elevate privileges to root without knowing the root password."
    }

    def evaluate(self, events: List[NormalizedEvent], thresholds: Dict[str, Any]) -> List[Finding]:
        findings: List[Finding] = []

        sudo_events = [
            e for e in events
            if e.event_type == EventTypeEnum.SUDO_ELEVATION
        ]

        for ev in sudo_events:
            cmd = ev.attributes.get("command", "")
            target_user = ev.attributes.get("target_user", "root")

            if not cmd:
                continue

            match = SUSPICIOUS_REGEX.search(cmd)
            if match:
                matched_pattern = match.group(0)
                hash_id = hashlib.sha256(
                    f"{self.rule_id}|{ev.event_id}|{cmd}".encode("utf-8")
                ).hexdigest()[:12]

                findings.append(Finding(
                    finding_id=f"fnd-{hash_id}",
                    rule_id=self.rule_id,
                    rule_name=self.name,
                    severity=self.severity,
                    confidence=ConfidenceEnum.MEDIUM,
                    first_seen=ev.timestamp,
                    last_seen=ev.timestamp,
                    source_ip=ev.source_ip,
                    username=ev.username,
                    hostname=ev.hostname,
                    match_count=1,
                    evidence_event_ids=[ev.event_id],
                    explanation=(
                        f"User '{ev.username}' executed potentially sensitive privileged command "
                        f"'{cmd}' as target '{target_user}'."
                    ),
                    trigger_reason=f"Executed command matched sensitive privilege pattern '{matched_pattern}'.",
                    threshold_details={
                        "matched_pattern": matched_pattern,
                        "command": cmd,
                        "target_user": target_user,
                    },
                    defensive_steps=[
                        f"Verify if user '{ev.username}' is an authorized systems administrator.",
                        "Confirm if a formal Change Request or emergency maintenance ticket corresponds to this activity.",
                        "Inspect system process tree and subsequent command history to verify actions taken within the elevated shell.",
                        "Verify integrity of critical system files and sudoers configuration (/etc/sudoers).",
                    ],
                    known_limitations=self.limitations,
                    mitre_attack=MitreAttackRef(
                        technique_id=self.mitre_dict["technique_id"],
                        technique_name=self.mitre_dict["technique_name"],
                        tactic=self.mitre_dict["tactic"],
                        url=self.mitre_dict["url"],
                        relationship=self.mitre_dict["relationship"],
                    )
                ))

        return findings
