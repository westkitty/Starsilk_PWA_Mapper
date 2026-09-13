import React, { useEffect, useRef, useState } from 'react';
import { SceneManager } from './rendering/scene-manager';
import { SimulationEngine } from './simulation/engine';
import { PointerManager, PointerToolMode } from './interaction/pointer-manager';
import { GrabAndThrowController } from './interaction/grab-and-throw';
import { OrbitLoom, FittedOrbit } from './interaction/orbit-loom';
import { FutureClient } from './simulation/future-client';
import { BranchManager } from './branching/branch-manager';
import { CelestialBody, SystemStatus } from './simulation/types';
import { ScaleMode } from './rendering/scale-transform';
import { createDemonstrationSystem } from './simulation/presets/demo-system';
import { createMeridianPreset } from './simulation/presets/meridian-preset';
import { createBlankSystem } from './simulation/presets/blank-system';
import { generateSystemSigilSvg } from './persistence/sigil';
import { saveProjectToDb, loadProjectFromDb } from './persistence/db';
import { downloadProjectFile, parseAndValidateProjectJson } from './persistence/export-import';
import { createSerializableProject } from './persistence/serializer';
import { audioSynth } from './audio/audio-synth';
import { CanonMacro } from './canon/macros';
import { resolvePointerIntent } from './interaction/pointer-intent';

// UI Components
import { TopBar, AppMode } from './ui/TopBar';
import { ToolRail } from './ui/ToolRail';
import { ContextInspector } from './ui/ContextInspector';
import { TimelineBar } from './ui/TimelineBar';
import { CanonLabModal } from './ui/CanonLabModal';
import { CreateBodyModal } from './ui/CreateBodyModal';
import { EventLedgerModal } from './ui/EventLedgerModal';
import { BranchCompareModal } from './ui/BranchCompareModal';
import { OrbitLoomConfirmModal } from './ui/OrbitLoomConfirmModal';
import { FateLensBadge } from './ui/FateLensBadge';
import { StylusHoverCalipers, StylusHoverState } from './ui/StylusHoverCalipers';
import { CanvasContactRipples, ContactRipple } from './ui/CanvasContactRipples';
import { OrientationCube } from './ui/OrientationCube';
import { ScaleBar } from './ui/ScaleBar';
import { MeasurementTool } from './ui/MeasurementTool';
import { ManipulationTelemetry, LiveManipulationStats } from './ui/ManipulationTelemetry';
import { OffscreenPointers } from './ui/OffscreenPointers';
import { GestureCoach } from './ui/GestureCoach';
import { ControlsHelpModal } from './ui/ControlsHelpModal';
import { ErrorBoundary } from './ui/ErrorBoundary';
import { ToastContainer } from './ui/Toast';
import { SystemNavigatorModal } from './ui/SystemNavigatorModal';
import { ShortcutsModal } from './ui/ShortcutsModal';
import { SystemStatsModal } from './ui/SystemStatsModal';
import { AudioSettingsModal } from './ui/AudioSettingsModal';
import { OnboardingOverlay } from './ui/OnboardingOverlay';
import { RadarMinimap } from './ui/RadarMinimap';
import { CollisionWarningBanner } from './ui/CollisionWarningBanner';
import { AstrometricTheme } from './ui/ThemeSelector';
import { generateProceduralSystem } from './simulation/presets/procedural-system';
import { eventBus } from './core/event-bus';
import { undoStack } from './simulation/undo-stack';
import { autosaveManager } from './persistence/autosave';
import { TransferWindowModal } from './ui/TransferWindowModal';
import { ResonanceModal } from './ui/ResonanceModal';
import { ChallengeModal } from './ui/ChallengeModal';
import { EphemerisExportModal } from './ui/EphemerisExportModal';
import { ManeuverNodeModal } from './ui/ManeuverNodeModal';
import { ClimateInspectorModal } from './ui/ClimateInspectorModal';
import { ProceduralGenModal } from './ui/ProceduralGenModal';
import { StellarIntruderModal } from './ui/StellarIntruderModal';
import { ShareSystemModal } from './ui/ShareSystemModal';
import { PerfOverlay } from './ui/PerfOverlay';
import { SpectroscopyModal } from './ui/SpectroscopyModal';
import { BarycenterTelemetryModal } from './ui/BarycenterTelemetryModal';
import { OrbitalElementsTableModal } from './ui/OrbitalElementsTableModal';
import { TidalHeatMapModal } from './ui/TidalHeatMapModal';
import { TisserandParameterModal } from './ui/TisserandParameterModal';
import { SpaceElevatorModal } from './ui/SpaceElevatorModal';
import { SolarCycleModal } from './ui/SolarCycleModal';
import { MagnetosphereModal } from './ui/MagnetosphereModal';
import { InterplanetaryHighwayModal } from './ui/InterplanetaryHighwayModal';
import { DysonSwarmPlannerModal } from './ui/DysonSwarmPlannerModal';
import { PoyntingRobertsonModal } from './ui/PoyntingRobertsonModal';
import { EquipotentialContourModal } from './ui/EquipotentialContourModal';
import { SynodicPeriodModal } from './ui/SynodicPeriodModal';
import { GravityGradientTorqueModal } from './ui/GravityGradientTorqueModal';
import { createSolarSystemPreset, createTrappist1Preset } from './simulation/presets/solar-system-presets';
import { decodeSystemFromUrl } from './persistence/url-state';
import { perfMonitor } from './core/perf-monitor';
import { TemporalHistoryBuffer } from './rendering/temporal-history';
import { stepVelocityVerlet } from './simulation/integrator';
import { TimelineBranch } from './branching/branch-types';
import { BranchTrajectory } from './rendering/fate-lens-renderer';
import { PredictedPoint } from './workers/future.worker';
import { Vector3D } from './simulation/types';
import { calculateOsculatingElements, findDominantPrimary } from './simulation/orbital-mechanics';

/**
 * Deterministically projects forward trajectory for an alternate branch without mutating active state.
 */
function projectBranchTrajectory(
  branch: TimelineBranch,
  targetBodyId: string,
  steps: number = 80,
  dtSeconds: number = 300
): Vector3D[] {
  const bodiesClone = branch.snapshot.bodies.map(b => ({
    ...b,
    position: { ...b.position },
    velocity: { ...b.velocity },
  }));
  const target = bodiesClone.find(b => b.id === targetBodyId);
  if (!target) return [];

  const points: Vector3D[] = [{ ...target.position }];
  const sampleInterval = Math.max(1, Math.floor(steps / 40));

  for (let s = 0; s < steps; s++) {
    stepVelocityVerlet(bodiesClone, dtSeconds);
    if (s % sampleInterval === 0 || s === steps - 1) {
      points.push({ ...target.position });
    }
  }

  return points;
}

