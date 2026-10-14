import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  Upload,
  Search,
  Zap,
  Terminal,
  Activity,
  Layers,
  AlertTriangle,
  FileCode,
  FileCheck,
  Sliders,
  Sparkles,
  Radio,
  UserCheck,
  Menu,
  X
} from 'lucide-react';
import { sound } from '../lib/soundFx';

interface TopNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onOpenImport: () => void;
  onLoadSynthetic: () => void;
  onOpenCommandPalette: () => void;
  eventCount: number;
  findingCount: number;
  criticalCount?: number;
}

export const TopNav: React.FC<TopNavProps> = ({
  activeTab,
  onTabChange,
  onOpenImport,
  onLoadSynthetic,
  onOpenCommandPalette,
  eventCount,
  findingCount,
  criticalCount = 0,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const tabLabels: Record<string, string> = {
    overview: 'SOC Command Overview & 3D Threat Topology',
    events: 'Raw Ingestion Telemetry & Log Forensics',
    findings: 'Correlated Threat Findings & Alerts',
    investigation: 'Incident Response Investigation Workbench',
    ai_triage: 'AI Intel — Automated Triage & Threat Intelligence',
    rules: 'Deterministic Detection Catalog & MITRE Mapping',
    reports: 'Sanitized Forensic Reports & Audit Export',
    settings: 'Security Enclave Architecture & AI Intel Config',
  };

  const navItems = [
    { id: 'overview', label: 'SOC Overview', icon: Activity },
    { id: 'events', label: 'Telemetry Logs', icon: Layers },
    { id: 'findings', label: 'Threat Findings', badge: findingCount, icon: AlertTriangle },
    { id: 'investigation', label: 'Workbench', icon: Terminal },
    { id: 'ai_triage', label: 'AI Intel', icon: Sparkles },
    { id: 'rules', label: 'Rules Catalog', icon: FileCode },
    { id: 'reports', label: 'Forensic Reports', icon: FileCheck },
    { id: 'settings', label: 'Settings', icon: Sliders },
  ];

  const handleMobileTabClick = (id: string) => {
    sound.playTab();
    onTabChange(id);
    setMobileMenuOpen(false);
  };

  return (
    <header className="border-b border-emerald-950/80 bg-[#020502]/95 backdrop-blur-xl px-4 sm:px-6 py-2.5 sticky top-0 z-20 shadow-[0_4px_25px_rgba(0,0,0,0.8)]">
      <div className="flex items-center justify-between gap-3">
        {/* Left: Active Section & Threat Status Beacon */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 text-zinc-400 hover:text-emerald-400 rounded-lg border border-emerald-950"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest hidden sm:inline">
                TRACEFORGE //
              </span>
              <span className="text-xs sm:text-sm font-black text-white uppercase tracking-wider font-mono truncate max-w-[200px] sm:max-w-xs md:max-w-md">
                {tabLabels[activeTab] || 'DEFENSIVE SOC'}
              </span>
            </div>

            {/* Threat Level Beacon */}
            <div className="flex items-center gap-2 text-[10px] font-mono mt-0.5">
              {criticalCount > 0 ? (
                <div className="flex items-center gap-1.5 text-[#ff1744] font-black">
                  <span className="w-2 h-2 rounded-full bg-[#ff1744] shadow-[0_0_10px_#ff1744] animate-ping" />
                  <span className="tracking-widest uppercase">THREAT LEVEL: CRITICAL</span>
                </div>
              ) : findingCount > 0 ? (
                <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                  <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_#ffb300]" />
                  <span className="tracking-widest uppercase">THREAT LEVEL: ELEVATED</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#00ff66]" />
                  <span className="tracking-widest uppercase">SYSTEM STATUS: GUARDED</span>
                </div>
              )}
              <span className="hidden lg:inline text-zinc-600">&bull;</span>
              <span className="hidden lg:inline text-zinc-400">
                {eventCount.toLocaleString()} events &bull; {findingCount} detections
              </span>
            </div>
          </div>
        </div>

        {/* Center/Right HUD Actions */}
        <div className="flex items-center gap-2.5">
          {/* Quick HUD Search (Cmd+K) */}
          <button
            onClick={() => {
              sound.playClick();
              onOpenCommandPalette();
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/80 border border-zinc-800 hover:border-emerald-500/50 text-zinc-400 hover:text-emerald-300 text-xs font-mono transition-all group cursor-pointer"
            title="Command HUD (Cmd+K)"
          >
            <Search className="w-3.5 h-3.5 group-hover:text-emerald-400" />
            <span className="hidden xl:inline text-zinc-300 text-xs font-semibold">Search HUD</span>
            <kbd className="hidden sm:inline text-[10px] px-1.5 py-0.5 rounded bg-zinc-900 text-emerald-400 border border-zinc-700 font-mono font-bold">
              ⌘K
            </kbd>
          </button>

          {/* Quick Attack Demo Button */}
          <button
            onClick={() => {
              sound.playAlert();
              onLoadSynthetic();
            }}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/70 border border-rose-600 text-rose-300 hover:bg-rose-900 text-xs font-mono font-bold uppercase transition-all shadow-[0_0_12px_rgba(255,23,68,0.2)]"
            title="Inject multi-stage demonstration attack vectors"
          >
            <Zap className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />
            <span className="hidden md:inline">Attack Demo</span>
          </button>

          {/* Primary Ingest Logs Button */}
          <button
            onClick={() => {
              sound.playClick();
              onOpenImport();
            }}
            className="flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 rounded-lg bg-[#00ff66] text-black font-black text-xs font-mono uppercase tracking-wider shadow-[0_0_15px_rgba(0,255,102,0.4)] hover:bg-[#33ff85] transition-all cursor-pointer border border-[#00ff66]"
          >
            <Upload className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Ingest</span>
          </button>

          {/* Author Badge Pill */}
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-black border border-emerald-950 text-[11px] font-mono text-zinc-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Mouhamed Salim Bousmina</span>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden pt-3 pb-2 border-t border-emerald-950 mt-2 grid grid-cols-2 gap-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleMobileTabClick(item.id)}
                className={`flex items-center gap-2 p-2 rounded text-xs font-mono transition-colors text-left ${
                  isActive
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50 font-bold'
                    : 'text-zinc-400 hover:text-white bg-black/40'
                }`}
              >
                <Icon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">{item.label}</span>
                {typeof item.badge === 'number' && item.badge > 0 && (
                  <span className="ml-auto text-[10px] px-1 bg-[#ff1744] text-white rounded">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
