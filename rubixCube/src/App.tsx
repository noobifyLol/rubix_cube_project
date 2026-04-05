import { useCallback, useEffect, useRef, useState } from 'react';
import './App.css';
import { CubeRenderer, type AnimatedMoveRequest } from './components/CubeRenderer';
import { Controls } from './components/Controls';
import { useInteraction } from './hooks/useInteraction';
import {
  applyMove,
  applyMoves,
  generateScrambleSequence,
  getHint,
  initializeCube,
  isSolved,
  type Color,
  type CubeState,
  type MoveName,
} from './logic/cubeLogic';
import { cubeStateToFaceletString } from './logic/cubieState';
import type { SolutionMove, SolverOptions, SolverResult } from './algorithms/thistlethwaite';
import type {
  SolverWorkerRequest,
  SolverWorkerResponse,
  SolverWorkerSource,
} from './workers/solverWorkerTypes';

type SolverTone = 'online' | 'warming' | 'busy' | 'error';

interface PendingSolveRequest {
  requestId: number;
  resolve: (result: SolvePlanResponse) => void;
  reject: (error: Error) => void;
}

interface SolvePlanResponse {
  result: SolverResult | null;
  durationMs: number;
  source: SolverWorkerSource;
}

interface SolutionStats {
  durationMs: number;
  moveCount: number;
  mode: 'optimized' | 'fallback';
}

function formatDuration(durationMs: number | null) {
  if (durationMs === null) {
    return '—';
  }

  if (durationMs < 1000) {
    return `${Math.round(durationMs)}ms`;
  }

  return `${(durationMs / 1000).toFixed(2)}s`;
}

function CubeFaceDisplay({ cube }: { cube: CubeState }) {
  const renderFace = (name: string, data: Color[]) => (
    <div className="face" key={name} title={name}>
      <div className="face-label">{name.substring(0, 1).toUpperCase()}</div>
      <div className="face-grid">
        {data.map((sticker, idx) => (
          <div
            key={`${name}-${idx}`}
            className={`sticker sticker-${sticker.toLowerCase()}`}
          />
        ))}
      </div>
    </div>
  );

  return (
    <div className="faces-grid">
      {renderFace('Top', cube.top)}
      {renderFace('Front', cube.front)}
      {renderFace('Right', cube.right)}
      {renderFace('Bottom', cube.bottom)}
      {renderFace('Left', cube.left)}
      {renderFace('Back', cube.back)}
    </div>
  );
}

