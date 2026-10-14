import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  ShieldAlert,
  Terminal,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Send,
  Zap,
  ArrowRight,
  ExternalLink,
  Lock,
  Cpu,
  KeyRound,
  FileCheck,
  RefreshCw,
  PlusCircle
} from 'lucide-react';
import { Finding, NormalizedEvent, AnalystNote } from '../types';
import { openRouter, OpenRouterTriageResult, POPULAR_MODELS } from '../lib/openrouter';
import { sound } from '../lib/soundFx';

interface AITriageViewProps {
  findings: Finding[];
  selectedFindingId: string | null;
  onSelectFinding: (findingId: string) => void;
  onAddNote: (findingId: string, note: string) => Promise<AnalystNote | null>;
  loadEvidence: (findingId: string) => Promise<NormalizedEvent[]>;
}

export const AITriageView: React.FC<AITriageViewProps> = ({
  findings,
  selectedFindingId,
  onSelectFinding,
  onAddNote,
  loadEvidence,
}) => {
  const activeFinding = findings.find((f) => f.finding_id === selectedFindingId) || findings[0];
  const [selectedModel, setSelectedModel] = useState(openRouter.getSelectedModel());
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<OpenRouterTriageResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [pinnedToNotes, setPinnedToNotes] = useState(false);

  // Threat Intel interactive query console
  const [intelQuery, setIntelQuery] = useState('');
  const [isAskingIntel, setIsAskingIntel] = useState(false);
  const [intelResponse, setIntelResponse] = useState<string | null>(null);

  const handleModelChange = (modelId: string) => {
    setSelectedModel(modelId);
    openRouter.setSelectedModel(modelId);
    sound.playClick();
  };

  const handleRunAnalysis = async () => {
    if (!activeFinding) return;
    setIsLoadingAnalysis(true);
    setAnalysisError(null);
    setPinnedToNotes(false);
    sound.playClick();

    try {
      const evidence = await loadEvidence(activeFinding.finding_id);
      const res = await openRouter.analyzeFinding(activeFinding, evidence);
      setAnalysisResult(res);
      sound.playSuccess();
    } catch (err: any) {
      setAnalysisError(err?.message || 'Failed to complete AI Intel analysis. Check API connection in Settings.');
      sound.playAlert();
    } finally {
      setIsLoadingAnalysis(false);
    }
  };

  const handleCopyCommand = (cmd: string, index: number) => {
    navigator.clipboard.writeText(cmd);
    setCopiedIndex(index);
    sound.playSuccess();
    setTimeout(() => setCopiedIndex(null), 2500);
  };

  const handlePinToDossier = async () => {
    if (!analysisResult || !activeFinding) return;
    const noteText = `[AI Intel Analysis (${selectedModel})]
Stage: ${analysisResult.attack_stage} | Threat: ${analysisResult.threat_level}
Summary: ${analysisResult.executive_summary}
Intent: ${analysisResult.attacker_intent}
Containment:
${analysisResult.containment_commands.map((c) => `$ ${c}`).join('\n')}`;

    sound.playClick();
    await onAddNote(activeFinding.finding_id, noteText);
    setPinnedToNotes(true);
  };

  const handleAskThreatIntel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!intelQuery.trim()) return;
    setIsAskingIntel(true);
    sound.playClick();

    try {
      const context = activeFinding
        ? `Investigating finding: ${activeFinding.rule_name} (${activeFinding.severity.toUpperCase()}), IP: ${activeFinding.source_ip}, User: ${activeFinding.username}`
        : undefined;
      const res = await openRouter.askThreatIntel(intelQuery, context);
      setIntelResponse(res);
      sound.playSuccess();
    } catch (err: any) {
      setIntelResponse(`Error: ${err?.message || 'Failed to reach OpenRouter API'}`);
      sound.playAlert();
    } finally {
      setIsAskingIntel(false);
    }
  };

  if (!findings || findings.length === 0) {
    return (
      <div className="max-w-5xl mx-auto p-16 text-center text-xs text-zinc-500 bg-[#040804] border border-emerald-950 rounded-xl font-mono">
        <Terminal className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
        No security findings loaded for AI Intel triage. Load demo attack scenario or ingest logs.
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 font-mono pb-16">
      {/* Top Banner: OpenRouter Intelligence Engine */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-5 rounded-xl bg-[#040804]/95 border border-amber-900/60 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-[0_0_30px_rgba(255,179,0,0.1)]"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-950/70 border border-amber-500/50 flex items-center justify-center text-amber-400">
              <Sparkles className="w-4 h-4 text-amber-400" />
            </div>
            <h1 className="text-xl font-black text-white tracking-wider uppercase font-mono">
              AI Intel — Threat Intelligence &amp; Triage Engine
            </h1>
            <span className="text-[9px] font-mono font-black px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-500/40 uppercase">
              ACTIVE
            </span>
          </div>
          <p className="text-xs text-zinc-400 font-sans">
            Automated cyber triage, MITRE ATT&amp;CK attack reconstruction, and hardened Linux containment commands powered by AI Intel. Built by Mouhamed Salim Bousmina.
          </p>
        </div>

        {/* Model Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400 font-mono">Model:</span>
          <select
            value={selectedModel}
            onChange={(e) => handleModelChange(e.target.value)}
            className="bg-black border border-amber-950 hover:border-amber-500 text-zinc-200 text-xs rounded-lg px-3 py-1.5 font-mono focus:outline-none focus:border-amber-400"
          >
            {POPULAR_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      </motion.div>

      {/* Select Finding & Action HUD */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column: Finding Selector */}
        <div className="lg:col-span-1 space-y-3">
          <div className="text-xs text-zinc-400 uppercase tracking-wider font-bold flex items-center justify-between">
            <span>Select Threat Finding</span>
            <span className="text-emerald-400">{findings.length} loaded</span>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {findings.map((f) => {
              const isSelected = f.finding_id === activeFinding?.finding_id;
              const isCrit = f.severity === 'critical';
              const isHigh = f.severity === 'high';
              const tech = f.mitre_attack?.technique_id || 'T1110';
              return (
                <div
                  key={f.finding_id}
                  onClick={() => {
                    sound.playClick();
                    onSelectFinding(f.finding_id);
                  }}
                  className={`p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-amber-950/20 border-amber-500/80 shadow-[0_0_15px_rgba(255,179,0,0.15)] text-white'
                      : 'bg-black/60 border-zinc-800/80 hover:border-zinc-700 text-zinc-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-[9px] font-black px-1.5 py-0.5 rounded border uppercase ${
                        isCrit
                          ? 'bg-[#ff1744] text-white border-rose-500 shadow-[0_0_6px_#ff1744]'
                          : isHigh
                          ? 'bg-amber-950 text-amber-300 border-amber-500'
                          : 'bg-emerald-950 text-emerald-300 border-emerald-500'
                      }`}
                    >
                      {f.severity}
                    </span>
                    <span className="text-[10px] text-zinc-500">{tech}</span>
                  </div>
                  <div className="font-bold text-xs truncate text-zinc-200">{f.rule_name}</div>
                  <div className="text-[10px] text-zinc-400 mt-1 truncate">
                    IP: {f.source_ip || 'Local'} &bull; User: {f.username || 'root'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 2 Columns: Analysis Workspace */}
        <div className="lg:col-span-2 space-y-5">
          {/* Active Finding Banner & Trigger Button */}
          <div className="p-4 rounded-xl bg-black border border-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs text-emerald-400 font-bold uppercase tracking-wider">
                Current Case Dossier
              </div>
              <div className="text-sm font-bold text-white">{activeFinding?.rule_name}</div>
              <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                Target User: {activeFinding?.username || 'root'} &bull; Attacker IP: {activeFinding?.source_ip || 'Local'}
              </div>
            </div>

            <button
              disabled={isLoadingAnalysis}
              onClick={handleRunAnalysis}
              className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-xs font-mono uppercase tracking-wider shadow-[0_0_20px_rgba(255,179,0,0.35)] flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50 shrink-0"
            >
              {isLoadingAnalysis ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Synthesizing Intelligence...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Run AI Intel Triage</span>
                </>
              )}
            </button>
          </div>

          {/* Analysis Error State */}
          {analysisError && (
            <div className="p-4 rounded-lg bg-rose-950/40 border border-rose-600/80 text-rose-300 text-xs space-y-1">
              <div className="flex items-center gap-2 font-bold uppercase">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <span>AI Intel Request Failed</span>
              </div>
              <p className="font-sans text-zinc-300 text-xs">{analysisError}</p>
            </div>
          )}

          {/* Analysis Result Card */}
          {analysisResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#05080c] border border-amber-950/90 rounded-xl p-5 space-y-5 shadow-[0_0_25px_rgba(0,0,0,0.8)]"
            >
              {/* Header metrics */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-900 pb-3">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-zinc-400 font-semibold">Stage:</span>
                  <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-500/40 font-bold">
                    {analysisResult.attack_stage}
                  </span>
                  <span className="text-zinc-600">&bull;</span>
                  <span className="text-zinc-400 font-semibold">TTP:</span>
                  <span className="px-2 py-0.5 rounded bg-zinc-900 text-zinc-300 border border-zinc-800">
                    {analysisResult.mitre_ttp}
                  </span>
                </div>

                {/* Pin to dossier button */}
                <button
                  onClick={handlePinToDossier}
                  disabled={pinnedToNotes}
                  className={`px-3 py-1.5 rounded text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
                    pinnedToNotes
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50'
                      : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 cursor-pointer'
                  }`}
                >
                  {pinnedToNotes ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Pinned to Case Notes</span>
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-3.5 h-3.5 text-amber-400" />
                      <span>Pin to Dossier Notes</span>
                    </>
                  )}
                </button>
              </div>

              {/* Executive Summary */}
              <div className="space-y-1.5">
                <div className="text-[11px] uppercase tracking-wider text-amber-400 font-black">
                  Executive Incident Summary
                </div>
                <p className="text-xs text-zinc-200 leading-relaxed font-sans bg-black/50 p-3 rounded-lg border border-zinc-900">
                  {analysisResult.executive_summary}
                </p>
              </div>

              {/* Attacker Intent & Methodology */}
              <div className="space-y-1.5">
                <div className="text-[11px] uppercase tracking-wider text-rose-400 font-black">
                  Adversary Intent &amp; TTPs
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed font-sans bg-black/50 p-3 rounded-lg border border-zinc-900">
                  {analysisResult.attacker_intent}
                </p>
              </div>

              {/* Tactical Containment Commands */}
              {analysisResult.containment_commands?.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[11px] uppercase tracking-wider text-emerald-400 font-black flex items-center justify-between">
                    <span>Linux Remediation &amp; Containment Commands</span>
                    <span className="text-[10px] text-zinc-500 font-normal">Click to copy</span>
                  </div>
                  <div className="space-y-1.5">
                    {analysisResult.containment_commands.map((cmd, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-3 p-2.5 rounded bg-black border border-emerald-950/80 hover:border-emerald-600/50 group transition-colors"
                      >
                        <code className="text-xs text-emerald-300 font-mono truncate flex-1">
                          $ {cmd}
                        </code>
                        <button
                          onClick={() => handleCopyCommand(cmd, idx)}
                          className="p-1 rounded bg-zinc-900 hover:bg-emerald-950 text-zinc-400 hover:text-emerald-300 transition-colors shrink-0"
                          title="Copy command"
                        >
                          {copiedIndex === idx ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Forensic Next Steps */}
              {analysisResult.forensic_next_steps?.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[11px] uppercase tracking-wider text-cyan-400 font-black">
                    Forensic Investigation Checklist
                  </div>
                  <ul className="space-y-1 text-xs text-zinc-300 font-sans">
                    {analysisResult.forensic_next_steps.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-2 bg-black/40 p-2 rounded border border-zinc-900">
                        <span className="text-cyan-400 font-mono font-bold">{idx + 1}.</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </motion.div>
          )}

          {/* Interactive Threat Intel Console */}
          <div className="bg-[#05080c] border border-zinc-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider border-b border-zinc-900 pb-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span>Interactive SOC Threat Intel Query</span>
            </div>

            <form onSubmit={handleAskThreatIntel} className="flex gap-2">
              <input
                type="text"
                value={intelQuery}
                onChange={(e) => setIntelQuery(e.target.value)}
                placeholder="Ask AI Intel: e.g. How to block pass-the-hash or investigate PAM auth logs?"
                className="flex-1 bg-black border border-zinc-800 focus:border-amber-400 text-zinc-200 text-xs rounded-lg px-3 py-2 font-mono focus:outline-none"
              />
              <button
                type="submit"
                disabled={isAskingIntel || !intelQuery.trim()}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black font-black text-xs rounded-lg flex items-center gap-1.5 transition-all cursor-pointer font-mono uppercase"
              >
                {isAskingIntel ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Query</span>
              </button>
            </form>

            {intelResponse && (
              <div className="p-3.5 rounded-lg bg-black border border-zinc-800 text-xs text-zinc-300 font-sans leading-relaxed whitespace-pre-wrap">
                {intelResponse}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
