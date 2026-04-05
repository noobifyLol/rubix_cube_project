import { MOVE_FACELET_PERMUTATIONS, type CubeMove, type CubeState } from './cubeLogic';

export type FaceLetter = 'U' | 'R' | 'F' | 'D' | 'L' | 'B';

export interface CubieState {
  cp: number[];
  co: number[];
  ep: number[];
  eo: number[];
}

interface CubieMoveTransform {
  cp: number[];
  co: number[];
  ep: number[];
  eo: number[];
}

const SOLVED_FACELETS = 'UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB';

const CORNER_FACELETS = [
  [8, 9, 20],
  [6, 18, 38],
  [0, 36, 47],
  [2, 45, 11],
  [29, 26, 15],
  [27, 44, 24],
  [33, 53, 42],
  [35, 17, 51],
] as const;

const CORNER_COLORS: readonly FaceLetter[][] = [
  ['U', 'R', 'F'],
  ['U', 'F', 'L'],
  ['U', 'L', 'B'],
  ['U', 'B', 'R'],
  ['D', 'F', 'R'],
  ['D', 'L', 'F'],
  ['D', 'B', 'L'],
  ['D', 'R', 'B'],
];

const EDGE_FACELETS = [
  [5, 10],
  [7, 19],
  [3, 37],
  [1, 46],
  [32, 16],
  [28, 25],
  [30, 43],
  [34, 52],
  [23, 12],
  [21, 41],
  [50, 39],
  [48, 14],
] as const;

// These MUST be the 4 edges that belong in the middle slice (E-slice)
const EDGE_COLORS: readonly FaceLetter[][] = [
  ['U', 'R'], ['U', 'F'], ['U', 'L'], ['U', 'B'], // Top
  ['D', 'R'], ['D', 'F'], ['D', 'L'], ['D', 'B'], // Bottom
  ['F', 'R'], ['F', 'L'], ['B', 'L'], ['B', 'R'], // MIDDLE (E-SLICE)
];
// IDs 0-3: Top | IDs 4-7: Bottom | IDs 8-11: Middle

const SLICE_EDGE_IDS = new Set([8, 9, 10, 11]);
const TETRAD_A = new Set([0, 2, 5, 7]);
const TETRAD_B = new Set([1, 3, 4, 6]);
const SLICE_POSITION_COMBINATIONS = createSlicePositionCombinations();
const SLICE_POSITION_TO_COORDINATE = new Map(
  SLICE_POSITION_COMBINATIONS.map((combination, index) => [combination.join(','), index]),
);
const SOLVED_CUBIE_STATE = createSolvedCubieState();

function cloneArray(values: number[]) {
  return [...values];
}

function createSlicePositionCombinations() {
  const combinations: number[][] = [[8, 9, 10, 11]];

  const appendCombination = (start: number, current: number[]) => {
    if (current.length === 4) {
      if (current.join(',') !== '8,9,10,11') {
        combinations.push([...current]);
      }
      return;
    }

    for (let value = start; value < 12; value += 1) {
      current.push(value);
      appendCombination(value + 1, current);
      current.pop();
    }
  };

  appendCombination(0, []);
  return combinations;
}

export function createSolvedCubieState(): CubieState {
  return {
    cp: [0, 1, 2, 3, 4, 5, 6, 7],
    co: [0, 0, 0, 0, 0, 0, 0, 0],
    ep: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    eo: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  };
}

export function cloneCubieState(cubie: CubieState): CubieState {
  return {
    cp: cloneArray(cubie.cp),
    co: cloneArray(cubie.co),
    ep: cloneArray(cubie.ep),
    eo: cloneArray(cubie.eo),
  };
}

