import { MOVE_FACELET_PERMUTATIONS } from './cubeLogic.js';
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
];
const CORNER_COLORS = [
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
];
const EDGE_COLORS = [
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
const TETRAD_A = new Set([0, 2, 5, 7]);
const TETRAD_B = new Set([1, 3, 4, 6]);
const SOLVED_CUBIE_STATE = createSolvedCubieState();
function cloneArray(values) {
    return [...values];
}
export function createSolvedCubieState() {
    return {
        cp: [0, 1, 2, 3, 4, 5, 6, 7],
        co: [0, 0, 0, 0, 0, 0, 0, 0],
        ep: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
        eo: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    };
}
export function cloneCubieState(cubie) {
    return {
        cp: cloneArray(cubie.cp),
        co: cloneArray(cubie.co),
        ep: cloneArray(cubie.ep),
        eo: cloneArray(cubie.eo),
    };
}
export function cubeStateToFaceletString(cube) {
    const centerToFace = new Map([
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
        const mappedFace = centerToFace.get(sticker);
        if (!mappedFace) {
            throw new Error(`Unknown sticker color '${sticker}'.`);
        }
        return mappedFace;
    })
        .join('');
}
export function faceletsToCubieState(facelets) {
    const stickers = facelets.split('');
    const cp = Array(8).fill(0);
    const co = Array(8).fill(0);
    const ep = Array(12).fill(0);
    const eo = Array(12).fill(0);
    for (let position = 0; position < 8; position += 1) {
        const colors = CORNER_FACELETS[position].map((index) => stickers[index]);
        const orientation = colors.findIndex((color) => color === 'U' || color === 'D');
        if (orientation === -1) {
            throw new Error('Invalid corner orientation in facelet string.');
        }
        const cubieIndex = CORNER_COLORS.findIndex((candidate) => candidate.every((color) => colors.includes(color)));
        if (cubieIndex === -1) {
            throw new Error('Invalid corner permutation in facelet string.');
        }
        cp[position] = cubieIndex;
        co[position] = orientation % 3;
    }
    for (let position = 0; position < 12; position += 1) {
        const colors = EDGE_FACELETS[position].map((index) => stickers[index]);
        let foundEdge = false;
        for (let cubieIndex = 0; cubieIndex < EDGE_COLORS.length; cubieIndex += 1) {
            const target = EDGE_COLORS[cubieIndex];
            if (colors[0] === target[0] && colors[1] === target[1]) {
                ep[position] = cubieIndex;
                eo[position] = 0;
                foundEdge = true;
                break;
            }
            if (colors[0] === target[1] && colors[1] === target[0]) {
                ep[position] = cubieIndex;
                eo[position] = 1;
                foundEdge = true;
                break;
            }
        }
        if (!foundEdge) {
            throw new Error('Invalid edge permutation in facelet string.');
        }
    }
    return { cp, co, ep, eo };
}
export function cubieStateToFacelets(cubie) {
    const stickers = Array(54).fill('U');
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
function applyMoveToFacelets(facelets, move) {
    const permutation = MOVE_FACELET_PERMUTATIONS[move];
    const stickers = facelets.split('');
    return permutation.map((index) => stickers[index]).join('');
}
function createMoveTransforms() {
    const transforms = {};
    const solvedFacelets = cubieStateToFacelets(SOLVED_CUBIE_STATE);
    for (const move of Object.keys(MOVE_FACELET_PERMUTATIONS)) {
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
export function applyMoveToCubieState(cubie, move) {
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
export function applyMovesToCubieState(cubie, moves) {
    return moves.reduce((currentState, move) => applyMoveToCubieState(currentState, move), cubie);
}
export function isSolvedCubieState(cubie) {
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
export function countEdgeOrientationMismatches(cubie) {
    return cubie.eo.reduce((sum, orientation) => sum + orientation, 0);
}
export function countCornerOrientationMismatches(cubie) {
    return cubie.co.reduce((sum, orientation) => sum + (orientation === 0 ? 0 : 1), 0);
}
export function countMiddleSliceMismatches(cubie) {
    let mismatches = 0;
    for (let position = 8; position < 12; position += 1) {
        if (!SLICE_EDGE_IDS.has(cubie.ep[position])) {
            mismatches += 1;
        }
    }
    return mismatches;
}
export function hasSolvedEdgeOrientation(cubie) {
    return countEdgeOrientationMismatches(cubie) === 0;
}
export function hasSolvedCornerOrientation(cubie) {
    return countCornerOrientationMismatches(cubie) === 0;
}
export function hasMiddleSliceEdges(cubie) {
    return countMiddleSliceMismatches(cubie) === 0;
}
function belongsToSameTetrad(position, cubieIndex) {
    return (TETRAD_A.has(position) && TETRAD_A.has(cubieIndex)) || (TETRAD_B.has(position) && TETRAD_B.has(cubieIndex));
}
export function countCornerTetradMismatches(cubie) {
    let mismatches = 0;
    for (let position = 0; position < 8; position += 1) {
        if (!belongsToSameTetrad(position, cubie.cp[position])) {
            mismatches += 1;
        }
    }
    return mismatches;
}
function countInversions(values) {
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
export function permutationParity(values) {
    return countInversions(values) % 2;
}
export function countSolvedCorners(cubie) {
    let solvedCorners = 0;
    for (let position = 0; position < 8; position += 1) {
        if (cubie.cp[position] === position && cubie.co[position] === 0) {
            solvedCorners += 1;
        }
    }
    return solvedCorners;
}
export function countSolvedEdges(cubie) {
    let solvedEdges = 0;
    for (let position = 0; position < 12; position += 1) {
        if (cubie.ep[position] === position && cubie.eo[position] === 0) {
            solvedEdges += 1;
        }
    }
    return solvedEdges;
}
export function isPhase1Solved(cubie) {
    return hasSolvedEdgeOrientation(cubie);
}
export function isPhase2Solved(cubie) {
    return isPhase1Solved(cubie) && hasSolvedCornerOrientation(cubie) && hasMiddleSliceEdges(cubie);
}
export function isPhase3Solved(cubie) {
    return (isPhase2Solved(cubie) &&
        countCornerTetradMismatches(cubie) === 0 &&
        permutationParity(cubie.cp) === 0 &&
        permutationParity(cubie.ep) === 0);
}
export function getSolvedFacelets() {
    return SOLVED_FACELETS;
}
export function getSolvedCubieState() {
    return cloneCubieState(SOLVED_CUBIE_STATE);
}
export function isValidCubeState(cube) {
    try {
        const facelets = cubeStateToFaceletString(cube);
        return facelets.length === SOLVED_FACELETS.length;
    }
    catch {
        return false;
    }
}
