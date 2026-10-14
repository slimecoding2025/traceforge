import { NormalizedEvent, Finding, ParseSummary, OverviewStats, RuleDefinition, AnalystNote } from '../types';

export const BUILT_IN_RULES: RuleDefinition[] = [
  {
    rule_id: 'TF-DET-001',
    name: 'SSH Brute-Force Activity',
    description: 'Detects multiple failed authentication attempts originating from a single source IP within a configurable time window.',
    severity: 'high',
    default_thresholds: { min_failed_attempts: 5, window_seconds: 300 },
    required_fields: ['source_ip', 'timestamp', 'outcome'],
    mitre_attack: {
      technique_id: 'T1110.001',
      technique_name: 'Brute Force: Password Guessing',
      tactic: 'Credential Access',
      url: 'https://attack.mitre.org/techniques/T1110/001/',
      relationship: 'Adversary systematically submits password guesses against SSH services to discover valid credentials.'
    },
    limitations: [
      'NAT or shared proxy gateways may combine multiple legitimate users mistyping passwords.',
      'Deployment scripts with stale keys can look like brute-force.',
      'Does not indicate whether any guess was successful (see TF-DET-003).'
    ],
    test_scenario: 'Single source IP generating >= 5 failed SSH authentication attempts within 300 seconds.'
  },
  {
    rule_id: 'TF-DET-002',
    name: 'Password Spraying Indicators',
    description: 'Identifies potential password spraying patterns where a single source IP targets multiple distinct user accounts within a sliding time window. Note: This is an analytical indicator of horizontal probing.',
    severity: 'medium',
    default_thresholds: { min_distinct_users: 3, window_seconds: 600 },
    required_fields: ['source_ip', 'username', 'timestamp', 'outcome'],
    mitre_attack: {
      technique_id: 'T1110.003',
      technique_name: 'Brute Force: Password Spraying',
      tactic: 'Credential Access',
      url: 'https://attack.mitre.org/techniques/T1110/003/',
      relationship: 'Adversaries attempt a common password across many accounts to bypass per-account lockout policies.'
    },
    limitations: [
      'Corporate jump hosts or VPNs may aggregate multiple legitimate users logging in.',
      'Internal vulnerability audits test accounts by design.',
      'Does not confirm malicious intent without corroborating payload.'
    ],
    test_scenario: 'Single IP targeting >= 3 distinct user accounts with failed authentication within 600 seconds.'
  },
  {
    rule_id: 'TF-DET-003',
    name: 'Successful Login Following Repeated Failures',
    description: 'Detects a successful authentication event preceded by multiple failed attempts from the same source IP within a correlation window, indicating potential credential compromise or successful brute-force.',
    severity: 'critical',
    default_thresholds: { min_prior_failures: 3, window_seconds: 900 },
    required_fields: ['source_ip', 'outcome', 'timestamp'],
    mitre_attack: {
      technique_id: 'T1078',
      technique_name: 'Valid Accounts',
      tactic: 'Initial Access / Persistence',
      url: 'https://attack.mitre.org/techniques/T1078/',
      relationship: 'Adversaries may obtain and use credentials of existing accounts following brute-force or credential access.'
    },
    limitations: [
      'A legitimate user mistyping their password multiple times before correctly entering it.',
      'A user retrieving a forgotten password from a password manager.',
      'Cached credential grace periods.'
    ],
    test_scenario: 'Source IP generating >= 3 failed logins followed immediately by a successful login within 900 seconds.'
  },
  {
    rule_id: 'TF-DET-004',
    name: 'Suspicious Privileged Command Execution',
    description: 'Detects privilege elevation events executing high-risk administrative binaries, shell spawns, or security-sensitive commands via sudo only when log telemetry contains explicit evidence.',
    severity: 'high',
    default_thresholds: { alert_on_shell_spawn: true },
    required_fields: ['event_type', 'username', 'attributes.command'],
    mitre_attack: {
      technique_id: 'T1548.003',
      technique_name: 'Abuse Elevation Control Mechanism: Sudo and Sudo Caching',
      tactic: 'Privilege Escalation',
      url: 'https://attack.mitre.org/techniques/T1548/003/',
      relationship: 'Adversaries execute commands with sudo to elevate privileges to root without knowing the root password.'
    },
    limitations: [
      'System administrators frequently use interactive sudo bash during routine operations.',
      'Configuration management agents (Ansible, Puppet) run root commands.',
      'Logs without command arguments cannot be evaluated.'
    ],
    test_scenario: 'Sudo log record where command contains an interactive root shell or sensitive binary.'
  },
  {
    rule_id: 'TF-DET-005',
    name: 'Non-Existent User Probing',
    description: 'Detects repeated authentication attempts targeting invalid or non-existent usernames from a single source IP, typically indicative of automated reconnaissance or dictionary scanning.',
    severity: 'low',
    default_thresholds: { min_invalid_attempts: 3, window_seconds: 300 },
    required_fields: ['source_ip', 'event_type', 'timestamp'],
    mitre_attack: {
      technique_id: 'T1087.001',
      technique_name: 'Account Discovery: Local Account',
      tactic: 'Discovery',
      url: 'https://attack.mitre.org/techniques/T1087/001/',
      relationship: 'Adversaries probe services with candidate usernames to enumerate valid accounts on target systems.'
    },
    limitations: [
      'Users mistyping their usernames (typos or domain prefix errors).',
      'Automated worms scanning IPv4 space indiscriminately without targeted intent.'
    ],
    test_scenario: 'Single IP attempting login against >= 3 invalid user accounts within 300 seconds.'
  }
];