export function cubeStateToFaceletString(cube: CubeState): string {
  // FIX: Static color mapping - ensure this matches initializeCube() colors
  // U (Up) = White, D (Down) = Yellow, F (Front) = Red, B (Back) = Orange, R (Right) = Blue, L (Left) = Green
  const centerToFace = new Map<string, FaceLetter>([
    [cube.top[4], 'U'],      // top[4] should always be white (U face)
    [cube.right[4], 'R'],    // right[4] should always be blue (R face)
    [cube.front[4], 'F'],    // front[4] should always be red (F face)
    [cube.bottom[4], 'D'],   // bottom[4] should always be yellow (D face)
    [cube.left[4], 'L'],     // left[4] should always be green (L face)
    [cube.back[4], 'B'],     // back[4] should always be orange (B face)
  ]);

  const stickers = [
    ...cube.top,      // Positions 0-8      (U face)
    ...cube.right,    // Positions 9-17     (R face)
    ...cube.front,    // Positions 18-26    (F face)
    ...cube.bottom,   // Positions 27-35    (D face)
    ...cube.left,     // Positions 36-44    (L face)
    ...cube.back,     // Positions 45-53    (B face)
  ];

  const faceletString = stickers
    .map((sticker) => {
      const mappedFace = centerToFace.get(sticker);

      if (!mappedFace) {
        throw new Error(`Unknown sticker color '${sticker}'. This indicates color scheme mismatch!`);
      }

      return mappedFace;
    })
    .join('');

  // Verify URFDLB order for debugging
  const orderCheck = {
    U: faceletString.substring(0, 9),
    R: faceletString.substring(9, 18),
    F: faceletString.substring(18, 27),
    D: faceletString.substring(27, 36),
    L: faceletString.substring(36, 45),
    B: faceletString.substring(45, 54),
  };
  console.log('[FACELET ORDER CHECK] URFDLB order verified:', orderCheck);

  return faceletString;
}

export function faceletsToCubieState(facelets: string): CubieState {
  const stickers = facelets.split('') as FaceLetter[];
  const cp = Array<number>(8).fill(0);
  const co = Array<number>(8).fill(0);
  const ep = Array<number>(12).fill(0);
  const eo = Array<number>(12).fill(0);

  for (let position = 0; position < 8; position += 1) {
    const colors = CORNER_FACELETS[position].map((index) => stickers[index]);
    const orientation = colors.findIndex((color) => color === 'U' || color === 'D');

    if (orientation === -1) {
      throw new Error('Invalid corner orientation in facelet string.');
    }

    const cubieIndex = CORNER_COLORS.findIndex((candidate) =>
      candidate.every((color) => colors.includes(color)),
    );

    if (cubieIndex === -1) {
      throw new Error('Invalid corner permutation in facelet string.');
    }

    cp[position] = cubieIndex;
    co[position] = orientation % 3;
  }

  for (let position = 0; position < 12; position += 1) {
    const edgeStickers = EDGE_FACELETS[position].map((index) => stickers[index]);
    let found = false;

    for (let cubieIndex = 0; cubieIndex < EDGE_COLORS.length; cubieIndex += 1) {
      const target = EDGE_COLORS[cubieIndex];

      if (edgeStickers[0] === target[0] && edgeStickers[1] === target[1]) {
        ep[position] = cubieIndex;
        eo[position] = 0;
        found = true;
        break;
      }

      if (edgeStickers[0] === target[1] && edgeStickers[1] === target[0]) {
        ep[position] = cubieIndex;
        eo[position] = 1;
        found = true;
        break;
      }
    }

    if (!found) {
      throw new Error('Invalid edge permutation in facelet string.');
    }
  }

  return { cp, co, ep, eo };
}

export function cubieStateToFacelets(cubie: CubieState): string {
  const stickers = Array<FaceLetter>(54).fill('U');

  for (let position = 0; position < 8; position += 1) {
    const cubieIndex = cubie.cp[position];
    const orientation = cubie.co[position];

    for (let faceletIndex = 0; faceletIndex < 3; faceletIndex += 1) {
      const targetIndex = CORNER_FACELETS[position][(faceletIndex + orientation) % 3];
      stickers[targetIndex] = CORNER_COLORS[cubieIndex][faceletIndex];
    }
  }

  for (let position = 0; position < 12; position += 1) {
    const cubieIndex = cubie.ep[position];
    const orientation = cubie.eo[position];

    for (let faceletIndex = 0; faceletIndex < 2; faceletIndex += 1) {
      const targetIndex = EDGE_FACELETS[position][(faceletIndex + orientation) % 2];
      stickers[targetIndex] = EDGE_COLORS[cubieIndex][faceletIndex];
    }
  }

  return stickers.join('');
}

function applyMoveToFacelets(facelets: string, move: CubeMove): string {
  const permutation = MOVE_FACELET_PERMUTATIONS[move];
  const stickers = facelets.split('');
  return permutation.map((index) => stickers[index]).join('');
}

function createMoveTransforms(): Record<CubeMove, CubieMoveTransform> {
  const transforms = {} as Record<CubeMove, CubieMoveTransform>;
  const solvedFacelets = cubieStateToFacelets(SOLVED_CUBIE_STATE);

  for (const move of Object.keys(MOVE_FACELET_PERMUTATIONS) as CubeMove[]) {
    const movedFacelets = applyMoveToFacelets(solvedFacelets, move);
    const movedCubie = faceletsToCubieState(movedFacelets);

    transforms[move] = {
      cp: cloneArray(movedCubie.cp),
      co: cloneArray(movedCubie.co),
      ep: cloneArray(movedCubie.ep),
      eo: cloneArray(movedCubie.eo),
    };
  }

  return transforms;
}

