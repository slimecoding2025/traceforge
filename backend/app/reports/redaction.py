import re
from typing import Dict


class PrivacyRedactor:
    """Deterministic pseudonymization for privacy-preserving reporting.
    Ensures that identical real IPs/usernames receive identical pseudonyms
    throughout the entire report, preserving analytical correlation.
    """

    def __init__(self, redact_ips: bool = True, redact_users: bool = True, redact_hosts: bool = True):
        self.redact_ips = redact_ips
        self.redact_users = redact_users
        self.redact_hosts = redact_hosts
        self.ip_map: Dict[str, str] = {}
        self.user_map: Dict[str, str] = {}
        self.host_map: Dict[str, str] = {}
        self._ip_counter = 1
        self._user_counter = 1
        self._host_counter = 1

    def pseudonymize_ip(self, ip: str) -> str:
        if not ip or not self.redact_ips:
            return ip
        if ip not in self.ip_map:
            self.ip_map[ip] = f"ANON_IP_{self._ip_counter}"
            self._ip_counter += 1
        return self.ip_map[ip]

    def pseudonymize_user(self, username: str) -> str:
        if not username or not self.redact_users:
            return username
        if username not in self.user_map:
            self.user_map[username] = f"user_{self._user_counter}"
            self._user_counter += 1
        return self.user_map[username]

    def pseudonymize_host(self, host: str) -> str:
        if not host or not self.redact_hosts:
            return host
        if host not in self.host_map:
            self.host_map[host] = f"host_{self._host_counter}"
            self._host_counter += 1
        return self.host_map[host]

    def sanitize_text(self, text: str) -> str:
        if not text:
            return ""
        result = text
        if self.redact_ips:
            for real_ip, pseudo_ip in self.ip_map.items():
                result = result.replace(real_ip, pseudo_ip)
            ipv4_pattern = re.compile(r"\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b")
            for match in ipv4_pattern.findall(result):
                pseudo = self.pseudonymize_ip(match)
                result = result.replace(match, pseudo)

        if self.redact_users:
            for real_user, pseudo_user in self.user_map.items():
                result = result.replace(real_user, pseudo_user)

        if self.redact_hosts:
            for real_host, pseudo_host in self.host_map.items():
                result = result.replace(real_host, pseudo_host)

        return result
