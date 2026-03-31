import { useEffect, useRef, useState } from 'react';
import './App.css';
import { CubeRenderer } from './components/CubeRenderer';
import { Controls } from './components/Controls';
import { useInteraction } from './hooks/useInteraction';
import {
  applyMove,
  applyMoves,
  generateScrambleSequence,
  getHint,
  initializeCube,
  invertMoves,
  isSolved,
  type Color,
  type CubeState,
  type MoveName,
} from './utils/cubeLogic';

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
  autoSolveSteps,
  autoSolveStatus,
  activeSolveStepIndex,
  isAutoSolving,
  isSolveMenuOpen,
  onToggleSolveMenu,
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
  autoSolveSteps: MoveName[];
  autoSolveStatus: string;
  activeSolveStepIndex: number;
  isAutoSolving: boolean;
  isSolveMenuOpen: boolean;
  onToggleSolveMenu: () => void;
}) {
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
  };
  return (
    <div className="dashboard">
      <h2 className="dashboard-title">Interactive Solver</h2>

      <div className="dashboard-box status-box">
        <div className="status-header">
          <h3 className={solved ? 'solved' : 'unsolved'}>
            {solved ? 'Solved!' : 'Solving'}
          </h3>
          <span className="connection-badge online">
            {isAutoSolving ? 'AUTO' : 'ONLINE'}
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
        </div>
      </div>

      


      <div className="dashboard-box hint-box">
        <h4>Hint</h4>
        <p className="hint-text">{hint}</p>
      </div>


      <div className="dashboard-box controls-box">
        <h4>Move Controls</h4>
        <Controls onMove={onMove} disabled={isAutoSolving} />
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
                  ? `${autoSolveSteps.length} step${autoSolveSteps.length === 1 ? '' : 's'}`
                  : 'No plan yet'}
              </span>
            </div>
            <p className="solver-status">{autoSolveStatus}</p>
            {autoSolveSteps.length > 0 ? (
              <ol className="solver-steps">
                {autoSolveSteps.map((step, index) => (
                  <li
                    key={`${step}-${index}`}
                    className={index === activeSolveStepIndex ? 'solver-step active' : 'solver-step'}
                  >
                    <span className="solver-step-number">{index + 1}</span>
                    <span className="solver-step-move">{step}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="solver-empty">
                Ask for auto-solve after a scramble or a few manual moves and the plan will appear here.
              </p>
            )}
          </div>
        ) : (
          <p className="solve-menu-closed">
            Open this menu to review the solve plan before the app asks whether it should run it.
          </p>
        )}
      </div>

      <div className="dashboard-box action-box">
        <button className="action-btn scramble-btn" onClick={onScramble} disabled={isAutoSolving}>
          Scramble
        </button>
        <button className="action-btn hint-btn" onClick={onHintRequest} disabled={isAutoSolving}>
          Get Hint
        </button>
        <button className="action-btn view-btn" onClick={onToggleAutoSpin}>
          {autoSpinEnabled ? 'Stop Spin' : 'Auto Spin'}
        </button>
        <button className="action-btn iso-btn" onClick={onResetView}>
          Iso View
        </button>
        <button className="action-btn auto-solve-btn" onClick={onAutoSolve} disabled={isAutoSolving}>
          {isAutoSolving ? 'Solving...' : 'Auto Solve'}
        </button>
        <button className="action-btn reset-btn" onClick={onReset} disabled={isAutoSolving}>
          Reset
        </button>
      </div>

      <p className="dashboard-note">
        Drag the 3D cube to inspect any side. Auto-solve first prints the plan, then asks whether it should perform the moves for you.
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
  const [autoSolveSteps, setAutoSolveSteps] = useState<MoveName[]>([]);
  const [autoSolveStatus, setAutoSolveStatus] = useState(
    'Auto-solve is ready whenever you want a plan for the current cube.'
  );
  const [activeSolveStepIndex, setActiveSolveStepIndex] = useState(-1);
  const [isAutoSolving, setIsAutoSolving] = useState(false);
  const [isSolveMenuOpen, setIsSolveMenuOpen] = useState(false);
  const rotationTimeoutRef = useRef<number | null>(null);
  const solveTimeoutsRef = useRef<number[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeElapsed((prev) => prev + 100);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const clearRotationFeedback = () => {
    if (rotationTimeoutRef.current !== null) {
      window.clearTimeout(rotationTimeoutRef.current);
      rotationTimeoutRef.current = null;
    }
  };

  const clearSolveTimeouts = () => {
    for (const timeoutId of solveTimeoutsRef.current) {
      window.clearTimeout(timeoutId);
    }
    solveTimeoutsRef.current = [];
  };

  useEffect(() => {
    return () => {
      clearRotationFeedback();
      clearSolveTimeouts();
    };
  }, []);

  const triggerRotationFeedback = () => {
    setIsRotating(true);
    clearRotationFeedback();

    rotationTimeoutRef.current = window.setTimeout(() => {
      setIsRotating(false);
      rotationTimeoutRef.current = null;
    }, 420);
  };

  const clearAutoSolvePanel = (statusMessage: string) => {
    clearSolveTimeouts();
    setIsAutoSolving(false);
    setAutoSolveSteps([]);
    setActiveSolveStepIndex(-1);
    setAutoSolveStatus(statusMessage);
    setIsSolveMenuOpen(false);
  };

  const handleMove = (move: MoveName) => {
    if (isAutoSolving) return;

    setCube((currentCube) => applyMove(currentCube, move));
    setMoveHistory((history) => [...history, move]);
    setMoveCount((count) => count + 1);
    setShowHint(false);
    triggerRotationFeedback();

    if (autoSolveSteps.length > 0 || activeSolveStepIndex >= 0) {
      clearAutoSolvePanel('The cube changed, so the previous auto-solve plan was cleared. Ask again for a fresh plan.');
    }
  };

  useInteraction(handleMove, isAutoSolving);

  const handleScramble = () => {
    const scrambleMoves = generateScrambleSequence(20);
    clearRotationFeedback();
    clearAutoSolvePanel('New scramble loaded. Ask for auto-solve any time to see the reverse path back to solved.');
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

  const runAutoSolve = (steps: MoveName[]) => {
    clearSolveTimeouts();
    setIsAutoSolving(true);
    setActiveSolveStepIndex(-1);
    setAutoSolveSteps(steps);
    setAutoSolveStatus(`Auto-solve is running ${steps.length} move${steps.length === 1 ? '' : 's'} now.`);
    setAutoSpinEnabled(false);

    steps.forEach((move, index) => {
      const timeoutId = window.setTimeout(() => {
        setCube((currentCube) => applyMove(currentCube, move));
        setMoveCount((count) => count + 1);
        setActiveSolveStepIndex(index);
        setAutoSolveStatus(
          `Running step ${index + 1} of ${steps.length}: ${move}`
        );
        triggerRotationFeedback();

        if (index === steps.length - 1) {
          const finishTimeoutId = window.setTimeout(() => {
            setMoveHistory([]);
            setIsAutoSolving(false);
            setAutoSolveStatus('Auto-solve finished. The cube is back in the solved position.');
          }, 380);
          solveTimeoutsRef.current.push(finishTimeoutId);
        }
      }, index * 460);

      solveTimeoutsRef.current.push(timeoutId);
    });
  };

  const handleAutoSolve = () => {
    if (isAutoSolving) return;

    if (isSolved(cube)) {
      setAutoSolveSteps([]);
      setActiveSolveStepIndex(-1);
      setAutoSolveStatus('The cube is already solved, so there is nothing to auto-solve.');
      return;
    }

    if (moveHistory.length === 0) {
      setAutoSolveSteps([]);
      setActiveSolveStepIndex(-1);
      setAutoSolveStatus(
        'There is no tracked move history yet. Scramble the cube or make a few moves first, then ask for auto-solve.'
      );
      return;
    }

    const plannedSteps = invertMoves(moveHistory);
    setAutoSolveSteps(plannedSteps);
    setActiveSolveStepIndex(-1);
    setIsSolveMenuOpen(true);
    setAutoSolveStatus(
      `Plan ready: ${plannedSteps.length} move${plannedSteps.length === 1 ? '' : 's'} will solve the current cube.`
    );

    window.setTimeout(() => {
      const shouldRun = window.confirm(
        `I found ${plannedSteps.length} move${plannedSteps.length === 1 ? '' : 's'} to solve the cube.\n\n` +
          `Steps: ${plannedSteps.join(' ')}\n\n` +
          'Do you want the app to perform those moves now?'
      );

      if (shouldRun) {
        runAutoSolve(plannedSteps);
      } else {
        setAutoSolveStatus(
          'Plan saved in the dashboard. You can review the steps and click Auto Solve again later if you want it executed.'
        );
      }
    }, 0);
  };

  const solved = isSolved(cube);
  const hint = showHint
    ? getHint(cube)
    : "Press 'Get Hint' when you want the solver to analyze your next step.";

  return (
    <div className="app">
      <div className="app-container">
        <header className="app-header">
          <h1 className="app-title">Rubik&apos;s Cube Solver</h1>
          <p className="app-subtitle">Interactive 3D puzzle with move tracking, solve planning, and guided review.</p>
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
            autoSolveSteps={autoSolveSteps}
            autoSolveStatus={autoSolveStatus}
            activeSolveStepIndex={activeSolveStepIndex}
            isAutoSolving={isAutoSolving}
            isSolveMenuOpen={isSolveMenuOpen}
            onToggleSolveMenu={() => setIsSolveMenuOpen((open) => !open)}
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
