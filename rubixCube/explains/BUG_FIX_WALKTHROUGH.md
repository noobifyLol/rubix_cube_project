# Bug Fix Walkthrough

This file explains the actual problems you were running into and what was changed to fix them.

## 1. Why the cube looked like it was not rendering correctly

The 3D cube problem was not just one bug.

It was a stack of smaller issues that all made the renderer feel broken:

### Problem A: wrong sticker-to-face mapping

The app stores cube colors in `cubeLogic.ts` as flat 3x3 arrays for each face.

The renderer then has to translate each logical sticker into a physical face on one of the 27 cubelets.

Earlier, that translation math was wrong:

- several index formulas were transposed
- some rows and columns were reversed
- the wrong sticker could land on the wrong side of the cube

So the 3D cube could show colors that did not match the real logical state.

### Problem B: left/right face materials were assigned to the wrong sides

Three.js `BoxGeometry` expects material slots in a specific order:

- right
- left
- top
- bottom
- front
- back

The earlier renderer treated left and right like they were reversed.

That meant even correct cube-state updates could still be painted onto the wrong material slot.

### Problem C: stale animation state

The animation loop was created inside a React effect that only ran once.

That loop captured the original `isRotating` value from the first render and kept using it forever.

So later React updates were not affecting the loop the way they should have.

That made the cube feel frozen, wrong, or out of sync.

### Problem D: viewport sizing made rendering less reliable

The earlier layout relied on `height: 100%` in places where the parent size could be awkward or unstable.

That can make a canvas area collapse, clip, or size incorrectly depending on layout timing.

Even when WebGL was alive, the visible result could look like the cube was not rendering properly.

## 2. What fixed the 3D renderer

The renderer fix had four parts:

### Fix 1: corrected all face-index calculations

The mapping formulas in `CubeRenderer.tsx` were rewritten so each face uses the right sticker indices from the logical cube state.

That made the 3D cube and the 2D face map agree with each other.

### Fix 2: corrected Three.js material-slot usage

The material index mapping now matches the actual `BoxGeometry` order used by Three.js.

That fixed the left/right painting issue.

### Fix 3: used live refs for motion state

Instead of letting the animation loop capture stale React values, the renderer now reads current state through refs.

That keeps the loop synchronized with the latest React state.

### Fix 4: added a safer resize/update path

The renderer now uses a `ResizeObserver` and updates the camera/renderer size directly from the actual container size.

That makes the canvas sizing much more stable inside the page layout.

## 3. Why the Shift controls felt broken

There were two separate reasons:

### Problem A: button focus blocked keyboard input

The earlier keyboard hook ignored events when the focused element was a `BUTTON`.

That sounds harmless, but in this app it mattered a lot:

1. You click a move button
2. That button keeps focus
3. You try `Shift + U`
4. The keyboard hook ignores it because a button is focused

That makes it feel like keyboard controls stopped working randomly.

### Problem B: key detection depended too much on `event.key`

The fix now prefers `event.code` when possible, so physical keys like `KeyU`, `KeyR`, and `KeyF` are mapped more reliably.

## 4. What fixed the Shift problem

The keyboard hook was updated so it now:

- still ignores real text-entry elements like `INPUT`, `TEXTAREA`, and `SELECT`
- no longer ignores `BUTTON` focus
- uses `event.code` for letter keys when available
- keeps `Shift` as the switch between clockwise and prime moves

So `Shift + U`, `Shift + R`, and the other prime moves behave more consistently.

## 5. Why the hint button looked broken

The hint text existed, but the `Get Hint` button literally had no behavior connected to it.

It was a visible button with an empty click handler.

So the UI suggested functionality that the code never actually performed.

## 6. What fixed the hint system

The app now uses a simple `showHint` state:

- before you ask for a hint, the box shows a prompt
- after you click `Get Hint`, it starts showing the current `getHint(cube)` result
- because that hint is derived from the latest cube state, it automatically updates as the cube changes
- scramble and reset turn the hint back off

This makes the hint button visibly useful without adding a full solving engine.

## 7. Why the camera/spin behavior needed work

The earlier experience only really gave you auto-rotation.

That meant:

- no proper manual orbit control
- no real "stop spinning and inspect the cube" mode
- no clean reset back to a known isometric angle

For a 3D puzzle app, that is a usability gap.

## 8. What fixed the view controls

The renderer now uses `OrbitControls`.

That adds:

- drag to orbit
- scroll to zoom
- damping for smoother movement
- an `Auto Spin` toggle
- an `Iso View` reset button

The camera now has a real default position and target:

- camera position: `(6.2, 5.6, 6.2)`
- target: `(0, 0, 0)`

So the view is a stable isometric-style angle rather than just a free-running spin.

## 9. Why the page used to feel cramped

The original layout had more height pressure from:

- the bottom face display
- the dashboard boxes
- the 3D panel sizing rules

That made it easier for the app to clip or create internal scrolling.

## 10. What fixed the layout pressure

The CSS was tightened to:

- use a stable full-viewport layout
- let the 3D area expand correctly with `flex: 1` and `min-height: 0`
- keep the 2D view compact
- rebalance the dashboard buttons and notes

That made the page fit on screen more cleanly while leaving room for the new camera controls.

## 11. One more fix that mattered

The scramble button originally did not behave like a real "start a new scramble" action.

It could behave more like a normal move update.

That was cleaned up so scramble now:

- creates a fresh scramble
- resets move count
- resets time
- clears the current hint prompt state

## 12. What still has room to improve

The app is much more correct now, but there are still future upgrades you could make:

- animate individual face turns instead of only updating state instantly
- replace the heuristic hint system with a real solving assistant
- optimize bundle size if you want a smaller production build

Those are improvements, not current breakages.