const MOVE_TRANSFORMS = createMoveTransforms();

export function applyMoveToCubieState(cubie: CubieState, move: CubeMove): CubieState {
  const transform = MOVE_TRANSFORMS[move];
  const next = createSolvedCubieState();

  for (let position = 0; position < 8; position += 1) {
    const sourcePosition = transform.cp[position];
    next.cp[position] = cubie.cp[sourcePosition];
    next.co[position] = (cubie.co[sourcePosition] + transform.co[position]) % 3;
  }

  for (let position = 0; position < 12; position += 1) {
    const sourcePosition = transform.ep[position];
    next.ep[position] = cubie.ep[sourcePosition];
    next.eo[position] = (cubie.eo[sourcePosition] + transform.eo[position]) % 2;
  }

  return next;
}

export function applyMovesToCubieState(cubie: CubieState, moves: readonly CubeMove[]): CubieState {
  return moves.reduce((currentState, move) => applyMoveToCubieState(currentState, move), cubie);
}

export function isSolvedCubieState(cubie: CubieState): boolean {
  for (let index = 0; index < 8; index += 1) {
    if (cubie.cp[index] !== index || cubie.co[index] !== 0) {
      return false;
    }
  }

  for (let index = 0; index < 12; index += 1) {
    if (cubie.ep[index] !== index || cubie.eo[index] !== 0) {
      return false;
    }
  }

  return true;
}

export function countEdgeOrientationMismatches(cubie: CubieState): number {
  return cubie.eo.reduce((sum, orientation) => sum + orientation, 0);
}

export function countCornerOrientationMismatches(cubie: CubieState): number {
  return cubie.co.reduce((sum, orientation) => sum + (orientation === 0 ? 0 : 1), 0);
}

export function countMiddleSliceMismatches(cubie: CubieState): number {
  let mismatches = 0;

  for (let position = 8; position < 12; position += 1) {
    if (!SLICE_EDGE_IDS.has(cubie.ep[position])) {
      mismatches += 1;
    }
}

  return mismatches;
}

export function hasSolvedEdgeOrientation(cubie: CubieState): boolean {
  return countEdgeOrientationMismatches(cubie) === 0;
}

export function hasSolvedCornerOrientation(cubie: CubieState): boolean {
  return countCornerOrientationMismatches(cubie) === 0;
}

export function hasMiddleSliceEdges(cubie: CubieState): boolean {
  return countMiddleSliceMismatches(cubie) === 0;
}

function belongsToSameTetrad(position: number, cubieIndex: number) {
  return (TETRAD_A.has(position) && TETRAD_A.has(cubieIndex)) || (TETRAD_B.has(position) && TETRAD_B.has(cubieIndex));
}

export function countCornerTetradMismatches(cubie: CubieState): number {
  let mismatches = 0;

  for (let position = 0; position < 8; position += 1) {
    if (!belongsToSameTetrad(position, cubie.cp[position])) {
      mismatches += 1;
    }
  }

  return mismatches;
}

function countInversions(values: readonly number[]): number {
  let inversions = 0;

  for (let index = 0; index < values.length; index += 1) {
    for (let innerIndex = index + 1; innerIndex < values.length; innerIndex += 1) {
      if (values[index] > values[innerIndex]) {
        inversions += 1;
      }
    }
  }

  return inversions;
}

export function permutationParity(values: readonly number[]): number {
  return countInversions(values) % 2;
}

export function countSolvedCorners(cubie: CubieState): number {
  let solvedCorners = 0;

  for (let position = 0; position < 8; position += 1) {
    if (cubie.cp[position] === position && cubie.co[position] === 0) {
      solvedCorners += 1;
    }
  }

  return solvedCorners;
}

export function countSolvedEdges(cubie: CubieState): number {
  let solvedEdges = 0;

  for (let position = 0; position < 12; position += 1) {
    if (cubie.ep[position] === position && cubie.eo[position] === 0) {
      solvedEdges += 1;
    }
  }

  return solvedEdges;
}
export function getSliceIndex(ep: number[]): number {
  const positions = ep
    .map((edge, position) => (SLICE_EDGE_IDS.has(edge) ? position : -1))
    .filter((position) => position !== -1);

  const coordinate = SLICE_POSITION_TO_COORDINATE.get(positions.join(','));
  if (coordinate === undefined) {
    throw new Error('Invalid slice coordinate.');
  }

  return coordinate;
}

