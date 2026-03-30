/**
 * Cube Logic Module
 * This module handles the abstract state of the Rubik's Cube
 * It tracks which color is on each face and provides methods to rotate faces
 * The cube has 6 faces, each with 9 squares (3x3)
 * Total: 54 stickers (color squares)
 */

// Face indices: 0=Front, 1=Back, 2=Left, 3=Right, 4=Top, 5=Bottom
export type FaceIndex = 0 | 1 | 2 | 3 | 4 | 5;

// Color enum for each sticker
export const Color = {
  White: 'white',     // Top face
  Yellow: 'yellow',   // Bottom face
  Red: 'red',         // Front face
  Orange: 'orange',   // Back face
  Green: 'green',     // Left face
  Blue: 'blue',       // Right face
} as const;

export type Color = typeof Color[keyof typeof Color];

const FACES = ['front', 'back', 'left', 'right', 'top', 'bottom'] as const;
const INITIAL_COLORS: Record<string, Color> = {
  front: Color.Red,
  back: Color.Orange,
  left: Color.Green,
  right: Color.Blue,
  top: Color.White,
  bottom: Color.Yellow,
};

/**
 * CubeState represents the complete state of a Rubik's Cube
 * Each face is a 3x3 grid stored in a flat array [0-8]
 * Array positions:
 * 0 1 2
 * 3 4 5
 * 6 7 8
 */
export interface CubeState {
  front: Color[];
  back: Color[];
  left: Color[];
  right: Color[];
  top: Color[];
  bottom: Color[];
}

/**
 * Initialize a solved Rubik's Cube
 * Each face is filled with its initial color
 */
export function initializeCube(): CubeState {
  const cube: CubeState = {} as CubeState;
  
  for (const face of FACES) {
    cube[face as keyof CubeState] = Array(9).fill(
      INITIAL_COLORS[face]
    );
  }
  
  return cube;
}

/**
 * Rotate a face 90 degrees clockwise
 * Rearranges the 9 stickers on that face
 */
function rotateFaceClockwise(face: Color[]): Color[] {
  return [
    face[6], face[3], face[0],
    face[7], face[4], face[1],
    face[8], face[5], face[2],
  ];
}

/**
 * Rotate a face 90 degrees counter-clockwise (3 clockwise rotations)
 */
function rotateFaceCounterClockwise(face: Color[]): Color[] {
  return [
    face[2], face[5], face[8],
    face[1], face[4], face[7],
    face[0], face[3], face[6],
  ];
}

/**
 * Rotate the Top face clockwise
 * Top face rotates, and the top rows of front/back/left/right are affected
 */
export function rotateU(cube: CubeState): CubeState {
  const newCube = JSON.parse(JSON.stringify(cube)) as CubeState;
  
  // Rotate top face
  newCube.top = rotateFaceClockwise(newCube.top);
  
  // Cycle the top rows: front -> right -> back -> left -> front
  const temp = newCube.front.slice(0, 3);
  newCube.front.splice(0, 3, ...newCube.left.slice(0, 3));
  newCube.left.splice(0, 3, ...newCube.back.slice(0, 3));
  newCube.back.splice(0, 3, ...newCube.right.slice(0, 3));
  newCube.right.splice(0, 3, ...temp);
  
  return newCube;
}

/**
 * Rotate the Bottom face clockwise
 * Opposite of U move
 */
export function rotateD(cube: CubeState): CubeState {
  const newCube = JSON.parse(JSON.stringify(cube)) as CubeState;
  
  // Rotate bottom face counter-clockwise (from bottom view)
  newCube.bottom = rotateFaceCounterClockwise(newCube.bottom);
  
  // Cycle the bottom rows: front -> left -> back -> right -> front
  const temp = newCube.front.slice(6, 9);
  newCube.front.splice(6, 3, ...newCube.right.slice(6, 9));
  newCube.right.splice(6, 3, ...newCube.back.slice(6, 9));
  newCube.back.splice(6, 3, ...newCube.left.slice(6, 9));
  newCube.left.splice(6, 3, ...temp);
  
  return newCube;
}

/**
 * Rotate the Left face clockwise
 */
export function rotateL(cube: CubeState): CubeState {
  const newCube = JSON.parse(JSON.stringify(cube)) as CubeState;
  
  // Rotate left face
  newCube.left = rotateFaceClockwise(newCube.left);
  
  // Cycle left column: front -> bottom -> back -> top -> front
  const temp = [newCube.front[0], newCube.front[3], newCube.front[6]];
  newCube.front[0] = newCube.top[0];
  newCube.front[3] = newCube.top[3];
  newCube.front[6] = newCube.top[6];
  
  newCube.top[0] = newCube.back[8];
  newCube.top[3] = newCube.back[5];
  newCube.top[6] = newCube.back[2];
  
  newCube.back[2] = newCube.bottom[6];
  newCube.back[5] = newCube.bottom[3];
  newCube.back[8] = newCube.bottom[0];
  
  newCube.bottom[0] = temp[0];
  newCube.bottom[3] = temp[1];
  newCube.bottom[6] = temp[2];
  
  return newCube;
}

/**
 * Rotate the Right face clockwise
 */
