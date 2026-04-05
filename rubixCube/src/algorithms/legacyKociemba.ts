import {
  MOVE_FACELET_PERMUTATIONS,
  type CubeState,
  type MoveName,
} from '../logic/cubeLogic';

type FaceLetter = 'U' | 'R' | 'F' | 'D' | 'L' | 'B';
export type SolutionMove = MoveName | 'U2' | 'D2' | 'L2' | 'R2' | 'F2' | 'B2';
type InternalMove = SolutionMove;

interface CubieState {
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

interface Phase1Coordinates {
  twist: number;
  flip: number;
  slice: number;
}

interface Phase2Coordinates {
  cornerPermutation: number;
  udEdgePermutation: number;
  slicePermutation: number;
}

export interface SolverResult {
  faceletString: string;
  phase1Moves: SolutionMove[];
  phase2Moves: InternalMove[];
  moves: SolutionMove[];
}

export interface SolverOptions {
  maxPhase1Depth?: number;
  maxPhase2Depth?: number;
  maxSolutionDepth?: number;
  timeLimitMs?: number;
}

export interface SerializedPruningTables {
  version: 1;
  twist: number[];
  flip: number[];
  slice: number[];
  cornerPermutation: number[];
  udEdgePermutation: number[];
  slicePermutation: number[];
}

interface TwoPhaseSolution {
  phase1Moves: InternalMove[];
  phase2Moves: InternalMove[];
}

const PHASE1_MOVES: InternalMove[] = [
  'U',
  "U'",
  'U2',
  'D',
  "D'",
  'D2',
  'L',
  "L'",
  'L2',
  'R',
  "R'",
  'R2',
  'F',
  "F'",
  'F2',
  'B',
  "B'",
  'B2',
];

const QUARTER_TURN_MOVES: MoveName[] = [
  'U',
  "U'",
  'D',
  "D'",
  'L',
  "L'",
  'R',
  "R'",
  'F',
  "F'",
  'B',
  "B'",
];

const PHASE2_MOVES: InternalMove[] = [
  'U',
  "U'",
  'U2',
  'D',
  "D'",
  'D2',
  'R2',
  'L2',
  'F2',
  'B2',
];

const DOUBLE_TURN_FACES = ['U', 'D', 'L', 'R', 'F', 'B'] as const;
const SOLVED_FACELETS = 'UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB';
const FACTORIAL = [1, 1, 2, 6, 24, 120, 720, 5040, 40320, 362880, 3628800, 39916800, 479001600];

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

const EDGE_COLORS: readonly FaceLetter[][] = [
  ['U', 'R'],
  ['U', 'F'],
  ['U', 'L'],
  ['U', 'B'],
  ['D', 'R'],
  ['D', 'F'],
  ['D', 'L'],
  ['D', 'B'],
  ['F', 'R'],
  ['F', 'L'],
  ['B', 'L'],
  ['B', 'R'],
];

const SLICE_EDGE_IDS = new Set([8, 9, 10, 11]);

const SLICE_POSITION_COMBINATIONS = generateSlicePositionCombinations();
const SLICE_POSITION_TO_COORDINATE = new Map(
  SLICE_POSITION_COMBINATIONS.map((combination, index) => [combination.join(','), index]),
);
const SOLVED_CUBIE_STATE = createSolvedCubieState();
const MOVE_PERMUTATIONS = createMovePermutations();
const MOVE_TRANSFORMS = createCubieMoveTransforms();

function generateSlicePositionCombinations() {
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

function createSolvedCubieState(): CubieState {
  return {
    cp: [0, 1, 2, 3, 4, 5, 6, 7],
    co: [0, 0, 0, 0, 0, 0, 0, 0],
    ep: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    eo: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  };
}

function cloneCubieState(cubie: CubieState): CubieState {
  return {
    cp: [...cubie.cp],
    co: [...cubie.co],
    ep: [...cubie.ep],
    eo: [...cubie.eo],
  };
}

function getMoveAxis(move: InternalMove): string {
  return move[0];
}

function moveToQuarterTurns(move: InternalMove): number {
  if (move.endsWith('2')) {
    return 2;
  }

  return move.endsWith("'") ? 3 : 1;
}

function quarterTurnsToMove(face: string, turns: number): InternalMove[] {
  const normalizedTurns = turns % 4;

  if (normalizedTurns === 0) {
    return [];
  }

  if (normalizedTurns === 1) {
    return [face as InternalMove];
  }

  if (normalizedTurns === 2) {
    return [`${face}2` as InternalMove];
  }

  return [`${face}'` as InternalMove];
}

function compressInternalMoves(moves: InternalMove[]): InternalMove[] {
  const compressed: InternalMove[] = [];

  for (const move of moves) {
    const previousMove = compressed[compressed.length - 1];

    if (previousMove && previousMove[0] === move[0]) {
      const combinedTurns =
        (moveToQuarterTurns(previousMove) + moveToQuarterTurns(move)) % 4;

      compressed.pop();
      compressed.push(...quarterTurnsToMove(move[0], combinedTurns));
      continue;
    }

    compressed.push(move);
  }

  return compressed;
}

function permutationToRank(values: ArrayLike<number>, start = 0, count = values.length - start): number {
  let rank = 0;

  for (let index = 0; index < count; index += 1) {
    let smallerValues = 0;
    const currentValue = values[start + index];

    for (let innerIndex = index + 1; innerIndex < count; innerIndex += 1) {
      if (values[start + innerIndex] < currentValue) {
        smallerValues += 1;
      }
    }

    rank += smallerValues * FACTORIAL[count - index - 1];
  }

  return rank;
}

function rankToPermutation(rank: number, items: number[]): number[] {
  const available = [...items];
  const permutation: number[] = [];
  let remaining = rank;

  for (let length = items.length; length > 0; length -= 1) {
    const factorial = FACTORIAL[length - 1];
    const index = Math.floor(remaining / factorial);
    remaining %= factorial;
    permutation.push(available.splice(index, 1)[0]);
  }

  return permutation;
}

function composePermutation(first: number[], second: number[]): number[] {
  return second.map((index) => first[index]);
}

function createMovePermutations(): Record<InternalMove, number[]> {
  const permutations = {} as Record<InternalMove, number[]>;

  for (const move of QUARTER_TURN_MOVES) {
    permutations[move] = MOVE_FACELET_PERMUTATIONS[move];
  }

  for (const move of DOUBLE_TURN_FACES) {
    permutations[`${move}2` as InternalMove] = composePermutation(
      permutations[move],
      permutations[move],
    );
  }

  return permutations;
}

function applyMoveToFacelets(facelets: string, move: InternalMove): string {
  const permutation = MOVE_PERMUTATIONS[move];
  const stickers = facelets.split('');
  return permutation.map((index) => stickers[index]).join('');
}

function faceletsToCubieState(facelets: string): CubieState {
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
    const colors = EDGE_FACELETS[position].map((index) => stickers[index]);
    let found = false;

    for (let cubieIndex = 0; cubieIndex < EDGE_COLORS.length; cubieIndex += 1) {
      const target = EDGE_COLORS[cubieIndex];
      if (colors[0] === target[0] && colors[1] === target[1]) {
        ep[position] = cubieIndex;
        eo[position] = 0;
        found = true;
        break;
      }

      if (colors[0] === target[1] && colors[1] === target[0]) {
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

function cubieStateToFacelets(cubie: CubieState): string {
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

function createCubieMoveTransforms(): Record<InternalMove, CubieMoveTransform> {
  const transforms = {} as Record<InternalMove, CubieMoveTransform>;
  const solvedFacelets = cubieStateToFacelets(SOLVED_CUBIE_STATE);

  for (const move of [...PHASE1_MOVES, ...PHASE2_MOVES]) {
    if (transforms[move]) {
      continue;
    }

    const movedFacelets = applyMoveToFacelets(solvedFacelets, move);
    const movedCubie = faceletsToCubieState(movedFacelets);

    transforms[move] = {
      cp: [...movedCubie.cp],
      co: [...movedCubie.co],
      ep: [...movedCubie.ep],
      eo: [...movedCubie.eo],
    };
  }

  return transforms;
}

function applyMoveToCubieState(cubie: CubieState, move: InternalMove): CubieState {
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

function isSolvedCubieState(cubie: CubieState): boolean {
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

function createPhase1VisitedKey(cubie: CubieState): string {
  return `${cubie.cp.join('')}:${cubie.co.join('')}:${cubie.ep.join(',')}:${cubie.eo.join('')}`;
}

export class LegacyKociembaSolver {
  private readonly twistPruningTable = new Int16Array(2187).fill(-1);

  private readonly flipPruningTable = new Int16Array(2048).fill(-1);

  private readonly slicePruningTable = new Int16Array(495).fill(-1);

  private readonly cornerPermutationPruningTable = new Int16Array(40320).fill(-1);

  private readonly udEdgePermutationPruningTable = new Int16Array(40320).fill(-1);

  private readonly slicePermutationPruningTable = new Int16Array(24).fill(-1);

  private pruningTablesReady = false;

  cubeStateToFaceletString(cube: CubeState): string {
    const centerToFace = new Map<string, FaceLetter>([
      [cube.top[4], 'U'],
      [cube.right[4], 'R'],
      [cube.front[4], 'F'],
      [cube.bottom[4], 'D'],
      [cube.left[4], 'L'],
      [cube.back[4], 'B'],
    ]);

    const stickers = [
      ...cube.top,
      ...cube.right,
      ...cube.front,
      ...cube.bottom,
      ...cube.left,
      ...cube.back,
    ];

    return stickers
      .map((sticker) => {
        const face = centerToFace.get(sticker);
        if (!face) {
          throw new Error(`Unknown sticker color '${sticker}'.`);
        }

        return face;
      })
      .join('');
  }

  isPruningTablesReady() {
    return this.pruningTablesReady;
  }

  warmUpPruningTables() {
    this.ensurePruningTables();
  }

  loadPruningTables(data: SerializedPruningTables) {
    if (data.version !== 1) {
      throw new Error(`Unsupported pruning table version: ${data.version}`);
    }

    this.copyIntoTable(this.twistPruningTable, data.twist, 'twist');
    this.copyIntoTable(this.flipPruningTable, data.flip, 'flip');
    this.copyIntoTable(this.slicePruningTable, data.slice, 'slice');
    this.copyIntoTable(
      this.cornerPermutationPruningTable,
      data.cornerPermutation,
      'cornerPermutation',
    );
    this.copyIntoTable(
      this.udEdgePermutationPruningTable,
      data.udEdgePermutation,
      'udEdgePermutation',
    );
    this.copyIntoTable(
      this.slicePermutationPruningTable,
      data.slicePermutation,
      'slicePermutation',
    );
    this.pruningTablesReady = true;
  }

  exportPruningTables(): SerializedPruningTables {
    this.ensurePruningTables();
    return {
      version: 1,
      twist: Array.from(this.twistPruningTable),
      flip: Array.from(this.flipPruningTable),
      slice: Array.from(this.slicePruningTable),
      cornerPermutation: Array.from(this.cornerPermutationPruningTable),
      udEdgePermutation: Array.from(this.udEdgePermutationPruningTable),
      slicePermutation: Array.from(this.slicePermutationPruningTable),
    };
  }

  getPruningTables() {
    this.ensurePruningTables();
    return {
      twist: this.twistPruningTable,
      flip: this.flipPruningTable,
      slice: this.slicePruningTable,
      cornerPermutation: this.cornerPermutationPruningTable,
      udEdgePermutation: this.udEdgePermutationPruningTable,
      slicePermutation: this.slicePermutationPruningTable,
    };
  }

  solve(cube: CubeState, options: SolverOptions = {}): SolverResult | null {
    this.ensurePruningTables();

    const faceletString = this.cubeStateToFaceletString(cube);
    if (faceletString === SOLVED_FACELETS) {
      return {
        faceletString,
        phase1Moves: [],
        phase2Moves: [],
        moves: [],
      };
    }

    const deadline = performance.now() + (options.timeLimitMs ?? 2500);
    const initialCubie = faceletsToCubieState(faceletString);
    const solution = this.findTwoPhaseSolution(
      initialCubie,
      options.maxPhase1Depth ?? 13,
      options.maxPhase2Depth ?? 20,
      options.maxSolutionDepth ?? 22,
      deadline,
    );

    if (!solution) {
      return null;
    }

    return {
      faceletString,
      phase1Moves: solution.phase1Moves,
      phase2Moves: solution.phase2Moves,
      moves: compressInternalMoves([
        ...solution.phase1Moves,
        ...solution.phase2Moves,
      ]),
    };
  }

  private copyIntoTable(table: Int16Array, source: number[], name: string) {
    if (source.length !== table.length) {
      throw new Error(
        `Invalid pruning table length for ${name}. Expected ${table.length}, received ${source.length}.`,
      );
    }

    table.set(source);
  }

  private findTwoPhaseSolution(
    initialCubie: CubieState,
    maxPhase1Depth: number,
    maxPhase2Depth: number,
    maxSolutionDepth: number,
    deadline: number,
  ): TwoPhaseSolution | null {
    const initialCoordinates = this.getPhase1Coordinates(initialCubie);
    const initialBound = this.phase1HeuristicFromCoordinates(initialCoordinates);
    const maxBound = Math.min(maxPhase1Depth, maxSolutionDepth);
    const phase1Path = Array<InternalMove>(Math.max(1, maxPhase1Depth)).fill('U');

    for (let phase1Bound = initialBound; phase1Bound <= maxBound; phase1Bound += 1) {
      const visited = new Map<string, number>();
      const solution = this.searchPhase1ForSolution(
        initialCubie,
        initialCoordinates,
        0,
        phase1Bound,
        phase1Path,
        '',
        deadline,
        visited,
        maxPhase2Depth,
        maxSolutionDepth,
      );

      if (solution) {
        return solution;
      }
    }

    return null;
  }

  private searchPhase1ForSolution(
    cubie: CubieState,
    coordinates: Phase1Coordinates,
    depth: number,
    bound: number,
    path: InternalMove[],
    lastAxis: string,
    deadline: number,
    visited: Map<string, number>,
    maxPhase2Depth: number,
    maxSolutionDepth: number,
  ): TwoPhaseSolution | null {
    if (performance.now() > deadline) {
      return null;
    }

    const stateKey = createPhase1VisitedKey(cubie);
    const bestDepth = visited.get(stateKey);
    if (bestDepth !== undefined && bestDepth <= depth) {
      return null;
    }
    visited.set(stateKey, depth);

    const heuristic = this.phase1HeuristicFromCoordinates(coordinates);
    if (depth + heuristic > bound) {
      return null;
    }

    if (heuristic === 0) {
      const remainingDepth = Math.min(maxPhase2Depth, maxSolutionDepth - depth);
      if (remainingDepth < 0) {
        return null;
      }

      const phase2Moves = this.findPhase2(cubie, remainingDepth, deadline);
      if (phase2Moves) {
        return {
          phase1Moves: path.slice(0, depth),
          phase2Moves,
        };
      }
    }

    for (const move of PHASE1_MOVES) {
      const axis = getMoveAxis(move);
      if (axis === lastAxis) {
        continue;
      }

      const nextCubie = applyMoveToCubieState(cubie, move);
      path[depth] = move;
      const solution = this.searchPhase1ForSolution(
        nextCubie,
        this.getPhase1Coordinates(nextCubie),
        depth + 1,
        bound,
        path,
        axis,
        deadline,
        visited,
        maxPhase2Depth,
        maxSolutionDepth,
      );

      if (solution) {
        return solution;
      }
    }

    return null;
  }

  private ensurePruningTables() {
    if (this.pruningTablesReady) {
      return;
    }

    this.buildTwistPruningTable();
    this.buildFlipPruningTable();
    this.buildSlicePruningTable();
    this.buildCornerPermutationPruningTable();
    this.buildUdEdgePermutationPruningTable();
    this.buildSlicePermutationPruningTable();
    this.pruningTablesReady = true;
  }

  private buildTwistPruningTable() {
    const queue: number[] = [0];
    let head = 0;
    this.twistPruningTable[0] = 0;

    while (head < queue.length) {
      const coordinate = queue[head++];
      const depth = this.twistPruningTable[coordinate];
      const cubie = this.createCubieStateFromTwist(coordinate);

      for (const move of PHASE1_MOVES) {
        const nextCoordinate = this.getTwistCoordinate(applyMoveToCubieState(cubie, move));
        if (this.twistPruningTable[nextCoordinate] !== -1) {
          continue;
        }

        this.twistPruningTable[nextCoordinate] = depth + 1;
        queue.push(nextCoordinate);
      }
    }
  }

  private buildFlipPruningTable() {
    const queue: number[] = [0];
    let head = 0;
    this.flipPruningTable[0] = 0;

    while (head < queue.length) {
      const coordinate = queue[head++];
      const depth = this.flipPruningTable[coordinate];
      const cubie = this.createCubieStateFromFlip(coordinate);

      for (const move of PHASE1_MOVES) {
        const nextCoordinate = this.getFlipCoordinate(applyMoveToCubieState(cubie, move));
        if (this.flipPruningTable[nextCoordinate] !== -1) {
          continue;
        }

        this.flipPruningTable[nextCoordinate] = depth + 1;
        queue.push(nextCoordinate);
      }
    }
  }

  private buildSlicePruningTable() {
    const queue: number[] = [0];
    let head = 0;
    this.slicePruningTable[0] = 0;

    while (head < queue.length) {
      const coordinate = queue[head++];
      const depth = this.slicePruningTable[coordinate];
      const cubie = this.createCubieStateFromSlice(coordinate);

      for (const move of PHASE1_MOVES) {
        const nextCoordinate = this.getSliceCoordinate(applyMoveToCubieState(cubie, move));
        if (this.slicePruningTable[nextCoordinate] !== -1) {
          continue;
        }

        this.slicePruningTable[nextCoordinate] = depth + 1;
        queue.push(nextCoordinate);
      }
    }
  }

  private buildCornerPermutationPruningTable() {
    const queue: number[] = [0];
    let head = 0;
    this.cornerPermutationPruningTable[0] = 0;

    while (head < queue.length) {
      const coordinate = queue[head++];
      const depth = this.cornerPermutationPruningTable[coordinate];
      const cubie = this.createCubieStateFromCornerPermutation(coordinate);

      for (const move of PHASE2_MOVES) {
        const nextCoordinate = this.getCornerPermutationCoordinate(
          applyMoveToCubieState(cubie, move),
        );
        if (this.cornerPermutationPruningTable[nextCoordinate] !== -1) {
          continue;
        }

        this.cornerPermutationPruningTable[nextCoordinate] = depth + 1;
        queue.push(nextCoordinate);
      }
    }
  }

  private buildUdEdgePermutationPruningTable() {
    const queue: number[] = [0];
    let head = 0;
    this.udEdgePermutationPruningTable[0] = 0;

    while (head < queue.length) {
      const coordinate = queue[head++];
      const depth = this.udEdgePermutationPruningTable[coordinate];
      const cubie = this.createCubieStateFromUdEdgePermutation(coordinate);

      for (const move of PHASE2_MOVES) {
        const nextCoordinate = this.getUdEdgePermutationCoordinate(
          applyMoveToCubieState(cubie, move),
        );
        if (this.udEdgePermutationPruningTable[nextCoordinate] !== -1) {
          continue;
        }

        this.udEdgePermutationPruningTable[nextCoordinate] = depth + 1;
        queue.push(nextCoordinate);
      }
    }
  }

  private buildSlicePermutationPruningTable() {
    const queue: number[] = [0];
    let head = 0;
    this.slicePermutationPruningTable[0] = 0;

    while (head < queue.length) {
      const coordinate = queue[head++];
      const depth = this.slicePermutationPruningTable[coordinate];
      const cubie = this.createCubieStateFromSlicePermutation(coordinate);

      for (const move of PHASE2_MOVES) {
        const nextCoordinate = this.getSlicePermutationCoordinate(
          applyMoveToCubieState(cubie, move),
        );
        if (this.slicePermutationPruningTable[nextCoordinate] !== -1) {
          continue;
        }

        this.slicePermutationPruningTable[nextCoordinate] = depth + 1;
        queue.push(nextCoordinate);
      }
    }
  }

  private findPhase2(
    initialCubie: CubieState,
    maxDepth: number,
    deadline: number,
  ): InternalMove[] | null {
    const initialCoordinates = this.getPhase2Coordinates(initialCubie);
    let bound = this.phase2HeuristicFromCoordinates(initialCoordinates);
    const path = Array<InternalMove>(Math.max(1, maxDepth)).fill('U');

    while (bound <= maxDepth) {
      const visited = new Map<number, number>();
      const result = this.searchPhase2(
        initialCubie,
        initialCoordinates,
        0,
        bound,
        path,
        '',
        deadline,
        visited,
      );
      if (Array.isArray(result)) {
        return result;
      }

      if (!Number.isFinite(result)) {
        return null;
      }

      bound = result;
    }

    return null;
  }

  private searchPhase2(
    cubie: CubieState,
    coordinates: Phase2Coordinates,
    depth: number,
    bound: number,
    path: InternalMove[],
    lastAxis: string,
    deadline: number,
    visited: Map<number, number>,
  ): InternalMove[] | number {
    if (performance.now() > deadline) {
      return Number.POSITIVE_INFINITY;
    }

    const stateKey = this.createPhase2VisitedKey(coordinates);
    const bestDepth = visited.get(stateKey);
    if (bestDepth !== undefined && bestDepth <= depth) {
      return Number.POSITIVE_INFINITY;
    }
    visited.set(stateKey, depth);

    const heuristic = this.phase2HeuristicFromCoordinates(coordinates);
    const estimate = depth + heuristic;
    if (estimate > bound) {
      return estimate;
    }

    if (isSolvedCubieState(cubie)) {
      return path.slice(0, depth);
    }

    let nextBound = Number.POSITIVE_INFINITY;

    for (const move of PHASE2_MOVES) {
      const axis = getMoveAxis(move);
      if (axis === lastAxis) {
        continue;
      }

      const nextCubie = applyMoveToCubieState(cubie, move);
      path[depth] = move;
      const result = this.searchPhase2(
        nextCubie,
        this.getPhase2Coordinates(nextCubie),
        depth + 1,
        bound,
        path,
        axis,
        deadline,
        visited,
      );

      if (Array.isArray(result)) {
        return result;
      }

      nextBound = Math.min(nextBound, result);
    }

    return nextBound;
  }

  private createPhase2VisitedKey(coordinates: Phase2Coordinates): number {
    return (
      (coordinates.cornerPermutation * 40320 + coordinates.udEdgePermutation) * 24 +
      coordinates.slicePermutation
    );
  }

  private phase1HeuristicFromCoordinates(coordinates: Phase1Coordinates): number {
    return Math.max(
      this.twistPruningTable[coordinates.twist],
      this.flipPruningTable[coordinates.flip],
      this.slicePruningTable[coordinates.slice],
    );
  }

  private phase2HeuristicFromCoordinates(coordinates: Phase2Coordinates): number {
    return Math.max(
      this.cornerPermutationPruningTable[coordinates.cornerPermutation],
      this.udEdgePermutationPruningTable[coordinates.udEdgePermutation],
      this.slicePermutationPruningTable[coordinates.slicePermutation],
    );
  }

  private getPhase1Coordinates(cubie: CubieState): Phase1Coordinates {
    return {
      twist: this.getTwistCoordinate(cubie),
      flip: this.getFlipCoordinate(cubie),
      slice: this.getSliceCoordinate(cubie),
    };
  }

  private getPhase2Coordinates(cubie: CubieState): Phase2Coordinates {
    return {
      cornerPermutation: this.getCornerPermutationCoordinate(cubie),
      udEdgePermutation: this.getUdEdgePermutationCoordinate(cubie),
      slicePermutation: this.getSlicePermutationCoordinate(cubie),
    };
  }

  private getTwistCoordinate(cubie: CubieState): number {
    let coordinate = 0;
    for (let index = 0; index < 7; index += 1) {
      coordinate = coordinate * 3 + cubie.co[index];
    }
    return coordinate;
  }

  private getFlipCoordinate(cubie: CubieState): number {
    let coordinate = 0;
    for (let index = 0; index < 11; index += 1) {
      coordinate = coordinate * 2 + cubie.eo[index];
    }
    return coordinate;
  }

  private getSliceCoordinate(cubie: CubieState): number {
    const positions = cubie.ep
      .map((edge, position) => (SLICE_EDGE_IDS.has(edge) ? position : -1))
      .filter((position) => position !== -1);

    const coordinate = SLICE_POSITION_TO_COORDINATE.get(positions.join(','));
    if (coordinate === undefined) {
      throw new Error('Invalid slice coordinate.');
    }

    return coordinate;
  }

  private getCornerPermutationCoordinate(cubie: CubieState): number {
    return permutationToRank(cubie.cp);
  }

  private getUdEdgePermutationCoordinate(cubie: CubieState): number {
    return permutationToRank(cubie.ep, 0, 8);
  }

  private getSlicePermutationCoordinate(cubie: CubieState): number {
    return permutationToRank(cubie.ep, 8, 4);
  }

  private createCubieStateFromTwist(coordinate: number): CubieState {
    const cubie = cloneCubieState(SOLVED_CUBIE_STATE);
    let parity = 0;
    let value = coordinate;

    for (let index = 6; index >= 0; index -= 1) {
      cubie.co[index] = value % 3;
      parity += cubie.co[index];
      value = Math.floor(value / 3);
    }

    cubie.co[7] = (3 - (parity % 3)) % 3;
    return cubie;
  }

  private createCubieStateFromFlip(coordinate: number): CubieState {
    const cubie = cloneCubieState(SOLVED_CUBIE_STATE);
    let parity = 0;
    let value = coordinate;

    for (let index = 10; index >= 0; index -= 1) {
      cubie.eo[index] = value % 2;
      parity += cubie.eo[index];
      value = Math.floor(value / 2);
    }

    cubie.eo[11] = parity % 2;
    return cubie;
  }

  private createCubieStateFromSlice(coordinate: number): CubieState {
    const cubie = cloneCubieState(SOLVED_CUBIE_STATE);
    const slicePositions = SLICE_POSITION_COMBINATIONS[coordinate];
    const remainingEdges = [0, 1, 2, 3, 4, 5, 6, 7];
    const sliceEdges = [8, 9, 10, 11];

    for (let position = 0; position < 12; position += 1) {
      if (slicePositions.includes(position)) {
        cubie.ep[position] = sliceEdges.shift() ?? 8;
      } else {
        cubie.ep[position] = remainingEdges.shift() ?? 0;
      }
    }

    return cubie;
  }

  private createCubieStateFromCornerPermutation(coordinate: number): CubieState {
    const cubie = cloneCubieState(SOLVED_CUBIE_STATE);
    cubie.cp = rankToPermutation(coordinate, [0, 1, 2, 3, 4, 5, 6, 7]);
    return cubie;
  }

  private createCubieStateFromUdEdgePermutation(coordinate: number): CubieState {
    const cubie = cloneCubieState(SOLVED_CUBIE_STATE);
    const permutation = rankToPermutation(coordinate, [0, 1, 2, 3, 4, 5, 6, 7]);

    for (let index = 0; index < 8; index += 1) {
      cubie.ep[index] = permutation[index];
    }

    return cubie;
  }

  private createCubieStateFromSlicePermutation(coordinate: number): CubieState {
    const cubie = cloneCubieState(SOLVED_CUBIE_STATE);
    const permutation = rankToPermutation(coordinate, [8, 9, 10, 11]);

    for (let index = 0; index < 4; index += 1) {
      cubie.ep[index + 8] = permutation[index];
    }

    return cubie;
  }
}

export { LegacyKociembaSolver as Solver };
