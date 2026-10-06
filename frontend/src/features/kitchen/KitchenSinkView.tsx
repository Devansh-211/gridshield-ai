import React, { useState } from 'react';
import { Pane } from '../../ui/Pane';
import { Status } from '../../ui/Status';
import { ProvenanceChip } from '../../ui/ProvenanceChip';
import { Button } from '../../ui/Button';
import { Input, Select } from '../../ui/Input';
import { PropertyGrid } from '../../ui/PropertyGrid';
import { Tabs } from '../../ui/Tabs';
import { Table } from '../../ui/Table';
import { Dialog } from '../../ui/Dialog';
import { Drawer } from '../../ui/Drawer';
import { Toolbar } from '../../ui/Toolbar';
import { Tooltip, TooltipProvider } from '../../ui/Tooltip';
import { ColumnDef } from '@tanstack/react-table';

interface SampleRow {
  id: string;
  tag: string;
  voltage: number;
  loading: number;
  status: string;
  provenance: string;
}

const SAMPLE_DATA: SampleRow[] = [
  { id: '1', tag: 'Bus 04', voltage: 0.892, loading: 94.2, status: 'CRITICAL', provenance: 'OBS' },
  { id: '2', tag: 'Bus 02', voltage: 1.015, loading: 62.1, status: 'OK', provenance: 'EST' },
  { id: '3', tag: 'Line 01-02', voltage: 1.000, loading: 104.5, status: 'HIGH', provenance: 'SIM' },
  { id: '4', tag: 'Gen 02', voltage: 1.045, loading: 85.0, status: 'SUSPECT', provenance: 'MDL' },
];

