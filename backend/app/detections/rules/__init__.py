from .base import BaseRule
from .brute_force import SSHBruteForceRule
from .password_spray import PasswordSprayingRule
from .success_after_failure import SuccessAfterFailureRule
from .privilege_abuse import SuspiciousPrivilegedActivityRule
from .invalid_user_probe import InvalidUserProbeRule

ALL_RULES = [
    SSHBruteForceRule(),
    PasswordSprayingRule(),
    SuccessAfterFailureRule(),
    SuspiciousPrivilegedActivityRule(),
    InvalidUserProbeRule(),
]

__all__ = [
    "BaseRule",
    "SSHBruteForceRule",
    "PasswordSprayingRule",
    "SuccessAfterFailureRule",
    "SuspiciousPrivilegedActivityRule",
    "InvalidUserProbeRule",
    "ALL_RULES",
]
