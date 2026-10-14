import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ShieldAlert, FileText, Database, Shield, Zap, Settings, Volume2, X } from 'lucide-react';
import { sound } from '../lib/soundFx';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: string) => void;
  onOpenImport: () => void;
  onLoadSynthetic: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
  onOpenImport,
  onLoadSynthetic,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        sound.playClick();
        if (isOpen) onClose();
        else setQuery('');
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const commands = [
    {
      id: 'overview',
      title: 'Navigate to Overview & 3D Threat Vector Matrix',
      category: 'Navigation',
      icon: <Shield className="w-4 h-4 text-emerald-400" />,
      action: () => onNavigateTab('overview'),
    },
    {
      id: 'findings',
      title: 'View Active High-Risk Detections & Findings',
      category: 'Alerts',
      icon: <ShieldAlert className="w-4 h-4 text-[#ff1744]" />,
      action: () => onNavigateTab('findings'),
    },
    {
      id: 'investigation',
      title: 'Open Forensic Timeline Investigation Workbench',
      category: 'Analysis',
      icon: <Zap className="w-4 h-4 text-amber-400" />,
      action: () => onNavigateTab('investigation'),
    },
    {
      id: 'ai_triage',
      title: 'Run AI Intel Threat Intelligence & Automated Triage',
      category: 'Intelligence',
      icon: <Zap className="w-4 h-4 text-amber-400" />,
      action: () => onNavigateTab('ai_triage'),
    },
    {
      id: 'events',
      title: 'Browse Normalized Event Telemetry & Auth Logs',
      category: 'Telemetry',
      icon: <FileText className="w-4 h-4 text-emerald-400" />,
      action: () => onNavigateTab('events'),
    },
    {
      id: 'import',
      title: 'Ingest Linux Auth Logs / JSONL Telemetry Files',
      category: 'Data Ingestion',
      icon: <Database className="w-4 h-4 text-emerald-400" />,
      action: onOpenImport,
    },
    {
      id: 'synthetic',
      title: 'Inject Multi-Stage Brute-Force & Lateral Attack Demo',
      category: 'Simulation',
      icon: <Zap className="w-4 h-4 text-[#ff1744]" />,
      action: onLoadSynthetic,
    },
    {
      id: 'reports',
      title: 'Export Air-Gapped Incident Dossier & Redacted PDF/HTML',
      category: 'Reporting',
      icon: <FileText className="w-4 h-4 text-emerald-400" />,
      action: () => onNavigateTab('reports'),
    },
    {
      id: 'sound',
      title: 'Toggle Tactical Audio Feedback Engine',
      category: 'System',
      icon: <Volume2 className="w-4 h-4 text-zinc-300" />,
      action: () => sound.toggleMute(),
    },
    {
      id: 'settings',
      title: 'Enclave Cryptography & Privacy Redaction Settings',
      category: 'Configuration',
      icon: <Settings className="w-4 h-4 text-zinc-400" />,
      action: () => onNavigateTab('settings'),
    },
  ];

  const filteredCommands = commands.filter((c) =>
    c.title.toLowerCase().includes(query.toLowerCase()) ||
    c.category.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: 'spring', duration: 0.25 }}
            className="relative z-10 w-full max-w-xl rounded-xl bg-[#040804] border-2 border-emerald-500/50 shadow-[0_0_50px_rgba(0,255,102,0.25)] overflow-hidden"
          >
            {/* Search Input Bar */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-emerald-950 bg-black">
              <Search className="w-4 h-4 text-emerald-400" />
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type command, filter rule, or triage action..."
                className="flex-1 bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-hidden font-mono"
              />
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-700">
                ESC
              </span>
              <button
                onClick={onClose}
                className="text-zinc-500 hover:text-zinc-300 p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Results List */}
            <div className="max-h-80 overflow-y-auto p-2 space-y-1">
              {filteredCommands.length === 0 ? (
                <div className="p-6 text-center text-xs text-zinc-500 font-mono">
                  No matching cybersecurity actions found.
                </div>
              ) : (
                filteredCommands.map((cmd) => (
                  <button
                    key={cmd.id}
                    onClick={() => {
                      sound.playClick();
                      cmd.action();
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-lg text-left text-xs font-mono text-zinc-200 hover:bg-emerald-950/40 hover:border-emerald-500/40 border border-transparent transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded bg-black border border-emerald-950 group-hover:border-emerald-500/50">
                        {cmd.icon}
                      </div>
                      <div>
                        <div className="font-bold text-white group-hover:text-emerald-300">
                          {cmd.title}
                        </div>
                        <div className="text-[9px] text-zinc-500 font-mono uppercase tracking-widest">
                          {cmd.category}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-black text-emerald-500 group-hover:translate-x-1 transition-transform">
                      &rarr; RUN
                    </span>
                  </button>
                ))
              )}
            </div>

            {/* Tactical Footer */}
            <div className="px-4 py-2 border-t border-emerald-950 bg-black flex items-center justify-between text-[10px] font-mono text-zinc-500">
              <span className="text-emerald-400 font-bold">TRACEFORGE COMMAND HUB</span>
              <span>&uarr;&darr; TO NAVIGATE &bull; ENTER TO EXECUTE</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
