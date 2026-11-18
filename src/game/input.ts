import type { Action } from './simulation';
export class Input {
  private keys = new Set<string>(); private pointers = new Map<number, string>(); private jump = false;
  enabled = false;
  constructor() {
    window.addEventListener('keydown', e => {
      if (!this.enabled || !['ArrowLeft', 'ArrowRight', 'Space', 'KeyA', 'KeyD', 'ArrowUp', 'ControlLeft', 'ControlRight'].includes(e.code)) return;
      e.preventDefault(); if (['Space', 'ArrowUp'].includes(e.code) && !e.repeat) this.jump = true; this.keys.add(e.code);
    });
    window.addEventListener('keyup', e => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.clear());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.clear(); });
    document.querySelectorAll<HTMLButtonElement>('[data-control]').forEach(button => {
      button.addEventListener('pointerdown', e => { if (!this.enabled) return; e.preventDefault(); button.setPointerCapture(e.pointerId); this.pointers.set(e.pointerId, button.dataset.control!); if (button.dataset.control === 'jump') this.jump = true; this.style(); });
      for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(type, (e) => { this.pointers.delete((e as PointerEvent).pointerId); this.style(); });
      button.addEventListener('contextmenu', e => e.preventDefault());
    });
  }
  private style() { document.querySelectorAll<HTMLElement>('[data-control]').forEach(b => b.classList.toggle('held', [...this.pointers.values()].includes(b.dataset.control!))); }
  clear() { this.keys.clear(); this.pointers.clear(); this.jump = false; this.style(); }
  read(): Action { if (!this.enabled) return { direction: 0, jump: false, shoot:false }; const values = [...this.pointers.values()]; const left = this.keys.has('ArrowLeft') || this.keys.has('KeyA') || values.includes('left'); const right = this.keys.has('ArrowRight') || this.keys.has('KeyD') || values.includes('right'); const action = { direction: Number(right) - Number(left), jump: this.jump,shoot:this.keys.has('ControlLeft')||this.keys.has('ControlRight')||values.includes('shoot') }; this.jump = false; return action; }
}
