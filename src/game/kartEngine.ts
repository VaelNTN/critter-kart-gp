import { KartSound } from '../audio/sound';
import {
  CRITTER_DRIVERS,
  CritterDriverDef,
  KART_ITEMS,
  KartPowerItemId,
  KartTrackDef,
} from '../data/kartCatalog';

export interface KartHudSnapshot {
  position: number; // 1..6
  totalKarts: number;
  lap: number; // 1..3
  totalLaps: number;
  speedKmh: number;
  heldItem: KartPowerItemId | null;
  driftLevel: 0 | 1 | 2 | 3;
  hasShield: boolean;
  wrongWay: boolean;
  countdown: number;
  raceElapsedMs: number;
  finished: boolean;
  standings: Array<{ name: string; species: string; isPlayer: boolean; finishTimeMs: number }>;
}

interface TrackSample {
  x: number;
  y: number;
  tx: number;
  ty: number;
}

interface MysteryCrate {
  segIdx: number;
  offset: number;
  x: number;
  y: number;
  respawnTimer: number;
}

interface BoostStrip {
  x: number;
  y: number;
  angle: number;
}

interface ActiveHazard {
  x: number;
  y: number;
  kind: 'mud_splatter' | 'honey_glaze';
  ownerIdx: number;
  life: number;
}

interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ownerIdx: number;
  life: number;
}

interface SkidMark {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  alpha: number;
  color: string;
}

interface KartParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
}

interface ShockRing {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  alpha: number;
}

interface FloatingBanner {
  text: string;
  x: number;
  y: number;
  color: string;
  life: number;
  maxLife: number;
}

interface BiomeProp {
  x: number;
  y: number;
  size: number;
  variant: number;
  rot: number;
}

interface KartEntity {
  idx: number;
  driver: CritterDriverDef;
  isPlayer: boolean;
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  angle: number;
  speed: number;
  segIdx: number;
  lap: number;
  lapCheckpointPassed: boolean;
  progress: number;
  maxProgress: number;
  finished: boolean;
  finishTimeMs: number;
  heldItem: KartPowerItemId | null;
  hasShield: boolean;
  boostTimer: number;
  cometTimer: number;
  spinTimer: number;
  slowTimer: number;
  drifting: boolean;
  driftDir: number;
  driftCharge: number;
  driftLevel: 0 | 1 | 2 | 3;
  aiOffset: number;
  aiSkill: number;
}

function catmullRom(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  );
}

