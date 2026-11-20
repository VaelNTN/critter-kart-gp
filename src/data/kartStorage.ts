import { Device } from '@capacitor/device';

export interface KartSaveState {
  selectedDriverId: string;
  muted: boolean;
  playerName: string;
  trophies: {
    gold: number;
    silver: number;
    bronze: number;
  };
  totalScore: number;
  bestTimesMs: Record<string, number>;
}

const SAVE_KEY = 'ckgp_save_v2';
const DEVICE_KEY = 'ckgp_device_id_v1';

const DEFAULT_SAVE: KartSaveState = {
  selectedDriverId: 'pip_fox',
  muted: false,
  playerName: 'CritterRacer',
  trophies: { gold: 0, silver: 0, bronze: 0 },
  totalScore: 0,
  bestTimesMs: {},
};

export function loadKartState(): KartSaveState {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<KartSaveState>;
      return {
        selectedDriverId:
          parsed.selectedDriverId || localStorage.getItem('ckgp_driver_v1') || DEFAULT_SAVE.selectedDriverId,
        muted: Boolean(parsed.muted),
        playerName: typeof parsed.playerName === 'string' && parsed.playerName.trim()
          ? parsed.playerName.trim().slice(0, 20)
          : DEFAULT_SAVE.playerName,
        trophies: {
          gold: Number(parsed.trophies?.gold) || 0,
          silver: Number(parsed.trophies?.silver) || 0,
          bronze: Number(parsed.trophies?.bronze) || 0,
        },
        totalScore: Number(parsed.totalScore) || 0,
        bestTimesMs:
          parsed.bestTimesMs && typeof parsed.bestTimesMs === 'object' ? { ...parsed.bestTimesMs } : {},
      };
    }
  } catch {
    // ignore storage errors
  }

  const legacyDriver = localStorage.getItem('ckgp_driver_v1');
  return {
    ...DEFAULT_SAVE,
    selectedDriverId: legacyDriver || DEFAULT_SAVE.selectedDriverId,
    trophies: { ...DEFAULT_SAVE.trophies },
    bestTimesMs: {},
  };
}

export function saveKartState(state: KartSaveState): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    localStorage.setItem('ckgp_driver_v1', state.selectedDriverId);
  } catch {
    // ignore
  }
}

export function getTotalTrophies(state: KartSaveState): number {
  return state.trophies.gold + state.trophies.silver + state.trophies.bronze;
}

export function recordTrackBestTime(state: KartSaveState, trackId: string, timeMs: number): boolean {
  if (!Number.isFinite(timeMs) || timeMs <= 0) return false;
  const rounded = Math.round(timeMs);
  const prev = state.bestTimesMs[trackId];
  if (!prev || rounded < prev) {
    state.bestTimesMs[trackId] = rounded;
    saveKartState(state);
    return true;
  }
  return false;
}

export function formatRaceTime(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '--:--.--';
  const totalSec = ms / 1000;
  const mins = Math.floor(totalSec / 60);
  const secs = Math.floor(totalSec % 60);
  const hundredths = Math.floor((ms % 1000) / 10);
  return `${mins}:${String(secs).padStart(2, '0')}.${String(hundredths).padStart(2, '0')}`;
}

export async function getKartDeviceId(): Promise<string> {
  try {
    const cached = localStorage.getItem(DEVICE_KEY);
    if (cached && cached.length >= 4) return cached;
  } catch {
    // ignore
  }

  let id = '';
  try {
    const info = await Device.getId();
    if (info?.identifier && info.identifier.length >= 4) {
      id = `cap_${info.identifier}`;
    }
  } catch {
    // Web / non-native fallback
  }

  if (!id) {
    const rand = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    id = `web_${rand}`;
  }

  try {
    localStorage.setItem(DEVICE_KEY, id);
  } catch {
    // ignore
  }
  return id;
}
