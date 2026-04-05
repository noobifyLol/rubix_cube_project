import type { CubeMove, CubeState } from '../logic/cubeLogic';
import type { SolverOptions, SolverResult } from '../algorithms/thistlethwaite';

export type SolverWorkerSource = 'thistlethwaite' | 'history-fallback';

export interface SolverWorkerInitRequest {
  type: 'init';
}

export interface SolverWorkerSolveRequest {
  type: 'solve';
  requestId: number;
  cube: CubeState;
  options: SolverOptions;
  history: CubeMove[];
}

export type SolverWorkerRequest = SolverWorkerInitRequest | SolverWorkerSolveRequest;

export interface SolverWorkerStatusResponse {
  type: 'status';
  status: 'ready' | 'solving' | 'cancelled';
}

export interface SolverWorkerReadyResponse {
  type: 'ready';
  source: SolverWorkerSource;
}

export interface SolverWorkerSolveResultResponse {
  type: 'solve-result';
  requestId: number;
  result: SolverResult | null;
  durationMs: number;
  source: SolverWorkerSource;
}

export interface SolverWorkerErrorResponse {
  type: 'error';
  message: string;
  requestId?: number;
}

export type SolverWorkerResponse =
  | SolverWorkerStatusResponse
  | SolverWorkerReadyResponse
  | SolverWorkerSolveResultResponse
  | SolverWorkerErrorResponse;
