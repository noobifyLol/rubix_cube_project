import {
  compressMovesToHTM,
  invertMoves,
  type CubeMove,
  type CubeState,
} from '../logic/cubeLogic';
import {
  applyMoveToCubieState,
  applyMovesToCubieState,
  createSolvedCubieState,
  cubeStateToFaceletString,
  faceletsToCubieState,
  isPhase1Solved,
  isPhase2Solved,
  isPhase3Solved,
  isSolvedCubieState,
  permutationParity,
  getSliceIndex,
  type CubieState,
} from '../logic/cubieState';
import pruningData from '../data/pruning-tables.json';

const EDGE_ORI_PRUNING_TABLE = new Int8Array(pruningData.flip);
const CORNER_ORI_PRUNING_TABLE = new Int8Array(pruningData.twist);
const SLICE_PRUNING_TABLE = new Int8Array(pruningData.slice);

console.log('EO Solved Distance:', EDGE_ORI_PRUNING_TABLE[0]);
console.log('CO Solved Distance:', CORNER_ORI_PRUNING_TABLE[0]);
console.log('Slice Solved Distance:', SLICE_PRUNING_TABLE[0]);

const _diagnosticSolved = {
  cp: [0, 1, 2, 3, 4, 5, 6, 7],
  co: [0, 0, 0, 0, 0, 0, 0, 0],
  ep: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  eo: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
};
console.log('--- SOLVER IDENTITY CHECK ---');
try {
  console.log('EO Index (Target: 0):', getEdgeOrientationIndex(_diagnosticSolved.eo));
  console.log('CO Index (Target: 0):', getCornerOrientationIndex(_diagnosticSolved.co));
  console.log('Slice Index (Target: 0):', getSliceIndex(_diagnosticSolved.ep));
} catch (e) {
  console.error('Diagnostic failed:', e);
}

export type SolutionMove = CubeMove;

export interface SolverResult {
  faceletString: string;
  phaseMoves: SolutionMove[][];
  moves: SolutionMove[];
  strategy: 'thistlethwaite' | 'history-fallback';
}

export interface SolverOptions {
  timeLimitMs?: number;
  phaseDepthLimits?: [number, number, number, number];
  history?: readonly CubeMove[];
  shouldCancel?: () => boolean;
}

interface PhaseDefinition {
  name: string;
  allowedMoves: SolutionMove[];
  maxDepth: number;
  isGoal: (cubie: CubieState) => boolean;
  heuristic: (cubie: CubieState) => number;
  createStateKey: (cubie: CubieState) => string | number;
}

const PHASE_1_MOVES: SolutionMove[] = [
  'U', "U'", 'U2', 'D', "D'", 'D2',
  'L', "L'", 'L2', 'R', "R'", 'R2',
  'F', "F'", 'F2', 'B', "B'", 'B2',
];

const PHASE_2_MOVES: SolutionMove[] = [
  'U', "U'", 'U2', 'D', "D'", 'D2',
  'L', "L'", 'L2', 'R', "R'", 'R2',
  'F2', 'B2',
];

const PHASE_3_MOVES: SolutionMove[] = [
  'U', "U'", 'U2', 'D', "D'", 'D2',
  'L2', 'R2', 'F2', 'B2',
];

const PHASE_4_MOVES: SolutionMove[] = ['U2', 'D2', 'L2', 'R2', 'F2', 'B2'];

// ─── Lehmer rank for a permutation of exactly 4 elements (0-based) ───────────
function lehmerRank4(perm: number[]): number {
  let rank = 0;
  const factors = [6, 2, 1];
  for (let i = 0; i < 3; i++) {
    let smaller = 0;
    for (let j = i + 1; j < 4; j++) {
      if (perm[j] < perm[i]) smaller++;
    }
    rank += smaller * factors[i];
  }
  return rank;
}

// ─── Phase 3 pruning table ────────────────────────────────────────────────────
const _P3_TETRAD_A = new Set([0, 2, 5, 7]);
const _P3_ORBIT_A  = new Set([0, 2, 4, 6]);

