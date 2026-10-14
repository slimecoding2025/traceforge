from typing import Any, Dict, List, Optional
from ..models.events import NormalizedEvent
from ..models.findings import Finding, SeverityEnum
from ..models.investigations import RuleDefinition
from .rules import ALL_RULES, BaseRule


class DetectionEngine:
    """Deterministic, explainable detection engine for defensive security logs."""

    def __init__(self, rules: Optional[List[BaseRule]] = None):
        self.rules: Dict[str, BaseRule] = {}
        for rule in (rules or ALL_RULES):
            self.rules[rule.rule_id] = rule

    def get_rule_definitions(self) -> List[RuleDefinition]:
        return [r.get_definition() for r in self.rules.values()]

    def run_detections(
        self,
        events: List[NormalizedEvent],
        custom_thresholds: Optional[Dict[str, Dict[str, Any]]] = None,
        enabled_rule_ids: Optional[List[str]] = None,
    ) -> List[Finding]:
        if not events:
            return []

        sorted_events = sorted(events, key=lambda e: e.timestamp)
        custom_thresholds = custom_thresholds or {}

        all_findings: List[Finding] = []

        for rule_id, rule in self.rules.items():
            if enabled_rule_ids and rule_id not in enabled_rule_ids:
                continue

            thresholds = dict(rule.default_thresholds)
            if rule_id in custom_thresholds:
                thresholds.update(custom_thresholds[rule_id])

            rule_findings = rule.evaluate(sorted_events, thresholds)
            all_findings.extend(rule_findings)

        severity_order = {
            SeverityEnum.CRITICAL: 0,
            SeverityEnum.HIGH: 1,
            SeverityEnum.MEDIUM: 2,
            SeverityEnum.LOW: 3,
            SeverityEnum.INFORMATIONAL: 4,
        }
        all_findings.sort(key=lambda f: (severity_order.get(f.severity, 5), f.first_seen))

        return all_findings
