/**
 * Cube logic and move helpers for the Rubik's Cube app.
 * This module owns the facelet-level representation used by the UI,
 * input layer, and renderer-friendly move utilities.
 */

export type FaceIndex = 0 | 1 | 2 | 3 | 4 | 5;

export const Color = {
  White: 'white',
  Yellow: 'yellow',
  Red: 'red',
  Orange: 'orange',
  Green: 'green',
  Blue: 'blue',
} as const;

export type Color = (typeof Color)[keyof typeof Color];

const FACES = ['front', 'back', 'left', 'right', 'top', 'bottom'] as const;
const FACELET_EXPORT_ORDER = ['top', 'right', 'front', 'bottom', 'left', 'back'] as const;

const INITIAL_COLORS: Record<(typeof FACES)[number], Color> = {
  front: Color.Red,
  back: Color.Orange,
  left: Color.Green,
  right: Color.Blue,
  top: Color.White,
  bottom: Color.Yellow,
};

export interface CubeState {
  front: Color[];
  back: Color[];
  left: Color[];
  right: Color[];
  top: Color[];
  bottom: Color[];
}

export type MoveName =
  | 'U'
  | "U'"
  | 'D'
  | "D'"
  | 'L'
  | "L'"
  | 'R'
  | "R'"
  | 'F'
  | "F'"
  | 'B'
  | "B'";

export type HalfTurnMove = 'U2' | 'D2' | 'L2' | 'R2' | 'F2' | 'B2';
export type CubeMove = MoveName | HalfTurnMove;

type Axis = 'x' | 'y' | 'z';

type Vector3 = {
  x: number;
  y: number;
  z: number;
};

type FaceletMeta = {
  position: Vector3;
  normal: Vector3;
};

const FACE_OFFSETS: Record<(typeof FACELET_EXPORT_ORDER)[number], number> = {
  top: 0,
  right: 9,
  front: 18,
  bottom: 27,
  left: 36,
  back: 45,
};

const MOVE_ROTATIONS: Record<'U' | 'D' | 'L' | 'R' | 'F' | 'B', {
  axis: Axis;
  layer: number;
  direction: 1 | -1;
}> = {
  U: { axis: 'y', layer: 1, direction: 1 },
  D: { axis: 'y', layer: -1, direction: -1 },
  R: { axis: 'x', layer: 1, direction: 1 },
  L: { axis: 'x', layer: -1, direction: -1 },
  F: { axis: 'z', layer: 1, direction: -1 },
  B: { axis: 'z', layer: -1, direction: 1 },
};

function faceIndexToMeta(face: (typeof FACELET_EXPORT_ORDER)[number], index: number): FaceletMeta {
  const row = Math.floor(index / 3);
  const column = index % 3;

  switch (face) {
    case 'top':
      return {
        position: { x: column - 1, y: 1, z: row - 1 },
        normal: { x: 0, y: 1, z: 0 },
      };
    case 'right':
      return {
        position: { x: 1, y: 1 - row, z: 1 - column },
        normal: { x: 1, y: 0, z: 0 },
      };
    case 'front':
      return {
        position: { x: column - 1, y: 1 - row, z: 1 },
        normal: { x: 0, y: 0, z: 1 },
      };
    case 'bottom':
      return {
        position: { x: column - 1, y: -1, z: 1 - row },
        normal: { x: 0, y: -1, z: 0 },
      };
    case 'left':
      return {
        position: { x: -1, y: 1 - row, z: column - 1 },
        normal: { x: -1, y: 0, z: 0 },
      };
    case 'back':
      return {
        position: { x: 1 - column, y: 1 - row, z: -1 },
        normal: { x: 0, y: 0, z: -1 },
      };
  }
}

