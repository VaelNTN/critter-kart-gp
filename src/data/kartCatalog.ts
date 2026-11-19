export interface CritterDriverDef {
  id: string;
  name: string;
  species: string;
  kartName: string;
  kartColor: string;
  accentColor: string;
  furColor: string;
  earStyle: 'pointed' | 'round' | 'tall' | 'crest' | 'spike';
  speedStat: number; // 1..10
  accelStat: number; // 1..10
  driftStat: number; // 1..10
}

export type KartPowerItemId =
  | 'acorn_rocket'
  | 'mud_splatter'
  | 'honey_glaze'
  | 'chili_boost'
  | 'bubble_shield'
  | 'sonic_honk'
  | 'hyper_comet';

export interface KartPowerItemDef {
  id: KartPowerItemId;
  name: string;
  desc: string;
  color: string;
}

export interface KartTrackDef {
  id: string;
  name: string;
  themeLabel: string;
  groundColor: string;
  groundAccent: string;
  roadColor: string;
  curbA: string;
  curbB: string;
  roadWidth: number;
  waypoints: Array<[number, number]>;
}

export const CRITTER_DRIVERS: CritterDriverDef[] = [
  {
    id: 'pip_fox',
    name: 'Pip',
    species: 'Red Fox',
    kartName: 'Trailblazer',
    kartColor: '#f97316',
    accentColor: '#fef08a',
    furColor: '#fb923c',
    earStyle: 'pointed',
    speedStat: 8,
    accelStat: 8,
    driftStat: 9,
  },
  {
    id: 'bramble_hog',
    name: 'Bramble',
    species: 'Hedgehog',
    kartName: 'Briar Buggy',
    kartColor: '#10b981',
    accentColor: '#a7f3d0',
    furColor: '#6ee7b7',
    earStyle: 'spike',
    speedStat: 7,
    accelStat: 9,
    driftStat: 8,
  },
  {
    id: 'mochi_panda',
    name: 'Mochi',
    species: 'Red Panda',
    kartName: 'Bamboo Jet',
    kartColor: '#e11d48',
    accentColor: '#fbcfe8',
    furColor: '#fb7185',
    earStyle: 'round',
    speedStat: 8,
    accelStat: 8,
    driftStat: 8,
  },
  {
    id: 'barnaby_bear',
    name: 'Barnaby',
    species: 'Grizzly',
    kartName: 'Timber Bruiser',
    kartColor: '#0284c7',
    accentColor: '#bae6fd',
    furColor: '#b45309',
    earStyle: 'round',
    speedStat: 10,
    accelStat: 6,
    driftStat: 7,
  },
  {
    id: 'kiki_toucan',
    name: 'Kiki',
    species: 'Toucan',
    kartName: 'Canopy Glider',
    kartColor: '#eab308',
    accentColor: '#fef9c3',
    furColor: '#1e293b',
    earStyle: 'crest',
    speedStat: 8,
    accelStat: 9,
    driftStat: 8,
  },
  {
    id: 'nori_otter',
    name: 'Nori',
    species: 'River Otter',
    kartName: 'Splash Kart',
    kartColor: '#06b6d4',
    accentColor: '#cffafe',
    furColor: '#92400e',
    earStyle: 'round',
    speedStat: 7,
    accelStat: 9,
    driftStat: 10,
  },
  {
    id: 'clover_bunny',
    name: 'Clover',
    species: 'Meadow Hare',
    kartName: 'Clover Sprint',
    kartColor: '#22c55e',
    accentColor: '#dcfce7',
    furColor: '#f1f5f9',
    earStyle: 'tall',
    speedStat: 9,
    accelStat: 8,
    driftStat: 8,
  },
  {
    id: 'rex_gecko',
    name: 'Rex',
    species: 'Solar Gecko',
    kartName: 'Volt Dash',
    kartColor: '#84cc16',
    accentColor: '#fef08a',
    furColor: '#65a30d',
    earStyle: 'crest',
    speedStat: 9,
    accelStat: 7,
    driftStat: 9,
  },
];

