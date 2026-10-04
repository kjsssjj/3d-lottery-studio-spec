import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { CameraBridge } from '../../apps/display/src/cinematic/camera-bridge';
import { getLightingRig } from '../../apps/display/src/cinematic/lighting';
import { getEnvironmentForPreset } from '../../apps/display/src/cinematic/environment-registry';
import { AvatarGalaxyGeometry } from '../../apps/display/src/scenes/AvatarGalaxyScene';
import { CrystalSphereGeometry } from '../../apps/display/src/scenes/CrystalSphereScene';
import { RedGoldMatrixGeometry } from '../../apps/display/src/scenes/RedGoldMatrixScene';
import { GoldenVortexGeometry } from '../../apps/display/src/scenes/GoldenVortexScene';
import { GoldenPortalGeometry } from '../../apps/display/src/scenes/GoldenPortalScene';
import { HonorStageGeometry } from '../../apps/display/src/scenes/HonorStageScene';
import { ParticleConstellationGeometry } from '../../apps/display/src/scenes/ParticleConstellationScene';
import { GrandCeremonyGeometry } from '../../apps/display/src/scenes/GrandCeremonyScene';
import { saveCinematicSnapshot, loadCinematicSnapshot, clearCinematicSnapshot } from '../../apps/display/src/cinematic/cinematic-recovery';
import type { CinematicPhase, CinematicSnapshot, DrawResult } from '../../apps/display/src/cinematic/types';
import type { CinematicPresetId } from '../../apps/display/src/cinematic/environment-registry';

const PRESETS: CinematicPresetId[] = [
  'avatar-galaxy', 'crystal-sphere', 'red-gold-matrix', 'golden-vortex',
  'golden-portal', 'honor-stage', 'particle-constellation', 'grand-ceremony',
];

const RUNTIME_PHASES: CinematicPhase[] = [
  'IDLE', 'PREPARE', 'BUILD_UP', 'ROLLING', 'FINAL_APPROACH',
  'WINNER_FOCUS', 'REVEAL', 'CELEBRATION', 'RESULT_HOLD',
];

const GEOMETRY_MAP: Record<CinematicPresetId, React.FC<SceneProps>> = {
  'avatar-galaxy': AvatarGalaxyGeometry,
  'crystal-sphere': CrystalSphereGeometry,
  'red-gold-matrix': RedGoldMatrixGeometry,
  'golden-vortex': GoldenVortexGeometry,
  'golden-portal': GoldenPortalGeometry,
  'honor-stage': HonorStageGeometry,
  'particle-constellation': ParticleConstellationGeometry,
  'grand-ceremony': GrandCeremonyGeometry,
};

interface SceneProps {
  phase: CinematicPhase;
  candidates: Array<{ id: string; name: string; avatarUrl?: string }>;
  winners?: Array<{ id: string; name: string }>;
}

const MOCK_CANDIDATES = Array.from({ length: 20 }, (_, i) => ({
  id: `c-${i}`,
  name: `Candidate ${i + 1}`,
}));

function LightingRig({ rigName, phase }: { rigName: string; phase: CinematicPhase }) {
  const rig = getLightingRig(rigName);
  return React.createElement('group', null,
    ...rig.lights.map((light, i) => {
      const { type, color, intensity, position, castShadow } = light;
      switch (type) {
        case 'ambient':
          return React.createElement('ambientLight', { key: `l-${i}`, color, intensity });
        case 'directional':
          return React.createElement('directionalLight', { key: `l-${i}`, color, intensity, position, castShadow });
        case 'point':
          return React.createElement('pointLight', { key: `l-${i}`, color, intensity, position });
        case 'spot':
          return React.createElement('spotLight', { key: `l-${i}`, color, intensity, position, angle: light.angle, penumbra: light.penumbra });
        default:
          return null;
      }
    }),
  );
}