export const KitchenSinkView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('tab1');
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [selectedRowId, setSelectedRowId] = useState<string | null>('1');

  const columns: ColumnDef<SampleRow, any>[] = [
    {
      accessorKey: 'tag',
      header: 'Component Tag',
      cell: (info) => <span className="font-mono font-medium">{String(info.getValue())}</span>,
    },
    {
      accessorKey: 'voltage',
      header: () => <span className="text-right block">Voltage (p.u.)</span>,
      cell: (info) => (
        <span className="font-mono text-right block tabular-nums">
          {Number(info.getValue()).toFixed(3)}
        </span>
      ),
    },
    {
      accessorKey: 'loading',
      header: () => <span className="text-right block">Loading (%)</span>,
      cell: (info) => (
        <span className="font-mono text-right block tabular-nums">
          {Number(info.getValue()).toFixed(1)}%
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status Priority',
      cell: (info) => <Status status={String(info.getValue())} />,
    },
    {
      accessorKey: 'provenance',
      header: 'Provenance',
      cell: (info) => <ProvenanceChip provenance={String(info.getValue())} />,
    },
  ];

  return (
    <TooltipProvider>
      <div className="flex-1 flex flex-col h-full bg-app overflow-y-auto p-2 gap-2 text-xs font-ui">
        {/* Top Banner */}
        <Pane title="UI Component Kitchen Sink (Milestone U1 Verification)">
          <p className="text-text-muted mb-2">
            This private view renders every industrial design primitive across light/dark themes to verify contrast, hairline 1px borders, zero-shadow docking, and lack of AI tells.
          </p>
        </Pane>

        {/* 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 min-h-0">
          {/* Left Column: Status, Provenance, Buttons, Inputs */}
          <div className="flex flex-col space-y-2">
            {/* Status Vocabulary */}
            <Pane title="1. Status Vocabulary (Shape + Edge + Text)">
              <div className="flex flex-wrap gap-1.5 items-center">
                <Status status="CRITICAL" />
                <Status status="HIGH" />
                <Status status="MEDIUM" />
                <Status status="LOW" />
                <Status status="ADVISORY" />
                <Status status="OK" />
                <Status status="OFFLINE" />
                <Status status="SUSPECT" />
                <Status status="COMPROMISED" />
              </div>
            </Pane>

            {/* Provenance Chips */}
            <Pane title="2. Provenance Chips (Analytical Origin)">
              <div className="flex flex-wrap gap-2 items-center">
                <div className="flex items-center space-x-1">
                  <span className="text-text-muted">Simulated:</span>
                  <ProvenanceChip provenance="SIM" />
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-text-muted">Observed:</span>
                  <ProvenanceChip provenance="OBS" />
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-text-muted">Estimated:</span>
                  <ProvenanceChip provenance="EST" />
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-text-muted">Model:</span>
                  <ProvenanceChip provenance="MDL" />
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-text-muted">Calculated:</span>
                  <ProvenanceChip provenance="CALC" />
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-text-muted">LLM:</span>
                  <ProvenanceChip provenance="LLM" />
                </div>
              </div>
            </Pane>

            {/* Buttons */}
            <Pane title="3. Buttons (28px Height, High Contrast)">
              <div className="flex flex-wrap gap-2 items-center">
                <Button variant="primary">Primary Action</Button>
                <Button variant="secondary">Secondary Action</Button>
                <Button variant="danger">Danger Action</Button>
                <Button variant="ghost">Ghost Action</Button>
                <Button variant="primary" disabled>
                  Disabled
                </Button>
              </div>
            </Pane>

            {/* Inputs & Form Controls */}
            <Pane title="4. Form Controls (28px Control Height, Unit Suffixes)">
              <div className="grid grid-cols-2 gap-2">
                <Input
                  label="Voltage Setpoint"
                  defaultValue="1.020"
                  unitSuffix="p.u."
                />
                <Input
                  label="Active Power Injection"
                  defaultValue="40.0"
                  unitSuffix="MW"
                />
                <Select
                  label="Target Bus Selector"
                  options={[
                    { value: 'b4', label: 'Bus 4 (Load Interconnection)' },
                    { value: 'b2', label: 'Bus 2 (Generator PV)' },
                  ]}
                />
                <Input
                  label="Frequency Tolerance"
                  defaultValue="50.000"
                  unitSuffix="Hz"
                  error="High frequency threshold exceeded"
                />
              </div>
            </Pane>
          </div>

          {/* Right Column: Property Grid, Tabs, Table, Dialogs */}
          <div className="flex flex-col space-y-2">
            {/* Property Grid */}
            <Pane title="5. Property Grid (Replaces Floating Stat Cards)">
              <PropertyGrid
                items={[
                  {
                    label: 'Buses in Voltage Band (0.95–1.05 p.u.)',
                    value: '13/14',
                    provenance: 'CALC',
                    highlight: 'medium',
                  },
                  {
                    label: 'Lines below 100% Thermal Rating',
                    value: '19/20',
                    provenance: 'CALC',
                    highlight: 'high',
                  },
                  {
                    label: 'Grid Center of Inertia Frequency',
                    value: '50.002',
                    unit: 'Hz',
                    provenance: 'SIM',
                  },
                  {
                    label: 'Operational Risk Level',
                    value: 'HIGH',
                    provenance: 'CALC',
                    statusBadge: <Status status="HIGH" />,
                  },
                ]}
              />
            </Pane>

            {/* Tabs & Toolbar */}
            <Pane title="6. Tabs & Toolbar Primitives" noPadding>
              <Toolbar
                left={
                  <span className="font-semibold text-text-main">
                    Active Filters
                  </span>
                }
                right={
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsDrawerOpen(true)}
                  >
                    Open Drawer
                  </Button>
                }
              />
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                tabs={[
                  { id: 'tab1', label: 'Overview Panel', badge: <Status status="OK" /> },
                  { id: 'tab2', label: 'Telemetry Stream' },
                  { id: 'tab3', label: 'Cyber Log' },
                ]}
              >
                <div className="p-2.5 text-text-muted">
                  Active Tab Body: <strong>{activeTab}</strong>
                </div>
              </Tabs>
            </Pane>

            {/* Table Primitive */}
            <Pane title="7. Workhorse Table (Sortable, Tabular, Sticky Header)" noPadding>
              <div className="h-44">
                <Table
                  data={SAMPLE_DATA}
                  columns={columns}
                  selectedRowId={selectedRowId}
                  onSelectRow={(r) => setSelectedRowId(r.id)}
                />
              </div>
            </Pane>

            {/* Dialog Trigger */}
            <Pane title="8. Focus-Trapped Dialog Modal">
              <div className="flex items-center space-x-2">
                <Button variant="primary" onClick={() => setIsDialogOpen(true)}>
                  Open Verification Dialog
                </Button>
              </div>
            </Pane>
          </div>
        </div>

        {/* Modal Dialog */}
        <Dialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          title="Acknowledge Critical Alarm: Bus 04 Voltage Low"
          description="Acknowledge the unmitigated FDI voltage excursion on Bus 04."
          footer={
            <>
              <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={() => setIsDialogOpen(false)}>
                Confirm Acknowledge
              </Button>
            </>
          }
        >
          <div className="space-y-3">
            <PropertyGrid
              items={[
                { label: 'Alarm Tag', value: 'B04_V_LOW' },
                { label: 'Observed Voltage', value: '0.892', unit: 'p.u.', provenance: 'OBS' },
                { label: 'Normal Bound', value: '0.950 - 1.050', unit: 'p.u.', provenance: 'CALC' },
              ]}
            />
            <Input label="Operator Ack Note" defaultValue="Investigating closed-loop AVR response" />
          </div>
        </Dialog>

        {/* Side Drawer */}
        <Drawer
          open={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          title="Component Inspector: Bus 04"
          badge={<Status status="CRITICAL" />}
          footer={
            <Button variant="secondary" onClick={() => setIsDrawerOpen(false)}>
              Close Inspector
            </Button>
          }
        >
          <div className="space-y-3">
            <PropertyGrid
              items={[
                { label: 'Nominal Base KV', value: '13.8', unit: 'kV' },
                { label: 'Observed Voltage', value: '0.892', unit: 'p.u.', provenance: 'OBS' },
                { label: 'WLS Estimated', value: '1.021', unit: 'p.u.', provenance: 'EST' },
                { label: 'WLS Residual J(x̂)', value: '18.42', provenance: 'CALC', highlight: 'critical' },
              ]}
            />
          </div>
        </Drawer>
      </div>
    </TooltipProvider>
  );
};
