import React, { useState } from 'react';
import { X, Upload, FileCode, CheckCircle, AlertCircle, Database } from 'lucide-react';
import { SYNTHETIC_AUTH_LOG, SYNTHETIC_JSONL_LOG } from '../lib/syntheticData';
import { ParseSummary } from '../types';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (content: string, filename: string, clearPrevious: boolean) => Promise<ParseSummary>;
}

export const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose, onImport }) => {
  const [activeMode, setActiveMode] = useState<'upload' | 'paste' | 'synthetic'>('synthetic');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="bg-[#111827] border border-slate-700/80 rounded-lg max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <h2 className="text-base font-semibold text-slate-100">Import Security Logs</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Privacy-first local processing &middot; All normalization and detection runs on this machine
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b border-slate-800 bg-[#0d1322] px-6">
          <button
            onClick={() => setActiveMode('synthetic')}
            className={`py-3 px-4 text-xs font-medium border-b-2 transition-colors ${
              activeMode === 'synthetic'
                ? 'border-sky-400 text-sky-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Synthetic Demonstration Datasets
          </button>
          <button
            onClick={() => setActiveMode('upload')}
            className={`py-3 px-4 text-xs font-medium border-b-2 transition-colors ${
              activeMode === 'upload'
                ? 'border-sky-400 text-sky-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Upload File (.log / .jsonl)
          </button>
          <button
            onClick={() => setActiveMode('paste')}
            className={`py-3 px-4 text-xs font-medium border-b-2 transition-colors ${
              activeMode === 'paste'
                ? 'border-sky-400 text-sky-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Paste Raw Logs
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {errorMsg && (
            <div className="p-3 bg-red-950/40 border border-red-800/60 rounded text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {resultSummary && (
            <div className="p-4 bg-emerald-950/30 border border-emerald-700/50 rounded text-emerald-200 text-xs space-y-2">
              <div className="flex items-center gap-2 font-semibold text-emerald-300">
                <CheckCircle className="w-4 h-4" />
                <span>Import and Analysis Completed</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono">
                <div>Parsed Events: <strong>{resultSummary.parsed_events}</strong></div>
                <div>Format: <strong>{resultSummary.source_type}</strong></div>
                <div>Malformed Lines: <strong>{resultSummary.malformed_lines}</strong></div>
                <div>Skipped: <strong>{resultSummary.skipped_lines}</strong></div>
              </div>
              <div className="pt-2">
                <button
                  onClick={onClose}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-medium text-xs transition-colors"
                >
                  View Investigation Results
                </button>
              </div>
            </div>
          )}

          {activeMode === 'synthetic' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-medium text-slate-200 text-sm">
                    <Database className="w-4 h-4 text-sky-400" />
                    <span>Linux SSH Auth Synthetic Dataset</span>
                  </div>
                  <button
                    disabled={isLoading}
                    onClick={() => handleLoadDemo('syslog')}
                    className="px-3 py-1.5 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-semibold text-xs rounded transition-colors"
                  >
                    {isLoading ? 'Processing...' : 'Load Dataset'}
                  </button>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Realistic simulation containing SSH brute force, password spray attempts,
                  repeated failures followed by successful login, sudo escalation, and non-existent user probes.
                </p>
              </div>

              <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-medium text-slate-200 text-sm">
                    <FileCode className="w-4 h-4 text-amber-400" />
                    <span>Structured JSON Lines (JSONL) Dataset</span>
                  </div>
                  <button
                    disabled={isLoading}
                    onClick={() => handleLoadDemo('jsonl')}
                    className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-200 font-semibold text-xs rounded transition-colors"
                  >
                    {isLoading ? 'Processing...' : 'Load JSONL Demo'}
                  </button>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Structured cloud container event schema containing ISO-8601 timestamps,
                  SSH auth events, sudo elevations, and deliberate malformed records.
                </p>
              </div>
            </div>
          )}

          {activeMode === 'upload' && (
            <div className="space-y-4">
              <label className="border-2 border-dashed border-slate-700 hover:border-sky-500 rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer transition-colors text-center group bg-slate-900/40">
                <Upload className="w-8 h-8 text-slate-400 group-hover:text-sky-400 mb-2 transition-colors" />
                <span className="text-sm font-medium text-slate-200">
                  Select Linux authentication log or JSONL file
                </span>
                <span className="text-xs text-slate-500 mt-1">
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
                rows={9}
                className="w-full bg-[#0a0e17] border border-slate-700 rounded-md p-3 text-xs font-mono text-slate-200 focus:outline-hidden focus:border-sky-500"
              />
              <button
                disabled={isLoading || !pastedText.trim()}
                onClick={handlePasteSubmit}
                className="px-4 py-2 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-semibold text-xs rounded transition-colors"
              >
                {isLoading ? 'Parsing...' : 'Analyze Pasted Logs'}
              </button>
            </div>
          )}

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={clearPrevious}
                onChange={(e) => setClearPrevious(e.target.checked)}
                className="rounded border-slate-700 text-sky-500 focus:ring-0"
              />
              <span>Reset existing findings and events before import</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
