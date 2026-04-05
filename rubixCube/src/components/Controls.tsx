/**
 * Controls Component
 * Move buttons grid with keyboard labels
 * Updated for professional dashboard layout
 */

import {
  MOVE_DEFINITIONS,
  type MoveName,
} from '../logic/cubeLogic';

interface ControlsProps {
  onMove: (move: MoveName) => void;
  disabled?: boolean;
}

export function Controls({ onMove, disabled = false }: ControlsProps) {
  return (
    <div className="button-grid">
      {MOVE_DEFINITIONS.map(({ name, label, keyHint }) => (
        <button
          key={name}
          type="button"
          className="move-btn"
          onClick={() => onMove(name)}
          title={`${keyHint} - ${label}`}
          disabled={disabled}
        >
          <span className="move-label">{label}</span>
          <span className="move-key">{keyHint}</span>
        </button>
      ))}
    </div>
  );
}
