import './style.css';
import { KartSound } from './audio/sound';
import { CRITTER_DRIVERS, KART_ITEMS, KART_TRACKS, KartPowerItemId } from './data/kartCatalog';
import {
  formatRaceTime,
  getTotalTrophies,
  loadKartState,
  recordTrackBestTime,
  saveKartState,
} from './data/kartStorage';
import {
  fetchKartLeaderboard,
  KartLeaderboardResult,
  submitKartScore,
} from './api/leaderboard';
import { CritterKartEngine, drawCritterKartSprite, KartHudSnapshot } from './game/kartEngine';

const app = document.getElementById('app')!;
const saveState = loadKartState();
const sfx = new KartSound(!saveState.muted);

let selectedDriverId = saveState.selectedDriverId;
let selectedTrackId = KART_TRACKS[0].id;
let cupMode = true;
let cupRaceIndex = 0;
let cupPoints: Record<string, number> = {};

let engine: CritterKartEngine | null = null;
let heroRaf = 0;
let activeKeyDown: ((e: KeyboardEvent) => void) | null = null;
let activeKeyUp: ((e: KeyboardEvent) => void) | null = null;

function cleanupKeyListeners(): void {
  if (activeKeyDown) {
    window.removeEventListener('keydown', activeKeyDown);
    activeKeyDown = null;
  }
  if (activeKeyUp) {
    window.removeEventListener('keyup', activeKeyUp);
    activeKeyUp = null;
  }
}

function stopAll(): void {
  cancelAnimationFrame(heroRaf);
  cleanupKeyListeners();
  if (engine) {
    engine.stop();
    engine = null;
  }
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtOrdinal(n: number): string {
  if (n === 1) return '1st';
  if (n === 2) return '2nd';
  if (n === 3) return '3rd';
  return `${n}th`;
}

function renderLeaderboardRows(res: KartLeaderboardResult): string {
  if (!res.entries.length) {
    return `<div class="ck-lb-empty">Finish a race or Grand Prix to post your first score!</div>`;
  }
  return res.entries
    .map((entry) => {
      const isMe = res.player && entry.deviceId === res.player.deviceId;
      return `
        <div class="ck-lb-row ${isMe ? 'me' : ''}">
          <span class="ck-lb-rank">#${entry.rank}</span>
          <div class="ck-lb-main">
            <strong>${escapeHtml(entry.playerName)}</strong>
            <small>${escapeHtml(entry.driverName || 'Racer')} · 🏆 ${entry.trophies}</small>
          </div>
          <span class="ck-lb-score">${entry.score.toLocaleString('en-US')}</span>
        </div>
      `;
    })
    .join('');
}

function openLeaderboardModal(): void {
  const existing = document.getElementById('ckOverlayModal');
  if (existing) existing.remove();

  const driver = CRITTER_DRIVERS.find((d) => d.id === selectedDriverId) || CRITTER_DRIVERS[0];
  const modal = document.createElement('div');
  modal.id = 'ckOverlayModal';
  modal.className = 'ck-modal open';
  modal.innerHTML = `
    <div class="ck-modal-card ck-modal-wide">
      <h2>Global Paddock Rankings</h2>
      <p id="ckLbStatus">Loading leaderboard...</p>
      <div class="ck-lb-form">
        <input
          type="text"
          id="ckPlayerNameInput"
          class="ck-input"
          maxlength="20"
          value="${escapeHtml(saveState.playerName)}"
          placeholder="Your racer name"
        />
        <button type="button" class="ck-mini-cta" id="ckBtnSyncScore">SAVE & SYNC</button>
      </div>
      <div class="ck-lb-summary">
        <span>Your Score: <strong>${saveState.totalScore.toLocaleString('en-US')}</strong></span>
        <span>Trophies: <strong>${getTotalTrophies(saveState)}</strong></span>
      </div>
      <div class="ck-lb-list" id="ckLbList"></div>
      <div class="ck-modal-actions">
        <button type="button" class="ck-secondary-btn" id="ckBtnCloseOverlay">Close</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const elStatus = modal.querySelector('#ckLbStatus') as HTMLElement;
  const elList = modal.querySelector('#ckLbList') as HTMLElement;
  const inputName = modal.querySelector('#ckPlayerNameInput') as HTMLInputElement;

  const paint = (res: KartLeaderboardResult) => {
    elStatus.textContent = res.online
      ? 'Online Global Leaderboard · Top 30 Racers'
      : res.message || 'Local Paddock Leaderboard';
    elList.innerHTML = renderLeaderboardRows(res);
  };

  void fetchKartLeaderboard().then(paint);

  modal.querySelector('#ckBtnSyncScore')!.addEventListener('click', () => {
    sfx.playTap();
    const cleaned = inputName.value.trim().slice(0, 20) || 'CritterRacer';
    saveState.playerName = cleaned;
    saveKartState(saveState);
    elStatus.textContent = 'Syncing score...';
    void submitKartScore({
      playerName: saveState.playerName,
      score: saveState.totalScore,
      trophies: getTotalTrophies(saveState),
      driverName: driver.name,
    }).then(paint);
  });

  const close = () => {
    sfx.playTap();
    modal.remove();
  };
  modal.querySelector('#ckBtnCloseOverlay')!.addEventListener('click', close);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) close();
  });
}

function openMoreGamesModal(): void {
  const existing = document.getElementById('ckOverlayModal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'ckOverlayModal';
  modal.className = 'ck-modal open';
  modal.innerHTML = `
    <div class="ck-modal-card">
      <h2>More Games by VaelNTN</h2>
      <p>Built by VaelNTN Studios for instant mobile & web arcade action.</p>
      <div class="ck-promo-card">
        <div class="ck-promo-badge">FEATURED ACTION ROGUELITE</div>
        <div class="ck-promo-title">Starforge Survivors</div>
        <div class="ck-promo-desc">
          Command interstellar heroes, forge orbital weapon evolutions, and survive relentless cosmic swarms in fast-paced runs!
        </div>
        <div class="ck-promo-links">
          <a
            class="ck-start-btn ck-link-btn"
            href="https://play.google.com/store/apps/details?id=com.vaelntn.starforgesurvivors"
            target="_blank"
            rel="noopener noreferrer"
          >Play Store</a>
          <a
            class="ck-secondary-btn ck-link-btn"
            href="https://github.com/VaelNTN/starforge-survivors"
            target="_blank"
            rel="noopener noreferrer"
          >View on GitHub</a>
        </div>
      </div>
      <div class="ck-modal-actions">
        <button type="button" class="ck-secondary-btn" id="ckBtnClosePromo">Back to Paddock</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const close = () => {
    sfx.playTap();
    modal.remove();
  };
  modal.querySelector('#ckBtnClosePromo')!.addEventListener('click', close);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) close();
  });
}

