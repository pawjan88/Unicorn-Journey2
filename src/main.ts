import Phaser from 'phaser';
import './style.css';
import { LEVELS, TOTAL_RAINBOWS } from './game/levels';
import { Progress } from './game/progress';
import { Input } from './game/input';
import { Audio } from './game/audio';
import { AdventureScene } from './game/scene';
import type { Simulation } from './game/simulation';
import { icon } from './ui/art';
import { artUrl } from './game/assets';

let storage: Storage | undefined; try { storage=localStorage; } catch { /* Offline and private sessions can play in memory. */ }
const progress=new Progress(storage), audio=new Audio(); audio.enabled=progress.data.sound;
const image=(asset:string,cls='',alt='')=>`<img class="${cls}" src="${artUrl(asset)}" alt="${alt}" draggable="false">`;
document.querySelector<HTMLDivElement>('#app')!.innerHTML=`
  <main id="home" class="home">
    <header class="site-header"><a href="#" class="brand" aria-label="Tęczowa Przygoda — początek">${image('rainbow')}<span>MAŁE KROKI, WIELKA MAGIA</span></a><div class="header-actions"><button class="icon-button sound-toggle" aria-label="Wyłącz dźwięki">${icon('sound')}</button><button class="icon-button" id="help" aria-label="Jak grać?">${icon('help')}</button></div></header>
    <section class="hero"><div class="hero-copy"><span class="eyebrow"><i></i> TWOJA MAGICZNA WYPRAWA</span><h1>Tęczowa Przygoda<br><span>Jednorożca</span><b>✦</b></h1><p>Cztery bajkowe krainy. 12 magicznych tęcz.<br>I mnóstwo małych, wielkich skoków!</p><div class="hero-buttons"><button class="primary-button" id="play">${icon('play')}<span>Rozpocznij przygodę</span><span class="button-spark">✧</span></button><button class="text-button" id="choose-map">${icon('map')}Wybierz krainę</button><button class="text-button hidden" id="restart-all" title="Rozpocznij całą przygodę od początku">${icon('restart')}Od nowa <small>cała przygoda</small></button></div><div class="gentle-note"><span>♡</span> Bez pośpiechu. W swoim tempie.</div></div><div class="hero-art">${image('cover','hero-landscape')}<span class="art-note">Chodź, poszukamy tęczy!</span></div></section>
    <section class="worlds" aria-labelledby="worlds-title"><div class="section-top"><div><span class="eyebrow">ODKRYWAJ PO SWOJEMU</span><h2 id="worlds-title">Wybierz swoją krainę <span>✧</span></h2></div><div class="journey-progress"><span>Twoja przygoda</span><strong id="journey-count">0 / 4 krainy</strong><div id="journey-dots"></div></div></div><p class="map-replay-note">„Od nowa” przy krainie przywraca jej skarby i trolle. Pozostałe krainy zostają odblokowane.</p><div id="map-cards" class="map-cards"></div></section>
    <footer class="home-footer"><div>${image('star')}<strong id="home-score">0</strong><span>zebranych punktów</span></div><div class="home-rainbows" id="home-rainbows"></div><span class="save-note">${icon('check')} Przygoda zapisuje się sama</span></footer>
  </main>
  <section id="game-screen" class="game-screen hidden" aria-label="Gra Tęczowa Przygoda Jednorożca">
    <div id="game-canvas"></div>
    <div id="game-loading" class="game-loading hidden" role="status"><div class="loading-card">${image('rainbow')}<h2 id="loading-title">Otwieramy magiczną krainę…</h2><p id="loading-message">Jednorożec już do Ciebie biegnie!</p><button class="primary-button hidden" id="retry-load">Spróbuj ponownie ${icon('play')}</button><button class="text-button" id="loading-maps">${icon('map')}Wybór krain</button></div></div>
    <header class="hud"><div class="hud-left"><button class="icon-button hud-map" id="back-maps" aria-label="Wybór krain">${icon('map')}</button><div class="level-title"><small id="level-number"></small><strong id="level-name"></strong></div></div><div class="hud-progress"><div class="score-pill">${image('star')}<strong id="score">0</strong></div><div class="rainbow-cluster"><div class="rainbow-fields" id="rainbow-fields" aria-label="Zebrane Super Tęcze"></div><b id="rainbow-total">0 / 12</b></div><div class="troll-pill" id="troll-status" aria-label="Odprawione trolle"></div></div><div class="hud-actions"><button class="icon-button sound-toggle" aria-label="Wyłącz dźwięki">${icon('sound')}</button><button class="icon-button" id="pause" aria-label="Pauza">${icon('pause')}</button></div></header>
    <div class="route-progress"><div id="route-fill"></div><span id="route-end">✦</span></div>
    <aside id="tutorial" class="tutorial hidden" aria-label="Animowana podpowiedź sterowania"></aside>
    <div class="touch-controls" aria-label="Sterowanie dotykowe"><div class="arrows"><button data-control="left" aria-label="Idź w lewo">←</button><button data-control="right" aria-label="Idź w prawo">→</button></div><div class="action-controls"><button class="shoot-button" data-control="shoot" aria-label="Strzel tęczową kulką">${image('rainbow-ball')}<span>Kulka</span></button><button class="jump-button" data-control="jump" aria-label="Skocz"><span>↑</span>Skok</button></div></div>
    <div class="keyboard-note"><kbd>←</kbd><kbd>→</kbd> idź <span>·</span> <kbd>spacja</kbd> skocz <span>·</span> <kbd>Ctrl</kbd> kulka</div><div id="toast" class="toast" aria-live="polite"></div>
    <button id="fullscreen" class="icon-button fullscreen" aria-label="Pełny ekran">${icon('expand')}</button>
  </section>
  <div id="modal-layer" class="modal-layer hidden"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" tabindex="-1"></section></div>
`;
const input=new Input(); let scene=new AdventureScene(progress,input,audio);
let game: Phaser.Game | undefined, current=0, active=false, lastHint='', toastTimer=0, loadingTimer=0, priorFocus: HTMLElement|null=null;
const $=<T extends HTMLElement=HTMLElement>(s:string)=>document.querySelector<T>(s)!;
const home=$('#home'), screen=$('#game-screen'), modalLayer=$('#modal-layer'), modal=$('.modal');
function refresh() {
  $('#home-score').textContent=String(progress.score);$('#score').textContent=String(progress.score);
  $('#journey-count').textContent=`${progress.data.completed.length} / 4 krainy`;
  $('#journey-dots').innerHTML=LEVELS.map(l=>`<i class="${progress.data.completed.includes(l.id)?'done':''}"></i>`).join('');
  const fields=Array.from({length:TOTAL_RAINBOWS},(_,i)=>`<span class="rainbow-field ${i<progress.rainbows?'filled':''}" aria-label="${i<progress.rainbows?'Zebrana':'Do zebrania'} tęcza ${i+1}">${image('rainbow')}</span>`).join('');
  $('#rainbow-fields').innerHTML=fields;$('#rainbow-fields').setAttribute('aria-label',`Super Tęcze: ${progress.rainbows} z ${TOTAL_RAINBOWS}`);
  $('#rainbow-total').textContent=`${progress.rainbows} / ${TOTAL_RAINBOWS}`;
  const defeated=LEVELS[current].trolls.filter(t=>progress.hasDefeated(t.id)).length;
  $('#troll-status').innerHTML=`${image('troll-0')}<b>${defeated} / ${LEVELS[current].trolls.length}</b>`;$('#troll-status').setAttribute('aria-label',`Odprawione trolle: ${defeated} z ${LEVELS[current].trolls.length}`);
  $('#home-rainbows').innerHTML=`<div class="rainbow-fields">${fields}</div><span><b>${progress.rainbows} / ${TOTAL_RAINBOWS}</b> magicznych tęcz</span>`;
  $('#map-cards').innerHTML=LEVELS.map(l=>{
    const unlocked=progress.unlocked(l.id),done=progress.data.completed.includes(l.id),stars=progress.counts(l.id,'star'),rainbows=progress.counts(l.id,'rainbow');
    return `<article class="map-card ${unlocked?'':'locked'} ${done?'completed':''}">
      <button class="map-open" data-level="${l.id}" ${unlocked?'':'disabled'} aria-label="${l.name}${unlocked?'':', najpierw ukończ poprzednią krainę'}">
        <div class="card-art">${image(`card-${l.id}`)}<span class="map-number">0${l.id+1}</span><span class="map-status">${done?icon('check'):unlocked?icon('arrow'):icon('lock')}</span>${!unlocked?`<span class="locked-label">Odkryj po ${l.id===1?'łące':l.id===2?'lesie':'wzgórzach'}</span>`:''}</div>
        <div class="card-info"><h3>${l.name}</h3><p>${l.subtitle}</p><div class="card-stats"><span>${image('star')} ${stars.found}<i>/ ${stars.total}</i></span><span>${image('rainbow')} ${rainbows.found}<i>/ ${rainbows.total}</i></span>${unlocked?`<b>${done?'Wróć do krainy':'Zagraj'} ${icon('arrow')}</b>`:`<b>${icon('lock')}</b>`}</div></div>
      </button>
      ${unlocked?`<button class="map-restart" data-restart-level="${l.id}" aria-label="${l.name}: Od nowa">${icon('restart')}Od nowa</button>`:''}
    </article>`;
  }).join('');
  document.querySelectorAll<HTMLButtonElement>('[data-level]').forEach(b=>b.addEventListener('click',()=>start(Number(b.dataset.level))));
  document.querySelectorAll<HTMLButtonElement>('[data-restart-level]').forEach(b=>b.onclick=()=>replayLevel(Number(b.dataset.restartLevel)));
  $('#play span').textContent=progress.won?'Od nowa':progress.data.completed.length?'Kontynuuj przygodę':'Rozpocznij przygodę';
  $('#restart-all').classList.toggle('hidden',progress.data.collected.length===0&&progress.data.completed.length===0&&progress.data.defeated.length===0&&progress.data.unlocked.length===1);
  document.querySelectorAll<HTMLButtonElement>('.sound-toggle').forEach(b=>{b.innerHTML=icon(progress.data.sound?'sound':'muted');b.setAttribute('aria-label',progress.data.sound?'Wyłącz dźwięki':'Włącz dźwięki');b.setAttribute('aria-pressed',String(progress.data.sound));});
  const wasWon=home.classList.contains('all-won');home.classList.toggle('all-won',progress.won);
  if(wasWon!==progress.won){
    $('.hero-art').innerHTML=progress.won?image('finale','hero-landscape')+'<span class="art-note">Wszystkie krainy znów lśnią!</span>':image('cover','hero-landscape')+'<span class="art-note">Chodź, poszukamy tęczy!</span>';
    $('.hero-copy p').innerHTML=progress.won?'Wszystkie krainy i 12 tęcz odkryte! Wielka tęcza znów łączy nasz bajkowy świat.':'Cztery bajkowe krainy. 12 magicznych tęcz.<br>I mnóstwo małych, wielkich skoków!';
  }
}
function replayLevel(id:number) { if(progress.resetLevel(id))start(id); }
function restartAdventure() { progress.resetAll();start(0); }
function start(id:number) {
  if(!progress.unlocked(id)) return; current=id;active=true;audio.unlock();input.clear();lastHint='';
  clearTimeout(toastTimer);$('#toast').classList.remove('visible');$('#toast').textContent='';$('#tutorial').classList.add('hidden');$('#tutorial').innerHTML='';
  home.classList.add('hidden');screen.classList.remove('hidden');closeModal(false);
  showLoading();
  $('#level-number').textContent=`KRAINA ${id+1} Z 4`;$('#level-name').textContent=LEVELS[id].name;
  try {
    if(!game) {
      if(!document.createElement('canvas').getContext('2d'))throw new Error('Canvas 2D is unavailable');
      scene.onReady=()=>{if(active)activateLevel();};
      scene.onLoadError=loadFailed;
      game=new Phaser.Game({type:Phaser.CANVAS,parent:'game-canvas',backgroundColor:LEVELS[id].sky,scale:{mode:Phaser.Scale.RESIZE,width:screen.clientWidth,height:screen.clientHeight},loader:{imageLoadType:'HTMLImageElement'},render:{antialias:true,roundPixels:false},scene:[scene],audio:{noAudio:true}});
    } else { game.scale.resize(screen.clientWidth,screen.clientHeight);activateLevel(); }
  } catch(error) { loadFailed(error); }
  refresh();screen.focus();
}
function showLoading() {
  clearTimeout(loadingTimer);input.enabled=false;screen.setAttribute('aria-busy','true');
  $('#game-loading').classList.remove('hidden','load-error');$('#retry-load').classList.add('hidden');
  $('#loading-title').textContent='Otwieramy magiczną krainę…';$('#loading-message').textContent='Jednorożec już do Ciebie biegnie!';
  loadingTimer=window.setTimeout(()=>loadFailed(new Error('Scene startup timed out')),15000);
}
function activateLevel() {
  try {
    if(!scene.startLevel(current))return;
    clearTimeout(loadingTimer);$('#game-loading').classList.add('hidden');screen.setAttribute('aria-busy','false');
    scene.paused=!modalLayer.classList.contains('hidden');input.enabled=!scene.paused;
  } catch(error) { loadFailed(error); }
}
function loadFailed(error:unknown) {
  clearTimeout(loadingTimer);console.error('Nie udało się uruchomić krainy:',error);
  scene.paused=true;input.enabled=false;input.clear();screen.setAttribute('aria-busy','false');
  $('#game-loading').classList.remove('hidden');$('#game-loading').classList.add('load-error');$('#retry-load').classList.remove('hidden');
  $('#loading-title').textContent='Chmurka zasłoniła drogę';$('#loading-message').textContent='Spróbujmy otworzyć krainę jeszcze raz.';
  const oldScene=scene;game?.destroy(true);game=undefined;scene=new AdventureScene(progress,input,audio);
  scene.onEvent=oldScene.onEvent;scene.onFrame=oldScene.onFrame;
}
function mapSelect() { active=false;clearTimeout(loadingTimer);scene.paused=true;input.enabled=false;input.clear();closeModal(false);screen.classList.add('hidden');home.classList.remove('hidden');refresh();home.scrollIntoView();$('#play').focus(); }
function showModal(content:string) { priorFocus=document.activeElement as HTMLElement;scene.paused=true;input.enabled=false;input.clear();modal.innerHTML=content;modalLayer.classList.remove('hidden');modal.focus();modal.querySelector<HTMLElement>('button')?.focus(); }
function closeModal(resume=true) { modalLayer.classList.add('hidden');modal.classList.remove('celebration');if(active&&resume) {scene.paused=false;input.clear();input.enabled=true;priorFocus?.focus();} }
function pause() { if(!active||scene.sim?.finished) return;showModal(`<div class="modal-illustration">${image('unicorn-0')}</div><span class="eyebrow">CHWILKA ODPOCZYNKU</span><h2 id="modal-title">Poczekam na Ciebie!</h2><p>Twoje gwiazdki i tęcze są bezpieczne.</p><button class="primary-button" id="resume">${icon('play')}Graj dalej</button><button class="text-button" id="restart-current">${icon('restart')}Od nowa <small>ta kraina</small></button><button class="text-button" id="modal-maps">${icon('map')} Wybór krain</button>`);$('#resume').onclick=()=>closeModal();$('#restart-current').onclick=()=>replayLevel(current);$('#modal-maps').onclick=mapSelect; }
function help() { showModal(`<button class="modal-close icon-button" id="close-help" aria-label="Zamknij">${icon('close')}</button><span class="eyebrow">MAŁE KROKI, WIELKA MAGIA</span><h2 id="modal-title">Chodźmy po tęczę!</h2><div class="help-controls"><div><span>← →</span><b>Idź i zawracaj</b></div><div><span>↑</span><b>Spacja — skok w miejscu</b></div><div><span>→ + ↑</span><b>Strzałka + spacja — wyżej i dalej</b></div></div><div class="help-controls extra-controls"><div><span>Ctrl</span><b>Tęczowa kulka odprawia trolle</b></div></div><p>Na telefonie trzymaj strzałkę i dotknij „Skok” albo „Kulka” drugim palcem. Przytrzymaj Ctrl lub „Kulka”, aby strzelać seriami.</p><p>Gejzery bulgoczą przed wybuchem. Przeskocz strumień albo poczekaj. Aby przejść przez metę, odpraw wszystkie trzy trolle w krainie.</p><div class="help-rewards"><span>${image('star')} +1 punkt</span><span>${image('rainbow')} +10 punktów</span></div><p>Po upadku wracasz blisko trasy. Zebrane skarby zostają. Nie ma limitu czasu ani żyć.</p><button class="primary-button" id="help-ok">Rozumiem ${icon('check')}</button>`);$('#close-help').onclick=()=>closeModal();$('#help-ok').onclick=()=>closeModal(); }
function toast(message:string) {clearTimeout(toastTimer);$('#toast').textContent=message;$('#toast').classList.add('visible');toastTimer=window.setTimeout(()=>$('#toast').classList.remove('visible'),2600);}
function finish() {
  const won=progress.won, last=current===3||won; const stars=progress.counts(current,'star'), rainbows=progress.counts(current,'rainbow');
  showModal(`<div class="finish-rainbow ${won?'grand':''}">${image(won?'finale':'rainbow')}<span>✦</span><span>✧</span></div><span class="eyebrow">${won?'12 TĘCZ. CZTERY KRAINY. JEDNA WIELKA MAGIA!':last?'CZTERY KRAINY ODKRYTE!':'WSPANIALE CI POSZŁO!'}</span><h2 id="modal-title">${won?'Wielka tęcza wróciła!':last?'Ale piękna przygoda!':'Kraina odkryta!'}</h2><p>${won?'Nad wszystkimi krainami lśni teraz Twoja tęcza.':last?'Możesz wrócić do każdej krainy po pozostałe skarby.':`Przed Tobą ${LEVELS[current+1].name}. Gotowa na kolejne skoki?`}</p><div class="result-score">${image('star')}<strong>${progress.score}</strong><span>punktów w przygodzie</span></div><div class="finish-counts"><span>Ta kraina: ${image('star')} ${stars.found} / ${stars.total}</span><span>${image('rainbow')} ${rainbows.found} / ${rainbows.total}</span></div><button class="primary-button" id="next">${last?icon('map'):icon('play')}${last?'Wybór krain':'Dalej do przygody'}</button><div class="finish-restarts"><button class="text-button" id="finish-replay">${icon('restart')}Od nowa <small>ta kraina</small></button>${last?`<button class="text-button" id="finish-new-game">${icon('restart')}Od nowa <small>cała przygoda</small></button>`:''}</div>${last?'':`<button class="text-button" id="finish-maps">${icon('map')} Wybór krain</button>`}`);
  $('#next').onclick=last?mapSelect:()=>start(current+1);$('#finish-replay').onclick=()=>replayLevel(current);if(last)$('#finish-new-game').onclick=restartAdventure;else $('#finish-maps').onclick=mapSelect;
  if(won) modal.classList.add('celebration');else modal.classList.remove('celebration');refresh();
}
scene.onEvent=e=>{if(e.type==='star'||e.type==='rainbow'||e.type==='troll')refresh();if(e.type==='rainbow'){toast(`Super Tęcza! ${progress.rainbows} z ${TOTAL_RAINBOWS} 🌈`);if(progress.won)finish();}if(e.type==='troll'){toast(`Troll odprawiony! ${LEVELS[current].trolls.filter(t=>progress.hasDefeated(t.id)).length} z 3 ✨`);if(progress.won)finish();}if(e.type==='blocked')toast(`Odpraw pozostałe trolle: ${scene.sim.encounters.trolls.length}. Ctrl / Kulka 🌈`);if(e.type==='respawn')toast('Hop! Spróbujmy jeszcze raz ♡');if(e.type==='finish')finish();};
scene.onFrame=(s:Simulation)=>{
  $('#route-fill').style.width=`${Math.min(100,s.x/(s.level.width-130)*100)}%`;
  const nearTroll=s.encounters.trolls.some(t=>Math.abs(t.x-s.x)<440);
  const nearGeyser=s.level.geysers.some(g=>Math.abs(g.x-s.x)<220);
  const hint=nearTroll?'shoot':current===0&&s.x<2040?(s.x<520?'move':s.x<1350?'jump':'directional'):nearGeyser?'directional':'';
  if(hint===lastHint)return;lastHint=hint;const element=$('#tutorial');element.classList.toggle('hidden',!hint);if(!hint)return;
  const title=hint==='shoot'?'Tęczowa kulka!':hint==='move'?'Idziemy!':hint==='jump'?'Hop do góry!':'Wyżej i dalej!';
  element.innerHTML=`<div class="hint-animation ${hint}"><div class="hint-floor"></div>${image('unicorn-0','hint-unicorn')}<span class="hint-spark">✦</span>${hint==='shoot'?image('troll-0','hint-troll')+image('rainbow-ball','hint-ball'):hint==='move'?'':`<i class="hint-platform"></i>`}</div><div class="hint-caption"><b>${title}</b><div class="hint-keys">${hint==='shoot'?'<kbd>Ctrl</kbd><small> / Kulka</small>':hint==='move'?'<kbd>←</kbd><kbd>→</kbd>':hint==='jump'?'<kbd class="key-jump">↑ <small>Skok</small></kbd>':'<kbd>→</kbd><span>+</span><kbd class="key-jump">↑ <small>Skok</small></kbd>'}</div></div>`;
};
$('#play').onclick=()=>{if(progress.won)restartAdventure();else start(LEVELS.find(l=>!progress.data.completed.includes(l.id)&&progress.unlocked(l.id))?.id||0);};
$('#restart-all').onclick=restartAdventure;
$('#choose-map').onclick=()=>{$('.worlds').scrollIntoView({behavior:'smooth',block:'start'});document.querySelector<HTMLButtonElement>('[data-level]:not(:disabled)')?.focus({preventScroll:true});};
$('#loading-maps').onclick=mapSelect;$('#retry-load').onclick=()=>start(current);
$('#back-maps').onclick=mapSelect;$('#pause').onclick=pause;$('#help').onclick=help;
document.querySelectorAll<HTMLButtonElement>('.sound-toggle').forEach(b=>b.onclick=()=>{audio.unlock();progress.data.sound=!progress.data.sound;audio.enabled=progress.data.sound;progress.save();refresh();});
$('#fullscreen').onclick=async()=>{try{if(!document.fullscreenElement)await screen.requestFullscreen();else await document.exitFullscreen();}catch{toast('Możesz grać w tym oknie ♡');}};
document.addEventListener('keydown',e=>{
  if(e.code==='Escape') { if(!modalLayer.classList.contains('hidden')&&!scene.sim?.finished)closeModal();else if(active)pause(); }
  if(e.code==='Tab'&&!modalLayer.classList.contains('hidden')) {const items=[...modal.querySelectorAll<HTMLElement>('button,a,[tabindex="0"]')];const first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}
});
window.addEventListener('blur',()=>{if(active&&modalLayer.classList.contains('hidden'))pause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&active&&modalLayer.classList.contains('hidden'))pause();});
window.addEventListener('resize',()=>{if(active)game?.scale.resize(screen.clientWidth,screen.clientHeight);});
$('.brand').onclick=e=>{e.preventDefault();mapSelect();};
refresh();
