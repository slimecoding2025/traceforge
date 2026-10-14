import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldAlert,
  AlertTriangle,
  ChevronRight,
  Search,
  Filter,
  CheckCircle2,
  Terminal,
  Clock,
  Layers,
  ArrowRight,
  Zap,
  Flame
} from 'lucide-react';
import { Finding, FindingStatus } from '../types';
import { sound } from '../lib/soundFx';

interface FindingsViewProps {
  findings: Finding[];
  onSelectFinding: (findingId: string) => void;
  onUpdateStatus: (findingId: string, status: FindingStatus) => void;
}

export const FindingsView: React.FC<FindingsViewProps> = ({
  findings,
  onSelectFinding,
  onUpdateStatus,
}) => {
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredFindings = useMemo(() => {
    return findings.filter((f) => {
      if (selectedSeverity !== 'all' && f.severity !== selectedSeverity) return false;
      if (selectedStatus !== 'all' && f.status !== selectedStatus) return false;
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        const matchTitle = f.rule_name.toLowerCase().includes(s);
        const matchId = f.rule_id.toLowerCase().includes(s);
        const matchIp = f.source_ip?.toLowerCase().includes(s);
        const matchUser = f.username?.toLowerCase().includes(s);
        const matchDesc = f.explanation.toLowerCase().includes(s);
        if (!matchTitle && !matchId && !matchIp && !matchUser && !matchDesc) return false;
      }
      return true;
    });
  }, [findings, selectedSeverity, selectedStatus, searchTerm]);

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-16 font-mono">
      {/* Tactical Filters & Search HUD */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-[#040804]/95 border border-emerald-950/80 backdrop-blur-md"
      >
        <div className="flex-1 max-w-md relative">
          <Search className="w-4 h-4 text-emerald-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search findings by rule, IP, account, or CVE..."
            className="w-full pl-10 pr-3.5 py-2.5 bg-black border border-emerald-950 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:border-emerald-400 transition-colors"
          />
        </div>

        <div className="flex items-center gap-3 flex-wrap text-xs text-zinc-400">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Severity:</span>
            <select
              value={selectedSeverity}
              onChange={(e) => {
                sound.playClick();
                setSelectedSeverity(e.target.value);
              }}
              className="bg-black border border-emerald-950 rounded-lg px-3 py-1.5 text-xs text-zinc-200 focus:outline-hidden focus:border-emerald-400 cursor-pointer font-bold"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => {
                sound.playClick();
                setSelectedStatus(e.target.value);
              }}
              className="bg-black border border-emerald-950 rounded-lg px-3 py-1.5 text-xs text-zinc-200 focus:outline-hidden focus:border-emerald-400 cursor-pointer font-bold"
            >
              <option value="all">All Statuses</option>
              <option value="new">New</option>
              <option value="triaged">Triaged</option>
              <option value="investigating">Investigating</option>
              <option value="resolved">Resolved</option>
              <option value="false_positive">False Positive</option>
            </select>
          </div>

          <span className="text-[11px] font-black text-emerald-400 px-3 py-1.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40">
            {filteredFindings.length} / {findings.length} DOSSIERS
          </span>
        </div>
      </motion.div>

      {/* Findings List with Staggered Motion */}
      <div className="space-y-3">
        {filteredFindings.length > 0 ? (
          filteredFindings.map((f, idx) => {
            const isCrit = f.severity === 'critical';
            const isHigh = f.severity === 'high';
            const isMed = f.severity === 'medium';

            const statusColors: Record<FindingStatus, string> = {
              new: 'text-rose-300 bg-rose-950/60 border-rose-600 font-black',
              triaged: 'text-amber-300 bg-amber-950/60 border-amber-600',
              investigating: 'text-purple-300 bg-purple-950/60 border-purple-600',
              resolved: 'text-emerald-300 bg-emerald-950/60 border-emerald-500 font-black',
              false_positive: 'text-zinc-400 bg-zinc-950 border-zinc-800',
            };

            return (
              <motion.div
                key={f.finding_id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.04, 0.4) }}
                className={`p-5 rounded-xl bg-[#040804]/95 border transition-all space-y-3 backdrop-blur-md group ${
                  isCrit
                    ? 'border-rose-950 hover:border-rose-500/80 hover:shadow-[0_0_25px_rgba(255,23,68,0.25)]'
                    : isHigh
                    ? 'border-amber-950 hover:border-amber-500/80 hover:shadow-[0_0_25px_rgba(255,183,3,0.2)]'
                    : 'border-emerald-950 hover:border-emerald-500/80 hover:shadow-[0_0_25px_rgba(0,255,102,0.2)]'
                }`}
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-950 pb-3">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded border ${
                        isCrit
                          ? 'bg-[#ff1744] text-white shadow-[0_0_10px_#ff1744] border-rose-500'
                          : isHigh
                          ? 'bg-amber-950 text-amber-300 border-amber-500'
                          : isMed
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-500'
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                      }`}
                    >
                      {f.severity}
                    </span>
                    <span className="text-xs text-zinc-500 font-bold">{f.rule_id}</span>
                    <h3 className="text-sm font-black text-white group-hover:text-emerald-300 transition-colors">
                      {f.rule_name}
                    </h3>
                  </div>

                  {/* Varied Button Sizes: State Dropdown & Large Investigate Button */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-zinc-500 text-[10px] uppercase font-bold">State:</span>
                      <select
                        value={f.status}
                        onChange={(e) => {
                          sound.playClick();
                          onUpdateStatus(f.finding_id, e.target.value as FindingStatus);
                        }}
                        className={`text-xs px-3 py-1.5 rounded-lg border font-bold bg-black focus:outline-hidden cursor-pointer ${statusColors[f.status]}`}
                      >
                        <option value="new">New</option>
                        <option value="triaged">Triaged</option>
                        <option value="investigating">Investigating</option>
                        <option value="resolved">Resolved</option>
                        <option value="false_positive">False Positive</option>
                      </select>
                    </div>

                    <button
                      onClick={() => {
                        sound.playAlert();
                        onSelectFinding(f.finding_id);
                      }}
                      className="flex items-center gap-2 px-5 py-2.5 bg-[#00ff66] text-black hover:bg-[#33ff85] font-black text-xs uppercase tracking-wider rounded-lg transition-all shadow-[0_0_18px_rgba(0,255,102,0.35)] cursor-pointer border border-[#00ff66]"
                    >
                      <span>Investigate</span>
                      <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  </div>
                </div>

                {/* Explanation */}
                <p className="text-xs text-zinc-300 leading-relaxed font-sans">{f.explanation}</p>

                {/* Tactical Context Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-black p-3.5 rounded-lg border border-emerald-950 text-[11px]">
                  <div>
                    <span className="text-zinc-500 block uppercase text-[10px] font-bold">Source IP Vector</span>
                    <span className="font-black text-rose-400">{f.source_ip || 'Local Host'}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block uppercase text-[10px] font-bold">Target Account</span>
                    <span className={`font-black ${f.username === 'root' ? 'text-rose-400' : 'text-emerald-300'}`}>
                      {f.username || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block uppercase text-[10px] font-bold">Evidence Records</span>
                    <span className="font-bold text-white">{f.match_count} events</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block uppercase text-[10px] font-bold">Confidence</span>
                    <span className="font-black text-emerald-400 uppercase">{f.confidence}</span>
                  </div>
                </div>

                {/* MITRE ATT&CK & Dossier Footnote */}
                <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1">
                  <div className="flex items-center gap-3">
                    {f.mitre_attack && (
                      <span className="text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded border border-emerald-500/40 font-bold">
                        MITRE {f.mitre_attack.technique_id}: {f.mitre_attack.technique_name}
                      </span>
                    )}
                    {f.notes.length > 0 && (
                      <span className="text-amber-400 font-bold">
                        &bull; {f.notes.length} pinned note(s)
                      </span>
                    )}
                  </div>
                  <span className="text-zinc-600 font-mono">DOSSIER ID: {f.finding_id}</span>
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="p-16 text-center text-xs text-zinc-500 bg-[#040804] border border-emerald-950 rounded-xl">
            <Terminal className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
            No security findings matching current search and filter parameters.
          </div>
        )}
      </div>
    </div>
  );
};