function rotateVector(vector: Vector3, axis: Axis, direction: 1 | -1): Vector3 {
  switch (axis) {
    case 'x':
      return direction === 1
        ? { x: vector.x, y: -vector.z, z: vector.y }
        : { x: vector.x, y: vector.z, z: -vector.y };
    case 'y':
      return direction === 1
        ? { x: vector.z, y: vector.y, z: -vector.x }
        : { x: -vector.z, y: vector.y, z: vector.x };
    case 'z':
      return direction === 1
        ? { x: -vector.y, y: vector.x, z: vector.z }
        : { x: vector.y, y: -vector.x, z: vector.z };
  }
}

function getAxisValue(vector: Vector3, axis: Axis): number {
  if (axis === 'x') return vector.x;
  if (axis === 'y') return vector.y;
  return vector.z;
}

function metaKey(meta: FaceletMeta): string {
  const { position, normal } = meta;
  return `${position.x},${position.y},${position.z}|${normal.x},${normal.y},${normal.z}`;
}

const FACELET_METADATA = FACELET_EXPORT_ORDER.flatMap((face) =>
  Array.from({ length: 9 }, (_, index) => faceIndexToMeta(face, index)),
);

const FACELET_INDEX_BY_KEY = new Map(
  FACELET_METADATA.map((meta, index) => [metaKey(meta), index]),
);

function createQuarterTurnPermutation(move: 'U' | 'D' | 'L' | 'R' | 'F' | 'B'): number[] {
  const { axis, layer, direction } = MOVE_ROTATIONS[move];
  const permutation = Array<number>(54).fill(0);

  for (let oldIndex = 0; oldIndex < FACELET_METADATA.length; oldIndex += 1) {
    const meta = FACELET_METADATA[oldIndex];
    const shouldRotate = getAxisValue(meta.position, axis) === layer;
    const rotatedMeta = shouldRotate
      ? {
          position: rotateVector(meta.position, axis, direction),
          normal: rotateVector(meta.normal, axis, direction),
        }
      : meta;
    const newIndex = FACELET_INDEX_BY_KEY.get(metaKey(rotatedMeta));

    if (newIndex === undefined) {
      throw new Error(`Unable to build permutation for move ${move}.`);
    }

    permutation[newIndex] = oldIndex;
  }

  return permutation;
}

function composePermutation(first: number[], second: number[]): number[] {
  return second.map((index) => first[index]);
}

const QUARTER_TURN_PERMUTATIONS: Record<'U' | 'D' | 'L' | 'R' | 'F' | 'B', number[]> = {
  U: createQuarterTurnPermutation('U'),
  D: createQuarterTurnPermutation('D'),
  L: createQuarterTurnPermutation('L'),
  R: createQuarterTurnPermutation('R'),
  F: createQuarterTurnPermutation('F'),
  B: createQuarterTurnPermutation('B'),
};

