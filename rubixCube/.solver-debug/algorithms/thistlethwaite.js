import { compressMovesToHTM, invertMoves, } from '../logic/cubeLogic.js';
import { applyMoveToCubieState, applyMovesToCubieState, countCornerTetradMismatches, countSolvedCorners, countSolvedEdges, cubeStateToFaceletString, faceletsToCubieState, isPhase1Solved, isPhase2Solved, isPhase3Solved, isSolvedCubieState, permutationParity, getSliceIndex, } from '../logic/cubieState.js';
// Example of how you should be loading the tables instead of building them
import pruningData from '../data/pruning-tables.json' with { type: 'json' };
// 'flip' corresponds to Edge Orientation (EO) - 2,048 states
const EDGE_ORI_PRUNING_TABLE = new Int8Array(pruningData.flip);
// 'twist' corresponds to Corner Orientation (CO) - 2,187 states
const CORNER_ORI_PRUNING_TABLE = new Int8Array(pruningData.twist);
// 'slice' tracks the 4 middle edges (E-slice) - 495 states
const SLICE_PRUNING_TABLE = new Int8Array(pruningData.slice);
console.log("EO Solved Distance:", EDGE_ORI_PRUNING_TABLE[0]); // Should be 0
console.log("CO Solved Distance:", CORNER_ORI_PRUNING_TABLE[0]); // Should be 0
console.log("Slice Solved Distance:", SLICE_PRUNING_TABLE[0]); // Should be 0
const solvedCubie = {
    cp: [0, 1, 2, 3, 4, 5, 6, 7],
    co: [0, 0, 0, 0, 0, 0, 0, 0],
    ep: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    eo: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
};
console.log("--- SOLVER IDENTITY CHECK ---");
try {
    // These MUST all be 0 for the pruning tables to work
    console.log("EO Index (Target: 0):", getEdgeOrientationIndex(solvedCubie.eo));
    console.log("CO Index (Target: 0):", getCornerOrientationIndex(solvedCubie.co));
    console.log("Slice Index (Target: 0):", getSliceIndex(solvedCubie.ep));
}
catch (e) {
    console.error("Diagnostic failed. Check your imports:", e);
}
const PHASE_1_MOVES = [
    'U', "U'", 'U2',
    'D', "D'", 'D2',
    'L', "L'", 'L2',
    'R', "R'", 'R2',
    'F', "F'", 'F2',
    'B', "B'", 'B2',
];
const PHASE_2_MOVES = [
    'U', "U'", 'U2',
    'D', "D'", 'D2',
    'L', "L'", 'L2',
    'R', "R'", 'R2',
    'F2', 'B2',
];
const PHASE_3_MOVES = [
    'U', "U'", 'U2',
    'D', "D'", 'D2',
    'L2', 'R2', 'F2', 'B2',
];
const PHASE_4_MOVES = ['U2', 'D2', 'L2', 'R2', 'F2', 'B2'];
function getMoveFace(move) {
    return move[0]; // Returns 'U', 'D', 'L', 'R', 'F', or 'B'
}
function isOppositeFace(face1, face2) {
    return ((face1 === 'U' && face2 === 'D') ||
        (face1 === 'D' && face2 === 'U') ||
        (face1 === 'L' && face2 === 'R') ||
        (face1 === 'R' && face2 === 'L') ||
        (face1 === 'F' && face2 === 'B') ||
        (face1 === 'B' && face2 === 'F'));
}
function createCubieKey(cubie) {
    return `${cubie.cp.join('')}:${cubie.co.join('')}:${cubie.ep.join(',')}:${cubie.eo.join('')}`;
}
function createPhase1Key(cubie) {
    return getEdgeOrientationIndex(cubie.eo);
}
function createPhase2Key(cubie) {
    return `${getCornerOrientationIndex(cubie.co)}:${getSliceIndex(cubie.ep)}`;
}
function createPhase3Key(cubie) {
    // Phase 3: Corner/edge tetrads (TETRAD_A positions in cp/ep)
    return `${cubie.cp.join('')}:${cubie.ep.join('')}`;
}
function createPhase4Key(cubie) {
    // Phase 4: Full state
    return createCubieKey(cubie);
}
function getEdgeOrientationIndex(eo) {
    let index = 0;
    for (let i = 0; i < 11; i++) {
        index = (index << 1) | (eo[i] & 1);
    }
    return index;
}
function getCornerOrientationIndex(co) {
    let index = 0;
    for (let i = 0; i < 7; i++) {
        index = index * 3 + co[i];
    }
    return index;
}
function createHistoryFallback(history) {
    if (!history || history.length === 0) {
        return null;
    }
    return compressMovesToHTM(invertMoves(history));
}
function phase1Heuristic(cubie) {
    const eoIndex = getEdgeOrientationIndex(cubie.eo);
    const eoDistance = EDGE_ORI_PRUNING_TABLE[eoIndex];
    if (typeof eoDistance !== 'number' || eoDistance < 0) {
        return 10;
    }
    return eoDistance;
}
function phase2Heuristic(cubie) {
    const coIndex = getCornerOrientationIndex(cubie.co);
    const coDist = CORNER_ORI_PRUNING_TABLE[coIndex];
    const sliceIdx = getSliceIndex(cubie.ep);
    const sliceDist = SLICE_PRUNING_TABLE[sliceIdx];
    const safeCoDist = typeof coDist === 'number' && coDist >= 0 ? coDist : 10;
    const safeSliceDist = typeof sliceDist === 'number' && sliceDist >= 0 ? sliceDist : 10;
    return Math.max(safeCoDist, safeSliceDist);
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
/**
 * Calculates the coordinate for the 4 middle slice edges (indices 8, 9, 10, 11).
 * There are 12C4 = 495 possible positions for these 4 edges.
 */
function buildPhasePlan(phaseDepthLimits) {
    return [
        {
            name: 'Edge Orientation',
            allowedMoves: PHASE_1_MOVES,
            maxDepth: phaseDepthLimits[0],
            isGoal: isPhase1Solved,
            heuristic: phase1Heuristic,
            createStateKey: createPhase1Key, // Phase 1: only eo array
        },
        {
            name: 'Corner Orientation + Slice',
            allowedMoves: PHASE_2_MOVES,
            maxDepth: phaseDepthLimits[1],
            isGoal: isPhase2Solved,
            heuristic: phase2Heuristic,
            createStateKey: createPhase2Key, // Phase 2: co + middle slice
        },
        {
            name: 'Tetrads + Parity',
            allowedMoves: PHASE_3_MOVES,
            maxDepth: phaseDepthLimits[2],
            isGoal: isPhase3Solved,
            heuristic: phase3Heuristic,
            createStateKey: createPhase3Key, // Phase 3: full permutations
        },
        {
            name: 'Half-Turn Finish',
            allowedMoves: PHASE_4_MOVES,
            maxDepth: phaseDepthLimits[3],
            isGoal: isSolvedCubieState,
            heuristic: phase4Heuristic,
            createStateKey: createPhase4Key, // Phase 4: full state
        },
    ];
}
export class ThistlethwaiteSolver {
    solve(cube, options = {}) {
        const faceletString = cubeStateToFaceletString(cube);
        const initialCubie = faceletsToCubieState(faceletString);
        const fallbackMoves = createHistoryFallback(options.history);
        // State validation logging
        const cpParity = permutationParity(initialCubie.cp);
        const epParity = permutationParity(initialCubie.ep);
        const isAlreadySolved = isSolvedCubieState(initialCubie);
        // FIX: Calculate edge orientation parity - sum must be even for solvable cube
        const eoSum = initialCubie.eo.reduce((sum, orientation) => sum + orientation, 0);
        const eoParityValid = eoSum % 2 === 0;
        console.log('[SOLVER STATE VALIDATION]', {
            isAlreadySolved,
            cpParity,
            epParity,
            paritiesMatch: cpParity === epParity,
            eoArray: initialCubie.eo,
            eoSum,
            eoParityValid,
            cp: initialCubie.cp,
            co: initialCubie.co,
            ep: initialCubie.ep,
        });
        // If parities don't match, cube is in impossible state
        if (cpParity !== epParity) {
            const errorMsg = `[SOLVER_ERROR_02] Phase Transition Parity Error. Handover from Phase 1 to Phase 2 failed logic check. cp parity=${cpParity}, ep parity=${epParity}`;
            console.warn(errorMsg);
        }
        // Check edge orientation parity
        if (!eoParityValid) {
            const errorMsg = `[SOLVER_ERROR_01] Edge Orientation Parity Mismatch (Sum: ${eoSum}). Physical Cube Error.`;
            console.error(errorMsg);
            return null;
        }
        if (isAlreadySolved) {
            return {
                faceletString,
                phaseMoves: [[], [], [], []],
                moves: [],
                strategy: 'thistlethwaite',
            };
        }
        const deadline = performance.now() + (options.timeLimitMs ?? 1000);
        const phaseDepthLimits = options.phaseDepthLimits ?? [14, 12, 14, 15];
        // Give Phase 1 up to 12 moves to find the orientation + slice.
        const phases = buildPhasePlan(phaseDepthLimits);
        const phaseMoves = [];
        let currentCubie = initialCubie;
        for (const phase of phases) {
            let moves = this.solvePhase(currentCubie, phase, deadline, options.shouldCancel);
            // --- RESILIENCE LOGIC ---
            // If a critical phase (Edge or Corner orientation) fails, try a deeper search
            // This specifically fixes repetitive scrambles like 'rulu' or 'lulu'
            if (moves === null && (phase.name.includes('Edge') || phase.name.includes('Corner'))) {
                console.log(`[SOLVER] Retrying ${phase.name} with depth boost (+2)...`);
                const boostedPhase = { ...phase, maxDepth: phase.maxDepth + 2 };
                moves = this.solvePhase(currentCubie, boostedPhase, deadline, options.shouldCancel);
            }
            if (moves === null) {
                const errorMsg = `[SOLVER_ERROR_03] Search Depth Exhausted in Phase: ${phase.name}.`;
                console.warn(errorMsg);
                // DEBUG_DUMP: Log the state when phase fails
                const elapsedTime = performance.now() - (deadline - (options.timeLimitMs ?? 1000));
                console.log(`[DEBUG_DUMP] Target State Failed. ` +
                    `Phase: ${phase.name}, Elapsed: ${elapsedTime.toFixed(1)}ms. ` +
                    `CP: [${currentCubie.cp.join(',')}] ` +
                    `EP: [${currentCubie.ep.join(',')}] ` +
                    `CO: [${currentCubie.co.join(',')}] ` +
                    `EO: [${currentCubie.eo.join(',')}]`);
                if (!fallbackMoves)
                    return null;
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
        return {
            faceletString,
            phaseMoves,
            moves: optimizedMoves,
            strategy: 'thistlethwaite',
        };
    }
    solvePhase(initialCubie, phase, deadline, shouldCancel) {
        if (phase.isGoal(initialCubie) && phase.heuristic(initialCubie) === 0) {
            return [];
        }
        const initialBound = phase.heuristic(initialCubie);
        const path = Array(Math.max(phase.maxDepth, 1)).fill(phase.allowedMoves[0]);
        for (let bound = initialBound; bound <= phase.maxDepth; bound += 1) {
            const visited = new Map();
            const result = this.searchPhase(initialCubie, phase, 0, bound, path, '', // lastFace: empty string = no previous move
            deadline, visited, shouldCancel);
            if (Array.isArray(result)) {
                return result;
            }
            if (result === null) {
                return null;
            }
        }
        return null;
    }
    searchPhase(cubie, phase, depth, bound, path, lastFace, // Changed from lastAxis to lastFace
    deadline, visited, shouldCancel) {
        if (performance.now() > deadline || shouldCancel?.()) {
            return null;
        }
        const heuristic = phase.heuristic(cubie);
        if (!Number.isFinite(heuristic) || heuristic < 0) {
            return Number.POSITIVE_INFINITY;
        }
        const estimate = depth + heuristic;
        if (phase.isGoal(cubie) && heuristic === 0) {
            return path.slice(0, depth);
        }
        if (estimate > bound) {
            return estimate;
        }
        // FIX: Use phase-specific key generator for optimal performance
        // Phase 1: only eo (12 chars) instead of full key (40+ chars)
        const stateKey = phase.createStateKey(cubie);
        const bestDepth = visited.get(stateKey);
        if (bestDepth !== undefined && bestDepth <= depth) {
            return Number.POSITIVE_INFINITY;
        }
        visited.set(stateKey, depth);
        let nextBound = Number.POSITIVE_INFINITY;
        for (const move of phase.allowedMoves) {
            // FIX #4: Symmetry Breaker + Sandwich Pruning
            const moveFace = getMoveFace(move);
            // 1. Don't repeat the same face consecutively
            if (moveFace === lastFace)
                continue;
            // 2. Only block opposite faces if they are out of alphabetical order
            // This prevents skipping valid paths while avoiding R L R sequences
            if (isOppositeFace(lastFace, moveFace) && lastFace > moveFace)
                continue;
            // 3. Sandwich Pruning: Block patterns like R L R or U D U
            if (depth >= 2) {
                const secondLastFace = getMoveFace(path[depth - 2]);
                if (moveFace === secondLastFace && isOppositeFace(moveFace, lastFace)) {
                    continue;
                }
            }
            path[depth] = move;
            const nextCubie = applyMoveToCubieState(cubie, move);
            const result = this.searchPhase(nextCubie, phase, depth + 1, bound, path, moveFace, // Pass the face, not the axis
            deadline, visited, shouldCancel);
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
