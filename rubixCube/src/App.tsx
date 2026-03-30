import { useState, useEffect, useRef } from 'react';
import './App.css';
import { CubeRenderer } from './components/CubeRenderer';
import { Controls } from './components/Controls';
import { useInteraction } from './hooks/useInteraction';
import { initializeCube, type CubeState, type Color, isSolved, getHint, scrambleCube } from './utils/cubeLogic';

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

/**
 * INTERACTIVE DASHBOARD COMPONENT
 * Right sidebar with controls, status, and action buttons
 */
function InteractiveDashboard({
  moveCount,
  solved,
  hint,
  timeElapsed,
  onReset,
  onHintRequest,
  cube,
  onCubeChange,
  onScramble,
  autoSpinEnabled,
  onToggleAutoSpin,
  onResetView,
}: {
  moveCount: number;
  solved: boolean;
  hint: string;
  timeElapsed: number;
  onReset: () => void;
  onHintRequest: () => void;
  cube: CubeState;
  onCubeChange: (newCube: CubeState) => void;
  onScramble: () => void;
  autoSpinEnabled: boolean;
  onToggleAutoSpin: () => void;
  onResetView: () => void;
}) {
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  return (
    <div className="dashboard">
      {/* Header */}
      <h2 className="dashboard-title">Interactive Solver</h2>

      {/* Status & Connection */}
      <div className="dashboard-box status-box">
        <div className="status-header">
          <h3 className={solved ? 'solved' : 'unsolved'}>
            {solved ? '✨ SOLVED!' : '🎮 Solving'}
          </h3>
          <span className="connection-badge online">● ONLINE</span>
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

      {/* Hint Box */}
      <div className="dashboard-box hint-box">
        <h4>Hint</h4>
        <p className="hint-text">{hint}</p>
      </div>

      {/* Move Controls */}
      <div className="dashboard-box controls-box">
        <h4>Move Controls</h4>
        <Controls
          cube={cube}
          onCubeChange={onCubeChange}
        />
      </div>

      {/* Action Buttons */}
      <div className="dashboard-box action-box">
        <button className="action-btn scramble-btn" onClick={onScramble}>
          🔀 Scramble
        </button>
        <button className="action-btn hint-btn" onClick={onHintRequest}>
          💡 Get Hint
        </button>
        <button className="action-btn view-btn" onClick={onToggleAutoSpin}>
          {autoSpinEnabled ? '⏸ Stop Spin' : '▶ Auto Spin'}
        </button>
        <button className="action-btn iso-btn" onClick={onResetView}>
          🧭 Iso View
        </button>
        <button className="action-btn reset-btn" onClick={onReset}>
          🔄 Reset
        </button>
      </div>

      <p className="dashboard-note">
        Drag the 3D cube to inspect any side. Use the spin toggle when you want a fixed isometric view.
      </p>
    </div>
  );
}

/**
 * MAIN APP COMPONENT
 * Orchestrates 3D rendering, game state, and interactive dashboard
 */
function App() {
  const [cube, setCube] = useState<CubeState>(initializeCube());
  const [isRotating, setIsRotating] = useState(false);
  const [autoSpinEnabled, setAutoSpinEnabled] = useState(true);
  const [moveCount, setMoveCount] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [viewResetToken, setViewResetToken] = useState(0);
  const rotationTimeoutRef = useRef<number | null>(null);

  // Timer effect
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeElapsed((prev) => prev + 100);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    return () => {
      if (rotationTimeoutRef.current !== null) {
        window.clearTimeout(rotationTimeoutRef.current);
      }
    };
  }, []);

  const triggerRotationFeedback = () => {
    setIsRotating(true);

    if (rotationTimeoutRef.current !== null) {
      window.clearTimeout(rotationTimeoutRef.current);
    }

    rotationTimeoutRef.current = window.setTimeout(() => {
      setIsRotating(false);
      rotationTimeoutRef.current = null;
    }, 420);
  };

  // Keyboard interaction
  useInteraction((newCube) => {
    setCube(newCube);
    setMoveCount((count) => count + 1);
    triggerRotationFeedback();
  }, cube);

  const handleCubeChange = (newCube: CubeState) => {
    setCube(newCube);
    setMoveCount((count) => count + 1);
    triggerRotationFeedback();
  };

  const handleScramble = () => {
    setCube(scrambleCube(initializeCube(), 20));
    setMoveCount(0);
    setTimeElapsed(0);
    setShowHint(false);
    triggerRotationFeedback();
  };

  const handleReset = () => {
    if (rotationTimeoutRef.current !== null) {
      window.clearTimeout(rotationTimeoutRef.current);
      rotationTimeoutRef.current = null;
    }

    setCube(initializeCube());
    setMoveCount(0);
    setTimeElapsed(0);
    setShowHint(false);
    setIsRotating(false);
    setAutoSpinEnabled(true);
    setViewResetToken((token) => token + 1);
  };

  const solved = isSolved(cube);
  const hint = showHint
    ? getHint(cube)
    : "Press 'Get Hint' when you want the solver to analyze your next step.";

  return (
    <div className="app">
      {/* Main container - centered max-width */}
      <div className="app-container">
        {/* HEADER */}
        <header className="app-header">
          <h1 className="app-title">🎮 Rubik's Cube Solver</h1>
          <p className="app-subtitle">Interactive 3D Puzzle Game</p>
        </header>

        {/* MAIN CONTENT - 3D View + Dashboard */}
        <div className="main-content">
          {/* LEFT: 3D Isometric View */}
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

          {/* RIGHT: Interactive Dashboard */}
          <InteractiveDashboard
            moveCount={moveCount}
            solved={solved}
            hint={hint}
            timeElapsed={timeElapsed}
            onReset={handleReset}
            onHintRequest={() => setShowHint(true)}
            cube={cube}
            onCubeChange={handleCubeChange}
            onScramble={handleScramble}
            autoSpinEnabled={autoSpinEnabled}
            onToggleAutoSpin={() => setAutoSpinEnabled((enabled) => !enabled)}
            onResetView={() => {
              setAutoSpinEnabled(false);
              setViewResetToken((token) => token + 1);
            }}
          />
        </div>

        {/* BOTTOM: 2D Unfolded Cube View */}
        <div className="section section-2d">
          <div className="section-header">
            <h2>2D Unfolded View</h2>
            <p className="section-hint">Compact face map for checking all six sides at a glance</p>
          </div>
          <CubeFaceDisplay cube={cube} />
        </div>
      </div>
    </div>
  );
}

export default App;
