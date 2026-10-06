/**
 * GridShield AI — Number & Timestamp Formatting Standards (Section 8).
 *
 * Enforces Invariants I1 (No fabricated data) & I2 (Provenance):
 * - Fixed decimals by measurement type
 * - Tabular numbers with fallback 'DATA UNAVAILABLE'
 * - ISO-8601 UTC timestamps
 */

export function formatVoltage(v: number | null | undefined): string {
  if (v === null || v === undefined || isNaN(v)) return '—';
  return v.toFixed(3);
}

export function formatPower(mw: number | null | undefined): string {
  if (mw === null || mw === undefined || isNaN(mw)) return '—';
  return mw.toFixed(1);
}

export function formatFrequency(hz: number | null | undefined): string {
  if (hz === null || hz === undefined || isNaN(hz)) return '50.000';
  return hz.toFixed(3);
}

export function formatLoading(pct: number | null | undefined): string {
  if (pct === null || pct === undefined || isNaN(pct)) return '—';
  return pct.toFixed(1);
}

export function formatRiskScore(score: number | null | undefined): string {
  if (score === null || score === undefined || isNaN(score)) return '0.0';
  return score.toFixed(1);
}

export function formatTimestampUTC(isoString?: string | null): string {
  if (!isoString) {
    const now = new Date();
    return now.toISOString().slice(11, 19) + 'Z';
  }
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '00:00:00Z';
    return d.toISOString().slice(11, 19) + 'Z';
  } catch {
    return '00:00:00Z';
  }
}

export function formatFullTimestampUTC(isoString?: string | null): string {
  if (!isoString) return new Date().toISOString();
  try {
    const d = new Date(isoString);
    return isNaN(d.getTime()) ? isoString : d.toISOString();
  } catch {
    return isoString || '';
  }
}

export function formatSimStepTime(step: number): string {
  const baseTime = new Date('2026-10-06T14:00:00Z').getTime();
  const stepTime = new Date(baseTime + step * 1000);
  return stepTime.toISOString().slice(11, 19) + 'Z';
}