const _MASK4_TO_IDX = new Int8Array(256).fill(-1);
(() => {
  let idx = 0;
  for (let mask = 0; mask < 256; mask++) {
    let count = 0;
    let m = mask;
    while (m) { count += m & 1; m >>= 1; }
    if (count === 4) _MASK4_TO_IDX[mask] = idx++;
  }
})();

function _p3Index(cp: number[], ep: number[]): number {
  let cMask = 0;
  let eMask = 0;
  for (let i = 0; i < 8; i++) {
    if (_P3_TETRAD_A.has(cp[i])) cMask |= (1 << i);
    if (_P3_ORBIT_A.has(ep[i]))  eMask |= (1 << i);
  }
  const ci = _MASK4_TO_IDX[cMask];
  const ei = _MASK4_TO_IDX[eMask];
  if (ci < 0 || ei < 0) return -1;
  const cpP = permutationParity(cp);
  const epP = permutationParity(ep);
  return (ci * 70 + ei) * 4 + cpP * 2 + epP;
}

// ─── Lehmer rank for 8 elements ───────────────────────────────────────────────
function lehmerRank8(perm: number[]): number {
  let rank = 0;
  const factors = [5040, 720, 120, 24, 6, 2, 1, 0];
  for (let i = 0; i < 7; i++) {
    let smaller = 0;
    for (let j = i + 1; j < 8; j++) {
      if (perm[j] < perm[i]) smaller++;
    }
    rank += smaller * factors[i];
  }
  return rank;
}

// ─── Replaced Phase 3 pruning table ───────────────────────────────────────────
// We track the exact corner permutation rank to prevent coset aliasing.
function _p3EdgeIndex(ep: number[]): number {
  let eMask = 0;
  for (let i = 0; i < 8; i++) {
    if (_P3_ORBIT_A.has(ep[i])) eMask |= (1 << i);
  }
  const ei = _MASK4_TO_IDX[eMask];
  if (ei < 0) return -1;
  return ei * 2 + permutationParity(ep);
}

const PHASE3_PRUNING = (() => {
  const TOTAL_C = 40320; // 8! corner permutations
  const TOTAL_E = 140;   // 70 edge masks * 2 parities
  const table = new Int8Array(TOTAL_C * TOTAL_E).fill(-1);
  const _s = createSolvedCubieState();
  
  const solvedC = lehmerRank8(_s.cp);
  const solvedE = _p3EdgeIndex(_s.ep);
  if (solvedE < 0) return table;

  table[solvedC * TOTAL_E + solvedE] = 0;

  const P3_BFS_MOVES: CubeMove[] = ['U', "U'", 'U2', 'D', "D'", 'D2', 'L2', 'R2', 'F2', 'B2'];
  const cMove = new Int32Array(TOTAL_C * 10).fill(-1);
  const eMove = new Int32Array(TOTAL_E * 10).fill(-1);

  // 1. Discover all reachable corner states to build transition table
  const cQueue: number[][] = [_s.cp.slice()];
  const cSeen = new Uint8Array(TOTAL_C);
  cSeen[solvedC] = 1;
  for (let qi = 0; qi < cQueue.length; qi++) {
    const cp = cQueue[qi];
    const ci = lehmerRank8(cp);
    for (let m = 0; m < 10; m++) {
      const next = applyMoveToCubieState({ cp, co: _s.co, ep: _s.ep, eo: _s.eo }, P3_BFS_MOVES[m]);
      const nci = lehmerRank8(next.cp);
      cMove[ci * 10 + m] = nci;
      if (!cSeen[nci]) {
        cSeen[nci] = 1;
        cQueue.push(next.cp.slice());
      }
    }
  }

  // 2. Discover all reachable edge states to build transition table
  const eQueue: number[][] = [_s.ep.slice()];
  const eSeen = new Uint8Array(TOTAL_E);
  eSeen[solvedE] = 1;
  for (let qi = 0; qi < eQueue.length; qi++) {
    const ep = eQueue[qi];
    const ei = _p3EdgeIndex(ep);
    for (let m = 0; m < 10; m++) {
      const next = applyMoveToCubieState({ cp: _s.cp, co: _s.co, ep, eo: _s.eo }, P3_BFS_MOVES[m]);
      const nei = _p3EdgeIndex(next.ep);
      if (nei >= 0) {
        eMove[ei * 10 + m] = nei;
        if (!eSeen[nei]) {
          eSeen[nei] = 1;
          eQueue.push(next.ep.slice());
        }
      }
    }
  }

  // 3. Fast Combined BFS
  const MAX_STATES = 2000000;
  const qci = new Int32Array(MAX_STATES);
  const qei = new Uint8Array(MAX_STATES);
  let head = 0, tail = 0;
  
  qci[tail] = solvedC;
  qei[tail] = solvedE;
  tail++;

  while (head < tail) {
    const ci = qci[head];
    const ei = qei[head];
    head++;
    const dist = table[ci * TOTAL_E + ei];

    for (let m = 0; m < 10; m++) {
      const nci = cMove[ci * 10 + m];
      const nei = eMove[ei * 10 + m];
      if (nci >= 0 && nei >= 0) {
        const nIdx = nci * TOTAL_E + nei;
        if (table[nIdx] === -1) {
          table[nIdx] = dist + 1;
          qci[tail] = nci;
          qei[tail] = nei;
          tail++;
        }
      }
    }
  }

  console.log(`[P3 TABLE] Built. States=${tail}`);
  return table;
})();