const PRESET_TO_CINEMATIC_TYPE: Record<CinematicPresetId, string> = {
  'avatar-galaxy': 'AVATAR_GALAXY',
  'crystal-sphere': 'CRYSTAL_SPHERE',
  'red-gold-matrix': 'RED_GOLD_MATRIX',
  'golden-vortex': 'GOLDEN_VORTEX',
  'golden-portal': 'GOLDEN_PORTAL',
  'honor-stage': 'HONOR_STAGE',
  'particle-constellation': 'PARTICLE_CONSTELLATION',
  'grand-ceremony': 'GRAND_CEREMONY',
};

const PRESET_LIGHT_MAP: Record<CinematicPresetId, string> = {
  'avatar-galaxy': 'warmStage',
  'crystal-sphere': 'crystalClear',
  'red-gold-matrix': 'redGoldMatrix',
  'golden-vortex': 'goldenVortex',
  'golden-portal': 'warmStage',
  'honor-stage': 'honorStage',
  'particle-constellation': 'crystalClear',
  'grand-ceremony': 'warmStage',
};

class ErrorBoundary extends React.Component<
  { children: React.ReactNode; onError: (error: Error) => void },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    this.props.onError(error);
  }

  render() {
    if (this.state.hasError) {
      return React.createElement('div', {
        style: { color: '#f00', padding: '20px', fontFamily: 'monospace' },
      }, `Render Error: ${this.state.error?.message}`);
    }
    return this.props.children;
  }
}

function buildSnapshot(preset: CinematicPresetId, phase: CinematicPhase, drawResult: DrawResult | null): CinematicSnapshot {
  return {
    cinematicType: PRESET_TO_CINEMATIC_TYPE[preset] as any,
    phase,
    context: {
      cinematicType: PRESET_TO_CINEMATIC_TYPE[preset] as any,
      prizeName: '特等奖',
      drawId: drawResult?.drawId ?? 'draw-test-001',
      drawCount: drawResult?.drawCount ?? 3,
      candidates: MOCK_CANDIDATES,
      presentationPreset: preset,
      performanceTier: 'HIGH',
    },
    elapsedMs: 0,
    result: drawResult ?? undefined,
    customState: {},
    timestamp: Date.now(),
  };
}

