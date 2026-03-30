# Rubik's Cube App - Current Code Explanation

This document explains how the current app works after the rendering, keyboard, hint, and camera-control fixes.

## 1. High-level architecture

The app is split into a few clear pieces:

- `src/App.tsx`
  Keeps the main React state and wires the UI together.
- `src/components/CubeRenderer.tsx`
  Builds the Three.js scene and paints cube colors onto the 3D cubelets.
- `src/components/Controls.tsx`
  Renders the move buttons for the six clockwise and six prime moves.
- `src/hooks/useInteraction.ts`
  Handles keyboard shortcuts like `U`, `R`, `F`, and `Shift + U`.
- `src/utils/cubeLogic.ts`
  Contains the actual Rubik's Cube state and all rotation logic.
- `src/App.css`
  Controls the single-screen layout, button styling, and compact dashboard.

## 2. App state in `App.tsx`

`App.tsx` is the orchestrator. It stores:

- `cube`
  The full logical cube state.
- `isRotating`
  A short-lived flag used as motion feedback after a move.
- `autoSpinEnabled`
  Toggles camera auto-rotation on and off.
- `moveCount`
  Tracks how many moves the player has made.
- `timeElapsed`
  Tracks solve time.
- `showHint`
  Decides whether the hint box should show the current solver hint or the default prompt.
- `viewResetToken`
  A simple counter used to tell the 3D renderer to snap back to the default isometric camera angle.

The top-level flow is:

1. A move happens by keyboard or button click.
2. `cube` is replaced with a new cube state from `cubeLogic.ts`.
3. `moveCount` increments.
4. `isRotating` briefly flips to `true`.
5. `CubeRenderer` receives the new state and repaints the 3D stickers.
6. The 2D face map rerenders from the same cube state.

That means the 2D and 3D views are always driven by the same source of truth.

## 3. How cube logic works

`cubeLogic.ts` stores the cube as six flat arrays:

```ts
interface CubeState {
  front: Color[];
  back: Color[];
  left: Color[];
  right: Color[];
  top: Color[];
  bottom: Color[];
}
```

Each face has 9 stickers:

```text
0 1 2
3 4 5
6 7 8
```

Every move like `rotateU`, `rotateR`, or `rotateF` returns a brand-new cube state. Nothing is mutated in React state directly.

That is important because React rerenders reliably when a fresh object is returned.

## 4. How the 3D renderer works

`CubeRenderer.tsx` creates:

- a Three.js `Scene`
- a `PerspectiveCamera`
- a `WebGLRenderer`
- three lights
- a `Group` containing 27 cubelets
- `OrbitControls` for drag/zoom/isometric inspection

Each cubelet is a small `BoxGeometry` mesh with 6 materials, one for each side.

The renderer does not rebuild the cube every time a move happens. Instead:

1. The 27 cubelets are created once.
2. On every cube-state update, the code loops through them.
3. It calculates which sticker should appear on which cubelet face.
4. It updates material colors.

This is much cheaper and more reliable than rebuilding geometry every move.

## 5. How the camera controls work

The 3D view now uses `OrbitControls`.

That gives the app:

- drag to orbit around the cube
- scroll to zoom
- damping for smoother motion
- optional auto-spin
- a reset path back to the default isometric angle

`autoSpinEnabled` turns `controls.autoRotate` on or off.

`viewResetToken` tells the renderer to put the camera back at the default isometric position:

```ts
const DEFAULT_CAMERA_POSITION = new THREE.Vector3(6.2, 5.6, 6.2);
const DEFAULT_TARGET = new THREE.Vector3(0, 0, 0);
```

So the "Iso View" button is not a CSS trick. It is a real camera reset.

## 6. How keyboard input works

`useInteraction.ts` listens for `keydown` events on `window`.

Important details:

- Browser shortcuts are allowed through.
  `Ctrl+R`, `Cmd+R`, and `F5` are not intercepted.
- Input fields are ignored.
  This avoids stealing focus from real text inputs.
- Physical keyboard codes are used when possible.
  That makes `Shift + U`, `Shift + R`, and the other prime moves more reliable.

The hook decides between clockwise and prime rotations like this:

- no `Shift` -> clockwise move
- `Shift` held -> prime move

Then it calls the callback from `App.tsx` with the new cube state.

## 7. How hints work now

Originally the hint button existed visually but did nothing.

Now the behavior is:

- before the user asks for help, the hint box shows a prompt
- when `Get Hint` is clicked, `showHint` becomes `true`
- the app starts showing the current message from `getHint(cube)`
- if the cube changes after that, the hint updates automatically because it is recalculated from the current cube state
- scramble and reset hide the hint again until requested

The hint system in `cubeLogic.ts` is still heuristic-based, not a full solver. It gives stage-level guidance, not exact solving sequences.

## 8. How the layout works

`App.css` keeps everything inside one viewport:

- the page uses `100dvh`
- root scrolling is disabled
- the main area is a two-column grid
- the 3D panel uses `flex: 1` and `min-height: 0`
- the 2D face display is compact so it does not push the page past the viewport

This is why the UI now fits much more cleanly on one screen than the earlier version.

## 9. Current limitations

A few things are intentionally simple right now:

- face turns are logical, not physically tweened per layer
- the hint system is basic, not a true solve engine
- the cube model uses standard `BoxGeometry`, not rounded geometry

That is okay because the current fixes were focused on correctness, visibility, and usability first.

## 10. Best way to read the code

If you want to understand the project in order, read the files in this sequence:

1. `src/utils/cubeLogic.ts`
2. `src/App.tsx`
3. `src/hooks/useInteraction.ts`
4. `src/components/CubeRenderer.tsx`
5. `src/components/Controls.tsx`
6. `src/App.css`

That order goes from game logic to interaction to rendering to layout.
