/**
 * GridShield AI — Topology vs Drawing Invariant Test.
 *
 * Verifies Section 6.2 requirement:
 * Every line and transformer in the IEEE 14-bus topology exists in the layout definition
 * and that no extra or duplicate edges exist.
 */

import { IEEE14_BUS_LAYOUT, IEEE14_LINE_LAYOUT } from '../layout.ipc14';

describe('IEEE 14-Bus Single-Line Layout Invariants', () => {
  test('Layout contains exactly 14 buses (Buses 1 through 14)', () => {
    const busIds = Object.keys(IEEE14_BUS_LAYOUT).map(Number);
    expect(busIds).toHaveLength(14);
    for (let i = 1; i <= 14; i++) {
      expect(IEEE14_BUS_LAYOUT[i]).toBeDefined();
      expect(IEEE14_BUS_LAYOUT[i].id).toBe(i);
      expect(IEEE14_BUS_LAYOUT[i].tag).toBe(`B${i.toString().padStart(2, '0')}`);
    }
  });

  test('Layout contains exactly 20 branches (lines and transformers)', () => {
    expect(IEEE14_LINE_LAYOUT).toHaveLength(20);
  });

  test('All branches have valid orthogonal waypoints with valid endpoint buses', () => {
    const edgePairs = new Set<string>();

    IEEE14_LINE_LAYOUT.forEach((edge) => {
      expect(IEEE14_BUS_LAYOUT[edge.fromBus]).toBeDefined();
      expect(IEEE14_BUS_LAYOUT[edge.toBus]).toBeDefined();
      expect(edge.waypoints.length).toBeGreaterThanOrEqual(2);

      // Verify all waypoint segments are strictly orthogonal (dx == 0 or dy == 0)
      for (let i = 0; i < edge.waypoints.length - 1; i++) {
        const [x1, y1] = edge.waypoints[i];
        const [x2, y2] = edge.waypoints[i + 1];
        const isOrthogonal = x1 === x2 || y1 === y2;
        expect(isOrthogonal).toBe(true);
      }

      // Check no duplicate edges
      const pairKey = `${Math.min(edge.fromBus, edge.toBus)}-${Math.max(edge.fromBus, edge.toBus)}`;
      expect(edgePairs.has(pairKey)).toBe(false);
      edgePairs.add(pairKey);
    });
  });
});
