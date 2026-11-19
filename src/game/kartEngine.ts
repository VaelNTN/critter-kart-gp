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
  countdown: number;
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

interface KartEntity {
  idx: number;
  driver: CritterDriverDef;
  isPlayer: boolean;
  x: number;
  y: number;
  angle: number;
  speed: number;
  segIdx: number;
  lap: number;
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

  // Comet rainbow-teal aura
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

  // Critter Driver Head & Ears (seen top-down!)
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
  }

  ctx.beginPath();
  ctx.arc(-2, 0, 8.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

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

  private rafId: number | null = null;
  private lastTs = 0;
  private time = 0;
  private raceElapsedMs = 0;
  private countdownTimer = 2.6;
  private lastBeep = 4;
  private finished = false;
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

    this.samples = raw.map((pt, idx) => {
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
      this.karts.push({
        idx: i,
        driver,
        isPlayer: i === 0,
        x: s.x + nx * lateral,
        y: s.y + ny * lateral,
        angle: Math.atan2(s.ty, s.tx),
        speed: 0,
        segIdx: seg,
        lap: 1,
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

  public useHeldItem(): void {
    const player = this.karts[0];
    if (!player || !player.heldItem || this.countdownTimer > 0 || player.finished) return;
    this.triggerKartItem(player, player.heldItem);
    player.heldItem = null;
    this.emitHud();
  }

  private triggerKartItem(k: KartEntity, item: KartPowerItemId): void {
    if (item === 'chili_boost') {
      k.boostTimer = 1.65;
      if (k.isPlayer) this.sfx.playBoost();
    } else if (item === 'hyper_comet') {
      k.cometTimer = 3.2;
      k.boostTimer = 3.2;
      if (k.isPlayer) this.sfx.playBoost();
    } else if (item === 'bubble_shield') {
      k.hasShield = true;
      if (k.isPlayer) this.sfx.playTap();
    } else if (item === 'mud_splatter' || item === 'honey_glaze') {
      this.hazards.push({
        x: k.x - Math.cos(k.angle) * 36,
        y: k.y - Math.sin(k.angle) * 36,
        kind: item,
        ownerIdx: k.idx,
        life: 14,
      });
      if (k.isPlayer) this.sfx.playTap();
    } else if (item === 'acorn_rocket') {
      this.projectiles.push({
        x: k.x + Math.cos(k.angle) * 28,
        y: k.y + Math.sin(k.angle) * 28,
        vx: Math.cos(k.angle) * 660,
        vy: Math.sin(k.angle) * 660,
        ownerIdx: k.idx,
        life: 3.5,
      });
      if (k.isPlayer) this.sfx.playBoost();
    } else if (item === 'sonic_honk') {
      if (k.isPlayer) this.sfx.playBoost();
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
      if (k.isPlayer) this.sfx.playTap();
      return;
    }
    k.spinTimer = 0.85;
    k.speed *= 0.35;
    if (k.isPlayer) this.sfx.playItemHit();
  }

  public start(): void {
    if (this.rafId !== null) return;
    this.lastTs = performance.now();
    const tick = (ts: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (ts - this.lastTs) / 1000));
      this.lastTs = ts;
      this.update(dt);
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
  }

  private update(dt: number): void {
    this.time += dt;

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
      }
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
      if (hit || p.life <= 0) this.projectiles.splice(i, 1);
    }

    // Update Karts
    const len = this.samples.length;
    for (const k of this.karts) {
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
            k.boostTimer = 0.55 + k.driftLevel * 0.35;
            this.sfx.playBoost();
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

      // Lap tracking
      if (prevSeg > len * 0.8 && bestIdx < len * 0.2 && k.progress > 0.65) {
        k.lap += 1;
        if (k.isPlayer && k.lap <= this.totalLaps) {
          this.sfx.playLap();
        }
        if (k.lap > this.totalLaps && !k.finished) {
          k.finished = true;
          k.finishTimeMs = this.raceElapsedMs;
          if (k.isPlayer) {
            this.finished = true;
          }
        }
      }
      k.progress = (k.lap - 1) + bestIdx / len;
      if (k.progress > k.maxProgress) k.maxProgress = k.progress;

      // Boost Pads
      for (const pad of this.boostPads) {
        if (Math.hypot(pad.x - k.x, pad.y - k.y) < 32 && k.boostTimer < 0.8) {
          k.boostTimer = 1.05;
          if (k.isPlayer) this.sfx.playBoost();
        }
      }

      // Prism Mystery Crates
      for (const c of this.crates) {
        if (c.respawnTimer <= 0 && Math.hypot(c.x - k.x, c.y - k.y) < 30) {
          c.respawnTimer = 4.5;
          if (!k.heldItem) {
            const keys = Object.keys(KART_ITEMS) as KartPowerItemId[];
            k.heldItem = keys[Math.floor(Math.random() * keys.length)];
            if (k.isPlayer) this.sfx.playCrate();
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
            if (k.isPlayer) this.sfx.playItemHit();
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

    // Smooth camera follow
    const p = this.karts[0];
    this.camX += (p.x - this.camX) * Math.min(1, 8 * dt);
    this.camY += (p.y - this.camY) * Math.min(1, 8 * dt);

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
      countdown: Math.ceil(this.countdownTimer),
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
    ctx.globalAlpha = 0.25;
    for (let i = 0; i < 24; i++) {
      const gx = Math.sin(i * 19.3) * 1100;
      const gy = Math.cos(i * 11.7) * 850;
      ctx.beginPath();
      ctx.arc(gx, gy, 55 + (i % 4) * 20, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

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
      // Original 4-point Prism Star glyph (copyright-safe!)
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

    ctx.restore();

    // Countdown
    if (this.countdownTimer > 0) {
      const n = Math.ceil(this.countdownTimer);
      ctx.save();
      ctx.font = '800 66px "Fredoka", system-ui, sans-serif';
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
