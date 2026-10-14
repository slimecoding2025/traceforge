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


class SuccessAfterFailureRule(BaseRule):
    rule_id = "TF-DET-003"
    name = "Successful Login Following Repeated Failures"
    description = (
        "Detects a successful authentication event preceded by multiple failed attempts from "
        "the same source IP within a correlation window, indicating potential credential compromise "
        "or successful brute-force."
    )
    severity = SeverityEnum.CRITICAL
    default_thresholds = {
        "min_prior_failures": 3,
        "window_seconds": 900,
    }
    required_fields = ["source_ip", "outcome", "timestamp"]
    limitations = [
        "A legitimate user may have mistyped their password multiple times before correctly entering it.",
        "A user retrieving a forgotten password from a password manager after multiple bad guesses.",
        "Password rotation grace periods where cached credentials fail repeatedly before the user enters the new password."
    ]
    test_scenario = "Source IP generating >= 3 failed logins followed immediately by a successful login within 900 seconds."
    mitre_dict = {
        "technique_id": "T1078",
        "technique_name": "Valid Accounts",
        "tactic": "Initial Access / Persistence",
        "url": "https://attack.mitre.org/techniques/T1078/",
        "relationship": "Adversaries may obtain and use credentials of existing accounts following brute-force or credential access."
    }

    def evaluate(self, events: List[NormalizedEvent], thresholds: Dict[str, Any]) -> List[Finding]:
        min_failures = int(thresholds.get("min_prior_failures", self.default_thresholds["min_prior_failures"]))
        window_sec = int(thresholds.get("window_seconds", self.default_thresholds["window_seconds"]))
        window = timedelta(seconds=window_sec)

        auth_events = [
            e for e in events
            if e.source_ip and (
                e.event_type in (EventTypeEnum.SSH_LOGIN_FAILED, EventTypeEnum.SSH_LOGIN_SUCCESS, EventTypeEnum.INVALID_USER)
                or e.outcome in (OutcomeEnum.SUCCESS, OutcomeEnum.FAILURE)
            )
        ]

        ip_groups = defaultdict(list)
        for e in auth_events:
            ip_groups[e.source_ip].append(e)

        findings: List[Finding] = []

        for src_ip, ev_list in ip_groups.items():
            ev_list.sort(key=lambda x: x.timestamp)

            for idx, success_ev in enumerate(ev_list):
                if not (success_ev.event_type == EventTypeEnum.SSH_LOGIN_SUCCESS or success_ev.outcome == OutcomeEnum.SUCCESS):
                    continue

                prior_failures: List[NormalizedEvent] = []
                for k in range(idx - 1, -1, -1):
                    prior = ev_list[k]
                    if (success_ev.timestamp - prior.timestamp) > window:
                        break
                    if prior.outcome == OutcomeEnum.FAILURE or prior.event_type in (EventTypeEnum.SSH_LOGIN_FAILED, EventTypeEnum.INVALID_USER):
                        prior_failures.append(prior)

                if len(prior_failures) >= min_failures:
                    prior_failures.reverse()
                    evidence = prior_failures + [success_ev]
                    first_seen = evidence[0].timestamp
                    last_seen = success_ev.timestamp
                    duration_sec = int((last_seen - first_seen).total_seconds())

                    compromised_user = success_ev.username or "unknown_user"
                    targeted_users = sorted(list({e.username for e in prior_failures if e.username}))

                    same_user_targeted = compromised_user in targeted_users
                    confidence = ConfidenceEnum.HIGH if (same_user_targeted or len(prior_failures) >= 5) else ConfidenceEnum.MEDIUM

                    hash_id = hashlib.sha256(
                        f"{self.rule_id}|{src_ip}|{success_ev.event_id}".encode("utf-8")
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
                        username=compromised_user,
                        hostname=success_ev.hostname,
                        match_count=len(evidence),
                        evidence_event_ids=[e.event_id for e in evidence],
                        explanation=(
                            f"Source IP {src_ip} succeeded in authenticating as '{compromised_user}' "
                            f"after {len(prior_failures)} failed attempt(s) within {duration_sec}s."
                        ),
                        trigger_reason=(
                            f"Prior failure count ({len(prior_failures)}) met or exceeded threshold ({min_failures}) "
                            f"directly preceding successful login at {success_ev.timestamp.isoformat()}."
                        ),
                        threshold_details={
                            "min_prior_failures": min_failures,
                            "window_seconds": window_sec,
                            "observed_prior_failures": len(prior_failures),
                            "successful_user": compromised_user,
                        },
                        defensive_steps=[
                            f"IMMEDIATE ACTION: Contact account owner ('{compromised_user}') out-of-band to verify if this login was authorized.",
                            f"Terminate active SSH session from {src_ip} if confirmed unauthorized.",
                            "Review process execution and shell command history (e.g., .bash_history, auditd, syslog) for the session.",
                            "Rotate SSH keys and credentials for the compromised account.",
                            "Check for persistence mechanisms (authorized_keys modifications, crontabs, new accounts, suid binaries).",
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
