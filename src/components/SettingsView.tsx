import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  HardDrive,
  Trash2,
  AlertTriangle,
  Lock,
  Cpu,
  EyeOff,
  Terminal,
  Sparkles,
  KeyRound,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Save
} from 'lucide-react';
import { sound } from '../lib/soundFx';
import { openRouter, POPULAR_MODELS } from '../lib/openrouter';

interface SettingsViewProps {
  onResetDatabase: () => Promise<void>;
  eventCount: number;
  findingCount: number;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  onResetDatabase,
  eventCount,
  findingCount,
}) => {
  const [isResetting, setIsResetting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // OpenRouter Settings State
  const [apiKeyInput, setApiKeyInput] = useState(openRouter.getApiKey());
  const [selectedModel, setSelectedModel] = useState(openRouter.getSelectedModel());
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSaveOpenRouterSettings = () => {
    sound.playClick();
    openRouter.setApiKey(apiKeyInput);
    openRouter.setSelectedModel(selectedModel);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleTestConnection = async () => {
    sound.playClick();
    setIsTestingKey(true);
    setTestResult(null);
    try {
      openRouter.setApiKey(apiKeyInput);
      const res = await openRouter.testConnection();
      setTestResult(res);
      if (res.success) sound.playSuccess();
      else sound.playAlert();
    } catch (err: any) {
      setTestResult({ success: false, message: err?.message || 'Connection test failed' });
      sound.playAlert();
    } finally {
      setIsTestingKey(false);
    }
  };

  const handleConfirmReset = async () => {
    sound.playAlert();
    setIsResetting(true);
    try {
      await onResetDatabase();
      setShowConfirm(false);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-16 space-y-6 font-mono">
      {/* Title & Author Info */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-5 rounded-xl bg-[#040804]/95 border border-emerald-950/80 backdrop-blur-md space-y-1"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-white tracking-wider uppercase font-mono">
              TraceForge System Settings &amp; Security Enclave
            </h1>
            <span className="text-[9px] font-mono font-black px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/50 uppercase tracking-widest">
              DEFENSIVE SOC
            </span>
          </div>
          <div className="text-xs text-zinc-400 font-mono">
            Architect: <strong className="text-emerald-400">Mouhamed Salim Bousmina</strong>
          </div>
        </div>
        <p className="text-xs text-zinc-400 font-sans">
          Manage AI Intel integration, sovereign air-gapped data retention, and incident response persistence.
        </p>
      </motion.div>

      {/* AI Intel API Integration Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#040804]/95 border-2 border-amber-950/80 rounded-xl p-6 space-y-4 backdrop-blur-md shadow-[0_0_25px_rgba(255,179,0,0.08)]"
      >
        <div className="flex items-center justify-between border-b border-amber-950/60 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              AI Intel Threat Intelligence Engine
            </h2>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-500/40 uppercase font-black">
            AI Triage
          </span>
        </div>

        <p className="text-xs text-zinc-300 leading-relaxed font-sans">
          TraceForge AI Intel uses advanced threat models (default: <code className="text-emerald-400 font-mono">liquid/lfm-2.5-2.6b:free</code>) for automated security incident triage, attack pattern analysis, and generating hardened Linux containment commands. Your API key is stored safely in local enclave storage and <code className="text-emerald-400 font-mono">.env</code> (which is ignored by Git and never committed to GitHub).
        </p>

        {/* API Key Input */}
        <div className="space-y-1.5">
          <label className="text-xs text-zinc-400 font-bold uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              <span>AI Intel API Key</span>
            </span>
            <span className="text-[10px] text-zinc-500 font-normal">
              Git Ignored &bull; Sovereign &bull; Private
            </span>
          </label>
          <input
            type="password"
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            placeholder="sk-or-v1-..."
            className="w-full bg-black border border-amber-950 focus:border-amber-400 rounded-lg p-3 text-xs text-white font-mono placeholder-zinc-600 focus:outline-none"
          />
        </div>

        {/* Model Selection */}
        <div className="space-y-1.5">
          <label className="text-xs text-zinc-400 font-bold uppercase tracking-wider block">
            Default AI Intel Model:
          </label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="w-full bg-black border border-amber-950 focus:border-amber-400 rounded-lg p-3 text-xs text-white font-mono focus:outline-none cursor-pointer"
          >
            {POPULAR_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.provider})
              </option>
            ))}
          </select>
        </div>

        {/* Test & Save Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            onClick={handleSaveOpenRouterSettings}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-[0_0_15px_rgba(255,179,0,0.3)]"
          >
            <Save className="w-4 h-4" />
            <span>Save Settings</span>
          </button>

          <button
            disabled={isTestingKey}
            onClick={handleTestConnection}
            className="px-4 py-2.5 bg-black hover:bg-zinc-900 border border-amber-950 hover:border-amber-500/80 text-amber-300 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer"
          >
            {isTestingKey ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                <span>Validating Key...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Test Connection</span>
              </>
            )}
          </button>

          {savedSuccess && (
            <span className="text-xs text-emerald-400 font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Saved successfully</span>
            </span>
          )}
        </div>

        {/* Test Result Message */}
        {testResult && (
          <div
            className={`p-3 rounded-lg border text-xs font-mono flex items-center gap-2 ${
              testResult.success
                ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300'
                : 'bg-rose-950/40 border-rose-500 text-rose-300'
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{testResult.message}</span>
          </div>
        )}
      </motion.div>

      {/* Privacy Architecture Cards */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#040804]/95 border border-emerald-950 rounded-xl p-6 space-y-4 backdrop-blur-md"
      >
        <div className="flex items-center gap-2 border-b border-emerald-950 pb-3">
          <Lock className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Defensive Security &amp; Privacy Guarantees
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
          <div className="p-4 bg-black border border-emerald-950 rounded-lg space-y-1.5">
            <span className="font-mono font-black text-[#00ff66] flex items-center gap-1.5 uppercase text-[11px]">
              <EyeOff className="w-4 h-4" />
              <span>100% In-Browser Ingestion</span>
            </span>
            <p className="text-zinc-400 leading-relaxed text-xs">
              Log parsing, correlation rules, and regex pattern matchers execute completely in your browser session. Raw logs stay sovereign to your environment.
            </p>
          </div>

          <div className="p-4 bg-black border border-emerald-950 rounded-lg space-y-1.5">
            <span className="font-mono font-black text-emerald-400 flex items-center gap-1.5 uppercase text-[11px]">
              <Cpu className="w-4 h-4" />
              <span>Deterministic Rule Reasoning</span>
            </span>
            <p className="text-zinc-400 leading-relaxed text-xs">
              All baseline detection algorithms are transparent, deterministic, and mapped to MITRE ATT&amp;CK taxonomy.
            </p>
          </div>

          <div className="p-4 bg-black border border-amber-950 rounded-lg space-y-1.5">
            <span className="font-mono font-black text-amber-400 flex items-center gap-1.5 uppercase text-[11px]">
              <ShieldCheck className="w-4 h-4" />
              <span>Zero Tracking or Cookies</span>
            </span>
            <p className="text-zinc-400 leading-relaxed text-xs">
              No analytics beacons, advertising cookies, performance trackers, or telemetry scripts exist anywhere in the application.
            </p>
          </div>

          <div className="p-4 bg-black border border-rose-950 rounded-lg space-y-1.5 bg-[#0e0405]/60">
            <span className="font-mono font-black text-[#ff1744] flex items-center gap-1.5 uppercase text-[11px]">
              <HardDrive className="w-4 h-4" />
              <span>Sovereign Local Persistence</span>
            </span>
            <p className="text-zinc-300 leading-relaxed text-xs">
              All parsed events and investigative dossiers stay strictly in your local isolated storage. You can purge them with a single click.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Storage & State Management */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#040804]/95 border border-emerald-950 rounded-xl p-6 space-y-4 backdrop-blur-md"
      >
        <div className="flex items-center justify-between border-b border-emerald-950 pb-3">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Enclave Storage Footprint
            </h2>
          </div>
          <div className="text-xs font-mono text-emerald-400 font-bold">
            {eventCount.toLocaleString()} events &bull; {findingCount} findings
          </div>
        </div>

        <p className="text-xs text-zinc-400 leading-relaxed font-sans">
          The workbench persists normalized event telemetry, correlated findings, triage status updates, and analyst notes in local isolation.
        </p>

        {/* Purge Danger Button */}
        <div className="pt-2">
          {!showConfirm ? (
            <button
              onClick={() => {
                sound.playClick();
                setShowConfirm(true);
              }}
              className="px-6 py-3 bg-rose-950 text-rose-300 hover:bg-rose-900 border border-rose-600 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-[0_0_15px_rgba(255,23,68,0.25)]"
            >
              <Trash2 className="w-4 h-4" />
              <span>Purge Security Database</span>
            </button>
          ) : (
            <div className="p-5 bg-[#0f0406] border-2 border-rose-600 rounded-xl space-y-3.5 shadow-[0_0_25px_rgba(255,23,68,0.3)]">
              <div className="flex items-center gap-2 text-rose-400 text-xs font-black uppercase">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <span>Confirm Irreversible Database Purge</span>
              </div>
              <p className="text-xs text-zinc-300 font-sans">
                This will delete all {eventCount.toLocaleString()} imported events and {findingCount} correlated findings from local storage immediately.
              </p>
              <div className="flex items-center gap-3 pt-1">
                <button
                  disabled={isResetting}
                  onClick={handleConfirmReset}
                  className="px-5 py-2.5 bg-[#ff1744] hover:bg-rose-600 text-white rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-[0_0_15px_rgba(255,23,68,0.4)]"
                >
                  {isResetting ? 'Purging...' : 'Yes, Delete Everything'}
                </button>
                <button
                  onClick={() => {
                    sound.playClick();
                    setShowConfirm(false);
                  }}
                  className="px-4 py-2.5 bg-black hover:bg-zinc-900 text-zinc-300 rounded-lg text-xs font-bold border border-zinc-700 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Educational Notice & Author Attribution */}
      <div className="p-4 rounded-xl bg-black border border-emerald-950 space-y-2 text-xs">
        <h3 className="font-bold text-emerald-400 flex items-center gap-1.5 uppercase text-[11px]">
          <ShieldCheck className="w-4 h-4" />
          <span>TraceForge Architecture &bull; Built by Mouhamed Salim Bousmina</span>
        </h3>
        <p className="text-zinc-400 leading-relaxed font-sans text-xs">
          Engineered for educational defensive forensics, audit log investigation, and cyber SOC operations. Licensed under the MIT License by Mouhamed Salim Bousmina.
        </p>
      </div>
    </div>
  );
};
