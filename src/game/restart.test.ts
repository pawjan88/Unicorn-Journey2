import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS } from './levels';
import { Progress } from './progress';

function savedProgress(){
  const memory=new Map<string,string>(),storage={getItem:(key:string)=>memory.get(key)||null,setItem:(key:string,value:string)=>{memory.set(key,value);}};
  return {storage,progress:new Progress(storage)};
}
test('restarting one map restores its treasures and trolls, retaining other maps and unlocks after reload',()=>{
  const {storage,progress:p}=savedProgress();
  for(const l of LEVELS){p.complete(l.id);p.collect(`${l.id}-s0`);p.collect(`${l.id}-r0`);p.defeat(`${l.id}-t0`);}
  assert.equal(p.score,44);assert.equal(p.resetLevel(1),true);
  assert.equal(p.score,33);assert.equal(p.has('1-s0'),false);assert.equal(p.has('1-r0'),false);assert.equal(p.hasDefeated('1-t0'),false);
  for(const id of [0,2,3]){assert.ok(p.has(`${id}-s0`));assert.ok(p.hasDefeated(`${id}-t0`));assert.ok(p.data.completed.includes(id));}
  assert.equal(p.data.completed.includes(1),false);
  const loaded=new Progress(storage);for(const l of LEVELS)assert.ok(loaded.unlocked(l.id));assert.equal(loaded.score,33);
  assert.ok(loaded.collect('1-r0'));assert.equal(loaded.collect('1-r0'),false);assert.equal(loaded.score,43);
});
test('completed maps can restart in any order without relocking the following maps',()=>{
  const {storage,progress:p}=savedProgress();for(const l of LEVELS)p.complete(l.id);
  for(const id of [3,0,2,1,3]){assert.equal(p.resetLevel(id),true);for(const l of LEVELS)assert.ok(p.unlocked(l.id));}
  assert.deepEqual(p.data.completed,[]);assert.deepEqual(new Progress(storage).data.unlocked,[0,1,2,3]);
});
test('restarting the whole adventure clears the winning run and persists a fresh game with sound preferences',()=>{
  const {storage,progress:p}=savedProgress();p.data.sound=false;
  for(const l of LEVELS){p.complete(l.id);for(const item of l.items)p.collect(item.id);for(const troll of l.trolls)p.defeat(troll.id);}p.learn('shoot');assert.ok(p.won);
  p.resetAll();const loaded=new Progress(storage);
  assert.equal(loaded.score,0);assert.equal(loaded.rainbows,0);assert.equal(loaded.won,false);assert.deepEqual(loaded.data.completed,[]);assert.deepEqual(loaded.data.defeated,[]);assert.deepEqual(loaded.data.tutorial,[]);assert.deepEqual(loaded.data.unlocked,[0]);assert.equal(loaded.data.sound,false);
  for(const l of LEVELS)for(const item of l.items)assert.equal(loaded.has(item.id),false);
});
test('legacy saves infer persistent unlocks and locked or invalid maps cannot be reset',()=>{
  const p=new Progress();p.collect('0-s0');const before=JSON.stringify(p.data);
  for(const id of [-1,1,4,1.5])assert.equal(p.resetLevel(id),false);assert.equal(JSON.stringify(p.data),before);
  const legacy={version:1,collected:['0-r0'],completed:[0,1,2],sound:true,tutorial:[]};
  const loaded=new Progress({getItem:()=>JSON.stringify(legacy),setItem(){}});assert.deepEqual(loaded.data.unlocked,[0,1,2,3]);loaded.resetLevel(0);assert.ok(loaded.unlocked(1));assert.ok(loaded.unlocked(3));
});
