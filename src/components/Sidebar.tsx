import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  Activity,
  Layers,
  AlertTriangle,
  Terminal,
  Sparkles,
  FileCode,
  FileCheck,
  Sliders,
  Volume2,
  VolumeX,
  Zap,
  Upload,
  Cpu,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  Flame,
  Radio
} from 'lucide-react';
import { sound } from '../lib/soundFx';
import { openRouter } from '../lib/openrouter';
import { TraceForgeLogo } from './TraceForgeLogo';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onOpenImport: () => void;
  onLoadSynthetic: () => void;
  eventCount: number;
  findingCount: number;
  criticalCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  onOpenImport,
  onLoadSynthetic,
  eventCount,
  findingCount,
  criticalCount,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMuted, setIsMuted] = useState(sound.getMuted());

  const navItems = [
    { id: 'overview', label: 'SOC Overview', icon: Activity },
    { id: 'events', label: 'Telemetry Logs', icon: Layers, badge: eventCount > 0 ? eventCount : undefined },
    { id: 'findings', label: 'Alerts & Findings', icon: AlertTriangle, badge: findingCount > 0 ? findingCount : undefined, isDanger: criticalCount > 0 },
    { id: 'investigation', label: 'Investigation Workbench', icon: Terminal },
    { id: 'ai_triage', label: 'AI Intel', icon: Sparkles, isAi: true },
    { id: 'rules', label: 'Detection Rules', icon: FileCode },
    { id: 'reports', label: 'Incident Reports', icon: FileCheck },
    { id: 'settings', label: 'Settings & Security', icon: Sliders },
  ];

  const handleTabClick = (id: string) => {
    sound.playTab();
    onTabChange(id);
  };

  const handleSoundToggle = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  return (
    <aside
      className={`relative z-30 flex flex-col shrink-0 transition-all duration-300 ease-in-out border-r border-emerald-950/70 bg-[#040608]/95 backdrop-blur-xl ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="p-3.5 border-b border-emerald-950/80 flex items-center justify-between">
        <div
          onClick={() => handleTabClick('overview')}
          className="cursor-pointer overflow-hidden py-0.5"
        >
          <TraceForgeLogo size={isCollapsed ? 'sm' : 'md'} showText={!isCollapsed} />
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:flex p-1.5 text-zinc-500 hover:text-emerald-400 rounded-md hover:bg-emerald-950/40 border border-transparent hover:border-emerald-950 transition-colors"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Author Verified Badge Card */}
      {!isCollapsed && (
        <div className="mx-3 mt-3 px-3 py-2 rounded-lg bg-black/60 border border-emerald-950/90 text-[11px] font-mono flex items-center justify-between text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-zinc-300 font-medium">Mouhamed Salim Bousmina</span>
          </div>
          <span className="text-[9px] uppercase px-1.5 py-0.5 bg-emerald-950 text-emerald-400 rounded border border-emerald-500/30 font-bold">
            ARCHITECT
          </span>
        </div>
      )}

      {/* Navigation Links */}
      <nav className="flex-1 px-2.5 py-4 space-y-1.5 overflow-y-auto font-mono text-xs">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id)}
              className={`w-full relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-xs font-mono group text-left ${
                isActive
                  ? 'text-white font-bold bg-emerald-950/40 border border-emerald-500/60 shadow-[0_0_15px_rgba(0,255,102,0.2)]'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60 border border-transparent'
              }`}
              title={isCollapsed ? item.label : undefined}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebarActivePill"
                  className="absolute left-0 top-1 bottom-1 w-1 bg-[#00ff66] rounded-r shadow-[0_0_8px_#00ff66]"
                />
              )}

              <Icon
                className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                  isActive
                    ? item.isAi
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                    : item.isAi
                    ? 'text-amber-400/70 group-hover:text-amber-300'
                    : 'text-zinc-500 group-hover:text-emerald-400'
                }`}
              />

              {!isCollapsed && (
                <span className="flex-1 truncate tracking-wide">
                  {item.label}
                </span>
              )}

              {!isCollapsed && item.badge !== undefined && (
                <span
                  className={`px-1.5 py-0.5 text-[10px] font-black rounded border shrink-0 ${
                    item.isDanger
                      ? 'bg-[#ff1744] text-white border-rose-500 shadow-[0_0_8px_#ff1744]'
                      : 'bg-emerald-950 text-emerald-300 border-emerald-500/50'
                  }`}
                >
                  {item.badge}
                </span>
              )}

              {isCollapsed && item.badge !== undefined && (
                <span
                  className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${
                    item.isDanger ? 'bg-[#ff1744] animate-ping' : 'bg-emerald-400'
                  }`}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* AI Intel Status Pill */}
      {!isCollapsed && (
        <div className="mx-3 mb-3 p-2.5 rounded-lg bg-black border border-amber-950/80 text-[11px] font-mono space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-amber-400 font-bold flex items-center gap-1.5 text-[10px] uppercase">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Intel Engine</span>
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div className="text-[10px] text-zinc-400 truncate">
            Model: {openRouter.getSelectedModel()}
          </div>
        </div>
      )}

      {/* Bottom Actions & Controls */}
      <div className="p-3 border-t border-emerald-950/80 bg-black/50 space-y-2">
        {/* Quick Attack Demo Button */}
        <button
          onClick={() => {
            sound.playAlert();
            onLoadSynthetic();
          }}
          className={`w-full flex items-center justify-center gap-2 rounded-lg bg-rose-950/70 border border-rose-600 text-rose-300 hover:bg-rose-900 text-xs font-mono font-bold uppercase transition-all shadow-[0_0_12px_rgba(255,23,68,0.25)] ${
            isCollapsed ? 'p-2.5' : 'px-3 py-2'
          }`}
          title="Inject multi-stage attack demonstration logs"
        >
          <Zap className="w-3.5 h-3.5 text-rose-400 fill-rose-400 shrink-0" />
          {!isCollapsed && <span>Load Attack Demo</span>}
        </button>

        {/* Primary Ingest Logs Button */}
        <button
          onClick={() => {
            sound.playClick();
            onOpenImport();
          }}
          className={`w-full flex items-center justify-center gap-2 rounded-lg bg-[#00ff66] text-black font-black text-xs font-mono uppercase tracking-wider shadow-[0_0_18px_rgba(0,255,102,0.4)] hover:bg-[#33ff85] transition-all cursor-pointer border border-[#00ff66] ${
            isCollapsed ? 'p-2.5' : 'px-3 py-2.5'
          }`}
          title="Ingest Linux /var/log/auth.log or JSONL files"
        >
          <Upload className="w-4 h-4 stroke-[2.5] shrink-0" />
          {!isCollapsed && <span>Ingest Logs</span>}
        </button>

        {/* Sound toggle & air-gapped status */}
        <div className="pt-1 flex items-center justify-between text-xs text-zinc-500 font-mono">
          <button
            onClick={handleSoundToggle}
            className={`p-1.5 rounded-md border transition-colors ${
              !isMuted
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400 shadow-[0_0_8px_rgba(0,255,102,0.2)]'
                : 'bg-black border-zinc-800 text-zinc-600 hover:text-zinc-400'
            }`}
            title={isMuted ? 'Tactical Audio: Muted' : 'Tactical Audio: Active'}
          >
            {!isMuted ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          {!isCollapsed && (
            <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>AIR-GAPPED ENGINE</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
