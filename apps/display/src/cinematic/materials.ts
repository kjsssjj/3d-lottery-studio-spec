import * as THREE from 'three';

export interface PBRMaterialPreset {
  name: string;
  create: () => THREE.MeshPhysicalMaterial;
}

const sharedEnvIntensity = 1.0;

export const pbrPresets = {
  BrushedGold: (): THREE.MeshPhysicalMaterial =>
    new THREE.MeshPhysicalMaterial({
      color: 0xd4a843,
      metalness: 0.95,
      roughness: 0.35,
      envMapIntensity: sharedEnvIntensity,
      clearcoat: 0.3,
      clearcoatRoughness: 0.4,
    }),

  PolishedGold: (): THREE.MeshPhysicalMaterial =>
    new THREE.MeshPhysicalMaterial({
      color: 0xffd700,
      metalness: 1.0,
      roughness: 0.05,
      envMapIntensity: sharedEnvIntensity * 1.5,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
    }),

  RedLacquer: (): THREE.MeshPhysicalMaterial =>
    new THREE.MeshPhysicalMaterial({
      color: 0x8b0000,
      metalness: 0.1,
      roughness: 0.15,
      envMapIntensity: sharedEnvIntensity,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
    }),

  BlackMetal: (): THREE.MeshPhysicalMaterial =>
    new THREE.MeshPhysicalMaterial({
      color: 0x1a1a1a,
      metalness: 0.9,
      roughness: 0.2,
      envMapIntensity: sharedEnvIntensity,
      clearcoat: 0.5,
      clearcoatRoughness: 0.3,
    }),

  CrystalGlass: (): THREE.MeshPhysicalMaterial =>
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0.0,
      roughness: 0.0,
      transmission: 0.95,
      thickness: 1.5,
      ior: 1.5,
      envMapIntensity: sharedEnvIntensity * 2.0,
      clearcoat: 1.0,
      clearcoatRoughness: 0.0,
      transparent: true,
      opacity: 0.3,
    }),

  GoldFoil: (): THREE.MeshPhysicalMaterial =>
    new THREE.MeshPhysicalMaterial({
      color: 0xdaa520,
      metalness: 0.85,
      roughness: 0.55,
      envMapIntensity: sharedEnvIntensity * 0.8,
      clearcoat: 0.1,
      clearcoatRoughness: 0.6,
    }),
} as const;

export type PBRPresetName = keyof typeof pbrPresets;

export function createPBRMaterial(preset: PBRPresetName): THREE.MeshPhysicalMaterial {
  return pbrPresets[preset]();
}

export function disposePBRMaterial(material: THREE.Material): void {
  material.dispose();
}