const MONTH_MAP: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
};

export function parseLogsClient(text: string, filename = 'upload.log'): { events: NormalizedEvent[]; summary: ParseSummary } {
  const lines = text.split('\n');
  const events: NormalizedEvent[] = [];
  let malformed = 0;
  let skipped = 0;
  const currentYear = 2026;

  const isJsonl = filename.endsWith('.jsonl') || lines.slice(0, 5).some(l => l.trim().startsWith('{') && l.trim().endsWith('}'));

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i].trim();
    if (!raw || raw.startsWith('#') || raw.startsWith('//')) {
      skipped++;
      continue;
    }

    if (isJsonl) {
      try {
        const obj = JSON.parse(raw);
        const tsStr = obj.timestamp || obj['@timestamp'] || obj.time || new Date().toISOString();
        const d = new Date(tsStr);
        if (isNaN(d.getTime())) {
          malformed++;
          continue;
        }

        const evType = (obj.event_type || 'unknown').toLowerCase();
        const outcome = (obj.outcome || (evType.includes('fail') ? 'failure' : evType.includes('success') ? 'success' : 'unknown')).toLowerCase();

        events.push({
          event_id: `ev-client-${i}-${Math.random().toString(36).substring(2, 8)}`,
          timestamp: d.toISOString(),
          source_type: 'jsonl',
          event_type: evType as any,
          source_ip: obj.source_ip || obj.src_ip || null,
          username: obj.username || obj.user || null,
          hostname: obj.hostname || obj.host || null,
          outcome: outcome as any,
          message: obj.message || obj.msg || `Event ${evType}`,
          raw_event_reference: raw,
          attributes: obj.command ? { command: obj.command, target_user: obj.target_user || 'root' } : {}
        });
      } catch {
        malformed++;
      }
    } else {
      const syslogMatch = raw.match(/^([A-Z][a-z]{2})\s+([0-9]{1,2})\s+([0-9]{2}:[0-9]{2}:[0-9]{2})\s+([^\s]+)\s+([^:]+):\s*(.*)$/);
      if (!syslogMatch) {
        malformed++;
        continue;
      }

      const [, monthStr, dayStr, timeStr, hostname, process, message] = syslogMatch;
      const month = MONTH_MAP[monthStr] ?? 9;
      const day = parseInt(dayStr, 10);
      const [h, m, s] = timeStr.split(':').map(Number);
      const dt = new Date(Date.UTC(currentYear, month, day, h, m, s));

      let event_type: any = 'unknown';
      let outcome: any = 'unknown';
      let source_ip: string | null = null;
      let username: string | null = null;
      const attributes: Record<string, any> = { process, line_index: i };

      const failMatch = message.match(/Failed\s+(?:password|publickey|none)\s+for\s+(?:invalid\s+user\s+)?([^\s]+)\s+from\s+([0-9a-fA-F:.]+)\s+port\s+([0-9]+)/i);
      const acceptMatch = message.match(/Accepted\s+(?:password|publickey|pam)\s+for\s+([^\s]+)\s+from\s+([0-9a-fA-F:.]+)\s+port\s+([0-9]+)/i);
      const invMatch = message.match(/Invalid\s+user\s+([^\s]+)\s+from\s+([0-9a-fA-F:.]+)/i);
      const sudoMatch = message.match(/([^\s]+)\s*:\s*TTY=([^\s]+)\s*;\s*PWD=([^\s]+)\s*;\s*USER=([^\s]+)\s*;\s*COMMAND=(.*)/i);
      const pamOpenMatch = message.match(/pam_unix\([^)]+\):\s*session opened for user ([^\s\(]+)/i);
      const pamCloseMatch = message.match(/pam_unix\([^)]+\):\s*session closed for user ([^\s\(]+)/i);

      if (failMatch) {
        username = failMatch[1];
        source_ip = failMatch[2];
        event_type = 'ssh_login_failed';
        outcome = 'failure';
        attributes.port = parseInt(failMatch[3], 10);
        if (message.toLowerCase().includes('invalid user')) {
          attributes.is_invalid_user = true;
        }
      } else if (acceptMatch) {
        username = acceptMatch[1];
        source_ip = acceptMatch[2];
        event_type = 'ssh_login_success';
        outcome = 'success';
        attributes.port = parseInt(acceptMatch[3], 10);
      } else if (invMatch) {
        username = invMatch[1];
        source_ip = invMatch[2];
        event_type = 'invalid_user';
        outcome = 'failure';
        attributes.is_invalid_user = true;
      } else if (sudoMatch) {
        username = sudoMatch[1];
        event_type = 'sudo_elevation';
        outcome = 'success';
        attributes.target_user = sudoMatch[4];
        attributes.command = sudoMatch[5].trim();
      } else if (pamOpenMatch) {
        username = pamOpenMatch[1];
        event_type = 'session_opened';
        outcome = 'success';
      } else if (pamCloseMatch) {
        username = pamCloseMatch[1];
        event_type = 'session_closed';
        outcome = 'success';
      }

      events.push({
        event_id: `ev-client-${i}`,
        timestamp: dt.toISOString(),
        source_type: 'linux_auth',
        event_type,
        source_ip,
        username,
        hostname,
        outcome,
        message,
        raw_event_reference: raw,
        attributes
      });
    }
  }

  return {
    events,
    summary: {
      total_lines: lines.length,
      parsed_events: events.length,
      malformed_lines: malformed,
      skipped_lines: skipped,
      source_type: isJsonl ? 'jsonl' : 'linux_auth',
      errors: malformed > 0 ? [`Processed with ${malformed} malformed log records skipped`] : []
    }
  };
}

