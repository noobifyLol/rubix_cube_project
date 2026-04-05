import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Color, type CubeState } from '../logic/cubeLogic';
import type { SolutionMove } from '../algorithms/thistlethwaite';

export interface AnimatedMoveRequest {
  move: SolutionMove;
  token: number;
}

interface CubeRendererProps {
  cubeState: CubeState;
  isRotating: boolean;
  autoSpinEnabled: boolean;
  viewResetToken: number;
  animatedMove?: AnimatedMoveRequest | null;
  onMoveAnimationComplete?: (request: AnimatedMoveRequest) => void;
  playbackSpeed?: number;
}

type Axis = 'x' | 'y' | 'z';

interface TurnConfig {
  axis: Axis;
  layer: number;
  direction: 1 | -1;
}

interface CubeletMesh
  extends THREE.Mesh<THREE.BoxGeometry, THREE.MeshPhongMaterial[]> {
  userData: {
    basePosition: THREE.Vector3;
    grid: { x: number; y: number; z: number };
  };
}

const colorToHex: Record<Color, number> = {
  [Color.White]: 0xf8f8f8,
  [Color.Yellow]: 0xffd700,
  [Color.Red]: 0xef3b36,
  [Color.Orange]: 0xff9500,
  [Color.Green]: 0x00c853,
  [Color.Blue]: 0x1e88e5,
};

const HIDDEN_FACE_COLOR = 0x141821;
const FACE_MATERIAL_INDEX = {
  right: 0,
  left: 1,
  top: 2,
  bottom: 3,
  front: 4,
  back: 5,
} as const;

const CUBELET_SIZE = 0.94;
const CUBELET_GAP = 0.08;
const CUBELET_STEP = CUBELET_SIZE + CUBELET_GAP;
const TURN_DURATION_MS = 280;

const MOVE_TURN_CONFIG: Record<SolutionMove, TurnConfig> = {
  U: { axis: 'y', layer: 1, direction: 1 },
  "U'": { axis: 'y', layer: 1, direction: -1 },
  U2: { axis: 'y', layer: 1, direction: 1 },
  D: { axis: 'y', layer: -1, direction: -1 },
  "D'": { axis: 'y', layer: -1, direction: 1 },
  D2: { axis: 'y', layer: -1, direction: 1 },
  L: { axis: 'x', layer: -1, direction: -1 },
  "L'": { axis: 'x', layer: -1, direction: 1 },
  L2: { axis: 'x', layer: -1, direction: 1 },
  R: { axis: 'x', layer: 1, direction: 1 },
  "R'": { axis: 'x', layer: 1, direction: -1 },
  R2: { axis: 'x', layer: 1, direction: 1 },
  F: { axis: 'z', layer: 1, direction: -1 },
  "F'": { axis: 'z', layer: 1, direction: 1 },
  F2: { axis: 'z', layer: 1, direction: 1 },
  B: { axis: 'z', layer: -1, direction: 1 },
  "B'": { axis: 'z', layer: -1, direction: -1 },
  B2: { axis: 'z', layer: -1, direction: 1 },
};

const getFrontIndex = (x: number, y: number) => (1 - y) * 3 + (x + 1);
const getBackIndex = (x: number, y: number) => (1 - y) * 3 + (1 - x);
const getTopIndex = (x: number, z: number) => (z + 1) * 3 + (x + 1);
const getBottomIndex = (x: number, z: number) => (1 - z) * 3 + (x + 1);
const getLeftIndex = (y: number, z: number) => (1 - y) * 3 + (z + 1);
const getRightIndex = (y: number, z: number) => (1 - y) * 3 + (1 - z);

const DEFAULT_CAMERA_POSITION = new THREE.Vector3(6.2, 5.6, 6.2);
const DEFAULT_TARGET = new THREE.Vector3(0, 0, 0);

function easeOutCubic(progress: number) {
  return 1 - (1 - progress) ** 3;
}

function getAxisGridValue(grid: { x: number; y: number; z: number }, axis: Axis) {
  if (axis === 'x') return grid.x;
  if (axis === 'y') return grid.y;
  return grid.z;
}

