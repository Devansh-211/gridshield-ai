import React, { useState } from 'react';
import { X, HelpCircle, BookOpen, ExternalLink, Search } from 'lucide-react';
import glossaryData from '../content/glossary.json';

interface HelpDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentTab: string;
  onNavigateToExplained: () => void;
}

const TAB_HELP_CONTENT: Record<string, { title: string; summary: string; keyTerms: string[]; tip: string }> = {
  Overview: {
    title: 'Overview Console Help',
    summary: 'Displays real-time electrical grid health, key operational metrics with provenance chips, top active alarms, and the append-only event timeline.',
    keyTerms: ['bus', 'pu', 'voltage', 'frequency', 'scada'],
    tip: 'Click "Start Baseline Session" if no simulation is active, or run the Primary Demo from Scenarios.'
  },
  Grid: {
    title: 'Single-Line Grid Diagram Help',
    summary: 'Schematic map of the IEEE 14-bus electrical digital twin. Displays generators (G), synchronous condensers (SC), transformers, buses, and transmission lines with live electrical loadings and quality flags.',
    keyTerms: ['bus', 'transmission_line', 'generator', 'transformer', 'observed_value', 'estimated_value'],
    tip: 'Click on any bus or line to inspect observed measurements, estimated physics, and firewalled ground truth.'
  },
  Alarms: {
    title: 'Alarm Management Console Help',
    summary: 'ISA-18.2 industrial alarm management interface. Alarms trigger from calculated electrical threshold violations or cyber integrity alerts.',
    keyTerms: ['voltage', 'frequency', 'scada'],
    tip: 'Operators can acknowledge active alarms individually or by filter group with audit notes.'
  },
  Incidents: {
    title: 'Incident Investigation Help',
    summary: 'Case management for detected anomaly episodes. Provides plain-language explanations, mathematical evidence tables [E1-E3], forward consequence simulations, and 3-way mitigation verification.',
    keyTerms: ['false_data_injection', 'state_estimation', 'mitigation', 'verification', 'residual'],
    tip: 'Use the Plain | Technical toggle on the analyst note to view tailored reading levels.'
  },
  Trends: {
    title: 'Historian Multi-Pen Trend Viewer Help',
    summary: 'Time-series historian charting voltage, power, and loading trends across shared simulation time steps.',
    keyTerms: ['telemetry', 'voltage', 'pu'],
    tip: 'Select measurement pens from the left drawer to compare telemetry across multiple buses.'
  },
  Scenarios: {
    title: 'Scenario Lab & Demo Runner Help',
    summary: 'Allows operators to inject cyber-physical disruptions (FDI, Malicious Command, Replay, DoS) into the live session or run the stepwise automated demo.',
    keyTerms: ['false_data_injection', 'malicious_command', 'replay', 'denial_of_service'],
    tip: 'The Primary Demo executes a stepwise FDI on Bus 4 with closed-loop SCADA AVR escalation.'
  },
  'Models & System': {
    title: 'Models & System Diagnostics Help',
    summary: 'Inspects active model weights, offline evaluation metrics from metrics.json, database storage size, and honest research limitations.',
    keyTerms: ['state_estimation', 'chi_square', 'digital_twin'],
    tip: 'All evaluation metrics are calculated from held-out test datasets and verified against committed artifacts.'
  },
  Explained: {
    title: 'Explained Guide Help',
    summary: '15-section comprehensive plain-language guide for non-engineers explaining digital twin physics, attacks, and AI reasoning.',
    keyTerms: ['digital_twin', 'voltage', 'frequency', 'false_data_injection', 'mitigation'],
    tip: 'Search the interactive glossary to view both plain and technical engineering definitions.'
  }
};

export const HelpDrawer: React.FC<HelpDrawerProps> = ({ isOpen, onClose, currentTab, onNavigateToExplained }) => {
  const [searchTerm, setSearchTerm] = useState('');
  if (!isOpen) return null;

  const help = TAB_HELP_CONTENT[currentTab] || TAB_HELP_CONTENT['Overview'];

  const filteredGlossary = Object.entries(glossaryData).filter(([key, val]) =>
    val.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
    val.plain.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-[#18202c] border-l border-[#2c394b] text-[#f1f5f9] z-50 flex flex-col shadow-2xl">
      {/* Header */}
      <div className="p-4 border-b border-[#2c394b] flex items-center justify-between bg-[#222d3d]">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-[#38bdf8]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#f1f5f9]">{help.title}</h3>
        </div>
        <button onClick={onClose} className="text-[#94a3b8] hover:text-[#f1f5f9] p-1 rounded hover:bg-[#2c394b]">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* Summary Card */}
        <div className="p-3 bg-[#0f141c] border border-[#2c394b] rounded space-y-2">
          <span className="text-[10px] font-mono text-[#38bdf8] uppercase font-bold">Screen Overview</span>
          <p className="text-[#94a3b8] leading-relaxed">{help.summary}</p>
          <div className="p-2 bg-[#222d3d]/60 rounded text-[11px] text-[#10b981] border border-[#2c394b]">
            <strong>Tip:</strong> {help.tip}
          </div>
        </div>

        {/* Key Terms for this screen */}
        <div className="space-y-2">
          <span className="text-[10px] font-mono text-[#94a3b8] uppercase font-bold">Key Terms on this Screen</span>
          <div className="space-y-2">
            {help.keyTerms.map((termKey) => {
              const termObj = (glossaryData as Record<string, any>)[termKey];
              if (!termObj) return null;
              return (
                <div key={termKey} className="p-2.5 bg-[#222d3d]/50 border border-[#2c394b] rounded space-y-1">
                  <div className="font-bold text-[#38bdf8]">{termObj.term}</div>
                  <div className="text-[#94a3b8] text-[11px] leading-relaxed">{termObj.plain}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mini Glossary Search */}
        <div className="space-y-2 pt-2 border-t border-[#2c394b]">
          <span className="text-[10px] font-mono text-[#94a3b8] uppercase font-bold">Search Glossary</span>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-[#94a3b8]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search any power or cyber term..."
              className="w-full bg-[#0f141c] border border-[#2c394b] rounded pl-8 pr-3 py-1.5 text-xs text-[#f1f5f9] focus:outline-none focus:border-[#38bdf8]"
            />
          </div>

          {searchTerm && (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {filteredGlossary.slice(0, 4).map(([key, val]) => (
                <div key={key} className="p-2 bg-[#0f141c] border border-[#2c394b] rounded text-[11px]">
                  <strong className="text-[#38bdf8] block">{val.term}</strong>
                  <p className="text-[#94a3b8]">{val.plain}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Link to Full Explained Guide */}
        <div className="pt-2 border-t border-[#2c394b]">
          <button
            onClick={() => {
              onClose();
              onNavigateToExplained();
            }}
            className="w-full py-2 bg-[#222d3d] hover:bg-[#2d3a4d] border border-[#2c394b] rounded text-[#38bdf8] text-xs font-semibold flex items-center justify-center gap-1.5"
          >
            <BookOpen className="w-3.5 h-3.5" /> Read Full Plain-Language Guide
          </button>
        </div>
      </div>
    </div>
  );
};