export function rotateR(cube: CubeState): CubeState {
  const newCube = JSON.parse(JSON.stringify(cube)) as CubeState;
  
  // Rotate right face
  newCube.right = rotateFaceClockwise(newCube.right);
  
  // Cycle right column: front -> top -> back -> bottom -> front
  const temp = [newCube.front[2], newCube.front[5], newCube.front[8]];
  newCube.front[2] = newCube.bottom[2];
  newCube.front[5] = newCube.bottom[5];
  newCube.front[8] = newCube.bottom[8];
  
  newCube.bottom[2] = newCube.back[6];
  newCube.bottom[5] = newCube.back[3];
  newCube.bottom[8] = newCube.back[0];
  
  newCube.back[0] = newCube.top[8];
  newCube.back[3] = newCube.top[5];
  newCube.back[6] = newCube.top[2];
  
  newCube.top[2] = temp[0];
  newCube.top[5] = temp[1];
  newCube.top[8] = temp[2];
  
  return newCube;
}

/**
 * Rotate the Front face clockwise
 */
export function rotateF(cube: CubeState): CubeState {
  const newCube = JSON.parse(JSON.stringify(cube)) as CubeState;
  
  // Rotate front face
  newCube.front = rotateFaceClockwise(newCube.front);
  
  // Cycle edges: top -> right -> bottom -> left -> top
  const temp = newCube.top.slice(6, 9);
  newCube.top[6] = newCube.left[8];
  newCube.top[7] = newCube.left[5];
  newCube.top[8] = newCube.left[2];
  
  newCube.left[2] = newCube.bottom[0];
  newCube.left[5] = newCube.bottom[1];
  newCube.left[8] = newCube.bottom[2];
  
  newCube.bottom[0] = newCube.right[6];
  newCube.bottom[1] = newCube.right[3];
  newCube.bottom[2] = newCube.right[0];
  
  newCube.right[0] = temp[0];
  newCube.right[3] = temp[1];
  newCube.right[6] = temp[2];
  
  return newCube;
}

/**
 * Rotate the Back face clockwise
 */
export function rotateB(cube: CubeState): CubeState {
  const newCube = JSON.parse(JSON.stringify(cube)) as CubeState;
  
  // Rotate back face
  newCube.back = rotateFaceClockwise(newCube.back);
  
  // Cycle edges: top -> left -> bottom -> right -> top
  const temp = newCube.top.slice(0, 3);
  newCube.top[0] = newCube.right[2];
  newCube.top[1] = newCube.right[5];
  newCube.top[2] = newCube.right[8];
  
  newCube.right[2] = newCube.bottom[8];
  newCube.right[5] = newCube.bottom[7];
  newCube.right[8] = newCube.bottom[6];
  
  newCube.bottom[6] = newCube.left[0];
  newCube.bottom[7] = newCube.left[3];
  newCube.bottom[8] = newCube.left[6];
  
  newCube.left[0] = temp[2];
  newCube.left[3] = temp[1];
  newCube.left[6] = temp[0];
  
  return newCube;
}

/**
 * Inverse rotations (counter-clockwise)
 */
export function rotateU_Prime(cube: CubeState): CubeState {
  return rotateU(rotateU(rotateU(cube)));
}

export function rotateD_Prime(cube: CubeState): CubeState {
  return rotateD(rotateD(rotateD(cube)));
}

export function rotateL_Prime(cube: CubeState): CubeState {
  return rotateL(rotateL(rotateL(cube)));
}

export function rotateR_Prime(cube: CubeState): CubeState {
  return rotateR(rotateR(rotateR(cube)));
}

export function rotateF_Prime(cube: CubeState): CubeState {
  return rotateF(rotateF(rotateF(cube)));
}

export function rotateB_Prime(cube: CubeState): CubeState {
  return rotateB(rotateB(rotateB(cube)));
}

/**
 * Check if the cube is solved (all faces are uniform in color)
 */
export function isSolved(cube: CubeState): boolean {
  return Object.values(cube).every((face) =>
    face.every((color: Color) => color === face[0])
  );
}

/**
 * Scramble the cube with random moves
 */
export function scrambleCube(cube: CubeState, moveCount: number = 20): CubeState {
  const moves = [
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
  ];
  
  let result = cube;
  for (let i = 0; i < moveCount; i++) {
    const randomMove = moves[Math.floor(Math.random() * moves.length)];
    result = randomMove(result);
  }
  
  return result;
}

/**
 * Get a simple solve hint using layer-by-layer method
 * In a real implementation, this would use a sophisticated solving algorithm
 */
export function getHint(cube: CubeState): string {
  if (isSolved(cube)) {
    return '🎉 Cube is solved!';
  }
  
  // Simple heuristic: count misplaced stickers
  const initialCube = initializeCube();
  let misplaced = 0;
  
  for (const face of FACES) {
    for (let i = 0; i < 9; i++) {
      if (cube[face as keyof CubeState][i] !== initialCube[face as keyof CubeState][i]) {
        misplaced++;
      }
    }
  }
  
  if (misplaced < 10) {
    return '💡 You\'re very close! Focus on the last layer.';
  } else if (misplaced < 30) {
    return '💡 Good progress! Keep going with the middle layers.';
  } else {
    return '💡 Start with the white cross on the bottom.';
  }
}

/**
 * Export/import cube state as a string for sharing
 */
export function serializeCube(cube: CubeState): string {
  return JSON.stringify(cube);
}

export function deserializeCube(data: string): CubeState {
  return JSON.parse(data) as CubeState;
}
