# Contributing to TraceForge

Thank you for your interest in contributing to **TraceForge**!

TraceForge is an open-source, privacy-first cybersecurity investigation workbench for Linux authentication logs and structured security events. We welcome contributions of new explainable detection rules, parser enhancements, and test fixtures.

## Core Contributing Principles

1. **Defensive Focus**: All tools and detection rules must be defensive in nature. Do not submit offensive exploitation tools or malicious payloads.
2. **Synthetic Data Only**: Never submit logs containing real corporate IP addresses, real usernames, or actual organizational telemetry. All fixtures in `sample-data/` and `tests/` must be 100% synthetic.
3. **Deterministic & Explainable**: Rules must have clearly explained rationale, configurable thresholds, known limitations, and legitimate false-positive scenarios.
4. **Offline Autonomy**: Never introduce dependencies requiring remote API keys, cloud subscriptions, or external analytics.

## Development Setup

### Backend (Python 3.10+)

```bash
# Install development dependencies
pip install -e ".[dev]"

# Run backend unit & integration tests
python3 -m pytest
```

### Frontend (Node.js 20+)

```bash
# Install npm dependencies
npm install

# Run TypeScript linter
npm run lint

# Build production bundle
npm run build
```

## Adding a New Detection Rule

1. Subclass `BaseRule` in `backend/app/detections/rules/`.
2. Define:
   - `rule_id`: Stable identifier e.g. `TF-DET-00X`.
   - `name`: Plain-language rule name.
   - `severity`: Severity classification (`critical`, `high`, `medium`, `low`, `informational`).
   - `default_thresholds`: Configurable threshold parameters.
   - `required_fields`: Required normalized log attributes.
   - `limitations`: Realistic false positive cases.
   - `mitre_dict`: Official MITRE ATT&CK technique mapping with explicit relationship rationale.
3. Add automated test coverage in `backend/tests/test_detections.py`.
4. Mirror the rule in `src/lib/clientEngine.ts` for browser-side parity.

## Code Style & Commits

- Write descriptive commit messages using Conventional Commits format (`feat:`, `fix:`, `docs:`, `test:`).
- Verify that both `python3 -m pytest` and `npm run lint` pass before opening a Pull Request.