export function CubeRenderer({
  cubeState,
  isRotating,
  autoSpinEnabled,
  viewResetToken,
  animatedMove,
  onMoveAnimationComplete,
  playbackSpeed = 1,
}: CubeRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const meshesRef = useRef<CubeletMesh[]>([]);
  const animationIdRef = useRef<number>(0);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cubeGroupRef = useRef<THREE.Group | null>(null);
  const isRotatingRef = useRef(isRotating);
  const autoSpinEnabledRef = useRef(autoSpinEnabled);
  const activeTurnFrameRef = useRef<number | null>(null);
  const activeTurnPivotRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    isRotatingRef.current = isRotating;
  }, [isRotating]);

  useEffect(() => {
    autoSpinEnabledRef.current = autoSpinEnabled;

    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoSpinEnabled;
    }
  }, [autoSpinEnabled]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b1020);
    scene.fog = new THREE.Fog(0x0b1020, 18, 34);

    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.copy(DEFAULT_CAMERA_POSITION);
    camera.lookAt(DEFAULT_TARGET);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = 6;
    controls.maxDistance = 11;
    controls.minPolarAngle = Math.PI / 5;
    controls.maxPolarAngle = Math.PI * 0.82;
    controls.rotateSpeed = 0.8;
    controls.zoomSpeed = 0.9;
    controls.target.copy(DEFAULT_TARGET);
    controls.autoRotate = autoSpinEnabledRef.current;
    controls.autoRotateSpeed = 1.4;
    controls.update();
    controlsRef.current = controls;

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.35);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.55);
    keyLight.position.set(7, 9, 6);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.left = -8;
    keyLight.shadow.camera.right = 8;
    keyLight.shadow.camera.top = 8;
    keyLight.shadow.camera.bottom = -8;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x8bc5ff, 0.85);
    fillLight.position.set(-6, 4, -5);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.85);
    rimLight.position.set(0, -3, -8);
    scene.add(rimLight);

    const cubeGroup = new THREE.Group();
    scene.add(cubeGroup);
    cubeGroupRef.current = cubeGroup;

    const meshes: CubeletMesh[] = [];

    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          const geometry = new THREE.BoxGeometry(CUBELET_SIZE, CUBELET_SIZE, CUBELET_SIZE);
          const materials = Array.from({ length: 6 }, () =>
            new THREE.MeshPhongMaterial({
              color: HIDDEN_FACE_COLOR,
              emissive: 0x02060f,
              shininess: 95,
            }),
          );

          const mesh = new THREE.Mesh(geometry, materials) as CubeletMesh;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          mesh.position.set(x * CUBELET_STEP, y * CUBELET_STEP, z * CUBELET_STEP);
          mesh.userData = {
            basePosition: mesh.position.clone(),
            grid: { x, y, z },
          };

          cubeGroup.add(mesh);
          meshes.push(mesh);
        }
      }
    }

    meshesRef.current = meshes;

    const resizeRenderer = () => {
      const width = Math.max(container.clientWidth, 1);
      const height = Math.max(container.clientHeight, 1);

      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };

    resizeRenderer();

    const resizeObserver = new ResizeObserver(() => {
      resizeRenderer();
    });
    resizeObserver.observe(container);

    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      controls.autoRotate = autoSpinEnabledRef.current;
      controls.autoRotateSpeed = isRotatingRef.current ? 4.2 : 1.4;
      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(animationIdRef.current);

      if (activeTurnFrameRef.current !== null) {
        cancelAnimationFrame(activeTurnFrameRef.current);
        activeTurnFrameRef.current = null;
      }

      const pivot = activeTurnPivotRef.current;
      if (pivot && cubeGroupRef.current) {
        for (const mesh of meshesRef.current) {
          cubeGroupRef.current.attach(mesh);
          mesh.position.copy(mesh.userData.basePosition);
          mesh.rotation.set(0, 0, 0);
        }
        cubeGroupRef.current.remove(pivot);
        activeTurnPivotRef.current = null;
      }

      controls.dispose();
      controlsRef.current = null;
      cubeGroupRef.current = null;

      for (const mesh of meshes) {
        mesh.geometry.dispose();
        for (const material of mesh.material) {
          material.dispose();
        }
      }

      renderer.dispose();

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    controls.object.position.copy(DEFAULT_CAMERA_POSITION);
    controls.target.copy(DEFAULT_TARGET);
    controls.update();
  }, [viewResetToken]);

  useEffect(() => {
    if (meshesRef.current.length === 0) return;

    let idx = 0;

    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          const mesh = meshesRef.current[idx];
          if (!mesh) {
            idx += 1;
            continue;
          }

          for (const material of mesh.material) {
            material.color.setHex(HIDDEN_FACE_COLOR);
          }

          if (z === 1) {
            mesh.material[FACE_MATERIAL_INDEX.front].color.setHex(
              colorToHex[cubeState.front[getFrontIndex(x, y)]],
            );
          }

          if (z === -1) {
            mesh.material[FACE_MATERIAL_INDEX.back].color.setHex(
              colorToHex[cubeState.back[getBackIndex(x, y)]],
            );
          }

          if (y === 1) {
            mesh.material[FACE_MATERIAL_INDEX.top].color.setHex(
              colorToHex[cubeState.top[getTopIndex(x, z)]],
            );
          }

          if (y === -1) {
            mesh.material[FACE_MATERIAL_INDEX.bottom].color.setHex(
              colorToHex[cubeState.bottom[getBottomIndex(x, z)]],
            );
          }

          if (x === -1) {
            mesh.material[FACE_MATERIAL_INDEX.left].color.setHex(
              colorToHex[cubeState.left[getLeftIndex(y, z)]],
            );
          }

          if (x === 1) {
            mesh.material[FACE_MATERIAL_INDEX.right].color.setHex(
              colorToHex[cubeState.right[getRightIndex(y, z)]],
            );
          }

          idx += 1;
        }
      }
    }
  }, [cubeState]);

  useEffect(() => {
    if (!animatedMove || !cubeGroupRef.current || meshesRef.current.length === 0) {
      return;
    }

    if (activeTurnFrameRef.current !== null) {
      return;
    }

    const cubeGroup = cubeGroupRef.current;
    const turnConfig = MOVE_TURN_CONFIG[animatedMove.move];
    const pivot = new THREE.Group();
    cubeGroup.add(pivot);
    activeTurnPivotRef.current = pivot;

    const rotatingMeshes = meshesRef.current.filter(
      (mesh) => getAxisGridValue(mesh.userData.grid, turnConfig.axis) === turnConfig.layer,
    );

    for (const mesh of rotatingMeshes) {
      pivot.attach(mesh);
    }

    const startedAt = performance.now();

    const finishTurn = () => {
      for (const mesh of rotatingMeshes) {
        cubeGroup.attach(mesh);
        mesh.position.copy(mesh.userData.basePosition);
        mesh.rotation.set(0, 0, 0);
        mesh.updateMatrixWorld();
      }

      cubeGroup.remove(pivot);
      activeTurnPivotRef.current = null;
      activeTurnFrameRef.current = null;
      onMoveAnimationComplete?.(animatedMove);
    };

    const animateTurn = (timestamp: number) => {
      const progress = Math.min(
        (timestamp - startedAt) / (TURN_DURATION_MS / Math.max(playbackSpeed, 0.25)),
        1,
      );
      const easedProgress = easeOutCubic(progress);
      const targetRotation = animatedMove.move.endsWith('2') ? Math.PI : Math.PI / 2;
      pivot.rotation[turnConfig.axis] =
        turnConfig.direction * easedProgress * targetRotation;

      if (progress < 1) {
        activeTurnFrameRef.current = requestAnimationFrame(animateTurn);
        return;
      }

      finishTurn();
    };

    activeTurnFrameRef.current = requestAnimationFrame(animateTurn);

    return () => {
      if (activeTurnFrameRef.current !== null) {
        cancelAnimationFrame(activeTurnFrameRef.current);
        activeTurnFrameRef.current = null;
      }

      if (activeTurnPivotRef.current === pivot) {
        for (const mesh of rotatingMeshes) {
          cubeGroup.attach(mesh);
          mesh.position.copy(mesh.userData.basePosition);
          mesh.rotation.set(0, 0, 0);
          mesh.updateMatrixWorld();
        }

        cubeGroup.remove(pivot);
        activeTurnPivotRef.current = null;
      }
    };
  }, [animatedMove, onMoveAnimationComplete, playbackSpeed]);

  return <div ref={containerRef} className="cube-renderer" />;
}
