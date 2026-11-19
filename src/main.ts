import './style.css';
import { KartSound } from './audio/sound';
import { CRITTER_DRIVERS, KART_ITEMS, KART_TRACKS, KartPowerItemId } from './data/kartCatalog';
import { CritterKartEngine, drawCritterKartSprite, KartHudSnapshot } from './game/kartEngine';

const app = document.getElementById('app')!;
const sfx = new KartSound();

let selectedDriverId = localStorage.getItem('ckgp_driver_v1') || CRITTER_DRIVERS[0].id;
let selectedTrackId = KART_TRACKS[0].id;
let cupMode = true;
let cupRaceIndex = 0;
let cupPoints: Record<string, number> = {};

let engine: CritterKartEngine | null = null;
let heroRaf = 0;

function stopAll(): void {
  cancelAnimationFrame(heroRaf);
  if (engine) {
    engine.stop();
    engine = null;
  }
}

function fmtOrdinal(n: number): string {
  if (n === 1) return '1st';
  if (n === 2) return '2nd';
  if (n === 3) return '3rd';
  return `${n}th`;
}

function renderHome(): void {
  stopAll();
  const driver = CRITTER_DRIVERS.find((d) => d.id === selectedDriverId) || CRITTER_DRIVERS[0];

  app.innerHTML = `
    <div class="ck-shell">
      <header class="ck-topbar">
        <div>
          <h1 class="ck-title">CRITTER KART GP</h1>
          <p class="ck-sub">8 Original Racers · 4 Cups · Power-Up Chaos</p>
        </div>
        <button type="button" class="ck-icon-btn" id="ckBtnSound">${sfx.enabled ? 'SFX ON' : 'MUTED'}</button>
      </header>

      <section class="ck-hero-card">
        <canvas id="ckHeroCanvas" class="ck-hero-canvas" width="160" height="110"></canvas>
        <div class="ck-hero-info">
          <div class="ck-driver-name">${driver.name} the ${driver.species}</div>
          <div class="ck-kart-name">${driver.kartName}</div>
          <div class="ck-stat-pills">
            <span>SPD ${driver.speedStat}/10</span>
            <span>ACC ${driver.accelStat}/10</span>
            <span>DRF ${driver.driftStat}/10</span>
          </div>
        </div>
      </section>

      <section class="ck-section">
        <div class="ck-section-lbl">Select Critter Driver</div>
        <div class="ck-driver-grid">
          ${CRITTER_DRIVERS.map(
            (d) => `
              <button type="button" class="ck-driver-btn ${d.id === driver.id ? 'active' : ''}" data-driver="${d.id}">
                <span class="ck-dot" style="background:${d.kartColor};"></span>
                <span>${d.name}</span>
              </button>
            `
          ).join('')}
        </div>
      </section>

      <section class="ck-section">
        <div class="ck-section-lbl">Game Mode & Circuit</div>
        <div class="ck-mode-row">
          <button type="button" class="ck-seg-btn ${cupMode ? 'active' : ''}" id="ckModeCup">4-Race Grand Prix</button>
          <button type="button" class="ck-seg-btn ${!cupMode ? 'active' : ''}" id="ckModeSingle">Single Race</button>
        </div>
        ${
          !cupMode
            ? `<div class="ck-track-grid">
                ${KART_TRACKS.map(
                  (t) => `
                    <button type="button" class="ck-track-btn ${t.id === selectedTrackId ? 'active' : ''}" data-track="${t.id}">
                      <strong>${t.name}</strong>
                      <span>${t.themeLabel}</span>
                    </button>
                  `
                ).join('')}
              </div>`
            : `<p class="ck-cup-note">Race all 4 circuits back-to-back for the Grand Prix Trophy!</p>`
        }
      </section>

      <button type="button" class="ck-start-btn" id="ckBtnStart">START RACE</button>
    </div>
  `;

  const heroCanvas = document.getElementById('ckHeroCanvas') as HTMLCanvasElement;
  const startT = performance.now();
  const drawHero = (ts: number) => {
    const ctx = heroCanvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, heroCanvas.width, heroCanvas.height);
      const t = (ts - startT) / 1000;
      drawCritterKartSprite(ctx, driver, 80, 56 + Math.sin(t * 3) * 2, Math.sin(t * 1.4) * 0.14, 1.55, false, false, 0);
    }
    heroRaf = requestAnimationFrame(drawHero);
  };
  heroRaf = requestAnimationFrame(drawHero);

  document.getElementById('ckBtnSound')!.addEventListener('click', () => {
    sfx.enabled = !sfx.enabled;
    if (sfx.enabled) sfx.playTap();
    renderHome();
  });

  document.querySelectorAll<HTMLButtonElement>('[data-driver]').forEach((btn) => {
    btn.addEventListener('click', () => {
      selectedDriverId = btn.dataset.driver!;
      localStorage.setItem('ckgp_driver_v1', selectedDriverId);
      sfx.playTap();
      renderHome();
    });
  });

  document.getElementById('ckModeCup')!.addEventListener('click', () => {
    cupMode = true;
    sfx.playTap();
    renderHome();
  });

  document.getElementById('ckModeSingle')!.addEventListener('click', () => {
    cupMode = false;
    sfx.playTap();
    renderHome();
  });

  document.querySelectorAll<HTMLButtonElement>('[data-track]').forEach((btn) => {
    btn.addEventListener('click', () => {
      selectedTrackId = btn.dataset.track!;
      sfx.playTap();
      renderHome();
    });
  });

  document.getElementById('ckBtnStart')!.addEventListener('click', () => {
    sfx.playTap();
    cupRaceIndex = 0;
    cupPoints = {};
    startKartRace();
  });
}