// ─── Phase 4: combined exact distance table ───────────────────────────────────
//
// WHY the previous approach failed:
//   max(cornerDist, edgeDist) dramatically underestimates the true distance
//   because Phase 4 moves affect corners AND edges simultaneously. You cannot
//   solve them independently — each move does both at once. A state needing
//   15 moves might have cornerDist=3 and edgeDist=3, so the heuristic returns 3.
//   IDA* then searches all depths 3,4,5,...,18 exhaustively before failing.
//
// The fix: one combined BFS table indexed by (cornerIdx, edgeIdx).
//   With 663,552 reachable states in G3, this gives EXACT distances.
//   An exact heuristic means IDA* finds the solution in O(depth) time — instant.
//
// Table dimensions:
//   cornerIdx: 24*24 = 576  (Lehmer rank per tetrad)
//   edgeIdx:   24*24*24 = 13,824  (Lehmer rank per orbit)
//   combined:  576 * 13,824 = 7,962,624  (~8MB Int8Array)
//   Only 663,552 entries are reachable; the rest stay -1.

const _TETRAD_A_POS = [0, 2, 5, 7];
const _TETRAD_B_POS = [1, 3, 4, 6];
const _ORBIT_A_POS  = [0, 2, 4, 6];
const _ORBIT_B_POS  = [1, 3, 5, 7];
const _ORBIT_C_POS  = [8, 9, 10, 11];

const _aCornerMap = new Map([[0, 0], [2, 1], [5, 2], [7, 3]]);
const _bCornerMap = new Map([[1, 0], [3, 1], [4, 2], [6, 3]]);
const _aEdgeMap   = new Map([[0, 0], [2, 1], [4, 2], [6, 3]]);
const _bEdgeMap   = new Map([[1, 0], [3, 1], [5, 2], [7, 3]]);
const _cEdgeMap   = new Map([[8, 0], [9, 1], [10, 2], [11, 3]]);

function _p4CornerIndex(cp: number[]): number {
  const aPerm = _TETRAD_A_POS.map(pos => _aCornerMap.get(cp[pos])!);
  const bPerm = _TETRAD_B_POS.map(pos => _bCornerMap.get(cp[pos])!);
  if (aPerm.some(v => v === undefined) || bPerm.some(v => v === undefined)) return -1;
  return lehmerRank4(aPerm) * 24 + lehmerRank4(bPerm);
}

