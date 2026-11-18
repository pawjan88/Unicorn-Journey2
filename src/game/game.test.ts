import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, TOTAL_RAINBOWS, type Level, type Platform } from './levels';
import { Progress } from './progress';
import { Simulation } from './simulation';

const step = (s: Simulation, seconds: number, direction = 0, jump = false) => {
  const events = [];
  for (let i=0; i<Math.ceil(seconds*120); i++) events.push(...s.step(1/120,{direction,jump:jump&&i===0}));
  return events;
};
const geometry=(level:Level):Level=>({...level,geysers:[],trolls:[]});
test('four longer maps contain twelve unique rainbows and substantially more stars',()=>{
  assert.equal(LEVELS.length,4);assert.equal(TOTAL_RAINBOWS,12);
  assert.deepEqual(LEVELS.map(l=>l.items.filter(i=>i.type==='rainbow').length),[3,3,3,3]);
  for(const [id,width] of [3300,3400,3350,3600].entries()){assert.ok(LEVELS[id].width>=width*2);assert.ok(LEVELS[id].items.filter(i=>i.type==='star').length>=80);assert.ok(LEVELS[id].geysers.length>=2);assert.equal(LEVELS[id].trolls.length,3);}
  const ids=LEVELS.flatMap(l=>l.items.map(i=>i.id));assert.equal(ids.length,new Set(ids).size);
});
test('release stops horizontal motion immediately, and either direction works',()=>{
  const s=new Simulation(LEVELS[0],new Progress());step(s,.5,1);const x=s.x;assert.ok(x>260);step(s,.25);assert.equal(s.x,x);step(s,.5,-1);assert.ok(s.x<150);
});
test('standing jump stays in place; directional jump is substantially higher and longer',()=>{
  const standing=new Simulation(LEVELS[0],new Progress()), moving=new Simulation(LEVELS[0],new Progress());
  let low=530,high=530;for(let i=0;i<145;i++){standing.step(1/120,{direction:0,jump:i===0});moving.step(1/120,{direction:1,jump:i===0});low=Math.min(low,standing.y);high=Math.min(high,moving.y);}
  assert.equal(standing.x,140);assert.ok(low<450&&low>440);assert.ok(high<360);assert.ok(moving.x>440);
});
test('standing jump next to the low trunk lands safely on it',()=>{
  const s=new Simulation(LEVELS[0],new Progress());s.x=617;step(s,1,0,true);assert.equal(s.y,484);assert.equal(s.grounded,true);
});
test('every high platform has a reachable chain of wide, safe takeoff platforms',()=>{
  for(const original of LEVELS){
    const level=geometry(original),reached=new Set<Platform>(level.platforms.filter(p=>p.kind==='ground'));
    let advanced=true;
    while(advanced){advanced=false;
      for(const target of level.platforms.filter(p=>!reached.has(p))){
        const center=target.x+target.w/2;
        for(const start of reached){
          if(start.y-target.y>175)continue;
          const x=Math.max(start.x+45,Math.min(start.x+start.w-45,center-145));
          if(Math.abs(center-x)>370)continue;
          const s=new Simulation(level,new Progress());s.x=x;s.y=start.y;
          for(let i=0;i<180;i++){
            s.step(1/120,{direction:Math.abs(s.x-center)>3?Math.sign(center-s.x):i===0?1:0,jump:i===0});
            if(s.grounded&&s.y===target.y&&s.x>=target.x&&s.x<=target.x+target.w){reached.add(target);advanced=true;break;}
          }
          if(reached.has(target))break;
        }
      }
    }
    for(const target of level.platforms)assert.ok(reached.has(target),`${level.name}: unreachable tier ${target.x}, ${target.y}`);
    assert.ok(level.platforms.some(p=>p.y<=310),'Each map has new climbing sections');
  }
});
test('each Super Rainbow is accessible from its supporting platform',()=>{
  for(const original of LEVELS)for(const item of original.items.filter(i=>i.type==='rainbow')){
    const level=geometry(original),p=new Progress(),s=new Simulation(level,p);
    const support=level.platforms.filter(pl=>item.x>=pl.x&&item.x<=pl.x+pl.w&&pl.y>=item.y).sort((a,b)=>a.y-b.y)[0];
    assert.ok(support);s.x=item.x;s.y=support.y;step(s,1.5,0,true);assert.ok(p.has(item.id),`${level.name}: ${item.id}`);
  }
});
test('all cloud gaps can be crossed in either direction',()=>{
  const level=geometry(LEVELS[2]),grounds=level.platforms.filter(p=>p.kind==='ground').sort((a,b)=>a.x-b.x);
  for(let i=0;i<grounds.length-1;i++)for(const direction of [-1,1]){
    const edge=grounds[i].x+grounds[i].w,right=grounds[i+1].x;
    const s=new Simulation(level,new Progress());s.x=direction===1?edge-95:right+95;s.safe={x:s.x,y:530};step(s,1.2,direction,true);assert.equal(s.falls,0);assert.equal(s.grounded,true);
  }
});
test('fall respawns locally and retains points and rainbows',()=>{
  const p=new Progress(),s=new Simulation(LEVELS[2],p);p.collect('2-r0');p.collect('2-s0');s.safe={x:650,y:530};s.x=745;s.y=550;s.grounded=false;
  const events=step(s,1);assert.ok(events.some(e=>e.type==='respawn'));assert.equal(s.x,650);assert.ok(p.score>=11);assert.ok(p.has('2-s0'));assert.equal(p.rainbows,1);
});
test('collection stays unique across falls, returning to a map and reloading the save',()=>{
  const memory=new Map<string,string>(),storage={getItem:(k:string)=>memory.get(k)||null,setItem:(k:string,v:string)=>{memory.set(k,v);}};
  const p=new Progress(storage);assert.ok(p.collect('0-s0'));assert.ok(p.collect('0-r0'));assert.equal(p.collect('0-s0'),false);
  const loaded=new Progress(storage);const s=new Simulation(LEVELS[0],loaded);s.x=240;step(s,.1);assert.equal(loaded.score,11);assert.equal(loaded.collect('0-r0'),false);
});
test('finish unlocks the next map and reaching all finishes does not require every rainbow',()=>{
  const p=new Progress();assert.equal(p.unlocked(1),false);
  for(const l of LEVELS){assert.ok(p.unlocked(l.id));for(const t of l.trolls)p.defeat(t.id);const s=new Simulation(l,p);s.x=l.width-131;const events=step(s,.1,1);assert.ok(events.some(e=>e.type==='finish'));}
  assert.equal(p.data.completed.length,4);assert.equal(p.won,false);
  for(const i of LEVELS.flatMap(l=>l.items).filter(i=>i.type==='rainbow'))p.collect(i.id);assert.equal(p.won,true);assert.equal(p.rainbows,12);
});
test('every collectible can be reached without losing the ability to backtrack',()=>{
  for(const original of LEVELS)for(const item of original.items){
    const l=geometry(original);
    let reachable=false;
    for(const offset of [0,-60,60,-145,145,-220,220]) {
      if(reachable)break;const x=item.x+offset;
      for(const platform of l.platforms.filter(pl=>x>=pl.x+5&&x<=pl.x+pl.w-5)) {
        for(const jump of [false,true]) {
          const p=new Progress(),s=new Simulation(l,p);s.x=x;s.y=platform.y;
          for(let i=0;i<180;i++)s.step(1/120,{direction:Math.abs(s.x-item.x)>3?Math.sign(item.x-s.x):0,jump:jump&&i===0});
          if(p.has(item.id)){reachable=true;break;}
        }
      }
    }
    assert.ok(reachable,`${l.name}: ${item.id} (${item.x}, ${item.y})`);
  }
});
test('earlier five-rainbow saves keep points, unlocks and collectible identities',()=>{
  const old={version:1,collected:['0-s0','1-s0','2-s0','0-r0','1-r0','2-r0','3-r0','3-r1'],completed:[0,1,2,3],sound:false,tutorial:['move']};
  const p=new Progress({getItem:()=>JSON.stringify(old),setItem(){}});
  assert.equal(p.score,53);assert.equal(p.rainbows,5);assert.deepEqual(p.data.collected,old.collected);assert.deepEqual(p.data.completed,old.completed);assert.deepEqual(p.data.defeated,[]);assert.equal(p.won,false);
  for(const l of LEVELS)assert.ok(p.unlocked(l.id));
});
