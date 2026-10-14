import pytest
from datetime import datetime, timezone
from backend.app.parsers.linux_auth import LinuxAuthParser
from backend.app.parsers.jsonl_parser import JSONLParser
from backend.app.parsers import parse_log_data, ParserError
from backend.app.models.events import EventTypeEnum, OutcomeEnum, SourceTypeEnum


def test_linux_auth_parser_ssh_failure():
    parser = LinuxAuthParser(fallback_year=2026)
    line = "Oct 12 10:14:23 server1 sshd[12345]: Failed password for root from 198.51.100.23 port 54321 ssh2"
    events, summary = parser.parse_content(line)

    assert summary.parsed_events == 1
    assert summary.malformed_lines == 0
    ev = events[0]
    assert ev.event_type == EventTypeEnum.SSH_LOGIN_FAILED
    assert ev.outcome == OutcomeEnum.FAILURE
    assert ev.source_ip == "198.51.100.23"
    assert ev.username == "root"
    assert ev.hostname == "server1"
    assert ev.timestamp.year == 2026
    assert ev.timestamp.month == 10
    assert ev.timestamp.day == 12


def test_linux_auth_parser_ssh_accepted_publickey():
    parser = LinuxAuthParser(fallback_year=2026)
    line = "Oct 12 08:00:15 sec-srv-01 sshd[4102]: Accepted publickey for alice from 192.0.2.10 port 51234 ssh2: RSA SHA256:abc123demo"
    events, summary = parser.parse_content(line)

    assert summary.parsed_events == 1
    ev = events[0]
    assert ev.event_type == EventTypeEnum.SSH_LOGIN_SUCCESS
    assert ev.outcome == OutcomeEnum.SUCCESS
    assert ev.username == "alice"
    assert ev.source_ip == "192.0.2.10"


def test_linux_auth_parser_sudo():
    parser = LinuxAuthParser(fallback_year=2026)
    line = "Oct 12 10:16:11 server1 sudo:   deploy : TTY=pts/0 ; PWD=/home/deploy ; USER=root ; COMMAND=/bin/bash"
    events, summary = parser.parse_content(line)

    assert summary.parsed_events == 1
    ev = events[0]
    assert ev.event_type == EventTypeEnum.SUDO_ELEVATION
    assert ev.username == "deploy"
    assert ev.attributes["command"] == "/bin/bash"
    assert ev.attributes["target_user"] == "root"


def test_linux_auth_parser_malformed_lines():
    parser = LinuxAuthParser(fallback_year=2026)
    raw = """
    # Comment line should be skipped
    Garbage invalid line that does not match syslog
    Oct 12 10:14:23 server1 sshd[12345]: Failed password for root from 198.51.100.23 port 54321 ssh2
    Another non-conforming record
    """
    events, summary = parser.parse_content(raw)
    assert summary.parsed_events == 1
    assert summary.malformed_lines == 2
    assert summary.skipped_lines >= 1


def test_jsonl_parser_valid_and_malformed():
    parser = JSONLParser()
    content = """
    {"timestamp": "2026-10-12T11:00:01Z", "source_ip": "198.51.100.201", "username": "root", "event_type": "ssh_login_failed", "outcome": "failure", "message": "Failed password for root"}
    {"broken_json": unquoted
    {"timestamp": "2026-10-12T11:15:00Z", "source_ip": "192.0.2.55", "username": "developer", "event_type": "ssh_login_success", "outcome": "success", "message": "Accepted publickey"}
    """
    events, summary = parser.parse_content(content)
    assert summary.parsed_events == 2
    assert summary.malformed_lines == 1
    assert events[0].source_ip == "198.51.100.201"
    assert events[1].username == "developer"


def test_file_size_limit():
    huge_data = "A" * (16 * 1024 * 1024)
    with pytest.raises(ParserError):
        parse_log_data(huge_data, "large.log")