function _p4EdgeIndex(ep: number[]): number {
  const aPerm = _ORBIT_A_POS.map(pos => _aEdgeMap.get(ep[pos])!);
  const bPerm = _ORBIT_B_POS.map(pos => _bEdgeMap.get(ep[pos])!);
  const cPerm = _ORBIT_C_POS.map(pos => _cEdgeMap.get(ep[pos])!);
  if (
    aPerm.some(v => v === undefined) ||
    bPerm.some(v => v === undefined) ||
    cPerm.some(v => v === undefined)
  ) return -1;
  return lehmerRank4(aPerm) * 576 + lehmerRank4(bPerm) * 24 + lehmerRank4(cPerm);
}

// Precompute move tables so the combined BFS only does array lookups (no applyMove calls).
// cornerMove[ci * 6 + m] = new cornerIdx after Phase4 move m from cornerIdx ci
const _P4_CORNER_MOVE = new Int16Array(576 * 6).fill(-1);
// edgeMove[ei * 6 + m] = new edgeIdx after Phase4 move m from edgeIdx ei
const _P4_EDGE_MOVE = new Int32Array(13824 * 6).fill(-1);

const _P4_MOVE_LIST: CubeMove[] = ['U2', 'D2', 'L2', 'R2', 'F2', 'B2'];

(() => {
  const _s = createSolvedCubieState();

  // Corner move table: BFS over corner states reachable by Phase 4 moves
  const cSeen = new Uint8Array(576);
  const cQueue: number[][] = [_s.cp.slice()];
  cSeen[_p4CornerIndex(_s.cp)] = 1;
  for (let qi = 0; qi < cQueue.length; qi++) {
    const cp = cQueue[qi];
    const ci = _p4CornerIndex(cp);
    for (let m = 0; m < 6; m++) {
      const next = applyMoveToCubieState({ cp, co: _s.co, ep: _s.ep, eo: _s.eo }, _P4_MOVE_LIST[m]);
      const nci = _p4CornerIndex(next.cp);
      if (nci >= 0) {
        _P4_CORNER_MOVE[ci * 6 + m] = nci;
        if (!cSeen[nci]) { cSeen[nci] = 1; cQueue.push(next.cp.slice()); }
      }
    }
  }
  console.log('[P4 MOVE] Corner states enumerated:', cQueue.length);

  // Edge move table: BFS over edge states reachable by Phase 4 moves
  const eSeen = new Uint8Array(13824);
  const eQueue: number[][] = [_s.ep.slice()];
  eSeen[_p4EdgeIndex(_s.ep)] = 1;
  for (let qi = 0; qi < eQueue.length; qi++) {
    const ep = eQueue[qi];
    const ei = _p4EdgeIndex(ep);
    for (let m = 0; m < 6; m++) {
      const next = applyMoveToCubieState({ cp: _s.cp, co: _s.co, ep, eo: _s.eo }, _P4_MOVE_LIST[m]);
      const nei = _p4EdgeIndex(next.ep);
      if (nei >= 0) {
        _P4_EDGE_MOVE[ei * 6 + m] = nei;
        if (!eSeen[nei]) { eSeen[nei] = 1; eQueue.push(next.ep.slice()); }
      }
    }
  }
  console.log('[P4 MOVE] Edge states enumerated:', eQueue.length);
})();