export const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Engine and core references
  const engineRef = useRef<SimulationEngine | null>(null);
  const sceneRef = useRef<SceneManager | null>(null);
  const branchManagerRef = useRef<BranchManager | null>(null);
  const grabThrowRef = useRef<GrabAndThrowController | null>(null);
  const orbitLoomRef = useRef<OrbitLoom | null>(null);
  const futureClientRef = useRef<FutureClient | null>(null);
  const pointerManagerRef = useRef<PointerManager | null>(null);

  // UI State
  const [projectName, setProjectName] = useState('Kallisto Demonstration System');
  const [systemStatus, setSystemStatus] = useState<SystemStatus>('active');
  const [mode, setMode] = useState<AppMode>('SIMULATE');
  const [activeTool, setActiveTool] = useState<PointerToolMode>('select');
  const [selectedBodyId, setSelectedBodyId] = useState<string | null>(null);
  const [scaleMode, setScaleMode] = useState<ScaleMode>('readable');
  const [collisionsEnabled, setCollisionsEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [gravityGridVisible, setGravityGridVisible] = useState(false);
  const [showFuture, setShowFuture] = useState(true);
  const [showSensitivity, setShowSensitivity] = useState(false);
  const [timeScale, setTimeScale] = useState(1.0);
  const [isPaused, setIsPaused] = useState(false);
  const [simTimeSec, setSimTimeSec] = useState(0);
  const [eventCount, setEventCount] = useState(0);
  const [sigilSvg, setSigilSvg] = useState('');
  const [isFateLensActive, setIsFateLensActive] = useState(false);

  // Orbit Loom pending fitted orbit
  const [pendingOrbit, setPendingOrbit] = useState<FittedOrbit | null>(null);

  // Tablet & Stylus telemetry (Phase D #22 & #25A)
  const [stylusHover, setStylusHover] = useState<StylusHoverState | null>(null);
  const [contactRipples, setContactRipples] = useState<ContactRipple[]>([]);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCanonLabOpen, setIsCanonLabOpen] = useState(false);
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isMeasurementOpen, setIsMeasurementOpen] = useState(false);
  const [isNavigatorOpen, setIsNavigatorOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isAudioSettingsOpen, setIsAudioSettingsOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<AstrometricTheme>('obsidian');
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [collisionWarning, setCollisionWarning] = useState<{ hasWarning: boolean; message: string }>({ hasWarning: false, message: '' });

  // Astrodynamics & New Tools Modals (Iteration 2)
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isResonanceOpen, setIsResonanceOpen] = useState(false);
  const [isChallengeOpen, setIsChallengeOpen] = useState(false);
  const [isEphemerisExportOpen, setIsEphemerisExportOpen] = useState(false);
  const [isManeuverOpen, setIsManeuverOpen] = useState(false);
  const [isClimateOpen, setIsClimateOpen] = useState(false);
  const [isProceduralOpen, setIsProceduralOpen] = useState(false);
  const [isStellarIntruderOpen, setIsStellarIntruderOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isPerfOpen, setIsPerfOpen] = useState(false);

  // Astrodynamics & Analysis Modals (Iteration 3)
  const [isSpectroscopyOpen, setIsSpectroscopyOpen] = useState(false);
  const [isBarycenterOpen, setIsBarycenterOpen] = useState(false);
  const [isElementsOpen, setIsElementsOpen] = useState(false);
  const [isTidalHeatOpen, setIsTidalHeatOpen] = useState(false);
  const [isTisserandOpen, setIsTisserandOpen] = useState(false);
  const [isSpaceElevatorOpen, setIsSpaceElevatorOpen] = useState(false);
  const [isSolarCycleOpen, setIsSolarCycleOpen] = useState(false);
  const [isMagnetosphereOpen, setIsMagnetosphereOpen] = useState(false);
  const [isHighwayOpen, setIsHighwayOpen] = useState(false);
  const [isDysonSwarmOpen, setIsDysonSwarmOpen] = useState(false);
  const [isPoyntingOpen, setIsPoyntingOpen] = useState(false);
  const [isEquipotentialOpen, setIsEquipotentialOpen] = useState(false);
  const [isSynodicOpen, setIsSynodicOpen] = useState(false);
  const [isGravityGradientOpen, setIsGravityGradientOpen] = useState(false);

  // Interaction & Instrumentation Expansion (#26–#50)
  const [isPrecisionMode, setIsPrecisionMode] = useState(false);
  const [manipulationStats, setManipulationStats] = useState<LiveManipulationStats | null>(null);
  const [cameraDistance, setCameraDistance] = useState(280);
  const [viewportDims, setViewportDims] = useState<{ width: number; height: number }>({
    width: typeof window !== 'undefined' ? window.innerWidth : 1280,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  });

  // Timeline Branches
  const [branches, setBranches] = useState<any[]>([]);
  const [activeBranchId, setActiveBranchId] = useState('branch-prime');

  // Trigger helper for state sync
  const [, setFrameCount] = useState(0);

  // === STABLE STATE BRIDGE REFS ===
  // Long-lived persistent callbacks query current state through these refs
  const activeToolRef = useRef<PointerToolMode>(activeTool);
  activeToolRef.current = activeTool;

  const isPausedRef = useRef<boolean>(isPaused);
  isPausedRef.current = isPaused;

  const showFutureRef = useRef<boolean>(showFuture);
  showFutureRef.current = showFuture;

  const showSensitivityRef = useRef<boolean>(showSensitivity);
  showSensitivityRef.current = showSensitivity;

  const isFateLensActiveRef = useRef<boolean>(isFateLensActive);
  isFateLensActiveRef.current = isFateLensActive;

  const temporalHistoryRef = useRef<TemporalHistoryBuffer>(new TemporalHistoryBuffer(120, 0.25));
  const futureTrajectoriesRef = useRef<Record<string, PredictedPoint[]>>({});
  const branchTrajectoryCacheRef = useRef<Map<string, { points: Vector3D[]; snapshotTimestamp: number }>>(new Map());

  const selectedBodyIdRef = useRef<string | null>(selectedBodyId);
  selectedBodyIdRef.current = selectedBodyId;

  const projectNameRef = useRef<string>(projectName);
  projectNameRef.current = projectName;

  const scaleModeRef = useRef<ScaleMode>(scaleMode);
  scaleModeRef.current = scaleMode;

  const collisionsEnabledRef = useRef<boolean>(collisionsEnabled);
  collisionsEnabledRef.current = collisionsEnabled;

  const timeScaleRef = useRef<number>(timeScale);
  timeScaleRef.current = timeScale;

  // Cleanup tool actions on tool switch
  useEffect(() => {
    if (activeTool !== 'orbit_loom') {
      orbitLoomRef.current?.clear();
      setPendingOrbit(null);
    }
    if (activeTool !== 'grab_throw') {
      grabThrowRef.current?.cancelGrab();
    }
    if (activeTool === 'orbit_loom' && orbitLoomRef.current && engineRef.current) {
      const selected = engineRef.current.bodies.find(b => b.id === selectedBodyIdRef.current);
      const star = engineRef.current.bodies.find(b => b.type === 'star') || engineRef.current.bodies[0];
      orbitLoomRef.current.setPrimary(selected?.type === 'star' ? selected : star);
    }
  }, [activeTool]);

  // Sensitivity / future toggle reaction
  useEffect(() => {
    if (showFuture && futureClientRef.current && engineRef.current) {
      futureClientRef.current.requestForecast(engineRef.current.bodies, {
        selectedBodyId: selectedBodyIdRef.current,
        calculateSensitivity: showSensitivity,
      });
    }
  }, [showFuture, showSensitivity]);

  // Fate Lens selected body transition: request immediate forecast for new target body
  useEffect(() => {
    if (isFateLensActive && selectedBodyId && futureClientRef.current && engineRef.current) {
      futureClientRef.current.requestForecast(engineRef.current.bodies, {
        selectedBodyId,
        calculateSensitivity: false,
      });
    }
  }, [selectedBodyId, isFateLensActive]);

  // Initialize System
  useEffect(() => {
    if (!canvasRef.current) return;

    // 1. Initialize SceneManager
    const sceneMgr = new SceneManager(canvasRef.current);
    sceneRef.current = sceneMgr;
    if (typeof window !== 'undefined') {
      (window as any).__sceneMgr = sceneMgr;
    }

    // 2. Initialize SimulationEngine with built-in Demo System
    const initialPreset = createDemonstrationSystem();
    const engine = new SimulationEngine(initialPreset.bodies, { enableCollisions: true });
    engine.belts = initialPreset.belts;

    // Check if a shared system was provided via URL parameter
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const sharedCode = params.get('system');
      if (sharedCode) {
        const decoded = decodeSystemFromUrl(sharedCode);
        if (decoded && decoded.bodies.length > 0) {
          engine.bodies = decoded.bodies;
          if (decoded.name) setProjectName(decoded.name);
          eventBus.emit('system:toast', {
            title: 'Shared System Loaded',
            message: `Loaded "${decoded.name}" from URL.`,
            type: 'info',
          });
        }
      }
    }

    engineRef.current = engine;

    // 3. Initialize BranchManager
    const branchMgr = new BranchManager(engine, 'Prime Timeline');
    branchManagerRef.current = branchMgr;
    setBranches(branchMgr.getAllBranches());
    setActiveBranchId(branchMgr.activeBranchId);

    // 4. Initialize Grab & Throw
    const grabThrow = new GrabAndThrowController(sceneMgr, {
      onVelocityChanged: (body, _vel) => {
        // Trigger future prediction on drag using fresh state refs
        if (showFutureRef.current && futureClientRef.current) {
          futureClientRef.current.requestForecast(engine.bodies, {
            selectedBodyId: body.id,
            calculateSensitivity: showSensitivityRef.current,
          });
        }
      },
      onThrowReleased: (body, vel) => {
        audioSynth.playTick();
        engine.events.push({
          id: `throw-${Date.now()}`,
          timestampSec: engine.timeSec,
          type: 'throw_released',
          title: `Throw Released: ${body.name}`,
          description: `${body.name} launched with velocity (${vel.x.toFixed(1)}, ${vel.y.toFixed(1)}, ${vel.z.toFixed(1)}) km/s into physical space.`,
          bodyIds: [body.id],
          severity: 'info',
        });
        setEventCount(engine.events.length);
        if (showFutureRef.current && futureClientRef.current) {
          futureClientRef.current.requestForecast(engine.bodies, {
            selectedBodyId: body.id,
            calculateSensitivity: showSensitivityRef.current,
          });
        }
      },
    });
    grabThrowRef.current = grabThrow;

    // 5. Initialize Orbit Loom
    const loom = new OrbitLoom(sceneMgr);
    const star = engine.bodies.find(b => b.type === 'star') || engine.bodies[0];
    if (star) loom.setPrimary(star);
    orbitLoomRef.current = loom;

    // 6. Initialize Future Client
    const futureClient = new FutureClient((response) => {
      futureTrajectoriesRef.current = response.trajectories;
      // Sync predicted paths to trajectory renderer with fresh selectedBodyId check
      for (const [bodyId, points] of Object.entries(response.trajectories)) {
        sceneMgr.trajectoryRenderer.updateBodyTrajectory({
          bodyId,
          points,
          isSelected: bodyId === selectedBodyIdRef.current,
        });
      }
      if (response.sensitivityFans) {
        sceneMgr.trajectoryRenderer.updateSensitivityCloud(response.sensitivityFans);
      }
    });
    futureClientRef.current = futureClient;

    // 7. Initialize PointerManager
    const pointerMgr = new PointerManager(canvasRef.current, {
      onPointerDown: (e) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const normX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const normY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

        const currentTool = activeToolRef.current;
        const hitBodyId = sceneMgr.raycastBody(normX, normY);

        const intent = resolvePointerIntent({
          tool: currentTool,
          pointerType: e.pointerType,
          hasHitBody: !!hitBodyId,
          isPaused: isPausedRef.current,
          pointerCount: pointerMgr.getActivePointerCount(),
        });

        // Trigger tactile contact ripple (Phase D #25A)
        setContactRipples(prev => [...prev.slice(-8), { id: Date.now() + Math.random(), x: e.clientX, y: e.clientY }]);
        setStylusHover(null);

        if (intent === 'orbit_loom_draw') {
          pointerMgr.isDrawingOrbit = true;
          // Ensure appropriate primary is set
          const selected = engine.bodies.find(b => b.id === selectedBodyIdRef.current);
          const prim = selected?.type === 'star' ? selected : (engine.bodies.find(b => b.type === 'star') || engine.bodies[0]);
          if (prim) loom.setPrimary(prim);
          loom.startStroke();
          loom.addStrokePoint(normX, normY);
          return;
        }

        if (intent === 'grab_throw_manipulate') {
          if (hitBodyId) {
            setSelectedBodyId(hitBodyId);
            selectedBodyIdRef.current = hitBodyId;
            sceneMgr.setSelectedBody(hitBodyId);
            const b = engine.bodies.find(b => b.id === hitBodyId);
            if (b) {
              pointerMgr.isManipulatingObject = true;
              grabThrow.startGrab(b);
            }
          }
          return;
        }

        if (intent === 'select_body') {
          if (hitBodyId) {
            setSelectedBodyId(hitBodyId);
            selectedBodyIdRef.current = hitBodyId;
            sceneMgr.setSelectedBody(hitBodyId);
          }
          return;
        }

        if (intent === 'deselect') {
          setSelectedBodyId(null);
          selectedBodyIdRef.current = null;
          sceneMgr.setSelectedBody(null);
          return;
        }

        // intent === 'camera_navigate'
        // Ordinary camera navigation: drawing/manipulation flags remain false
      },
      onPointerMove: (e) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const normX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const normY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

        // S Pen Hover inspection telemetry (Phase D #22)
        if (e.pointerType === 'pen' && e.rawEvent.buttons === 0 && !pointerMgr.isDrawingOrbit && !pointerMgr.isManipulatingObject) {
          const hitBodyId = sceneMgr.raycastBody(normX, normY);
          const hoveredBody = hitBodyId ? engine.bodies.find(b => b.id === hitBodyId) || null : null;
          const worldPos = sceneMgr.raycastOrbitalPlane(normX, normY);

          let nearestBody: CelestialBody | null = null;
          let distanceToNearestKm: number | undefined = undefined;
          let distanceToSelectedKm: number | undefined = undefined;

          const selBody = selectedBodyIdRef.current ? engine.bodies.find(b => b.id === selectedBodyIdRef.current) || null : null;

          if (worldPos) {
            let minDist = Infinity;
            for (const b of engine.bodies) {
              const d = Math.hypot(b.position.x - worldPos.x, b.position.y - worldPos.y, b.position.z - worldPos.z);
              if (d < minDist) {
                minDist = d;
                nearestBody = b;
              }
            }
            distanceToNearestKm = minDist;

            if (selBody) {
              distanceToSelectedKm = Math.hypot(selBody.position.x - worldPos.x, selBody.position.y - worldPos.y, selBody.position.z - worldPos.z);
            }
          }

          setStylusHover({
            screenX: e.clientX,
            screenY: e.clientY,
            worldPos,
            hoveredBody,
            nearestBody,
            selectedBody: selBody,
            distanceToNearestKm,
            distanceToSelectedKm,
          });
        } else {
          setStylusHover(null);
        }

        if (pointerMgr.isDrawingOrbit) {
          loom.addStrokePoint(normX, normY);
          if (loom.currentFittedOrbit) {
            setManipulationStats({
              mode: 'orbit_loom',
              bodyName: 'Fitted Orbit',
              semiMajorAxisKm: loom.currentFittedOrbit.semiMajorAxisKm,
              eccentricity: loom.currentFittedOrbit.eccentricity,
              inclinationDeg: loom.currentFittedOrbit.inclinationDeg,
              isBound: loom.currentFittedOrbit.isBound,
            });
          }
          return;
        }

        if (pointerMgr.isManipulatingObject && grabThrow.isDragging()) {
          grabThrow.updateDrag(normX, normY);
          const b = grabThrow.activeBody;
          if (b) {
            const prim = findDominantPrimary(b, engine.bodies);
            const speed = Math.hypot(b.velocity.x, b.velocity.y, b.velocity.z);
            const osc = prim ? calculateOsculatingElements(b, prim) : undefined;
            setManipulationStats({
              mode: 'grab_throw',
              bodyName: b.name,
              velocityKmS: speed,
              semiMajorAxisKm: osc?.semiMajorAxisKm,
              eccentricity: osc?.eccentricity,
              inclinationDeg: osc?.inclinationDeg,
              isBound: osc ? osc.eccentricity < 1.0 : true,
            });
          }
          return;
        }

        // Ordinary background drag orbits camera using per-pointer delta tracking
        if (e.rawEvent.buttons === 1 || e.pointerType === 'touch') {
          sceneMgr.orbitCamera(-e.deltaX * 0.006, -e.deltaY * 0.006);
        }
      },
      onPointerUp: () => {
        setStylusHover(null);
        setManipulationStats(null);
        if (pointerMgr.isDrawingOrbit) {
          pointerMgr.isDrawingOrbit = false;
          const fitted = loom.endStroke();
          if (fitted) {
            audioSynth.playOrbitLock();
            setPendingOrbit(fitted);
          }
        }
        if (pointerMgr.isManipulatingObject) {
          pointerMgr.isManipulatingObject = false;
          grabThrow.releaseThrow();
        }
      },
      onPointerCancel: () => {
        setStylusHover(null);
        setManipulationStats(null);
        pointerMgr.isDrawingOrbit = false;
        pointerMgr.isManipulatingObject = false;
        loom.clear();
        setPendingOrbit(null);
        grabThrow.cancelGrab();
      },
      onPointerLeave: () => {
        setStylusHover(null);
      },
      onPinchZoom: (factor, center) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        const w = rect ? rect.width : window.innerWidth;
        const h = rect ? rect.height : window.innerHeight;
        const x = rect ? center.x - rect.left : center.x;
        const y = rect ? center.y - rect.top : center.y;
        sceneMgr.zoomCameraAtPoint(factor, x, y, w, h);
      },
      onTwoFingerPan: (dx, dy) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        const w = rect ? rect.width : window.innerWidth;
        const h = rect ? rect.height : window.innerHeight;
        sceneMgr.panCamera(dx, dy, w, h);
      },
      onDoubleTap: (screenX, screenY) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const normX = ((screenX - rect.left) / rect.width) * 2 - 1;
        const normY = -(((screenY - rect.top) / rect.height) * 2 - 1);
        const hitBodyId = sceneMgr.raycastBody(normX, normY);
        if (hitBodyId) {
          setSelectedBodyId(hitBodyId);
          selectedBodyIdRef.current = hitBodyId;
          sceneMgr.setSelectedBody(hitBodyId);
          sceneMgr.frameBody(hitBodyId);
        } else {
          sceneMgr.resetSystemView();
        }
      },
    });
    pointerManagerRef.current = pointerMgr;

    // Generate initial Sigil
    const initialSigil = generateSystemSigilSvg('Kallisto Demonstration System', engine.bodies);
    setSigilSvg(initialSigil);

    // Initial render
    sceneMgr.syncBodies(engine.bodies);

    // === STARTUP RESTORE FROM INDEXEDDB ===
    loadProjectFromDb('system-autosave')
      .then((saved) => {
        if (saved && saved.branches && saved.branches.length > 0 && engineRef.current && sceneRef.current) {
          const activeBranch = saved.branches.find(b => b.id === saved.activeBranchId) || saved.branches[0];
          if (activeBranch && activeBranch.snapshot) {
            engineRef.current.restoreSnapshot(activeBranch.snapshot);
            engineRef.current.events = [...(activeBranch.events || saved.events || [])];
            engineRef.current.systemStatus = saved.systemStatus || activeBranch.snapshot.systemStatus || 'active';
            engineRef.current.enableCollisions = saved.simulationSettings?.enableCollisions ?? true;
            engineRef.current.timeScale = saved.simulationSettings?.timeScale ?? 1.0;

            const bMgr = BranchManager.fromPersisted(saved.branches, saved.activeBranchId);
            branchManagerRef.current = bMgr;
            setBranches(bMgr.getAllBranches());
            setActiveBranchId(bMgr.activeBranchId);

            const pName = saved.projectName || 'Restored System';
            setProjectName(pName);
            setSystemStatus(engineRef.current.systemStatus);
            setScaleMode(saved.visualSettings?.scaleMode || 'readable');
            sceneRef.current.scaleTransform.setMode(saved.visualSettings?.scaleMode || 'readable');
            setShowFuture(saved.visualSettings?.showFuture ?? true);
            setShowSensitivity(saved.visualSettings?.showSensitivity ?? false);
            setGravityGridVisible(saved.visualSettings?.showGravityGrid ?? false);
            sceneRef.current.gravityGrid.getMesh().visible = saved.visualSettings?.showGravityGrid ?? false;
            setCollisionsEnabled(saved.simulationSettings?.enableCollisions ?? true);
            setTimeScale(saved.simulationSettings?.timeScale ?? 1.0);
            sceneRef.current.syncBodies(engineRef.current.bodies);
            setSigilSvg(generateSystemSigilSvg(pName, engineRef.current.bodies));
          }
        }
      })
      .catch((err) => {
        console.warn('Startup restore skipped; proceeding with demonstration system:', err);
      });

    // 8. Master Animation Loop (requestAnimationFrame)
    let animationFrameId: number;
    let lastTime = performance.now();
    let frameTicker = 0;

    const tick = (now: number) => {
      const deltaSec = (now - lastTime) / 1000.0;
      lastTime = now;

      // Update simulation physics
      engine.update(deltaSec);

      // Presentation-layer temporal history recording (bounded ring buffer)
      if (!engine.isPaused) {
        for (const b of engine.bodies) {
          temporalHistoryRef.current.recordSample(b.id, b.position, b.velocity, engine.timeSec);
        }
      }

      // Sync positions to 3D scene
      sceneMgr.syncBodies(engine.bodies);

      // Fate Lens presentation update (THEN -> NOW -> POSSIBLE)
      if (isFateLensActiveRef.current && selectedBodyIdRef.current) {
        const curBody = engine.bodies.find(b => b.id === selectedBodyIdRef.current) || null;
        const echoes = temporalHistoryRef.current.getRecentEchoes(selectedBodyIdRef.current, 6);
        const nominalPoints = (futureTrajectoriesRef.current[selectedBodyIdRef.current] || []).map(p => p.positionKm);

        // Multi-branch comparison if branches exist
        const branchTracks: BranchTrajectory[] = [];
        if (branchManagerRef.current) {
          const allBranches = branchManagerRef.current.getAllBranches();
          if (allBranches.length > 1) {
            const branchColors = ['#0cc6ff', '#f59e0b', '#ff4d64', '#10b981', '#a855f7'];
            allBranches.forEach((br, idx) => {
              const color = branchColors[idx % branchColors.length];
              if (br.id === branchManagerRef.current?.activeBranchId) {
                branchTracks.push({
                  branchId: br.id,
                  branchName: br.name,
                  colorHex: color,
                  points: nominalPoints.length > 0 ? nominalPoints : (curBody ? [{ ...curBody.position }] : []),
                });
              } else {
                const cacheKey = `${br.id}_${selectedBodyIdRef.current}`;
                const cached = branchTrajectoryCacheRef.current.get(cacheKey);
                let brPoints: Vector3D[];
                if (cached && cached.snapshotTimestamp === br.snapshot.timestampSec) {
                  brPoints = cached.points;
                } else {
                  brPoints = projectBranchTrajectory(br, selectedBodyIdRef.current!, 80, 300);
                  branchTrajectoryCacheRef.current.set(cacheKey, {
                    points: brPoints,
                    snapshotTimestamp: br.snapshot.timestampSec,
                  });
                }
                if (brPoints.length > 0) {
                  branchTracks.push({
                    branchId: br.id,
                    branchName: br.name,
                    colorHex: color,
                    points: brPoints,
                  });
                }
              }
            });
          }
        }

        sceneMgr.fateLensRenderer.update(
          deltaSec,
          curBody,
          echoes,
          nominalPoints,
          branchTracks,
          sceneMgr.camera
        );
      }

      // Orbital instrumentation & physical overlays (#46, #48, #49)
      const curSelected = selectedBodyIdRef.current ? engine.bodies.find(b => b.id === selectedBodyIdRef.current) || null : null;
      const dominantPrimary = curSelected ? findDominantPrimary(curSelected, engine.bodies) : null;

      // Vector Overlay (#48): physical velocity and net gravitational acceleration
      sceneMgr.vectorOverlay.update(curSelected, engine.bodies);

      // Encounter Overlay (#46): future trajectory closest approach and collision hazards
      const trajectoryPointsMap: Record<string, Vector3D[]> = {};
      for (const [id, points] of Object.entries(futureTrajectoriesRef.current)) {
        trajectoryPointsMap[id] = points.map(p => p.positionKm);
      }
      sceneMgr.encounterOverlay.update(selectedBodyIdRef.current, engine.bodies, trajectoryPointsMap);

      // Orbital Plane Gizmo (#49): 3D disc, normal vector h = r x v, and nodal axis
      if (curSelected && dominantPrimary) {
        sceneMgr.orbitalPlaneGizmo.update(curSelected, dominantPrimary);
      } else {
        sceneMgr.orbitalPlaneGizmo.clear();
      }

      if (curSelected && dominantPrimary) {
        const osc = calculateOsculatingElements(curSelected, dominantPrimary);
        sceneMgr.keplerianOverlay.updateFromOsculating(osc, curSelected, dominantPrimary, deltaSec);
        sceneMgr.orbitalBoundsOverlay.update(curSelected, dominantPrimary, osc.hillRadiusKm, osc.rocheLimitKm, deltaSec);
        sceneMgr.lagrangeOverlay.update(curSelected, dominantPrimary, sceneMgr.camera);
      } else if (orbitLoomRef.current?.currentFittedOrbit && orbitLoomRef.current.getPrimary()) {
        sceneMgr.keplerianOverlay.updateFromFittedOrbit(
          orbitLoomRef.current.currentFittedOrbit,
          orbitLoomRef.current.getPrimary()!,
          deltaSec
        );
        sceneMgr.orbitalBoundsOverlay.clear();
        sceneMgr.lagrangeOverlay.clear();
      } else {
        sceneMgr.keplerianOverlay.clear();
        sceneMgr.orbitalBoundsOverlay.clear();
        sceneMgr.lagrangeOverlay.clear();
      }

      sceneMgr.cameraController.setBodies(engine.bodies);
      sceneMgr.update(deltaSec);
      sceneMgr.render();

      // Periodic state sync to React (every ~10 frames)
      frameTicker++;
      if (frameTicker % 10 === 0) {
        setSimTimeSec(engine.timeSec);
        setEventCount(engine.events.length);
        setSystemStatus(engine.systemStatus);
        setCameraDistance(sceneMgr.cameraDistance || 280);
        setFrameCount(f => f + 1);

        // Periodic future forecast update
        if ((showFutureRef.current || isFateLensActiveRef.current) && futureClientRef.current && !engine.isPaused) {
          futureClientRef.current.requestForecast(engine.bodies, {
            selectedBodyId: sceneMgr.selectedBodyId,
            calculateSensitivity: showSensitivityRef.current,
          });
        }

        // Periodic debounced autosave with authoritative active branch checkpointing (~5s)
        if (frameTicker % 300 === 0 && branchManagerRef.current && engineRef.current && sceneRef.current) {
          const autoSaveProject = createSerializableProject(
            projectNameRef.current,
            branchManagerRef.current,
            engineRef.current,
            {
              scaleMode: scaleModeRef.current,
              showFuture: showFutureRef.current,
              showSensitivity: showSensitivityRef.current,
              showGravityGrid: sceneRef.current.gravityGrid.getMesh().visible,
            },
            {
              target: { x: sceneRef.current.cameraTarget.x, y: sceneRef.current.cameraTarget.y, z: sceneRef.current.cameraTarget.z },
              distance: 250,
              viewMode: sceneRef.current.viewMode,
            },
            'system-autosave'
          );
          saveProjectToDb(autoSaveProject).catch(() => {});
        }
      }

      perfMonitor.recordFrame();
      if (engineRef.current && frameTicker % 60 === 0) {
        const bodies = engineRef.current.bodies;
        let warningFound = false;
        for (let i = 0; i < bodies.length; i++) {
          for (let j = i + 1; j < bodies.length; j++) {
            const d = Math.hypot(
              bodies[i].position.x - bodies[j].position.x,
              bodies[i].position.y - bodies[j].position.y,
              bodies[i].position.z - bodies[j].position.z
            );
            if (d < (bodies[i].radiusKm + bodies[j].radiusKm) * 2.5) {
              setCollisionWarning({
                hasWarning: true,
                message: `Impending Encounter: ${bodies[i].name} & ${bodies[j].name} approaching mutual threshold!`,
              });
              warningFound = true;
              break;
            }
          }
          if (warningFound) break;
        }
        if (!warningFound) {
          setCollisionWarning({ hasWarning: false, message: '' });
        }
      }

      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);

    // Window resize handler
    const handleResize = () => {
      if (canvasRef.current) {
        sceneMgr.resize(canvasRef.current.clientWidth, canvasRef.current.clientHeight);
        setViewportDims({
          width: canvasRef.current.clientWidth,
          height: canvasRef.current.clientHeight,
        });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      pointerMgr.destroy();
      futureClient.destroy();
      sceneMgr.dispose();
      if (typeof window !== 'undefined') {
        delete (window as any).__sceneMgr;
      }
    };
  }, []);

  // Controls & Action Handlers
  const handleTogglePause = () => {
    if (engineRef.current) {
      engineRef.current.isPaused = !engineRef.current.isPaused;
      setIsPaused(engineRef.current.isPaused);
      isPausedRef.current = engineRef.current.isPaused;
      audioSynth.playTick();
    }
  };

  // Keyboard Shortcuts Listener (#35, #36, #38)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      const sceneMgr = sceneRef.current;
      if (!sceneMgr) return;

      // Camera History Undo / Redo (#36)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) {
          sceneMgr.cameraController.redo();
        } else {
          sceneMgr.cameraController.undo();
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        sceneMgr.cameraController.redo();
        return;
      }

      switch (e.key) {
        case 'f':
        case 'F':
          e.preventDefault();
          if (selectedBodyIdRef.current) {
            sceneMgr.frameBody(selectedBodyIdRef.current);
          } else {
            sceneMgr.resetSystemView();
          }
          break;
        case '0':
          e.preventDefault();
          sceneMgr.resetSystemView();
          break;
        case '+':
        case '=':
          e.preventDefault();
          sceneMgr.zoomCamera(0.85);
          break;
        case '-':
        case '_':
          e.preventDefault();
          sceneMgr.zoomCamera(1.18);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          sceneMgr.orbitCamera(-0.06, 0);
          break;
        case 'ArrowRight':
          e.preventDefault();
          sceneMgr.orbitCamera(0.06, 0);
          break;
        case 'ArrowUp':
          e.preventDefault();
          sceneMgr.orbitCamera(0, -0.06);
          break;
        case 'ArrowDown':
          e.preventDefault();
          sceneMgr.orbitCamera(0, 0.06);
          break;
        case ' ':
          e.preventDefault();
          handleTogglePause();
          break;
        case 'p':
        case 'P':
          e.preventDefault();
          setIsPrecisionMode(prev => {
            const next = !prev;
            sceneMgr.cameraController.setPrecisionMode(next);
            return next;
          });
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          setIsMeasurementOpen(prev => !prev);
          break;
        case 'n':
        case 'N':
          e.preventDefault();
          setIsNavigatorOpen(prev => !prev);
          break;
        case '?':
        case '/':
          e.preventDefault();
          setIsShortcutsOpen(prev => !prev);
          break;
        case '1':
          if (!e.ctrlKey && !e.metaKey && sceneMgr.cameraController.loadBookmark(1)) {
            e.preventDefault();
          }
          break;
        case '2':
          if (!e.ctrlKey && !e.metaKey && sceneMgr.cameraController.loadBookmark(2)) {
            e.preventDefault();
          }
          break;
        case '3':
          if (!e.ctrlKey && !e.metaKey && sceneMgr.cameraController.loadBookmark(3)) {
            e.preventDefault();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSetTimeScale = (scale: number) => {
    if (engineRef.current) {
      engineRef.current.timeScale = scale;
      setTimeScale(scale);
      timeScaleRef.current = scale;
      audioSynth.playTick();
    }
  };

  const handleToggleScaleMode = () => {
    if (sceneRef.current) {
      const next = scaleMode === 'readable' ? 'true' : 'readable';
      sceneRef.current.scaleTransform.setMode(next);
      setScaleMode(next);
      scaleModeRef.current = next;
      audioSynth.playTick();
    }
  };

  const handleToggleCollisions = () => {
    if (engineRef.current) {
      engineRef.current.enableCollisions = !collisionsEnabled;
      setCollisionsEnabled(engineRef.current.enableCollisions);
      collisionsEnabledRef.current = engineRef.current.enableCollisions;
      audioSynth.playTick();
    }
  };

  const handleToggleGravityGrid = () => {
    if (sceneRef.current) {
      const next = !gravityGridVisible;
      sceneRef.current.gravityGrid.getMesh().visible = next;
      setGravityGridVisible(next);
      audioSynth.playTick();
    }
  };

  const handleToggleAudio = () => {
    const next = !audioEnabled;
    audioSynth.isEnabled = next;
    setAudioEnabled(next);
    if (next) audioSynth.playTick();
  };

  // Fate Lens Toggle Handler
  const handleToggleFateLens = () => {
    const next = !isFateLensActive;
    setIsFateLensActive(next);
    isFateLensActiveRef.current = next;

    if (next) {
      audioSynth.playResonance();
      // If no body selected, auto-select first planet or star so Fate Lens is immediately visible
      if (!selectedBodyIdRef.current && engineRef.current && engineRef.current.bodies.length > 0) {
        const candidate = engineRef.current.bodies.find(b => b.type === 'planet') || engineRef.current.bodies[0];
        if (candidate) {
          setSelectedBodyId(candidate.id);
          selectedBodyIdRef.current = candidate.id;
          sceneRef.current?.setSelectedBody(candidate.id);
        }
      }
      if (futureClientRef.current && engineRef.current) {
        futureClientRef.current.requestForecast(engineRef.current.bodies, {
          selectedBodyId: selectedBodyIdRef.current,
          calculateSensitivity: showSensitivityRef.current,
        });
      }
      sceneRef.current?.setFateLensActive(true);
    } else {
      sceneRef.current?.setFateLensActive(false);
    }
  };

  // Branching: Fork Branch
  const handleForkBranch = () => {
    if (branchManagerRef.current && engineRef.current) {
      const name = prompt('Enter name for the new causal branch:', `Branch @ ${Math.round(engineRef.current.timeSec)}s`);
      if (name) {
        const newBranch = branchManagerRef.current.forkBranch(name, engineRef.current);
        setBranches(branchManagerRef.current.getAllBranches());
        setActiveBranchId(newBranch.id);
        audioSynth.playTick();
      }
    }
  };

  const handlePruneRipple = (id: number) => {
    setContactRipples(prev => prev.filter(r => r.id !== id));
  };

  // Branching: Switch Branch
  const handleSwitchBranch = (id: string) => {
    if (branchManagerRef.current && engineRef.current && sceneRef.current) {
      branchManagerRef.current.switchBranch(id, engineRef.current);
      setActiveBranchId(id);
      setSystemStatus(engineRef.current.systemStatus);
      temporalHistoryRef.current.clear();
      branchTrajectoryCacheRef.current.clear();
      sceneRef.current.fateLensRenderer.clearVisuals();
      sceneRef.current.syncBodies(engineRef.current.bodies);
      setSelectedBodyId(null);
      selectedBodyIdRef.current = null;
      sceneRef.current.setSelectedBody(null);
      audioSynth.playTick();
    }
  };

  // Load Presets
  const handleLoadPreset = (presetType: 'demo' | 'meridian' | 'blank' | 'procedural' | 'sol' | 'trappist') => {
    if (!engineRef.current || !sceneRef.current) return;

    let preset: { bodies: CelestialBody[]; belts?: any[] };
    let pName = '';

    if (presetType === 'demo') {
      preset = createDemonstrationSystem();
      pName = 'Kallisto Demonstration System';
    } else if (presetType === 'meridian') {
      preset = createMeridianPreset();
      pName = 'Virgil & Meridian Reference Study';
    } else if (presetType === 'sol') {
      preset = { bodies: createSolarSystemPreset() };
      pName = 'Solar System (Sol)';
    } else if (presetType === 'trappist') {
      preset = { bodies: createTrappist1Preset() };
      pName = 'TRAPPIST-1 System';
    } else if (presetType === 'procedural') {
      const generated = generateProceduralSystem(Date.now());
      preset = { bodies: generated.bodies };
      pName = generated.name;
    } else {
      preset = createBlankSystem();
      pName = 'Blank System';
    }

    engineRef.current.bodies = preset.bodies;
    engineRef.current.belts = preset.belts || [];
    engineRef.current.timeSec = 0;
    engineRef.current.systemStatus = 'active';
    engineRef.current.events = [];
    setSystemStatus('active');

    // Reset Branch Manager
    const bMgr = new BranchManager(engineRef.current, 'Prime Timeline');
    branchManagerRef.current = bMgr;
    setBranches(bMgr.getAllBranches());
    setActiveBranchId(bMgr.activeBranchId);

    // Clear temporal history to prevent stale leakage
    temporalHistoryRef.current.clear();
    branchTrajectoryCacheRef.current.clear();
    sceneRef.current.fateLensRenderer.clearVisuals();

    // Update scene
    sceneRef.current.syncBodies(engineRef.current.bodies);
    setSelectedBodyId(null);
    selectedBodyIdRef.current = null;
    sceneRef.current.setSelectedBody(null);

    setProjectName(pName);
    setSigilSvg(generateSystemSigilSvg(pName, engineRef.current.bodies));
    undoStack.pushState(engineRef.current.bodies, null, `Loaded: ${pName}`);
    autosaveManager.scheduleAutosave(pName, engineRef.current.bodies);
    eventBus.emit('toast:notify', { message: `Loaded system: ${pName}`, type: 'success' });
    audioSynth.playTick();
  };

  // Execute Canon Macro
  const handleExecuteMacro = (macro: CanonMacro, targetId?: string) => {
    if (!engineRef.current || !sceneRef.current) return;
    const ev = macro.apply(engineRef.current, targetId);
    if (ev) {
      if (macro.id === 'pull-starsilk' || macro.id === 'starbinding-study') {
        audioSynth.playStarCollapse();
      } else {
        audioSynth.playTick();
      }
      setSystemStatus(engineRef.current.systemStatus);
      // Checkpoint active branch immediately after macro consequence
      branchManagerRef.current?.checkpointActiveBranch(engineRef.current);
      sceneRef.current.syncBodies(engineRef.current.bodies);
      if (macro.id === 'pull-starsilk') {
        const collapsedId = targetId || ev.bodyIds?.[0];
        if (collapsedId) {
          sceneRef.current.playCollapseSequence(collapsedId);
        }
      }
      setEventCount(engineRef.current.events.length);
      setIsCanonLabOpen(false);
    }
  };

  // Spawn WorldsVault Template
  const handleSpawnTemplate = (tmpl: any) => {
    if (!engineRef.current || !sceneRef.current) return;
    const star = engineRef.current.bodies.find(b => b.type === 'star');
    const distKm = 1.4 * 149597870.7;

    const newWorld: CelestialBody = {
      id: `tmpl-${tmpl.id}-${Date.now()}`,
      name: tmpl.name,
      type: 'planet',
      massKg: 5.97e24,
      radiusKm: 6400,
      position: { x: distKm, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: star ? Math.sqrt((6.6743e-20 * star.massKg) / distKm) : 25 },
      color: '#38bdf8',
      unauthored_in_source: true,
      sourceCanonStatus: 'unknown',
      plannerClassification: 'CANON-INSPIRED SANDBOX',
      sourceCitation: 'WorldsVault Extinct Planetary Template Registry',
      stableId: 'worldsvault-templates',
    };

    engineRef.current.addBody(newWorld);
    sceneRef.current.syncBodies(engineRef.current.bodies);
    setSelectedBodyId(newWorld.id);
    selectedBodyIdRef.current = newWorld.id;
    sceneRef.current.setSelectedBody(newWorld.id);
    audioSynth.playTick();
  };

  // Export / Import
  const handleExport = () => {
    if (!engineRef.current || !branchManagerRef.current || !sceneRef.current) return;
    const project = createSerializableProject(
      projectNameRef.current,
      branchManagerRef.current,
      engineRef.current,
      {
        scaleMode: scaleModeRef.current,
        showFuture: showFutureRef.current,
        showSensitivity: showSensitivityRef.current,
        showGravityGrid: gravityGridVisible,
      },
      {
        target: { x: 0, y: 0, z: 0 },
        distance: 250,
        viewMode: sceneRef.current.viewMode,
      },
      `proj-${Date.now()}`
    );
    downloadProjectFile(project);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.ssp.json';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (re) => {
        try {
          const raw = re.target?.result as string;
          const project = parseAndValidateProjectJson(raw);
          if (engineRef.current && sceneRef.current) {
            const activeBranch = project.branches.find(b => b.id === project.activeBranchId) || project.branches[0];
            engineRef.current.restoreSnapshot(activeBranch.snapshot);
            engineRef.current.events = [...activeBranch.events];
            engineRef.current.systemStatus = project.systemStatus || activeBranch.snapshot.systemStatus || 'active';
            setSystemStatus(engineRef.current.systemStatus);

            const bMgr = BranchManager.fromPersisted(project.branches, project.activeBranchId);
            branchManagerRef.current = bMgr;
            setBranches(bMgr.getAllBranches());
            setActiveBranchId(bMgr.activeBranchId);

            // Clear temporal history to prevent stale leakage
            temporalHistoryRef.current.clear();
            branchTrajectoryCacheRef.current.clear();
            sceneRef.current.fateLensRenderer.clearVisuals();

            setProjectName(project.projectName);
            sceneRef.current.syncBodies(engineRef.current.bodies);
            setSigilSvg(generateSystemSigilSvg(project.projectName, engineRef.current.bodies));
            audioSynth.playTick();
          }
        } catch (err: any) {
          alert(`Failed to import system file: ${err.message}`);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const selectedBody = engineRef.current?.bodies.find(b => b.id === selectedBodyId) || null;

  return (
    <ErrorBoundary>
      <div className={`planner-viewport theme-${currentTheme} ${isHighContrast ? 'a11y-high-contrast' : ''}`}>
        {/* 3D WebGL Canvas */}
        <canvas ref={canvasRef} className="universe-canvas" />

      {/* Primary HUD Overlay */}
      <div className="hud-layer">
        <TopBar
          projectName={projectName}
          sigilSvg={sigilSvg}
          systemStatus={systemStatus}
          mode={mode}
          onSetMode={(m) => {
            setMode(m);
            if (m === 'CANON LAB') setIsCanonLabOpen(true);
          }}
          scaleMode={scaleMode}
          onToggleScaleMode={handleToggleScaleMode}
          collisionsEnabled={collisionsEnabled}
          onToggleCollisions={handleToggleCollisions}
          audioEnabled={audioEnabled}
          onToggleAudio={handleToggleAudio}
          gravityGridVisible={gravityGridVisible}
          onToggleGravityGrid={handleToggleGravityGrid}
          onExport={handleExport}
          onImport={handleImport}
          onLoadPreset={handleLoadPreset}
          bodies={engineRef.current?.bodies || []}
          onSelectBody={(id) => {
            setSelectedBodyId(id);
            selectedBodyIdRef.current = id;
            sceneRef.current?.setSelectedBody(id);
          }}
          onOpenNavigator={() => setIsNavigatorOpen(true)}
          onOpenStats={() => setIsStatsOpen(true)}
          onOpenShortcuts={() => setIsShortcutsOpen(true)}
          onOpenAudioSettings={() => setIsAudioSettingsOpen(true)}
          onOpenTransfer={() => setIsTransferOpen(true)}
          onOpenResonance={() => setIsResonanceOpen(true)}
          onOpenChallenge={() => setIsChallengeOpen(true)}
          onOpenEphemeris={() => setIsEphemerisExportOpen(true)}
          onOpenManeuver={() => setIsManeuverOpen(true)}
          onOpenClimate={() => setIsClimateOpen(true)}
          onOpenProcedural={() => setIsProceduralOpen(true)}
          onOpenStellarIntruder={() => setIsStellarIntruderOpen(true)}
          onOpenShare={() => setIsShareOpen(true)}
          onTogglePerf={() => setIsPerfOpen(!isPerfOpen)}
          onOpenBarycenter={() => setIsBarycenterOpen(true)}
          onOpenSolarCycle={() => setIsSolarCycleOpen(true)}
          onOpenHighway={() => setIsHighwayOpen(true)}
          onOpenDysonSwarm={() => setIsDysonSwarmOpen(true)}
          onOpenSynodic={() => setIsSynodicOpen(true)}
          onOpenEquipotential={() => setIsEquipotentialOpen(true)}
          onOpenPoynting={() => setIsPoyntingOpen(true)}
          onOpenGravityGradient={() => setIsGravityGradientOpen(true)}
          currentTheme={currentTheme}
          onSelectTheme={(t) => setCurrentTheme(t)}
          isHighContrast={isHighContrast}
          onToggleHighContrast={() => setIsHighContrast(!isHighContrast)}
        />

        {/* Center Canvas Area (Tap void handled by pointer-manager) */}
        <div style={{ flex: 1, pointerEvents: 'none' }} />

        {/* Fate Lens Floating State Indicator */}
        {isFateLensActive && selectedBody && (
          <FateLensBadge
            selectedBody={selectedBody}
            onClose={handleToggleFateLens}
            echoCount={temporalHistoryRef.current.getSampleCount(selectedBody.id)}
            branchNames={branches.map((b, idx) => ({
              id: b.id,
              name: b.name,
              color: ['#0cc6ff', '#f59e0b', '#ff4d64', '#10b981', '#a855f7'][idx % 5],
            }))}
          />
        )}

        {/* Selected Body Inspector */}
        {selectedBody && (
          <ContextInspector
            selectedBody={selectedBody}
            allBodies={engineRef.current?.bodies || []}
            isFateLensActive={isFateLensActive}
            onToggleFateLens={handleToggleFateLens}
            onUpdateBody={(updated) => {
              if (engineRef.current && sceneRef.current) {
                const idx = engineRef.current.bodies.findIndex(b => b.id === updated.id);
                if (idx !== -1) {
                  engineRef.current.bodies[idx] = updated;
                  sceneRef.current.syncBodies(engineRef.current.bodies);
                  setFrameCount(f => f + 1);
                }
              }
            }}
            onDeleteBody={(id) => {
              if (engineRef.current && sceneRef.current) {
                engineRef.current.removeBody(id);
                temporalHistoryRef.current.clearBody(id);
                sceneRef.current.syncBodies(engineRef.current.bodies);
                setSelectedBodyId(null);
                selectedBodyIdRef.current = null;
                sceneRef.current.setSelectedBody(null);
                audioSynth.playTick();
              }
            }}
            onFocusBody={(_id) => {
              if (sceneRef.current) {
                sceneRef.current.viewMode = 'focus_selected';
              }
            }}
            onStartGrabThrow={(body) => {
              setActiveTool('grab_throw');
              grabThrowRef.current?.startGrab(body);
            }}
            onOpenCanonMacro={(_macroId) => {
              setIsCanonLabOpen(true);
            }}
            onOpenSpectroscopy={() => setIsSpectroscopyOpen(true)}
            onOpenElements={() => setIsElementsOpen(true)}
            onOpenTidalHeating={() => setIsTidalHeatOpen(true)}
            onOpenMagnetosphere={() => setIsMagnetosphereOpen(true)}
            onOpenSpaceElevator={() => setIsSpaceElevatorOpen(true)}
            onOpenTisserand={() => setIsTisserandOpen(true)}
          />
        )}

        {/* Bottom Timeline Bar */}
        <TimelineBar
          timeSec={simTimeSec}
          timeScale={timeScale}
          isPaused={isPaused}
          onTogglePause={handleTogglePause}
          onSetTimeScale={handleSetTimeScale}
          onStepTime={(dt) => {
            if (engineRef.current && sceneRef.current) {
              engineRef.current.timeSec = Math.max(0, engineRef.current.timeSec + dt);
              setSimTimeSec(engineRef.current.timeSec);
              audioSynth.playTick();
            }
          }}
          branches={branches}
          activeBranchId={activeBranchId}
          onSwitchBranch={handleSwitchBranch}
          onForkBranch={handleForkBranch}
          onOpenLedger={() => setIsLedgerOpen(true)}
          onOpenBranchCompare={() => setIsCompareOpen(true)}
          eventCount={eventCount}
          events={engineRef.current?.events || []}
        />
      </div>

        {/* Orientation Cube: Snap viewports (#40) */}
        <OrientationCube cameraController={sceneRef.current?.cameraController || null} />

        {/* Dynamic Scale Bar (#43) */}
        <ScaleBar cameraDistance={cameraDistance} scaleMode={scaleMode} viewportHeight={viewportDims.height} />

        {/* Offscreen Target Pointers (#50) */}
        <OffscreenPointers
          selectedBody={selectedBody}
          sceneManager={sceneRef.current}
          viewportWidth={viewportDims.width}
          viewportHeight={viewportDims.height}
          onFocusBody={(b) => {
            setSelectedBodyId(b.id);
            selectedBodyIdRef.current = b.id;
            sceneRef.current?.setSelectedBody(b.id);
            sceneRef.current?.frameBody(b.id);
          }}
        />

        {/* Live Manipulation Telemetry (#45) */}
        <ManipulationTelemetry stats={manipulationStats} fittedOrbit={pendingOrbit} />

        {/* First-Time Gesture Coach (#35) */}
        <GestureCoach />

        {/* Left Vertical Tool Rail */}
        <ToolRail
          activeTool={activeTool}
          onSelectTool={(t) => {
            setActiveTool(t);
            audioSynth.playTick();
          }}
          showFuture={showFuture}
          onToggleShowFuture={() => setShowFuture(!showFuture)}
          showSensitivity={showSensitivity}
          onToggleShowSensitivity={() => setShowSensitivity(!showSensitivity)}
          isFateLensActive={isFateLensActive}
          onToggleFateLens={handleToggleFateLens}
          hasSelectedBody={!!selectedBodyId}
          onOpenCreateModal={() => setIsCreateModalOpen(true)}
          onOpenCanonLab={() => setIsCanonLabOpen(true)}
          onResetCamera={() => {
            if (sceneRef.current) {
              sceneRef.current.resetSystemView();
            }
          }}
          onFrameSelected={() => {
            if (sceneRef.current) {
              if (selectedBodyIdRef.current) {
                sceneRef.current.frameBody(selectedBodyIdRef.current);
              } else {
                sceneRef.current.resetSystemView();
              }
            }
          }}
          isPrecisionMode={isPrecisionMode}
          onTogglePrecisionMode={() => {
            const next = !isPrecisionMode;
            setIsPrecisionMode(next);
            sceneRef.current?.cameraController.setPrecisionMode(next);
          }}
          isMeasurementOpen={isMeasurementOpen}
          onToggleMeasurement={() => setIsMeasurementOpen(!isMeasurementOpen)}
          onOpenHelp={() => setIsHelpOpen(true)}
        />

      {/* Orbit Loom Conic Confirmation Overlay */}
      {pendingOrbit && (
        <OrbitLoomConfirmModal
          fittedOrbit={pendingOrbit}
          primaryBody={orbitLoomRef.current?.getPrimary() || null}
          selectedBody={selectedBody}
          allBodies={engineRef.current?.bodies || []}
          onApplyToBody={(targetBody) => {
            if (orbitLoomRef.current && engineRef.current && sceneRef.current) {
              const prim = orbitLoomRef.current.getPrimary();
              const success = orbitLoomRef.current.applyToBody(targetBody);
              if (success && prim) {
                sceneRef.current.syncBodies(engineRef.current.bodies);
                audioSynth.playOrbitLock();
                engineRef.current.events.push({
                  id: `loom-${Date.now()}`,
                  timestampSec: engineRef.current.timeSec,
                  type: 'body_created',
                  title: `Orbit Fitted: ${targetBody.name}`,
                  description: `${targetBody.name} assigned to fitted Keplerian orbit around ${prim.name} (a=${(pendingOrbit.semiMajorAxisKm / 149597870.7).toFixed(3)} AU, e=${pendingOrbit.eccentricity.toFixed(3)}).`,
                  bodyIds: [targetBody.id, prim.id],
                  severity: 'info',
                });
                setEventCount(engineRef.current.events.length);
                if (showFutureRef.current && futureClientRef.current) {
                  futureClientRef.current.requestForecast(engineRef.current.bodies, {
                    selectedBodyId: targetBody.id,
                    calculateSensitivity: showSensitivityRef.current,
                  });
                }
              }
            }
            setPendingOrbit(null);
          }}
          onCreateRing={() => {
            if (orbitLoomRef.current && engineRef.current && sceneRef.current) {
              const prim = orbitLoomRef.current.getPrimary();
              const ring = orbitLoomRef.current.commitToRing();
              if (ring && prim) {
                if (!prim.rings) prim.rings = [];
                prim.rings.push(ring);
                sceneRef.current.syncBodies(engineRef.current.bodies);
                audioSynth.playOrbitLock();
                engineRef.current.events.push({
                  id: `ring-${Date.now()}`,
                  timestampSec: engineRef.current.timeSec,
                  type: 'body_created',
                  title: `Orbital Ring Created around ${prim.name}`,
                  description: `Engineered orbital ring (${(ring.innerRadiusKm / 1000).toFixed(0)}k - ${(ring.outerRadiusKm / 1000).toFixed(0)}k km) established.`,
                  bodyIds: [prim.id],
                  severity: 'info',
                });
                setEventCount(engineRef.current.events.length);
              }
            }
            setPendingOrbit(null);
          }}
          onCancel={() => {
            orbitLoomRef.current?.clear();
            setPendingOrbit(null);
          }}
        />
      )}

      {/* S Pen Hover Calipers (Phase D #22) */}
      <StylusHoverCalipers hover={stylusHover} />

      {/* Canvas Tactile Contact Ripples (Phase D #25A) */}
      <CanvasContactRipples ripples={contactRipples} onPruneRipple={handlePruneRipple} />

      {/* Modals */}
      {isCreateModalOpen && (
        <CreateBodyModal
          existingBodies={engineRef.current?.bodies || []}
          onSpawnBody={(newBody) => {
            if (engineRef.current) {
              engineRef.current.addBody(newBody);
              sceneRef.current?.syncBodies(engineRef.current.bodies);
              setSelectedBodyId(newBody.id);
              selectedBodyIdRef.current = newBody.id;
              sceneRef.current?.setSelectedBody(newBody.id);
            }
          }}
          onClose={() => setIsCreateModalOpen(false)}
        />
      )}

      {isCanonLabOpen && (
        <CanonLabModal
          selectedBody={selectedBody}
          allBodies={engineRef.current?.bodies || []}
          onExecuteMacro={handleExecuteMacro}
          onSpawnTemplateWorld={handleSpawnTemplate}
          onClose={() => setIsCanonLabOpen(false)}
        />
      )}

      {isLedgerOpen && (
        <EventLedgerModal
          events={engineRef.current?.events || []}
          onClose={() => setIsLedgerOpen(false)}
        />
      )}

      {isCompareOpen && branchManagerRef.current && (
        <BranchCompareModal
          branches={branches}
          branchManager={branchManagerRef.current}
          onClose={() => setIsCompareOpen(false)}
        />
      )}

      {/* Analytical Two-Point Measurement Tool (#44) */}
      <MeasurementTool
        bodies={engineRef.current?.bodies || []}
        selectedBodyId={selectedBodyId}
        isOpen={isMeasurementOpen}
        onClose={() => setIsMeasurementOpen(false)}
      />

      {/* Controls & Gestures Help Modal (#35) */}
      <ControlsHelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />

      {/* 2D Ecliptic Radar Minimap (UI07) */}
      <RadarMinimap
        bodies={engineRef.current?.bodies || []}
        selectedBodyId={selectedBodyId}
        onSelectBody={(id) => {
          setSelectedBodyId(id);
          selectedBodyIdRef.current = id;
          sceneRef.current?.setSelectedBody(id);
        }}
      />

      {/* Collision Warning Banner (UI14) */}
      <CollisionWarningBanner
        hasWarning={collisionWarning.hasWarning}
        message={collisionWarning.message}
        onPause={handleTogglePause}
      />

      {/* Ephemeral Toast Notifications (UI03) */}
      <ToastContainer />

      {/* System Navigator Modal (UI01) */}
      <SystemNavigatorModal
        isOpen={isNavigatorOpen}
        onClose={() => setIsNavigatorOpen(false)}
        bodies={engineRef.current?.bodies || []}
        selectedBodyId={selectedBodyId}
        onSelectBody={(id) => {
          setSelectedBodyId(id);
          selectedBodyIdRef.current = id;
          sceneRef.current?.setSelectedBody(id);
        }}
      />

      {/* Keyboard Shortcuts Reference (UI02) */}
      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      {/* Astrometric System Overview Stats (UI05) */}
      <SystemStatsModal
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        bodies={engineRef.current?.bodies || []}
      />

      {/* Audio Settings & Volume Control (UI08) */}
      <AudioSettingsModal
        isOpen={isAudioSettingsOpen}
        onClose={() => setIsAudioSettingsOpen(false)}
        audioEnabled={audioEnabled}
        onToggleAudio={handleToggleAudio}
      />

      {/* First-Time Onboarding Coachmarks (UI04) */}
      {isOnboardingOpen && (
        <OnboardingOverlay onComplete={() => setIsOnboardingOpen(false)} />
      )}

      {/* Transfer Window Modal (UI16) */}
      <TransferWindowModal
        isOpen={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
        bodies={engineRef.current?.bodies || []}
      />

      {/* Resonance Modal (UI17) */}
      <ResonanceModal
        isOpen={isResonanceOpen}
        onClose={() => setIsResonanceOpen(false)}
        bodies={engineRef.current?.bodies || []}
      />

      {/* Challenge Modal (UI18) */}
      <ChallengeModal
        isOpen={isChallengeOpen}
        onClose={() => setIsChallengeOpen(false)}
        bodies={engineRef.current?.bodies || []}
      />

      {/* Ephemeris Export Modal (UI19) */}
      <EphemerisExportModal
        isOpen={isEphemerisExportOpen}
        onClose={() => setIsEphemerisExportOpen(false)}
        bodies={engineRef.current?.bodies || []}
      />

      {/* Maneuver Node Modal (UI20) */}
      <ManeuverNodeModal
        isOpen={isManeuverOpen}
        onClose={() => setIsManeuverOpen(false)}
        bodies={engineRef.current?.bodies || []}
        onApplyBurn={(updated) => {
          if (engineRef.current && sceneRef.current) {
            engineRef.current.bodies = updated;
            sceneRef.current.syncBodies(updated);
            setFrameCount(c => c + 1);
          }
        }}
      />

      {/* Climate Inspector Modal (UI21) */}
      <ClimateInspectorModal
        isOpen={isClimateOpen}
        onClose={() => setIsClimateOpen(false)}
        bodies={engineRef.current?.bodies || []}
      />

      {/* Procedural Generator Modal (UI22) */}
      <ProceduralGenModal
        isOpen={isProceduralOpen}
        onClose={() => setIsProceduralOpen(false)}
        onGenerate={(newBodies) => {
          if (engineRef.current && sceneRef.current) {
            engineRef.current.bodies = newBodies;
            engineRef.current.timeSec = 0;
            sceneRef.current.syncBodies(newBodies);
            setFrameCount(c => c + 1);
          }
        }}
      />

      {/* Stellar Intruder Modal (UI26) */}
      <StellarIntruderModal
        isOpen={isStellarIntruderOpen}
        onClose={() => setIsStellarIntruderOpen(false)}
        onSpawn={(intruder) => {
          if (engineRef.current && sceneRef.current) {
            engineRef.current.bodies.push(intruder);
            sceneRef.current.syncBodies(engineRef.current.bodies);
            setFrameCount(c => c + 1);
          }
        }}
      />

      {/* Share System Modal (UI30) */}
      <ShareSystemModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        systemName={projectName}
        bodies={engineRef.current?.bodies || []}
      />

      {/* Performance Overlay (UI29) */}
      <PerfOverlay
        isVisible={isPerfOpen}
        onToggle={() => setIsPerfOpen(!isPerfOpen)}
      />

      {/* Spectroscopy Modal (UI31) */}
      <SpectroscopyModal
        isOpen={isSpectroscopyOpen}
        onClose={() => setIsSpectroscopyOpen(false)}
        bodies={engineRef.current?.bodies || []}
        selectedBodyId={selectedBodyId || undefined}
      />

      {/* Barycenter Telemetry Modal (UI32) */}
      <BarycenterTelemetryModal
        isOpen={isBarycenterOpen}
        onClose={() => setIsBarycenterOpen(false)}
        bodies={engineRef.current?.bodies || []}
      />

      {/* Orbital Elements Table Modal (UI34) */}
      <OrbitalElementsTableModal
        isOpen={isElementsOpen}
        onClose={() => setIsElementsOpen(false)}
        bodies={engineRef.current?.bodies || []}
        selectedBodyId={selectedBodyId || undefined}
      />

      {/* Tidal Heat Map Modal (UI35) */}
      <TidalHeatMapModal
        isOpen={isTidalHeatOpen}
        onClose={() => setIsTidalHeatOpen(false)}
        bodies={engineRef.current?.bodies || []}
        selectedBodyId={selectedBodyId || undefined}
      />

      {/* Tisserand Parameter Modal (UI36) */}
      <TisserandParameterModal
        isOpen={isTisserandOpen}
        onClose={() => setIsTisserandOpen(false)}
        bodies={engineRef.current?.bodies || []}
        selectedBodyId={selectedBodyId || undefined}
      />

      {/* Space Elevator Modal (UI37) */}
      <SpaceElevatorModal
        isOpen={isSpaceElevatorOpen}
        onClose={() => setIsSpaceElevatorOpen(false)}
        bodies={engineRef.current?.bodies || []}
        selectedBodyId={selectedBodyId || undefined}
      />

      {/* Solar Cycle Modal (UI38) */}
      <SolarCycleModal
        isOpen={isSolarCycleOpen}
        onClose={() => setIsSolarCycleOpen(false)}
      />

      {/* Magnetosphere Modal (UI39) */}
      <MagnetosphereModal
        isOpen={isMagnetosphereOpen}
        onClose={() => setIsMagnetosphereOpen(false)}
        bodies={engineRef.current?.bodies || []}
        selectedBodyId={selectedBodyId || undefined}
      />

      {/* Interplanetary Highway Modal (UI40) */}
      <InterplanetaryHighwayModal
        isOpen={isHighwayOpen}
        onClose={() => setIsHighwayOpen(false)}
        bodies={engineRef.current?.bodies || []}
      />

      {/* Dyson Swarm Planner Modal (UI41) */}
      <DysonSwarmPlannerModal
        isOpen={isDysonSwarmOpen}
        onClose={() => setIsDysonSwarmOpen(false)}
      />

      {/* Poynting-Robertson Modal (UI42) */}
      <PoyntingRobertsonModal
        isOpen={isPoyntingOpen}
        onClose={() => setIsPoyntingOpen(false)}
      />

      {/* Roche Lobe Equipotential Modal (UI43) */}
      <EquipotentialContourModal
        isOpen={isEquipotentialOpen}
        onClose={() => setIsEquipotentialOpen(false)}
        bodies={engineRef.current?.bodies || []}
      />

      {/* Synodic Period Modal (UI44) */}
      <SynodicPeriodModal
        isOpen={isSynodicOpen}
        onClose={() => setIsSynodicOpen(false)}
        bodies={engineRef.current?.bodies || []}
      />

      {/* Gravity Gradient Torque Modal (UI45) */}
      <GravityGradientTorqueModal
        isOpen={isGravityGradientOpen}
        onClose={() => setIsGravityGradientOpen(false)}
      />
    </div>
    </ErrorBoundary>
  );
};
export default App;