export const KART_ITEMS: Record<KartPowerItemId, KartPowerItemDef> = {
  acorn_rocket: {
    id: 'acorn_rocket',
    name: 'Acorn Rocket',
    desc: 'Homing acorn launches forward at rival karts',
    color: '#d97706',
  },
  mud_splatter: {
    id: 'mud_splatter',
    name: 'Mud Trap',
    desc: 'Drops a slippery mud puddle behind your kart',
    color: '#78350f',
  },
  honey_glaze: {
    id: 'honey_glaze',
    name: 'Honey Glaze',
    desc: 'Sticky golden puddle that slows rivals down',
    color: '#f59e0b',
  },
  chili_boost: {
    id: 'chili_boost',
    name: 'Chili Pepper',
    desc: 'Instant fiery turbo dash forward',
    color: '#ef4444',
  },
  bubble_shield: {
    id: 'bubble_shield',
    name: 'Bubble Shield',
    desc: 'Protects your kart from 1 hazard or item hit',
    color: '#38bdf8',
  },
  sonic_honk: {
    id: 'sonic_honk',
    name: 'Sonic Honk',
    desc: 'Acoustic pulse knocking nearby rivals aside',
    color: '#14b8a6',
  },
  hyper_comet: {
    id: 'hyper_comet',
    name: 'Hyper Comet',
    desc: 'Invincible comet sprint at ultra speed',
    color: '#fde047',
  },
};

export const KART_TRACKS: KartTrackDef[] = [
  {
    id: 'meadow',
    name: 'Sunny Meadow Loop',
    themeLabel: 'Cup Race 1 · Rolling Hills',
    groundColor: '#15803d',
    groundAccent: '#22c55e',
    roadColor: '#475569',
    curbA: '#f97316',
    curbB: '#f8fafc',
    roadWidth: 165,
    waypoints: [
      [0, -680],
      [620, -660],
      [960, -240],
      [820, 260],
      [340, 480],
      [-180, 320],
      [-640, 560],
      [-980, 180],
      [-820, -420],
    ],
  },
  {
    id: 'boardwalk',
    name: 'Coral Boardwalk',
    themeLabel: 'Cup Race 2 · Tropical Coast',
    groundColor: '#0369a1',
    groundAccent: '#fde68a',
    roadColor: '#a16207',
    curbA: '#38bdf8',
    curbB: '#fef08a',
    roadWidth: 158,
    waypoints: [
      [0, -740],
      [760, -700],
      [1040, -140],
      [580, 140],
      [900, 620],
      [180, 740],
      [-460, 480],
      [-980, 240],
      [-900, -420],
    ],
  },
  {
    id: 'canyon',
    name: 'Magma Canyon',
    themeLabel: 'Cup Race 3 · Desert Gorge',
    groundColor: '#7c2d12',
    groundAccent: '#ea580c',
    roadColor: '#334155',
    curbA: '#fbbf24',
    curbB: '#dc2626',
    roadWidth: 152,
    waypoints: [
      [0, -760],
      [640, -680],
      [1020, -340],
      [660, 40],
      [1020, 460],
      [360, 760],
      [-360, 620],
      [-960, 380],
      [-640, -80],
      [-940, -520],
    ],
  },
  {
    id: 'nebula',
    name: 'Starlight Nebula',
    themeLabel: 'Cup Race 4 · Cosmic Circuit',
    groundColor: '#090d1a',
    groundAccent: '#0284c7',
    roadColor: '#1e293b',
    curbA: '#38bdf8',
    curbB: '#34d399',
    roadWidth: 148,
    waypoints: [
      [0, -820],
      [740, -760],
      [1100, -280],
      [580, -20],
      [980, 480],
      [320, 820],
      [-280, 460],
      [-860, 720],
      [-1080, 120],
      [-620, -360],
      [-880, -700],
    ],
  },
];