// Combined BFS: uses only index arithmetic — no applyMove, no Map lookups, pure speed.
const PHASE4_COMBINED = (() => {
  const EDGE_STATES = 13824;
  const table = new Int8Array(576 * EDGE_STATES).fill(-1);

  const _s = createSolvedCubieState();
  const ci0 = _p4CornerIndex(_s.cp);
  const ei0 = _p4EdgeIndex(_s.ep);
  if (ci0 < 0 || ei0 < 0) {
    console.error('[P4 COMBINED] Cannot index solved state!');
    return table;
  }

  table[ci0 * EDGE_STATES + ei0] = 0;

  // Typed-array queue avoids GC pressure for 663,552 states
  const MAX_STATES = 700000;
  const qci = new Int16Array(MAX_STATES);
  const qei = new Int32Array(MAX_STATES);
  let head = 0, tail = 0;
  qci[tail] = ci0; qei[tail] = ei0; tail++;

  while (head < tail) {
    const ci = qci[head];
    const ei = qei[head];
    head++;
    const dist = table[ci * EDGE_STATES + ei];

    for (let m = 0; m < 6; m++) {
      const nci = _P4_CORNER_MOVE[ci * 6 + m];
      const nei = _P4_EDGE_MOVE[ei * 6 + m];
      if (nci >= 0 && nei >= 0) {
        const nIdx = nci * EDGE_STATES + nei;
        if (table[nIdx] === -1) {
          table[nIdx] = dist + 1;
          qci[tail] = nci; qei[tail] = nei; tail++;
        }
      }
    }
  }

  console.log(`[P4 COMBINED] Built. States=${tail}, solved=${table[ci0 * EDGE_STATES + ei0]}`);
  return table;
})();

// ─── Move utilities ───────────────────────────────────────────────────────────

function getMoveFace(move: SolutionMove): string {
  return move[0];
}

function isOppositeFace(face1: string, face2: string): boolean {
  return (
    (face1 === 'U' && face2 === 'D') || (face1 === 'D' && face2 === 'U') ||
    (face1 === 'L' && face2 === 'R') || (face1 === 'R' && face2 === 'L') ||
    (face1 === 'F' && face2 === 'B') || (face1 === 'B' && face2 === 'F')
  );
}

function createCubieKey(cubie: CubieState): string {
  return `${cubie.cp.join('')}:${cubie.co.join('')}:${cubie.ep.join(',')}:${cubie.eo.join('')}`;
}

function createPhase1Key(cubie: CubieState): number {
  return getEdgeOrientationIndex(cubie.eo);
}

function createPhase2Key(cubie: CubieState): string {
  return `${getCornerOrientationIndex(cubie.co)}:${getSliceIndex(cubie.ep)}`;
}

function createPhase3Key(cubie: CubieState): string {
  return `${cubie.cp.join('')}:${cubie.ep.join('')}`;
}

function createPhase4Key(cubie: CubieState): string {
  return createCubieKey(cubie);
}

function getEdgeOrientationIndex(eo: number[]): number {
  let index = 0;
  for (let i = 0; i < 11; i++) index = (index << 1) | (eo[i] & 1);
  return index;
}

function getCornerOrientationIndex(co: number[]): number {
  let index = 0;
  for (let i = 0; i < 7; i++) index = index * 3 + co[i];
  return index;
}

function createHistoryFallback(history?: readonly CubeMove[]): SolutionMove[] | null {
  if (!history || history.length === 0) return null;
  return compressMovesToHTM(invertMoves(history));
}

// ─── Heuristics ───────────────────────────────────────────────────────────────

function phase1Heuristic(cubie: CubieState): number {
  const d = EDGE_ORI_PRUNING_TABLE[getEdgeOrientationIndex(cubie.eo)];
  return typeof d === 'number' && d >= 0 ? d : 10;
}

function phase2Heuristic(cubie: CubieState): number {
  const coDist = CORNER_ORI_PRUNING_TABLE[getCornerOrientationIndex(cubie.co)];
  const sliceDist = SLICE_PRUNING_TABLE[getSliceIndex(cubie.ep)];
  const safeCO = typeof coDist === 'number' && coDist >= 0 ? coDist : 10;
  const safeSlice = typeof sliceDist === 'number' && sliceDist >= 0 ? sliceDist : 10;
  return Math.max(safeCO, safeSlice);
}

function phase3Heuristic(cubie: CubieState): number {
  const cRank = lehmerRank8(cubie.cp);
  const eIdx = _p3EdgeIndex(cubie.ep);
  if (eIdx < 0) return 10;
  const dist = PHASE3_PRUNING[cRank * 140 + eIdx];
  return dist < 0 ? 10 : dist;
}

