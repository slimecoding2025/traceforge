from abc import ABC, abstractmethod
from typing import List, Tuple
from ..models.events import NormalizedEvent, ParseSummary

# Resource safeguards
MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024  # 15 MB limit
MAX_EVENTS_COUNT = 25000  # 25k event safety ceiling


class ParserError(Exception):
    """Custom parser validation exception."""
    pass


class BaseParser(ABC):
    @abstractmethod
    def parse_content(self, text: str, source_name: str = "") -> Tuple[List[NormalizedEvent], ParseSummary]:
        """Parse raw string content into normalized events with diagnostic summary."""
        pass
