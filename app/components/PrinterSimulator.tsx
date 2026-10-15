"use client";

import {
  Activity,
  Grid2X2,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { BufferGeometryUtils } from "three/examples/jsm/utils/BufferGeometryUtils";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { BrandMark } from "@/app/components/BrandMark";

type ModelType = "cube" | "vase" | "gear" | "pyramid";
type Point = { x: number; y: number; z: number };
type LogEntry = { id: number; line: string };
type PrintStatus = "Esperando comando..." | "Precalentando..." | "Imprimiendo modelo 3D..." | "Pausado" | "Cancelado" | "¡Completado!";

type PrinterParts = {
  carriage: THREE.Group;
  gantry: THREE.Group;
  nozzleLight: THREE.PointLight;
  spool: THREE.Group;
  spoolMaterial: THREE.MeshBasicMaterial;
  grid: THREE.GridHelper;
};

type SimulationState = {
  isPrinting: boolean;
  isPaused: boolean;
  progress: number;
  currentLayer: number;
  totalLayers: number;
  speed: number;
  hotendTemp: number;
  bedTemp: number;
  pathData: Point[][];
  pathIndex: number;
  segmentProgress: number;
  completedSegments: number;
  totalSegments: number;
  lastUiUpdate: number;
};

type PrinterRuntime = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  parts: PrinterParts;
  printedMaterial: THREE.MeshStandardMaterial;
  pendingGeometries: THREE.BufferGeometry[];
  printedMeshes: THREE.Mesh[];
  simulation: SimulationState;
  frameId: number;
  previousFrame: number;
  fpsFrames: number;
  fpsTimestamp: number;
  disposed: boolean;
};

const FILAMENT_COLORS = [
  { name: "Celeste", value: "#48c9f4" },
  { name: "Azul", value: "#3978f6" },
  { name: "Magenta", value: "#d946ef" },
  { name: "Lima", value: "#a3e635" },
  { name: "Naranja", value: "#fb923c" },
  { name: "Blanco", value: "#f8fafc" },
];

const INITIAL_SIMULATION: SimulationState = {
  isPrinting: false,
  isPaused: false,
  progress: 0,
  currentLayer: 0,
  totalLayers: 0,
  speed: 1,
  hotendTemp: 25,
  bedTemp: 22,
  pathData: [],
  pathIndex: 0,
  segmentProgress: 0,
  completedSegments: 0,
  totalSegments: 0,
  lastUiUpdate: 0,
};

function generateSlicePaths(modelType: ModelType): Point[][] {
  const paths: Point[][] = [];
  const numLayers = modelType === "vase" ? 40 : modelType === "gear" ? 25 : 30;

  for (let layer = 0; layer < numLayers; layer++) {
    const y = 1.1 + layer * 0.15;
    const points: Point[] = [];

    if (modelType === "cube" || modelType === "pyramid") {
      const size = modelType === "cube" ? 2.5 : Math.max(0.3, 3.2 - layer * 0.1);
      const steps = modelType === "cube" ? 10 : 8;

      for (let index = 0; index <= steps; index++) {
        const t = index / steps;
        points.push({ x: -size + t * size * 2, y, z: -size });
        points.push({ x: size, y, z: -size + t * size * 2 });
        points.push({ x: size - t * size * 2, y, z: size });
        points.push({ x: -size, y, z: size - t * size * 2 });
      }
    } else if (modelType === "vase") {
      const radius = 1.8 + Math.sin(layer * 0.2) * 0.6;
      for (let index = 0; index <= 20; index++) {
        const angle = (index / 20) * Math.PI * 2;
        points.push({ x: Math.cos(angle) * radius, y, z: Math.sin(angle) * radius });
      }
    } else {
      for (let index = 0; index <= 24; index++) {
        const angle = (index / 24) * Math.PI * 2;
        const radius = index % 2 === 0 ? 2.6 : 2;
        points.push({ x: Math.cos(angle) * radius, y, z: Math.sin(angle) * radius });
      }
    }

    paths.push(points);
  }

  return paths;
}

class SoundEffects {
  private context: AudioContext | null = null;
  private lastStepperSound = 0;
  enabled = true;