function renderHome(): void {
  stopAll();
  const driver = CRITTER_DRIVERS.find((d) => d.id === selectedDriverId) || CRITTER_DRIVERS[0];

  app.innerHTML = `
    <div class="ck-shell">
      <header class="ck-topbar">
        <div class="ck-brand">
          <h1 class="ck-title">CRITTER KART GP</h1>
          <p class="ck-sub">8 Original Racers · 4 Cups · Power-Up Chaos</p>
        </div>
        <div class="ck-top-actions">
          <button type="button" class="ck-icon-btn ck-subtle-btn" id="ckBtnMoreGames" title="More Games by VaelNTN">MORE GAMES</button>
          <button type="button" class="ck-icon-btn" id="ckBtnLeaderboard">RANKS</button>
          <button type="button" class="ck-icon-btn" id="ckBtnSound">${sfx.enabled ? 'SFX ON' : 'MUTED'}</button>
        </div>
      </header>

      <div class="ck-paddock-grid">
        <div class="ck-paddock-col">
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
              <div class="ck-trophy-strip">
                <span>🥇 ${saveState.trophies.gold}</span>
                <span>🥈 ${saveState.trophies.silver}</span>
                <span>🥉 ${saveState.trophies.bronze}</span>
                <span>★ ${saveState.totalScore.toLocaleString('en-US')} pts</span>
              </div>
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
                    ${KART_TRACKS.map((t) => {
                      const bestMs = saveState.bestTimesMs[t.id];
                      return `
                        <button type="button" class="ck-track-btn ${t.id === selectedTrackId ? 'active' : ''}" data-track="${t.id}">
                          <strong>${t.name}</strong>
                          <span>${t.themeLabel}</span>
                          <small class="ck-track-best">${bestMs ? `Best ${formatRaceTime(bestMs)}` : 'No Record Yet'}</small>
                        </button>
                      `;
                    }).join('')}
                  </div>`
                : `<p class="ck-cup-note">Race all 4 circuits back-to-back for Gold, Silver & Bronze Grand Prix Trophies!</p>`
            }
          </section>

          <button type="button" class="ck-start-btn" id="ckBtnStart">START RACE</button>
        </div>

        <div class="ck-paddock-col">
          <section class="ck-section ck-driver-section">
            <div class="ck-section-lbl">Select Critter Driver</div>
            <div class="ck-driver-grid">
              ${CRITTER_DRIVERS.map(
                (d) => `
                  <button type="button" class="ck-driver-btn ${d.id === driver.id ? 'active' : ''}" data-driver="${d.id}">
                    <span class="ck-dot" style="background:${d.kartColor};"></span>
                    <span>${d.name}</span>
                    <small>${d.species}</small>
                  </button>
                `
              ).join('')}
            </div>
          </section>
        </div>
      </div>
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

  document.getElementById('ckBtnMoreGames')!.addEventListener('click', () => {
    sfx.playTap();
    openMoreGamesModal();
  });

  document.getElementById('ckBtnLeaderboard')!.addEventListener('click', () => {
    sfx.playTap();
    openLeaderboardModal();
  });

  document.getElementById('ckBtnSound')!.addEventListener('click', () => {
    saveState.muted = !saveState.muted;
    sfx.setEnabled(!saveState.muted);
    saveKartState(saveState);
    if (sfx.enabled) sfx.playTap();
    renderHome();
  });

  document.querySelectorAll<HTMLButtonElement>('[data-driver]').forEach((btn) => {
    btn.addEventListener('click', () => {
      selectedDriverId = btn.dataset.driver!;
      saveState.selectedDriverId = selectedDriverId;
      saveKartState(saveState);
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
  const driver = CRITTER_DRIVERS.find((d) => d.id === selectedDriverId) || CRITTER_DRIVERS[0];

  app.innerHTML = `
    <div class="ck-race-shell">
      <canvas id="ckRaceCanvas" class="ck-race-canvas"></canvas>

      <header class="ck-race-hud">
        <div class="ck-hud-pill">
          <span class="ck-pos-num" id="ckPos">1st</span>
          <span class="ck-hud-meta" id="ckLap">L1/3 · 0 km/h</span>
        </div>

        <button type="button" class="ck-item-box" id="ckItemBox" aria-label="Use Held Item">
          <span class="ck-item-label" id="ckItemLabel">PRISM SLOT</span>
        </button>

        <div class="ck-hud-right">
          <span class="ck-track-badge">${track.name}</span>
          <button type="button" class="ck-icon-btn" id="ckBtnPause" aria-label="Pause Race">PAUSE</button>
        </div>
      </header>

      <div class="ck-controls">
        <div class="ck-steer-pad">
          <button type="button" class="ck-ctrl-btn" id="ckLeft" aria-label="Steer Left">◀</button>
          <button type="button" class="ck-ctrl-btn" id="ckRight" aria-label="Steer Right">▶</button>
        </div>

        <div class="ck-action-pad">
          <button type="button" class="ck-use-btn" id="ckUseItem">ITEM</button>
          <button type="button" class="ck-drift-btn" id="ckDrift">DRIFT</button>
          <button type="button" class="ck-brake-btn" id="ckBrake">BRAKE</button>
        </div>
      </div>

      <div class="ck-modal" id="ckPauseModal">
        <div class="ck-modal-card">
          <h2>Race Paused</h2>
          <p>${track.name}${cupMode ? ` · Cup Race ${cupRaceIndex + 1}/${KART_TRACKS.length}` : ''}</p>
          <div class="ck-modal-actions" id="ckPauseMainActions">
            <button type="button" class="ck-start-btn" id="ckBtnResume">Resume Race</button>
            <button type="button" class="ck-secondary-btn" id="ckBtnRestart">Restart Race</button>
            <button type="button" class="ck-secondary-btn" id="ckBtnPauseMute">${sfx.enabled ? 'Sound: ON' : 'Sound: MUTED'}</button>
            <button type="button" class="ck-danger-btn" id="ckBtnPauseExit">Exit to Paddock</button>
          </div>
          <div class="ck-modal-actions ck-hidden" id="ckPauseConfirmActions">
            <p class="ck-confirm-text">Leave current race and return to Paddock?</p>
            <button type="button" class="ck-danger-btn" id="ckBtnConfirmExit">Yes, Exit Race</button>
            <button type="button" class="ck-secondary-btn" id="ckBtnCancelExit">Cancel</button>
          </div>
        </div>
      </div>

      <div class="ck-modal" id="ckFinishModal">
        <div class="ck-modal-card">
          <h2 id="ckFinishTitle">Race Finish!</h2>
          <p id="ckFinishSub">${track.name}</p>
          <div class="ck-time-badge" id="ckFinishTime"></div>
          <div class="ck-standings" id="ckStandings"></div>
          <div class="ck-modal-actions">
            <button type="button" class="ck-start-btn" id="ckBtnNext">Next Race</button>
            <button type="button" class="ck-secondary-btn" id="ckBtnFinishRanks">Global Rankings</button>
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
  const elPauseModal = document.getElementById('ckPauseModal')!;
  const elPauseMain = document.getElementById('ckPauseMainActions')!;
  const elPauseConfirm = document.getElementById('ckPauseConfirmActions')!;
  const elPauseMute = document.getElementById('ckBtnPauseMute')!;
  const elFinishModal = document.getElementById('ckFinishModal')!;
  const elFinishTitle = document.getElementById('ckFinishTitle')!;
  const elFinishSub = document.getElementById('ckFinishSub')!;
  const elFinishTime = document.getElementById('ckFinishTime')!;
  const elStandings = document.getElementById('ckStandings')!;
  const btnNext = document.getElementById('ckBtnNext')!;

  const openPause = () => {
    if (!engine || elFinishModal.classList.contains('open')) return;
    engine.setPaused(true);
    elPauseMain.classList.remove('ck-hidden');
    elPauseConfirm.classList.add('ck-hidden');
    elPauseMute.textContent = sfx.enabled ? 'Sound: ON' : 'Sound: MUTED';
    elPauseModal.classList.add('open');
  };

  const closePause = () => {
    if (!engine) return;
    elPauseModal.classList.remove('open');
    engine.setPaused(false);
  };

  const onHud = (snap: KartHudSnapshot) => {
    elPos.textContent = fmtOrdinal(snap.position);
    elLap.textContent = `L${snap.lap}/${snap.totalLaps} · ${snap.speedKmh} km/h`;

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
    elPauseModal.classList.remove('open');
    const ptsTable = [10, 8, 6, 4, 2, 1];
    snap.standings.forEach((s, idx) => {
      cupPoints[s.name] = (cupPoints[s.name] || 0) + (ptsTable[idx] || 1);
    });

    const racePts = ptsTable[snap.position - 1] || 1;
    const isNewBest = recordTrackBestTime(saveState, track.id, snap.raceElapsedMs);
    const raceScoreGain = racePts * 100 + Math.max(0, Math.round((150000 - snap.raceElapsedMs) * 0.01));
    saveState.totalScore += raceScoreGain;

    const isFinalCupRace = cupMode && cupRaceIndex >= KART_TRACKS.length - 1;
    let cupAwardNote = '';

    if (isFinalCupRace) {
      const cupSorted = Object.entries(cupPoints).sort((a, b) => b[1] - a[1]);
      const playerCupRank = cupSorted.findIndex(([name]) => name === driver.name) + 1;
      if (playerCupRank === 1) {
        saveState.trophies.gold += 1;
        saveState.totalScore += 1500;
        cupAwardNote = '🥇 Gold Grand Prix Trophy!';
      } else if (playerCupRank === 2) {
        saveState.trophies.silver += 1;
        saveState.totalScore += 900;
        cupAwardNote = '🥈 Silver Grand Prix Trophy!';
      } else if (playerCupRank === 3) {
        saveState.trophies.bronze += 1;
        saveState.totalScore += 500;
        cupAwardNote = '🥉 Bronze Grand Prix Trophy!';
      }

      elFinishTitle.textContent = 'Grand Prix Complete!';
      elFinishSub.textContent = cupAwardNote || `${track.name} · Cup Complete`;
      elFinishTime.textContent = `Track Time ${formatRaceTime(snap.raceElapsedMs)}${isNewBest ? ' · NEW BEST!' : ''}`;
      elStandings.innerHTML = cupSorted
        .map(
          ([name, pts], idx) =>
            `<div class="ck-standing-row ${name === driver.name ? 'me' : ''}"><span>${fmtOrdinal(idx + 1)} ${name}</span><strong>${pts} pts</strong></div>`
        )
        .join('');
      btnNext.textContent = 'New Grand Prix';
    } else {
      if (!cupMode && snap.position === 1) {
        saveState.trophies.gold += 1;
      } else if (!cupMode && snap.position === 2) {
        saveState.trophies.silver += 1;
      } else if (!cupMode && snap.position === 3) {
        saveState.trophies.bronze += 1;
      }

      elFinishTitle.textContent = `Finished ${fmtOrdinal(snap.position)}!`;
      elFinishSub.textContent = cupMode
        ? `${track.name} · Cup Race ${cupRaceIndex + 1}/${KART_TRACKS.length}`
        : track.name;
      elFinishTime.textContent = `Time ${formatRaceTime(snap.raceElapsedMs)}${isNewBest ? ' · NEW BEST!' : ''} · +${raceScoreGain} pts`;
      elStandings.innerHTML = snap.standings
        .map(
          (s, idx) =>
            `<div class="ck-standing-row ${s.isPlayer ? 'me' : ''}"><span>${fmtOrdinal(idx + 1)} ${s.name}</span><strong>${s.species}</strong></div>`
        )
        .join('');
      btnNext.textContent = cupMode ? 'Next Cup Track' : 'Race Again';
    }

    saveKartState(saveState);
    void submitKartScore({
      playerName: saveState.playerName,
      score: saveState.totalScore,
      trophies: getTotalTrophies(saveState),
      driverName: driver.name,
    });

    elFinishModal.classList.add('open');
  };

  engine = new CritterKartEngine(canvas, sfx, selectedDriverId, track, onHud, onFinish);

  document.getElementById('ckBtnPause')!.addEventListener('click', () => {
    sfx.playTap();
    openPause();
  });
  document.getElementById('ckBtnResume')!.addEventListener('click', () => {
    sfx.playTap();
    closePause();
  });
  document.getElementById('ckBtnRestart')!.addEventListener('click', () => {
    sfx.playTap();
    startKartRace();
  });
  elPauseMute.addEventListener('click', () => {
    saveState.muted = !saveState.muted;
    sfx.setEnabled(!saveState.muted);
    saveKartState(saveState);
    elPauseMute.textContent = sfx.enabled ? 'Sound: ON' : 'Sound: MUTED';
    if (sfx.enabled) sfx.playTap();
  });
  document.getElementById('ckBtnPauseExit')!.addEventListener('click', () => {
    sfx.playTap();
    elPauseMain.classList.add('ck-hidden');
    elPauseConfirm.classList.remove('ck-hidden');
  });
  document.getElementById('ckBtnCancelExit')!.addEventListener('click', () => {
    sfx.playTap();
    elPauseConfirm.classList.add('ck-hidden');
    elPauseMain.classList.remove('ck-hidden');
  });
  document.getElementById('ckBtnConfirmExit')!.addEventListener('click', () => {
    sfx.playTap();
    renderHome();
  });

  document.getElementById('ckBtnHome')!.addEventListener('click', () => {
    sfx.playTap();
    renderHome();
  });
  document.getElementById('ckBtnFinishRanks')!.addEventListener('click', () => {
    sfx.playTap();
    openLeaderboardModal();
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

  activeKeyDown = (e: KeyboardEvent) => {
    if (!engine) return;
    if (e.code === 'Escape' || e.code === 'KeyP') {
      if (engine.isPaused()) closePause();
      else openPause();
      return;
    }
    if (engine.isPaused()) return;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') engine.input.left = true;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') engine.input.right = true;
    if (e.code === 'ShiftLeft' || e.code === 'Space') engine.input.drift = true;
    if (e.code === 'ArrowDown' || e.code === 'KeyS') engine.input.brake = true;
    if (e.code === 'KeyE' || e.code === 'Enter') engine.useHeldItem();
  };
  activeKeyUp = (e: KeyboardEvent) => {
    if (!engine) return;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') engine.input.left = false;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') engine.input.right = false;
    if (e.code === 'ShiftLeft' || e.code === 'Space') engine.input.drift = false;
    if (e.code === 'ArrowDown' || e.code === 'KeyS') engine.input.brake = false;
  };
  window.addEventListener('keydown', activeKeyDown);
  window.addEventListener('keyup', activeKeyUp);

  engine.start();
}

renderHome();
