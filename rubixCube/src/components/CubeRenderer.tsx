import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { type CubeState, Color } from '../utils/cubeLogic';

interface CubeRendererProps {
  cubeState: CubeState;
  isRotating: boolean;
  autoSpinEnabled: boolean;
  viewResetToken: number;
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

const getFrontIndex = (x: number, y: number) => (1 - y) * 3 + (x + 1);
const getBackIndex = (x: number, y: number) => (1 - y) * 3 + (1 - x);
const getTopIndex = (x: number, z: number) => (z + 1) * 3 + (x + 1);
const getBottomIndex = (x: number, z: number) => (1 - z) * 3 + (x + 1);
const getLeftIndex = (y: number, z: number) => (1 - y) * 3 + (z + 1);
const getRightIndex = (y: number, z: number) => (1 - y) * 3 + (1 - z);

const DEFAULT_CAMERA_POSITION = new THREE.Vector3(6.2, 5.6, 6.2);
const DEFAULT_TARGET = new THREE.Vector3(0, 0, 0);

export function CubeRenderer({
  cubeState,
  isRotating,
  autoSpinEnabled,
  viewResetToken,
}: CubeRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const meshesRef = useRef<
    Array<THREE.Mesh<THREE.BoxGeometry, THREE.MeshPhongMaterial[]>>
  >([]);
  const animationIdRef = useRef<number>(0);
  const controlsRef = useRef<OrbitControls | null>(null);
  const isRotatingRef = useRef(isRotating);
  const autoSpinEnabledRef = useRef(autoSpinEnabled);

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

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.25);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.35);
    keyLight.position.set(7, 9, 6);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.left = -8;
    keyLight.shadow.camera.right = 8;
    keyLight.shadow.camera.top = 8;
    keyLight.shadow.camera.bottom = -8;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x8bc5ff, 0.55);
    fillLight.position.set(-6, 4, -5);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.35);
    rimLight.position.set(0, -3, -8);
    scene.add(rimLight);

    const group = new THREE.Group();
    scene.add(group);

    const cubeletSize = 0.94;
    const spacing = 0.08;
    const meshes: Array<THREE.Mesh<THREE.BoxGeometry, THREE.MeshPhongMaterial[]>> = [];

    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          const geometry = new THREE.BoxGeometry(cubeletSize, cubeletSize, cubeletSize);
          const materials = Array.from({ length: 6 }, () =>
            new THREE.MeshPhongMaterial({
              color: HIDDEN_FACE_COLOR,
              emissive: 0x02060f,
              shininess: 95,
            })
          );

          const mesh = new THREE.Mesh(geometry, materials);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          mesh.position.set(
            x * (cubeletSize + spacing),
            y * (cubeletSize + spacing),
            z * (cubeletSize + spacing)
          );

          group.add(mesh);
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
      controls.dispose();
      controlsRef.current = null;

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
            idx++;
            continue;
          }

          for (const material of mesh.material) {
            material.color.setHex(HIDDEN_FACE_COLOR);
          }

          if (z === 1) {
            mesh.material[FACE_MATERIAL_INDEX.front].color.setHex(
              colorToHex[cubeState.front[getFrontIndex(x, y)]]
            );
          }

          if (z === -1) {
            mesh.material[FACE_MATERIAL_INDEX.back].color.setHex(
              colorToHex[cubeState.back[getBackIndex(x, y)]]
            );
          }

          if (y === 1) {
            mesh.material[FACE_MATERIAL_INDEX.top].color.setHex(
              colorToHex[cubeState.top[getTopIndex(x, z)]]
            );
          }

          if (y === -1) {
            mesh.material[FACE_MATERIAL_INDEX.bottom].color.setHex(
              colorToHex[cubeState.bottom[getBottomIndex(x, z)]]
            );
          }

          if (x === -1) {
            mesh.material[FACE_MATERIAL_INDEX.left].color.setHex(
              colorToHex[cubeState.left[getLeftIndex(y, z)]]
            );
          }

          if (x === 1) {
            mesh.material[FACE_MATERIAL_INDEX.right].color.setHex(
              colorToHex[cubeState.right[getRightIndex(y, z)]]
            );
          }

          idx++;
        }
      }
    }
  }, [cubeState]);

  return <div ref={containerRef} className="cube-renderer" />;
}
