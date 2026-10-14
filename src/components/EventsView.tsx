import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  ArrowUpDown,
  Download,
  Eye,
  X,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  User,
  Server,
  Globe,
  Terminal,
  ChevronLeft,
  ChevronRight,
  Copy
} from 'lucide-react';
import { NormalizedEvent } from '../types';
import { sound } from '../lib/soundFx';

interface EventsViewProps {
  events: NormalizedEvent[];
  onSelectEvent?: (event: NormalizedEvent) => void;
  filterSourceIp?: string | null;
  onClearIpFilter?: () => void;
}

export const EventsView: React.FC<EventsViewProps> = ({
  events,
  filterSourceIp,
  onClearIpFilter,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  const [outcomeFilter, setOutcomeFilter] = useState<string>('all');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [selectedEvent, setSelectedEvent] = useState<NormalizedEvent | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [copiedRaw, setCopiedRaw] = useState(false);
  const pageSize = 50;

  // Filtered events
  const filteredEvents = useMemo(() => {
    return events
      .filter((ev) => {
        if (filterSourceIp && ev.source_ip !== filterSourceIp) {
          return false;
        }
        if (eventTypeFilter !== 'all' && ev.event_type !== eventTypeFilter) {
          return false;
        }
        if (outcomeFilter !== 'all' && ev.outcome !== outcomeFilter) {
          return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesIp = ev.source_ip?.toLowerCase().includes(q);
          const matchesUser = ev.username?.toLowerCase().includes(q);
          const matchesHost = ev.hostname?.toLowerCase().includes(q);
          const matchesMsg = ev.message?.toLowerCase().includes(q);
          const matchesRaw = ev.raw_event_reference?.toLowerCase().includes(q);
          if (!matchesIp && !matchesUser && !matchesHost && !matchesMsg && !matchesRaw) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        return sortAsc ? timeA - timeB : timeB - timeA;
      });
  }, [events, filterSourceIp, eventTypeFilter, outcomeFilter, searchQuery, sortAsc]);

  const totalPages = Math.ceil(filteredEvents.length / pageSize) || 1;
  const paginatedEvents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredEvents.slice(start, start + pageSize);
  }, [filteredEvents, currentPage]);

  const exportFilteredEvents = () => {
    sound.playSuccess();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(filteredEvents, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `traceforge_events_${new Date().toISOString().slice(0, 10)}.json`);
    dlAnchor.click();
  };

  const getOutcomeBadge = (outcome: string) => {
    switch (outcome) {
      case 'success':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-mono font-black bg-emerald-950 text-emerald-300 border border-emerald-500 shadow-[0_0_8px_rgba(0,255,102,0.3)]">
            <CheckCircle2 className="w-3 h-3" />
            <span>SUCCESS</span>
          </span>
        );
      case 'failure':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-mono font-black bg-[#ff1744] text-white shadow-[0_0_8px_#ff1744]">
            <XCircle className="w-3 h-3" />
            <span>FAILURE</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-700">
            <HelpCircle className="w-3 h-3" />
            <span>UNKNOWN</span>
          </span>
        );
    }
  };

  const getEventTypeBadge = (type: string) => {
    switch (type) {
      case 'ssh_login_failed':
        return <span className="text-rose-400 font-mono text-xs font-black">ssh_login_failed</span>;
      case 'ssh_login_success':
        return <span className="text-emerald-400 font-mono text-xs font-black">ssh_login_success</span>;
      case 'invalid_user':
        return <span className="text-amber-400 font-mono text-xs font-bold">invalid_user</span>;
      case 'sudo_elevation':
        return <span className="text-purple-400 font-mono text-xs font-bold">sudo_elevation</span>;
      default:
        return <span className="text-zinc-300 font-mono text-xs font-medium">{type}</span>;
    }
  };

  const handleCopyRaw = (text: string) => {
    sound.playClick();
    navigator.clipboard.writeText(text);
    setCopiedRaw(true);
    setTimeout(() => setCopiedRaw(false), 2000);
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-16 font-mono">
      {/* Header & Controls: Black, Green & Red */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl bg-[#040804]/95 border border-emerald-950/80 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-white tracking-wider uppercase font-mono">
              Normalized Security Telemetry
            </h1>
            <span className="text-[9px] font-mono font-black px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/50 uppercase tracking-widest">
              LOCAL AUDIT TRAIL
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1 font-sans">
            Forensic timeline of authentication attempts, privilege escalation, and invalid account probes
          </p>
        </div>

        {/* Varied Button Sizes: Hero Action Export */}
        <div className="flex items-center gap-3">
          <button
            onClick={exportFilteredEvents}
            disabled={filteredEvents.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-black bg-[#00ff66] hover:bg-[#33ff85] border border-[#00ff66] rounded-lg transition-all shadow-[0_0_18px_rgba(0,255,102,0.35)] disabled:opacity-40 cursor-pointer"
          >
            <Download className="w-4 h-4 stroke-[2.5]" />
            <span>Export JSON ({filteredEvents.length})</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-xl bg-[#040804]/95 border border-emerald-950 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-emerald-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by IP, username, hostname, or message..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-3.5 py-2 text-xs bg-black border border-emerald-950 rounded-lg text-white placeholder-zinc-500 focus:outline-hidden focus:border-emerald-400"
          />
        </div>

        {filterSourceIp && (
          <div className="flex items-center gap-1.5 px-3 py-1 text-xs bg-rose-950/80 border border-rose-600 text-rose-300 rounded-lg font-bold">
            <span>FILTER IP: {filterSourceIp}</span>
            <button
              onClick={() => {
                sound.playClick();
                onClearIpFilter?.();
              }}
              className="hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="flex items-center gap-2 text-xs">
          <Filter className="w-3.5 h-3.5 text-zinc-500" />
          <select
            value={eventTypeFilter}
            onChange={(e) => {
              sound.playClick();
              setEventTypeFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-black border border-emerald-950 rounded-lg px-3 py-1.5 text-zinc-200 focus:outline-hidden focus:border-emerald-400 text-xs font-bold cursor-pointer"
          >
            <option value="all">All Event Types</option>
            <option value="ssh_login_failed">Failed Logins (SSH)</option>
            <option value="ssh_login_success">Successful Logins (SSH)</option>
            <option value="invalid_user">Invalid User Probes</option>
            <option value="sudo_elevation">Sudo / Elevation</option>
            <option value="session_opened">Session Opened</option>
            <option value="session_closed">Session Closed</option>
          </select>

          <select
            value={outcomeFilter}
            onChange={(e) => {
              sound.playClick();
              setOutcomeFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-black border border-emerald-950 rounded-lg px-3 py-1.5 text-zinc-200 focus:outline-hidden focus:border-emerald-400 text-xs font-bold cursor-pointer"
          >
            <option value="all">All Outcomes</option>
            <option value="success">Success</option>
            <option value="failure">Failure</option>
            <option value="unknown">Unknown</option>
          </select>

          <button
            onClick={() => {
              sound.playClick();
              setSortAsc(!sortAsc);
            }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-black border border-emerald-950 text-zinc-300 hover:text-emerald-300 hover:border-emerald-500/50 text-xs font-bold cursor-pointer"
            title={sortAsc ? 'Oldest first' : 'Newest first'}
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>{sortAsc ? 'Asc' : 'Desc'}</span>
          </button>
        </div>
      </div>

      {/* Main Table: Black, Matrix Green Borders & Hover */}
      <div className="rounded-xl bg-[#040804]/95 border border-emerald-950 overflow-hidden backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-black border-b border-emerald-950 text-zinc-400 uppercase tracking-wider text-[11px] font-black">
              <tr>
                <th className="py-3 px-4">Timestamp (UTC)</th>
                <th className="py-3 px-4">Event Type</th>
                <th className="py-3 px-4">Outcome</th>
                <th className="py-3 px-4">Source IP</th>
                <th className="py-3 px-4">Username</th>
                <th className="py-3 px-4">Message Summary</th>
                <th className="py-3 px-4 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-950/50 font-mono">
              {paginatedEvents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-zinc-500 font-sans">
                    <Terminal className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                    No matching events found in audit log.
                  </td>
                </tr>
              ) : (
                paginatedEvents.map((ev) => (
                  <tr
                    key={ev.event_id}
                    onClick={() => {
                      sound.playClick();
                      setSelectedEvent(ev);
                    }}
                    className="hover:bg-emerald-950/20 hover:border-l-2 hover:border-l-[#00ff66] cursor-pointer transition-all group"
                  >
                    <td className="py-2.5 px-4 text-zinc-400 whitespace-nowrap text-[11px]">
                      {new Date(ev.timestamp).toISOString().replace('T', ' ').slice(0, 19)}
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      {getEventTypeBadge(ev.event_type)}
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      {getOutcomeBadge(ev.outcome)}
                    </td>
                    <td className="py-2.5 px-4 text-rose-400 font-black whitespace-nowrap">
                      {ev.source_ip || <span className="text-zinc-600 font-normal">-</span>}
                    </td>
                    <td className="py-2.5 px-4 text-white whitespace-nowrap font-bold">
                      {ev.username || <span className="text-zinc-600 font-normal">-</span>}
                    </td>
                    <td className="py-2.5 px-4 text-zinc-300 max-w-md truncate font-sans text-[11px]">
                      {ev.message}
                    </td>
                    <td className="py-2.5 px-4 text-right whitespace-nowrap">
                      <span className="text-[10px] font-bold text-emerald-400 group-hover:text-emerald-200 group-hover:underline">
                        Examine &rarr;
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-3.5 border-t border-emerald-950 bg-black flex items-center justify-between text-xs text-zinc-400">
          <div>
            Showing {(currentPage - 1) * pageSize + 1} -{' '}
            {Math.min(currentPage * pageSize, filteredEvents.length)} of {filteredEvents.length} events
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                sound.playClick();
                setCurrentPage((p) => Math.max(1, p - 1));
              }}
              disabled={currentPage === 1}
              className="p-1.5 rounded bg-black border border-emerald-950 hover:border-emerald-500 disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold text-zinc-200">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => {
                sound.playClick();
                setCurrentPage((p) => Math.min(totalPages, p + 1));
              }}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded bg-black border border-emerald-950 hover:border-emerald-500 disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Forensic Event Inspector Slide-Over / Modal */}
      <AnimatePresence>
        {selectedEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedEvent(null)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative z-10 w-full max-w-2xl rounded-xl bg-[#040804] border-2 border-emerald-500/50 shadow-[0_0_50px_rgba(0,255,102,0.25)] overflow-hidden"
            >
              <div className="p-4 border-b border-emerald-950 flex items-center justify-between bg-black">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span className="font-black text-white uppercase text-xs">
                    Event Forensic Inspector
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">ID: {selectedEvent.event_id}</span>
                </div>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="text-zinc-400 hover:text-white p-1 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
                {/* Meta Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg bg-black border border-emerald-950">
                    <span className="text-zinc-500 block uppercase text-[10px] font-bold">Source IP</span>
                    <span className="text-rose-400 font-black text-sm">
                      {selectedEvent.source_ip || 'Internal Host'}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-black border border-emerald-950">
                    <span className="text-zinc-500 block uppercase text-[10px] font-bold">Username</span>
                    <span className="text-white font-black text-sm">
                      {selectedEvent.username || 'N/A'}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-black border border-emerald-950">
                    <span className="text-zinc-500 block uppercase text-[10px] font-bold">Hostname</span>
                    <span className="text-white font-black text-sm">
                      {selectedEvent.hostname || 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Outcome & Timestamp */}
                <div className="flex items-center justify-between p-3.5 rounded-lg bg-black border border-emerald-950">
                  <div>
                    <span className="text-zinc-500 uppercase text-[10px] block font-bold">Outcome</span>
                    <div className="mt-1">{getOutcomeBadge(selectedEvent.outcome)}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-zinc-500 uppercase text-[10px] block font-bold">Timestamp</span>
                    <span className="text-zinc-200 font-bold">
                      {new Date(selectedEvent.timestamp).toUTCString()}
                    </span>
                  </div>
                </div>

                {/* Normalized Message */}
                <div className="space-y-1.5">
                  <span className="text-zinc-400 uppercase text-[10px] tracking-wider font-bold">
                    Normalized Event Payload
                  </span>
                  <div className="p-3 rounded-lg bg-black border border-emerald-950 text-zinc-200 whitespace-pre-wrap leading-relaxed font-sans">
                    {selectedEvent.message}
                  </div>
                </div>

                {/* Raw Syslog Record */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400 uppercase text-[10px] tracking-wider font-bold">
                      Raw Linux Syslog Reference Line
                    </span>
                    <button
                      onClick={() => handleCopyRaw(selectedEvent.raw_event_reference)}
                      className="text-[10px] text-emerald-400 hover:text-emerald-200 flex items-center gap-1 font-bold"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedRaw ? 'Copied!' : 'Copy'}</span>
                    </button>
                  </div>
                  <div className="p-3 rounded-lg bg-black border border-emerald-950 text-zinc-300 break-all leading-relaxed font-mono text-[11px]">
                    {selectedEvent.raw_event_reference}
                  </div>
                </div>

                {/* Parsed Attributes */}
                {Object.keys(selectedEvent.attributes || {}).length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-zinc-400 uppercase text-[10px] tracking-wider font-bold">
                      Parsed Extraction Dictionary
                    </span>
                    <pre className="p-3 rounded-lg bg-black border border-emerald-950 text-emerald-300 text-[11px] overflow-x-auto font-mono">
                      {JSON.stringify(selectedEvent.attributes, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              <div className="p-3.5 border-t border-emerald-950 bg-black flex justify-end">
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="px-5 py-2 bg-emerald-950 text-emerald-300 hover:bg-emerald-900 border border-emerald-500 rounded-lg text-xs font-black uppercase tracking-wider"
                >
                  Close Dossier
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
