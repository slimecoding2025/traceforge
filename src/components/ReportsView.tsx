import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileDown, ShieldCheck, Download, Code, Eye, Lock, FileText, CheckCircle2, Terminal } from 'lucide-react';
import { Finding, OverviewStats } from '../types';
import { sound } from '../lib/soundFx';

interface ReportsViewProps {
  stats: OverviewStats;
  findings: Finding[];
  onGenerateReport: (format: 'json' | 'html', redactIps: boolean, redactUsers: boolean, sourceName: string) => Promise<string | any>;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  stats,
  findings,
  onGenerateReport,
}) => {
  const [redactIps, setRedactIps] = useState(true);
  const [redactUsers, setRedactUsers] = useState(true);
  const [sourceName, setSourceName] = useState('Linux-Auth-Investigation');
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  const handleDownloadHtml = async () => {
    sound.playClick();
    setIsGenerating(true);
    try {
      const html = await onGenerateReport('html', redactIps, redactUsers, sourceName);
      sound.playSuccess();
      const blob = new Blob([typeof html === 'string' ? html : JSON.stringify(html)], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `traceforge_report_${new Date().toISOString().slice(0, 10)}.html`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadJson = async () => {
    sound.playClick();
    setIsGenerating(true);
    try {
      const data = await onGenerateReport('json', redactIps, redactUsers, sourceName);
      sound.playSuccess();
      const jsonStr = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `traceforge_report_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePreviewReport = async () => {
    sound.playClick();
    setIsGenerating(true);
    try {
      const html = await onGenerateReport('html', redactIps, redactUsers, sourceName);
      setPreviewHtml(typeof html === 'string' ? html : String(html));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-16 space-y-6 font-mono">
      {/* Top Banner: Black, Matrix Green & Red */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-5 rounded-xl bg-[#040804]/95 border border-emerald-950/80 backdrop-blur-md space-y-1"
      >
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl font-black text-white tracking-wider uppercase font-mono">
            Forensic Report Generator
          </h1>
          <span className="text-[9px] font-mono font-black px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/50 uppercase tracking-widest">
            AIR-GAPPED COMPLIANCE
          </span>
        </div>
        <p className="text-xs text-zinc-400 font-sans">
          Generate sanitized, air-gapped HTML incident reports and structured JSON exports with deterministic pseudonymization.
        </p>
      </motion.div>

      {/* Export Controls & Configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-[#040804]/95 border border-emerald-950 rounded-xl p-6 space-y-5 lg:col-span-1 backdrop-blur-md"
        >
          <div className="border-b border-emerald-950 pb-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wider">
              <Lock className="w-4 h-4 text-emerald-400" />
              <span>Redaction &amp; Parameters</span>
            </h2>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="text-zinc-400 uppercase text-[10px] block mb-1 font-bold">
                Investigation Dossier Codename
              </label>
              <input
                type="text"
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
                className="w-full bg-black border border-emerald-950 rounded-lg p-2.5 text-white focus:outline-hidden focus:border-emerald-400 font-mono text-xs"
              />
            </div>

            <div className="space-y-3 pt-2 border-t border-emerald-950">
              <span className="text-zinc-400 uppercase text-[10px] font-bold block">
                Deterministic Redaction Settings
              </span>

              <label className="flex items-center gap-2.5 cursor-pointer text-zinc-300 font-bold">
                <input
                  type="checkbox"
                  checked={redactIps}
                  onChange={(e) => {
                    sound.playClick();
                    setRedactIps(e.target.checked);
                  }}
                  className="rounded border-emerald-900 text-emerald-500 focus:ring-0 bg-black"
                />
                <span className="text-xs">Pseudonymize IP Addresses (e.g. ANON_IP_1)</span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer text-zinc-300 font-bold">
                <input
                  type="checkbox"
                  checked={redactUsers}
                  onChange={(e) => {
                    sound.playClick();
                    setRedactUsers(e.target.checked);
                  }}
                  className="rounded border-emerald-900 text-emerald-500 focus:ring-0 bg-black"
                />
                <span className="text-xs">Pseudonymize Usernames (e.g. user_1)</span>
              </label>

              <p className="text-[11px] text-zinc-500 leading-relaxed font-sans pt-1">
                Deterministic pseudonyms ensure cross-event correlation without revealing real network infrastructure or employee credentials.
              </p>
            </div>

            {/* Varied Button Sizes: Hero, Medium, Micro */}
            <div className="space-y-2.5 pt-4 border-t border-emerald-950">
              <button
                disabled={isGenerating}
                onClick={handleDownloadHtml}
                className="w-full py-3 bg-[#00ff66] text-black hover:bg-[#33ff85] disabled:opacity-40 font-black text-xs uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 shadow-[0_0_18px_rgba(0,255,102,0.35)] cursor-pointer border border-[#00ff66]"
              >
                <Download className="w-4 h-4 stroke-[2.5]" />
                <span>{isGenerating ? 'Exporting...' : 'Export Standalone HTML Report'}</span>
              </button>

              <button
                disabled={isGenerating}
                onClick={handleDownloadJson}
                className="w-full py-2.5 bg-black hover:bg-emerald-950/40 disabled:opacity-40 text-emerald-300 font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-2 border border-emerald-900 cursor-pointer"
              >
                <Code className="w-4 h-4 text-emerald-400" />
                <span>Export Structured JSON</span>
              </button>

              <button
                disabled={isGenerating}
                onClick={handlePreviewReport}
                className="w-full py-2 bg-black hover:bg-zinc-900 text-zinc-400 hover:text-white text-xs rounded-lg transition-all flex items-center justify-center gap-2 border border-zinc-800 cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                <span>Preview Report In Sandbox</span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* Live Preview Panel */}
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-[#040804]/95 border border-emerald-950 rounded-xl p-6 lg:col-span-2 space-y-4 flex flex-col backdrop-blur-md"
        >
          <div className="flex items-center justify-between border-b border-emerald-950 pb-3">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Executive Incident Dossier Summary
              </h2>
              <p className="text-xs text-zinc-400 font-sans">Verification of payload before export</p>
            </div>
            <span className="text-[10px] text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/40 font-bold">
              READY FOR AUDIT
            </span>
          </div>

          {previewHtml ? (
            <div className="flex-1 min-h-[360px] rounded-lg border border-emerald-950 overflow-hidden bg-black">
              <iframe
                title="Report Sandbox Preview"
                srcDoc={previewHtml}
                className="w-full h-full min-h-[420px] bg-white rounded"
              />
            </div>
          ) : (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-black p-4 rounded-xl border border-emerald-950">
                <div>
                  <span className="text-zinc-500 block uppercase text-[10px] font-bold">Total Ingested Events</span>
                  <span className="text-xl font-black text-white">{stats.total_events}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block uppercase text-[10px] font-bold">Total Findings</span>
                  <span className="text-xl font-black text-amber-400">{stats.total_findings}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block uppercase text-[10px] font-bold">Critical Breaches</span>
                  <span className="text-xl font-black text-rose-500">{stats.severity_counts.critical || 0}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block uppercase text-[10px] font-bold">High Severity</span>
                  <span className="text-xl font-black text-amber-400">{stats.severity_counts.high || 0}</span>
                </div>
              </div>

              <div className="p-4 bg-black rounded-xl border border-emerald-950 space-y-2">
                <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Deterministic Audit Standard Compliance</span>
                </h3>
                <ul className="space-y-1.5 text-xs text-zinc-300 font-sans">
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">&check;</span>
                    <span>Contains full executive summary, severity matrix, and MITRE ATT&amp;CK classification</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">&check;</span>
                    <span>Standalone single-file HTML includes CSS &amp; interactive evidence drilldowns with zero CDN requests</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">&check;</span>
                    <span>Safe for distribution to compliance officers and legal counsel</span>
                  </li>
                </ul>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handlePreviewReport}
                  className="px-5 py-2.5 bg-black border border-emerald-500 text-emerald-300 hover:bg-emerald-950 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <Eye className="w-4 h-4" />
                  <span>Render Full HTML Preview In Sandbox</span>
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};
