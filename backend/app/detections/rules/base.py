from abc import ABC, abstractmethod
from typing import Any, Dict, List
from ...models.events import NormalizedEvent
from ...models.findings import Finding, SeverityEnum
from ...models.investigations import RuleDefinition


class BaseRule(ABC):
    rule_id: str
    name: str
    description: str
    severity: SeverityEnum
    default_thresholds: Dict[str, Any]
    required_fields: List[str]
    limitations: List[str]
    test_scenario: str

    def get_definition(self) -> RuleDefinition:
        mitre_data = None
        if hasattr(self, "mitre_dict"):
            mitre_data = getattr(self, "mitre_dict")
        return RuleDefinition(
            rule_id=self.rule_id,
            name=self.name,
            description=self.description,
            severity=self.severity,
            default_thresholds=self.default_thresholds,
            required_fields=self.required_fields,
            mitre_attack=mitre_data,
            limitations=self.limitations,
            test_scenario=self.test_scenario,
        )

    @abstractmethod
    def evaluate(
        self,
        events: List[NormalizedEvent],
        thresholds: Dict[str, Any]
    ) -> List[Finding]:
        pass
