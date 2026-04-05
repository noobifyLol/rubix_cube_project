/// <reference lib="webworker" />

import { ThistlethwaiteSolver } from '../algorithms/thistlethwaite';
import type {
  SolverWorkerRequest,
  SolverWorkerResponse,
} from './solverWorkerTypes';

declare const self: DedicatedWorkerGlobalScope;

const solver = new ThistlethwaiteSolver();

let latestRequestedId = 0;
let queuedSolveRequest: Extract<SolverWorkerRequest, { type: 'solve' }> | null = null;
let isProcessingQueue = false;

function postWorkerMessage(message: SolverWorkerResponse) {
  self.postMessage(message);
}

async function processSolveQueue() {
  if (isProcessingQueue) {
    return;
  }

  isProcessingQueue = true;

  while (queuedSolveRequest) {
    const request = queuedSolveRequest;
    queuedSolveRequest = null;
    latestRequestedId = request.requestId;

    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });

    if (request.requestId !== latestRequestedId) {
      postWorkerMessage({ type: 'status', status: 'cancelled' });
      continue;
    }

    try {
      postWorkerMessage({ type: 'status', status: 'solving' });
      const startedAt = performance.now();
      const result = solver.solve(request.cube, {
        ...request.options,
        history: request.history,
      });
      const durationMs = performance.now() - startedAt;

      if (request.requestId !== latestRequestedId) {
        postWorkerMessage({ type: 'status', status: 'cancelled' });
        continue;
      }

      postWorkerMessage({
        type: 'solve-result',
        requestId: request.requestId,
        result,
        durationMs,
        source: result?.strategy === 'history-fallback' ? 'history-fallback' : 'thistlethwaite',
      });
    } catch (error) {
      if (request.requestId !== latestRequestedId) {
        postWorkerMessage({ type: 'status', status: 'cancelled' });
        continue;
      }

      postWorkerMessage({
        type: 'error',
        requestId: request.requestId,
        message:
          error instanceof Error
            ? error.message
            : 'The Thistlethwaite worker hit an unexpected error.',
      });
    }
  }

  isProcessingQueue = false;
}

self.onmessage = (event: MessageEvent<SolverWorkerRequest>) => {
  const message = event.data;

  if (message.type === 'init') {
    postWorkerMessage({ type: 'status', status: 'ready' });
    postWorkerMessage({ type: 'ready', source: 'thistlethwaite' });
    return;
  }

  if (message.type === 'solve') {
    queuedSolveRequest = message;
    void processSolveQueue();
  }
};

export {};
