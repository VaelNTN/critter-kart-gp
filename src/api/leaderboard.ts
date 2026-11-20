import { getKartDeviceId } from '../data/kartStorage';

export interface KartLeaderboardEntry {
  rank: number;
  deviceId: string;
  playerName: string;
  score: number;
  trophies: number;
  driverName: string;
  updatedAt?: string;
}

export interface KartLeaderboardResult {
  online: boolean;
  entries: KartLeaderboardEntry[];
  player: KartLeaderboardEntry | null;
  message?: string;
}

const LOCAL_BOARD_KEY = 'ckgp_local_board_v1';
const CUSTOM_API_KEY = 'ckgp_api_url_v1';

export function getKartApiUrl(): string {
  try {
    const saved = localStorage.getItem(CUSTOM_API_KEY);
    if (saved) return saved.trim().replace(/\/+$/, '');
  } catch {
    // ignore
  }
  const envUrl = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_URL || '';
  return envUrl.trim().replace(/\/+$/, '');
}

function readLocalBoard(): KartLeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(LOCAL_BOARD_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as KartLeaderboardEntry[];
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

function writeLocalBoard(entries: KartLeaderboardEntry[]): void {
  try {
    localStorage.setItem(LOCAL_BOARD_KEY, JSON.stringify(entries.slice(0, 30)));
  } catch {
    // ignore
  }
}

function upsertLocalEntry(
  deviceId: string,
  playerName: string,
  score: number,
  trophies: number,
  driverName: string
): KartLeaderboardEntry[] {
  const list = readLocalBoard();
  const idx = list.findIndex((e) => e.deviceId === deviceId);
  const now = new Date().toISOString();
  if (idx >= 0) {
    const prev = list[idx];
    list[idx] = {
      ...prev,
      playerName,
      score: Math.max(prev.score, score),
      trophies: Math.max(prev.trophies, trophies),
      driverName,
      updatedAt: now,
    };
  } else {
    list.push({
      rank: 1,
      deviceId,
      playerName,
      score,
      trophies,
      driverName,
      updatedAt: now,
    });
  }
  list.sort((a, b) => b.score - a.score || b.trophies - a.trophies);
  const ranked = list.map((e, i) => ({ ...e, rank: i + 1 }));
  writeLocalBoard(ranked);
  return ranked;
}

export async function fetchKartLeaderboard(): Promise<KartLeaderboardResult> {
  const deviceId = await getKartDeviceId();
  const apiUrl = getKartApiUrl();

  if (apiUrl) {
    try {
      const ctrl = new AbortController();
      const timer = window.setTimeout(() => ctrl.abort(), 5000);
      const res = await fetch(
        `${apiUrl}/api/critter-kart/highscores?limit=30&deviceId=${encodeURIComponent(deviceId)}`,
        { signal: ctrl.signal }
      );
      window.clearTimeout(timer);
      if (res.ok) {
        const data = (await res.json()) as {
          ok?: boolean;
          entries?: KartLeaderboardEntry[];
          player?: KartLeaderboardEntry | null;
        };
        if (data && Array.isArray(data.entries)) {
          return {
            online: true,
            entries: data.entries,
            player: data.player ?? null,
          };
        }
      }
    } catch {
      // fall back to local board below
    }
  }

  const local = readLocalBoard();
  const me = local.find((e) => e.deviceId === deviceId) || null;
  return {
    online: false,
    entries: local,
    player: me,
    message: apiUrl
      ? 'Offline mode — showing local paddock records.'
      : 'Local leaderboard (connect VITE_API_URL for global rankings).',
  };
}

export async function submitKartScore(payload: {
  playerName: string;
  score: number;
  trophies: number;
  driverName: string;
}): Promise<KartLeaderboardResult> {
  const deviceId = await getKartDeviceId();
  const cleanName = payload.playerName.trim().slice(0, 20) || 'CritterRacer';
  const score = Math.max(0, Math.round(payload.score));
  const trophies = Math.max(0, Math.round(payload.trophies));
  const driverName = payload.driverName.trim().slice(0, 24) || 'Pip';

  upsertLocalEntry(deviceId, cleanName, score, trophies, driverName);

  const apiUrl = getKartApiUrl();
  if (apiUrl) {
    try {
      const ctrl = new AbortController();
      const timer = window.setTimeout(() => ctrl.abort(), 5000);
      await fetch(`${apiUrl}/api/critter-kart/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId,
          playerName: cleanName,
          score,
          trophies,
          driverName,
        }),
        signal: ctrl.signal,
      });
      window.clearTimeout(timer);
    } catch {
      // keep local entry; fetchKartLeaderboard will fall back smoothly
    }
  }

  return fetchKartLeaderboard();
}