  async initialize() {
    if (!this.context) {
      this.context = new AudioContext();
    }
    if (this.context.state === "suspended") {
      await this.context.resume();
    }
  }

  playStepper() {
    if (!this.enabled || !this.context || this.context.state !== "running") return;
    const now = performance.now();
    if (now - this.lastStepperSound < 40) return;
    this.lastStepperSound = now;
    this.playTone("sawtooth", 140 + Math.random() * 60, 0.008, 0.04);
  }

  playClick() {
    if (this.enabled && this.context?.state === "running") {
      this.playTone("sine", 600, 0.02, 0.06);
    }
  }

  close() {
    const context = this.context;
    this.context = null;
    if (context && context.state !== "closed") {
      void context.close();
    }
  }

  private playTone(
    type: OscillatorType,
    frequency: number,
    volume: number,
    duration: number,
  ) {
    if (!this.context) return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, this.context.currentTime);
    gain.gain.setValueAtTime(volume, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.context.currentTime + duration);
    oscillator.connect(gain);
    gain.connect(this.context.destination);
    oscillator.start();
    oscillator.stop(this.context.currentTime + duration);
  }
}

function disposeObjectTree(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  root.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      geometries.add(object.geometry);
      const objectMaterials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      objectMaterials.forEach((material) => {
        materials.add(material);
      });
    }
  });
  geometries.forEach((geometry) => {
    geometry.dispose();
  });
  materials.forEach((material) => {
    material.dispose();
  });
}