export function RuntimeApp() {
  const [preset, setPresetRaw] = useState<CinematicPresetId>(() => {
    const snap = loadCinematicSnapshot();
    if (!snap) return 'avatar-galaxy';
    const entry = Object.entries(PRESET_TO_CINEMATIC_TYPE).find(([, v]) => v === snap.cinematicType);
    return (entry?.[0] as CinematicPresetId) ?? 'avatar-galaxy';
  });
  const [phase, setPhaseRaw] = useState<CinematicPhase>(() => {
    const snap = loadCinematicSnapshot();
    return snap?.phase ?? 'IDLE';
  });
  const [drawResult, setDrawResultRaw] = useState<DrawResult | null>(() => {
    const snap = loadCinematicSnapshot();
    return snap?.result ?? null;
  });
  const [renderError, setRenderError] = useState<string | null>(null);
  const [webglReady, setWebglReady] = useState(false);
  const [recovered, setRecovered] = useState(() => loadCinematicSnapshot() !== null);

  const presetRef = useRef(preset);
  const phaseRef = useRef(phase);
  const drawResultRef = useRef(drawResult);
  presetRef.current = preset;
  phaseRef.current = phase;
  drawResultRef.current = drawResult;

  const setPreset = useCallback((p: CinematicPresetId) => {
    setPresetRaw(p);
  }, []);

  const setPhase = useCallback((ph: CinematicPhase) => {
    setPhaseRaw(ph);
  }, []);

  const setDrawResult = useCallback((dr: DrawResult | null) => {
    setDrawResultRaw(dr);
  }, []);

  const setStateBatch = useCallback((patch: { preset?: CinematicPresetId; phase?: CinematicPhase; drawResult?: DrawResult | null }) => {
    if (patch.preset !== undefined) {
      presetRef.current = patch.preset;
      setPresetRaw(patch.preset);
    }
    if (patch.phase !== undefined) {
      phaseRef.current = patch.phase;
      setPhaseRaw(patch.phase);
    }
    if (patch.drawResult !== undefined) {
      drawResultRef.current = patch.drawResult;
      setDrawResultRaw(patch.drawResult);
    }
  }, []);

  const saveSnapshotNow = useCallback(() => {
    const snap = buildSnapshot(presetRef.current, phaseRef.current, drawResultRef.current);
    saveCinematicSnapshot(snap);
  }, []);

  useEffect(() => {
    const snap = buildSnapshot(preset, phase, drawResult);
    saveCinematicSnapshot(snap);
  }, [preset, phase, drawResult]);

  const handleError = useCallback((error: Error) => {
    setRenderError(error.message);
    console.error('[RuntimeApp] Render error:', error.message);
  }, []);

  useEffect(() => {
    (window as any).__cinematicRuntime = {
      setPreset,
      setPhase,
      setDrawResult,
      setStateBatch,
      saveSnapshotNow,
      getPreset: () => preset,
      getPhase: () => phase,
      getDrawResult: () => drawResult,
      getPresets: () => PRESETS,
      getPhases: () => RUNTIME_PHASES,
      isReady: () => webglReady,
      getError: () => renderError,
      isRecovered: () => recovered,
      clearSnapshot: () => { clearCinematicSnapshot(); setRecovered(false); },
      getSnapshot: () => buildSnapshot(presetRef.current, phaseRef.current, drawResultRef.current),
    };
  }, [preset, phase, drawResult, webglReady, renderError, recovered, setPreset, setPhase, setDrawResult, setStateBatch, saveSnapshotNow]);

  const Geometry = GEOMETRY_MAP[preset];
  const lightRig = PRESET_LIGHT_MAP[preset];

  const showWinners = (phase === 'REVEAL' || phase === 'CELEBRATION' || phase === 'RESULT_HOLD') && drawResult;
  const displayWinners = showWinners ? drawResult!.winners.map(w => ({ id: w.id, name: w.name })) : undefined;

  return React.createElement('div', { style: { width: '100%', height: '100%', background: '#000' } },
    React.createElement(ErrorBoundary, { onError: handleError },
      React.createElement(Canvas, {
        gl: {
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
          failIfMajorPerformanceCaveat: false,
        },
        camera: { fov: 60, near: 0.1, far: 1000, position: [0, 2, 10] },
        onCreated: (state) => {
          const gl = state.gl;
          const ctx = gl.getContext();
          console.log('[RuntimeApp] WebGL context created:', gl.getContextAttributes()?.antialias ? 'antialias' : 'no-antialias');
          console.log('[RuntimeApp] WebGL vendor:', ctx.getParameter(ctx.RENDERER));
          console.log('[RuntimeApp] WebGL version:', ctx.getParameter(ctx.VERSION));
          setWebglReady(true);
          (window as any).__webglContext = {
            renderer: gl,
            gl: ctx,
            info: () => gl.info,
          };
        },
      },
        React.createElement(CameraBridge, { phase }),
        React.createElement(LightingRig, { rigName: lightRig, phase }),
        React.createElement(Geometry, {
          phase,
          candidates: MOCK_CANDIDATES,
          winners: displayWinners,
        }),
      ),
    ),
    renderError && React.createElement('div', {
      style: { position: 'absolute', top: 10, left: 10, color: '#f00', fontFamily: 'monospace', zIndex: 999 },
    }, `ERROR: ${renderError}`),
    React.createElement('div', {
      style: { position: 'absolute', bottom: 10, left: 10, color: '#0f0', fontFamily: 'monospace', fontSize: '12px', zIndex: 999 },
      'data-testid': 'runtime-status',
    }, `preset=${preset} phase=${phase} ready=${webglReady} recovered=${recovered} drawId=${drawResult?.drawId ?? 'none'} commitHash=${drawResult?.commitHash ?? 'none'}`),
  );
}
