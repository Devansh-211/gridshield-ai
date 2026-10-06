/**
 * GridShield AI — IEEE 14-Bus Single-Line Layout Definition.
 *
 * Grounded in IEEE 14-bus transmission system topology:
 * - Generators & Synchronous Condensers on primary buses (Bus 1 Slack, Bus 2 PV, Bus 3/6/8 SC)
 * - Transmission loop 1-2-3-4-5 (132 kV)
 * - Interconnection Transformers (4-7, 4-9, 5-6)
 * - Distribution network 6-14 (33 kV)
 * - Strictly orthogonal line routing (horizontal and vertical segments only)
 */

export interface BusLayoutNode {
  id: number;
  name: string;
  tag: string;
  x: number;
  y: number;
  length: number;
  orientation: 'horizontal' | 'vertical';
  kv: number;
  type: 'SLACK' | 'PV' | 'SC' | 'PQ';
  hasGen?: boolean;
  hasCondenser?: boolean;
  hasLoad?: boolean;
  hasShunt?: boolean;
}

export interface LineLayoutEdge {
  id: number;
  fromBus: number;
  toBus: number;
  tag: string;
  isTransformer?: boolean;
  // Orthogonal intermediate waypoint coords [x, y][]
  waypoints: Array<[number, number]>;
}

export const IEEE14_BUS_LAYOUT: Record<number, BusLayoutNode> = {
  1: { id: 1, name: 'Bus 1', tag: 'B01', x: 80, y: 120, length: 70, orientation: 'horizontal', kv: 132, type: 'SLACK', hasGen: true },
  2: { id: 2, name: 'Bus 2', tag: 'B02', x: 280, y: 120, length: 80, orientation: 'horizontal', kv: 132, type: 'PV', hasGen: true, hasLoad: true },
  3: { id: 3, name: 'Bus 3', tag: 'B03', x: 80, y: 320, length: 70, orientation: 'horizontal', kv: 132, type: 'SC', hasCondenser: true, hasLoad: true },
  4: { id: 4, name: 'Bus 4', tag: 'B04', x: 280, y: 240, length: 90, orientation: 'horizontal', kv: 132, type: 'PQ', hasLoad: true },
  5: { id: 5, name: 'Bus 5', tag: 'B05', x: 180, y: 240, length: 60, orientation: 'horizontal', kv: 132, type: 'PQ', hasLoad: true },
  6: { id: 6, name: 'Bus 6', tag: 'B06', x: 460, y: 120, length: 70, orientation: 'horizontal', kv: 33, type: 'SC', hasCondenser: true, hasLoad: true },
  7: { id: 7, name: 'Bus 7', tag: 'B07', x: 460, y: 240, length: 60, orientation: 'horizontal', kv: 33, type: 'PQ' },
  8: { id: 8, name: 'Bus 8', tag: 'B08', x: 620, y: 240, length: 60, orientation: 'horizontal', kv: 33, type: 'SC', hasCondenser: true },
  9: { id: 9, name: 'Bus 9', tag: 'B09', x: 460, y: 360, length: 70, orientation: 'horizontal', kv: 33, type: 'PQ', hasLoad: true, hasShunt: true },
  10: { id: 10, name: 'Bus 10', tag: 'B10', x: 620, y: 360, length: 60, orientation: 'horizontal', kv: 33, type: 'PQ', hasLoad: true },
  11: { id: 11, name: 'Bus 11', tag: 'B11', x: 620, y: 120, length: 60, orientation: 'horizontal', kv: 33, type: 'PQ', hasLoad: true },
  12: { id: 12, name: 'Bus 12', tag: 'B12', x: 740, y: 120, length: 60, orientation: 'horizontal', kv: 33, type: 'PQ', hasLoad: true },
  13: { id: 13, name: 'Bus 13', tag: 'B13', x: 740, y: 240, length: 60, orientation: 'horizontal', kv: 33, type: 'PQ', hasLoad: true },
  14: { id: 14, name: 'Bus 14', tag: 'B14', x: 740, y: 360, length: 60, orientation: 'horizontal', kv: 33, type: 'PQ', hasLoad: true },
};

export const IEEE14_LINE_LAYOUT: LineLayoutEdge[] = [
  // 1-2
  { id: 0, fromBus: 1, toBus: 2, tag: 'L01-02', waypoints: [[150, 120], [280, 120]] },
  // 1-5
  { id: 1, fromBus: 1, toBus: 5, tag: 'L01-05', waypoints: [[115, 120], [115, 240], [180, 240]] },
  // 2-3
  { id: 2, fromBus: 2, toBus: 3, tag: 'L02-03', waypoints: [[300, 120], [300, 180], [150, 180], [150, 320]] },
  // 2-4
  { id: 3, fromBus: 2, toBus: 4, tag: 'L02-04', waypoints: [[340, 120], [340, 240]] },
  // 2-5
  { id: 4, fromBus: 2, toBus: 5, tag: 'L02-05', waypoints: [[280, 120], [220, 120], [220, 240]] },
  // 3-4
  { id: 5, fromBus: 3, toBus: 4, tag: 'L03-04', waypoints: [[150, 320], [280, 320], [280, 240]] },
  // 4-5
  { id: 6, fromBus: 4, toBus: 5, tag: 'L04-05', waypoints: [[280, 240], [240, 240]] },
  // 4-7 (Trafo)
  { id: 7, fromBus: 4, toBus: 7, tag: 'T04-07', isTransformer: true, waypoints: [[370, 240], [460, 240]] },
  // 4-9 (Trafo)
  { id: 8, fromBus: 4, toBus: 9, tag: 'T04-09', isTransformer: true, waypoints: [[340, 240], [340, 360], [460, 360]] },
  // 5-6 (Trafo)
  { id: 9, fromBus: 5, toBus: 6, tag: 'T05-06', isTransformer: true, waypoints: [[210, 240], [210, 80], [490, 80], [490, 120]] },
  // 6-11
  { id: 10, fromBus: 6, toBus: 11, tag: 'L06-11', waypoints: [[530, 120], [620, 120]] },
  // 6-12
  { id: 11, fromBus: 6, toBus: 12, tag: 'L06-12', waypoints: [[490, 120], [490, 60], [770, 60], [770, 120]] },
  // 6-13
  { id: 12, fromBus: 6, toBus: 13, tag: 'L06-13', waypoints: [[510, 120], [510, 180], [740, 180], [740, 240]] },
  // 7-8
  { id: 13, fromBus: 7, toBus: 8, tag: 'L07-08', waypoints: [[520, 240], [620, 240]] },
  // 7-9
  { id: 14, fromBus: 7, toBus: 9, tag: 'L07-09', waypoints: [[490, 240], [490, 360]] },
  // 9-10
  { id: 15, fromBus: 9, toBus: 10, tag: 'L09-10', waypoints: [[530, 360], [620, 360]] },
  // 9-14
  { id: 16, fromBus: 9, toBus: 14, tag: 'L09-14', waypoints: [[490, 360], [490, 420], [770, 420], [770, 360]] },
  // 10-11
  { id: 17, fromBus: 10, toBus: 11, tag: 'L10-11', waypoints: [[650, 360], [650, 120]] },
  // 12-13
  { id: 18, fromBus: 12, toBus: 13, tag: 'L12-13', waypoints: [[770, 120], [770, 240]] },
  // 13-14
  { id: 19, fromBus: 13, toBus: 14, tag: 'L13-14', waypoints: [[770, 240], [770, 360]] },
];
