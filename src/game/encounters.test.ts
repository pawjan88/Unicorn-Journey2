import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, type Level } from './levels';
import { Progress } from './progress';
import { Simulation } from './simulation';
import { Encounters, geyserState } from './encounters';

function arena(troll=true):Level {
  return {...LEVELS[0],width:1600,items:[],platforms:[{x:0,y:530,w:1600,h:190,kind:'ground'}],geysers:[],trolls:troll?[{...LEVELS[0].trolls[0],x:700,patrol:35}]:[]};
}
test('geysers rise, rest and show a warning before the next eruption',()=>{
  for(const l of LEVELS)for(const g of l.geysers){
    const time=(phase:number)=>(phase-g.phase+g.period)%g.period;
    assert.equal(geyserState(g,time(.5)).height,g.height);
    assert.equal(geyserState(g,time(2)).active,false);
    assert.equal(geyserState(g,time(g.period-.4)).warning,true);
  }
});
test('every geyser is narrow enough for a directional jump from a legal approach',()=>{
  for(const original of LEVELS)for(const g of original.geysers){
    const level={...original,trolls:[]};const s=new Simulation(level,new Progress());s.x=g.x-160;
    const support=level.platforms.filter(p=>s.x>=p.x&&s.x<=p.x+p.w).sort((a,b)=>a.y-b.y)[0];assert.ok(support);s.y=support.y;s.safe={x:s.x,y:s.y};s.elapsed=.1;
    for(let i=0;i<144;i++)s.step(1/120,{direction:1,jump:i===0});
    assert.equal(s.falls,0,`${level.name}: ${g.id}`);assert.ok(s.x>g.x+100);
  }
});
test('geyser contact respawns away from the vent, retains points and gives brief protection',()=>{
  const p=new Progress(),l=LEVELS[0],g=l.geysers[0],s=new Simulation(l,p);p.collect('0-r0');p.collect('0-s0');s.x=g.x;s.y=530;s.elapsed=.4;s.safe={x:g.x-180,y:530};
  const events=s.step(1/120,{direction:0,jump:false});assert.ok(events.some(e=>e.type==='respawn'));assert.equal(s.x,g.x-180);assert.ok(p.score>=11);assert.equal(p.rainbows,1);
  s.x=g.x;s.y=530;s.step(1/120,{direction:0,jump:false});assert.equal(s.falls,1);
});
test('rainbow balls defeat a patrolling troll from either direction and save that defeat',()=>{
  for(const direction of [1,-1]){
    const memory=new Map<string,string>(),storage={getItem:(k:string)=>memory.get(k)||null,setItem:(k:string,v:string)=>{memory.set(k,v);}};
    const p=new Progress(storage),level=arena(),encounters=new Encounters(level,p),player={x:700-direction*220,y:530,facing:direction};
    const events=[];for(let i=0;i<180;i++)events.push(...encounters.step(1/120,i/120,player,true));
    assert.equal(events.filter(e=>e.type==='troll').length,1);assert.equal(encounters.trolls.length,0);assert.equal(p.score,0);
    const restored=new Progress(storage);assert.ok(restored.hasDefeated(level.trolls[0].id));assert.equal(new Encounters(level,restored).trolls.length,0);
  }
});
test('holding fire has a cooldown; released shots expire and do not grow without bound',()=>{
  const encounter=new Encounters(arena(false),new Progress());let count=0;
  for(let i=0;i<240;i++)count+=encounter.step(1/120,i/120,{x:800,y:530,facing:-1},true).filter(e=>e.type==='shot').length;
  assert.ok(count>=5&&count<=6);assert.ok(encounter.shots.length<=4);assert.ok(encounter.shots.every(s=>s.vx<0));
  for(let i=240;i<400;i++)encounter.step(1/120,i/120,{x:800,y:530,facing:-1});assert.equal(encounter.shots.length,0);
});
test('solid trunks stop rainbow balls before they reach the troll',()=>{
  const level=arena();level.platforms.push({x:600,y:470,w:70,h:60,kind:'log'});
  const p=new Progress(),encounter=new Encounters(level,p);
  for(let i=0;i<240;i++)encounter.step(1/120,i/120,{x:450,y:530,facing:1},true);
  assert.equal(encounter.trolls.length,1);assert.equal(p.hasDefeated(level.trolls[0].id),false);
});
test('a troll can be jumped over, but it must be defeated before the finish opens',()=>{
  const level=arena(),p=new Progress(),s=new Simulation(level,p);
  assert.equal(s.encounters.hitsPlayer({x:700,y:430,facing:1},.5),false);
  s.x=level.width-120;let events=s.step(1/120,{direction:0,jump:false});assert.ok(events.some(e=>e.type==='blocked'));assert.equal(s.finished,false);
  p.defeat(level.trolls[0].id);events=s.step(1/120,{direction:0,jump:false});assert.ok(events.some(e=>e.type==='finish'));assert.equal(s.finished,true);
});
test('an earlier completed save still needs the new trolls and twelve rainbows for the grand finale',()=>{
  const p=new Progress();for(const l of LEVELS){p.complete(l.id);for(const item of l.items.filter(i=>i.type==='rainbow'))p.collect(item.id);}
  assert.equal(p.won,false);for(const troll of LEVELS.flatMap(l=>l.trolls))p.defeat(troll.id);assert.equal(p.won,true);
});