export const MOVE_FACELET_PERMUTATIONS: Record<CubeMove, number[]> = {
  U: QUARTER_TURN_PERMUTATIONS.U,
  "U'": composePermutation(
    QUARTER_TURN_PERMUTATIONS.U,
    composePermutation(QUARTER_TURN_PERMUTATIONS.U, QUARTER_TURN_PERMUTATIONS.U),
  ),
  U2: composePermutation(QUARTER_TURN_PERMUTATIONS.U, QUARTER_TURN_PERMUTATIONS.U),
  D: QUARTER_TURN_PERMUTATIONS.D,
  "D'": composePermutation(
    QUARTER_TURN_PERMUTATIONS.D,
    composePermutation(QUARTER_TURN_PERMUTATIONS.D, QUARTER_TURN_PERMUTATIONS.D),
  ),
  D2: composePermutation(QUARTER_TURN_PERMUTATIONS.D, QUARTER_TURN_PERMUTATIONS.D),
  L: QUARTER_TURN_PERMUTATIONS.L,
  "L'": composePermutation(
    QUARTER_TURN_PERMUTATIONS.L,
    composePermutation(QUARTER_TURN_PERMUTATIONS.L, QUARTER_TURN_PERMUTATIONS.L),
  ),
  L2: composePermutation(QUARTER_TURN_PERMUTATIONS.L, QUARTER_TURN_PERMUTATIONS.L),
  R: QUARTER_TURN_PERMUTATIONS.R,
  "R'": composePermutation(
    QUARTER_TURN_PERMUTATIONS.R,
    composePermutation(QUARTER_TURN_PERMUTATIONS.R, QUARTER_TURN_PERMUTATIONS.R),
  ),
  R2: composePermutation(QUARTER_TURN_PERMUTATIONS.R, QUARTER_TURN_PERMUTATIONS.R),
  F: QUARTER_TURN_PERMUTATIONS.F,
  "F'": composePermutation(
    QUARTER_TURN_PERMUTATIONS.F,
    composePermutation(QUARTER_TURN_PERMUTATIONS.F, QUARTER_TURN_PERMUTATIONS.F),
  ),
  F2: composePermutation(QUARTER_TURN_PERMUTATIONS.F, QUARTER_TURN_PERMUTATIONS.F),
  B: QUARTER_TURN_PERMUTATIONS.B,
  "B'": composePermutation(
    QUARTER_TURN_PERMUTATIONS.B,
    composePermutation(QUARTER_TURN_PERMUTATIONS.B, QUARTER_TURN_PERMUTATIONS.B),
  ),
  B2: composePermutation(QUARTER_TURN_PERMUTATIONS.B, QUARTER_TURN_PERMUTATIONS.B),
};

function cubeToFacelets(cube: CubeState): Color[] {
  return FACELET_EXPORT_ORDER.flatMap((face) => [...cube[face]]);
}

function faceletsToCube(stickers: Color[]): CubeState {
  const cube = {} as CubeState;

  for (const face of FACELET_EXPORT_ORDER) {
    const offset = FACE_OFFSETS[face];
    cube[face] = stickers.slice(offset, offset + 9);
  }

  return cube;
}

function applyStickerPermutation(cube: CubeState, permutation: number[]): CubeState {
  const stickers = cubeToFacelets(cube);
  const next = permutation.map((index) => stickers[index]);
  return faceletsToCube(next);
}

export const MOVE_DEFINITIONS: Array<{
  name: MoveName;
  keyHint: string;
  label: string;
}> = [
  { name: 'U', keyHint: 'U', label: 'U' },
  { name: "U'", keyHint: 'Shift+U', label: "U'" },
  { name: 'D', keyHint: 'D', label: 'D' },
  { name: "D'", keyHint: 'Shift+D', label: "D'" },
  { name: 'L', keyHint: 'L', label: 'L' },
  { name: "L'", keyHint: 'Shift+L', label: "L'" },
  { name: 'R', keyHint: 'R', label: 'R' },
  { name: "R'", keyHint: 'Shift+R', label: "R'" },
  { name: 'F', keyHint: 'F', label: 'F' },
  { name: "F'", keyHint: 'Shift+F', label: "F'" },
  { name: 'B', keyHint: 'B', label: 'B' },
  { name: "B'", keyHint: 'Shift+B', label: "B'" },
];

const INVERSE_MOVE_MAP: Record<CubeMove, CubeMove> = {
  U: "U'",
  "U'": 'U',
  U2: 'U2',
  D: "D'",
  "D'": 'D',
  D2: 'D2',
  L: "L'",
  "L'": 'L',
  L2: 'L2',
  R: "R'",
  "R'": 'R',
  R2: 'R2',
  F: "F'",
  "F'": 'F',
  F2: 'F2',
  B: "B'",
  "B'": 'B',
  B2: 'B2',
};

export function initializeCube(): CubeState {
  const cube = {} as CubeState;

  for (const face of FACES) {
    cube[face] = Array(9).fill(INITIAL_COLORS[face]);
  }

  return cube;
}

