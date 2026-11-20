export class KartSound {
  private ctx: AudioContext | null = null;
  public enabled = true;

  private engineOsc: OscillatorNode | null = null;
  private engineSubOsc: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private engineGain: GainNode | null = null;
  private driftOsc: OscillatorNode | null = null;
  private driftGain: GainNode | null = null;

  constructor(initialEnabled = true) {
    this.enabled = initialEnabled;
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.stopEngine();
    }
  }

  private getCtx(): AudioContext | null {
    if (!this.enabled) return null;
    if (!this.ctx) {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (Ctx) this.ctx = new Ctx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  public updateEngine(speedNorm: number, drifting: boolean, boosting: boolean, active: boolean): void {
    if (!this.enabled || !active) {
      this.stopEngine();
      return;
    }
    // Only spin up continuous audio once an AudioContext exists & is running (after user gesture)
    if (!this.ctx || this.ctx.state !== 'running') {
      return;
    }
    const ctx = this.ctx;
    const now = ctx.currentTime;

    if (!this.engineOsc || !this.engineGain || !this.engineFilter || !this.engineSubOsc) {
      const osc = ctx.createOscillator();
      const sub = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      sub.type = 'triangle';
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(340, now);
      gain.gain.setValueAtTime(0.001, now);

      osc.connect(filter);
      sub.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      sub.start(now);

      this.engineOsc = osc;
      this.engineSubOsc = sub;
      this.engineFilter = filter;
      this.engineGain = gain;
    }

    if (!this.driftOsc || !this.driftGain) {
      const dOsc = ctx.createOscillator();
      const dFilter = ctx.createBiquadFilter();
      const dGain = ctx.createGain();
      dOsc.type = 'sawtooth';
      dOsc.frequency.setValueAtTime(420, now);
      dFilter.type = 'bandpass';
      dFilter.frequency.setValueAtTime(980, now);
      dFilter.Q.setValueAtTime(3.5, now);
      dGain.gain.setValueAtTime(0.0001, now);
      dOsc.connect(dFilter);
      dFilter.connect(dGain);
      dGain.connect(ctx.destination);
      dOsc.start(now);
      this.driftOsc = dOsc;
      this.driftGain = dGain;
    }

    const clamped = Math.max(0, Math.min(1.5, speedNorm));
    const baseFreq = 68 + clamped * 96 + (boosting ? 34 : 0);
    this.engineOsc.frequency.setTargetAtTime(baseFreq, now, 0.05);
    this.engineSubOsc.frequency.setTargetAtTime(baseFreq * 0.5, now, 0.05);
    this.engineFilter.frequency.setTargetAtTime(240 + clamped * 440 + (boosting ? 260 : 0), now, 0.06);
    this.engineGain.gain.setTargetAtTime(0.028 + clamped * 0.024, now, 0.08);

    const driftVol = drifting && clamped > 0.35 ? 0.022 : 0.0001;
    this.driftOsc.frequency.setTargetAtTime(380 + clamped * 160, now, 0.04);
    this.driftGain.gain.setTargetAtTime(driftVol, now, 0.05);
  }

  public stopEngine(): void {
    const safeStop = (osc: OscillatorNode | null) => {
      if (!osc) return;
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        // ignore
      }
    };
    safeStop(this.engineOsc);
    safeStop(this.engineSubOsc);
    safeStop(this.driftOsc);
    try {
      this.engineFilter?.disconnect();
      this.engineGain?.disconnect();
      this.driftGain?.disconnect();
    } catch {
      // ignore
    }
    this.engineOsc = null;
    this.engineSubOsc = null;
    this.engineFilter = null;
    this.engineGain = null;
    this.driftOsc = null;
    this.driftGain = null;
  }

  public playTap(): void {
    const ctx = this.getCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(580, now);
    osc.frequency.exponentialRampToValueAtTime(840, now + 0.045);
    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.055);
  }

  public playBoost(): void {
    const ctx = this.getCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(760, now + 0.18);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.23);
  }

  public playCrate(): void {
    const ctx = this.getCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + i * 0.045);
      gain.gain.setValueAtTime(0.14, now + i * 0.045);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.045 + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.045);
      osc.stop(now + i * 0.045 + 0.11);
    });
  }

  public playItemHit(): void {
    const ctx = this.getCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.22);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  public playCountdown(go = false): void {
    const ctx = this.getCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(go ? 920 : 460, now);
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (go ? 0.26 : 0.12));
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + (go ? 0.27 : 0.13));
  }

  public playLap(): void {
    const ctx = this.getCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    [587.33, 739.99, 880].forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, now + i * 0.06);
      gain.gain.setValueAtTime(0.16, now + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.19);
    });
  }

  public playFinish(): void {
    const ctx = this.getCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, now + i * 0.08);
      gain.gain.setValueAtTime(0.16, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.3);
    });
  }
}
