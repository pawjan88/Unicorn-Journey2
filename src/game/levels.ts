export type Platform = { x: number; y: number; w: number; h: number; kind: 'ground' | 'log' | 'mushroom' | 'cloud' | 'stone' };
export type Collectible = { id: string; x: number; y: number; type: 'star' | 'rainbow' };
export type Geyser = { id: string; x: number; y: number; width: number; height: number; period: number; activeFor: number; phase: number };
export type Troll = { id: string; x: number; y: number; patrol: number; speed: number };
export type Level = { id: number; name: string; subtitle: string; color: string; sky: string; hill: string; ground: string; width: number; platforms: Platform[]; items: Collectible[]; puddles: number[]; checkpoints: number[]; geysers: Geyser[]; trolls: Troll[] };
const ground = (x: number, w: number): Platform => ({ x, y: 530, w, h: 190, kind: 'ground' });
const ledge = (x: number, y: number, w: number, kind: Platform['kind'] = 'log'): Platform => ({ x, y, w, h: kind === 'log' ? 530 - y : 30, kind });
const row = (xs: number[], y = 480): [number, number][] => xs.map(x => [x, y]);
const arc = (x: number, y: number, span = 230): [number, number][] => Array.from({ length: 5 }, (_, i) => [x + span * i / 4, y - Math.sin(i / 4 * Math.PI) * 95]);
function items(id: number, stars: [number, number][], rainbows: [number, number][]): Collectible[] {
  return [...stars.map(([x, y], i) => ({ id: `${id}-s${i}`, x, y, type: 'star' as const })), ...rainbows.map(([x, y], i) => ({ id: `${id}-r${i}`, x, y, type: 'rainbow' as const }))];
}
const ORIGINAL_LEVELS: Omit<Level,'geysers'|'trolls'>[] = [
  { id: 0, name: 'Kwiatowa Łąka', subtitle: 'Tu zaczyna się magia', color: '#edafbb', sky: '#e7f3ef', hill: '#c1dcb8', ground: '#93bb7e', width: 3300,
    platforms: [ground(0, 3300), ledge(640, 484, 105), ledge(1080, 454, 180, 'cloud'), ledge(1670, 392, 260, 'cloud'), ledge(2260, 480, 105), ledge(2690, 435, 210, 'cloud')],
    items: items(0, [...row([240, 340, 440]), ...arc(570, 448, 240), ...row([1115, 1210], 415), ...arc(1510, 365, 270), ...row([2030, 2130]), ...arc(2190, 438, 240), ...row([2730, 2850], 390), ...row([3030])], [[1800, 337]]), puddles: [900, 2460], checkpoints: [140, 850, 1370, 2030, 2510, 3010] },
  { id: 1, name: 'Jagodowy Las', subtitle: 'Hop, między grzybkami!', color: '#a7bb9b', sky: '#e2eee5', hill: '#a2c4ae', ground: '#7ca883', width: 3400,
    platforms: [ground(0, 3400), ledge(570, 470, 160, 'mushroom'), ledge(1000, 425, 220, 'mushroom'), ledge(1570, 470, 160, 'mushroom'), ledge(2010, 415, 230, 'mushroom'), ledge(2660, 480, 145)],
    items: items(1, [...row([230, 340]), ...arc(440, 430, 260), ...row([830]), ...arc(870, 390, 290), ...row([1360]), ...arc(1430, 425, 260), ...row([1830]), ...arc(1850, 380, 280), ...row([2420, 2520]), ...arc(2560, 440, 240), ...row([2990, 3100])], [[2130, 355]]), puddles: [1350, 2940], checkpoints: [140, 800, 1320, 1800, 2400, 3000] },
  { id: 2, name: 'Chmurkowe Wzgórza', subtitle: 'Od chmurki do chmurki', color: '#a9bfd8', sky: '#e8effa', hill: '#bdc8e5', ground: '#b0aed1', width: 3350,
    platforms: [ground(0, 700), ground(790, 680), ground(1560, 650), ground(2300, 1050), ledge(460, 460, 190, 'cloud'), ledge(1060, 410, 240, 'cloud'), ledge(1790, 450, 180, 'cloud'), ledge(2590, 395, 260, 'cloud')],
    items: items(2, [...row([230, 330]), ...arc(350, 420, 260), ...arc(630, 475, 240), ...arc(910, 380, 270), ...arc(1390, 475, 250), ...arc(1660, 415, 250), ...arc(2130, 475, 250), ...arc(2440, 365, 280), ...row([3010, 3130])], [[2720, 337]]), puddles: [], checkpoints: [140, 900, 1600, 2390, 3000] },
  { id: 3, name: 'Tęczowy Zamek', subtitle: 'Wielki, kolorowy finał', color: '#c5b0d6', sky: '#f0eafa', hill: '#d1c1e1', ground: '#b59fc8', width: 3600,
    platforms: [ground(0, 3600), ledge(570, 480, 170, 'stone'), ledge(870, 420, 220, 'stone'), ledge(1310, 480, 170, 'stone'), ledge(1670, 410, 230, 'stone'), ledge(2180, 470, 180, 'stone'), ledge(2520, 390, 260, 'stone'), ledge(3050, 465, 180, 'stone')],
    items: items(3, [...row([240, 350]), ...arc(440, 440, 240), ...arc(760, 380, 260), ...row([1180]), ...arc(1190, 440, 240), ...arc(1510, 375, 280), ...row([2010]), ...arc(2040, 430, 250), ...arc(2370, 355, 280), ...arc(2910, 425, 250), ...row([3360])], [[1990, 475], [2650, 330]]), puddles: [], checkpoints: [140, 1160, 1990, 2880, 3360] }
];
// The original opening sections and collectible IDs remain stable for saved games.
const EXTENSIONS = [
  {width:6600,platforms:[ledge(3350,480,125),ledge(3780,450,210,'cloud'),ledge(4070,370,230,'cloud'),ledge(4380,300,240,'cloud'),ledge(4870,470,120),ledge(5270,440,200,'cloud'),ledge(5550,365,220,'cloud'),ledge(5840,290,240,'cloud')],rainbows:[[4490,245],[5950,235]],geysers:[2430,5070],trolls:[3050,4650,6270],puddles:[3630,5150],checkpoints:[3250,3650,4700,5180,6130]},
  {width:7000,platforms:[ledge(3530,465,210,'mushroom'),ledge(3850,390,210,'mushroom'),ledge(4160,310,240,'mushroom'),ledge(4740,475,140),ledge(5130,450,230,'mushroom'),ledge(5440,370,230,'mushroom'),ledge(5750,290,250,'mushroom'),ledge(6200,420,220,'mushroom')],rainbows:[[4280,255],[5870,235]],geysers:[1420,4930],trolls:[2500,4500,6620],puddles:[3340,6050],checkpoints:[3330,4560,5040,6080,6520]},
  {width:7000,platforms:[ledge(3450,450,220,'cloud'),ledge(4390,385,270,'cloud'),ledge(4680,300,200,'cloud'),ledge(5290,420,220,'cloud'),ledge(5590,330,240,'cloud'),ledge(6170,390,250,'cloud'),ledge(6470,300,230,'cloud')],rainbows:[[4780,245],[6590,245]],geysers:[980,3890],trolls:[1980,4300,6060],puddles:[],checkpoints:[3380,4180,5030,5930,6780]},
  {width:7600,platforms:[ledge(3500,465,220,'stone'),ledge(3800,390,240,'stone'),ledge(4110,310,250,'stone'),ledge(4560,470,130),ledge(5060,450,240,'stone'),ledge(5360,370,230,'stone'),ledge(5660,290,240,'stone'),ledge(6120,450,230,'stone'),ledge(6430,365,240,'stone'),ledge(6750,285,260,'stone')],rainbows:[[6870,230]],geysers:[1160,4850],trolls:[3330,5950,7220],puddles:[],checkpoints:[3370,4430,4950,6030,7090]}
];
export const LEVELS: Level[] = ORIGINAL_LEVELS.map((original,id)=>{
  const extension=EXTENSIONS[id];
  const platforms=original.platforms.map(p=>p.kind==='ground'&&p.x+p.w===original.width?{...p,w:(id===2?4050:extension.width)-p.x}:p);
  if(id===2)platforms.push(ground(4140,760),ground(4990,770),ground(5850,1150));
  platforms.push(...extension.platforms);
  const geysers=extension.geysers.map((x,i)=>({id:`${id}-g${i}`,x,y:530,width:35,height:108,period:4.5,activeFor:1.35,phase:i*.7}));
  const stars=original.items.filter(item=>item.type==='star');
  const extraPoints: [number,number][] = [
    ...original.platforms.filter(p=>p.kind!=='ground').flatMap(p=>row([p.x+35,p.x+p.w-35],p.y-65)),
    ...extension.platforms.flatMap(p=>arc(p.x+15,p.y-35,p.w-30)),
    ...geysers.flatMap(g=>arc(g.x-110,475,220))
  ];
  for(let x=original.width+100;x<extension.width-220;x+=160)if(platforms.some(p=>p.kind==='ground'&&x>p.x+35&&x<p.x+p.w-35))extraPoints.push([x,480]);
  const addedStars: Collectible[]=[];
  for(const [x,y] of extraPoints)if(![...stars,...addedStars].some(item=>Math.hypot(item.x-x,item.y-y)<35))addedStars.push({id:`${id}-s${stars.length+addedStars.length}`,x,y,type:'star'});
  const oldRainbowCount=original.items.filter(item=>item.type==='rainbow').length;
  return {...original,width:extension.width,platforms,
    items:[...original.items,...addedStars,...extension.rainbows.map(([x,y],i)=>({id:`${id}-r${oldRainbowCount+i}`,x,y,type:'rainbow' as const}))],
    puddles:[...original.puddles,...extension.puddles],checkpoints:[...original.checkpoints,...extension.checkpoints],geysers,
    trolls:extension.trolls.map((x,i)=>({id:`${id}-t${i}`,x,y:530,patrol:45,speed:35+id*6}))};
});
export const TOTAL_RAINBOWS = LEVELS.flatMap(l => l.items).filter(i => i.type === 'rainbow').length;
