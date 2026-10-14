import React from 'react';
import { motion } from 'framer-motion';
import {
  ShieldAlert,
  FileText,
  AlertTriangle,
  UserCheck,
  ChevronRight,
  TrendingUp,
  Clock,
  Lock,
  Globe,
  Radio,
  ExternalLink,
  Copy,
  CheckCircle2,
  Zap,
  Terminal,
  Layers,
  Flame,
  ShieldCheck,
  Activity
} from 'lucide-react';
import { Finding, OverviewStats } from '../types';
import { Cyber3DVisualizer } from './Cyber3DVisualizer';
import { MotionCard } from './MotionCard';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { sound } from '../lib/soundFx';
import { TraceForgeLogo } from './TraceForgeLogo';

interface OverviewViewProps {
  stats: OverviewStats;
  recentFindings: Finding[];
  onSelectFinding: (findingId: string) => void;
  onNavigateTab: (tab: string) => void;
  onTriggerDemoAttack?: () => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  stats,
  recentFindings,
  onSelectFinding,
  onNavigateTab,
  onTriggerDemoAttack,
}) => {
  const criticalCount = stats.severity_counts.critical || 0;
  const highCount = stats.severity_counts.high || 0;
  const mediumCount = stats.severity_counts.medium || 0;
  const lowCount = stats.severity_counts.low || 0;

  const handleCopyIp = (ip: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(ip);
    sound.playSuccess();
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 14 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring' as const,
        stiffness: 300,
        damping: 24,
      },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 max-w-7xl mx-auto pb-16"
    >
      {/* Tactical Sub-Header HUD: Deep Black, Vivid Green & Red */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-xl bg-[#040804]/95 border border-emerald-950/80 backdrop-blur-md shadow-[0_10px_35px_rgba(0,0,0,0.8)]"
      >
        <div className="flex items-center gap-4">
          <TraceForgeLogo size="lg" showText={false} />
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-black text-white tracking-wider font-mono uppercase">
                DEFENSE MATRIX INTELLIGENCE HUD
              </h1>
              <span className="text-[9px] font-mono font-black px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/50 uppercase tracking-widest">
                AIR-GAPPED ENGINE
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1 font-mono">
              Deterministic defensive analysis of Linux auth logs &bull; Zero exfiltration &bull; Built by Mouhamed Salim Bousmina
            </p>
          </div>
        </div>

        {/* Varied Button Sizes: Hero Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {onTriggerDemoAttack && (
            <button
              onClick={() => {
                sound.playAlert();
                onTriggerDemoAttack();
              }}
              className="px-4 py-2 text-xs font-black uppercase font-mono bg-rose-950 text-rose-300 border border-rose-600 hover:bg-rose-900 shadow-[0_0_15px_rgba(255,23,68,0.3)] transition-all flex items-center gap-2 rounded-lg"
            >
              <Flame className="w-4 h-4 text-rose-400" />
              <span>Simulate Threat Influx</span>
            </button>
          )}

          <button
            onClick={() => {
              sound.playClick();
              onNavigateTab('findings');
            }}
            className="px-5 py-2.5 text-xs font-black uppercase font-mono bg-[#00ff66] text-black hover:bg-[#33ff85] shadow-[0_0_20px_rgba(0,255,102,0.4)] transition-all flex items-center gap-2 rounded-lg border border-[#00ff66]"
          >
            <ShieldAlert className="w-4 h-4 stroke-[2.5]" />
            <span>Triage Dossiers ({stats.total_findings})</span>
          </button>
        </div>
      </motion.div>

      {/* 3D Interactive Cyber Threat Visualizer */}
      <motion.div variants={itemVariants}>
        <Cyber3DVisualizer
          findings={recentFindings}
          totalEvents={stats.total_events}
          onSelectFinding={onSelectFinding}
        />
      </motion.div>

      {/* 4 Interactive 3D Tilt Metric Cards: Black with Green & Red */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Events (Matrix Green) */}
        <MotionCard
          glowColor="green"
          onClick={() => {
            sound.playClick();
            onNavigateTab('events');
          }}
          className="p-5 border-emerald-950/80"
        >
          <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
            <span className="label-kicker text-emerald-400">INGESTED LOG EVENTS</span>
            <div className="p-1.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-500/40">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-4xl font-black font-mono tracking-tight text-[#00ff66] drop-shadow-[0_0_12px_rgba(0,255,102,0.35)]">
            {stats.total_events.toLocaleString()}
          </div>
          <div className="flex items-center justify-between mt-2.5 text-[11px] font-mono text-zinc-400">
            <span>PAM, SSH, Sudo parsed</span>
            <span className="text-emerald-400 font-bold group-hover:translate-x-1 transition-transform">&rarr; Review</span>
          </div>
        </MotionCard>

        {/* Card 2: Generated Findings (Amber/Red) */}
        <MotionCard
          glowColor="amber"
          onClick={() => {
            sound.playClick();
            onNavigateTab('findings');
          }}
          className="p-5 border-emerald-950/80"
        >
          <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
            <span className="label-kicker text-amber-400">CORRELATED FINDINGS</span>
            <div className="p-1.5 rounded bg-amber-950/60 text-amber-400 border border-amber-500/40">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-4xl font-black font-mono tracking-tight text-[#ffb703] drop-shadow-[0_0_12px_rgba(255,183,3,0.35)]">
            {stats.total_findings}
          </div>
          <div className="flex items-center justify-between mt-2.5 text-[11px] font-mono text-zinc-400">
            <span>Deterministic rule matches</span>
            <span className="text-amber-400 font-bold group-hover:translate-x-1 transition-transform">&rarr; Inspect</span>
          </div>
        </MotionCard>

        {/* Card 3: Critical & High Threats (Blood Red) */}
        <MotionCard
          glowColor="red"
          onClick={() => {
            sound.playClick();
            onNavigateTab('findings');
          }}
          className="p-5 border-rose-950/80 bg-[#0c0405]/90"
        >
          <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
            <span className="label-kicker text-rose-400">CRITICAL BREACH THREATS</span>
            <div className="p-1.5 rounded bg-rose-950 text-rose-400 border border-rose-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-4xl font-black font-mono tracking-tight text-[#ff1744] drop-shadow-[0_0_14px_rgba(255,23,68,0.45)]">
            {criticalCount + highCount}
          </div>
          <div className="flex items-center gap-2 mt-2.5 text-[11px] font-mono text-zinc-400">
            <span className="text-rose-400 font-black">{criticalCount} Critical</span>
            <span>&bull;</span>
            <span className="text-amber-400 font-bold">{highCount} High</span>
          </div>
        </MotionCard>

        {/* Card 4: Local Enclave Privacy (Matrix Green Safe Vault) */}
        <MotionCard
          glowColor="green"
          onClick={() => {
            sound.playClick();
            onNavigateTab('settings');
          }}
          className="p-5 border-emerald-950/80"
        >
          <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
            <span className="label-kicker text-emerald-400">HOST AIR-GAP ISOLATION</span>
            <div className="p-1.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-500/40">
              <Lock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-4xl font-black font-mono tracking-tight text-[#00ff66] drop-shadow-[0_0_12px_rgba(0,255,102,0.35)]">
            100%
          </div>
          <div className="mt-2.5 text-[11px] font-mono text-emerald-400 flex items-center gap-1.5 font-bold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Local in-browser parsing</span>
          </div>
        </MotionCard>
      </motion.div>

      {/* Visual Analytics Grid: Timeline & Threat Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Ingestion Velocity Timeline */}
        <motion.div
          variants={itemVariants}
          className="lg:col-span-2 p-5 rounded-xl bg-[#040804]/95 border border-emerald-950/80 backdrop-blur-md"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold font-mono uppercase tracking-wider text-zinc-100 flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                Auth Telemetry Velocity & Ingestion Curve
              </h2>
              <p className="text-xs text-zinc-400 font-mono mt-0.5">
                Timestamped authentication events bucketed over log observation window
              </p>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-black text-emerald-400 border border-emerald-500/40">
              LIVE MATRIX
            </span>
          </div>

          <div className="h-64 w-full">
            {stats.timeline.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.timeline}>
                  <defs>
                    <linearGradient id="matrixGreenGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00ff66" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#00ff66" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#0d1e11" opacity={0.6} />
                  <XAxis
                    dataKey="time"
                    stroke="#4b5563"
                    fontSize={10}
                    fontFamily="monospace"
                    tickFormatter={(str) => {
                      const d = new Date(str);
                      return isNaN(d.getTime()) ? str : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    }}
                  />
                  <YAxis stroke="#4b5563" fontSize={10} fontFamily="monospace" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#030603',
                      borderColor: 'rgba(0, 255, 102, 0.4)',
                      borderRadius: '8px',
                      fontFamily: 'monospace',
                      fontSize: '11px',
                      color: '#ffffff',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#00ff66"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#matrixGreenGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500 text-xs font-mono">
                <Terminal className="w-8 h-8 text-zinc-700 mb-2" />
                No time-series telemetry loaded. Ingest log data or trigger demonstration scenario.
              </div>
            )}
          </div>
        </motion.div>

        {/* Right Col: Severity Matrix Breakdown (Red & Green) */}
        <motion.div
          variants={itemVariants}
          className="p-5 rounded-xl bg-[#040804]/95 border border-emerald-950/80 backdrop-blur-md flex flex-col justify-between"
        >
          <div>
            <h2 className="text-sm font-bold font-mono uppercase tracking-wider text-zinc-100 flex items-center gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              Severity Breakdown Matrix
            </h2>

            <div className="space-y-3.5">
              {/* Critical */}
              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-rose-400 font-black flex items-center gap-1.5 uppercase">
                    <span className="w-2 h-2 rounded-full bg-[#ff1744] animate-ping" />
                    Critical
                  </span>
                  <span className="text-white font-bold">{criticalCount}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-zinc-900 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-rose-700 to-[#ff1744] shadow-[0_0_12px_#ff1744]"
                    style={{
                      width: `${stats.total_findings ? (criticalCount / stats.total_findings) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>

              {/* High */}
              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-amber-400 font-bold flex items-center gap-1.5 uppercase">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    High
                  </span>
                  <span className="text-white font-bold">{highCount}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-zinc-900 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-600 to-amber-400 shadow-[0_0_10px_#ffb703]"
                    style={{
                      width: `${stats.total_findings ? (highCount / stats.total_findings) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>

              {/* Medium */}
              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-emerald-400 font-bold flex items-center gap-1.5 uppercase">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Medium
                  </span>
                  <span className="text-white font-bold">{mediumCount}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-zinc-900 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-[0_0_10px_#00ff66]"
                    style={{
                      width: `${stats.total_findings ? (mediumCount / stats.total_findings) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>

              {/* Low */}
              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-zinc-400 font-bold flex items-center gap-1.5 uppercase">
                    <span className="w-2 h-2 rounded-full bg-zinc-600" />
                    Low / Informational
                  </span>
                  <span className="text-white font-bold">{lowCount}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-zinc-900 overflow-hidden">
                  <div
                    className="h-full bg-zinc-600"
                    style={{
                      width: `${stats.total_findings ? (lowCount / stats.total_findings) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Differentiated Review Button */}
          <button
            onClick={() => {
              sound.playClick();
              onNavigateTab('findings');
            }}
            className="mt-6 w-full py-3 rounded-lg bg-black border border-emerald-500/40 hover:border-emerald-400 text-emerald-300 hover:text-white text-xs font-mono font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,255,102,0.15)] hover:shadow-[0_0_20px_rgba(0,255,102,0.3)]"
          >
            <span>Review All Finding Dossiers</span>
            <ChevronRight className="w-4 h-4 text-emerald-400" />
          </button>
        </motion.div>
      </div>

      {/* Origin Vector IPs & Targeted Accounts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Threat Origin IPs */}
        <motion.div
          variants={itemVariants}
          className="p-5 rounded-xl bg-[#040804]/95 border border-emerald-950/80 backdrop-blur-md"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold font-mono uppercase tracking-wider text-zinc-100 flex items-center gap-2">
              <Globe className="w-4 h-4 text-rose-500" />
              Hostile Origin IP Vectors
            </h2>
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">RANKED BY FREQUENCY</span>
          </div>

          <div className="space-y-2">
            {stats.top_ips.length > 0 ? (
              stats.top_ips.slice(0, 5).map((item, idx) => (
                <div
                  key={item.ip}
                  className="flex items-center justify-between p-3 rounded-lg bg-black/60 border border-emerald-950 hover:border-rose-500/50 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-5 text-center text-xs font-mono text-zinc-500 font-bold">
                      #{idx + 1}
                    </span>
                    <span className="text-xs font-mono font-black text-rose-400">{item.ip}</span>
                    <button
                      onClick={(e) => handleCopyIp(item.ip, e)}
                      title="Copy IP"
                      className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-emerald-400 p-0.5 rounded transition-opacity"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-zinc-300 font-bold">{item.count} hits</span>
                    <button
                      onClick={() => {
                        sound.playClick();
                        onNavigateTab('events');
                      }}
                      className="text-[11px] font-mono font-bold text-emerald-400 hover:text-emerald-200 hover:underline"
                    >
                      Inspect &rarr;
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-xs font-mono text-zinc-500">
                No IP attack vectors recorded.
              </div>
            )}
          </div>
        </motion.div>

        {/* Top Targeted Usernames */}
        <motion.div
          variants={itemVariants}
          className="p-5 rounded-xl bg-[#040804]/95 border border-emerald-950/80 backdrop-blur-md"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold font-mono uppercase tracking-wider text-zinc-100 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              Targeted Linux User Accounts
            </h2>
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">ATTACK FREQUENCY</span>
          </div>

          <div className="space-y-2">
            {stats.top_users.length > 0 ? (
              stats.top_users.slice(0, 5).map((item, idx) => (
                <div
                  key={item.username}
                  className="flex items-center justify-between p-3 rounded-lg bg-black/60 border border-emerald-950 hover:border-emerald-500/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-5 text-center text-xs font-mono text-zinc-500 font-bold">
                      #{idx + 1}
                    </span>
                    <span
                      className={`text-xs font-mono font-black ${
                        item.username === 'root' ? 'text-rose-400' : 'text-emerald-300'
                      }`}
                    >
                      {item.username}
                    </span>
                    {item.username === 'root' && (
                      <span className="text-[9px] font-mono font-black px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-600">
                        PRIVILEGED
                      </span>
                    )}
                  </div>

                  <span className="text-xs font-mono text-zinc-300 font-bold">{item.count} attempts</span>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-xs font-mono text-zinc-500">
                No targeted user profiles logged.
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Recent Correlated Findings Stream */}
      <motion.div
        variants={itemVariants}
        className="p-5 rounded-xl bg-[#040804]/95 border border-emerald-950/80 backdrop-blur-md"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold font-mono uppercase tracking-wider text-zinc-100 flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-400" />
              Real-time Correlated Detections
            </h2>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Click any detection to inspect full evidence trail & session timeline
            </p>
          </div>

          <button
            onClick={() => {
              sound.playClick();
              onNavigateTab('findings');
            }}
            className="text-xs font-mono font-bold text-emerald-400 hover:text-emerald-200 flex items-center gap-1 uppercase"
          >
            <span>View All ({recentFindings.length})</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2.5">
          {recentFindings.slice(0, 5).map((f) => {
            const isCrit = f.severity === 'critical';
            const isHigh = f.severity === 'high';
            return (
              <div
                key={f.finding_id}
                onClick={() => {
                  sound.playAlert();
                  onSelectFinding(f.finding_id);
                }}
                className={`p-3.5 rounded-lg bg-black/60 border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group ${
                  isCrit
                    ? 'border-rose-950 hover:border-rose-500 hover:shadow-[0_0_20px_rgba(255,23,68,0.25)]'
                    : isHigh
                    ? 'border-amber-950 hover:border-amber-500 hover:shadow-[0_0_20px_rgba(255,183,3,0.2)]'
                    : 'border-emerald-950 hover:border-emerald-500 hover:shadow-[0_0_20px_rgba(0,255,102,0.2)]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded font-black uppercase shrink-0 mt-0.5 ${
                      isCrit
                        ? 'bg-[#ff1744] text-white shadow-[0_0_8px_#ff1744]'
                        : isHigh
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                    }`}
                  >
                    {f.severity}
                  </span>

                  <div>
                    <h3 className="text-xs font-black text-white group-hover:text-emerald-300 font-mono transition-colors">
                      {f.rule_name}
                    </h3>
                    <p className="text-[11px] text-zinc-400 mt-0.5 line-clamp-1">{f.explanation}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono shrink-0">
                  <div className="text-right">
                    <div className="text-emerald-400 font-bold">{f.source_ip || 'Local/Host'}</div>
                    <div className="text-[10px] text-zinc-500">
                      User: {f.username || 'unknown'} &bull; {f.evidence_event_ids?.length || f.match_count} events
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
};
