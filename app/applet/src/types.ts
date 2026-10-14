export type Outcome = 'success' | 'failure' | 'unknown';

export type EventType =
  | 'ssh_login_failed'
  | 'ssh_login_success'
  | 'invalid_user'
  | 'sudo_elevation'
  | 'session_opened'
  | 'session_closed'
  | 'unknown';

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'informational';
export type Confidence = 'high' | 'medium' | 'low';
export type FindingStatus = 'new' | 'triaged' | 'investigating' | 'resolved' | 'false_positive';

export interface MitreAttackRef {
  technique_id: string;
  technique_name: string;
  tactic: string;
  url: string;
  relationship: string;
}

export interface AnalystNote {
  note_id: string;
  author: string;
  timestamp: string;
  content: string;
}

export interface NormalizedEvent {
  event_id: string;
  timestamp: string;
  source_type: string;
  event_type: EventType;
  source_ip: string | null;
  username: string | null;
  hostname: string | null;
  outcome: Outcome;
  message: string;
  raw_event_reference: string;
  attributes: Record<string, any>;
}

export interface Finding {
  finding_id: string;
  rule_id: string;
  rule_name: string;
  severity: Severity;
  confidence: Confidence;
  first_seen: string;
  last_seen: string;
  source_ip: string | null;
  username: string | null;
  hostname: string | null;
  match_count: number;
  evidence_event_ids: string[];
  explanation: string;
  trigger_reason: string;
  threshold_details: Record<string, any>;
  defensive_steps: string[];
  known_limitations: string[];
  mitre_attack?: MitreAttackRef | null;
  status: FindingStatus;
  notes: AnalystNote[];
  created_at: string;
}

export interface ParseSummary {
  total_lines: number;
  parsed_events: number;
  malformed_lines: number;
  skipped_lines: number;
  source_type: string;
  errors: string[];
}

export interface RuleDefinition {
  rule_id: string;
  name: string;
  description: string;
  severity: Severity;
  default_thresholds: Record<string, any>;
  required_fields: string[];
  mitre_attack?: {
    technique_id: string;
    technique_name: string;
    tactic: string;
    url: string;
    relationship: string;
  } | null;
  limitations: string[];
  test_scenario: string;
}

export interface OverviewStats {
  total_events: number;
  total_findings: number;
  severity_counts: Record<string, number>;
  status_counts: Record<string, number>;
  top_ips: { ip: string; count: number }[];
  top_users: { username: string; count: number }[];
  timeline: { time: string; count: number }[];
  time_range: { start: string; end: string } | null;
}
