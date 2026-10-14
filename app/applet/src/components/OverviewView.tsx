import React from 'react';
import {
  ShieldAlert,
  FileText,
  AlertTriangle,
  UserCheck,
  ChevronRight,
  TrendingUp,
  Clock
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Finding, OverviewStats } from '../types';

interface OverviewViewProps {
  stats: OverviewStats;
  recentFindings: Finding[];
  onSelectFinding: (findingId: string) => void;
  onNavigateTab: (tab: string) => void;
  onOpenImport: () => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  stats,
  recentFindings,
  onSelectFinding,
  onNavigateTab,
  onOpenImport,
}) => {
  const criticalCount = stats.severity_counts['critical'] || 0;
  const highCount = stats.severity_counts['high'] || 0;
  const mediumCount = stats.severity_counts['medium'] || 0;
  const lowCount = stats.severity_counts['low'] || 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-slate-900/60 border border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight">Security Investigation Overview</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Deterministic defensive analysis of Linux authentication events &middot; Privacy-first local processing
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
          <Clock className="w-3.5 h-3.5 text-sky-400" />
          <span>
            {stats.time_range
              ? `${new Date(stats.time_range.start).toLocaleString()} - ${new Date(stats.time_range.end).toLocaleString()}`
              : 'No log events loaded'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#111827] border border-slate-800 p-4 rounded-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total Events</span>
            <FileText className="w-4 h-4 text-slate-500" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-100">
            {stats.total_events.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Normalized syslog & JSONL records</div>
        </div>

        <div className="bg-[#111827] border border-slate-800 p-4 rounded-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Detections Generated</span>
            <ShieldAlert className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-100">
            {stats.total_findings}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Correlated security findings</div>
        </div>

        <div className="bg-[#111827] border border-slate-800 p-4 rounded-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Critical / High Severity</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-rose-400">
            {criticalCount + highCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {criticalCount} critical &middot; {highCount} high
          </div>
        </div>

        <div className="bg-[#111827] border border-slate-800 p-4 rounded-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Target Accounts</span>
            <UserCheck className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-100">
            {stats.top_users.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Targeted user identities identified</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#111827] border border-slate-800 p-5 rounded-lg flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-200">Authentication Event Activity</h2>
              <p className="text-xs text-slate-400">Event frequency distribution across observed time slices</p>
            </div>
            <TrendingUp className="w-4 h-4 text-slate-500" />
          </div>

          <div className="h-56 w-full">
            {stats.timeline.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="eventGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0284c7" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '4px', fontSize: '12px' }}
                    labelStyle={{ color: '#94a3b8' }}
                  />
                  <Area type="monotone" dataKey="count" stroke="#38bdf8" strokeWidth={2} fillOpacity={1} fill="url(#eventGradient)" name="Events" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                No event data available to render chart
              </div>
            )}
          </div>
        </div>

        <div className="bg-[#111827] border border-slate-800 p-5 rounded-lg flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-200 mb-1">Severity Distribution</h2>
            <p className="text-xs text-slate-400 mb-4">Finding impact classification</p>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-rose-400 font-medium">Critical</span>
                  <span className="font-mono text-slate-300">{criticalCount}</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-rose-500 transition-all duration-300"
                    style={{ width: `${stats.total_findings ? (criticalCount / stats.total_findings) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-orange-400 font-medium">High</span>
                  <span className="font-mono text-slate-300">{highCount}</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-500 transition-all duration-300"
                    style={{ width: `${stats.total_findings ? (highCount / stats.total_findings) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-amber-400 font-medium">Medium</span>
                  <span className="font-mono text-slate-300">{mediumCount}</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 transition-all duration-300"
                    style={{ width: `${stats.total_findings ? (mediumCount / stats.total_findings) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-sky-400 font-medium">Low</span>
                  <span className="font-mono text-slate-300">{lowCount}</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-sky-500 transition-all duration-300"
                    style={{ width: `${stats.total_findings ? (lowCount / stats.total_findings) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 mt-4">
            <button
              onClick={() => onNavigateTab('findings')}
              className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 rounded transition-colors flex items-center justify-center gap-1.5"
            >
              <span>Explore All {stats.total_findings} Findings</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-[#111827] border border-slate-800 p-5 rounded-lg space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-200">Top Observed Source IPs</h2>
            <p className="text-xs text-slate-400">Sources with highest event frequency</p>
          </div>

          <div className="space-y-2">
            {stats.top_ips.length > 0 ? (
              stats.top_ips.map((item) => (
                <div key={item.ip} className="flex items-center justify-between text-xs p-2 rounded bg-slate-900/60 border border-slate-800/60">
                  <span className="font-mono text-slate-200">{item.ip}</span>
                  <span className="font-mono text-slate-400">{item.count} events</span>
                </div>
              ))
            ) : (
              <div className="text-xs text-slate-500 py-4 text-center">No IP addresses recorded</div>
            )}
          </div>

          <div className="pt-2">
            <h2 className="text-sm font-semibold text-slate-200 mb-2">Targeted User Accounts</h2>
            <div className="space-y-2">
              {stats.top_users.length > 0 ? (
                stats.top_users.map((item) => (
                  <div key={item.username} className="flex items-center justify-between text-xs p-2 rounded bg-slate-900/60 border border-slate-800/60">
                    <span className="font-mono text-slate-200">{item.username}</span>
                    <span className="font-mono text-slate-400">{item.count} events</span>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-500 py-4 text-center">No user accounts recorded</div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-[#111827] border border-slate-800 p-5 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-200">Prioritized Findings for Investigation</h2>
              <p className="text-xs text-slate-400">Detections requiring analytical triage and validation</p>
            </div>
            <button
              onClick={() => onNavigateTab('findings')}
              className="text-xs text-sky-400 hover:text-sky-300 font-medium"
            >
              View all
            </button>
          </div>

          <div className="space-y-2.5">
            {recentFindings.length > 0 ? (
              recentFindings.slice(0, 5).map((f) => {
                const sevColor =
                  f.severity === 'critical'
                    ? 'text-rose-400 border-rose-500/40 bg-rose-950/20'
                    : f.severity === 'high'
                    ? 'text-orange-400 border-orange-500/40 bg-orange-950/20'
                    : f.severity === 'medium'
                    ? 'text-amber-400 border-amber-500/40 bg-amber-950/20'
                    : 'text-sky-400 border-sky-500/40 bg-sky-950/20';

                return (
                  <div
                    key={f.finding_id}
                    onClick={() => onSelectFinding(f.finding_id)}
                    className="p-3 bg-slate-900/50 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded cursor-pointer transition-all flex items-start justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${sevColor}`}>
                          {f.severity}
                        </span>
                        <span className="text-xs font-mono text-slate-400">{f.rule_id}</span>
                        <span className="text-xs font-semibold text-slate-200">{f.rule_name}</span>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-1">{f.explanation}</p>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500">
                        <span>Target: <strong className="text-slate-400 font-mono">{f.source_ip || f.username || 'System'}</strong></span>
                        <span>&middot;</span>
                        <span>Evidence: <strong className="text-slate-400 font-mono">{f.match_count} events</strong></span>
                        {f.mitre_attack && (
                          <>
                            <span>&middot;</span>
                            <span className="text-sky-400/90 font-mono">{f.mitre_attack.technique_id}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectFinding(f.finding_id);
                      }}
                      className="px-2.5 py-1 text-xs text-sky-400 hover:text-sky-300 bg-sky-950/40 hover:bg-sky-900/40 border border-sky-800/40 rounded whitespace-nowrap transition-colors"
                    >
                      Investigate
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-xs text-slate-500">
                No findings generated yet. Import log files or click Load Demo Data to analyze.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
