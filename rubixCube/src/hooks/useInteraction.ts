/**
 * useInteraction Hook
 * Handles keyboard shortcuts for cube rotations
 * 
 * Standard Rubik's Cube notation:
 * U/D = Up/Down face
 * L/R = Left/Right face
 * F/B = Front/Back face
 * ' = Prime (counter-clockwise)
 * 
 * Note: Ctrl+R and other browser shortcuts are NOT captured
 */

import { useEffect } from 'react';
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

export function useInteraction(
  onRotate: (newCube: CubeState) => void,
  cube: CubeState
) {
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Let browser/system shortcuts keep their default behavior.
      if (e.ctrlKey || e.metaKey || e.altKey || e.key === 'F5') return;

      const target = e.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
      ) {
        return;
      }

      const key = e.code.startsWith('Key')
        ? e.code.slice(3).toUpperCase()
        : e.key.toUpperCase();

      const rotations: Record<string, (c: CubeState) => CubeState> = {
        U: rotateU,
        D: rotateD,
        L: rotateL,
        R: rotateR,
        F: rotateF,
        B: rotateB,
      };

      const primeRotations: Record<string, (c: CubeState) => CubeState> = {
        U: rotateU_Prime,
        D: rotateD_Prime,
        L: rotateL_Prime,
        R: rotateR_Prime,
        F: rotateF_Prime,
        B: rotateB_Prime,
      };

      const rotation = e.shiftKey ? primeRotations[key] : rotations[key];
      if (!rotation) return;

      e.preventDefault();
      onRotate(rotation(cube));
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [onRotate, cube]);
}
