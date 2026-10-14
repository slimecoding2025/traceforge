from collections import defaultdict
from datetime import timedelta
import hashlib
from typing import Any, Dict, List
from ...models.events import EventTypeEnum, NormalizedEvent, OutcomeEnum
from ...models.findings import (
    ConfidenceEnum,
    Finding,
    MitreAttackRef,
    SeverityEnum,
)
from .base import BaseRule


class SSHBruteForceRule(BaseRule):
    rule_id = "TF-DET-001"
    name = "SSH Brute-Force Activity"
    description = "Detects multiple failed authentication attempts originating from a single source IP within a configurable time window."
    severity = SeverityEnum.HIGH
    default_thresholds = {
        "min_failed_attempts": 5,
        "window_seconds": 300,
    }
    required_fields = ["source_ip", "timestamp", "outcome"]
    limitations = [
        "Network Address Translation (NAT) or shared VPN proxies may aggregate multiple legitimate users failing passwords.",
        "Automated deployment scripts with stale credentials may resemble brute-force guessing.",
        "Does not indicate whether any credential guess was successful (see TF-DET-003)."
    ]
    test_scenario = "Single IP generating >= 5 failed SSH authentication attempts within 300 seconds."
    mitre_dict = {
        "technique_id": "T1110.001",
        "technique_name": "Brute Force: Password Guessing",
        "tactic": "Credential Access",
        "url": "https://attack.mitre.org/techniques/T1110/001/",
        "relationship": "Adversary systematically submits password guesses against SSH services to discover valid credentials."
    }

    def evaluate(self, events: List[NormalizedEvent], thresholds: Dict[str, Any]) -> List[Finding]:
        min_failed = int(thresholds.get("min_failed_attempts", self.default_thresholds["min_failed_attempts"]))
        window_sec = int(thresholds.get("window_seconds", self.default_thresholds["window_seconds"]))
        window = timedelta(seconds=window_sec)

        failed_events = [
            e for e in events
            if e.source_ip and (
                e.event_type in (EventTypeEnum.SSH_LOGIN_FAILED, EventTypeEnum.INVALID_USER)
                or e.outcome == OutcomeEnum.FAILURE
            )
        ]

        ip_groups = defaultdict(list)
        for e in failed_events:
            ip_groups[e.source_ip].append(e)

        findings: List[Finding] = []

        for src_ip, ev_list in ip_groups.items():
            ev_list.sort(key=lambda x: x.timestamp)
            n = len(ev_list)
            if n < min_failed:
                continue

            clusters: List[List[NormalizedEvent]] = []
            curr_cluster: List[NormalizedEvent] = []

            for i in range(n):
                if not curr_cluster:
                    curr_cluster.append(ev_list[i])
                    continue
                if (ev_list[i].timestamp - curr_cluster[0].timestamp) <= window:
                    curr_cluster.append(ev_list[i])
                else:
                    if len(curr_cluster) >= min_failed:
                        clusters.append(curr_cluster)
                    curr_cluster = [ev_list[i]]

            if len(curr_cluster) >= min_failed:
                clusters.append(curr_cluster)

            for cluster in clusters:
                first_seen = cluster[0].timestamp
                last_seen = cluster[-1].timestamp
                duration_sec = int((last_seen - first_seen).total_seconds())
                targeted_users = sorted(list({e.username for e in cluster if e.username}))
                users_display = ", ".join(targeted_users[:5]) if targeted_users else "unknown"

                confidence = ConfidenceEnum.HIGH if len(cluster) >= (min_failed * 1.5) else ConfidenceEnum.MEDIUM

                hash_id = hashlib.sha256(
                    f"{self.rule_id}|{src_ip}|{first_seen.isoformat()}|{len(cluster)}".encode("utf-8")
                ).hexdigest()[:12]

                findings.append(Finding(
                    finding_id=f"fnd-{hash_id}",
                    rule_id=self.rule_id,
                    rule_name=self.name,
                    severity=self.severity,
                    confidence=confidence,
                    first_seen=first_seen,
                    last_seen=last_seen,
                    source_ip=src_ip,
                    username=targeted_users[0] if len(targeted_users) == 1 else (f"{len(targeted_users)} accounts" if targeted_users else None),
                    hostname=cluster[0].hostname,
                    match_count=len(cluster),
                    evidence_event_ids=[e.event_id for e in cluster],
                    explanation=(
                        f"Detected {len(cluster)} failed authentication attempts from IP {src_ip} "
                        f"targeting {len(targeted_users)} username(s) [{users_display}] over {duration_sec}s."
                    ),
                    trigger_reason=(
                        f"Count of failed attempts ({len(cluster)}) exceeded threshold ({min_failed}) "
                        f"within the {window_sec}s window."
                    ),
                    threshold_details={
                        "min_failed_attempts": min_failed,
                        "window_seconds": window_sec,
                        "observed_attempts": len(cluster),
                        "observed_duration_seconds": duration_sec,
                    },
                    defensive_steps=[
                        f"Determine whether any logins from {src_ip} succeeded in adjacent logs.",
                        f"Review targeted username(s) to verify whether valid or service accounts were probed.",
                        "Inspect source IP reputation using local threat intel or whois records.",
                        "Apply SSH rate limiting or fail2ban jail on edge firewall if unauthorized.",
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
