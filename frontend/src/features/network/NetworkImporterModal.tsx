import React, { useState } from 'react';
import { Button } from '../../ui/Button';

interface NetworkImporterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess?: (report: any) => void;
}

export const NetworkImporterModal: React.FC<NetworkImporterModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<any | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setError(null);
      setReport(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/v1/network/import', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Network import failed');
      }

      const data = await res.json();
      setReport(data.network_meta);
      if (onImportSuccess) {
        onImportSuccess(data);
      }
    } catch (err: any) {
      setError(err.message || 'Error connecting to backend importer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
      <div className="bg-panel border border-border w-full max-w-xl p-5 shadow-sm space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h2 className="text-sm font-semibold text-text-main flex items-center space-x-2">
            <span>🔌 Import Custom Electrical Grid Network</span>
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>

        <p className="text-xs text-text-subtle">
          Upload a custom grid network file in <strong>MATPOWER (.m)</strong> or <strong>pandapower (.json)</strong> format.
          The importer will generate an automated validation report, verify AC power flow convergence, and check Rule R6 compatibility.
        </p>

        {/* Upload Dropzone */}
        <div className="border border-dashed border-border p-4 text-center space-y-2 bg-surface">
          <input
            type="file"
            accept=".m,.json"
            onChange={handleFileChange}
            className="hidden"
            id="network-file-input"
          />
          <label
            htmlFor="network-file-input"
            className="cursor-pointer inline-block text-xs font-mono px-3 py-1.5 bg-panel border border-border hover:border-accent text-text-main transition-colors"
          >
            Choose Network File (.m / .json)
          </label>
          {file && (
            <div className="text-xs font-mono text-accent">
              Selected: {file.name} ({Math.round(file.size / 1024)} KB)
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="flex justify-end space-x-2">
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleUpload}
            disabled={!file || loading}
          >
            {loading ? 'Validating Network...' : 'Upload & Validate'}
          </Button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-alarm-crit/10 border border-alarm-crit/30 text-alarm-crit text-xs font-mono">
            ⚠️ {error}
          </div>
        )}

        {/* Validation Report */}
        {report && (
          <div className="border border-border bg-surface p-3 space-y-2 text-xs font-mono">
            <div className="flex justify-between font-bold border-b border-border pb-1">
              <span>Validation Report: {report.system_name}</span>
              <span className={report.valid ? 'text-alarm-ok' : 'text-alarm-warn'}>
                {report.valid ? 'PASSED' : 'DEGRADED / WARNINGS'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-text-subtle pt-1">
              <div>Buses: <strong>{report.bus_count}</strong></div>
              <div>Lines: <strong>{report.line_count}</strong></div>
              <div>Generators: <strong>{report.generator_count}</strong></div>
              <div>Transformers: <strong>{report.transformer_count}</strong></div>
              <div>Power Flow: <strong>{report.power_flow_converged ? 'CONVERGED' : 'FAILED'}</strong></div>
              <div>Rule R6 Gate: <strong>{report.compatibility_gate.supported ? 'VALIDATED' : 'UNVALIDATED (TOPOLOGY_UNSUPPORTED)'}</strong></div>
            </div>

            {report.warnings && report.warnings.length > 0 && (
              <div className="pt-2 space-y-1 text-[11px] text-alarm-warn">
                {report.warnings.map((w: string, idx: number) => (
                  <div key={idx}>• {w}</div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
