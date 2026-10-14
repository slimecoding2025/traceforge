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


class PasswordSprayingRule(BaseRule):
    rule_id = "TF-DET-002"
    name = "Password Spraying Indicators"
    description = (
        "Identifies potential password spraying patterns where a single source IP targets "
        "multiple distinct user accounts within a sliding time window. Note: This is an analytical "
        "indicator of horizontal authentication probing, not definitive proof of an attack."
    )
    severity = SeverityEnum.MEDIUM
    default_thresholds = {
        "min_distinct_users": 3,
        "window_seconds": 600,
    }
    required_fields = ["source_ip", "username", "timestamp", "outcome"]
    limitations = [
        "Network proxies, NAT gateways, or corporate jump hosts may aggregate multiple legitimate users logging in.",
        "Internal vulnerability scanners or compliance audits systematically test accounts by design.",
        "Does not confirm malicious intent without corroborating payload or external threat context."
    ]
    test_scenario = "Single IP targeting >= 3 distinct user accounts with failed authentication within 600 seconds."
    mitre_dict = {
        "technique_id": "T1110.003",
        "technique_name": "Brute Force: Password Spraying",
        "tactic": "Credential Access",
        "url": "https://attack.mitre.org/techniques/T1110/003/",
        "relationship": "Adversaries may attempt a common password across many accounts to bypass per-account lockout policies."
    }

    def evaluate(self, events: List[NormalizedEvent], thresholds: Dict[str, Any]) -> List[Finding]:
        min_users = int(thresholds.get("min_distinct_users", self.default_thresholds["min_distinct_users"]))
        window_sec = int(thresholds.get("window_seconds", self.default_thresholds["window_seconds"]))
        window = timedelta(seconds=window_sec)

        candidates = [
            e for e in events
            if e.source_ip and e.username and (
                e.event_type in (EventTypeEnum.SSH_LOGIN_FAILED, EventTypeEnum.INVALID_USER)
                or e.outcome == OutcomeEnum.FAILURE
            )
        ]

        ip_groups = defaultdict(list)
        for e in candidates:
            ip_groups[e.source_ip].append(e)

        findings: List[Finding] = []

        for src_ip, ev_list in ip_groups.items():
            ev_list.sort(key=lambda x: x.timestamp)
            n = len(ev_list)

            i = 0
            while i < n:
                cluster = [ev_list[i]]
                j = i + 1
                while j < n and (ev_list[j].timestamp - ev_list[i].timestamp) <= window:
                    cluster.append(ev_list[j])
                    j += 1

                distinct_users = sorted(list({e.username for e in cluster if e.username}))
                if len(distinct_users) >= min_users:
                    first_seen = cluster[0].timestamp
                    last_seen = cluster[-1].timestamp
                    duration_sec = int((last_seen - first_seen).total_seconds())

                    hash_id = hashlib.sha256(
                        f"{self.rule_id}|{src_ip}|{first_seen.isoformat()}|{len(distinct_users)}".encode("utf-8")
                    ).hexdigest()[:12]

                    findings.append(Finding(
                        finding_id=f"fnd-{hash_id}",
                        rule_id=self.rule_id,
                        rule_name=self.name,
                        severity=self.severity,
                        confidence=ConfidenceEnum.MEDIUM,
                        first_seen=first_seen,
                        last_seen=last_seen,
                        source_ip=src_ip,
                        username=f"{len(distinct_users)} distinct accounts",
                        hostname=cluster[0].hostname,
                        match_count=len(cluster),
                        evidence_event_ids=[e.event_id for e in cluster],
                        explanation=(
                            f"Observed authentication attempts across {len(distinct_users)} distinct accounts "
                            f"({', '.join(distinct_users[:6])}) from source {src_ip} in {duration_sec}s."
                        ),
                        trigger_reason=(
                            f"Distinct usernames count ({len(distinct_users)}) reached or exceeded "
                            f"threshold ({min_users}) within {window_sec}s."
                        ),
                        threshold_details={
                            "min_distinct_users": min_users,
                            "window_seconds": window_sec,
                            "observed_distinct_users": len(distinct_users),
                            "targeted_accounts": distinct_users,
                        },
                        defensive_steps=[
                            "Check whether any of the targeted accounts subsequently experienced a successful login.",
                            "Identify whether targeted accounts include active administrator or sensitive service accounts.",
                            "Verify if the source IP belongs to an internal security scanner or NAT environment.",
                            "Check if accounts have multi-factor authentication (MFA) enabled.",
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
