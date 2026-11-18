export class Audio {
  private ctx?: AudioContext;
  enabled = true;
  unlock() { if (!this.ctx) try { this.ctx = new AudioContext(); } catch { return; } void this.ctx.resume(); }
  play(type: 'star' | 'rainbow' | 'jump' | 'finish' | 'respawn' | 'shot' | 'troll' | 'blocked') {
    if (!this.enabled || !this.ctx||type==='blocked') return;
    const notes = type === 'rainbow' || type === 'finish'||type==='troll' ? [523,659,784,1046] : type === 'star' ? [880,1175] : type === 'jump' ? [330,440] : type==='shot'?[660]:[440,523];
    notes.forEach((f,i) => { const ctx = this.ctx!; const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime + i * .09;
      o.type = 'sine'; o.frequency.setValueAtTime(f,t); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(type==='shot'?.025:.055,t+.015); g.gain.exponentialRampToValueAtTime(.001,t+.24); o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t+.26); });
  }
}
