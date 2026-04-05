import { compressMovesToHTM, invertMoves, } from '../logic/cubeLogic.js';
import { applyMoveToCubieState, applyMovesToCubieState, countCornerOrientationMismatches, countCornerTetradMismatches, countEdgeOrientationMismatches, countMiddleSliceMismatches, countSolvedCorners, countSolvedEdges, cubeStateToFaceletString, faceletsToCubieState, isPhase1Solved, isPhase2Solved, isPhase3Solved, isSolvedCubieState, permutationParity, } from '../logic/cubieState.js';
const PHASE_1_MOVES = [
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
const PHASE_2_MOVES = [
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
    'F2',
    'B2',
];
const PHASE_3_MOVES = [
    'U',
    "U'",
    'U2',
    'D',
    "D'",
    'D2',
    'L2',
    'R2',
    'F2',
    'B2',
];
const PHASE_4_MOVES = ['U2', 'D2', 'L2', 'R2', 'F2', 'B2'];
function getMoveAxis(move) {
    if (move[0] === 'L' || move[0] === 'R') {
        return 'x';
    }
    if (move[0] === 'U' || move[0] === 'D') {
        return 'y';
    }
    return 'z';
}
function createCubieKey(cubie) {
    return `${cubie.cp.join('')}:${cubie.co.join('')}:${cubie.ep.join(',')}:${cubie.eo.join('')}`;
}
function createHistoryFallback(history) {
    if (!history || history.length === 0) {
        return null;
    }
    return compressMovesToHTM(invertMoves(history));
}
function shouldPreferFallback(optimizedMoves, fallbackMoves) {
    return Boolean(fallbackMoves && fallbackMoves.length > 0 && fallbackMoves.length < optimizedMoves.length);
}
function phase1Heuristic(cubie) {
    return Math.ceil(countEdgeOrientationMismatches(cubie) / 4);
}
function phase2Heuristic(cubie) {
    return Math.max(Math.ceil(countCornerOrientationMismatches(cubie) / 4), Math.ceil(countMiddleSliceMismatches(cubie) / 4));
}
function phase3Heuristic(cubie) {
    const parityMismatch = permutationParity(cubie.cp) !== 0 || permutationParity(cubie.ep) !== 0 ? 1 : 0;
    return Math.max(Math.ceil(countCornerTetradMismatches(cubie) / 4), parityMismatch);
}
function phase4Heuristic(cubie) {
    const unsolvedCorners = 8 - countSolvedCorners(cubie);
    const unsolvedEdges = 12 - countSolvedEdges(cubie);
    return Math.max(Math.ceil(unsolvedCorners / 4), Math.ceil(unsolvedEdges / 4));
}
function buildPhasePlan(phaseDepthLimits) {
    return [
        {
            name: 'Edge Orientation',
            allowedMoves: PHASE_1_MOVES,
            maxDepth: phaseDepthLimits[0],
            isGoal: isPhase1Solved,
            heuristic: phase1Heuristic,
        },
        {
            name: 'Corner Orientation + Slice',
            allowedMoves: PHASE_2_MOVES,
            maxDepth: phaseDepthLimits[1],
            isGoal: isPhase2Solved,
            heuristic: phase2Heuristic,
        },
        {
            name: 'Tetrads + Parity',
            allowedMoves: PHASE_3_MOVES,
            maxDepth: phaseDepthLimits[2],
            isGoal: isPhase3Solved,
            heuristic: phase3Heuristic,
        },
        {
            name: 'Half-Turn Finish',
            allowedMoves: PHASE_4_MOVES,
            maxDepth: phaseDepthLimits[3],
            isGoal: isSolvedCubieState,
            heuristic: phase4Heuristic,
        },
    ];
}
export class ThistlethwaiteSolver {
    solve(cube, options = {}) {
        const faceletString = cubeStateToFaceletString(cube);
        const initialCubie = faceletsToCubieState(faceletString);
        const fallbackMoves = createHistoryFallback(options.history);
        if (isSolvedCubieState(initialCubie)) {
            return {
                faceletString,
                phaseMoves: [[], [], [], []],
                moves: [],
                strategy: 'thistlethwaite',
            };
        }
        const deadline = performance.now() + (options.timeLimitMs ?? 600);
        const phaseDepthLimits = options.phaseDepthLimits ?? [7, 10, 13, 15];
        const phases = buildPhasePlan(phaseDepthLimits);
        const phaseMoves = [];
        let currentCubie = initialCubie;
        for (const phase of phases) {
            const moves = this.solvePhase(currentCubie, phase, deadline, options.shouldCancel);
            if (moves === null) {
                if (!fallbackMoves) {
                    return null;
                }
                return {
                    faceletString,
                    phaseMoves,
                    moves: fallbackMoves,
                    strategy: 'history-fallback',
                };
            }
            phaseMoves.push(moves);
            currentCubie = applyMovesToCubieState(currentCubie, moves);
        }
        const optimizedMoves = compressMovesToHTM(phaseMoves.flat());
        if (shouldPreferFallback(optimizedMoves, fallbackMoves)) {
            return {
                faceletString,
                phaseMoves,
                moves: fallbackMoves,
                strategy: 'history-fallback',
            };
        }
        return {
            faceletString,
            phaseMoves,
            moves: optimizedMoves,
            strategy: 'thistlethwaite',
        };
    }
    solvePhase(initialCubie, phase, deadline, shouldCancel) {
        if (phase.isGoal(initialCubie)) {
            return [];
        }
        const initialBound = phase.heuristic(initialCubie);
        const path = Array(Math.max(phase.maxDepth, 1)).fill(phase.allowedMoves[0]);
        for (let bound = initialBound; bound <= phase.maxDepth; bound += 1) {
            const visited = new Map();
            const result = this.searchPhase(initialCubie, phase, 0, bound, path, '', deadline, visited, shouldCancel);
            if (Array.isArray(result)) {
                return result;
            }
            if (result === null) {
                return null;
            }
        }
        return null;
    }
    searchPhase(cubie, phase, depth, bound, path, lastAxis, deadline, visited, shouldCancel) {
        if (performance.now() > deadline || shouldCancel?.()) {
            return null;
        }
        const heuristic = phase.heuristic(cubie);
        const estimate = depth + heuristic;
        if (estimate > bound) {
            return estimate;
        }
        if (phase.isGoal(cubie)) {
            return path.slice(0, depth);
        }
        const stateKey = createCubieKey(cubie);
        const bestDepth = visited.get(stateKey);
        if (bestDepth !== undefined && bestDepth <= depth) {
            return Number.POSITIVE_INFINITY;
        }
        visited.set(stateKey, depth);
        let nextBound = Number.POSITIVE_INFINITY;
        for (const move of phase.allowedMoves) {
            const moveAxis = getMoveAxis(move);
            if (moveAxis === lastAxis) {
                continue;
            }
            path[depth] = move;
            const nextCubie = applyMoveToCubieState(cubie, move);
            const result = this.searchPhase(nextCubie, phase, depth + 1, bound, path, moveAxis, deadline, visited, shouldCancel);
            if (Array.isArray(result)) {
                return result;
            }
            if (result === null) {
                return null;
            }
            nextBound = Math.min(nextBound, result);
        }
        return nextBound;
    }
}
export { ThistlethwaiteSolver as Solver };
