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
  type MoveName,
} from '../logic/cubeLogic';

export function useInteraction(
  onMove: (move: MoveName) => void,
  disabled: boolean = false
) {
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (disabled) return;

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

      const clockwiseMoves: Record<string, MoveName> = {
        U: 'U',
        D: 'D',
        L: 'L',
        R: 'R',
        F: 'F',
        B: 'B',
      };

      const primeMoves: Record<string, MoveName> = {
        U: "U'",
        D: "D'",
        L: "L'",
        R: "R'",
        F: "F'",
        B: "B'",
      };

      const move = e.shiftKey ? primeMoves[key] : clockwiseMoves[key];
      if (!move) return;

      e.preventDefault();
      onMove(move);
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [disabled, onMove]);
}
