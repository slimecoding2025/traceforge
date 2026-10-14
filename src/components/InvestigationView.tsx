import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert,
  Clock,
  User,
  Globe,
  Server,
  FileText,
  AlertTriangle,
  ExternalLink,
  MessageSquare,
  Plus,
  CheckCircle,
  HelpCircle,
  Terminal,
  Zap,
  ArrowRight,
  Sparkles,
  Copy,
  CheckCircle2,
  RefreshCw,
  PlusCircle,
  ShieldCheck
} from 'lucide-react';
import { Finding, FindingStatus, NormalizedEvent, AnalystNote } from '../types';
import { openRouter, OpenRouterTriageResult } from '../lib/openrouter';
import { sound } from '../lib/soundFx';

interface InvestigationViewProps {
  findings: Finding[];
  selectedFindingId: string | null;
  onSelectFinding: (findingId: string) => void;
  onUpdateStatus: (findingId: string, status: FindingStatus, note?: string) => void;
  onAddNote: (findingId: string, content: string) => Promise<AnalystNote | null>;
  loadEvidence: (findingId: string) => Promise<NormalizedEvent[]>;
}

export const InvestigationView: React.FC<InvestigationViewProps> = ({
  findings,
  selectedFindingId,
  onSelectFinding,
  onUpdateStatus,
  onAddNote,
  loadEvidence,
}) => {
  const activeFinding = findings.find((f) => f.finding_id === selectedFindingId) || findings[0];
  const [evidenceEvents, setEvidenceEvents] = useState<NormalizedEvent[]>([]);
  const [isLoadingEvidence, setIsLoadingEvidence] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  // OpenRouter inline triage
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<OpenRouterTriageResult | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [copiedCmdIdx, setCopiedCmdIdx] = useState<number | null>(null);
  const [aiNoteAdded, setAiNoteAdded] = useState(false);

  useEffect(() => {
    if (activeFinding) {
      setIsLoadingEvidence(true);
      setAiResult(null);
      setAiError(null);
      setAiNoteAdded(false);
      loadEvidence(activeFinding.finding_id)
        .then((evs) => setEvidenceEvents(evs))
        .finally(() => setIsLoadingEvidence(false));
    }
  }, [activeFinding?.finding_id]);

  if (!activeFinding) {
    return (
      <div className="max-w-7xl mx-auto p-16 text-center text-xs text-zinc-500 bg-[#040804] border border-emerald-950 rounded-xl font-mono">
        <Terminal className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
        No findings currently loaded into investigation workbench. Ingest logs or trigger demo attack.
      </div>
    );
  }

  const handleCreateNote = async () => {
    if (!newNoteText.trim()) return;
    setIsSubmittingNote(true);
    try {
      sound.playClick();
      await onAddNote(activeFinding.finding_id, newNoteText);
      setNewNoteText('');
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const handleStatusChange = (newStatus: FindingStatus) => {
    sound.playClick();
    onUpdateStatus(activeFinding.finding_id, newStatus);
  };

  const handleRunOpenRouter = async () => {
    setIsAiLoading(true);
    setAiError(null);
    sound.playClick();
    try {
      const res = await openRouter.analyzeFinding(activeFinding, evidenceEvents);
      setAiResult(res);
      sound.playSuccess();
    } catch (err: any) {
      setAiError(err?.message || 'AI Intel triage request failed. Check API key in Settings.');
      sound.playAlert();
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleCopyCmd = (cmd: string, idx: number) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmdIdx(idx);
    sound.playSuccess();
    setTimeout(() => setCopiedCmdIdx(null), 2500);
  };

  const handlePinAiToNotes = async () => {
    if (!aiResult) return;
    const noteText = `[AI Intel Triage]
Stage: ${aiResult.attack_stage} | Threat: ${aiResult.threat_level}
Summary: ${aiResult.executive_summary}
Remediation:
${aiResult.containment_commands.map((c) => `$ ${c}`).join('\n')}`;

    sound.playClick();
    await onAddNote(activeFinding.finding_id, noteText);
    setAiNoteAdded(true);
  };

  const isCrit = activeFinding.severity === 'critical';
  const isHigh = activeFinding.severity === 'high';
  const isMed = activeFinding.severity === 'medium';

  const sevColor = isCrit
    ? 'bg-[#ff1744] text-white shadow-[0_0_10px_#ff1744] border-rose-500'
    : isHigh
    ? 'bg-amber-950 text-amber-300 border-amber-500'
    : isMed
    ? 'bg-emerald-950 text-emerald-300 border-emerald-500'
    : 'bg-zinc-900 text-zinc-400 border-zinc-800';

  return (
    <div className="max-w-7xl mx-auto pb-16 space-y-6 font-mono">
      {/* Finding Selector & Triage HUD */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-xl bg-[#040804]/95 border border-emerald-950/80 backdrop-blur-md"
      >
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <span className="text-xs text-zinc-400 uppercase tracking-wider font-bold">Dossier:</span>
          <select
            value={activeFinding.finding_id}
            onChange={(e) => {
              sound.playClick();
              onSelectFinding(e.target.value);
            }}
            className="flex-1 bg-black border border-emerald-950 rounded-lg px-3.5 py-2 text-xs text-white font-bold focus:outline-hidden focus:border-emerald-400 cursor-pointer"
          >
            {findings.map((f) => (
              <option key={f.finding_id} value={f.finding_id}>
                [{f.severity.toUpperCase()}] {f.rule_name} — {f.source_ip || f.username || f.finding_id}
              </option>
            ))}
          </select>
        </div>

        {/* Workflow State Switches */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-zinc-400 uppercase tracking-wider font-bold">Workflow State:</span>
          <div className="flex items-center gap-1 bg-black p-1 rounded-lg border border-emerald-950">
            {(['new', 'triaged', 'investigating', 'resolved', 'false_positive'] as FindingStatus[]).map((st) => (
              <button
                key={st}
                onClick={() => handleStatusChange(st)}
                className={`px-3 py-1.5 text-xs rounded-md font-bold uppercase tracking-wider transition-all ${
                  activeFinding.status === st
                    ? st === 'resolved'
                      ? 'bg-[#00ff66] text-black shadow-[0_0_12px_rgba(0,255,102,0.4)] font-black'
                      : st === 'new'
                      ? 'bg-[#ff1744] text-white shadow-[0_0_10px_#ff1744] font-black'
                      : 'bg-emerald-900/80 text-emerald-300 border border-emerald-500/50'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                }`}
              >
                {st.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Main Finding Overview Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#040804]/95 border border-emerald-950 rounded-xl p-6 space-y-6 backdrop-blur-md"
      >
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-emerald-950 pb-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded border ${sevColor}`}>
                {activeFinding.severity}
              </span>
              <span className="text-xs text-emerald-400 font-bold">{activeFinding.rule_id}</span>
              <h2 className="text-xl font-black text-white">{activeFinding.rule_name}</h2>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed max-w-3xl font-sans">
              {activeFinding.explanation}
            </p>
          </div>

          <div className="flex flex-col items-start md:items-end gap-1 text-xs text-zinc-400 shrink-0 font-mono bg-black p-3.5 rounded-lg border border-emerald-950">
            <div>DOSSIER: <span className="text-emerald-400 font-bold">{activeFinding.finding_id}</span></div>
            <div>CONFIDENCE: <span className="text-emerald-300 font-bold uppercase">{activeFinding.confidence}</span></div>
            <div>EVIDENCE: <span className="text-amber-400 font-bold">{activeFinding.match_count} logs</span></div>
          </div>
        </div>

        {/* Entity Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-black p-4 rounded-xl border border-emerald-950 text-xs">
          <div>
            <span className="text-zinc-500 block uppercase text-[10px] font-bold">Source IP Vector</span>
            <span className="text-rose-400 font-black text-sm">{activeFinding.source_ip || 'Unspecified'}</span>
          </div>
          <div>
            <span className="text-zinc-500 block uppercase text-[10px] font-bold">Target User Account</span>
            <span className={`font-black text-sm ${activeFinding.username === 'root' ? 'text-rose-400' : 'text-emerald-300'}`}>
              {activeFinding.username || 'Unspecified'}
            </span>
          </div>
          <div>
            <span className="text-zinc-500 block uppercase text-[10px] font-bold">First Observed</span>
            <span className="text-zinc-300">
              {new Date(activeFinding.first_seen).toISOString().replace('T', ' ').slice(0, 19)}
            </span>
          </div>
          <div>
            <span className="text-zinc-500 block uppercase text-[10px] font-bold">Last Observed</span>
            <span className="text-zinc-300">
              {new Date(activeFinding.last_seen).toISOString().replace('T', ' ').slice(0, 19)}
            </span>
          </div>
        </div>

        {/* Trigger Analysis & MITRE Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-black border border-emerald-950 rounded-xl space-y-2">
            <h3 className="text-xs font-bold text-zinc-200 flex items-center gap-1.5 uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Trigger Rationale &amp; Threshold Analysis</span>
            </h3>
            <p className="text-xs text-zinc-300 leading-relaxed font-sans">
              {activeFinding.trigger_reason}
            </p>
            {Object.keys(activeFinding.threshold_details).length > 0 && (
              <pre className="pt-2 text-[11px] font-mono text-emerald-400 bg-black p-2.5 rounded border border-emerald-950 overflow-x-auto">
                {JSON.stringify(activeFinding.threshold_details, null, 2)}
              </pre>
            )}
          </div>

          {activeFinding.mitre_attack ? (
            <div className="p-4 bg-black border border-emerald-950 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-zinc-200 flex items-center gap-1.5 uppercase tracking-wider">
                  <ShieldAlert className="w-4 h-4 text-emerald-400" />
                  <span>MITRE ATT&amp;CK Mapping</span>
                </h3>
                <a
                  href={activeFinding.mitre_attack.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 font-bold bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/40"
                >
                  <span>{activeFinding.mitre_attack.technique_id}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="text-xs text-zinc-200 font-bold">
                {activeFinding.mitre_attack.technique_name} &middot; <span className="text-zinc-400 font-normal">{activeFinding.mitre_attack.tactic}</span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                {activeFinding.mitre_attack.relationship}
              </p>
            </div>
          ) : (
            <div className="p-4 bg-black border border-emerald-950 rounded-xl flex items-center justify-center text-xs text-zinc-500">
              No direct MITRE ATT&amp;CK technique mapped for this behavioral check.
            </div>
          )}
        </div>

        {/* AI Intel Quick Triage Module */}
        <div className="p-5 bg-black border-2 border-amber-950/70 rounded-xl space-y-4 shadow-[0_0_20px_rgba(255,179,0,0.08)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-950/60 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                AI Intel Automated Triage &amp; Containment
              </h3>
            </div>
            <button
              disabled={isAiLoading}
              onClick={handleRunOpenRouter}
              className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-[0_0_15px_rgba(255,179,0,0.3)] shrink-0 disabled:opacity-50"
            >
              {isAiLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Synthesizing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Run AI Intel Triage</span>
                </>
              )}
            </button>
          </div>

          {aiError && (
            <div className="p-3 bg-rose-950/40 border border-rose-600 rounded text-rose-300 text-xs font-sans">
              {aiError}
            </div>
          )}

          {aiResult && (
            <div className="space-y-4 pt-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-zinc-400">Attack Stage:</span>
                  <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 font-bold border border-amber-500/40">
                    {aiResult.attack_stage}
                  </span>
                </div>
                <button
                  disabled={aiNoteAdded}
                  onClick={handlePinAiToNotes}
                  className={`px-3 py-1 rounded text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
                    aiNoteAdded
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50'
                      : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 cursor-pointer'
                  }`}
                >
                  {aiNoteAdded ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span>Added to Dossier</span>
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-3 h-3 text-amber-400" />
                      <span>Pin AI Analysis to Notes</span>
                    </>
                  )}
                </button>
              </div>

              <div className="p-3 bg-zinc-950 rounded border border-zinc-900 text-xs text-zinc-300 font-sans leading-relaxed">
                {aiResult.executive_summary}
              </div>

              {aiResult.containment_commands?.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] text-emerald-400 font-bold uppercase tracking-wider block">
                    Immediate Linux Containment Commands:
                  </span>
                  {aiResult.containment_commands.map((cmd, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-2 p-2 bg-[#030604] rounded border border-emerald-950 text-xs font-mono text-emerald-300"
                    >
                      <span className="truncate">$ {cmd}</span>
                      <button
                        onClick={() => handleCopyCmd(cmd, idx)}
                        className="p-1 text-zinc-400 hover:text-emerald-400 shrink-0"
                        title="Copy command"
                      >
                        {copiedCmdIdx === idx ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Recommended Defensive Next Steps */}
        <div className="p-4 bg-black border border-emerald-950 rounded-xl space-y-2">
          <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
            Standard Operating Remediation Checklist
          </h3>
          <ul className="space-y-1.5 text-xs text-zinc-300 font-sans">
            {activeFinding.defensive_steps.map((step, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-emerald-400 font-mono font-bold mt-0.5">&gt;</span>
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </div>
      </motion.div>

      {/* Correlated Evidence Events Timeline */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#040804]/95 border border-emerald-950 rounded-xl p-6 space-y-4 backdrop-blur-md"
      >
        <div className="flex items-center justify-between border-b border-emerald-950 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Correlated Evidence Trail ({evidenceEvents.length} events)
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5 font-sans">
              Chronological log records establishing this finding
            </p>
          </div>
        </div>

        {isLoadingEvidence ? (
          <div className="py-8 text-center text-xs text-zinc-500">Loading evidence timeline...</div>
        ) : evidenceEvents.length > 0 ? (
          <div className="space-y-2.5">
            {evidenceEvents.map((ev, index) => {
              const isFail = ev.outcome === 'failure';
              return (
                <div
                  key={ev.event_id}
                  className="p-3.5 bg-black border border-emerald-950 rounded-lg hover:border-emerald-500/50 transition-colors space-y-2"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-500 font-bold">
                        #{index + 1} &middot; {new Date(ev.timestamp).toISOString().replace('T', ' ').slice(0, 19)}
                      </span>
                      <span className="text-emerald-400 font-bold">{ev.event_type}</span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px]">
                      <span>Source: <strong className="text-rose-400">{ev.source_ip || '-'}</strong></span>
                      <span>User: <strong className="text-white">{ev.username || '-'}</strong></span>
                      <span
                        className={`font-black px-2 py-0.5 rounded text-[10px] ${
                          isFail
                            ? 'bg-[#ff1744] text-white shadow-[0_0_8px_#ff1744]'
                            : 'bg-emerald-950 text-emerald-300 border border-emerald-500'
                        }`}
                      >
                        {ev.outcome.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <pre className="text-[11px] text-zinc-300 bg-black p-2.5 rounded border border-zinc-900 break-all whitespace-pre-wrap font-mono">
                    {ev.raw_event_reference}
                  </pre>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-zinc-500">
            No correlated evidence events loaded.
          </div>
        )}
      </motion.div>

      {/* Analyst Notes History & Log */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#040804]/95 border border-emerald-950 rounded-xl p-6 space-y-4 backdrop-blur-md"
      >
        <div className="flex items-center gap-2 border-b border-emerald-950 pb-3">
          <MessageSquare className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Analyst Investigation Notes &amp; Triage Log
          </h3>
        </div>

        {/* Notes List */}
        <div className="space-y-2.5">
          {activeFinding.notes.length > 0 ? (
            activeFinding.notes.map((note) => (
              <div key={note.note_id} className="p-3.5 bg-black border border-emerald-950 rounded-lg space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-black text-emerald-400">{note.author}</span>
                  <span className="text-zinc-500 text-[11px]">
                    {new Date(note.timestamp).toISOString().replace('T', ' ').slice(0, 19)}
                  </span>
                </div>
                <p className="text-xs text-zinc-200 whitespace-pre-wrap font-sans">{note.content}</p>
              </div>
            ))
          ) : (
            <div className="text-xs text-zinc-500 py-3">No analyst notes recorded for this finding yet.</div>
          )}
        </div>

        {/* Add Note Input & Save Button */}
        <div className="pt-2 space-y-2">
          <textarea
            value={newNoteText}
            onChange={(e) => setNewNoteText(e.target.value)}
            placeholder="Add forensic observation, hypothesis, or triage justification..."
            rows={2}
            className="w-full bg-black border border-emerald-950 rounded-lg p-3 text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:border-emerald-400 font-mono"
          />
          <button
            disabled={isSubmittingNote || !newNoteText.trim()}
            onClick={handleCreateNote}
            className="px-5 py-2.5 bg-[#00ff66] text-black hover:bg-[#33ff85] disabled:opacity-40 font-black text-xs uppercase tracking-wider rounded-lg transition-all cursor-pointer shadow-[0_0_18px_rgba(0,255,102,0.35)] border border-[#00ff66]"
          >
            {isSubmittingNote ? 'Saving...' : 'Pin Note to Investigation Dossier'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
