import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar } from './components/Sidebar';
import { TopNav } from './components/TopNav';
import { OverviewView } from './components/OverviewView';
import { EventsView } from './components/EventsView';
import { FindingsView } from './components/FindingsView';
import { InvestigationView } from './components/InvestigationView';
import { AITriageView } from './components/AITriageView';
import { RulesView } from './components/RulesView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import { ImportModal } from './components/ImportModal';
import { CommandPalette } from './components/CommandPalette';
import { api } from './lib/api';
import { NormalizedEvent, Finding, FindingStatus, OverviewStats, RuleDefinition } from './types';
import { SYNTHETIC_AUTH_LOG } from './lib/syntheticData';
import { CheckCircle2, Shield } from 'lucide-react';
import { sound } from './lib/soundFx';

export function App() {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Core reactive data states
  const [stats, setStats] = useState<OverviewStats>({
    total_events: 0,
    total_findings: 0,
    severity_counts: { critical: 0, high: 0, medium: 0, low: 0 },
    status_counts: { new: 0, triaged: 0, investigating: 0, resolved: 0, false_positive: 0 },
    top_ips: [],
    top_users: [],
    timeline: [],
    time_range: null,
  });
  const [events, setEvents] = useState<NormalizedEvent[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [rules, setRules] = useState<RuleDefinition[]>([]);

  // Initial load
  useEffect(() => {
    refreshData();
    api.getRules().then(setRules);
  }, []);

  const refreshData = async () => {
    const s = await api.getOverview();
    setStats(s);
    const f = await api.getFindings();
    setFindings(f);
    const e = await api.getEvents();
    setEvents(e.events);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const handleImport = async (content: string, filename: string, clearPrevious: boolean) => {
    const res = await api.ingestLogs(content, filename, clearPrevious);
    await refreshData();
    sound.playSuccess();
    showToast(`Processed ${res.eventsCount} events (${res.findingsCount} findings generated).`);
    return res.summary;
  };

  const handleLoadSynthetic = async () => {
    await handleImport(SYNTHETIC_AUTH_LOG, 'auth_synthetic.log', true);
    setActiveTab('overview');
    sound.playSuccess();
    showToast('Loaded multi-stage demonstration cyber attack scenario.');
  };

  const handleSelectFinding = (findingId: string) => {
    sound.playAlert();
    setSelectedFindingId(findingId);
    setActiveTab('investigation');
  };

  const handleUpdateStatus = async (findingId: string, status: FindingStatus, note?: string) => {
    await api.updateFindingStatus(findingId, status, note);
    await refreshData();
    sound.playClick();
    showToast(`Updated finding status to ${status.replace('_', ' ')}.`);
  };

  const handleAddNote = async (findingId: string, content: string) => {
    const note = await api.addNote(findingId, content);
    await refreshData();
    sound.playClick();
    showToast('Investigator note pinned to dossier.');
    return note;
  };

  const handleGenerateReport = async (format: 'json' | 'html', redactIps: boolean, redactUsers: boolean, sourceName: string) => {
    sound.playSuccess();
    return await api.generateReport(format, redactIps, redactUsers, sourceName);
  };

  const handleResetDatabase = async () => {
    await api.resetWorkbench();
    await refreshData();
    sound.playClick();
    showToast('Security investigation database purged.');
  };

  const criticalCount = stats.severity_counts.critical || 0;

  return (
    <div className="min-h-screen bg-[#020402] text-zinc-100 flex font-mono selection:bg-[#00ff66] selection:text-black cyber-grid-bg">
      {/* Left Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenImport={() => setIsImportOpen(true)}
        onLoadSynthetic={handleLoadSynthetic}
        eventCount={stats.total_events}
        findingCount={findings.length}
        criticalCount={criticalCount}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto max-h-screen">
        {/* Top HUD Header */}
        <TopNav
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onOpenImport={() => setIsImportOpen(true)}
          onLoadSynthetic={handleLoadSynthetic}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          eventCount={stats.total_events}
          findingCount={findings.length}
          criticalCount={criticalCount}
        />

        {/* Viewport with Framer Motion Animation */}
        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              {activeTab === 'overview' && (
                <OverviewView
                  stats={stats}
                  recentFindings={findings}
                  onSelectFinding={handleSelectFinding}
                  onNavigateTab={setActiveTab}
                  onTriggerDemoAttack={handleLoadSynthetic}
                />
              )}

              {activeTab === 'events' && <EventsView events={events} />}

              {activeTab === 'findings' && (
                <FindingsView
                  findings={findings}
                  onSelectFinding={handleSelectFinding}
                  onUpdateStatus={handleUpdateStatus}
                />
              )}

              {activeTab === 'investigation' && (
                <InvestigationView
                  findings={findings}
                  selectedFindingId={selectedFindingId}
                  onSelectFinding={setSelectedFindingId}
                  onUpdateStatus={handleUpdateStatus}
                  onAddNote={handleAddNote}
                  loadEvidence={(fId) => api.getFindingEvidence(fId)}
                />
              )}

              {activeTab === 'ai_triage' && (
                <AITriageView
                  findings={findings}
                  selectedFindingId={selectedFindingId}
                  onSelectFinding={setSelectedFindingId}
                  onAddNote={handleAddNote}
                  loadEvidence={(fId) => api.getFindingEvidence(fId)}
                />
              )}

              {activeTab === 'rules' && <RulesView rules={rules} />}

              {activeTab === 'reports' && (
                <ReportsView
                  stats={stats}
                  findings={findings}
                  onGenerateReport={handleGenerateReport}
                />
              )}

              {activeTab === 'settings' && (
                <SettingsView
                  onResetDatabase={handleResetDatabase}
                  eventCount={stats.total_events}
                  findingCount={findings.length}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Footer Credit */}
        <footer className="border-t border-emerald-950/80 px-6 py-3 bg-black/60 text-[11px] text-zinc-500 font-mono flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>TraceForge &bull; Defensive Cybersecurity Investigation Workbench</span>
          </div>
          <div>
            Built by <strong className="text-emerald-400">Mouhamed Salim Bousmina</strong> &bull; MIT License
          </div>
        </footer>
      </div>

      {/* Toast Notification with Framer Motion: Phosphor Green & Black */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 px-5 py-3 bg-black border-2 border-emerald-500 text-emerald-300 text-xs font-mono font-bold rounded-lg shadow-[0_0_30px_rgba(0,255,102,0.35)] flex items-center gap-2.5 backdrop-blur-md"
          >
            <CheckCircle2 className="w-4 h-4 text-[#00ff66] shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tactical Command Palette (Cmd+K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigateTab={setActiveTab}
        onOpenImport={() => setIsImportOpen(true)}
        onLoadSynthetic={handleLoadSynthetic}
      />

      {/* Import Modal */}
      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImport={handleImport}
      />
    </div>
  );
}

export default App;