export function applyMove(cube: CubeState, move: CubeMove): CubeState {
  return applyStickerPermutation(cube, MOVE_FACELET_PERMUTATIONS[move]);
}

export function applyMoves(cube: CubeState, moves: readonly CubeMove[]): CubeState {
  return moves.reduce((currentCube, move) => applyMove(currentCube, move), cube);
}

export function invertMove(move: CubeMove): CubeMove {
  return INVERSE_MOVE_MAP[move];
}

export function invertMoves(moves: readonly CubeMove[]): CubeMove[] {
  return [...moves].reverse().map(invertMove);
}

export function moveToQuarterTurns(move: CubeMove): number {
  if (move.endsWith('2')) {
    return 2;
  }

  return move.endsWith("'") ? 3 : 1;
}

function quarterTurnsToMoves(face: string, turns: number): CubeMove[] {
  const normalizedTurns = turns % 4;

  if (normalizedTurns === 0) {
    return [];
  }

  if (normalizedTurns === 1) {
    return [face as CubeMove];
  }

  if (normalizedTurns === 2) {
    return [`${face}2` as CubeMove];
  }

  return [`${face}'` as CubeMove];
}

export function expandMove(move: CubeMove): MoveName[] {
  if (move.endsWith('2')) {
    const quarterTurn = move[0] as Exclude<MoveName, `${string}'`>;
    return [quarterTurn, quarterTurn];
  }

  return [move as MoveName];
}

export function expandMoves(moves: readonly CubeMove[]): MoveName[] {
  return moves.flatMap(expandMove);
}

export function compressMovesToHTM(moves: readonly CubeMove[]): CubeMove[] {
  const optimized: CubeMove[] = [];

  for (const move of moves) {
    const previous = optimized[optimized.length - 1];

    if (previous && previous[0] === move[0]) {
      const combinedTurns = (moveToQuarterTurns(previous) + moveToQuarterTurns(move)) % 4;
      optimized.pop();
      optimized.push(...quarterTurnsToMoves(move[0], combinedTurns));
      continue;
    }

    optimized.push(move);
  }

  return optimized;
}

export function optimizeMoveSequence(moves: readonly CubeMove[]): CubeMove[] {
  return compressMovesToHTM(moves);
}

export function generateScrambleSequence(moveCount?: number): MoveName[] {
  // If moveCount not provided, default to random 8-20 moves
  const finalMoveCount = moveCount ?? Math.floor(Math.random() * 13) + 8;
  const moves = MOVE_DEFINITIONS.map((definition) => definition.name);
  const scramble: MoveName[] = [];

  for (let index = 0; index < finalMoveCount; index += 1) {
    scramble.push(moves[Math.floor(Math.random() * moves.length)]);
  }

  return scramble;
}

export function isSolved(cube: CubeState): boolean {
  return Object.values(cube).every((face) => face.every((color: Color) => color === face[0]));
}

export function scrambleCube(
  cube: CubeState,
  moveCount = Math.floor(Math.random() * 13) + 8,
): CubeState {
  return applyMoves(cube, generateScrambleSequence(moveCount));
}

export function getHint(cube: CubeState): string {
  if (isSolved(cube)) {
    return '🎉 Cube is solved!';
  }

  const solvedCube = initializeCube();
  let misplaced = 0;

  for (const face of FACES) {
    for (let index = 0; index < 9; index += 1) {
      if (cube[face][index] !== solvedCube[face][index]) {
        misplaced += 1;
      }
    }
  }

  if (misplaced < 10) {
    return "💡 You're very close! Focus on the last layer.";
  }

  if (misplaced < 30) {
    return '💡 Good progress! Keep going with the middle layers.';
  }

  return '💡 Start with the white cross on the bottom.';
}

export function serializeCube(cube: CubeState): string {
  return JSON.stringify(cube);
}

export function deserializeCube(data: string): CubeState {
  return JSON.parse(data) as CubeState;
}
