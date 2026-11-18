import type { Level, Geyser, Troll } from './levels';
import { Progress } from './progress';
export type EncounterEvent = {type:'shot'|'troll';x:number;y:number;id?:string};
export type Shot = {id:number;x:number;y:number;vx:number;life:number};
export type TrollState = Troll & {home:number;facing:number};
type Player = {x:number;y:number;facing:number};

export function geyserState(geyser:Geyser,time:number) {
  const phase=((time+geyser.phase)%geyser.period+geyser.period)%geyser.period;
  const active=phase<geyser.activeFor;
  const height=active?geyser.height*Math.max(0,Math.min(1,phase/.16,(geyser.activeFor-phase)/.2)):0;
  return {active,warning:phase>geyser.period-.75,height};
}
export class Encounters {
  trolls:TrollState[];shots:Shot[]=[];private nextShot=0;private shotId=0;
  constructor(private level:Level,private progress:Progress) {
    this.trolls=level.trolls.filter(t=>!progress.hasDefeated(t.id)).map(t=>({...t,home:t.x,facing:1}));
  }
  step(dt:number,time:number,player:Player,shoot=false):EncounterEvent[] {
    const events:EncounterEvent[]=[];
    for(const troll of this.trolls){const phase=time*troll.speed/troll.patrol;troll.x=troll.home+Math.sin(phase)*troll.patrol;troll.facing=Math.cos(phase)>=0?1:-1;}
    if(shoot&&time>=this.nextShot){
      this.nextShot=time+.34;const shot={id:this.shotId++,x:player.x+player.facing*38,y:player.y-35,vx:player.facing*620,life:1.1};this.shots.push(shot);events.push({type:'shot',x:shot.x,y:shot.y});
    }
    for(const shot of this.shots){
      shot.x+=shot.vx*dt;shot.life-=dt;
      if(this.level.platforms.some(p=>(p.kind==='log'||p.kind==='stone')&&shot.x>p.x-8&&shot.x<p.x+p.w+8&&shot.y>p.y-8&&shot.y<p.y+p.h+8)){shot.life=0;continue;}
      for(const troll of this.trolls)if(!this.progress.hasDefeated(troll.id)&&shot.life>0&&Math.abs(shot.x-troll.x)<40&&shot.y>troll.y-75&&shot.y<troll.y+9){
        if(this.progress.defeat(troll.id))events.push({type:'troll',x:troll.x,y:troll.y-35,id:troll.id});shot.life=0;break;
      }
    }
    this.shots=this.shots.filter(s=>s.life>0&&s.x>0&&s.x<this.level.width);
    this.trolls=this.trolls.filter(t=>!this.progress.hasDefeated(t.id));
    return events;
  }
  hitsPlayer(player:Player,time:number) {
    if(this.trolls.some(t=>Math.abs(player.x-t.x)<47&&player.y>t.y-70&&player.y-58<t.y))return true;
    return this.level.geysers.some(g=>{const state=geyserState(g,time);return state.height>10&&Math.abs(player.x-g.x)<g.width/2+23&&player.y>g.y-state.height&&player.y-58<g.y+5;});
  }
  safePosition(x:number,y:number) {
    return !this.level.geysers.some(g=>Math.abs(x-g.x)<g.width/2+75&&y>g.y-g.height-12)
      && !this.trolls.some(t=>Math.abs(x-t.home)<t.patrol+85&&y>t.y-85);
  }
}
