import type { Level, Platform } from './levels';
import { Progress } from './progress';
import { Encounters } from './encounters';
export type Action = { direction: number; jump: boolean; shoot?:boolean };
export type GameEvent = { type: 'jump' | 'star' | 'rainbow' | 'respawn' | 'finish' | 'shot' | 'troll' | 'blocked'; x: number; y: number; directional?: boolean; id?:string };
export const PHYSICS = { speed: 260, gravity: 1050, jump: 420, directionalJump: 610, halfWidth: 23, height: 58 };
export class Simulation {
  x = 140; y = 530; vx = 0; vy = 0; grounded = true; facing = 1; finished = false;
  safe = { x: 140, y: 530 }; elapsed = 0; trailUntil = 0; falls = 0;
  private coyote = .12; private buffer = 0;
  readonly encounters: Encounters; private invulnerableUntil=0;private nextFinishHint=0;
  constructor(public level: Level, public progress: Progress) { this.encounters=new Encounters(level,progress); }
  step(dt: number, action: Action): GameEvent[] {
    const events: GameEvent[] = []; if (this.finished) return events;
    this.elapsed += dt; this.coyote = this.grounded ? .12 : this.coyote - dt;
    this.buffer = action.jump ? .15 : Math.max(0, this.buffer - dt);
    const dir = Math.sign(action.direction); this.vx = dir * PHYSICS.speed;
    if (dir) { this.facing = dir; this.progress.learn('move'); }
    if (this.buffer > 0 && this.coyote > 0) {
      this.vy = -(dir ? PHYSICS.directionalJump : PHYSICS.jump); this.grounded = false; this.coyote = 0; this.buffer = 0;
      this.progress.learn(dir ? 'directional' : 'jump'); events.push({ type: 'jump', x: this.x, y: this.y, directional: !!dir });
    }
    const oldX = this.x, oldY = this.y; this.x = Math.max(25, Math.min(this.level.width - 25, this.x + this.vx * dt));
    // Trunks are solid; elevated platforms allow a child to jump through from below.
    for (const p of this.level.platforms.filter(p => p.kind === 'log')) {
      if (oldY > p.y + 3 && oldY - PHYSICS.height < p.y + p.h && this.x + 23 > p.x && this.x - 23 < p.x + p.w) {
        if (oldX + 23 <= p.x + 1) this.x = p.x - 23; else if (oldX - 23 >= p.x + p.w - 1) this.x = p.x + p.w + 23;
      }
    }
    this.vy += PHYSICS.gravity * dt; this.y += this.vy * dt; this.grounded = false;
    let landed: Platform | undefined;
    for (const p of this.level.platforms) {
      if (this.vy >= 0 && oldY <= p.y + 1 && this.y >= p.y && this.x + 28 > p.x && this.x - 28 < p.x + p.w && (!landed || p.y < landed.y)) landed = p;
    }
    if (landed) { this.y = landed.y; this.vy = 0; this.grounded = true;
      if (this.x > landed.x + 46 && this.x < landed.x + landed.w - 46&&this.encounters.safePosition(this.x,landed.y)) this.safe = { x: this.x, y: landed.y };
    }
    for (const item of this.level.items) {
      if (!this.progress.has(item.id) && Math.abs(this.x - item.x) < (item.type === 'rainbow' ? 49 : 39) && Math.abs(this.y - 35 - item.y) < 49 && this.progress.collect(item.id)) {
        events.push({ type: item.type, x: item.x, y: item.y }); if (item.type === 'rainbow') this.trailUntil = this.elapsed + 5;
      }
    }
    events.push(...this.encounters.step(dt,this.elapsed,this,action.shoot));
    if (this.y > 800 || (this.elapsed>this.invulnerableUntil&&this.encounters.hitsPlayer(this,this.elapsed))) {
      this.x = this.safe.x; this.y = this.safe.y - 4; this.vy = 0; this.grounded = false; this.invulnerableUntil=this.elapsed+1.2;this.falls++; events.push({ type: 'respawn', x: this.x, y: this.y });
    }
    if (this.x > this.level.width - 130 && this.grounded) {
      if(this.encounters.trolls.length===0){this.finished = true; this.progress.complete(this.level.id); events.push({ type: 'finish', x: this.x, y: this.y });}
      else if(this.elapsed>this.nextFinishHint){events.push({type:'blocked',x:this.x,y:this.y});this.nextFinishHint=this.elapsed+3;}
    }
    return events;
  }
}
