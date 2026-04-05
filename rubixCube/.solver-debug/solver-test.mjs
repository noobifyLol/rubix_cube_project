import { initializeCube, applyMoves } from './logic/cubeLogic.js';
import { cubeStateToFaceletString, faceletsToCubieState, getSliceIndex } from './logic/cubieState.js';
import { ThistlethwaiteSolver } from './algorithms/thistlethwaite.js';

const solver = new ThistlethwaiteSolver();
const checks = [['R'],['L'],['D'],['U'],['F'],['B'],['R','U','R\'','U\''],['L','U','R']];
for (const moves of checks) {
  const cube = applyMoves(initializeCube(), moves);
  const cubie = faceletsToCubieState(cubeStateToFaceletString(cube));
  console.log('\nTEST', moves.join(' '), 'slice', getSliceIndex(cubie.ep), 'eo', cubie.eo.join(''), 'co', cubie.co.join(''));
  try {
    const result = solver.solve(cube, { timeLimitMs: 2000, shouldCancel: () => false });
    console.log('RESULT', result ? { strategy: result.strategy, moves: result.moves.join(' '), phases: result.phaseMoves.map((p) => p.join(' ')) } : null);
  } catch (error) {
    console.error('ERROR', error);
  }
}