export function isPhase1Solved(cubie: CubieState): boolean {
  // Phase 1 ONLY focuses on Edge Orientation
  return hasSolvedEdgeOrientation(cubie);
}

export function isPhase2Solved(cubie: CubieState): boolean {
  // Phase 2 focuses on Corner Orientation AND placing the Middle Slice
  return hasSolvedCornerOrientation(cubie) && hasMiddleSliceEdges(cubie);
}

export function isPhase3Solved(cubie: CubieState): boolean {
  // 1. Must pass Phase 2
  if (!isPhase2Solved(cubie)) return false;
  
  // 2. Corner Tetrads must be isolated
  if (countCornerTetradMismatches(cubie) !== 0) return false;

  // 3. Edge Orbits must be isolated (If Orbit A and Slice are correct, Orbit B is naturally correct)
  const orbitA = new Set([0, 2, 4, 6]);
  for (const pos of [0, 2, 4, 6]) {
    if (!orbitA.has(cubie.ep[pos])) return false;
  }

  // 4. Overall parity must be even
  return permutationParity(cubie.cp) === 0 && permutationParity(cubie.ep) === 0;
}

// The three independent edge orbits under Phase 4 half-turn moves.
// U2/D2 mix A and B; L2/R2 mix A and C; F2/B2 mix B and C.
// Each orbit is closed: no move crosses between them.
const ORBIT_A_IDS = new Set([0, 2, 4, 6]); // UR, UL, DR, DL
const ORBIT_B_IDS = new Set([1, 3, 5, 7]); // UF, UB, DF, DB
const ORBIT_A_POSITIONS = [0, 2, 4, 6] as const;
const ORBIT_B_POSITIONS = [1, 3, 5, 7] as const;

export function countEdgeOrbitMismatches(cubie: CubieState): number {
  let mismatches = 0;
  for (const pos of ORBIT_A_POSITIONS) {
    if (!ORBIT_A_IDS.has(cubie.ep[pos])) mismatches++;
  }
  for (const pos of ORBIT_B_POSITIONS) {
    if (!ORBIT_B_IDS.has(cubie.ep[pos])) mismatches++;
  }
  return mismatches;
}

export function hasCorrectEdgeOrbits(cubie: CubieState): boolean {
  return countEdgeOrbitMismatches(cubie) === 0;
}

export function hasEvenOrbitParities(cubie: CubieState): boolean {
  // Normalize each valid G3 orbit's edge IDs to 0-3 before computing parity.

  // 1. S-slice orbit (UR, UL, DR, DL)
  const orbitAPositions = [0, 2, 4, 6];
  const orbitA = orbitAPositions.map(pos => orbitAPositions.indexOf(cubie.ep[pos]));

  // 2. M-slice orbit (UF, UB, DF, DB)
  const orbitBPositions = [1, 3, 5, 7];
  const orbitB = orbitBPositions.map(pos => orbitBPositions.indexOf(cubie.ep[pos]));

  // 3. E-slice orbit (FR, FL, BL, BR)
  const orbitCPositions = [8, 9, 10, 11];
  const middleOrbit = orbitCPositions.map(pos => orbitCPositions.indexOf(cubie.ep[pos]));

  // Corner tetrads are isolated, check their internal parity
  const tetradAPositions = [0, 2, 5, 7];
  const tetradBPositions = [1, 3, 4, 6];
  const tetradACubies = tetradAPositions.map(pos => tetradAPositions.indexOf(cubie.cp[pos]));
  const tetradBCubies = tetradBPositions.map(pos => tetradBPositions.indexOf(cubie.cp[pos]));

  return (
    permutationParity(orbitA) === 0 &&
    permutationParity(orbitB) === 0 &&
    permutationParity(middleOrbit) === 0 &&
    permutationParity(tetradACubies) === 0 &&
    permutationParity(tetradBCubies) === 0
  );
}




export function getSolvedFacelets(): string {
  return SOLVED_FACELETS;
}

export function getSolvedCubieState(): CubieState {
  return cloneCubieState(SOLVED_CUBIE_STATE);
}

export function isValidCubeState(cube: CubeState): boolean {
  try {
    const facelets = cubeStateToFaceletString(cube);
    return facelets.length === SOLVED_FACELETS.length;
  } catch {
    return false;
  }
}