function startKartRace(): void {
  stopAll();
  const track = cupMode
    ? KART_TRACKS[cupRaceIndex % KART_TRACKS.length]
    : KART_TRACKS.find((t) => t.id === selectedTrackId) || KART_TRACKS[0];

  app.innerHTML = `
    <div class="ck-race-shell">
      <canvas id="ckRaceCanvas" class="ck-race-canvas"></canvas>

      <header class="ck-race-hud">
        <div class="ck-hud-pill">
          <span class="ck-pos-num" id="ckPos">1st</span>
          <span class="ck-hud-meta" id="ckLap">Lap 1/3</span>
        </div>

        <button type="button" class="ck-item-box" id="ckItemBox" aria-label="Use Held Item">
          <span class="ck-item-label" id="ckItemLabel">NO ITEM</span>
        </button>

        <div class="ck-hud-right">
          <span class="ck-track-badge">${track.name}</span>
          <button type="button" class="ck-icon-btn" id="ckBtnQuit">EXIT</button>
        </div>
      </header>

      <div class="ck-controls">
        <div class="ck-steer-pad">
          <button type="button" class="ck-ctrl-btn" id="ckLeft">◀</button>
          <button type="button" class="ck-ctrl-btn" id="ckRight">▶</button>
        </div>

        <div class="ck-action-pad">
          <button type="button" class="ck-use-btn" id="ckUseItem">ITEM</button>
          <button type="button" class="ck-drift-btn" id="ckDrift">DRIFT</button>
          <button type="button" class="ck-brake-btn" id="ckBrake">BRAKE</button>
        </div>
      </div>

      <div class="ck-modal" id="ckFinishModal">
        <div class="ck-modal-card">
          <h2 id="ckFinishTitle">Race Finish!</h2>
          <p id="ckFinishSub">${track.name}</p>
          <div class="ck-standings" id="ckStandings"></div>
          <div class="ck-modal-actions">
            <button type="button" class="ck-start-btn" id="ckBtnNext">Next Race</button>
            <button type="button" class="ck-secondary-btn" id="ckBtnHome">Back to Paddock</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const canvas = document.getElementById('ckRaceCanvas') as HTMLCanvasElement;
  const elPos = document.getElementById('ckPos')!;
  const elLap = document.getElementById('ckLap')!;
  const elItemBox = document.getElementById('ckItemBox')!;
  const elItemLabel = document.getElementById('ckItemLabel')!;
  const elUseItem = document.getElementById('ckUseItem')!;
  const elFinishModal = document.getElementById('ckFinishModal')!;
  const elFinishTitle = document.getElementById('ckFinishTitle')!;
  const elFinishSub = document.getElementById('ckFinishSub')!;
  const elStandings = document.getElementById('ckStandings')!;
  const btnNext = document.getElementById('ckBtnNext')!;

  const onHud = (snap: KartHudSnapshot) => {
    elPos.textContent = fmtOrdinal(snap.position);
    elLap.textContent = `Lap ${snap.lap}/${snap.totalLaps} · ${snap.speedKmh} km/h`;

    if (snap.heldItem) {
      const itemDef = KART_ITEMS[snap.heldItem as KartPowerItemId];
      elItemLabel.textContent = itemDef.name;
      elItemBox.style.borderColor = itemDef.color;
      elItemBox.classList.add('ready');
      elUseItem.classList.add('ready');
    } else {
      elItemLabel.textContent = snap.hasShield ? 'SHIELD ON' : 'PRISM SLOT';
      elItemBox.style.borderColor = 'rgba(148, 210, 255, 0.3)';
      elItemBox.classList.remove('ready');
      elUseItem.classList.remove('ready');
    }
  };

  const onFinish = (snap: KartHudSnapshot) => {
    const ptsTable = [10, 8, 6, 4, 2, 1];
    snap.standings.forEach((s, idx) => {
      cupPoints[s.name] = (cupPoints[s.name] || 0) + (ptsTable[idx] || 1);
    });

    const isFinalCupRace = cupMode && cupRaceIndex >= KART_TRACKS.length - 1;
    elFinishTitle.textContent = isFinalCupRace
      ? 'Grand Prix Complete!'
      : `Finished ${fmtOrdinal(snap.position)}!`;
    elFinishSub.textContent = cupMode
      ? `${track.name} · Cup Race ${cupRaceIndex + 1}/${KART_TRACKS.length}`
      : track.name;

    if (isFinalCupRace) {
      const cupSorted = Object.entries(cupPoints).sort((a, b) => b[1] - a[1]);
      elStandings.innerHTML = cupSorted
        .map(
          ([name, pts], idx) =>
            `<div class="ck-standing-row"><span>${fmtOrdinal(idx + 1)} ${name}</span><strong>${pts} pts</strong></div>`
        )
        .join('');
      btnNext.textContent = 'New Grand Prix';
    } else {
      elStandings.innerHTML = snap.standings
        .map(
          (s, idx) =>
            `<div class="ck-standing-row ${s.isPlayer ? 'me' : ''}"><span>${fmtOrdinal(idx + 1)} ${s.name}</span><strong>${s.species}</strong></div>`
        )
        .join('');
      btnNext.textContent = cupMode ? 'Next Cup Track' : 'Race Again';
    }
    elFinishModal.classList.add('open');
  };

  engine = new CritterKartEngine(canvas, sfx, selectedDriverId, track, onHud, onFinish);

  document.getElementById('ckBtnQuit')!.addEventListener('click', () => {
    sfx.playTap();
    renderHome();
  });
  document.getElementById('ckBtnHome')!.addEventListener('click', () => {
    sfx.playTap();
    renderHome();
  });
  btnNext.addEventListener('click', () => {
    sfx.playTap();
    if (cupMode) {
      if (cupRaceIndex >= KART_TRACKS.length - 1) {
        cupRaceIndex = 0;
        cupPoints = {};
      } else {
        cupRaceIndex += 1;
      }
    }
    startKartRace();
  });

  const bindHold = (id: string, onChange: (v: boolean) => void) => {
    const el = document.getElementById(id)!;
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      el.classList.add('pressed');
      onChange(true);
    });
    const rel = () => {
      el.classList.remove('pressed');
      onChange(false);
    };
    el.addEventListener('pointerup', rel);
    el.addEventListener('pointercancel', rel);
    el.addEventListener('lostpointercapture', rel);
  };

  bindHold('ckLeft', (v) => {
    if (engine) engine.input.left = v;
  });
  bindHold('ckRight', (v) => {
    if (engine) engine.input.right = v;
  });
  bindHold('ckDrift', (v) => {
    if (engine) engine.input.drift = v;
  });
  bindHold('ckBrake', (v) => {
    if (engine) engine.input.brake = v;
  });

  elItemBox.addEventListener('click', () => engine?.useHeldItem());
  elUseItem.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    engine?.useHeldItem();
  });

  window.addEventListener('keydown', (e) => {
    if (!engine) return;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') engine.input.left = true;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') engine.input.right = true;
    if (e.code === 'ShiftLeft' || e.code === 'Space') engine.input.drift = true;
    if (e.code === 'ArrowDown' || e.code === 'KeyS') engine.input.brake = true;
    if (e.code === 'KeyE' || e.code === 'Enter') engine.useHeldItem();
  });
  window.addEventListener('keyup', (e) => {
    if (!engine) return;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') engine.input.left = false;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') engine.input.right = false;
    if (e.code === 'ShiftLeft' || e.code === 'Space') engine.input.drift = false;
    if (e.code === 'ArrowDown' || e.code === 'KeyS') engine.input.brake = false;
  });

  engine.start();
}

renderHome();