function phase4Heuristic(cubie: CubieState): number {
  const ci = _p4CornerIndex(cubie.cp);
  const ei = _p4EdgeIndex(cubie.ep);
  if (ci < 0 || ei < 0) return 10;
  const dist = PHASE4_COMBINED[ci * 13824 + ei];
  return dist < 0 ? 10 : dist;
}

// ─── Phase plan ───────────────────────────────────────────────────────────────

function buildPhasePlan(phaseDepthLimits: [number, number, number, number]): PhaseDefinition[] {
  return [
    {
      name: 'Edge Orientation',
      allowedMoves: PHASE_1_MOVES,
      maxDepth: phaseDepthLimits[0],
      isGoal: isPhase1Solved,
      heuristic: phase1Heuristic,
      createStateKey: createPhase1Key,
    },
    {
      name: 'Corner Orientation + Slice',
      allowedMoves: PHASE_2_MOVES,
      maxDepth: phaseDepthLimits[1],
      isGoal: isPhase2Solved,
      heuristic: phase2Heuristic,
      createStateKey: createPhase2Key,
    },
    {
      name: 'Tetrads + Parity',
      allowedMoves: PHASE_3_MOVES,
      maxDepth: phaseDepthLimits[2],
      isGoal: (cubie) => phase3Heuristic(cubie) === 0, // Bypass external checks
      heuristic: phase3Heuristic,
      createStateKey: createPhase3Key,
    },
    {
      name: 'Half-Turn Finish',
      allowedMoves: PHASE_4_MOVES,
      maxDepth: phaseDepthLimits[3],
      isGoal: isSolvedCubieState,
      heuristic: phase4Heuristic,
      createStateKey: createPhase4Key,
    },
  ];
}

// ─── Solver class ─────────────────────────────────────────────────────────────

export class ThistlethwaiteSolver {
  solve(cube: CubeState, options: SolverOptions = {}): SolverResult | null {
    const faceletString = cubeStateToFaceletString(cube);
    const initialCubie = faceletsToCubieState(faceletString);
    const fallbackMoves = createHistoryFallback(options.history);

    const cpParity = permutationParity(initialCubie.cp);
    const epParity = permutationParity(initialCubie.ep);
    const isAlreadySolved = isSolvedCubieState(initialCubie);
    const eoSum = initialCubie.eo.reduce((sum, o) => sum + o, 0);
    const eoParityValid = eoSum % 2 === 0;

    console.log('[SOLVER STATE VALIDATION]', {
      isAlreadySolved, cpParity, epParity,
      paritiesMatch: cpParity === epParity,
      eoSum, eoParityValid,
      cp: initialCubie.cp, co: initialCubie.co, ep: initialCubie.ep,
    });

    if (cpParity !== epParity) {
      console.warn(`[SOLVER_ERROR_02] Parity mismatch. cp=${cpParity}, ep=${epParity}`);
    }

    if (!eoParityValid) {
      console.error(`[SOLVER_ERROR_01] Edge Orientation Parity Mismatch (Sum: ${eoSum}).`);
      return null;
    }

    if (isAlreadySolved) {
      return { faceletString, phaseMoves: [[], [], [], []], moves: [], strategy: 'thistlethwaite' };
    }

    const deadline = performance.now() + (options.timeLimitMs ?? 5000);
    // Phase 4 theoretical max is 15 moves. With exact heuristic, depth 15 always suffices.
    // Phase 3 theoretical max is ~13 moves. Give buffer.
    const phaseDepthLimits = options.phaseDepthLimits ?? [14, 12, 20, 15];
    const phases = buildPhasePlan(phaseDepthLimits);
    const phaseMoves: SolutionMove[][] = [];
    let currentCubie = initialCubie;

    for (const phase of phases) {
      let moves = this.solvePhase(currentCubie, phase, deadline, options.shouldCancel);

      // Retry with depth boost for phases 1–3 only.
      // Phase 4 has an exact heuristic — if it fails at depth 15, something is wrong upstream.
      if (moves === null && !phase.name.includes('Half-Turn')) {
        console.log(`[SOLVER] Retrying ${phase.name} with depth boost (+3)...`);
        const boostedPhase = { ...phase, maxDepth: phase.maxDepth + 3 };
        moves = this.solvePhase(currentCubie, boostedPhase, deadline, options.shouldCancel);
      }

      if (moves === null) {
        console.warn(`[SOLVER_ERROR_03] Search Depth Exhausted in Phase: ${phase.name}.`);
        const elapsedTime = performance.now() - (deadline - (options.timeLimitMs ?? 5000));
        console.log(
          `[DEBUG_DUMP] Phase: ${phase.name}, Elapsed: ${elapsedTime.toFixed(1)}ms. ` +
          `CP: [${currentCubie.cp.join(',')}] EP: [${currentCubie.ep.join(',')}] ` +
          `CO: [${currentCubie.co.join(',')}] EO: [${currentCubie.eo.join(',')}]`,
        );
        if (!fallbackMoves) return null;
        return { faceletString, phaseMoves, moves: fallbackMoves, strategy: 'history-fallback' };
      }

      phaseMoves.push(moves);
      currentCubie = applyMovesToCubieState(currentCubie, moves);
    }

    const optimizedMoves = compressMovesToHTM(phaseMoves.flat());
    return { faceletString, phaseMoves, moves: optimizedMoves, strategy: 'thistlethwaite' };
  }

