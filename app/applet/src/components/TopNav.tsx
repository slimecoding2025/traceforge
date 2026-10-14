import React from 'react';
import { Shield, Upload, Database } from 'lucide-react';

interface TopNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onOpenImport: () => void;
  onLoadSynthetic: () => void;
  eventCount: number;
  findingCount: number;
}

export const TopNav: React.FC<TopNavProps> = ({
  activeTab,
  onTabChange,
  onOpenImport,
  onLoadSynthetic,
  eventCount,
  findingCount
}) => {
  const navItems = [
    { id: 'overview', label: 'Overview' },
    { id: 'events', label: 'Events' },
    { id: 'findings', label: 'Findings', badge: findingCount },
    { id: 'investigation', label: 'Investigation' },
    { id: 'rules', label: 'Rules' },
    { id: 'reports', label: 'Reports' },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <header className="border-b border-slate-800 bg-[#0d1322] px-6 py-3.5 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-8">
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded bg-sky-950 border border-sky-600/40 flex items-center justify-center text-sky-400">
            <Shield className="w-4 h-4" />
          </div>
          <button
            onClick={() => onTabChange('overview')}
            className="text-lg font-bold tracking-tight text-slate-100 whitespace-nowrap hover:text-sky-400 transition-colors text-left"
          >
            TraceForge
          </button>
          <span className="hidden sm:inline text-xs text-slate-500 font-mono">v1.0</span>
        </div>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400 overflow-x-auto py-1">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`whitespace-nowrap shrink-0 transition-colors relative py-1 ${
                  isActive
                    ? 'text-sky-400 font-semibold border-b-2 border-sky-400'
                    : 'hover:text-slate-200'
                }`}
              >
                {item.label}
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="ml-1.5 text-xs font-mono text-amber-400">
                    ({item.badge})
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onLoadSynthetic}
            title="Load Bundled Synthetic Demonstration Dataset"
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 rounded transition-colors whitespace-nowrap"
          >
            <Database className="w-3.5 h-3.5 text-sky-400" />
            <span>Load Demo Data</span>
          </button>
          <button
            onClick={onOpenImport}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-900 bg-sky-400 hover:bg-sky-300 rounded transition-colors whitespace-nowrap shadow-sm shadow-sky-500/20"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import Logs</span>
          </button>
        </div>
      </div>

      <div className="flex md:hidden items-center gap-4 text-xs font-medium text-slate-400 overflow-x-auto pt-2.5 border-t border-slate-800/60 mt-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`whitespace-nowrap pb-1 ${
              activeTab === item.id ? 'text-sky-400 font-semibold border-b border-sky-400' : 'hover:text-slate-200'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </header>
  );
};
