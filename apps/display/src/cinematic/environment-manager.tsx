import React, { useMemo, useState, useEffect } from 'react';
import { Environment } from '@react-three/drei';
import {
  getEnvironmentConfig,
  FALLBACK_ENVIRONMENT_ID,
  type EnvironmentId,
} from './environment-registry';

export interface EnvironmentManagerProps {
  environmentId: EnvironmentId;
}

const textureCache = new Map<string, string>();

function resolveAssetPath(assetPath: string): string {
  if (textureCache.has(assetPath)) {
    return textureCache.get(assetPath)!;
  }
  textureCache.set(assetPath, assetPath);
  return assetPath;
}

export function EnvironmentManager({ environmentId }: EnvironmentManagerProps) {
  const [useFallback, setUseFallback] = useState(false);
  const activeId = useFallback ? FALLBACK_ENVIRONMENT_ID : environmentId;
  const config = useMemo(() => getEnvironmentConfig(activeId), [activeId]);

  useEffect(() => {
    setUseFallback(false);
  }, [environmentId]);

  const resolvedPath = useMemo(() => resolveAssetPath(config.assetPath), [config.assetPath]);

  return React.createElement(Environment, {
    key: activeId,
    files: resolvedPath,
    background: config.background,
  });
}

export function preloadEnvironments(ids: EnvironmentId[]): Promise<void[]> {
  return Promise.all(
    ids.map((id) => {
      const config = getEnvironmentConfig(id);
      return new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => {
          console.warn(`[EnvironmentManager] Preload failed for "${id}"`);
          resolve();
        };
        img.src = resolveAssetPath(config.assetPath);
      });
    }),
  );
}

export function clearEnvironmentCache(): void {
  textureCache.clear();
}
