export type CinematicType =
  | 'AVATAR_GALAXY'
  | 'CRYSTAL_SPHERE'
  | 'RED_GOLD_MATRIX'
  | 'GOLDEN_VORTEX'
  | 'GOLDEN_PORTAL'
  | 'HONOR_STAGE'
  | 'PARTICLE_CONSTELLATION'
  | 'GRAND_CEREMONY';

export type CinematicPhase =
  | 'IDLE'
  | 'PREPARE'
  | 'BUILD_UP'
  | 'ROLLING'
  | 'FINAL_APPROACH'
  | 'WINNER_FOCUS'
  | 'REVEAL'
  | 'CELEBRATION'
  | 'RESULT_HOLD'
  | 'STOPPED'
  | 'RECOVERING';

export interface CinematicWinnerInfo {
  id: string;
  name: string;
  employeeNo?: string;
  department?: string;
  organization?: string;
  avatarUrl?: string;
}

export interface DrawResult {
  winnerIds: string[];
  winners: CinematicWinnerInfo[];
  prizeName: string;
  drawCount: number;
  drawId: string;
  seedHex: string;
  commitHash: string;
}

export interface CinematicContext {
  cinematicType: CinematicType;
  prizeName: string;
  drawId: string;
  drawCount: number;
  candidates: CinematicWinnerInfo[];
  presentationPreset: string;
  performanceTier: 'ULTRA' | 'HIGH' | 'MEDIUM' | 'SAFE';
}

export interface CinematicSnapshot {
  cinematicType: CinematicType;
  phase: CinematicPhase;
  context: CinematicContext;
  elapsedMs: number;
  result?: DrawResult;
  customState: Record<string, unknown>;
  timestamp: number;
}

export interface CinematicPresetMeta {
  type: CinematicType;
  name: string;
  description: string;
  icon: string;
  minCandidates: number;
  maxCandidates: number;
  supportedTiers: Array<'ULTRA' | 'HIGH' | 'MEDIUM' | 'SAFE'>;
  estimatedDuration: number;
}

export type CinematicPhaseListener = (phase: CinematicPhase, snapshot?: CinematicSnapshot) => void;
