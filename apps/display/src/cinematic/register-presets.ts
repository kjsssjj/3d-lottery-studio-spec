import { presetLibrary } from './preset-library';
import { AvatarGalaxyEffect } from '../effects/AvatarGalaxyEffect';
import { CrystalSphereEffect } from '../effects/CrystalSphereEffect';
import { RedGoldMatrixEffect } from '../effects/RedGoldMatrixEffect';
import { GoldenVortexEffect } from '../effects/GoldenVortexEffect';
import { GoldenPortalEffect } from '../effects/GoldenPortalEffect';
import { HonorStageEffect } from '../effects/HonorStageEffect';
import { ParticleConstellationEffect } from '../effects/ParticleConstellationEffect';
import { GrandCeremonyEffect } from '../effects/GrandCeremonyEffect';

let registered = false;

export function registerAllPresets(): void {
  if (registered) return;
  registered = true;

  presetLibrary.register('AVATAR_GALAXY', (id) => new AvatarGalaxyEffect(id), {
    type: 'AVATAR_GALAXY',
    name: '头像星河',
    description: '参与者头像形成旋转星河，中奖者高亮飞出',
    icon: 'galaxy',
    minCandidates: 10,
    maxCandidates: 100000,
    supportedTiers: ['ULTRA', 'HIGH', 'MEDIUM', 'SAFE'],
    estimatedDuration: 25,
  });

  presetLibrary.register('CRYSTAL_SPHERE', (id) => new CrystalSphereEffect(id), {
    type: 'CRYSTAL_SPHERE',
    name: '水晶奖球',
    description: '透明水晶球体内光球搅拌翻滚，逐一定格揭晓',
    icon: 'crystal',
    minCandidates: 10,
    maxCandidates: 5000,
    supportedTiers: ['ULTRA', 'HIGH', 'MEDIUM', 'SAFE'],
    estimatedDuration: 22,
  });

  presetLibrary.register('RED_GOLD_MATRIX', (id) => new RedGoldMatrixEffect(id), {
    type: 'RED_GOLD_MATRIX',
    name: '红金矩阵',
    description: '红金双色数字矩阵翻滚，逐位列阵定格',
    icon: 'matrix',
    minCandidates: 4,
    maxCandidates: 1000,
    supportedTiers: ['ULTRA', 'HIGH', 'MEDIUM', 'SAFE'],
    estimatedDuration: 18,
  });

  presetLibrary.register('GOLDEN_VORTEX', (id) => new GoldenVortexEffect(id), {
    type: 'GOLDEN_VORTEX',
    name: '金色漩涡',
    description: '金色粒子漩涡旋转聚合，中奖者从涡心升起',
    icon: 'vortex',
    minCandidates: 10,
    maxCandidates: 50000,
    supportedTiers: ['ULTRA', 'HIGH', 'MEDIUM', 'SAFE'],
    estimatedDuration: 20,
  });

  presetLibrary.register('GOLDEN_PORTAL', (id) => new GoldenPortalEffect(id), {
    type: 'GOLDEN_PORTAL',
    name: '金色传送门',
    description: '金色光环传送门旋转展开，中奖者穿越而出',
    icon: 'portal',
    minCandidates: 10,
    maxCandidates: 20000,
    supportedTiers: ['ULTRA', 'HIGH', 'MEDIUM', 'SAFE'],
    estimatedDuration: 22,
  });

  presetLibrary.register('HONOR_STAGE', (id) => new HonorStageEffect(id), {
    type: 'HONOR_STAGE',
    name: '荣耀舞台',
    description: '聚光灯扫射舞台，中奖者从光柱中升起',
    icon: 'stage',
    minCandidates: 4,
    maxCandidates: 500,
    supportedTiers: ['ULTRA', 'HIGH', 'MEDIUM', 'SAFE'],
    estimatedDuration: 25,
  });

  presetLibrary.register('PARTICLE_CONSTELLATION', (id) => new ParticleConstellationEffect(id), {
    type: 'PARTICLE_CONSTELLATION',
    name: '粒子星座',
    description: '粒子汇聚成星座图案，中奖者连线高亮',
    icon: 'constellation',
    minCandidates: 10,
    maxCandidates: 100000,
    supportedTiers: ['ULTRA', 'HIGH', 'MEDIUM', 'SAFE'],
    estimatedDuration: 20,
  });

  presetLibrary.register('GRAND_CEREMONY', (id) => new GrandCeremonyEffect(id), {
    type: 'GRAND_CEREMONY',
    name: '盛大典礼',
    description: '金色烟花绽放，彩带飘扬，隆重揭晓中奖者',
    icon: 'ceremony',
    minCandidates: 4,
    maxCandidates: 100000,
    supportedTiers: ['ULTRA', 'HIGH', 'MEDIUM', 'SAFE'],
    estimatedDuration: 30,
  });
}