function InteractiveDashboard({
  moveCount,
  solved,
  hint,
  timeElapsed,
  onReset,
  onHintRequest,
  onMove,
  onScramble,
  autoSpinEnabled,
  onToggleAutoSpin,
  onResetView,
  onAutoSolve,
  onRunPlan,
  onBatchTest,
  autoSolveSteps,
  autoSolveStatus,
  activeSolveStepIndex,
  isAutoSolving,
  isPlanningSolve,
  isSolveMenuOpen,
  onToggleSolveMenu,
  solverBadgeLabel,
  solverBadgeTone,
  solverEngineDetail,
  isSolverReady,
  solutionStats,
  playbackSpeed,
  onPlaybackSpeedChange,
}: {
  moveCount: number;
  solved: boolean;
  hint: string;
  timeElapsed: number;
  onReset: () => void;
  onHintRequest: () => void;
  onMove: (move: MoveName) => void;
  onScramble: () => void;
  autoSpinEnabled: boolean;
  onToggleAutoSpin: () => void;
  onResetView: () => void;
  onAutoSolve: () => void;
  onRunPlan: () => void;
  onBatchTest: () => void;
  autoSolveSteps: SolutionMove[];
  autoSolveStatus: string;
  activeSolveStepIndex: number;
  isAutoSolving: boolean;
  isPlanningSolve: boolean;
  isSolveMenuOpen: boolean;
  onToggleSolveMenu: () => void;
  solverBadgeLabel: string;
  solverBadgeTone: SolverTone;
  solverEngineDetail: string;
  isSolverReady: boolean;
  solutionStats: SolutionStats | null;
  playbackSpeed: number;
  onPlaybackSpeedChange: (value: number) => void;
}) {
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  const autoSolveButtonLabel = !isSolverReady
    ? 'Starting...'
    : isPlanningSolve
      ? 'Planning...'
      : 'Find Plan';

  return (
    <div className="dashboard">
      <h2 className="dashboard-title">Interactive Solver</h2>

      <div className="dashboard-box status-box">
        <div className="status-header">
          <h3 className={solved ? 'solved' : 'unsolved'}>
            {solved ? 'Solved!' : 'Solving'}
          </h3>
          <span className={`connection-badge ${solverBadgeTone}`}>
            {solverBadgeLabel}
          </span>
        </div>

        <div className="status-info">
          <div className="stat-row">
            <span className="stat-label">Moves:</span>
            <strong className="stat-value">{moveCount}</strong>
          </div>
          <div className="stat-row">
            <span className="stat-label">Time:</span>
            <strong className="stat-value">{formatTime(timeElapsed)}</strong>
          </div>
          <div className="stat-row">
            <span className="stat-label">Engine:</span>
            <strong className="stat-value stat-value-secondary">{solverEngineDetail}</strong>
          </div>
        </div>
      </div>

      <div className="dashboard-box hint-box">
        <h4>Hint</h4>
        <p className="hint-text">{hint}</p>
      </div>

      <div className="dashboard-box controls-box">
        <h4>Move Controls</h4>
        <Controls onMove={onMove} disabled={isAutoSolving || isPlanningSolve} />
      </div>

      <div className="dashboard-box solve-menu-box">
        <button
          type="button"
          className="solve-menu-toggle"
          onClick={onToggleSolveMenu}
        >
          <span>Auto Solve Menu</span>
          <span>{isSolveMenuOpen ? 'Hide' : 'Show'}</span>
        </button>

        {isSolveMenuOpen ? (
          <div className="solver-box solver-box-inline">
            <div className="solver-header">
              <h4>Auto Solve Plan</h4>
              <span className="solver-pill">
                {autoSolveSteps.length > 0
                  ? `${autoSolveSteps.length} move${autoSolveSteps.length === 1 ? '' : 's'}`
                  : 'No plan yet'}
              </span>
            </div>
            <p className="solver-status">{autoSolveStatus}</p>

            {autoSolveSteps.length > 0 ? (
              <>
                <div className="solver-badge-strip" role="list" aria-label="Solution plan">
                  {autoSolveSteps.map((step, index) => (
                    <span
                      key={`${step}-${index}`}
                      className={index === activeSolveStepIndex ? 'solver-badge active' : 'solver-badge'}
                      role="listitem"
                    >
                      {step}
                    </span>
                  ))}
                </div>
                <p className="solver-stats-line">
                  {solutionStats?.mode === 'fallback' ? 'History-backed plan' : 'Found'} in{' '}
                  {formatDuration(solutionStats?.durationMs ?? null)} |{' '}
                  {solutionStats?.moveCount ?? autoSolveSteps.length} moves (HTM)
                </p>
              </>
            ) : (
              <p className="solver-empty">
                Ask for auto-solve after a scramble or a few manual moves and the plan will appear here.
              </p>
            )}

            <div className="playback-controls">
              <span className="playback-label">Playback Speed</span>
              <div className="playback-speed-group">
                {[0.5, 1, 2].map((speedOption) => (
                  <button
                    key={speedOption}
                    type="button"
                    className={
                      playbackSpeed === speedOption
                        ? 'playback-speed-chip active'
                        : 'playback-speed-chip'
                    }
                    onClick={() => onPlaybackSpeedChange(speedOption)}
                  >
                    {speedOption}x
                  </button>
                ))}
              </div>
            </div>

            <div className="solver-action-row">
              <button
                type="button"
                className="solver-run-btn"
                onClick={onRunPlan}
                disabled={autoSolveSteps.length === 0 || isPlanningSolve || isAutoSolving}
              >
                {isAutoSolving ? 'Animating...' : 'Play Plan'}
              </button>
            </div>
          </div>
        ) : (
          <p className="solve-menu-closed">
            Open this menu to review the solve plan, adjust playback speed, and animate the moves when you are ready.
          </p>
        )}
      </div>

      <div className="dashboard-box action-box">
        <button
          className="action-btn scramble-btn"
          onClick={onScramble}
          disabled={isAutoSolving || isPlanningSolve}
        >
          Scramble
        </button>
        <button
          className="action-btn hint-btn"
          onClick={onHintRequest}
          disabled={isAutoSolving || isPlanningSolve}
        >
          Get Hint
        </button>
        <button className="action-btn view-btn" onClick={onToggleAutoSpin}>
          {autoSpinEnabled ? 'Stop Spin' : 'Auto Spin'}
        </button>
        <button className="action-btn iso-btn" onClick={onResetView}>
          Iso View
        </button>
        <button
          className="action-btn auto-solve-btn"
          onClick={onAutoSolve}
          disabled={!isSolverReady || isAutoSolving || isPlanningSolve}
          title={!isSolverReady ? 'The solver worker is still starting up.' : undefined}
        >
          {autoSolveButtonLabel}
        </button>
        <button
          className="action-btn reset-btn"
          onClick={onReset}
          disabled={isAutoSolving || isPlanningSolve}
        >
          Reset
        </button>
        <button
          className="action-btn batch-test-btn"
          onClick={onBatchTest}
          disabled={!isSolverReady || isAutoSolving || isPlanningSolve}
          title="Run batch test: 10 scrambles with autosolve + 10 additional scrambles"
        >
          Batch Test
        </button>
      </div>

      <p className="dashboard-note">
        Drag the 3D cube to inspect any side. The worker plans a fast four-phase HTM solution, and Play Plan animates each move directly inside the 3D scene.
      </p>
    </div>
  );
}

