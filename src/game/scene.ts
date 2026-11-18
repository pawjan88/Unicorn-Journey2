import Phaser from 'phaser';
import { LEVELS, type Level } from './levels';
import { Simulation, type GameEvent } from './simulation';
import { Progress } from './progress';
import { Input } from './input';
import { Audio } from './audio';
import { colors } from '../ui/art';
import { GAME_ASSETS, artUrl } from './assets';
import { Scenery, createLightTextures } from './scenery';

export class AdventureScene extends Phaser.Scene {
  sim!: Simulation; paused = true;
  private player!: Phaser.GameObjects.Image;
  private shadow!: Phaser.GameObjects.Image;
  private collectibles = new Map<string, Phaser.GameObjects.Image>();
  private trollViews = new Map<string, Phaser.GameObjects.Image>();
  private shotViews = new Map<number, Phaser.GameObjects.Image>();
  private scenery!: Scenery;
  private accumulator = 0; private lastTrail = 0; private lastDust = 0; private pendingJump = false;
  private level!: Level; private ready = false;
  private assetErrors: string[] = [];
  onReady = () => {}; onEvent = (_event: GameEvent) => {}; onFrame = (_sim: Simulation) => {};
  onLoadError = (_error: unknown) => {};
  constructor(private progress: Progress, private inputActions: Input, private audio: Audio) { super('adventure'); }
  preload() {
    this.load.on('loaderror',(file: Phaser.Loader.File)=>this.assetErrors.push(file.key));
    for (const key of GAME_ASSETS) this.load.image(key, artUrl(key));
  }
  create() {
    if(this.assetErrors.length) { this.onLoadError(new Error(`Failed assets: ${this.assetErrors.join(', ')}`));return; }
    createLightTextures(this);
    this.ready = true; this.scale.on('resize',()=>this.resize()); this.onReady();
  }
  startLevel(id: number) {
    if (!this.ready) return false;
    this.children.removeAll(true); this.tweens.killAll(); this.collectibles.clear();this.trollViews.clear();this.shotViews.clear(); this.accumulator=0; this.lastTrail=0; this.lastDust=0; this.pendingJump=false;
    this.level = LEVELS[id]; this.sim=new Simulation(this.level,this.progress); this.paused=false;
    this.scenery = new Scenery(this, this.level);
    this.scenery.renderWater(0);
    for(const troll of this.sim.encounters.trolls)this.trollViews.set(troll.id,this.add.image(troll.x,troll.y,'troll-0').setName(troll.id).setOrigin(.5,.96).setDisplaySize(68,76).setDepth(9));
    for (const item of this.level.items) {
      if (this.progress.has(item.id)) continue;
      const image=this.add.image(item.x,item.y,item.type).setDisplaySize(item.type==='star'?31:84,item.type==='star'?31:84).setDepth(5);
      this.collectibles.set(item.id,image);
      this.tweens.add({targets:image,y:item.y-7,duration:1050+item.x%300,yoyo:true,repeat:-1,ease:'Sine.inOut'});
      if(item.type==='rainbow') { const glow=this.add.image(item.x,item.y,'treasure-light').setDisplaySize(110,88).setAlpha(.45).setDepth(3); image.setData('glow',glow); this.tweens.add({targets:glow,alpha:.16,scaleX:1.9,scaleY:1.5,duration:1200,yoyo:true,repeat:-1}); }
    }
    this.shadow=this.add.image(140,530,'contact-shadow').setDisplaySize(70,14).setAlpha(.48).setDepth(6);
    this.player=this.add.image(140,530,'unicorn-0').setName('unicorn').setAlpha(1).setOrigin(.5,.94).setDisplaySize(112,106).setDepth(10);
    this.resize();
    return true;
  }
  private resize() {
    const camera=this.cameras.main, height=this.scale.height;
    camera.setZoom(height/720); camera.setBounds(0,0,this.level?.width || 3600,720);
    if(this.sim) camera.centerOn(this.sim.x,360);
    this.scenery?.renderPanorama();
  }
  update(_time: number, delta: number) {
    if(!this.sim || this.paused) return;
    const action=this.inputActions.read(); this.accumulator+=Math.min(delta/1000,.06); this.pendingJump ||= action.jump;
    while(this.accumulator>=1/120) { const events=this.sim.step(1/120,{...action,jump:this.pendingJump}); this.pendingJump=false; this.accumulator-=1/120; events.forEach(e=>this.handleEvent(e)); }
    const s=this.sim; const running=s.grounded&&s.vx!==0;
    const frame=running?Math.floor(s.elapsed*11)%4:0;
    this.player.setTexture(`unicorn-${frame}`).setAlpha(1).setPosition(s.x,s.y+(running?Math.sin(s.elapsed*22)*1.3:0)).setFlipX(s.facing<0).setRotation(s.grounded?0:s.vy<0?-.07*s.facing:.05*s.facing);
    const platform=this.level.platforms.filter(p=>s.x>p.x&&s.x<p.x+p.w&&p.y>=s.y-1).sort((a,b)=>a.y-b.y)[0];
    this.shadow.setPosition(s.x,platform?.y||530).setAlpha(platform?.y ? Math.max(.07,.60-(platform.y-s.y)/280) : 0).setDisplaySize(s.grounded?76:62,14);
    const camera=this.cameras.main, visible=camera.width/camera.zoom;
    const midpoint=Phaser.Math.Clamp(s.x+visible*.08,visible/2,this.level.width-visible/2);
    const target=midpoint-camera.width/2;
    camera.scrollX=Phaser.Math.Linear(camera.scrollX,target,1-Math.exp(-delta/170)); camera.scrollY=360-camera.height/2;
    this.scenery.renderPanorama();
    if(s.elapsed<s.trailUntil&&s.elapsed-this.lastTrail>.065) {
      this.lastTrail=s.elapsed; colors.forEach((c,i)=>{const p=this.add.circle(s.x-s.facing*40,s.y-45+i*5,4,Phaser.Display.Color.HexStringToColor(c).color,.75).setDepth(8);this.tweens.add({targets:p,alpha:0,x:p.x-s.facing*32,scale:.2,duration:650,onComplete:()=>p.destroy()});});
    }
    if(running&&s.elapsed-this.lastDust>.2) { this.lastDust=s.elapsed;const dust=this.add.ellipse(s.x-s.facing*29,s.y-3,12,6,0xfffbef,.65).setDepth(7);this.tweens.add({targets:dust,alpha:0,scale:1.7,duration:500,onComplete:()=>dust.destroy()}); }
    this.renderEncounters();
    this.onFrame(s);
  }
  private renderEncounters(){
    const time=this.sim.elapsed;
    this.scenery.renderWater(time);
    for(const troll of this.sim.encounters.trolls)this.trollViews.get(troll.id)?.setTexture(`troll-${Math.floor(time*5)%2}`).setPosition(troll.x,troll.y).setFlipX(troll.facing<0);
    const alive=new Set(this.sim.encounters.shots.map(shot=>shot.id));
    for(const [id,image] of this.shotViews)if(!alive.has(id)){image.destroy();this.shotViews.delete(id);}
    for(const shot of this.sim.encounters.shots){let view=this.shotViews.get(shot.id);if(!view){view=this.add.image(shot.x,shot.y,'rainbow-ball').setName('rainbow-shot').setDisplaySize(27,27).setDepth(11);this.shotViews.set(shot.id,view);}view.setPosition(shot.x,shot.y).setRotation(time*6).setAlpha(Math.min(1,shot.life*4));}
  }
  private handleEvent(e: GameEvent) {
    this.audio.play(e.type);
    if(e.type==='star'||e.type==='rainbow') {
      for(const [id,image] of this.collectibles) if(this.progress.has(id)) { (image.getData('glow') as Phaser.GameObjects.Image|undefined)?.destroy();this.tweens.killTweensOf(image);image.destroy();this.collectibles.delete(id); }
      for(let i=0;i<(e.type==='rainbow'?22:7);i++) {const p=this.add.image(e.x,e.y,'star').setDisplaySize(9+i%4*2,9+i%4*2).setTint(Phaser.Display.Color.HexStringToColor(colors[i%6]).color).setDepth(12);this.tweens.add({targets:p,x:e.x+Math.cos(i*2.4)*90,y:e.y+Math.sin(i*2.4)*65,alpha:0,angle:i*70,scale:0,duration:700+i*12,onComplete:()=>p.destroy()});}
      const text=this.add.text(e.x,e.y-35,e.type==='star'?'+1':'+10',{fontFamily:'Nunito',fontStyle:'bold',fontSize:e.type==='star'?'24px':'34px',color:'#91679c',stroke:'#fffaf0',strokeThickness:5}).setOrigin(.5).setDepth(15);
      this.tweens.add({targets:text,y:text.y-65,alpha:0,duration:1000,onComplete:()=>text.destroy()});
    }
    if(e.type==='troll'&&e.id){const image=this.trollViews.get(e.id);if(image){this.trollViews.delete(e.id);this.tweens.add({targets:image,y:image.y-50,alpha:0,scale:0,duration:450,onComplete:()=>image.destroy()});}for(let i=0;i<12;i++){const spark=this.add.image(e.x,e.y,'star').setDisplaySize(13,13).setTint(Phaser.Display.Color.HexStringToColor(colors[i%6]).color).setDepth(12);this.tweens.add({targets:spark,x:e.x+Math.cos(i)*65,y:e.y+Math.sin(i)*65,alpha:0,duration:650,onComplete:()=>spark.destroy()});}}
    if(e.type==='respawn') {
      this.tweens.killTweensOf(this.player);this.player.setAlpha(1);
      const ring=this.add.ellipse(e.x,e.y-35,85,70).setStrokeStyle(4,0xe8b8d8,.8).setDepth(8);
      this.tweens.add({targets:ring,scale:1.7,alpha:0,duration:600,onComplete:()=>ring.destroy()});this.cameras.main.centerOn(this.sim.x,360);
    }
    this.onEvent(e);
  }
}
