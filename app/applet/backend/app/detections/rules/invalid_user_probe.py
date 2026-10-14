from collections import defaultdict
from datetime import timedelta
import hashlib
from typing import Any, Dict, List
from ...models.events import EventTypeEnum, NormalizedEvent
from ...models.findings import (
    ConfidenceEnum,
    Finding,
    MitreAttackRef,
    SeverityEnum,
)
from .base import BaseRule


class InvalidUserProbeRule(BaseRule):
    rule_id = "TF-DET-005"
    name = "Non-Existent User Probing"
    description = (
        "Detects repeated authentication attempts targeting invalid or non-existent usernames from "
        "a single source IP, typically indicative of automated reconnaissance or dictionary scanning."
    )
    severity = SeverityEnum.LOW
    default_thresholds = {
        "min_invalid_attempts": 3,
        "window_seconds": 300,
    }
    required_fields = ["source_ip", "event_type", "timestamp"]
    limitations = [
        "Users frequently mistype their own usernames (e.g. typos or domain prefixes).",
        "Automated worms systematically sweep IPv4 space with standard dictionary lists without targeting the specific organization.",
        "Low operational impact unless coupled with successful credential acquisition."
    ]
    test_scenario = "Single IP attempting login against >= 3 invalid user accounts within 300 seconds."
    mitre_dict = {
        "technique_id": "T1087.001",
        "technique_name": "Account Discovery: Local Account",
        "tactic": "Discovery",
        "url": "https://attack.mitre.org/techniques/T1087/001/",
        "relationship": "Adversaries probe services with candidate usernames to enumerate valid accounts on target systems."
    }

    def evaluate(self, events: List[NormalizedEvent], thresholds: Dict[str, Any]) -> List[Finding]:
        min_invalid = int(thresholds.get("min_invalid_attempts", self.default_thresholds["min_invalid_attempts"]))
        window_sec = int(thresholds.get("window_seconds", self.default_thresholds["window_seconds"]))
        window = timedelta(seconds=window_sec)

        invalid_events = [
            e for e in events
            if e.source_ip and (
                e.event_type == EventTypeEnum.INVALID_USER
                or e.attributes.get("is_invalid_user") is True
            )
        ]

        ip_groups = defaultdict(list)
        for e in invalid_events:
            ip_groups[e.source_ip].append(e)

        findings: List[Finding] = []

        for src_ip, ev_list in ip_groups.items():
            ev_list.sort(key=lambda x: x.timestamp)
            n = len(ev_list)
            if n < min_invalid:
                continue

            i = 0
            while i < n:
                cluster = [ev_list[i]]
                j = i + 1
                while j < n and (ev_list[j].timestamp - ev_list[i].timestamp) <= window:
                    cluster.append(ev_list[j])
                    j += 1

                if len(cluster) >= min_invalid:
                    first_seen = cluster[0].timestamp
                    last_seen = cluster[-1].timestamp
                    duration_sec = int((last_seen - first_seen).total_seconds())
                    probed_users = sorted(list({e.username for e in cluster if e.username}))

                    hash_id = hashlib.sha256(
                        f"{self.rule_id}|{src_ip}|{first_seen.isoformat()}|{len(cluster)}".encode("utf-8")
                    ).hexdigest()[:12]

                    findings.append(Finding(
                        finding_id=f"fnd-{hash_id}",
                        rule_id=self.rule_id,
                        rule_name=self.name,
                        severity=self.severity,
                        confidence=ConfidenceEnum.HIGH,
                        first_seen=first_seen,
                        last_seen=last_seen,
                        source_ip=src_ip,
                        username=f"{len(probed_users)} invalid usernames",
                        hostname=cluster[0].hostname,
                        match_count=len(cluster),
                        evidence_event_ids=[e.event_id for e in cluster],
                        explanation=(
                            f"Source IP {src_ip} probed {len(cluster)} invalid user account(s) "
                            f"({', '.join(probed_users[:5])}) over {duration_sec}s."
                        ),
                        trigger_reason=(
                            f"Invalid user attempt count ({len(cluster)}) exceeded threshold ({min_invalid}) "
                            f"within {window_sec}s."
                        ),
                        threshold_details={
                            "min_invalid_attempts": min_invalid,
                            "window_seconds": window_sec,
                            "observed_attempts": len(cluster),
                            "probed_usernames": probed_users,
                        },
                        defensive_steps=[
                            "Verify that none of the probed usernames match active or dormant accounts in the directory.",
                            "Monitor whether the source IP transitions to targeting valid accounts.",
                            "Consider geofencing or rate-limiting SSH access at the edge firewall.",
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
                    i = j
                else:
                    i += 1

        return findings