export function runClientDetections(events: NormalizedEvent[]): Finding[] {
  const findings: Finding[] = [];
  const sorted = [...events].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // 1. TF-DET-001 (SSH Brute Force) >= 5 failures within 300s
  const ipFails: Record<string, NormalizedEvent[]> = {};
  for (const ev of sorted) {
    if (ev.source_ip && (ev.outcome === 'failure' || ev.event_type === 'ssh_login_failed' || ev.event_type === 'invalid_user')) {
      if (!ipFails[ev.source_ip]) ipFails[ev.source_ip] = [];
      ipFails[ev.source_ip].push(ev);
    }
  }

  for (const [ip, list] of Object.entries(ipFails)) {
    if (list.length >= 5) {
      const first = list[0];
      const last = list[list.length - 1];
      const spanSec = (new Date(last.timestamp).getTime() - new Date(first.timestamp).getTime()) / 1000;
      if (spanSec <= 300) {
        const users = Array.from(new Set(list.map(e => e.username).filter(Boolean)));
        findings.push({
          finding_id: `fnd-bf-${ip.replace(/\./g, '-')}`,
          rule_id: 'TF-DET-001',
          rule_name: 'SSH Brute-Force Activity',
          severity: 'high',
          confidence: list.length >= 8 ? 'high' : 'medium',
          first_seen: first.timestamp,
          last_seen: last.timestamp,
          source_ip: ip,
          username: users[0] || 'root',
          hostname: first.hostname,
          match_count: list.length,
          evidence_event_ids: list.map(e => e.event_id),
          explanation: `Observed ${list.length} failed SSH authentication attempts from source IP ${ip} targeting ${users.join(', ') || 'root'} within ${Math.round(spanSec)}s.`,
          trigger_reason: `Attempt count (${list.length}) exceeded detection threshold of 5 failures within 300s.`,
          threshold_details: { min_failed_attempts: 5, window_seconds: 300, observed: list.length },
          defensive_steps: [
            `Verify whether any authentication attempts from IP ${ip} succeeded in subsequent logs.`,
            `Audit targeted account(s) to verify password strength or enforcement of SSH key-only policies.`,
            `Apply rate-limiting or firewall drop rule for ${ip} if unrecognized.`
          ],
          known_limitations: BUILT_IN_RULES[0].limitations,
          mitre_attack: BUILT_IN_RULES[0].mitre_attack,
          status: 'new',
          notes: [],
          created_at: new Date().toISOString()
        });
      }
    }
  }

  // 2. TF-DET-002 (Password Spraying) >= 3 distinct users from single IP within 600s
  for (const [ip, list] of Object.entries(ipFails)) {
    const distinctUsers = Array.from(new Set(list.map(e => e.username).filter(Boolean)));
    if (distinctUsers.length >= 3) {
      const first = list[0];
      const last = list[list.length - 1];
      findings.push({
        finding_id: `fnd-spray-${ip.replace(/\./g, '-')}`,
        rule_id: 'TF-DET-002',
        rule_name: 'Password Spraying Indicators',
        severity: 'medium',
        confidence: 'medium',
        first_seen: first.timestamp,
        last_seen: last.timestamp,
        source_ip: ip,
        username: `${distinctUsers.length} accounts`,
        hostname: first.hostname,
        match_count: list.length,
        evidence_event_ids: list.map(e => e.event_id),
        explanation: `Observed failed authentications targeting ${distinctUsers.length} distinct usernames (${distinctUsers.slice(0, 5).join(', ')}) from ${ip}. Note: This is an analytical indicator of horizontal probing rather than conclusive attack proof.`,
        trigger_reason: `Targeted distinct username count (${distinctUsers.length}) met or exceeded threshold of 3 within 600s.`,
        threshold_details: { min_distinct_users: 3, window_seconds: 600, distinct_accounts: distinctUsers },
        defensive_steps: [
          `Review whether any probed username succeeded in logging in.`,
          `Check whether any probed account exists as a privileged or service account.`,
          `Verify if source IP corresponds to an internal authorized scanning suite or proxy.`
        ],
        known_limitations: BUILT_IN_RULES[1].limitations,
        mitre_attack: BUILT_IN_RULES[1].mitre_attack,
        status: 'new',
        notes: [],
        created_at: new Date().toISOString()
      });
    }
  }

  // 3. TF-DET-003 (Success Following Failures)
  const ipAllEvents: Record<string, NormalizedEvent[]> = {};
  for (const ev of sorted) {
    if (ev.source_ip) {
      if (!ipAllEvents[ev.source_ip]) ipAllEvents[ev.source_ip] = [];
      ipAllEvents[ev.source_ip].push(ev);
    }
  }

  for (const [ip, list] of Object.entries(ipAllEvents)) {
    for (let idx = 0; idx < list.length; idx++) {
      const curr = list[idx];
      if (curr.outcome === 'success' && curr.event_type === 'ssh_login_success') {
        const priors = list.slice(0, idx).filter(e => {
          const diff = (new Date(curr.timestamp).getTime() - new Date(e.timestamp).getTime()) / 1000;
          return diff >= 0 && diff <= 900 && (e.outcome === 'failure' || e.event_type === 'ssh_login_failed');
        });
        if (priors.length >= 3) {
          const evidence = [...priors, curr];
          findings.push({
            finding_id: `fnd-succ-${curr.event_id}`,
            rule_id: 'TF-DET-003',
            rule_name: 'Successful Login Following Repeated Failures',
            severity: 'critical',
            confidence: 'high',
            first_seen: priors[0].timestamp,
            last_seen: curr.timestamp,
            source_ip: ip,
            username: curr.username,
            hostname: curr.hostname,
            match_count: evidence.length,
            evidence_event_ids: evidence.map(e => e.event_id),
            explanation: `Source IP ${ip} successfully logged in as '${curr.username}' at ${curr.timestamp} after ${priors.length} prior failed attempts within 900s.`,
            trigger_reason: `Observed ${priors.length} failures directly preceding success (threshold: >= 3 failures).`,
            threshold_details: { min_prior_failures: 3, window_seconds: 900, prior_failures_observed: priors.length },
            defensive_steps: [
              `CRITICAL: Contact account owner ('${curr.username}') out-of-band immediately to verify authentication validity.`,
              `Check active shell sessions and command execution logs for user '${curr.username}'.`,
              `Inspect ~/.ssh/authorized_keys for unauthorized additions.`,
              `Terminate current SSH session from IP ${ip} pending investigation.`
            ],
            known_limitations: BUILT_IN_RULES[2].limitations,
            mitre_attack: BUILT_IN_RULES[2].mitre_attack,
            status: 'new',
            notes: [],
            created_at: new Date().toISOString()
          });
        }
      }
    }
  }

  // 4. TF-DET-004 (Privileged command execution via sudo)
  for (const ev of sorted) {
    if (ev.event_type === 'sudo_elevation') {
      const cmd = ev.attributes?.command || '';
      if (/(\/bin\/(?:bash|sh|zsh)|chmod 777|chmod \+s|visudo|\/etc\/shadow)/i.test(cmd)) {
        findings.push({
          finding_id: `fnd-sudo-${ev.event_id}`,
          rule_id: 'TF-DET-004',
          rule_name: 'Suspicious Privileged Command Execution',
          severity: 'high',
          confidence: 'medium',
          first_seen: ev.timestamp,
          last_seen: ev.timestamp,
          source_ip: ev.source_ip,
          username: ev.username,
          hostname: ev.hostname,
          match_count: 1,
          evidence_event_ids: [ev.event_id],
          explanation: `User '${ev.username}' spawned a root shell or executed sensitive administrative command '${cmd}' via sudo.`,
          trigger_reason: `Command matched high-risk execution pattern.`,
          threshold_details: { command: cmd, target_user: ev.attributes?.target_user || 'root' },
          defensive_steps: [
            `Determine whether user '${ev.username}' has authorized sudo privileges for this command.`,
            `Verify whether a planned maintenance ticket covers this root escalation.`,
            `Audit shell history (.bash_history) for actions taken inside the elevated shell.`
          ],
          known_limitations: BUILT_IN_RULES[3].limitations,
          mitre_attack: BUILT_IN_RULES[3].mitre_attack,
          status: 'new',
          notes: [],
          created_at: new Date().toISOString()
        });
      }
    }
  }

  // 5. TF-DET-005 (Non-Existent User Probing)
  const invalidUsersByIp: Record<string, NormalizedEvent[]> = {};
  for (const ev of sorted) {
    if (ev.source_ip && (ev.event_type === 'invalid_user' || ev.attributes?.is_invalid_user)) {
      if (!invalidUsersByIp[ev.source_ip]) invalidUsersByIp[ev.source_ip] = [];
      invalidUsersByIp[ev.source_ip].push(ev);
    }
  }

  for (const [ip, list] of Object.entries(invalidUsersByIp)) {
    if (list.length >= 3) {
      const probed = Array.from(new Set(list.map(e => e.username).filter(Boolean)));
      findings.push({
        finding_id: `fnd-inv-${ip.replace(/\./g, '-')}`,
        rule_id: 'TF-DET-005',
        rule_name: 'Non-Existent User Probing',
        severity: 'low',
        confidence: 'high',
        first_seen: list[0].timestamp,
        last_seen: list[list.length - 1].timestamp,
        source_ip: ip,
        username: `${probed.length} invalid usernames`,
        hostname: list[0].hostname,
        match_count: list.length,
        evidence_event_ids: list.map(e => e.event_id),
        explanation: `Source IP ${ip} probed ${list.length} non-existent account(s) (${probed.slice(0, 5).join(', ')}) in rapid succession.`,
        trigger_reason: `Invalid user attempt count (${list.length}) reached detection threshold of 3.`,
        threshold_details: { min_invalid_attempts: 3, observed_probes: list.length },
        defensive_steps: [
          `Verify that none of the probed account names match legitimate systems or legacy accounts.`,
          `Monitor whether the attacker attempts known valid administrator credentials next.`
        ],
        known_limitations: BUILT_IN_RULES[4].limitations,
        mitre_attack: BUILT_IN_RULES[4].mitre_attack,
        status: 'new',
        notes: [],
        created_at: new Date().toISOString()
      });
    }
  }

  return findings;
}

