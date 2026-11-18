import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { Window } from 'happy-dom';

// Execute the production bundle and the real Phaser lifecycle in a DOM emulator.
// Drawing is stubbed: these are startup/integration tests, not visual playtests.
const bundle=readFileSync(`dist/assets/${readdirSync('dist/assets').find(n=>n.endsWith('.js'))}`,'utf8');
const css=readFileSync('src/style.css','utf8');
function environment(completed=[],saved={}) {
  const browser=new Window({url:'https://game.test',width:1280,height:720,settings:{enableJavaScriptEvaluation:true,suppressInsecureJavaScriptEnvironmentWarning:true}});
  const errors=[];
  browser.console={...console,log(){},warn(){},error:(...args)=>errors.push(args.map(String).join(' '))};
  browser.CanvasRenderingContext2D=function(){};
  browser.URL.createObjectURL=()=> 'blob:game-asset';browser.URL.revokeObjectURL=()=>{};
  const imageSources=new WeakMap();
  Object.defineProperty(browser.HTMLImageElement.prototype,'src',{
    get(){return imageSources.get(this)||'';},
    set(value){
      imageSources.set(this,value);
      const path = new URL(value, browser.location.href).pathname;
      if (path.startsWith('/art/')) {
        const file = readFileSync('dist' + path);
        assert.equal(file.toString('ascii',8,12),'WEBP',path);
        const extended = file.toString('ascii',12,16)==='VP8X';
        this.width = extended ? file.readUIntLE(24,3)+1 : file.readUInt16LE(26) & 0x3fff;
        this.height = extended ? file.readUIntLE(27,3)+1 : file.readUInt16LE(28) & 0x3fff;
      } else {
        this.width=180;this.height=170;
      }
      queueMicrotask(()=>this.onload?.(new browser.Event('load')));
    },configurable:true
  });
  Object.defineProperty(browser.HTMLImageElement.prototype,'naturalWidth',{get(){return this.width||180;},configurable:true});
  Object.defineProperty(browser.HTMLImageElement.prototype,'naturalHeight',{get(){return this.height||170;},configurable:true});
  Object.defineProperty(browser.HTMLElement.prototype,'clientWidth',{get(){return 1280;},configurable:true});
  Object.defineProperty(browser.HTMLElement.prototype,'clientHeight',{get(){return 720;},configurable:true});
  browser.HTMLElement.prototype.getBoundingClientRect=()=>new browser.DOMRect(0,0,1280,720);
  const context=function(type){
    if(type!=='2d')return null;
    return new Proxy({canvas:this,fillStyle:'#000',getImageData:()=>({data:new Uint8ClampedArray([0,0,0,255]),width:1,height:1}),measureText:()=>({width:20}),createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})}, {get:(object,key)=>key in object?object[key]:(()=>{})});
  };
  browser.HTMLCanvasElement.prototype.getContext=context;
  browser.document.body.innerHTML='<div id="app"></div>';
  const style=browser.document.createElement('style');style.textContent=css;browser.document.head.append(style);
  browser.localStorage.setItem('teczowa-przygoda-v1',JSON.stringify({version:1,collected:[],completed,tutorial:[],sound:false,...saved}));
  browser.eval(bundle);
  let game;
  const boot=browser.Phaser.Game.prototype.boot;
  browser.Phaser.Game.prototype.boot=function(...args){game=this;return boot.apply(this,args);};
  return {browser,errors,context,document:browser.document,getGame:()=>game};
}
async function until(condition) {
  for(let i=0;i<80;i++){if(condition())return;await new Promise(resolve=>setTimeout(resolve,10));}
  assert.ok(condition(),'Startup did not complete');
}
test('production menu offers map selection before the engine starts, with a full-height parent',async()=>{
  const {browser,document}=environment();
  try {
    assert.equal(document.querySelectorAll('[data-level]').length,4);
    assert.equal(document.querySelectorAll('[data-level]:not(:disabled)').length,1);
    assert.equal(document.querySelectorAll('#rainbow-fields .rainbow-field').length,12);
    assert.ok(document.querySelector('[data-control="shoot"]'));
    assert.equal(document.querySelector('canvas'),null);
    assert.equal(browser.getComputedStyle(document.querySelector('#game-canvas')).height,'100%');
    document.querySelector('#choose-map').click();
    assert.equal(document.activeElement.dataset.level,'0');
    assert.equal(document.querySelector('#home').classList.contains('hidden'),false);
  } finally { await browser.happyDOM.abort(); }
});
const winningSave={
  collected:Array.from({length:4},(_,id)=>[`${id}-s0`,...Array.from({length:3},(_,r)=>`${id}-r${r}`)]).flat(),
  defeated:Array.from({length:4},(_,id)=>Array.from({length:3},(_,t)=>`${id}-t${t}`)).flat()
};
test('every completed map can restart from its card with fresh items and trolls while all maps stay unlocked',async()=>{
  const {browser,document,getGame,errors}=environment([0,1,2,3],winningSave);
  try {
    assert.ok(document.querySelector('#home').classList.contains('all-won'));
    for(const id of [1,0,3,2]){
      document.querySelector(`[data-restart-level="${id}"]`).click();
      await until(()=>document.querySelector('#game-loading').classList.contains('hidden'));
      const scene=getGame().scene.getScene('adventure');
      assert.equal(scene.sim.level.id,id);assert.equal(scene.sim.x,140);assert.equal(scene.sim.finished,false);assert.equal(scene.sim.encounters.trolls.length,3);
      assert.equal(scene.sim.progress.counts(id,'star').found,0);assert.equal(scene.sim.progress.counts(id,'rainbow').found,0);
      assert.equal(document.querySelector('#modal-layer').classList.contains('hidden'),true);
      document.querySelector('#back-maps').click();
      assert.equal(document.querySelectorAll('[data-level]:not(:disabled)').length,4);assert.equal(document.querySelectorAll('[data-restart-level]').length,4);
      assert.equal(document.querySelector('#home').classList.contains('all-won'),false);
    }
    assert.equal(document.querySelector('#home-score').textContent,'0');assert.deepEqual(errors,[]);
  } finally { await browser.happyDOM.abort(); }
});
test('the finish-screen restart replays the same map and retains the newly unlocked next map',async()=>{
  const {browser,document,getGame,errors}=environment();
  try {
    document.querySelector('[data-level="0"]').click();await until(()=>document.querySelector('#game-loading').classList.contains('hidden'));
    const scene=getGame().scene.getScene('adventure'),oldSimulation=scene.sim;
    scene.sim.progress.collect('0-r0');for(const troll of scene.sim.level.trolls)scene.sim.progress.defeat(troll.id);
    scene.sim.x=scene.sim.level.width-120;scene.update(0,20);
    assert.equal(document.querySelector('#modal-layer').classList.contains('hidden'),false);assert.ok(document.querySelector('#finish-replay'));
    document.querySelector('#finish-replay').click();
    assert.notEqual(scene.sim,oldSimulation);assert.equal(scene.sim.x,140);assert.equal(scene.sim.finished,false);assert.equal(scene.sim.encounters.trolls.length,3);assert.equal(scene.sim.progress.rainbows,0);assert.ok(scene.sim.progress.unlocked(1));
    assert.equal(document.querySelector('#modal-layer').classList.contains('hidden'),true);assert.deepEqual(errors,[]);
  } finally { await browser.happyDOM.abort(); }
});
test('after the fourth finish the whole adventure restarts even without collecting every rainbow',async()=>{
  const {browser,document,getGame,errors}=environment([0,1,2],{collected:['0-r0','1-s0']});
  try {
    document.querySelector('[data-level="3"]').click();await until(()=>document.querySelector('#game-loading').classList.contains('hidden'));
    const scene=getGame().scene.getScene('adventure');for(const troll of scene.sim.level.trolls)scene.sim.progress.defeat(troll.id);
    scene.sim.x=scene.sim.level.width-120;scene.update(0,20);
    assert.ok(document.querySelector('#finish-new-game'));document.querySelector('#finish-new-game').click();
    assert.equal(scene.sim.level.id,0);assert.equal(scene.sim.x,140);assert.equal(scene.sim.finished,false);assert.equal(scene.sim.progress.score,0);assert.deepEqual(Array.from(scene.sim.progress.data.completed),[]);assert.equal(scene.sim.encounters.trolls.length,3);assert.equal(scene.paused,false);
    document.querySelector('#back-maps').click();assert.equal(document.querySelectorAll('[data-level]:not(:disabled)').length,1);assert.equal(document.querySelector('#journey-count').textContent,'0 / 4 krainy');assert.deepEqual(errors,[]);
  } finally { await browser.happyDOM.abort(); }
});
test('the rainbow finale can restart without leaving the victory artwork or modal on the fresh run',async()=>{
  const {browser,document,getGame,errors}=environment([0,1,2,3],winningSave);
  try {
    document.querySelector('[data-level="3"]').click();await until(()=>document.querySelector('#game-loading').classList.contains('hidden'));
    const scene=getGame().scene.getScene('adventure');scene.sim.x=scene.sim.level.width-120;scene.update(0,20);
    assert.ok(document.querySelector('.modal').classList.contains('celebration'));document.querySelector('#finish-new-game').click();
    assert.equal(document.querySelector('#modal-layer').classList.contains('hidden'),true);assert.equal(document.querySelector('.modal').classList.contains('celebration'),false);assert.equal(document.querySelector('#home').classList.contains('all-won'),false);assert.match(document.querySelector('.hero-copy p').textContent,/Cztery bajkowe krainy/);
    scene.sim.x=240;scene.update(0,20);assert.equal(scene.sim.progress.score,1);assert.equal(document.querySelector('#modal-layer').classList.contains('hidden'),true);assert.deepEqual(errors,[]);
  } finally { await browser.happyDOM.abort(); }
});
test('the main Od nowa button starts a fresh adventure directly from a winning save',async()=>{
  const {browser,document,getGame,errors}=environment([0,1,2,3],winningSave);
  try {
    assert.equal(document.querySelector('#play span').textContent,'Od nowa');document.querySelector('#play').click();await until(()=>document.querySelector('#game-loading').classList.contains('hidden'));
    const scene=getGame().scene.getScene('adventure');assert.equal(scene.sim.level.id,0);assert.equal(scene.sim.progress.score,0);assert.equal(scene.sim.progress.won,false);assert.equal(scene.sim.encounters.trolls.length,3);assert.deepEqual(errors,[]);
  } finally { await browser.happyDOM.abort(); }
});
test('cloud-world unicorn remains fully opaque after repeated falls and returning to the map',async()=>{
  const {browser,document,getGame,errors}=environment([0,1]);
  try {
    document.querySelector('[data-level="2"]').click();
    await until(()=>document.querySelector('#game-loading').classList.contains('hidden'));
    const scene=getGame().scene.getScene('adventure');
    for(let fall=0;fall<3;fall++){
      scene.sim.safe={x:650,y:530};scene.sim.x=745;scene.sim.y=810;scene.sim.grounded=false;
      scene.update(0,20);
      assert.equal(scene.children.getByName('unicorn').alpha,1,'Respawn must keep the character opaque');
      for(let i=0;i<100;i++)scene.update(0,20);
      assert.equal(scene.children.getByName('unicorn').alpha,1,'Character must stay opaque after effects finish');
    }
    document.querySelector('#back-maps').click();document.querySelector('[data-level="2"]').click();
    assert.equal(scene.children.getByName('unicorn').alpha,1);
    assert.deepEqual(errors,[]);
  } finally { await browser.happyDOM.abort(); }
});
test('Ctrl fires in the production scene, removes a troll and updates the Polish HUD',async()=>{
  const {browser,document,getGame,errors}=environment();
  try {
    document.querySelector('[data-level="0"]').click();
    await until(()=>document.querySelector('#game-loading').classList.contains('hidden'));
    const scene=getGame().scene.getScene('adventure'),troll=scene.sim.encounters.trolls[0];
    scene.sim.x=troll.home-180;scene.sim.y=530;scene.sim.facing=1;scene.sim.safe={x:scene.sim.x,y:530};
    browser.dispatchEvent(new browser.KeyboardEvent('keydown',{code:'ControlLeft'}));
    for(let i=0;i<80;i++)scene.update(0,20);
    browser.dispatchEvent(new browser.KeyboardEvent('keyup',{code:'ControlLeft'}));
    assert.equal(scene.sim.encounters.trolls.length,2);assert.ok(scene.sim.progress.hasDefeated(troll.id));
    assert.equal(document.querySelector('#troll-status b').textContent,'1 / 3');
    assert.equal(scene.children.getByName('unicorn').alpha,1);assert.deepEqual(errors,[]);
  } finally { await browser.happyDOM.abort(); }
});
test('production Phaser starts all four unlocked maps and supports pause and return to selection',async()=>{
  const {browser,document,errors}=environment([0,1,2]);
  try {
    assert.equal(document.querySelectorAll('[data-level]:not(:disabled)').length,4);
    let canvas;
    for(const [id,name] of ['Kwiatowa Łąka','Jagodowy Las','Chmurkowe Wzgórza','Tęczowy Zamek'].entries()) {
      document.querySelector(`[data-level="${id}"]`).click();
      await until(()=>document.querySelector('#game-loading').classList.contains('hidden'));
      assert.equal(document.querySelector('#game-screen').getAttribute('aria-busy'),'false');
      assert.equal(document.querySelector('#level-name').textContent,name);
      assert.equal(document.querySelector('canvas').width,1280);
      assert.equal(document.querySelector('canvas').height,720);
      if(canvas)assert.equal(document.querySelector('canvas'),canvas);
      canvas=document.querySelector('canvas');
      document.querySelector('#pause').click();
      assert.equal(document.querySelector('#modal-layer').classList.contains('hidden'),false);
      document.querySelector('#resume').click();
      assert.equal(document.querySelector('#modal-layer').classList.contains('hidden'),true);
      document.querySelector('#back-maps').click();
      assert.equal(document.querySelector('#home').classList.contains('hidden'),false);
      assert.equal(document.querySelectorAll('[data-level]:not(:disabled)').length,4);
    }
    assert.deepEqual(errors,[]);
  } finally { await browser.happyDOM.abort(); }
});
test('an initialization failure leaves an actionable retry and working map selection',async()=>{
  const {browser,document,context}=environment();
  try {
    browser.HTMLCanvasElement.prototype.getContext=()=>null;
    document.querySelector('[data-level="0"]').click();
    assert.equal(document.querySelector('#game-loading').classList.contains('load-error'),true);
    assert.equal(document.querySelector('#retry-load').classList.contains('hidden'),false);
    document.querySelector('#loading-maps').click();
    assert.equal(document.querySelector('#home').classList.contains('hidden'),false);
    browser.HTMLCanvasElement.prototype.getContext=context;
    document.querySelector('[data-level="0"]').click();
    await until(()=>document.querySelector('#game-loading').classList.contains('hidden'));
    assert.equal(document.querySelector('#level-name').textContent,'Kwiatowa Łąka');
  } finally { await browser.happyDOM.abort(); }
});
