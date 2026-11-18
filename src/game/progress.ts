import { LEVELS, TOTAL_RAINBOWS } from './levels';
export type SaveData = { version: 1; collected: string[]; completed: number[]; unlocked: number[]; sound: boolean; tutorial: string[]; defeated: string[] };
const KEY = 'teczowa-przygoda-v1';
const validLevel=(n:unknown):n is number=>typeof n==='number'&&Number.isInteger(n)&&n>=0&&n<LEVELS.length;
const freshSave=(sound=true):SaveData=>({version:1,collected:[],completed:[],unlocked:[0],sound,tutorial:[],defeated:[]});
export class Progress {
  data: SaveData;
  private ids = new Map(LEVELS.flatMap(l => l.items).map(i => [i.id, i]));
  private trollIds = new Set(LEVELS.flatMap(l=>l.trolls).map(t=>t.id));
  constructor(private storage?: Pick<Storage, 'getItem' | 'setItem'>) {
    this.data = freshSave();
    try {
      const p=JSON.parse(storage?.getItem(KEY)||'null');if(p?.version!==1)return;
      const completed=[...new Set<number>(Array.isArray(p.completed)?p.completed.filter(validLevel):[])];
      const unlocked=[...new Set<number>([0,...(Array.isArray(p.unlocked)?p.unlocked.filter(validLevel):[]),...completed.flatMap(n=>[n,n+1].filter(validLevel))])].sort((a,b)=>a-b);
      this.data={version:1,completed,unlocked,sound:p.sound!==false,
        collected:[...new Set<string>(Array.isArray(p.collected)?p.collected.filter((id:unknown)=>typeof id==='string'&&this.ids.has(id)):[])],
        tutorial:Array.isArray(p.tutorial)?p.tutorial.filter((s:unknown)=>typeof s==='string'):[],
        defeated:[...new Set<string>(Array.isArray(p.defeated)?p.defeated.filter((id:unknown)=>typeof id==='string'&&this.trollIds.has(id)):[])]};
    } catch { /* Continue in memory. */ }
  }
  get score() { return this.data.collected.reduce((n, id) => n + (this.ids.get(id)?.type === 'rainbow' ? 10 : 1), 0); }
  get rainbows() { return this.data.collected.filter(id => this.ids.get(id)?.type === 'rainbow').length; }
  get won() { return this.data.completed.length === 4 && this.rainbows === TOTAL_RAINBOWS && this.data.defeated.length===this.trollIds.size; }
  hasDefeated(id:string) { return this.data.defeated.includes(id); }
  defeat(id:string) { if(!this.trollIds.has(id)||this.hasDefeated(id))return false;this.data.defeated.push(id);this.save();return true; }
  unlocked(n: number) { return validLevel(n)&&this.data.unlocked.includes(n); }
  has(id: string) { return this.data.collected.includes(id); }
  collect(id: string) { if (!this.ids.has(id) || this.has(id)) return false; this.data.collected.push(id); this.save(); return true; }
  complete(n: number) { if(!validLevel(n))return;if (!this.data.completed.includes(n)) this.data.completed.push(n);for(const id of [n,n+1].filter(validLevel))if(!this.data.unlocked.includes(id))this.data.unlocked.push(id);this.data.unlocked.sort((a,b)=>a-b);this.save(); }
  resetLevel(n:number) {
    if(!this.unlocked(n))return false;
    const items=new Set(LEVELS[n].items.map(item=>item.id)),trolls=new Set(LEVELS[n].trolls.map(troll=>troll.id));
    this.data.collected=this.data.collected.filter(id=>!items.has(id));this.data.defeated=this.data.defeated.filter(id=>!trolls.has(id));
    this.data.completed=this.data.completed.filter(id=>id!==n);this.save();return true;
  }
  resetAll() { this.data=freshSave(this.data.sound);this.save(); }
  learn(s: string) { if (!this.data.tutorial.includes(s)) { this.data.tutorial.push(s); this.save(); } }
  counts(n: number, type: 'star' | 'rainbow') { const items = LEVELS[n].items.filter(i => i.type === type); return { found: items.filter(i => this.has(i.id)).length, total: items.length }; }
  save() { try { this.storage?.setItem(KEY, JSON.stringify(this.data)); } catch { /* Continue in memory when private browsing blocks saves. */ } }
}
