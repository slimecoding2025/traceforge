import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, FileCode, CheckCircle, AlertCircle, Database, Terminal, Sparkles, Flame } from 'lucide-react';
import { SYNTHETIC_AUTH_LOG, SYNTHETIC_JSONL_LOG } from '../lib/syntheticData';
import { ParseSummary } from '../types';
import { sound } from '../lib/soundFx';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (content: string, filename: string, clearPrevious: boolean) => Promise<ParseSummary>;
}

export const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose, onImport }) => {
  const [activeMode, setActiveMode] = useState<'synthetic' | 'upload' | 'paste'>('synthetic');
  const [pastedText, setPastedText] = useState('');
  const [clearPrevious, setClearPrevious] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [resultSummary, setResultSummary] = useState<ParseSummary | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      setErrorMsg('File exceeds 15MB limit.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    try {
      sound.playClick();
      const text = await file.text();
      const summary = await onImport(text, file.name, clearPrevious);
      setResultSummary(summary);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to parse file.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasteSubmit = async () => {
    if (!pastedText.trim()) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      sound.playClick();
      const summary = await onImport(pastedText, 'pasted_input.log', clearPrevious);
      setResultSummary(summary);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to parse pasted text.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadDemo = async (type: 'syslog' | 'jsonl') => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      sound.playClick();
      const content = type === 'syslog' ? SYNTHETIC_AUTH_LOG : SYNTHETIC_JSONL_LOG;
      const filename = type === 'syslog' ? 'auth_synthetic.log' : 'events_synthetic.jsonl';
      const summary = await onImport(content, filename, clearPrevious);
      setResultSummary(summary);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load demo data.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/85 backdrop-blur-md"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative z-10 bg-[#040804] border-2 border-emerald-500/60 rounded-xl max-w-2xl w-full shadow-[0_0_60px_rgba(0,255,102,0.25)] overflow-hidden flex flex-col max-h-[90vh] font-mono"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-emerald-950 bg-black">
            <div>
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <h2 className="text-base font-black text-white uppercase tracking-wider">
                  Ingest Security Logs &amp; Events
                </h2>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5 font-sans">
                Air-gapped local processing &bull; All normalization and detection algorithms execute client-side
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-white p-1 rounded transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mode Selector Tabs */}
          <div className="flex border-b border-emerald-950 bg-black px-6">
            <button
              onClick={() => {
                sound.playTab();
                setActiveMode('synthetic');
              }}
              className={`py-3.5 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${
                activeMode === 'synthetic'
                  ? 'border-[#00ff66] text-[#00ff66]'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Attack Simulations
            </button>
            <button
              onClick={() => {
                sound.playTab();
                setActiveMode('upload');
              }}
              className={`py-3.5 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${
                activeMode === 'upload'
                  ? 'border-[#00ff66] text-[#00ff66]'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Upload Local File (.log / .jsonl)
            </button>
            <button
              onClick={() => {
                sound.playTab();
                setActiveMode('paste');
              }}
              className={`py-3.5 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${
                activeMode === 'paste'
                  ? 'border-[#00ff66] text-[#00ff66]'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Paste Raw Syslog
            </button>
          </div>

          <div className="p-6 overflow-y-auto space-y-4 flex-1">
            {errorMsg && (
              <div className="p-3.5 bg-rose-950/60 border border-rose-600 rounded-lg text-rose-300 text-xs flex items-center gap-2 font-bold">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            {resultSummary && (
              <div className="p-5 bg-emerald-950/40 border-2 border-emerald-500 rounded-xl text-emerald-200 text-xs space-y-2.5 shadow-[0_0_20px_rgba(0,255,102,0.2)]">
                <div className="flex items-center gap-2 font-black text-emerald-300 text-sm uppercase">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span>Ingestion &amp; Detection Complete</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[11px]">
                  <div>Parsed: <strong className="text-white font-black">{resultSummary.parsed_events}</strong></div>
                  <div>Format: <strong className="text-white font-black">{resultSummary.source_type}</strong></div>
                  <div>Malformed: <strong className="text-white font-black">{resultSummary.malformed_lines}</strong></div>
                  <div>Skipped: <strong className="text-white font-black">{resultSummary.skipped_lines}</strong></div>
                </div>
                <div className="pt-2">
                  <button
                    onClick={() => {
                      sound.playClick();
                      onClose();
                    }}
                    className="px-5 py-2.5 bg-[#00ff66] text-black hover:bg-[#33ff85] rounded-lg font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-[0_0_15px_rgba(0,255,102,0.4)]"
                  >
                    Examine Threat Matrix &rarr;
                  </button>
                </div>
              </div>
            )}

            {activeMode === 'synthetic' && (
              <div className="space-y-4">
                <div className="p-5 bg-black border border-emerald-950 hover:border-emerald-500 rounded-xl space-y-2.5 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-black text-white text-xs uppercase tracking-wide">
                      <Flame className="w-4 h-4 text-rose-500" />
                      <span>Multi-Stage Linux SSH Attack Simulation</span>
                    </div>
                    {/* Varied Button Sizes: Large Hero Green Button */}
                    <button
                      disabled={isLoading}
                      onClick={() => handleLoadDemo('syslog')}
                      className="px-5 py-2.5 bg-[#00ff66] text-black hover:bg-[#33ff85] disabled:opacity-40 font-black text-xs uppercase tracking-wider rounded-lg transition-all shadow-[0_0_18px_rgba(0,255,102,0.4)] cursor-pointer border border-[#00ff66]"
                    >
                      {isLoading ? 'Ingesting...' : 'Inject Attack Logs'}
                    </button>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                    Includes SSH brute force bursts, distributed credential spraying, impossible travel geolocations, root escalation, and invalid user probes.
                  </p>
                </div>

                <div className="p-5 bg-black border border-emerald-950 hover:border-amber-500/50 rounded-xl space-y-2.5 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-black text-white text-xs uppercase tracking-wide">
                      <FileCode className="w-4 h-4 text-amber-400" />
                      <span>Structured JSON Lines (JSONL) Cloud Logs</span>
                    </div>
                    <button
                      disabled={isLoading}
                      onClick={() => handleLoadDemo('jsonl')}
                      className="px-4 py-2 bg-amber-950 text-amber-300 hover:bg-amber-900 border border-amber-600 disabled:opacity-40 font-bold text-xs uppercase tracking-wider rounded-lg transition-all cursor-pointer"
                    >
                      {isLoading ? 'Ingesting...' : 'Load JSONL Demo'}
                    </button>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                    Cloud container security events with ISO-8601 timestamps, sudo elevations, and deliberately malformed records.
                  </p>
                </div>
              </div>
            )}

            {activeMode === 'upload' && (
              <div className="space-y-4">
                <label className="border-2 border-dashed border-emerald-950 hover:border-emerald-500 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all text-center group bg-black hover:bg-emerald-950/10">
                  <Upload className="w-10 h-10 text-zinc-600 group-hover:text-emerald-400 mb-2 transition-colors stroke-[2]" />
                  <span className="text-xs font-black text-white uppercase tracking-wider">
                    Select Linux authentication log or JSONL file
                  </span>
                  <span className="text-[11px] text-zinc-400 mt-1 font-sans">
                    Supports /var/log/auth.log, /var/log/secure, *.log, *.jsonl (Max 15MB)
                  </span>
                  <input
                    type="file"
                    accept=".log,.txt,.jsonl,.json"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isLoading}
                  />
                </label>
              </div>
            )}

            {activeMode === 'paste' && (
              <div className="space-y-3">
                <textarea
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="Paste lines from /var/log/auth.log or JSONL records here..."
                  rows={8}
                  className="w-full bg-black border border-emerald-950 rounded-lg p-3 text-xs font-mono text-white placeholder-zinc-500 focus:outline-hidden focus:border-emerald-400"
                />
                <button
                  disabled={isLoading || !pastedText.trim()}
                  onClick={handlePasteSubmit}
                  className="px-6 py-3 bg-[#00ff66] text-black hover:bg-[#33ff85] disabled:opacity-40 font-black text-xs uppercase tracking-wider rounded-lg transition-all cursor-pointer shadow-[0_0_18px_rgba(0,255,102,0.4)] border border-[#00ff66]"
                >
                  {isLoading ? 'Analyzing...' : 'Parse & Correlate Logs'}
                </button>
              </div>
            )}

            <div className="pt-3 border-t border-emerald-950 flex items-center justify-between text-xs text-zinc-400">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={clearPrevious}
                  onChange={(e) => {
                    sound.playClick();
                    setClearPrevious(e.target.checked);
                  }}
                  className="rounded border-emerald-900 text-emerald-500 focus:ring-0 bg-black"
                />
                <span className="text-[11px] font-bold text-zinc-300">
                  Purge existing database before importing new records
                </span>
              </label>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