export function drawCritterKartSprite(
  ctx: CanvasRenderingContext2D,
  driver: CritterDriverDef,
  x: number,
  y: number,
  angle: number,
  scale = 1,
  hasShield = false,
  comet = false,
  driftLevel: 0 | 1 | 2 | 3 = 0
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(scale, scale);

  // Shadow
  ctx.fillStyle = 'rgba(2, 6, 23, 0.35)';
  ctx.beginPath();
  ctx.ellipse(-2, 4, 24, 15, 0, 0, Math.PI * 2);
  ctx.fill();

  // Comet rainbow-gold aura
  if (comet) {
    ctx.strokeStyle = '#fde047';
    ctx.fillStyle = 'rgba(250, 204, 21, 0.22)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Drift sparks behind rear tires
  if (driftLevel > 0) {
    const sparkColor =
      driftLevel === 3 ? '#fbbf24' : driftLevel === 2 ? '#fb923c' : '#38bdf8';
    ctx.fillStyle = sparkColor;
    for (const sy of [-12, 12]) {
      ctx.beginPath();
      ctx.arc(-24, sy, 4 + driftLevel * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 4 chunky kart wheels
  ctx.fillStyle = '#0f172a';
  for (const [wx, wy, rw, rh] of [
    [-13, -15, 11, 6],
    [-13, 9, 11, 6],
    [10, -14, 9, 5],
    [10, 9, 9, 5],
  ]) {
    ctx.beginPath();
    ctx.roundRect(wx, wy, rw, rh, 2);
    ctx.fill();
  }

  // Rear Spoiler
  ctx.fillStyle = driver.accentColor;
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.roundRect(-22, -11, 6, 22, 2);
  ctx.fill();
  ctx.stroke();

  // Kart Body
  ctx.fillStyle = driver.kartColor;
  ctx.beginPath();
  ctx.moveTo(-18, -11);
  ctx.lineTo(14, -9);
  ctx.quadraticCurveTo(24, 0, 14, 9);
  ctx.lineTo(-18, 11);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Racing Stripe
  ctx.fillStyle = driver.accentColor;
  ctx.fillRect(-10, -3, 24, 6);

  // Critter Driver Head & Ears/Crest/Spikes (seen top-down!)
  ctx.fillStyle = driver.furColor;
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.5;

  if (driver.earStyle === 'pointed' || driver.earStyle === 'tall') {
    const earLen = driver.earStyle === 'tall' ? 11 : 7;
    ctx.beginPath();
    ctx.ellipse(-4, -9, earLen * 0.6, 3.5, -0.5, 0, Math.PI * 2);
    ctx.ellipse(-4, 9, earLen * 0.6, 3.5, 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (driver.earStyle === 'round') {
    ctx.beginPath();
    ctx.arc(-4, -8, 3.5, 0, Math.PI * 2);
    ctx.arc(-4, 8, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (driver.earStyle === 'spike') {
    // Bramble Hedgehog radiating quill fan behind the head
    const spikeAngles = [-2.55, -2.85, Math.PI, 2.85, 2.55];
    ctx.fillStyle = driver.kartColor;
    for (const sa of spikeAngles) {
      ctx.beginPath();
      const bx1 = -2 + Math.cos(sa - 0.25) * 6;
      const by1 = Math.sin(sa - 0.25) * 6;
      const tipX = -2 + Math.cos(sa) * 14.5;
      const tipY = Math.sin(sa) * 14.5;
      const bx2 = -2 + Math.cos(sa + 0.25) * 6;
      const by2 = Math.sin(sa + 0.25) * 6;
      ctx.moveTo(bx1, by1);
      ctx.lineTo(tipX, tipY);
      ctx.lineTo(bx2, by2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.fillStyle = driver.furColor;
  }

  // Head circle
  ctx.beginPath();
  ctx.arc(-2, 0, 8.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  if (driver.earStyle === 'crest') {
    // Kiki Toucan bright beak + feather crest, or Rex Gecko solar fin crest
    if (driver.id === 'kiki_toucan') {
      // Vibrant toucan beak extending forward
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.moveTo(5, -3.5);
      ctx.quadraticCurveTo(15, 0, 5, 3.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    // Swept dorsal crest tufts along head centerline
    ctx.fillStyle = driver.accentColor;
    ctx.beginPath();
    ctx.moveTo(-12.5, 0);
    ctx.lineTo(-7, -4);
    ctx.lineTo(-4, -1.8);
    ctx.lineTo(-8.5, -5.5);
    ctx.lineTo(0, -2.2);
    ctx.lineTo(2, 0);
    ctx.lineTo(0, 2.2);
    ctx.lineTo(-8.5, 5.5);
    ctx.lineTo(-4, 1.8);
    ctx.lineTo(-7, 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Racing Goggles
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.roundRect(1, -6.5, 5.5, 13, 3);
  ctx.fill();
  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.arc(4, -3, 1.8, 0, Math.PI * 2);
  ctx.arc(4, 3, 1.8, 0, Math.PI * 2);
  ctx.fill();

  // Bubble Shield
  if (hasShield) {
    ctx.strokeStyle = 'rgba(125, 211, 252, 0.9)';
    ctx.fillStyle = 'rgba(56, 189, 248, 0.16)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 27, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}

export class CritterKartEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private sfx: KartSound;
  private track: KartTrackDef;
  private onHud: (snap: KartHudSnapshot) => void;
  private onFinish: (snap: KartHudSnapshot) => void;

  private samples: TrackSample[] = [];
  private crates: MysteryCrate[] = [];
  private boostPads: BoostStrip[] = [];
  private hazards: ActiveHazard[] = [];
  private projectiles: Projectile[] = [];
  private karts: KartEntity[] = [];
  private skidMarks: SkidMark[] = [];
  private particles: KartParticle[] = [];
  private shockRings: ShockRing[] = [];
  private banners: FloatingBanner[] = [];
  private props: BiomeProp[] = [];

  private trackMinX = -1000;
  private trackMaxX = 1000;
  private trackMinY = -800;
  private trackMaxY = 800;

  private rafId: number | null = null;
  private lastTs = 0;
  private time = 0;
  private raceElapsedMs = 0;
  private countdownTimer = 2.6;
  private lastBeep = 4;
  private finished = false;
  private paused = false;
  private wrongWayTimer = 0;
  private readonly totalLaps = 3;

  private camX = 0;
  private camY = 0;

  public input = {
    left: false,
    right: false,
    gas: true,
    brake: false,
    drift: false,
  };

  constructor(
    canvas: HTMLCanvasElement,
    sfx: KartSound,
    playerDriverId: string,
    track: KartTrackDef,
    onHud: (snap: KartHudSnapshot) => void,
    onFinish: (snap: KartHudSnapshot) => void
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.sfx = sfx;
    this.track = track;
    this.onHud = onHud;
    this.onFinish = onFinish;

    this.buildSamples();
    this.spawnProps();
    this.spawnBiomeScenery();
    this.spawnKarts(playerDriverId);
  }

  private buildSamples(): void {
    const pts = this.track.waypoints;
    const n = pts.length;
    const perSeg = 22;
    const raw: Array<[number, number]> = [];
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n];
      const p1 = pts[i];
      const p2 = pts[(i + 1) % n];
      const p3 = pts[(i + 2) % n];
      for (let s = 0; s < perSeg; s++) {
        const t = s / perSeg;
        raw.push([
          catmullRom(p0[0], p1[0], p2[0], p3[0], t),
          catmullRom(p0[1], p1[1], p2[1], p3[1], t),
        ]);
      }
    }

    this.trackMinX = Infinity;
    this.trackMaxX = -Infinity;
    this.trackMinY = Infinity;
    this.trackMaxY = -Infinity;

    this.samples = raw.map((pt, idx) => {
      if (pt[0] < this.trackMinX) this.trackMinX = pt[0];
      if (pt[0] > this.trackMaxX) this.trackMaxX = pt[0];
      if (pt[1] < this.trackMinY) this.trackMinY = pt[1];
      if (pt[1] > this.trackMaxY) this.trackMaxY = pt[1];

      const nxt = raw[(idx + 1) % raw.length];
      const dx = nxt[0] - pt[0];
      const dy = nxt[1] - pt[1];
      const len = Math.max(0.001, Math.hypot(dx, dy));
      return { x: pt[0], y: pt[1], tx: dx / len, ty: dy / len };
    });
  }

  private spawnProps(): void {
    const len = this.samples.length;
    // Prism Mystery Crates at 3 stretches
    for (const frac of [0.22, 0.54, 0.82]) {
      const segIdx = Math.floor(frac * len);
      const s = this.samples[segIdx];
      const nx = -s.ty;
      const ny = s.tx;
      for (const offset of [-44, 0, 44]) {
        this.crates.push({
          segIdx,
          offset,
          x: s.x + nx * offset,
          y: s.y + ny * offset,
          respawnTimer: 0,
        });
      }
    }

    // Boost strips
    for (const frac of [0.12, 0.4, 0.68, 0.91]) {
      const s = this.samples[Math.floor(frac * len)];
      this.boostPads.push({
        x: s.x,
        y: s.y,
        angle: Math.atan2(s.ty, s.tx),
      });
    }
  }

  private spawnBiomeScenery(): void {
    // Deterministic pseudo-random biome props well outside the road curb
    const clearanceSq = (this.track.roadWidth * 0.5 + 62) ** 2;
    let seed = 1337 + this.track.id.charCodeAt(0) * 97;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    const pad = 280;
    const spanX = this.trackMaxX - this.trackMinX + pad * 2;
    const spanY = this.trackMaxY - this.trackMinY + pad * 2;

    for (let attempt = 0; attempt < 220 && this.props.length < 72; attempt++) {
      const x = this.trackMinX - pad + rand() * spanX;
      const y = this.trackMinY - pad + rand() * spanY;

      let clear = true;
      for (let i = 0; i < this.samples.length; i += 2) {
        const s = this.samples[i];
        const dx = s.x - x;
        const dy = s.y - y;
        if (dx * dx + dy * dy < clearanceSq) {
          clear = false;
          break;
        }
      }
      if (!clear) continue;

      this.props.push({
        x,
        y,
        size: 16 + rand() * 20,
        variant: Math.floor(rand() * 3),
        rot: rand() * Math.PI * 2,
      });
    }
  }

  private spawnKarts(playerDriverId: string): void {
    const playerDriver = CRITTER_DRIVERS.find((d) => d.id === playerDriverId) || CRITTER_DRIVERS[0];
    const rivals = CRITTER_DRIVERS.filter((d) => d.id !== playerDriver.id).slice(0, 5);
    const lineup = [playerDriver, ...rivals];

    const startSeg = 0;
    const len = this.samples.length;

    lineup.forEach((driver, i) => {
      const seg = (startSeg - 2 - i * 2 + len) % len;
      const s = this.samples[seg];
      const nx = -s.ty;
      const ny = s.tx;
      const lateral = i % 2 === 0 ? -28 : 28;
      const kx = s.x + nx * lateral;
      const ky = s.y + ny * lateral;
      this.karts.push({
        idx: i,
        driver,
        isPlayer: i === 0,
        x: kx,
        y: ky,
        prevX: kx,
        prevY: ky,
        angle: Math.atan2(s.ty, s.tx),
        speed: 0,
        segIdx: seg,
        lap: 1,
        lapCheckpointPassed: false,
        progress: (seg - len) / len,
        maxProgress: (seg - len) / len,
        finished: false,
        finishTimeMs: 0,
        heldItem: null,
        hasShield: false,
        boostTimer: 0,
        cometTimer: 0,
        spinTimer: 0,
        slowTimer: 0,
        drifting: false,
        driftDir: 0,
        driftCharge: 0,
        driftLevel: 0,
        aiOffset: ((i % 3) - 1) * 32,
        aiSkill: 0.91 + (i % 3) * 0.045,
      });
    });

    this.camX = this.karts[0].x;
    this.camY = this.karts[0].y;
  }

  private spawnBurst(x: number, y: number, colors: string[], count = 12, speed = 150): void {
    for (let i = 0; i < count; i++) {
      const ang = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.45;
      const spd = speed * (0.45 + Math.random() * 0.85);
      const maxLife = 0.28 + Math.random() * 0.32;
      this.particles.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        size: 3 + Math.random() * 4.5,
        color: colors[i % colors.length],
        life: maxLife,
        maxLife,
      });
    }
    if (this.particles.length > 220) {
      this.particles.splice(0, this.particles.length - 220);
    }
  }

  private addBanner(text: string, x: number, y: number, color = '#fef08a'): void {
    this.banners.push({
      text,
      x,
      y,
      color,
      life: 1.15,
      maxLife: 1.15,
    });
  }

  public setPaused(paused: boolean): void {
    this.paused = paused;
    if (paused) {
      this.sfx.stopEngine();
    } else {
      this.lastTs = performance.now();
    }
  }

  public isPaused(): boolean {
    return this.paused;
  }

  public useHeldItem(): void {
    const player = this.karts[0];
    if (!player || !player.heldItem || this.countdownTimer > 0 || player.finished || this.paused) return;
    this.triggerKartItem(player, player.heldItem);
    player.heldItem = null;
    this.emitHud();
  }

  private triggerKartItem(k: KartEntity, item: KartPowerItemId): void {
    if (item === 'chili_boost') {
      k.boostTimer = 1.65;
      this.spawnBurst(k.x, k.y, ['#ef4444', '#fb923c', '#fde047'], 16, 170);
      if (k.isPlayer) {
        this.sfx.playBoost();
        this.addBanner('CHILI BOOST!', k.x, k.y - 36, '#fb923c');
      }
    } else if (item === 'hyper_comet') {
      k.cometTimer = 3.2;
      k.boostTimer = 3.2;
      this.spawnBurst(k.x, k.y, ['#fde047', '#38bdf8', '#ffffff'], 20, 200);
      if (k.isPlayer) {
        this.sfx.playBoost();
        this.addBanner('HYPER COMET!', k.x, k.y - 36, '#fde047');
      }
    } else if (item === 'bubble_shield') {
      k.hasShield = true;
      this.spawnBurst(k.x, k.y, ['#38bdf8', '#bae6fd', '#ffffff'], 12, 110);
      if (k.isPlayer) {
        this.sfx.playTap();
        this.addBanner('SHIELD ACTIVE!', k.x, k.y - 36, '#38bdf8');
      }
    } else if (item === 'mud_splatter' || item === 'honey_glaze') {
      this.hazards.push({
        x: k.x - Math.cos(k.angle) * 36,
        y: k.y - Math.sin(k.angle) * 36,
        kind: item,
        ownerIdx: k.idx,
        life: 14,
      });
      if (k.isPlayer) {
        this.sfx.playTap();
        this.addBanner(item === 'mud_splatter' ? 'MUD DROPPED!' : 'HONEY TRAP!', k.x, k.y - 34, '#fbbf24');
      }
    } else if (item === 'acorn_rocket') {
      this.projectiles.push({
        x: k.x + Math.cos(k.angle) * 28,
        y: k.y + Math.sin(k.angle) * 28,
        vx: Math.cos(k.angle) * 660,
        vy: Math.sin(k.angle) * 660,
        ownerIdx: k.idx,
        life: 3.5,
      });
      if (k.isPlayer) {
        this.sfx.playBoost();
        this.addBanner('ROCKET FIRED!', k.x, k.y - 34, '#f59e0b');
      }
    } else if (item === 'sonic_honk') {
      this.shockRings.push({
        x: k.x,
        y: k.y,
        radius: 18,
        maxRadius: 170,
        color: '#2dd4bf',
        alpha: 0.9,
      });
      if (k.isPlayer) {
        this.sfx.playBoost();
        this.addBanner('SONIC HONK!', k.x, k.y - 36, '#2dd4bf');
      }
      for (const other of this.karts) {
        if (other.idx === k.idx) continue;
        if (Math.hypot(other.x - k.x, other.y - k.y) < 165) {
          this.hitKart(other);
        }
      }
    }
  }

  private hitKart(k: KartEntity): void {
    if (k.cometTimer > 0) return;
    if (k.hasShield) {
      k.hasShield = false;
      this.spawnBurst(k.x, k.y, ['#38bdf8', '#e0f2fe', '#ffffff'], 14, 140);
      if (k.isPlayer) {
        this.sfx.playTap();
        this.addBanner('SHIELD BLOCKED!', k.x, k.y - 34, '#7dd3fc');
      }
      return;
    }
    k.spinTimer = 0.85;
    k.speed *= 0.35;
    this.spawnBurst(k.x, k.y, ['#ef4444', '#f97316', '#fde047'], 16, 175);
    if (k.isPlayer) this.sfx.playItemHit();
  }

  public start(): void {
    if (this.rafId !== null) return;
    this.lastTs = performance.now();
    const tick = (ts: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (ts - this.lastTs) / 1000));
      this.lastTs = ts;
      if (!this.paused) {
        this.update(dt);
      }
      this.render();
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  public stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.sfx.stopEngine();
  }

  private update(dt: number): void {
    this.time += dt;

    // Update particles, skidmarks, shock rings, and floating banners
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vx *= 1 - Math.min(0.4, 2.5 * dt);
      pt.vy *= 1 - Math.min(0.4, 2.5 * dt);
      pt.life -= dt;
      if (pt.life <= 0) this.particles.splice(i, 1);
    }

    for (let i = this.skidMarks.length - 1; i >= 0; i--) {
      this.skidMarks[i].alpha -= dt * 0.16;
      if (this.skidMarks[i].alpha <= 0) this.skidMarks.splice(i, 1);
    }

    for (let i = this.shockRings.length - 1; i >= 0; i--) {
      const r = this.shockRings[i];
      r.radius += (r.maxRadius - r.radius) * Math.min(1, 9 * dt) + 90 * dt;
      r.alpha -= dt * 2.2;
      if (r.alpha <= 0 || r.radius >= r.maxRadius) this.shockRings.splice(i, 1);
    }

    for (let i = this.banners.length - 1; i >= 0; i--) {
      const b = this.banners[i];
      b.y -= 34 * dt;
      b.life -= dt;
      if (b.life <= 0) this.banners.splice(i, 1);
    }

    if (this.countdownTimer > 0) {
      this.countdownTimer -= dt;
      const step = Math.ceil(this.countdownTimer);
      if (step < this.lastBeep && step >= 1) {
        this.lastBeep = step;
        this.sfx.playCountdown(false);
      }
      if (this.countdownTimer <= 0) {
        this.countdownTimer = 0;
        this.sfx.playCountdown(true);
        const p = this.karts[0];
        if (p) this.addBanner('GO!!', p.x, p.y - 36, '#4ade80');
      }
      this.sfx.updateEngine(0.12, false, false, false);
      this.emitHud();
      return;
    }

    this.raceElapsedMs += dt * 1000;

    // Update Crates
    for (const c of this.crates) {
      if (c.respawnTimer > 0) c.respawnTimer = Math.max(0, c.respawnTimer - dt);
    }

    // Update Hazards
    for (let i = this.hazards.length - 1; i >= 0; i--) {
      this.hazards[i].life -= dt;
      if (this.hazards[i].life <= 0) this.hazards.splice(i, 1);
    }

    // Update Projectiles (Acorn Rockets gently home toward nearest kart ahead)
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= dt;
      let target: KartEntity | null = null;
      let bestDist = 260;
      for (const k of this.karts) {
        if (k.idx === p.ownerIdx) continue;
        const d = Math.hypot(k.x - p.x, k.y - p.y);
        if (d < bestDist) {
          bestDist = d;
          target = k;
        }
      }
      if (target) {
        const dx = target.x - p.x;
        const dy = target.y - p.y;
        const len = Math.max(1, Math.hypot(dx, dy));
        p.vx += ((dx / len) * 680 - p.vx) * Math.min(1, 4.5 * dt);
        p.vy += ((dy / len) * 680 - p.vy) * Math.min(1, 4.5 * dt);
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      let hit = false;
      for (const k of this.karts) {
        if (k.idx === p.ownerIdx) continue;
        if (Math.hypot(k.x - p.x, k.y - p.y) < 26) {
          this.hitKart(k);
          hit = true;
          break;
        }
      }
      if (hit || p.life <= 0) {
        if (hit) this.spawnBurst(p.x, p.y, ['#d97706', '#fbbf24', '#ef4444'], 12, 160);
        this.projectiles.splice(i, 1);
      }
    }

    // Update Karts
    const len = this.samples.length;
    for (const k of this.karts) {
      k.prevX = k.x;
      k.prevY = k.y;

      if (k.boostTimer > 0) k.boostTimer = Math.max(0, k.boostTimer - dt);
      if (k.cometTimer > 0) k.cometTimer = Math.max(0, k.cometTimer - dt);
      if (k.spinTimer > 0) k.spinTimer = Math.max(0, k.spinTimer - dt);
      if (k.slowTimer > 0) k.slowTimer = Math.max(0, k.slowTimer - dt);

      const maxSpd =
        (305 + k.driver.speedStat * 9.5) *
        (k.isPlayer ? 1.0 : k.aiSkill) *
        (k.cometTimer > 0 ? 1.38 : k.boostTimer > 0 ? 1.28 : 1.0) *
        (k.slowTimer > 0 ? 0.55 : 1.0);
      const accel = 220 + k.driver.accelStat * 14;

      if (k.spinTimer > 0) {
        k.angle += dt * 11;
        k.speed = Math.max(40, k.speed - 140 * dt);
      } else if (k.isPlayer && !k.finished) {
        const steerInput = (this.input.right ? 1 : 0) - (this.input.left ? 1 : 0);

        // Drift Mini-Turbo Mechanic
        if (this.input.drift && k.speed > 130 && (steerInput !== 0 || k.drifting)) {
          if (!k.drifting) {
            k.drifting = true;
            k.driftDir = steerInput || 1;
            k.driftCharge = 0;
          }
          k.angle += (k.driftDir * 1.9 + steerInput * 1.1) * dt;
          k.driftCharge += dt;
          k.driftLevel = k.driftCharge > 1.7 ? 3 : k.driftCharge > 1.0 ? 2 : k.driftCharge > 0.45 ? 1 : 0;
        } else {
          if (k.drifting && k.driftLevel > 0) {
            const lvl = k.driftLevel;
            k.boostTimer = 0.55 + lvl * 0.35;
            this.sfx.playBoost();
            this.spawnBurst(
              k.x - Math.cos(k.angle) * 20,
              k.y - Math.sin(k.angle) * 20,
              lvl === 3 ? ['#fde047', '#f59e0b', '#ffffff'] : lvl === 2 ? ['#fb923c', '#fde047'] : ['#38bdf8', '#bae6fd'],
              10 + lvl * 4,
              140
            );
            const label = lvl === 3 ? '+ULTRA TURBO!' : lvl === 2 ? '+SUPER TURBO!' : '+MINI-TURBO!';
            const col = lvl === 3 ? '#fde047' : lvl === 2 ? '#fb923c' : '#38bdf8';
            this.addBanner(label, k.x, k.y - 36, col);
          }
          k.drifting = false;
          k.driftCharge = 0;
          k.driftLevel = 0;
          k.angle += steerInput * 2.45 * dt;
        }

        if (this.input.brake) {
          k.speed = Math.max(0, k.speed - 360 * dt);
        } else if (this.input.gas) {
          k.speed += (maxSpd - k.speed) * Math.min(1, (accel / maxSpd) * dt * 1.6);
        }
      } else {
        // AI Steering & Item Usage
        const lookSeg = (k.segIdx + 8) % len;
        const targetS = this.samples[lookSeg];
        const tx = targetS.x + -targetS.ty * k.aiOffset;
        const ty = targetS.y + targetS.tx * k.aiOffset;
        const desired = Math.atan2(ty - k.y, tx - k.x);
        let diff = desired - k.angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        k.angle += Math.max(-3.1 * dt, Math.min(3.1 * dt, diff * 4.0 * dt));
        k.speed += (maxSpd - k.speed) * Math.min(1, (accel / maxSpd) * dt * 1.5);

        if (k.heldItem && !k.finished && Math.random() < 0.014) {
          this.triggerKartItem(k, k.heldItem);
          k.heldItem = null;
        }
      }

      k.x += Math.cos(k.angle) * k.speed * dt;
      k.y += Math.sin(k.angle) * k.speed * dt;

      // Emit tire skidmarks while drifting
      if (k.drifting && k.speed > 110) {
        const cos = Math.cos(k.angle);
        const sin = Math.sin(k.angle);
        const skidCol =
          k.driftLevel === 3
            ? 'rgba(251, 191, 36, 0.55)'
            : k.driftLevel === 2
              ? 'rgba(251, 146, 60, 0.45)'
              : 'rgba(15, 23, 42, 0.42)';
        for (const lat of [-11, 11]) {
          const rx1 = k.prevX - cos * 14 - sin * lat;
          const ry1 = k.prevY - sin * 14 + cos * lat;
          const rx2 = k.x - cos * 14 - sin * lat;
          const ry2 = k.y - sin * 14 + cos * lat;
          this.skidMarks.push({ x1: rx1, y1: ry1, x2: rx2, y2: ry2, alpha: 0.72, color: skidCol });
        }
        if (this.skidMarks.length > 260) {
          this.skidMarks.splice(0, this.skidMarks.length - 260);
        }
      }

      // Boost exhaust sparkles
      if ((k.boostTimer > 0 || k.cometTimer > 0) && Math.random() < 0.6) {
        const bx = k.x - Math.cos(k.angle) * 20;
        const by = k.y - Math.sin(k.angle) * 20;
        this.particles.push({
          x: bx + (Math.random() - 0.5) * 8,
          y: by + (Math.random() - 0.5) * 8,
          vx: -Math.cos(k.angle) * 70 + (Math.random() - 0.5) * 35,
          vy: -Math.sin(k.angle) * 70 + (Math.random() - 0.5) * 35,
          size: 3 + Math.random() * 3,
          color: k.cometTimer > 0 ? '#fde047' : '#fb923c',
          life: 0.24,
          maxLife: 0.24,
        });
      }

      // Nearest track segment & off-road damping
      let bestIdx = k.segIdx;
      let bestDistSq = Infinity;
      for (let off = -12; off <= 18; off++) {
        const idx = (k.segIdx + off + len) % len;
        const s = this.samples[idx];
        const dSq = (s.x - k.x) ** 2 + (s.y - k.y) ** 2;
        if (dSq < bestDistSq) {
          bestDistSq = dSq;
          bestIdx = idx;
        }
      }
      const prevSeg = k.segIdx;
      k.segIdx = bestIdx;
      const distFromCenter = Math.sqrt(bestDistSq);
      const halfRoad = this.track.roadWidth * 0.5;
      if (distFromCenter > halfRoad + 14 && k.cometTimer <= 0 && k.boostTimer <= 0) {
        k.speed *= 1 - Math.min(0.45, 2.2 * dt);
      }
      if (distFromCenter > halfRoad + 75) {
        const s = this.samples[bestIdx];
        k.x += (s.x - k.x) * 0.25;
        k.y += (s.y - k.y) * 0.25;
      }

      // Wrong-way detection for player
      if (k.isPlayer && !k.finished) {
        const segSample = this.samples[bestIdx];
        const headingDot = Math.cos(k.angle) * segSample.tx + Math.sin(k.angle) * segSample.ty;
        if (k.spinTimer <= 0 && k.speed > 35 && headingDot < -0.35) {
          this.wrongWayTimer = Math.min(1, this.wrongWayTimer + dt);
        } else {
          this.wrongWayTimer = Math.max(0, this.wrongWayTimer - dt * 2.5);
        }
      }

      // Mid-track checkpoint gating (0.4*len..0.6*len) prevents instant Lap 2 bug on start!
      if (bestIdx >= len * 0.4 && bestIdx <= len * 0.6) {
        k.lapCheckpointPassed = true;
      }

      // Lap increment only when checkpoint was passed and crossing finish line forward
      if (k.lapCheckpointPassed && prevSeg > len * 0.8 && bestIdx < len * 0.2) {
        k.lap += 1;
        k.lapCheckpointPassed = false;
        if (k.isPlayer && k.lap <= this.totalLaps) {
          this.sfx.playLap();
          this.addBanner(
            k.lap === this.totalLaps ? 'FINAL LAP!' : `LAP ${k.lap}/${this.totalLaps}!`,
            k.x,
            k.y - 44,
            k.lap === this.totalLaps ? '#fde047' : '#4ade80'
          );
        }
        if (k.lap > this.totalLaps && !k.finished) {
          k.finished = true;
          k.finishTimeMs = this.raceElapsedMs;
          if (k.isPlayer) {
            this.finished = true;
            this.sfx.playFinish();
          }
        }
      }

      // Accurate race progress (handles pre-start-line grid cleanly on lap 1)
      if (k.lap === 1 && !k.lapCheckpointPassed && bestIdx > len * 0.8) {
        k.progress = (bestIdx - len) / len;
      } else {
        k.progress = (k.lap - 1) + bestIdx / len;
      }
      if (k.progress > k.maxProgress) k.maxProgress = k.progress;

      // Boost Pads
      for (const pad of this.boostPads) {
        if (Math.hypot(pad.x - k.x, pad.y - k.y) < 32 && k.boostTimer < 0.8) {
          k.boostTimer = 1.05;
          this.spawnBurst(pad.x, pad.y, ['#38bdf8', '#fde047', '#ffffff'], 10, 140);
          if (k.isPlayer) {
            this.sfx.playBoost();
            this.addBanner('BOOST PAD!', k.x, k.y - 34, '#38bdf8');
          }
        }
      }

      // Prism Mystery Crates
      for (const c of this.crates) {
        if (c.respawnTimer <= 0 && Math.hypot(c.x - k.x, c.y - k.y) < 30) {
          c.respawnTimer = 4.5;
          this.spawnBurst(c.x, c.y, ['#38bdf8', '#fef08a', '#ffffff'], 14, 155);
          if (!k.heldItem) {
            const keys = Object.keys(KART_ITEMS) as KartPowerItemId[];
            k.heldItem = keys[Math.floor(Math.random() * keys.length)];
            if (k.isPlayer) {
              this.sfx.playCrate();
              this.addBanner(KART_ITEMS[k.heldItem].name.toUpperCase() + '!', k.x, k.y - 38, KART_ITEMS[k.heldItem].color);
            }
          }
        }
      }

      // Track Hazards (Mud / Honey)
      for (let hIdx = this.hazards.length - 1; hIdx >= 0; hIdx--) {
        const hz = this.hazards[hIdx];
        if (hz.ownerIdx === k.idx && hz.life > 12.8) continue;
        if (Math.hypot(hz.x - k.x, hz.y - k.y) < 26) {
          if (hz.kind === 'mud_splatter') {
            this.hitKart(k);
          } else {
            k.slowTimer = 1.5;
            this.spawnBurst(hz.x, hz.y, ['#f59e0b', '#fef08a'], 10, 110);
            if (k.isPlayer) {
              this.sfx.playItemHit();
              this.addBanner('STICKY HONEY!', k.x, k.y - 34, '#f59e0b');
            }
          }
          this.hazards.splice(hIdx, 1);
        }
      }
    }

    // Gentle kart-to-kart bumper push
    for (let i = 0; i < this.karts.length; i++) {
      for (let j = i + 1; j < this.karts.length; j++) {
        const a = this.karts[i];
        const b = this.karts[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy);
        if (d > 0.1 && d < 32) {
          const push = (32 - d) * 0.5;
          a.x -= (dx / d) * push;
          a.y -= (dy / d) * push;
          b.x += (dx / d) * push;
          b.y += (dy / d) * push;
        }
      }
    }

    // Smooth camera follow + engine audio update
    const p = this.karts[0];
    this.camX += (p.x - this.camX) * Math.min(1, 8 * dt);
    this.camY += (p.y - this.camY) * Math.min(1, 8 * dt);
    this.sfx.updateEngine(
      p.speed / 390,
      p.drifting,
      p.boostTimer > 0 || p.cometTimer > 0,
      !this.finished && !this.paused
    );

    this.emitHud();
    if (this.finished) {
      this.stop();
      this.onFinish(this.buildSnapshot());
    }
  }

  private buildSnapshot(): KartHudSnapshot {
    const sorted = [...this.karts].sort((a, b) => {
      if (a.finished && b.finished) return a.finishTimeMs - b.finishTimeMs;
      if (a.finished) return -1;
      if (b.finished) return 1;
      return b.progress - a.progress;
    });
    const p = this.karts[0];
    const pos = sorted.findIndex((k) => k.isPlayer) + 1;
    return {
      position: pos,
      totalKarts: this.karts.length,
      lap: Math.min(this.totalLaps, p.lap),
      totalLaps: this.totalLaps,
      speedKmh: Math.round(p.speed * 0.42),
      heldItem: p.heldItem,
      driftLevel: p.driftLevel,
      hasShield: p.hasShield,
      wrongWay: this.wrongWayTimer > 0.28,
      countdown: Math.ceil(this.countdownTimer),
      raceElapsedMs: this.raceElapsedMs,
      finished: this.finished,
      standings: sorted.map((k) => ({
        name: k.driver.name,
        species: k.driver.species,
        isPlayer: k.isPlayer,
        finishTimeMs: k.finishTimeMs,
      })),
    };
  }

  private emitHud(): void {
    this.onHud(this.buildSnapshot());
  }

  private drawBiomeProp(ctx: CanvasRenderingContext2D, prop: BiomeProp): void {
    ctx.save();
    ctx.translate(prop.x, prop.y);
    const id = this.track.id;

    if (id === 'meadow') {
      if (prop.variant === 2) {
        // Wildflower cluster
        ctx.fillStyle = '#4ade80';
        ctx.beginPath();
        ctx.arc(0, 0, prop.size * 0.55, 0, Math.PI * 2);
        ctx.fill();
        const petals = ['#fde047', '#f472b6', '#ffffff'];
        for (let i = 0; i < 4; i++) {
          const a = prop.rot + i * 1.57;
          ctx.fillStyle = petals[i % petals.length];
          ctx.beginPath();
          ctx.arc(Math.cos(a) * prop.size * 0.3, Math.sin(a) * prop.size * 0.3, 3.2, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // Layered Meadow Tree (top-down canopy)
        ctx.fillStyle = 'rgba(2, 6, 23, 0.25)';
        ctx.beginPath();
        ctx.arc(4, 5, prop.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#14532d';
        ctx.beginPath();
        ctx.arc(0, 0, prop.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = prop.variant === 0 ? '#16a34a' : '#22c55e';
        ctx.beginPath();
        ctx.arc(-prop.size * 0.16, -prop.size * 0.16, prop.size * 0.72, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#4ade80';
        ctx.beginPath();
        ctx.arc(-prop.size * 0.25, -prop.size * 0.25, prop.size * 0.34, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (id === 'boardwalk') {
      if (prop.variant === 2) {
        // Starfish / coral reef spot on water
        ctx.fillStyle = 'rgba(253, 224, 71, 0.25)';
        ctx.beginPath();
        ctx.arc(0, 0, prop.size * 0.9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fb7185';
        ctx.beginPath();
        ctx.arc(0, 0, prop.size * 0.35, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Tropical Palm Tree (sand island + radiating fronds)
        ctx.fillStyle = '#fde68a';
        ctx.beginPath();
        ctx.arc(0, 0, prop.size * 0.85, 0, Math.PI * 2);
        ctx.fill();
        ctx.rotate(prop.rot);
        ctx.fillStyle = '#16a34a';
        for (let f = 0; f < 6; f++) {
          ctx.save();
          ctx.rotate((f * Math.PI) / 3);
          ctx.beginPath();
          ctx.ellipse(prop.size * 0.55, 0, prop.size * 0.52, prop.size * 0.18, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        ctx.fillStyle = '#78350f';
        ctx.beginPath();
        ctx.arc(0, 0, prop.size * 0.22, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (id === 'canyon') {
      if (prop.variant === 0) {
        // Glowing Lava Pool
        const pulse = 0.88 + Math.sin(this.time * 3 + prop.rot) * 0.12;
        ctx.fillStyle = '#450a0a';
        ctx.beginPath();
        ctx.ellipse(0, 0, prop.size * 1.15, prop.size * 0.85, prop.rot, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ea580c';
        ctx.beginPath();
        ctx.ellipse(0, 0, prop.size * 0.86 * pulse, prop.size * 0.62 * pulse, prop.rot, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.ellipse(-3, -2, prop.size * 0.38 * pulse, prop.size * 0.26 * pulse, prop.rot, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Jagged Canyon Boulder
        ctx.rotate(prop.rot);
        ctx.fillStyle = '#451a03';
        ctx.beginPath();
        ctx.moveTo(-prop.size * 0.8, -prop.size * 0.3);
        ctx.lineTo(-prop.size * 0.2, -prop.size * 0.85);
        ctx.lineTo(prop.size * 0.75, -prop.size * 0.4);
        ctx.lineTo(prop.size * 0.6, prop.size * 0.65);
        ctx.lineTo(-prop.size * 0.5, prop.size * 0.7);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#9a3412';
        ctx.beginPath();
        ctx.arc(-prop.size * 0.12, -prop.size * 0.15, prop.size * 0.42, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // Starlight Nebula: twinkling stars & glowing cosmic crystals
      if (prop.variant === 0) {
        const tw = 0.55 + 0.45 * Math.sin(this.time * 3.5 + prop.rot * 5);
        ctx.globalAlpha = tw;
        ctx.fillStyle = '#7dd3fc';
        const r = prop.size * 0.45;
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.lineTo(r * 0.26, -r * 0.26);
        ctx.lineTo(r, 0);
        ctx.lineTo(r * 0.26, r * 0.26);
        ctx.lineTo(0, r);
        ctx.lineTo(-r * 0.26, r * 0.26);
        ctx.lineTo(-r, 0);
        ctx.lineTo(-r * 0.26, -r * 0.26);
        ctx.closePath();
        ctx.fill();
      } else if (prop.variant === 1) {
        // Nebula glowing orb / mini planet
        ctx.fillStyle = 'rgba(56, 189, 248, 0.22)';
        ctx.beginPath();
        ctx.arc(0, 0, prop.size * 0.95, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.arc(0, 0, prop.size * 0.52, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, 0, prop.size * 0.9, prop.size * 0.26, prop.rot, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        // Cosmic crystal cluster
        ctx.rotate(prop.rot);
        ctx.fillStyle = '#34d399';
        ctx.beginPath();
        ctx.moveTo(0, -prop.size * 0.7);
        ctx.lineTo(prop.size * 0.32, 0);
        ctx.lineTo(0, prop.size * 0.55);
        ctx.lineTo(-prop.size * 0.32, 0);
        ctx.closePath();
        ctx.fill();
      }
    }

    ctx.restore();
  }

  private drawMinimap(ctx: CanvasRenderingContext2D, viewW: number, viewH: number): void {
    const isLandscape = viewW > viewH;
    const mapW = isLandscape ? 104 : 96;
    const mapH = isLandscape ? 74 : 74;
    const mx = viewW - mapW - 12;
    const my = isLandscape ? 54 : 62;

    const spanX = Math.max(1, this.trackMaxX - this.trackMinX);
    const spanY = Math.max(1, this.trackMaxY - this.trackMinY);
    const pad = 10;
    const scale = Math.min((mapW - pad * 2) / spanX, (mapH - pad * 2) / spanY);
    const ox = mx + (mapW - spanX * scale) * 0.5 - this.trackMinX * scale;
    const oy = my + (mapH - spanY * scale) * 0.5 - this.trackMinY * scale;

    ctx.save();
    // Minimap container
    ctx.fillStyle = 'rgba(4, 24, 46, 0.72)';
    ctx.strokeStyle = 'rgba(125, 211, 252, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(mx, my, mapW, mapH, 12);
    ctx.fill();
    ctx.stroke();

    // Track loop outline
    ctx.beginPath();
    for (let i = 0; i < this.samples.length; i += 2) {
      const s = this.samples[i];
      const px = s.x * scale + ox;
      const py = s.y * scale + oy;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.65)';
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Start/Finish tick
    const s0 = this.samples[0];
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(s0.x * scale + ox - 2.5, s0.y * scale + oy - 2.5, 5, 5);

    // AI kart dots first, then player on top
    for (let i = this.karts.length - 1; i >= 0; i--) {
      const k = this.karts[i];
      const kx = k.x * scale + ox;
      const ky = k.y * scale + oy;
      ctx.beginPath();
      ctx.arc(kx, ky, k.isPlayer ? 4.2 : 2.8, 0, Math.PI * 2);
      ctx.fillStyle = k.isPlayer ? '#fef08a' : k.driver.kartColor;
      ctx.fill();
      if (k.isPlayer) {
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  private render(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.canvas.getBoundingClientRect();
    const cw = Math.max(320, Math.round(rect.width * dpr));
    const ch = Math.max(320, Math.round(rect.height * dpr));
    if (this.canvas.width !== cw || this.canvas.height !== ch) {
      this.canvas.width = cw;
      this.canvas.height = ch;
    }

    const ctx = this.ctx;
    ctx.save();
    ctx.scale(dpr, dpr);
    const w = rect.width || 390;
    const h = rect.height || 680;

    // 1. Biome Ground
    ctx.fillStyle = this.track.groundColor;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(w * 0.5 - this.camX, h * 0.5 - this.camY);

    // Subtle ground pattern patches
    ctx.fillStyle = this.track.groundAccent;
    ctx.globalAlpha = 0.22;
    for (let i = 0; i < 24; i++) {
      const gx = Math.sin(i * 19.3) * 1100;
      const gy = Math.cos(i * 11.7) * 850;
      ctx.beginPath();
      ctx.arc(gx, gy, 55 + (i % 4) * 20, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // 1b. Themed Biome Scenery Props (only render near camera viewport)
    const cullHalfW = w * 0.65 + 80;
    const cullHalfH = h * 0.65 + 80;
    for (const prop of this.props) {
      if (
        Math.abs(prop.x - this.camX) > cullHalfW ||
        Math.abs(prop.y - this.camY) > cullHalfH
      ) {
        continue;
      }
      this.drawBiomeProp(ctx, prop);
    }

    // 2. Track Curbs & Road Surface
    const drawLoopPath = () => {
      ctx.beginPath();
      this.samples.forEach((s, idx) => {
        if (idx === 0) ctx.moveTo(s.x, s.y);
        else ctx.lineTo(s.x, s.y);
      });
      ctx.closePath();
    };

    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // Outer Curb
    drawLoopPath();
    ctx.strokeStyle = this.track.curbA;
    ctx.lineWidth = this.track.roadWidth + 24;
    ctx.stroke();

    ctx.setLineDash([28, 28]);
    ctx.strokeStyle = this.track.curbB;
    ctx.lineWidth = this.track.roadWidth + 24;
    ctx.stroke();
    ctx.setLineDash([]);

    // Main Road Surface
    drawLoopPath();
    ctx.strokeStyle = this.track.roadColor;
    ctx.lineWidth = this.track.roadWidth;
    ctx.stroke();

    // Subtle Center Dashed Racing Line
    ctx.save();
    drawLoopPath();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.lineWidth = 3;
    ctx.setLineDash([18, 24]);
    ctx.stroke();
    ctx.restore();

    // Drift Tire Skidmarks
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    for (const sk of this.skidMarks) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, sk.alpha);
      ctx.strokeStyle = sk.color;
      ctx.beginPath();
      ctx.moveTo(sk.x1, sk.y1);
      ctx.lineTo(sk.x2, sk.y2);
      ctx.stroke();
      ctx.restore();
    }

    // Start / Finish Checkered Line
    const s0 = this.samples[0];
    const startAng = Math.atan2(s0.ty, s0.tx);
    ctx.save();
    ctx.translate(s0.x, s0.y);
    ctx.rotate(startAng);
    const halfR = this.track.roadWidth * 0.48;
    const sq = 12;
    for (let row = -Math.floor(halfR / sq); row < Math.floor(halfR / sq); row++) {
      for (let col = 0; col < 2; col++) {
        ctx.fillStyle = (row + col) % 2 === 0 ? '#ffffff' : '#0f172a';
        ctx.fillRect(col * sq - sq, row * sq, sq, sq);
      }
    }
    ctx.restore();

    // 3. Boost Strips
    for (const pad of this.boostPads) {
      ctx.save();
      ctx.translate(pad.x, pad.y);
      ctx.rotate(pad.angle);
      ctx.fillStyle = '#0ea5e9';
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-20, -24, 40, 48, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.moveTo(-6, -12);
      ctx.lineTo(10, 0);
      ctx.lineTo(-6, 12);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // 4. Prism Mystery Crates
    for (const c of this.crates) {
      if (c.respawnTimer > 0) continue;
      const bob = Math.sin(this.time * 4 + c.offset) * 3;
      ctx.save();
      ctx.translate(c.x, c.y + bob);
      ctx.rotate(this.time * 1.4);
      ctx.fillStyle = '#38bdf8';
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.roundRect(-13, -13, 26, 26, 5);
      ctx.fill();
      ctx.stroke();
      // Original 4-point Prism Star glyph
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(2.5, -2.5);
      ctx.lineTo(8, 0);
      ctx.lineTo(2.5, 2.5);
      ctx.lineTo(0, 8);
      ctx.lineTo(-2.5, 2.5);
      ctx.lineTo(-8, 0);
      ctx.lineTo(-2.5, -2.5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // 5. Hazards (Mud & Honey)
    for (const hz of this.hazards) {
      ctx.save();
      ctx.fillStyle = hz.kind === 'mud_splatter' ? '#78350f' : '#f59e0b';
      ctx.strokeStyle = hz.kind === 'mud_splatter' ? '#451a03' : '#fef08a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(hz.x, hz.y, 18, 14, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // 6. Acorn Rockets
    for (const p of this.projectiles) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(Math.atan2(p.vy, p.vx));
      ctx.fillStyle = '#d97706';
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, 10, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-10, -7, 6, 14);
      ctx.restore();
    }

    // 6b. Sonic Shock Rings
    for (const ring of this.shockRings) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, ring.alpha);
      ctx.strokeStyle = ring.color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 7. Karts
    for (const k of this.karts) {
      drawCritterKartSprite(
        ctx,
        k.driver,
        k.x,
        k.y,
        k.angle,
        1.05,
        k.hasShield,
        k.cometTimer > 0,
        k.driftLevel
      );
    }

    // 8. Particles
    for (const pt of this.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 9. Floating Feedback Banners (+MINI-TURBO!, item names, lap calls)
    for (const b of this.banners) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, (b.life / b.maxLife) * 1.4);
      ctx.font = '800 15px "Trebuchet MS", ui-rounded, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 4;
      ctx.strokeText(b.text, b.x, b.y);
      ctx.fillStyle = b.color;
      ctx.fillText(b.text, b.x, b.y);
      ctx.restore();
    }

    ctx.restore();

    // 10. Live Track Minimap (Top-Right Corner)
    this.drawMinimap(ctx, w, h);

    // 11. Wrong-Way Banner
    if (this.wrongWayTimer > 0.28 && this.countdownTimer <= 0 && !this.finished) {
      const pulse = 0.65 + 0.35 * Math.sin(this.time * 10);
      ctx.save();
      ctx.globalAlpha = pulse;
      ctx.fillStyle = 'rgba(220, 38, 38, 0.9)';
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 2.5;
      const bw = 186;
      const bh = 38;
      ctx.beginPath();
      ctx.roundRect(w * 0.5 - bw * 0.5, 76, bw, bh, 12);
      ctx.fill();
      ctx.stroke();
      ctx.font = '800 18px "Trebuchet MS", ui-rounded, system-ui, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('↺ WRONG WAY!', w * 0.5, 76 + bh * 0.5 + 1);
      ctx.restore();
    }

    // 12. Countdown
    if (this.countdownTimer > 0) {
      const n = Math.ceil(this.countdownTimer);
      ctx.save();
      ctx.font = '800 66px "Trebuchet MS", ui-rounded, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fef08a';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 7;
      ctx.strokeText(String(n), w * 0.5, h * 0.44);
      ctx.fillText(String(n), w * 0.5, h * 0.44);
      ctx.restore();
    }

    ctx.restore();
  }
}