  private solvePhase(
    initialCubie: CubieState,
    phase: PhaseDefinition,
    deadline: number,
    shouldCancel?: () => boolean,
  ): SolutionMove[] | null {
    if (phase.isGoal(initialCubie) && phase.heuristic(initialCubie) === 0) return [];

    const initialBound = phase.heuristic(initialCubie);
    const path = Array<SolutionMove>(Math.max(phase.maxDepth, 1)).fill(phase.allowedMoves[0]);

    for (let bound = initialBound; bound <= phase.maxDepth; bound++) {
      const visited = new Map<string | number, number>();
      const result = this.searchPhase(
        initialCubie, phase, 0, bound, path, '', deadline, visited, shouldCancel,
      );
      if (Array.isArray(result)) return result;
      if (result === null) return null;
    }

    return null;
  }

  private searchPhase(
    cubie: CubieState,
    phase: PhaseDefinition,
    depth: number,
    bound: number,
    path: SolutionMove[],
    lastFace: string,
    deadline: number,
    visited: Map<string | number, number>,
    shouldCancel?: () => boolean,
  ): SolutionMove[] | number | null {
    if (performance.now() > deadline || shouldCancel?.()) return null;

    const heuristic = phase.heuristic(cubie);
    if (!Number.isFinite(heuristic) || heuristic < 0) return Number.POSITIVE_INFINITY;

    const estimate = depth + heuristic;
    if (phase.isGoal(cubie) && heuristic === 0) return path.slice(0, depth);
    if (estimate > bound) return estimate;

    const stateKey = phase.createStateKey(cubie);
    const bestDepth = visited.get(stateKey);
    if (bestDepth !== undefined && bestDepth <= depth) return Number.POSITIVE_INFINITY;
    visited.set(stateKey, depth);

    let nextBound = Number.POSITIVE_INFINITY;

    for (const move of phase.allowedMoves) {
      const moveFace = getMoveFace(move);
      if (moveFace === lastFace) continue;
      if (isOppositeFace(lastFace, moveFace) && lastFace > moveFace) continue;
      if (depth >= 2) {
        const secondLastFace = getMoveFace(path[depth - 2]);
        if (moveFace === secondLastFace && isOppositeFace(moveFace, lastFace)) continue;
      }

      path[depth] = move;
      const nextCubie = applyMoveToCubieState(cubie, move);
      const result = this.searchPhase(
        nextCubie, phase, depth + 1, bound, path, moveFace, deadline, visited, shouldCancel,
      );

      if (Array.isArray(result)) return result;
      if (result === null) return null;
      nextBound = Math.min(nextBound, result);
    }

    return nextBound;
  }
}

export { ThistlethwaiteSolver as Solver };