/**
 * Controls Component
 * Move buttons grid with keyboard labels
 * Updated for professional dashboard layout
 */

import {
  rotateU,
  rotateD,
  rotateL,
  rotateR,
  rotateF,
  rotateB,
  rotateU_Prime,
  rotateD_Prime,
  rotateL_Prime,
  rotateR_Prime,
  rotateF_Prime,
  rotateB_Prime,
  type CubeState,
} from '../utils/cubeLogic';

interface ControlsProps {
  cube: CubeState;
  onCubeChange: (newCube: CubeState) => void;
}

export function Controls({ cube, onCubeChange }: ControlsProps) {
  const handleRotation = (rotationFn: (c: CubeState) => CubeState) => {
    onCubeChange(rotationFn(cube));
  };

  const moveButtons = [
    { label: 'U', key: 'U', fn: rotateU },
    { label: "U'", key: 'Shift+U', fn: rotateU_Prime },
    { label: 'D', key: 'D', fn: rotateD },
    { label: "D'", key: 'Shift+D', fn: rotateD_Prime },
    { label: 'L', key: 'L', fn: rotateL },
    { label: "L'", key: 'Shift+L', fn: rotateL_Prime },
    { label: 'R', key: 'R', fn: rotateR },
    { label: "R'", key: 'Shift+R', fn: rotateR_Prime },
    { label: 'F', key: 'F', fn: rotateF },
    { label: "F'", key: 'Shift+F', fn: rotateF_Prime },
    { label: 'B', key: 'B', fn: rotateB },
    { label: "B'", key: 'Shift+B', fn: rotateB_Prime },
  ];

  return (
    <div className="button-grid">
      {moveButtons.map(({ label, key, fn }) => (
        <button
          key={label}
          className="move-btn"
          onClick={() => handleRotation(fn)}
          title={`${key} - ${label}`}
        >
          <span className="move-label">{label}</span>
          <span className="move-key">{key}</span>
        </button>
      ))}
    </div>
  );
}
