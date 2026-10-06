import React, { useState } from 'react';
import { Bell, AlertTriangle, CheckCircle, Clock, Filter, Check } from 'lucide-react';

export interface AlarmItem {
  id: number;
  run_id: string;
  step: number;
  tag: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'ADVISORY';
  state: 'ACTIVE_UNACK' | 'ACTIVE_ACK' | 'RTN_UNACK' | 'CLEARED';
  description: string;
  value?: number;
  limit?: number;
  acknowledged_by?: string;
  created_at: string;
}

interface AlarmsViewProps {
  alarms: AlarmItem[];
  onAcknowledgeAlarm: (alarmId: number, note: string) => void;
}

export const AlarmsView: React.FC<AlarmsViewProps> = ({ alarms, onAcknowledgeAlarm }) => {
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [stateFilter, setStateFilter] = useState<string>('ALL');
  const [selectedAlarm, setSelectedAlarm] = useState<AlarmItem | null>(null);
  const [ackNote, setAckNote] = useState('Acknowledged via operations console');

  const filteredAlarms = alarms.filter((a) => {
    if (priorityFilter !== 'ALL' && a.priority !== priorityFilter) return false;
    if (stateFilter !== 'ALL' && a.state !== stateFilter) return false;
    return true;
  });

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'CRITICAL':
        return <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/40 rounded">CRITICAL</span>;
      case 'HIGH':
        return <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-[#f97316]/20 text-[#f97316] border border-[#f97316]/40 rounded">HIGH</span>;
      case 'MEDIUM':
        return <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-[#eab308]/20 text-[#eab308] border border-[#eab308]/40 rounded">MEDIUM</span>;
      case 'LOW':
        return <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-[#06b6d4]/20 text-[#06b6d4] border border-[#06b6d4]/40 rounded">LOW</span>;
      default:
        return <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-[#64748b]/20 text-[#64748b] border border-[#64748b]/40 rounded">ADVISORY</span>;
    }
  };

  const getStateBadge = (s: string) => {
    switch (s) {
      case 'ACTIVE_UNACK':
        return <span className="text-[10px] font-mono text-[#ef4444] font-semibold">UNACKNOWLEDGED</span>;
      case 'ACTIVE_ACK':
        return <span className="text-[10px] font-mono text-[#eab308]">ACKNOWLEDGED</span>;
      case 'CLEARED':
        return <span className="text-[10px] font-mono text-[#10b981]">CLEARED</span>;
      default:
        return <span className="text-[10px] font-mono text-[#94a3b8]">{s}</span>;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0f141c] text-[#f1f5f9] p-4 space-y-4 overflow-hidden">
      {/* Header & Filters */}
      <div className="flex items-center justify-between p-3 bg-[#18202c] border border-[#2c394b] rounded">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-[#38bdf8]" />
          <h1 className="text-sm font-bold tracking-wide uppercase text-[#f1f5f9]">ISA-18.2 Alarm Management Console</h1>
          <span className="text-xs text-[#94a3b8] font-mono ml-2">({filteredAlarms.length} Active / Recorded)</span>
        </div>

        {/* Filter Toolbar */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-[#222d3d] px-2 py-1 rounded border border-[#2c394b] text-xs">
            <Filter className="w-3 h-3 text-[#94a3b8]" />
            <span className="text-[11px] text-[#94a3b8]">Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-transparent text-xs text-[#f1f5f9] focus:outline-none cursor-pointer"
            >
              <option value="ALL">ALL</option>
              <option value="CRITICAL">CRITICAL</option>
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LOW">LOW</option>
            </select>
          </div>

          <div className="flex items-center gap-1 bg-[#222d3d] px-2 py-1 rounded border border-[#2c394b] text-xs">
            <span className="text-[11px] text-[#94a3b8]">State:</span>
            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="bg-transparent text-xs text-[#f1f5f9] focus:outline-none cursor-pointer"
            >
              <option value="ALL">ALL</option>
              <option value="ACTIVE_UNACK">UNACKNOWLEDGED</option>
              <option value="ACTIVE_ACK">ACKNOWLEDGED</option>
              <option value="CLEARED">CLEARED</option>
            </select>
          </div>
        </div>
      </div>

      {/* Alarms Table */}
      <div className="flex-1 bg-[#18202c] border border-[#2c394b] rounded overflow-hidden flex flex-col">
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-[#222d3d] text-[#94a3b8] sticky top-0 border-b border-[#2c394b]">
              <tr>
                <th className="p-2.5 font-semibold">Priority</th>
                <th className="p-2.5 font-semibold">Tag</th>
                <th className="p-2.5 font-semibold">Step</th>
                <th className="p-2.5 font-semibold">State</th>
                <th className="p-2.5 font-semibold">Description</th>
                <th className="p-2.5 font-semibold font-mono text-right">Value / Limit</th>
                <th className="p-2.5 font-semibold">Ack By</th>
                <th className="p-2.5 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2c394b] text-[#f1f5f9]">
              {filteredAlarms.map((alm) => (
                <tr key={alm.id} className="hover:bg-[#222d3d]/50 transition-colors">
                  <td className="p-2.5">{getPriorityBadge(alm.priority)}</td>
                  <td className="p-2.5 font-mono font-bold text-[#38bdf8]">{alm.tag}</td>
                  <td className="p-2.5 font-mono text-[#94a3b8]">{alm.step}</td>
                  <td className="p-2.5">{getStateBadge(alm.state)}</td>
                  <td className="p-2.5 text-[#f1f5f9]">{alm.description}</td>
                  <td className="p-2.5 font-mono text-right text-[#94a3b8]">
                    {alm.value !== undefined ? alm.value.toFixed(1) : '-'} / {alm.limit !== undefined ? alm.limit.toFixed(1) : '-'}
                  </td>
                  <td className="p-2.5 text-[#94a3b8] text-[11px]">{alm.acknowledged_by || '-'}</td>
                  <td className="p-2.5 text-right">
                    {alm.state === 'ACTIVE_UNACK' && (
                      <button
                        onClick={() => setSelectedAlarm(alm)}
                        className="px-2 py-1 bg-[#222d3d] hover:bg-[#2d3a4d] border border-[#2c394b] rounded text-[#38bdf8] text-[11px] font-semibold"
                      >
                        Acknowledge
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filteredAlarms.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-[#94a3b8] text-xs">
                    No active alarms matching current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Acknowledge Modal */}
      {selectedAlarm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-[#18202c] border border-[#2c394b] rounded w-full max-w-md p-4 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#2c394b] pb-2">
              <h3 className="text-sm font-bold text-[#f1f5f9]">Acknowledge Alarm: {selectedAlarm.tag}</h3>
              <button
                onClick={() => setSelectedAlarm(null)}
                className="text-xs text-[#94a3b8] hover:text-[#f1f5f9]"
              >
                Cancel
              </button>
            </div>

            <div className="text-xs text-[#94a3b8] space-y-1">
              <p><strong className="text-[#f1f5f9]">Description:</strong> {selectedAlarm.description}</p>
              <p><strong className="text-[#f1f5f9]">Priority:</strong> {selectedAlarm.priority}</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-[#94a3b8] block">Operator Note:</label>
              <textarea
                value={ackNote}
                onChange={(e) => setAckNote(e.target.value)}
                className="w-full bg-[#0f141c] border border-[#2c394b] rounded p-2 text-xs text-[#f1f5f9] focus:outline-none focus:border-[#38bdf8]"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#2c394b]">
              <button
                onClick={() => setSelectedAlarm(null)}
                className="px-3 py-1.5 bg-[#222d3d] hover:bg-[#2d3a4d] text-xs text-[#94a3b8] rounded"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onAcknowledgeAlarm(selectedAlarm.id, ackNote);
                  setSelectedAlarm(null);
                }}
                className="px-3 py-1.5 bg-[#38bdf8] hover:bg-[#0284c7] text-xs font-bold text-[#0f141c] rounded flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" /> Confirm Acknowledge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