function App() {
  const [cube, setCube] = useState<CubeState>(initializeCube());
  const [isRotating, setIsRotating] = useState(false);
  const [autoSpinEnabled, setAutoSpinEnabled] = useState(true);
  const [moveCount, setMoveCount] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [viewResetToken, setViewResetToken] = useState(0);
  const [moveHistory, setMoveHistory] = useState<MoveName[]>([]);
  const [autoSolveSteps, setAutoSolveSteps] = useState<SolutionMove[]>([]);
  const [autoSolveStatus, setAutoSolveStatus] = useState(
    'Auto-solve is ready whenever you want a plan for the current cube.',
  );
  const [activeSolveStepIndex, setActiveSolveStepIndex] = useState(-1);
  const [isAutoSolving, setIsAutoSolving] = useState(false);
  const [isPlanningSolve, setIsPlanningSolve] = useState(false);
  const [isSolveMenuOpen, setIsSolveMenuOpen] = useState(false);
  const [workerTone, setWorkerTone] = useState<SolverTone>('warming');
  const [workerDetail, setWorkerDetail] = useState('Starting the Thistlethwaite worker...');
  const [isWorkerReady, setIsWorkerReady] = useState(false);
  const [solvePlaybackQueue, setSolvePlaybackQueue] = useState<SolutionMove[]>([]);
  const [activeAnimatedMove, setActiveAnimatedMove] = useState<AnimatedMoveRequest | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [solutionStats, setSolutionStats] = useState<SolutionStats | null>(null);
  const rotationTimeoutRef = useRef<number | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const nextRequestIdRef = useRef(0);
  const nextAnimationTokenRef = useRef(0);
  const pendingSolveRef = useRef<PendingSolveRequest | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeElapsed((prev) => prev + 100);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const worker = new Worker(new URL('./workers/solverWorker.ts', import.meta.url), {
      type: 'module',
    });

    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<SolverWorkerResponse>) => {
      const message = event.data;

      switch (message.type) {
        case 'status': {
          if (message.status === 'ready') {
            setWorkerTone('online');
            setWorkerDetail('Thistlethwaite worker is online and ready.');
          }

          if (message.status === 'solving') {
            setWorkerTone('busy');
            setWorkerDetail('Reducing the cube through the four solver phases...');
          }

          if (message.status === 'cancelled') {
            setWorkerTone('busy');
            setWorkerDetail('A newer solve request replaced the previous one.');
          }
          break;
        }

        case 'ready': {
          setIsWorkerReady(true);
          setWorkerTone('online');
          setWorkerDetail('Thistlethwaite worker online. Fast phase-based solving is ready.');
          break;
        }

        case 'solve-result': {
          setWorkerTone('online');
          setWorkerDetail(
            message.source === 'history-fallback'
              ? `Returned the best history-backed plan in ${Math.round(message.durationMs)} ms.`
              : `Found a Thistlethwaite plan in ${Math.round(message.durationMs)} ms.`,
          );

          if (pendingSolveRef.current?.requestId === message.requestId) {
            pendingSolveRef.current.resolve({
              result: message.result,
              durationMs: message.durationMs,
              source: message.source,
            });
            pendingSolveRef.current = null;
          }
          break;
        }

        case 'error': {
          setWorkerTone('error');
          setWorkerDetail(message.message);

          if (
            pendingSolveRef.current &&
            (message.requestId === undefined || pendingSolveRef.current.requestId === message.requestId)
          ) {
            pendingSolveRef.current.reject(new Error(message.message));
            pendingSolveRef.current = null;
          }
          break;
        }
      }
    };

    worker.onerror = (event) => {
      setWorkerTone('error');
      setWorkerDetail(event.message || 'The worker crashed before it could finish the solve request.');

      if (pendingSolveRef.current) {
        pendingSolveRef.current.reject(
          new Error(event.message || 'The solver worker crashed unexpectedly.'),
        );
        pendingSolveRef.current = null;
      }
    };

    const initMessage: SolverWorkerRequest = { type: 'init' };
    worker.postMessage(initMessage);

    return () => {
      if (pendingSolveRef.current) {
        pendingSolveRef.current.reject(
          new Error('The solver worker was disposed before the request completed.'),
        );
        pendingSolveRef.current = null;
      }

      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  const clearRotationFeedback = useCallback(() => {
    if (rotationTimeoutRef.current !== null) {
      window.clearTimeout(rotationTimeoutRef.current);
      rotationTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearRotationFeedback();
    };
  }, [clearRotationFeedback]);

  const triggerRotationFeedback = useCallback(() => {
    setIsRotating(true);
    clearRotationFeedback();

    rotationTimeoutRef.current = window.setTimeout(() => {
      setIsRotating(false);
      rotationTimeoutRef.current = null;
    }, 420);
  }, [clearRotationFeedback]);

  const clearAutoSolvePanel = useCallback((statusMessage: string) => {
    setIsAutoSolving(false);
    setIsPlanningSolve(false);
    setAutoSolveSteps([]);
    setActiveSolveStepIndex(-1);
    setAutoSolveStatus(statusMessage);
    setIsSolveMenuOpen(false);
    setSolvePlaybackQueue([]);
    setActiveAnimatedMove(null);
    setSolutionStats(null);
  }, []);

  const requestSolvePlan = useCallback(
    (cubeState: CubeState, history: MoveName[], options: SolverOptions) =>
      new Promise<SolvePlanResponse>((resolve, reject) => {
        const worker = workerRef.current;
        if (!worker) {
          reject(new Error('The solver worker is not available.'));
          return;
        }

        if (!isWorkerReady) {
          reject(new Error('The solver worker is still starting.'));
          return;
        }

        // FIX: Implement single-task guard - cancel and clear old pending request
        if (pendingSolveRef.current) {
          pendingSolveRef.current.reject(new Error('A newer solve request replaced the previous one.'));
          pendingSolveRef.current = null;
          console.warn('[WORKER] Rejected old pending solve request, clearing for new task');
        }

        const requestId = ++nextRequestIdRef.current;
        pendingSolveRef.current = { requestId, resolve, reject };
        const message: SolverWorkerRequest = {
          type: 'solve',
          requestId,
          cube: cubeState,
          options,
          history,
        };

        console.log('[WORKER] Sending solve request with requestId:', requestId, 'history length:', history.length);
        worker.postMessage(message);
      }),
    [isWorkerReady],
  );

  const handleMove = (move: MoveName) => {
    if (isAutoSolving || isPlanningSolve) {
      return;
    }

    setCube((currentCube) => applyMove(currentCube, move));
    setMoveHistory((history) => [...history, move]);
    setMoveCount((count) => count + 1);
    setShowHint(false);
    triggerRotationFeedback();

    if (autoSolveSteps.length > 0 || activeSolveStepIndex >= 0) {
      clearAutoSolvePanel(
        'The cube changed, so the previous auto-solve plan was cleared. Ask again for a fresh plan.',
      );
    }
  };

  useInteraction(handleMove, isAutoSolving || isPlanningSolve);

  const handleScramble = () => {
    const scrambleMoves = generateScrambleSequence(8);
    clearRotationFeedback();
    clearAutoSolvePanel(
      'New scramble loaded. Ask for auto-solve any time to generate a fresh HTM plan.',
    );
    setCube(applyMoves(initializeCube(), scrambleMoves));
    setMoveHistory(scrambleMoves);
    setMoveCount(0);
    setTimeElapsed(0);
    setShowHint(false);
    setIsRotating(false);
  };

  const handleReset = () => {
    clearRotationFeedback();
    clearAutoSolvePanel('Cube reset to the solved state. The auto-solve plan has been cleared.');
    setCube(initializeCube());
    setMoveHistory([]);
    setMoveCount(0);
    setTimeElapsed(0);
    setShowHint(false);
    setIsRotating(false);
    setAutoSpinEnabled(true);
    setViewResetToken((token) => token + 1);
  };

  const runAutoSolve = useCallback((steps: SolutionMove[]) => {
    if (steps.length === 0) {
      setAutoSolveStatus('The solver did not return any moves for the current cube.');
      return;
    }

    setIsAutoSolving(true);
    setActiveSolveStepIndex(-1);
    setAutoSolveSteps(steps);
    setAutoSolveStatus(
      `Plan locked. Animating ${steps.length} move${steps.length === 1 ? '' : 's'} through the 3D cube now.`,
    );
    setAutoSpinEnabled(false);
    setSolvePlaybackQueue(steps);
    setActiveAnimatedMove(null);
  }, []);

  useEffect(() => {
    if (!isAutoSolving || activeAnimatedMove || solvePlaybackQueue.length === 0) {
      return;
    }

    const nextMove = solvePlaybackQueue[0];
    const nextStepIndex = autoSolveSteps.length - solvePlaybackQueue.length;

    setActiveSolveStepIndex(nextStepIndex);
    setAutoSolveStatus(
      `Animating step ${nextStepIndex + 1} of ${autoSolveSteps.length}: ${nextMove}`,
    );
    setActiveAnimatedMove({
      move: nextMove,
      token: ++nextAnimationTokenRef.current,
    });
  }, [activeAnimatedMove, autoSolveSteps.length, isAutoSolving, solvePlaybackQueue]);

  const handleAnimatedMoveComplete = useCallback(
    (completedRequest: AnimatedMoveRequest) => {
      if (
        !activeAnimatedMove ||
        completedRequest.token !== activeAnimatedMove.token ||
        completedRequest.move !== activeAnimatedMove.move
      ) {
        return;
      }

      const remainingMoves = solvePlaybackQueue.slice(1);
      const nextCube = applyMove(cube, completedRequest.move);

      setCube(nextCube);
      setMoveCount((count) => count + 1);
      triggerRotationFeedback();
      setActiveAnimatedMove(null);
      setSolvePlaybackQueue(remainingMoves);

      if (isSolved(nextCube)) {
        setSolvePlaybackQueue([]);
        // FIX: Nuke the history immediately when cube is solved
        setMoveHistory([]);
        console.log('[PLAYBACK] Cube solved! Cleared moveHistory and playback queue');
      }

      if (remainingMoves.length === 0) {
        setMoveHistory([]);
        setIsAutoSolving(false);
        setAutoSolveStatus('Auto-solve finished. The cube is back in the solved position.');
        console.log('[PLAYBACK] Playback queue empty. Stopped auto-solve and cleared moveHistory');
      }
    },
    [activeAnimatedMove, cube, solvePlaybackQueue, triggerRotationFeedback],
  );

  const handleAutoSolve = useCallback(async () => {
    if (isAutoSolving || isPlanningSolve) {
      return;
    }

    if (!isWorkerReady) {
      setIsSolveMenuOpen(true);
      setAutoSolveStatus('The solver worker is still starting. Try again in a moment.');
      return;
    }

    if (isSolved(cube)) {
      setAutoSolveSteps([]);
      setActiveSolveStepIndex(-1);
      setAutoSolveStatus('The cube is already solved, so there is nothing to auto-solve.');
      setSolutionStats(null);
      return;
    }

    // FIX: Take a fresh snapshot of the current 3D state to prevent drift
    const freshFaceletString = cubeStateToFaceletString(cube);
    console.log('[AUTOSOLVE] Fresh facelet snapshot:', freshFaceletString);

    setActiveSolveStepIndex(-1);
    setAutoSolveSteps([]);
    setIsSolveMenuOpen(true);
    setIsPlanningSolve(true);
    setSolutionStats(null);
    setAutoSolveStatus('Building a fast HTM plan with the Thistlethwaite worker...');

    try {
      const solveResponse = await requestSolvePlan(cube, moveHistory, {
        timeLimitMs: 3000,
      });

      if (!solveResponse.result || solveResponse.result.moves.length === 0) {
        setAutoSolveStatus(
          'The worker could not produce a plan for this position yet. Try another scramble or make a move and ask again.',
        );
        setSolutionStats(null);
        setAutoSolveSteps([]);
        return;
      }

      const plannedSteps = solveResponse.result.moves;
      const usedFallback = solveResponse.source === 'history-fallback';

      setAutoSolveSteps(plannedSteps);
      setSolutionStats({
        durationMs: solveResponse.durationMs,
        moveCount: plannedSteps.length,
        mode: usedFallback ? 'fallback' : 'optimized',
      });
      setAutoSolveStatus(
        usedFallback
          ? `History-backed plan ready: ${plannedSteps.length} move${plannedSteps.length === 1 ? '' : 's'} in HTM.`
          : `Phase plan ready: ${plannedSteps.length} move${plannedSteps.length === 1 ? '' : 's'} in HTM. Review it below, then press Play Plan.`,
      );
    } catch (error) {
      setAutoSolveStatus(
        error instanceof Error
          ? `The worker could not build a plan right now. (${error.message})`
          : 'The worker could not build a plan right now.',
      );
      setSolutionStats(null);
      setAutoSolveSteps([]);
    } finally {
      setIsPlanningSolve(false);
    }
    
  }, [cube, isAutoSolving, isPlanningSolve, isWorkerReady, moveHistory, requestSolvePlan]);

  const handleBatchTest = useCallback(async () => {
    if (isAutoSolving || isPlanningSolve) {
      return;
    }

    if (!isWorkerReady) {
      alert('Solver worker is still starting. Please wait.');
      return;
    }

    const results: {
      batchNum: number;
      scrambleMoves: string[];
      solveMoves: string[] | null;
      solveTime: number | null;
      error?: string;
    }[] = [];
    const phase2Scrambles: string[] = [];

    console.log('%c=== BATCH TEST ===', 'color: #00AA00; font-weight: bold;');
    console.time('Total time');

    // First 10 scrambles with autosolve
    for (let i = 1; i <= 10; i++) {
      try {
        const moveCount = Math.floor(Math.random() * 13) + 8; // 8-20 moves
        const scrambleMoves = generateScrambleSequence(moveCount);
        const scrambledCube = applyMoves(initializeCube(), scrambleMoves);

        try {
          const solveResponse = await requestSolvePlan(scrambledCube, scrambleMoves, {
            timeLimitMs: 5000,
          });

          if (solveResponse.result && solveResponse.result.moves.length > 0) {
            const solveMoves = solveResponse.result.moves;
            results.push({
              batchNum: i,
              scrambleMoves,
              solveMoves,
              solveTime: solveResponse.durationMs,
            });
            console.log(`%c[${i}/10]%c ${scrambleMoves.join(' ')} → ${solveMoves.join(' ')} (${solveResponse.durationMs}ms)`, 'color: #0099FF; font-weight: bold;', 'color: default;');
          } else {
            results.push({
              batchNum: i,
              scrambleMoves,
              solveMoves: null,
              solveTime: null,
              error: 'No solution returned',
            });
            console.log(`%c[${i}/10]%c ${scrambleMoves.join(' ')} → NO SOLUTION`, 'color: #FF6600; font-weight: bold;', 'color: default;');
          }
        } catch (error) {
          results.push({
            batchNum: i,
            scrambleMoves,
            solveMoves: null,
            solveTime: null,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          console.log(`%c[${i}/10]%c ${scrambleMoves.join(' ')} → ERROR: ${error instanceof Error ? error.message : 'Unknown'}`, 'color: #FF0000; font-weight: bold;', 'color: default;');
        }
      } catch (error) {
        console.error(`Batch ${i} error:`, error);
      }
    }

    // Second 10 scrambles (without solving)
    console.log('%cPhase 2: Additional Scrambles', 'color: #FFAA00; font-weight: bold;');
    for (let i = 1; i <= 10; i++) {
      const moveCount = Math.floor(Math.random() * 13) + 8; // 8-20 moves
      const scrambleMoves = generateScrambleSequence(moveCount);
      phase2Scrambles.push(scrambleMoves.join(' '));
    }
    console.log(phase2Scrambles.map((s, i) => `${i + 1}. ${s}`).join(' | '));

    // Summary
    const successful = results.filter((r) => r.solveMoves).length;
    const failed = results.filter((r) => !r.solveMoves).length;
    const avgSolveTime = results
      .filter((r) => r.solveTime)
      .reduce((sum, r) => sum + (r.solveTime || 0), 0) / results.filter((r) => r.solveTime).length;
    
    console.timeEnd('Total time');
    console.log(`%c✓ Complete: ${successful} solved, ${failed} failed, avg ${avgSolveTime.toFixed(2)}ms`, 'color: #00AA00; font-weight: bold;');
    console.table(results.map((r) => ({
      Batch: r.batchNum,
      Scramble: r.scrambleMoves.join(' '),
      Solution: r.solveMoves?.join(' ') || 'FAILED',
      Time: r.solveTime !== undefined ? `${r.solveTime}ms` : 'N/A',
    })));
  }, [isAutoSolving, isPlanningSolve, isWorkerReady, requestSolvePlan]);



// This is the hint part of the code


  const solved = isSolved(cube);
  const hint = showHint
    ? getHint(cube)
    : "Press 'Get Hint' when you want the solver to analyze your next step.";
  const solverBadgeTone: SolverTone = isAutoSolving || isPlanningSolve ? 'busy' : workerTone;
  const solverBadgeLabel = isAutoSolving
    ? 'AUTO'
    : isPlanningSolve
      ? 'PLAN'
      : workerTone === 'error'
        ? 'ERROR'
        : workerTone === 'online'
          ? 'ONLINE'
          : 'WARMING';

  return (
    <div className="app">
      <div className="app-container">
        <header className="app-header">
          <h1 className="app-title">Rubik&apos;s Cube Solver</h1>
          <p className="app-subtitle">
            Interactive 3D puzzle with move tracking, solve planning, and guided review.
          </p>
        </header>

        <div className="main-content">
          <div className="section section-3d">
            <div className="section-header">
              <h2>3D Isometric View</h2>
              <p className="section-hint">Drag to orbit. Scroll to zoom. Tap Iso View to reset the angle.</p>
            </div>
            <div className="viewport-3d">
              <CubeRenderer
                cubeState={cube}
                isRotating={isRotating}
                autoSpinEnabled={autoSpinEnabled}
                viewResetToken={viewResetToken}
                animatedMove={activeAnimatedMove}
                onMoveAnimationComplete={handleAnimatedMoveComplete}
                playbackSpeed={playbackSpeed}
              />
            </div>
          </div>

          <InteractiveDashboard
            moveCount={moveCount}
            solved={solved}
            hint={hint}
            timeElapsed={timeElapsed}
            onReset={handleReset}
            onHintRequest={() => setShowHint(true)}
            onMove={handleMove}
            onScramble={handleScramble}
            autoSpinEnabled={autoSpinEnabled}
            onToggleAutoSpin={() => setAutoSpinEnabled((enabled) => !enabled)}
            onResetView={() => {
              setAutoSpinEnabled(false);
              setViewResetToken((token) => token + 1);
            }}
            onAutoSolve={handleAutoSolve}
            onRunPlan={() => runAutoSolve(autoSolveSteps)}
            onBatchTest={handleBatchTest}
            autoSolveSteps={autoSolveSteps}
            autoSolveStatus={autoSolveStatus}
            activeSolveStepIndex={activeSolveStepIndex}
            isAutoSolving={isAutoSolving}
            isPlanningSolve={isPlanningSolve}
            isSolveMenuOpen={isSolveMenuOpen}
            onToggleSolveMenu={() => setIsSolveMenuOpen((open) => !open)}
            solverBadgeLabel={solverBadgeLabel}
            solverBadgeTone={solverBadgeTone}
            solverEngineDetail={workerDetail}
            isSolverReady={isWorkerReady}
            solutionStats={solutionStats}
            playbackSpeed={playbackSpeed}
            onPlaybackSpeedChange={setPlaybackSpeed}
          />
        </div>

        <div className="section section-2d">
          <div className="section-header">
            <h2>2D Unfolded View</h2>
            <p className="section-hint">Compact face map for checking all six sides at a glance.</p>
          </div>
          <CubeFaceDisplay cube={cube} />
        </div>
      </div>
    </div>
  );
}

export default App;
