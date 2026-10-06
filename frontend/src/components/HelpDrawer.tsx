import React, { useState } from 'react';
import { Drawer } from '../ui/Drawer';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
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

  const help = TAB_HELP_CONTENT[currentTab] || TAB_HELP_CONTENT['Overview'];

  const filteredGlossary = Object.entries(glossaryData).filter(([_, val]) =>
    val.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
    val.plain.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Drawer open={isOpen} onClose={onClose} title={help.title} width="w-[380px]">
      <div className="p-3 space-y-4 text-[13px] text-[var(--text)]">
        {/* Screen Summary */}
        <div className="p-2.5 bg-[var(--bg-panel-alt)] border border-[var(--border)] text-[12px] space-y-2">
          <div className="text-[11px] font-semibold text-[var(--text-2)] uppercase">Summary</div>
          <p className="text-[var(--text-2)] leading-relaxed">{help.summary}</p>
          <div className="p-2 bg-[var(--bg-panel)] border border-[var(--border)] text-[11px] text-[var(--accent)] font-medium">
            <strong>Operational Tip:</strong> {help.tip}
          </div>
        </div>

        {/* Key Terms */}
        <div className="space-y-2">
          <div className="text-[11px] font-semibold text-[var(--text-2)] uppercase">Key Reference Terms</div>
          <div className="space-y-1.5">
            {help.keyTerms.map((termKey) => {
              const termObj = (glossaryData as Record<string, any>)[termKey];
              if (!termObj) return null;
              return (
                <div key={termKey} className="p-2 bg-[var(--bg-panel)] border border-[var(--border)] text-[12px]">
                  <div className="font-semibold text-[var(--text)]">{termObj.term}</div>
                  <div className="text-[var(--text-2)] text-[11px] mt-0.5 leading-relaxed">{termObj.plain}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mini Glossary Search */}
        <div className="space-y-2 pt-2 border-t border-[var(--border)]">
          <div className="text-[11px] font-semibold text-[var(--text-2)] uppercase">Search System Glossary</div>
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter power & cyber glossary..."
          />

          {searchTerm && (
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {filteredGlossary.slice(0, 5).map(([key, val]) => (
                <div key={key} className="p-2 bg-[var(--bg-panel)] border border-[var(--border)] text-[11px]">
                  <strong className="text-[var(--text)] block">{val.term}</strong>
                  <p className="text-[var(--text-2)] mt-0.5">{val.plain}</p>
                </div>
              ))}
              {filteredGlossary.length === 0 && (
                <div className="text-[11px] text-[var(--text-3)] p-2 text-center">No matching terms</div>
              )}
            </div>
          )}
        </div>

        {/* Link to Full Explained Guide */}
        <div className="pt-2 border-t border-[var(--border)]">
          <Button
            variant="secondary"
            className="w-full justify-center"
            onClick={() => {
              onClose();
              onNavigateToExplained();
            }}
          >
            Open Full Explained Guide
          </Button>
        </div>
      </div>
    </Drawer>
  );
};
