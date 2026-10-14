import React from 'react';
import { motion } from 'framer-motion';
import { Shield, BookOpen, ExternalLink, AlertTriangle, Layers, Info, Terminal, CheckCircle2 } from 'lucide-react';
import { RuleDefinition } from '../types';

interface RulesViewProps {
  rules: RuleDefinition[];
}

export const RulesView: React.FC<RulesViewProps> = ({ rules }) => {
  return (
    <div className="max-w-7xl mx-auto pb-16 space-y-8 font-mono">
      {/* Title & Philosophy Banner: Black, Green & Red */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-5 rounded-xl bg-[#040804]/95 border border-emerald-950/80 backdrop-blur-md space-y-2"
      >
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl font-black text-white tracking-wider uppercase font-mono">
            Detection Rule Engine &amp; Correlation Logic
          </h1>
          <span className="text-[9px] font-mono font-black px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/50 uppercase tracking-widest">
            DETERMINISTIC ENGINE
          </span>
        </div>
        <p className="text-xs text-zinc-400 max-w-4xl leading-relaxed font-sans">
          TraceForge operates with 100% deterministic, explainable correlation logic. Every behavioral detection rule features explicit thresholds, event criteria, and documented false positive boundaries.
        </p>
      </motion.div>

      {/* Conceptual Distinction Taxonomy */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#040804]/95 border border-emerald-950 rounded-xl p-6 space-y-4 backdrop-blur-md"
      >
        <div className="flex items-center gap-2 border-b border-emerald-950 pb-3">
          <BookOpen className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Defensive Security Taxonomy &amp; Conceptual Boundaries
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-sans">
          <div className="p-4 bg-black border border-emerald-950 rounded-lg space-y-1.5">
            <span className="font-mono font-black text-emerald-400 block uppercase text-[11px]">Event</span>
            <p className="text-zinc-400 leading-relaxed text-xs">
              An immutable observation recorded by the OS or PAM service (e.g. "sshd accepted key for user alice"). An event carries no inherent judgment of malice.
            </p>
          </div>

          <div className="p-4 bg-black border border-emerald-950 rounded-lg space-y-1.5">
            <span className="font-mono font-black text-amber-400 block uppercase text-[11px]">Detection</span>
            <p className="text-zinc-400 leading-relaxed text-xs">
              The output of deterministic logic correlating events that satisfy specific threshold criteria (e.g. 5 failed password attempts in 300s).
            </p>
          </div>

          <div className="p-4 bg-black border border-rose-950 rounded-lg space-y-1.5 bg-[#0e0405]/70">
            <span className="font-mono font-black text-[#ff1744] block uppercase text-[11px]">Incident</span>
            <p className="text-zinc-300 leading-relaxed text-xs">
              A confirmed adverse breach or compromised credential chain requiring formal containment, revocation, and remediation.
            </p>
          </div>

          <div className="p-4 bg-black border border-emerald-950 rounded-lg space-y-1.5">
            <span className="font-mono font-black text-emerald-300 block uppercase text-[11px]">Severity vs. Confidence</span>
            <p className="text-zinc-400 leading-relaxed text-xs">
              <strong>Severity</strong> indicates potential impact if hostile. <strong>Confidence</strong> reflects analytical certainty that the pattern is genuine malicious activity rather than misconfigured tooling.
            </p>
          </div>

          <div className="p-4 bg-black border border-emerald-950 rounded-lg space-y-1.5">
            <span className="font-mono font-black text-[#00ff66] block uppercase text-[11px]">Attribution &amp; MITRE</span>
            <p className="text-zinc-400 leading-relaxed text-xs">
              MITRE ATT&amp;CK taxonomy categorizes behavioral mechanics. It does <em>not</em> prove actor nationality or attribution identity.
            </p>
          </div>

          <div className="p-4 bg-black border border-emerald-950 rounded-lg space-y-1.5">
            <span className="font-mono font-black text-zinc-300 block uppercase text-[11px]">Air-Gapped Privacy</span>
            <p className="text-zinc-400 leading-relaxed text-xs">
              All detection algorithms evaluate strictly in-memory inside the client browser. No customer logs or credentials ever leave the device.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Rules Catalog */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <span>Active Correlation Rule Definitions ({rules.length})</span>
        </h2>

        <div className="space-y-4">
          {rules.map((rule, idx) => {
            const isCrit = rule.severity === 'critical';
            const isHigh = rule.severity === 'high';
            const isMed = rule.severity === 'medium';

            const sevBadge = isCrit
              ? 'bg-[#ff1744] text-white shadow-[0_0_8px_#ff1744] border-rose-500'
              : isHigh
              ? 'bg-amber-950 text-amber-300 border-amber-500'
              : isMed
              ? 'bg-emerald-950 text-emerald-300 border-emerald-500'
              : 'bg-zinc-900 text-zinc-400 border-zinc-800';

            return (
              <motion.div
                key={rule.rule_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.05, 0.4) }}
                className="bg-[#040804]/95 border border-emerald-950 hover:border-emerald-500/70 rounded-xl p-6 space-y-4 backdrop-blur-md transition-all group"
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-950 pb-3">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded border ${sevBadge}`}>
                      {rule.severity}
                    </span>
                    <span className="text-xs text-emerald-400 font-bold">{rule.rule_id}</span>
                    <h3 className="text-sm font-black text-white group-hover:text-emerald-300 transition-colors">
                      {rule.name}
                    </h3>
                  </div>

                  {rule.mitre_attack && (
                    <a
                      href={rule.mitre_attack.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-200 bg-emerald-950 px-3 py-1 rounded-lg border border-emerald-500/40 font-bold"
                    >
                      <span>{rule.mitre_attack.technique_id} ({rule.mitre_attack.technique_name})</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>

                <p className="text-xs text-zinc-300 leading-relaxed font-sans">{rule.description}</p>

                {/* Grid of properties */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="bg-black p-3.5 rounded-lg border border-emerald-950 space-y-1">
                    <span className="text-zinc-400 font-bold block uppercase text-[10px]">
                      Default Threshold Parameters
                    </span>
                    <pre className="text-[11px] font-mono text-emerald-400">
                      {JSON.stringify(rule.default_thresholds, null, 2)}
                    </pre>
                  </div>

                  <div className="bg-black p-3.5 rounded-lg border border-emerald-950 space-y-1">
                    <span className="text-zinc-400 font-bold block uppercase text-[10px]">
                      Required Extraction Fields
                    </span>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {rule.required_fields.map((f) => (
                        <span key={f} className="px-2.5 py-1 bg-zinc-950 border border-zinc-850 rounded text-[11px] font-mono text-zinc-300">
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* MITRE relationship rationale */}
                {rule.mitre_attack?.relationship && (
                  <div className="text-xs bg-black p-3.5 rounded-lg border border-emerald-950 text-zinc-400 font-sans">
                    <strong className="text-emerald-400 font-mono">MITRE Behavioral Rationale:</strong>{' '}
                    {rule.mitre_attack.relationship}
                  </div>
                )}

                {/* Known limitations */}
                {rule.limitations.length > 0 && (
                  <div className="space-y-1 text-xs font-sans">
                    <span className="font-bold text-amber-400 flex items-center gap-1.5 text-[11px] uppercase">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      <span>Known Limitations &amp; Potential False Positives</span>
                    </span>
                    <ul className="list-disc pl-5 space-y-0.5 text-zinc-400 text-xs">
                      {rule.limitations.map((lim, i) => (
                        <li key={i}>{lim}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