function buildPrinter(
  scene: THREE.Scene,
  filamentColor: string,
  grid: THREE.GridHelper,
): PrinterParts {
  const frameMaterial = new THREE.MeshStandardMaterial({
    color: 0x26384c,
    metalness: 0.55,
    roughness: 0.38,
  });
  const darkMaterial = new THREE.MeshStandardMaterial({
    color: 0x0b1420,
    metalness: 0.25,
    roughness: 0.55,
  });
  const hotendMaterial = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.7,
    roughness: 0.3,
  });

  const addBox = (
    parent: THREE.Object3D,
    material: THREE.Material,
    x: number,
    y: number,
    z: number,
    width: number,
    height: number,
    depth: number,
  ) => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, depth),
      material,
    );
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };

  const printer = new THREE.Group();
  addBox(printer, darkMaterial, 0, 0.35, 0, 11, 0.65, 11);
  addBox(printer, frameMaterial, 0, 0.72, 0, 8.2, 0.16, 8.2);

  [-5, 5].forEach((x) => {
    [-5, 5].forEach((z) => {
      addBox(printer, frameMaterial, x, 5.6, z, 0.32, 10.4, 0.32);
    });
  });

  addBox(printer, frameMaterial, 0, 10.75, -5, 10.3, 0.32, 0.32);
  addBox(printer, frameMaterial, 0, 10.75, 5, 10.3, 0.32, 0.32);
  addBox(printer, frameMaterial, -5, 10.75, 0, 0.32, 0.32, 10.3);
  addBox(printer, frameMaterial, 5, 10.75, 0, 0.32, 0.32, 10.3);

  const gantry = new THREE.Group();
  addBox(gantry, frameMaterial, 0, 0, 0, 10, 0.42, 0.45);
  const carriage = new THREE.Group();
  addBox(carriage, darkMaterial, 0, -0.15, 0, 1.25, 0.85, 0.95);
  addBox(carriage, hotendMaterial, 0, -0.68, 0, 0.38, 0.85, 0.38);
  const nozzle = new THREE.Mesh(
    new THREE.ConeGeometry(0.16, 0.38, 6),
    new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.5 }),
  );
  nozzle.rotation.x = Math.PI;
  nozzle.position.y = -1.25;
  carriage.add(nozzle);

  const nozzleLight = new THREE.PointLight(0x48c9f4, 0, 3);
  nozzleLight.position.set(0, -1.1, 0);
  carriage.add(nozzleLight);
  gantry.add(carriage);
  printer.add(gantry);

  const spool = new THREE.Group();
  spool.position.set(-3.3, 8.8, -5);
  const outerSpoolMaterial = new THREE.MeshStandardMaterial({
    color: 0x172334,
    metalness: 0.35,
    roughness: 0.45,
  });
  const outerSpool = new THREE.Mesh(
    new THREE.CylinderGeometry(1.55, 1.55, 0.75, 24),
    outerSpoolMaterial,
  );
  outerSpool.rotation.z = Math.PI / 2;
  spool.add(outerSpool);

  const spoolMaterial = new THREE.MeshBasicMaterial({ color: filamentColor });
  const filament = new THREE.Mesh(
    new THREE.CylinderGeometry(1.22, 1.22, 0.72, 24),
    spoolMaterial,
  );
  filament.rotation.z = Math.PI / 2;
  spool.add(filament);
  printer.add(spool);
  scene.add(printer);

  return { carriage, gantry, nozzleLight, spool, spoolMaterial, grid };
}

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export function PrinterSimulator() {
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<PrinterRuntime | null>(null);
  const soundRef = useRef<SoundEffects | null>(null);
  const soundEnabledRef = useRef(true);
  const logSequenceRef = useRef(0);
  const [model, setModel] = useState<ModelType>("cube");
  const [filamentColor, setFilamentColor] = useState(FILAMENT_COLORS[0].value);
  const [speed, setSpeed] = useState(1);
  const [progress, setProgress] = useState(0);
  const [currentLayer, setCurrentLayer] = useState(0);
  const [totalLayers, setTotalLayers] = useState(0);
  const [hotendTemp, setHotendTemp] = useState(25);
  const [bedTemp, setBedTemp] = useState(22);
  const [status, setStatus] = useState<PrintStatus>("Esperando comando...");
  const [remaining, setRemaining] = useState("00:00");
  const [fps, setFps] = useState(60);
  const [logs, setLogs] = useState<LogEntry[]>([
    { id: logSequenceRef.current++, line: "// Sistema listo. Seleccioná un modelo para comenzar." },
  ]);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const appendLog = useCallback((line: string) => {
    setLogs((current) => [
      ...current.slice(-29),
      { id: logSequenceRef.current++, line },
    ]);
  }, []);

  useEffect(() => {
    const host = canvasHostRef.current;
    if (!host) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#0c1725");
    scene.fog = new THREE.Fog("#0c1725", 21, 42);

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(14, 12, 17);
    camera.lookAt(0, 4.5, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    host.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xc4e2ff, 0x172238, 1.35));
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(9, 15, 8);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    scene.add(keyLight);
    const fillLight = new THREE.PointLight(0x3b82f6, 22, 28);
    fillLight.position.set(-8, 8, -7);
    scene.add(fillLight);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(70, 70),
      new THREE.MeshStandardMaterial({ color: 0x0c1725, roughness: 0.9 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.04;
    ground.receiveShadow = true;
    scene.add(ground);

    const grid = new THREE.GridHelper(18, 36, 0x285271, 0x1a344b);
    grid.position.y = 0.02;
    scene.add(grid);

    const parts = buildPrinter(scene, FILAMENT_COLORS[0].value, grid);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.target.set(0, 4.5, 0);
    controls.minDistance = 8;
    controls.maxDistance = 35;
    controls.maxPolarAngle = Math.PI * 0.48;

    const runtime: PrinterRuntime = {
      scene,
      camera,
      renderer,
      controls,
      parts,
      printedMaterial: new THREE.MeshStandardMaterial({
        color: FILAMENT_COLORS[0].value,
        roughness: 0.32,
        metalness: 0.04,
      }),
      pendingGeometries: [],
      printedMeshes: [],
      simulation: { ...INITIAL_SIMULATION },
      frameId: 0,
      previousFrame: 0,
      fpsFrames: 0,
      fpsTimestamp: 0,
      disposed: false,
    };
    runtimeRef.current = runtime;

    const resize = () => {
      const width = host.clientWidth;
      const height = host.clientHeight;
      if (!width || !height) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    resize();

    const disposePrintedGeometry = () => {
      runtime.pendingGeometries.forEach((geometry) => {
        geometry.dispose();
      });
      runtime.pendingGeometries = [];
      runtime.printedMeshes.forEach((mesh) => {
        scene.remove(mesh);
        mesh.geometry.dispose();
      });
      runtime.printedMeshes = [];
    };

    const mergePrintedGeometry = () => {
      if (!runtime.pendingGeometries.length) return;
      const merged = BufferGeometryUtils.mergeBufferGeometries(
        runtime.pendingGeometries,
        false,
      );
      runtime.pendingGeometries.forEach((geometry) => {
        geometry.dispose();
      });
      runtime.pendingGeometries = [];
      if (!merged) {
        setErrorMessage("No se pudo combinar la geometría de impresión.");
        return;
      }
      const mesh = new THREE.Mesh(merged, runtime.printedMaterial);
      mesh.castShadow = true;
      scene.add(mesh);
      runtime.printedMeshes.push(mesh);
    };

    const addSegment = (from: Point, to: Point) => {
      const start = new THREE.Vector3(from.x, from.y, from.z);
      const end = new THREE.Vector3(to.x, to.y, to.z);
      const geometry = new THREE.TubeGeometry(
        new THREE.LineCurve3(start, end),
        1,
        0.075,
        5,
        false,
      );
      runtime.pendingGeometries.push(geometry);
      if (runtime.pendingGeometries.length >= 12) mergePrintedGeometry();
    };

    const tick = (time: number) => {
      if (runtime.disposed) return;
      runtime.frameId = window.requestAnimationFrame(tick);
      const delta = runtime.previousFrame
        ? Math.min((time - runtime.previousFrame) / 1000, 0.05)
        : 0;
      runtime.previousFrame = time;

      runtime.fpsFrames++;
      if (time - runtime.fpsTimestamp >= 700) {
        const elapsed = time - runtime.fpsTimestamp;
        if (runtime.fpsTimestamp) setFps(Math.round((runtime.fpsFrames * 1000) / elapsed));
        runtime.fpsFrames = 0;
        runtime.fpsTimestamp = time;
      }

      const simulation = runtime.simulation;
      if (simulation.isPrinting && !simulation.isPaused) {
        if (simulation.hotendTemp < 215 || simulation.bedTemp < 60) {
          simulation.hotendTemp = Math.min(215, simulation.hotendTemp + delta * 120);
          simulation.bedTemp = Math.min(60, simulation.bedTemp + delta * 35);
          setStatus("Precalentando...");
          if (time - simulation.lastUiUpdate > 100) {
            setHotendTemp(Math.round(simulation.hotendTemp));
            setBedTemp(Math.round(simulation.bedTemp));
            simulation.lastUiUpdate = time;
          }
        } else {
          setStatus("Imprimiendo modelo 3D...");
          const layerPoints = simulation.pathData[simulation.currentLayer];

          if (layerPoints) {
            simulation.segmentProgress += delta * 12 * simulation.speed;
            const point = layerPoints[simulation.pathIndex];
            const nextPoint = layerPoints[simulation.pathIndex + 1];

            if (point && nextPoint) {
              const interpolation = Math.min(simulation.segmentProgress, 1);
              runtime.parts.carriage.position.set(
                THREE.MathUtils.lerp(point.x, nextPoint.x, interpolation),
                0,
                THREE.MathUtils.lerp(point.z, nextPoint.z, interpolation),
              );
              runtime.parts.gantry.position.y = point.y;
            }

            if (simulation.segmentProgress >= 1 && point && nextPoint) {
              simulation.segmentProgress -= 1;
              addSegment(point, nextPoint);
              runtime.parts.carriage.position.set(nextPoint.x, 0, nextPoint.z);
              runtime.parts.gantry.position.y = nextPoint.y;
              runtime.parts.spool.rotation.x += 0.05;
              simulation.pathIndex++;
              simulation.completedSegments++;
              soundRef.current?.playStepper();

              if (simulation.pathIndex >= layerPoints.length - 1) {
                simulation.currentLayer++;
                simulation.pathIndex = 0;
                if (simulation.currentLayer >= simulation.totalLayers) {
                  mergePrintedGeometry();
                  simulation.isPrinting = false;
                  runtime.parts.nozzleLight.intensity = 0;
                  runtime.parts.gantry.position.y = 10.75;
                  runtime.parts.carriage.position.set(0, 0, 0);
                  simulation.progress = 100;
                  setProgress(100);
                  setStatus("¡Completado!");
                  setIsPrinting(false);
                  setIsPaused(false);
                  appendLog("; IMPRESIÓN COMPLETADA");
                }
              }
            }
          }

          simulation.progress = simulation.totalSegments
            ? Math.min(100, Math.round((simulation.completedSegments / simulation.totalSegments) * 100))
            : 0;

          if (time - simulation.lastUiUpdate > 100) {
            const secondsLeft = Math.max(
              0,
              Math.round(((100 - simulation.progress) * 0.35) / simulation.speed),
            );
            setProgress(simulation.progress);
            setCurrentLayer(Math.min(simulation.currentLayer + 1, simulation.totalLayers));
            setRemaining(formatTime(secondsLeft));
            simulation.lastUiUpdate = time;
          }
        }
      }

      runtime.controls.update();
      runtime.renderer.render(runtime.scene, runtime.camera);
    };
    runtime.frameId = window.requestAnimationFrame(tick);

    return () => {
      runtime.disposed = true;
      window.cancelAnimationFrame(runtime.frameId);
      resizeObserver.disconnect();
      controls.dispose();
      disposePrintedGeometry();
      disposeObjectTree(scene);
      grid.geometry.dispose();
      if (Array.isArray(grid.material)) {
        grid.material.forEach((material) => {
          material.dispose();
        });
      } else {
        grid.material.dispose();
      }
      runtime.printedMaterial.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      soundRef.current?.close();
      soundRef.current = null;
      runtimeRef.current = null;
    };
  }, [appendLog]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    runtime.simulation.speed = speed;
    runtime.parts.spoolMaterial.color.set(filamentColor);
    runtime.printedMaterial.color.set(filamentColor);
    runtime.parts.grid.visible = showGrid;
  }, [filamentColor, showGrid, speed]);

  const clearPrintedModel = () => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    runtime.pendingGeometries.forEach((geometry) => {
      geometry.dispose();
    });
    runtime.pendingGeometries = [];
    runtime.printedMeshes.forEach((mesh) => {
      runtime.scene.remove(mesh);
      mesh.geometry.dispose();
    });
    runtime.printedMeshes = [];
  };

  const handleStart = async () => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    setErrorMessage("");
    try {
      if (!soundRef.current) soundRef.current = new SoundEffects();
      soundRef.current.enabled = soundEnabledRef.current;
      await soundRef.current.initialize();
      soundRef.current.playClick();
    } catch (error) {
      console.error("No se pudo inicializar el audio del simulador:", error);
      setErrorMessage("El audio no está disponible en este navegador. Podés continuar sin sonido.");
    }

    if (runtime.simulation.isPaused) {
      runtime.simulation.isPaused = false;
      runtime.simulation.isPrinting = true;
      setIsPaused(false);
      setIsPrinting(true);
      setStatus("Imprimiendo modelo 3D...");
      appendLog("; IMPRESIÓN REANUDADA");
      return;
    }

    clearPrintedModel();
    const pathData = generateSlicePaths(model);
    const totalSegments = pathData.reduce(
      (total, layer) => total + Math.max(0, layer.length - 1),
      0,
    );
    runtime.simulation = {
      ...INITIAL_SIMULATION,
      speed,
      pathData,
      totalLayers: pathData.length,
      totalSegments,
      isPrinting: true,
    };
    setHotendTemp(25);
    setBedTemp(22);
    runtime.parts.nozzleLight.intensity = 1.8;
    setProgress(0);
    setCurrentLayer(0);
    setTotalLayers(pathData.length);
    setRemaining("00:00");
    setIsPrinting(true);
    setIsPaused(false);
    setStatus("Precalentando...");
    appendLog("; INICIO DE IMPRESIÓN VIRTUAL");
    appendLog("M107 ; Ventilador activo");
    appendLog("M104 S215 ; Calentar hotend");
    appendLog("G28 ; Calibración inicial");
  };

  const handlePause = () => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    runtime.simulation.isPaused = true;
    runtime.simulation.isPrinting = false;
    runtime.parts.nozzleLight.intensity = 0;
    soundRef.current?.playClick();
    setIsPaused(true);
    setIsPrinting(false);
    setStatus("Pausado");
    appendLog("; IMPRESIÓN EN PAUSA");
  };

  const handleStop = () => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    runtime.simulation.isPrinting = false;
    runtime.simulation.isPaused = false;
    runtime.parts.nozzleLight.intensity = 0;
    soundRef.current?.playClick();
    setIsPrinting(false);
    setIsPaused(false);
    setStatus("Cancelado");
    appendLog("; IMPRESIÓN CANCELADA");
  };

  const handleModelChange = (nextModel: ModelType) => {
    if (isPrinting || isPaused) return;
    clearPrintedModel();
    setModel(nextModel);
    setProgress(0);
    setCurrentLayer(0);
    setTotalLayers(0);
    setStatus("Esperando comando...");
    setRemaining("00:00");
    const runtime = runtimeRef.current;
    if (runtime) {
      runtime.simulation = { ...INITIAL_SIMULATION, speed };
      runtime.parts.carriage.position.set(0, 0, 0);
      runtime.parts.gantry.position.y = 10.75;
    }
  };

  const handleCameraReset = () => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    runtime.camera.position.set(14, 12, 17);
    runtime.controls.target.set(0, 4.5, 0);
    runtime.controls.update();
  };

  const handleSoundToggle = () => {
    const enabled = !soundEnabled;
    soundEnabledRef.current = enabled;
    if (soundRef.current) soundRef.current.enabled = enabled;
    setSoundEnabled(enabled);
  };

  const isActive = isPrinting || isPaused;

  return (
    <main className="simulator-page">
      <header className="site-header">
        <div className="shell nav">
          <a className="brand" href="/" aria-label="Olavarria 3D, inicio">
            <BrandMark className="brand-symbol" />
            <span>OLAVARRIA <b>3D</b></span>
          </a>
          <nav className="nav-links" aria-label="Navegación">
            <a href="/">Tienda</a>
            <a href="/pedidos">Pedidos a medida</a>
            <a className="nav-cta" href="/#catalogo">Volver al catálogo <span aria-hidden="true">↗</span></a>
          </nav>
        </div>
      </header>

      <div className="simulator-shell">
        <div className="simulator-heading">
          <div>
            <p className="simulator-eyebrow"><span /> EXPERIENCIA INTERACTIVA</p>
            <h1>Tu idea, <em>capa por capa.</em></h1>
            <p className="simulator-intro">
              Explorá una impresora 3D en acción. Elegí un modelo, ajustá el filamento y mirá cómo se construye.
            </p>
          </div>
          <div className="simulator-live"><Activity size={15} /> SIMULACIÓN EN TIEMPO REAL</div>
        </div>

        {errorMessage && (
          <p className="simulator-error" role="status">
            {errorMessage}
            <button type="button" onClick={() => setErrorMessage("")} aria-label="Cerrar aviso"><X size={15} /></button>
          </p>
        )}

        <div className="simulator-layout">
          <section className="simulator-viewport" aria-label="Vista 3D de la impresora">
            <div className="simulator-canvas" ref={canvasHostRef} />
            <div className="simulator-view-label">
              <span>OLAVARRIA 3D</span>
              <b>IMPRESORA VIRTUAL / 01</b>
            </div>
            <div className="simulator-fps">{fps} FPS</div>
            <div className="simulator-view-controls">
              <button type="button" onClick={handleCameraReset} title="Restablecer cámara" aria-label="Restablecer cámara">
                <RotateCcw size={17} />
              </button>
              <button
                type="button"
                className={showGrid ? "active" : ""}
                onClick={() => setShowGrid((value) => !value)}
                title="Alternar cuadrícula"
                aria-label="Alternar cuadrícula"
              >
                <Grid2X2 size={17} />
              </button>
              <button
                type="button"
                className={soundEnabled ? "active" : ""}
                onClick={handleSoundToggle}
                title={soundEnabled ? "Desactivar sonido" : "Activar sonido"}
                aria-label={soundEnabled ? "Desactivar sonido" : "Activar sonido"}
              >
                {soundEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />}
              </button>
            </div>
            <div className="simulator-temperature">
              <span>Hotend <b>{hotendTemp}°C <i>/ 215°C</i></b></span>
              <span>Cama <b>{bedTemp}°C <i>/ 60°C</i></b></span>
            </div>
            <p className="simulator-drag-hint">Arrastrá para rotar · scroll para acercar</p>
          </section>

          <aside className="simulator-panel">
            <section className="simulator-card simulator-controls">
              <div className="simulator-card-heading">
                <div><span>01</span><h2>Configurá tu impresión</h2></div>
              </div>

              <label className="simulator-label" htmlFor="simulator-model">Modelo de prueba</label>
              <select
                id="simulator-model"
                className="simulator-select"
                value={model}
                disabled={isActive}
                onChange={(event) => handleModelChange(event.target.value as ModelType)}
              >
                <option value="cube">Cubo de calibración</option>
                <option value="vase">Jarrón ondulado</option>
                <option value="gear">Engranaje decorativo</option>
                <option value="pyramid">Pirámide</option>
              </select>

              <fieldset className="simulator-control-block simulator-color-field">
                <legend className="simulator-label">Color del filamento</legend>
                <div className="simulator-colors">
                  {FILAMENT_COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      aria-label={color.name}
                      aria-pressed={filamentColor === color.value}
                      className={filamentColor === color.value ? "selected" : ""}
                      style={{ "--filament-color": color.value } as CSSProperties}
                      onClick={() => setFilamentColor(color.value)}
                    />
                  ))}
                </div>
              </fieldset>

              <div className="simulator-control-block">
                <div className="simulator-range-label">
                  <label className="simulator-label" htmlFor="simulator-speed">Velocidad de impresión</label>
                  <strong>{speed.toFixed(2).replace(/0$/, "")}x</strong>
                </div>
                <input
                  id="simulator-speed"
                  className="simulator-range"
                  type="range"
                  min="0.5"
                  max="4"
                  step="0.25"
                  value={speed}
                  onChange={(event) => setSpeed(Number(event.target.value))}
                />
                <div className="simulator-range-ends"><span>Precisa</span><span>Rápida</span></div>
              </div>

              <div className="simulator-actions">
                <button className="simulator-start" type="button" onClick={handleStart} disabled={isPrinting}>
                  <Play size={16} fill="currentColor" />
                  {isPaused ? "Reanudar impresión" : status === "¡Completado!" || status === "Cancelado" ? "Imprimir de nuevo" : "Iniciar impresión"}
                </button>
                <button className="simulator-icon-button" type="button" onClick={handlePause} disabled={!isPrinting} title="Pausar impresión" aria-label="Pausar impresión">
                  <Pause size={17} />
                </button>
                <button className="simulator-stop" type="button" onClick={handleStop} disabled={!isActive} title="Cancelar impresión" aria-label="Cancelar impresión">
                  <X size={17} />
                </button>
              </div>
            </section>

            <section className="simulator-card simulator-progress-card">
              <div className="simulator-progress-heading">
                <div><span>02</span><h2>Progreso</h2></div>
                <strong>{progress}%</strong>
              </div>
              <div className="simulator-progress-track" role="progressbar" aria-label="Progreso de impresión" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
                <div style={{ width: `${progress}%` }} />
              </div>
              <div className="simulator-metrics">
                <div><span>Estado</span><b>{status}</b></div>
                <div><span>Capa</span><b>{currentLayer} / {totalLayers}</b></div>
                <div><span>Tiempo estimado</span><b>{remaining}</b></div>
              </div>
            </section>

            <section className="simulator-card simulator-terminal-card">
              <div className="simulator-terminal-heading">
                <div><span>03</span><h2>Consola G-code</h2></div>
                <span className={isPrinting ? "simulator-terminal-dot active" : "simulator-terminal-dot"} />
              </div>
              <div className="simulator-terminal" aria-live="polite">
                {logs.map((entry) => <p key={entry.id}>{entry.line}</p>)}
              </div>
            </section>
          </aside>
        </div>

        <p className="simulator-disclaimer">
          Esta experiencia es una simulación visual; el tiempo y los parámetros no representan una cotización real.
        </p>
      </div>
    </main>
  );
}
