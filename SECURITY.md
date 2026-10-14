# Security Policy & Responsible Vulnerability Disclosure

## Supported Versions

TraceForge is an open-source defensive security investigation workbench. We actively maintain and provide security updates for the current major branch:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Security Principles & Boundaries

TraceForge is built around strict security and privacy guardrails:
1. **Offline & Privacy-First**: Log files analyzed by TraceForge must never leave the local environment. No telemetry, third-party analytics, or cloud AI services are called.
2. **Defensive Only**: TraceForge contains zero automated active response capabilities. It does not alter firewall configurations, modify SSH daemons, or execute commands against remote hosts.
3. **Safe Parsing Boundaries**: Log parsing code enforces input length ceilings (15MB per file), line count limits (25,000 events), and treats all ingested records as untrusted text with strict escaping to prevent cross-site scripting (XSS) or code injection.

## Reporting a Vulnerability

If you discover a security vulnerability (such as a parser crash, path traversal, injection flaw, or privacy leak) in TraceForge:

1. **Do not open a public issue.**
2. Send an email to `security@traceforge.internal` or open a private GitHub Security Advisory on the repository.
3. Include:
   - Description of the vulnerability and attack vector.
   - Minimal reproduction log file or proof-of-concept fixture.
   - Proposed mitigation or patch if available.
4. You will receive an acknowledgment within 48 hours and updates as a patch is developed and verified.

Thank you for contributing to responsible defensive disclosure.
