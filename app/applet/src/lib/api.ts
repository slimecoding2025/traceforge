import {
  NormalizedEvent,
  Finding,
  ParseSummary,
  OverviewStats,
  RuleDefinition,
  AnalystNote
} from '../types';
import {
  parseLogsClient,
  runClientDetections,
  computeStats,
  BUILT_IN_RULES
} from './clientEngine';
import { SYNTHETIC_AUTH_LOG } from './syntheticData';

class TraceForgeApiClient {
  private localEvents: NormalizedEvent[] = [];
  private localFindings: Finding[] = [];
  private localSummary: ParseSummary | null = null;

  constructor() {
    const { events, summary } = parseLogsClient(SYNTHETIC_AUTH_LOG, 'auth_synthetic.log');
    this.localEvents = events;
    this.localSummary = summary;
    this.localFindings = runClientDetections(events);
  }

  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetch('/api/health');
      return res.ok;
    } catch {
      return false;
    }
  }

  async ingestLogs(content: string, filename = 'upload.log', clearPrevious = false): Promise<{ eventsCount: number; findingsCount: number; summary: ParseSummary }> {
    try {
      const res = await fetch('/api/logs/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, filename, clear_previous: clearPrevious })
      });
      if (res.ok) {
        const data = await res.json();
        const { events, summary } = parseLogsClient(content, filename);
        if (clearPrevious) {
          this.localEvents = events;
        } else {
          this.localEvents = [...this.localEvents, ...events];
        }
        this.localFindings = runClientDetections(this.localEvents);
        this.localSummary = summary;
        return {
          eventsCount: data.events_count,
          findingsCount: data.findings_count,
          summary: data.summary
        };
      }
    } catch {
      // Offline fallback
    }

    const { events, summary } = parseLogsClient(content, filename);
    if (clearPrevious) {
      this.localEvents = events;
    } else {
      this.localEvents = [...this.localEvents, ...events];
    }
    this.localFindings = runClientDetections(this.localEvents);
    this.localSummary = summary;
    return {
      eventsCount: this.localEvents.length,
      findingsCount: this.localFindings.length,
      summary
    };
  }

  async getOverview(): Promise<OverviewStats> {
    try {
      const res = await fetch('/api/overview');
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Offline fallback
    }
    return computeStats(this.localEvents, this.localFindings);
  }

  async getEvents(search?: string, eventType?: string, outcome?: string, limit = 500, offset = 0): Promise<{ total: number; events: NormalizedEvent[] }> {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (eventType) params.set('event_type', eventType);
      if (outcome) params.set('outcome', outcome);
      params.set('limit', String(limit));
      params.set('offset', String(offset));

      const res = await fetch(`/api/events?${params.toString()}`);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Offline fallback
    }

    let filtered = [...this.localEvents];
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(e =>
        e.message.toLowerCase().includes(s) ||
        (e.username && e.username.toLowerCase().includes(s)) ||
        (e.source_ip && e.source_ip.toLowerCase().includes(s)) ||
        e.raw_event_reference.toLowerCase().includes(s)
      );
    }
    if (eventType) {
      filtered = filtered.filter(e => e.event_type === eventType);
    }
    if (outcome) {
      filtered = filtered.filter(e => e.outcome === outcome);
    }

    return {
      total: filtered.length,
      events: filtered.slice(offset, offset + limit)
    };
  }

  async getFindings(severity?: string, status?: string): Promise<Finding[]> {
    try {
      const params = new URLSearchParams();
      if (severity) params.set('severity', severity);
      if (status) params.set('status', status);
      const res = await fetch(`/api/findings?${params.toString()}`);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Offline fallback
    }

    let list = [...this.localFindings];
    if (severity) list = list.filter(f => f.severity === severity);
    if (status) list = list.filter(f => f.status === status);
    return list;
  }

  async getFindingEvidence(findingId: string): Promise<NormalizedEvent[]> {
    try {
      const res = await fetch(`/api/findings/${findingId}/evidence`);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Offline fallback
    }

    const finding = this.localFindings.find(f => f.finding_id === findingId);
    if (!finding) return [];
    const idSet = new Set(finding.evidence_event_ids);
    return this.localEvents.filter(e => idSet.has(e.event_id));
  }

  async updateFindingStatus(findingId: string, status: string, note?: string): Promise<Finding | null> {
    try {
      const res = await fetch(`/api/findings/${findingId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, note, author: 'Analyst' })
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Offline fallback
    }

    const target = this.localFindings.find(f => f.finding_id === findingId);
    if (target) {
      target.status = status as any;
      if (note && note.trim()) {
        target.notes.push({
          note_id: `nt-${Date.now()}`,
          author: 'Analyst',
          timestamp: new Date().toISOString(),
          content: `[Status changed to ${status}]: ${note.trim()}`
        });
      }
      return target;
    }
    return null;
  }

  async addNote(findingId: string, content: string): Promise<AnalystNote | null> {
    try {
      const res = await fetch(`/api/findings/${findingId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, author: 'Analyst' })
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Offline fallback
    }

    const target = this.localFindings.find(f => f.finding_id === findingId);
    if (target) {
      const newNote: AnalystNote = {
        note_id: `nt-${Date.now()}`,
        author: 'Analyst',
        timestamp: new Date().toISOString(),
        content
      };
      target.notes.push(newNote);
      return newNote;
    }
    return null;
  }

  async getRules(): Promise<RuleDefinition[]> {
    try {
      const res = await fetch('/api/rules');
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Offline fallback
    }
    return BUILT_IN_RULES;
  }

  async generateReport(format: 'json' | 'html', redactIps = false, redactUsers = false, sourceName = 'Investigation'): Promise<string | any> {
    try {
      const res = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format, redact_ips: redactIps, redact_users: redactUsers, source_name: sourceName })
      });
      if (res.ok) {
        if (format === 'html') {
          return await res.text();
        }
        return await res.json();
      }
    } catch {
      // Offline fallback
    }

    return this.generateClientReport(format, redactIps, redactUsers, sourceName);
  }

  private generateClientReport(format: 'json' | 'html', redactIps: boolean, redactUsers: boolean, sourceName: string) {
    const ipMap: Record<string, string> = {};
    const userMap: Record<string, string> = {};
    let ipCounter = 1;
    let userCounter = 1;

    const pseudoIp = (ip: string | null) => {
      if (!ip || !redactIps) return ip;
      if (!ipMap[ip]) ipMap[ip] = `ANON_IP_${ipCounter++}`;
      return ipMap[ip];
    };

    const pseudoUser = (u: string | null) => {
      if (!u || !redactUsers) return u;
      if (!userMap[u]) userMap[u] = `user_${userCounter++}`;
      return userMap[u];
    };

    const sanitizedFindings = this.localFindings.map(f => ({
      ...f,
      source_ip: pseudoIp(f.source_ip),
      username: pseudoUser(f.username),
      explanation: redactIps && f.source_ip ? f.explanation.replace(new RegExp(f.source_ip, 'g'), pseudoIp(f.source_ip)!) : f.explanation
    }));

    if (format === 'json') {
      return {
        metadata: {
          tool: 'TraceForge Investigation Workbench',
          version: '1.0.0',
          report_generated_at: new Date().toISOString(),
          dataset_source: sourceName,
          privacy_redaction_applied: { redact_ips: redactIps, redact_users: redactUsers }
        },
        findings: sanitizedFindings
      };
    }

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>TraceForge Report - ${sourceName}</title><style>body{background:#090d16;color:#f3f4f6;font-family:sans-serif;padding:32px;max-width:1000px;margin:auto}.card{background:#111827;border:1px solid #2e3b52;border-radius:8px;padding:20px;margin-bottom:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #2e3b52;padding:8px;text-align:left}</style></head><body><h1>TraceForge Security Investigation Report</h1><p>Source: ${sourceName} | Generated: ${new Date().toISOString()}</p><div class="card"><h2>Findings (${sanitizedFindings.length})</h2><ul>${sanitizedFindings.map(f => `<li><strong>[${f.severity.toUpperCase()}] ${f.rule_name}</strong>: ${f.explanation}</li>`).join('')}</ul></div></body></html>`;
  }

  async resetWorkbench(): Promise<void> {
    try {
      await fetch('/api/investigations/reset', { method: 'DELETE' });
    } catch {
      // pass
    }
    this.localEvents = [];
    this.localFindings = [];
    this.localSummary = null;
  }
}

export const api = new TraceForgeApiClient();
