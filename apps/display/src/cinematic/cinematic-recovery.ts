import type { CinematicSnapshot } from './types';

const STORAGE_KEY = 'lottery_cinematic_snapshot';

export function saveCinematicSnapshot(snapshot: CinematicSnapshot): void {
  try {
    const data = JSON.stringify(snapshot);
    sessionStorage.setItem(STORAGE_KEY, data);
  } catch {
    // sessionStorage may be full or unavailable
  }
}

export function loadCinematicSnapshot(): CinematicSnapshot | null {
  try {
    const data = sessionStorage.getItem(STORAGE_KEY);
    if (!data) return null;
    return JSON.parse(data) as CinematicSnapshot;
  } catch {
    return null;
  }
}

export function clearCinematicSnapshot(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