export function computeStats(events: NormalizedEvent[], findings: Finding[]): OverviewStats {
  const sevCounts: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0, informational: 0 };
  const statCounts: Record<string, number> = { new: 0, triaged: 0, investigating: 0, resolved: 0, false_positive: 0 };

  for (const f of findings) {
    sevCounts[f.severity] = (sevCounts[f.severity] || 0) + 1;
    statCounts[f.status] = (statCounts[f.status] || 0) + 1;
  }

  const ipCounts: Record<string, number> = {};
  const userCounts: Record<string, number> = {};
  const timelineBuckets: Record<string, number> = {};

  for (const ev of events) {
    if (ev.source_ip) ipCounts[ev.source_ip] = (ipCounts[ev.source_ip] || 0) + 1;
    if (ev.username) userCounts[ev.username] = (userCounts[ev.username] || 0) + 1;

    try {
      const d = new Date(ev.timestamp);
      const key = `${d.getUTCHours().toString().padStart(2, '0')}:${d.getUTCMinutes().toString().padStart(2, '0')}`;
      timelineBuckets[key] = (timelineBuckets[key] || 0) + 1;
    } catch {
      // pass
    }
  }

  const top_ips = Object.entries(ipCounts)
    .map(([ip, count]) => ({ ip, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const top_users = Object.entries(userCounts)
    .map(([username, count]) => ({ username, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const timeline = Object.entries(timelineBuckets)
    .map(([time, count]) => ({ time, count }))
    .sort((a, b) => a.time.localeCompare(b.time));

  return {
    total_events: events.length,
    total_findings: findings.length,
    severity_counts: sevCounts,
    status_counts: statCounts,
    top_ips,
    top_users,
    timeline,
    time_range: events.length > 0 ? { start: events[0].timestamp, end: events[events.length - 1].timestamp } : null
  };
}
