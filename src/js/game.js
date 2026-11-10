// Low Roller — everything that isn't a rule: rendering, UI, fight flow, saves, sound.
// Uses the globals defined by logic.js, which index.html loads first.
/* ================= AUDIO ================= */
let AC=null, master=null, sfxBus=null, musicBus=null;
const SET={music:.6,sfx:.8,speed:1.6,grain:true,shake:true,tips:true,deal:'quick',auto:true};
try{ Object.assign(SET,JSON.parse(localStorage.getItem('lr-set')||'{}')); }catch(e){}
let sfxOn=SET.sfx>0;
function saveSet(){ try{localStorage.setItem('lr-set',JSON.stringify(SET))}catch(e){} applySet(); }
function applySet(){ sfxOn=SET.sfx>0; if(AC){ sfxBus.gain.setTargetAtTime(SET.sfx*1.1,AC.currentTime,.05); musicBus.gain.setTargetAtTime(SET.music*.75,AC.currentTime,.1); } document.body.classList.toggle('nograin',!SET.grain); }

function ac(){
  if(!AC){ try{
    AC=new (window.AudioContext||window.webkitAudioContext)();
    const comp=AC.createDynamicsCompressor(); comp.threshold.value=-16; comp.ratio.value=3; comp.connect(AC.destination);
    master=AC.createGain(); master.gain.value=.85; master.connect(comp);
    const rev=AC.createConvolver(); const len=AC.sampleRate*1.3, ir=AC.createBuffer(2,len,AC.sampleRate);
    for(let c=0;c<2;c++){ const d=ir.getChannelData(c); for(let i=0;i<len;i++){ const t=i/len; d[i]=(Math.random()*2-1)*Math.pow(1-t,3.2)*(t<.01?t*100:1); } }
    rev.buffer=ir; const wet=AC.createGain(); wet.gain.value=.22; rev.connect(wet); wet.connect(master);
    sfxBus=AC.createGain(); sfxBus.gain.value=SET.sfx*1.1; sfxBus.connect(master); sfxBus.connect(rev);
    musicBus=AC.createGain(); musicBus.gain.value=SET.music*.75; const lp=AC.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=2400; musicBus.connect(lp); lp.connect(master); lp.connect(rev);
    startMusic();
  }catch(e){ AC=null; return null; } }
  if(AC.state==='suspended') AC.resume(); return AC;
}
function osc(type,f,t,dur,vol,f2,bus,attack=.004){ const o=AC.createOscillator(), g=AC.createGain(); o.type=type; o.frequency.setValueAtTime(f,t); if(f2) o.frequency.exponentialRampToValueAtTime(f2,t+dur*.8);
  g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(vol,t+attack); g.gain.exponentialRampToValueAtTime(.0001,t+dur); o.connect(g); g.connect(bus); o.start(t); o.stop(t+dur+.05); }
let nb=null;
function nz(t,dur,vol,freq,q,bus,type='bandpass'){ if(!nb){ nb=AC.createBuffer(1,AC.sampleRate*.6,AC.sampleRate); const d=nb.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1; }
  const s=AC.createBufferSource(), f=AC.createBiquadFilter(), g=AC.createGain(); s.buffer=nb; f.type=type; f.frequency.value=freq; f.Q.value=q;
  g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(.0001,t+dur); s.connect(f); f.connect(g); g.connect(bus); s.start(t,Math.random()*.4); s.stop(t+dur+.02); }
// the core sound: a deep, rounded keyboard-style thock
function thock(f=160,vol=.5,delay=0,decay=.11,click=.22){ if(!AC||!sfxOn) return; const t=AC.currentTime+Math.max(0,delay);
  osc('sine',f,t,decay,vol,f*.55,sfxBus,.002);
  osc('triangle',f*2.05,t,decay*.4,vol*.32,f*1.5,sfxBus,.001);
  nz(t,.022,vol*click,f*7,1.4,sfxBus);
  nz(t,decay*.7,vol*.25,f*2.2,.9,sfxBus,'lowpass'); }
const R_=(a,b)=>a+Math.random()*(b-a);
const SFX={
  land(s=1,d=0){ thock(R_(140,175),.5*s,d,.1,.18); },
  tok(d=0,v=1){ thock(R_(380,460),.18*v,d,.045,.3); },
  pick(){ thock(300,.32,0,.07,.16); }, unpick(){ thock(230,.26,0,.06,.14); },
  bank(i=0){ thock(R_(118,132),.62,i*.05,.15,.26); thock(380,.12,i*.05+.06,.04,.3); },
  ui(){ thock(250,.32,0,.08,.2); },
  rattle(ms=600){ const n=Math.round(ms/45); for(let i=0;i<n;i++) thock(R_(480,640),.09,i*ms/1000/n+R_(0,.02),.035,.45); },
  slam(){ thock(62,1,0,.42,.5); thock(120,.5,.02,.2,.3); },
  hit(){ thock(84,.9,0,.32,.4); if(AC&&sfxOn) osc('sine',55,AC.currentTime,.5,.3,40,sfxBus); },
  hurt(){ thock(58,.9,0,.42,.3); if(AC&&sfxOn) osc('sawtooth',98,AC.currentTime,.5,.05,60,sfxBus); },
  step(d=0){ thock(R_(95,115),.22,d,.08,.35); },
  hat(d=0){ thock(200,.25,d,.08,.2); },
  crown(){ if(!AC||!sfxOn) return; const t=AC.currentTime; osc('sine',880,t,1.3,.07,null,sfxBus,.01); osc('sine',1318,t+.03,1,.035,null,sfxBus,.01); osc('sine',2637,t+.03,.4,.01,null,sfxBus,.01); },
  coin(){ if(!AC||!sfxOn) return; const t=AC.currentTime; osc('sine',1568,t,.18,.05,null,sfxBus); osc('sine',2093,t+.06,.3,.045,null,sfxBus); },
  vib(notes,gap=.09,vol=.08){ if(!AC||!sfxOn) return; const t=AC.currentTime; notes.forEach((m,i)=>{ const f=440*Math.pow(2,(m-69)/12); osc('sine',f,t+i*gap,1.1,vol,null,sfxBus,.003); osc('sine',f*4,t+i*gap,.25,vol*.25,null,sfxBus,.002); }); },
  odds(){ thock(520,.22,0,.05,.3); thock(780,.16,.05,.05,.3); if(AC&&sfxOn) osc('square',1046,AC.currentTime+.05,.12,.02,null,sfxBus,.002); },
  tick(i=0){ thock(300+i*60,.28,0,.05,.32); },
  ching(big){ if(!AC||!sfxOn) return; const t=AC.currentTime; [0,4,7,12].forEach((m,i)=>osc('square',523*Math.pow(2,m/12),t+i*.05,.16,big?.035:.025,null,sfxBus,.002)); thock(70,1,0,.4,.5); },
  win(){ SFX.vib([62,65,69,74]); }, lose(){ SFX.vib([62,58,55,50],.13,.07); }, push(){ SFX.vib([62,62],.16,.05); },
  fanfare(){ SFX.vib([55,60,64,67,72,76,79],.08,.08); },
  shatter(){ if(!AC||!sfxOn) return; const t=AC.currentTime; for(let i=0;i<10;i++) nz(t+i*.02+R_(0,.01),.06,.18,R_(3500,7500),4,sfxBus); osc('sine',2600,t,.25,.03,900,sfxBus); },
};
SFX.paper=()=>{ if(!AC||!sfxOn) return; const t=AC.currentTime; nz(t,.18,.1,2400,.6,sfxBus); nz(t+.05,.12,.06,5200,.8,sfxBus); };
SFX.punch=()=>{ thock(360,.26,0,.05,.55); if(AC&&sfxOn) nz(AC.currentTime+.012,.05,.1,4200,2,sfxBus); };
SFX.stamp=()=>{ thock(92,.75,0,.2,.55); if(AC&&sfxOn) nz(AC.currentTime,.09,.22,1100,.8,sfxBus); };
SFX.hover=()=>{ thock(560,.05,0,.03,.6); };
/* procedural lounge: walking bass, brushes, soft keys, crackle */
let musicTimer=null, nextBeat=0, beatN=0;
const CH=[[50,53,57,60],[43,47,50,53],[48,52,55,59],[45,49,52,55]];
const mf=m=>440*Math.pow(2,(m-69)/12);
function startMusic(){ if(musicTimer) return; nextBeat=AC.currentTime+.1; musicTimer=setInterval(schedule,80); }
// the room's music follows where you are: same band, different night. Scenes change on the first beat of a bar.
const BAR_CH=[[53,57,60,64],[50,53,57,60],[43,46,50,53],[48,52,55,58]], BOSS_CH=[[38,41,45,50],[39,43,46,51],[38,41,45,50],[33,37,40,46]];
const MUS={room:{bpm:70,ch:CH},fight:{bpm:82,ch:CH},bar:{bpm:96,ch:BAR_CH},boss:{bpm:116,ch:BOSS_CH},boss2:{bpm:136,ch:BOSS_CH}};
let musScene='room';
function musicScene(){ if(!G) return 'room'; if(G.at==='bar') return 'bar'; if(F&&G.at==='fight'&&G.hp>0) return F.kind==='B'?(F.phase2?'boss2':'boss'):'fight'; return 'room'; }
function bassNote(t,m,len,type,cut,vol){ const o=AC.createOscillator(), g=AC.createGain(), lp=AC.createBiquadFilter(); o.type=type; o.frequency.value=mf(m-12); lp.type='lowpass'; lp.frequency.value=cut;
  g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(vol,t+.012); g.gain.exponentialRampToValueAtTime(.001,t+len*.92); o.connect(lp); lp.connect(g); g.connect(musicBus); o.start(t); o.stop(t+len); }
function schedule(){ while(nextBeat<AC.currentTime+.4){ if(beatN%4===0) musScene=musicScene();
  const M=MUS[musScene], spb=60/M.bpm, bar=Math.floor(beatN/4)%4, b=beatN%4, ch=M.ch[bar], next=M.ch[(bar+1)%4], t=nextBeat;
  if(musScene==='fight'){
    bassNote(t,[ch[0],ch[1],ch[2],next[0]+(Math.random()<.5?1:-1)][b],spb,'triangle',380,.2);
    if(b===1||b===3) nz(t,.24,.05,5000,.7,musicBus);
    nz(t+spb*.66,.06,.02,7000,.8,musicBus);
    if(b===0||(b===2&&Math.random()<.6)) ch.forEach((m,i)=>{ osc('sine',mf(m+12),t+.012*i,spb*1.7,.022,null,musicBus,.02); osc('triangle',mf(m+24),t+.012*i,spb*.9,.006,null,musicBus,.01); });
  } else if(musScene==='room'){ // between fights: just the bass and a held chord, nobody's drumming
    if(b===0||b===2) bassNote(t,b===0?ch[0]:ch[2],spb*2,'triangle',320,.14);
    if(b===0) ch.forEach((m,i)=>osc('sine',mf(m+12),t+.03*i,spb*3.4,.016,null,musicBus,.08));
  } else if(musScene==='bar'){ // the bar: a warm stride piano in a major key, root and fifth under offbeat chords
    if(b===0||b===2) bassNote(t,b===0?ch[0]:ch[2],spb*.95,'triangle',520,.17);
    if(b===1||b===3) ch.slice(1).forEach((m,i)=>{ osc('triangle',mf(m+12),t+.008*i,spb*.55,.022,null,musicBus,.006); osc('sine',mf(m+24),t+.008*i,spb*.35,.008,null,musicBus,.006); });
    if(Math.random()<.45) osc('sine',mf(ch[Math.floor(Math.random()*4)]+24),t+spb*.66,spb*.5,.022,null,musicBus,.008);
    nz(t+spb*.66,.04,.014,8000,.9,musicBus);
  } else { // the boss: the same band, playing tense. Chromatic walking bass an octave up (no sub), brushes, stabs that won't settle
    const hot=musScene==='boss2';
    bassNote(t,[ch[0],ch[0]+1,ch[0]+3,next[0]-1][b]+12,spb*.8,'triangle',hot?900:700,.2);
    if(b===1||b===3) nz(t,.16,.08,2600,.8,musicBus);
    nz(t+spb*.5,.04,.03,7500,.9,musicBus);
    if(b===0||b===3) ch.forEach((m,i)=>osc('triangle',mf(m+12),b===3?t+spb*.5:t,spb*.4,.026,null,musicBus,.005));
    if(hot) for(let i=0;i<4;i++) osc('sine',mf(ch[3]+24+(i%2)),t+i*spb/4,spb*.2,.012,null,musicBus,.004);
  }
  if(Math.random()<.6) nz(t+Math.random()*spb,.01,.03,R_(2500,6000),3,musicBus);
  nextBeat+=spb; beatN++; } }



/* ================= HELPERS ================= */
const $=s=>document.querySelector(s);
const ui=$('#ui'), fx=$('#fx'), labels=$('#labels');
const REDUCED=matchMedia('(prefers-reduced-motion: reduce)').matches;
const sleep=ms=>(GL_OK&&R)?anim(ms,()=>{}):new Promise(r=>setTimeout(r,REDUCED?Math.min(ms,80):ms));
function h(html){const t=document.createElement('template');t.innerHTML=html.trim();return t.content.firstElementChild}
let uidN=1; const newDie=type=>({uid:uidN++,type,cracks:0});
function floatAt(p,text,cls){ const f=h(`<div class="float ${cls}">${text}</div>`); f.style.left=p.x+'px'; f.style.top=p.y+'px'; fx.appendChild(f); setTimeout(()=>f.remove(),1250); }
function floatEl(el,text,cls){ if(!el) return; const r=el.getBoundingClientRect(); floatAt({x:r.left+r.width/2,y:r.top+r.height/2},text,cls); }
function sparksAt(p,color){ if(REDUCED) return; for(let i=0;i<14;i++){ const s=h('<i class="spark"></i>'); if(color){s.style.background=color;s.style.boxShadow='0 0 8px '+color} s.style.left=p.x+'px'; s.style.top=p.y+'px'; fx.appendChild(s); const a=Math.PI*2*i/14+Math.random()*.4, r=30+Math.random()*44;
  s.animate([{transform:'translate(-50%,-50%) rotate(45deg)',opacity:1},{transform:`translate(${Math.cos(a)*r}px,${Math.sin(a)*r}px) rotate(45deg) scale(.2)`,opacity:0}],{duration:650+Math.random()*300,easing:'cubic-bezier(.2,.8,.2,1)'}).onfinish=()=>s.remove(); } }
function toast(t){ const el=h(`<div class="toast paper">${t}</div>`); document.body.appendChild(el); placeToast(el); setTimeout(()=>el.remove(),3100); }
// try under the top bar, then the middle of the table, then just above the slip; skip any spot that would cover something you need to read
function placeToast(el){ const keep=[...document.querySelectorAll('#plate,.mhead,.picker,.yourtab,.msg,.napkin,.qpop,.toast')].filter(e=>e!==el&&e.getBoundingClientRect().height>0).map(e=>e.getBoundingClientRect());
  const hud=document.querySelector('#ui .hud'), hb=hud?hud.getBoundingClientRect().bottom:40, H=el.offsetHeight, W=el.offsetWidth, L=(innerWidth-W)/2;
  const yt=document.querySelector('.yourtab'), st=yt&&yt.getBoundingClientRect().height?yt.getBoundingClientRect().top:innerHeight;
  const cover=y=>keep.reduce((a,b)=>{ const x=Math.min(b.right,L+W)-Math.max(b.left,L), yy=Math.min(b.bottom+8,y+H)-Math.max(b.top-8,y); return a+(x>0&&yy>0?x*yy:0); },0);
  let best=hb+8, bc=Infinity; for(let y=hb+8;y+H<=Math.min(innerHeight,st)-6;y+=6){ const c=cover(y); if(c<bc){ bc=c; best=y; } if(c===0) break; }
  el.style.top=Math.round(best)+'px'; }
function banner(big,small,red){ const el=h(`<div class="banner"><div class="in ${red?'red':''}"><div class="big">${big}</div>${small?`<div class="ln">${small}</div>`:''}</div></div>`); document.body.appendChild(el); setTimeout(()=>el.remove(),2200); }
function kw(t){ return String(t)
  .replace(/(\+\$\d+|\$\d+)/g,'<b class="kw cash">$1</b>')
  .replace(/(\+\d+ odds)/g,'<b class="kw odds">$1</b>')
  .replace(/(\u00d7[\d.]+(?: odds)?)/g,'<b class="kw mult">$1</b>')
  .replace(/(\+\d+ (?:max )?nerve|\d+ nerve)/g,'<b class="kw nerve">$1</b>').replace(/<\/b>\.$/,'</b>'); }
const chipHTML=(c,sm)=>CHARM_ICON[c]?`<span class="cicon t-${CHARMS[c].tier} ${sm?'sm':''}"><img src="${CHARM_ICON[c]}" alt=""></span>`:`<span class="pchip t-${CHARMS[c].tier} ${sm?'sm':''}"><span>${CHARMS[c].ico}</span></span>`;
const faceTxt=f=>f==='C'?'♛':f==='G'?'<i class="ruby">♛</i>':typeof f==='number'&&f<0?'\u2212'+(-f):f;

/* ================= FACE TEXTURES ================= */
const SKINS={
  bone:  {bg:'#efe6d0',edge:'#b9a986',ink:'#1e1310'},
  octo:  {bg:'#d6dee8',edge:'#8d9aab',ink:'#14202e'},
  lead:  {bg:'#6a6e78',edge:'#3a3e46',ink:'#e8e8f0'},
  pebble:{bg:'#9aa7b3',edge:'#5d6a76',ink:'#0c1218'},
  loaded:{bg:'#9a2638',edge:'#5a121e',ink:'#fff3dc'},
  glass: {bg:'#a6e2f2',edge:'#5aa8c0',ink:'#0f3a4a'},
  ember: {bg:'#2b130d',edge:'#170804',ink:'#ffa04a'},
  coin:  {bg:'#e0ae45',edge:'#9a6a14',ink:'#3a2000'},
  twin:  {bg:'#efe6d0',edge:'#b9a986',ink:'#1e1310',bg2:'#c4d2f6'},
  gamble:{bg:'#6340c4',edge:'#36207a',ink:'#ffffff'},
  shaved:{bg:'#221c17',edge:'#0a0806',ink:'#e8c56a'},
  devil: {bg:'#1a0a0c',edge:'#0a0204',ink:'#ff4a3a'},
  gilded:{bg:'#f4ecd6',edge:'#c9a14a',ink:'#b07a10'},
  bomb:  {bg:'#e8402a',edge:'#7a1408',ink:'#fff3dc'},
  goose: {bg:'#f6f2ea',edge:'#c8bca4',ink:'#3a5a8a'},
  boxcar:{bg:'#2f7a4a',edge:'#164228',ink:'#f4ead2'},
  royal: {bg:'#4a1a6a',edge:'#2a0a40',ink:'#f0c040'},
  deuce: {bg:'#e8e0cc',edge:'#a89a7a',ink:'#2a6a3a'},
  payday:{bg:'#2e6a3c',edge:'#173a20',ink:'#f2e6b8'},
  trick: {bg:'#1a1a1e',edge:'#000000',ink:'#e84a5a'},
  bubbly:{bg:'#f2e2a8',edge:'#b8a060',ink:'#6a4a10'},
  viper: {bg:'#3a6a2a',edge:'#1a3a10',ink:'#e8f070'},
};
const PIPS={1:[[1,1]],2:[[0,0],[2,2]],3:[[0,0],[1,1],[2,2]],4:[[0,0],[2,0],[0,2],[2,2]],5:[[0,0],[2,0],[1,1],[0,2],[2,2]],6:[[0,0],[2,0],[0,1],[2,1],[0,2],[2,2]]};
const usesPips=type=>DT[type].faces.every(f=>f==='C'||f<=6);
function drawFace(cv,type,val,bg=true){ drawFace0(cv,type,val,bg); if(bg){ const c=cv.getContext('2d'), S=cv.width; for(let i=0;i<90;i++){ c.fillStyle=Math.random()<.6?'rgba(40,25,10,.09)':'rgba(255,255,255,.08)'; c.fillRect(Math.random()*S,Math.random()*S,1+Math.random()*2,1+Math.random()*2); } } }
function drawFace0(cv,type,val,bg=true){
  const S=cv.width, c=cv.getContext('2d'), sk=SKINS[DT[type].skin], u=S/64;
  c.clearRect(0,0,S,S);
  if(bg){ c.fillStyle=sk.bg; c.fillRect(0,0,S,S);
    if(sk.bg2){ c.fillStyle=sk.bg2; c.beginPath(); c.moveTo(S,0); c.lineTo(S,S); c.lineTo(0,S); c.fill(); }
    c.fillStyle=sk.edge; c.fillRect(0,S-4*u,S,4*u); c.fillRect(S-4*u,0,4*u,S); c.fillStyle='#ffffff40'; c.fillRect(0,0,S,3*u); c.fillRect(0,0,3*u,S); }
  if(val==='?'){ c.fillStyle='#241a1c'; if(bg){ c.fillRect(4*u,4*u,S-8*u,S-8*u); c.strokeStyle='#3e2f30'; c.lineWidth=3*u; for(let i=-S;i<S;i+=10*u){c.beginPath();c.moveTo(i,0);c.lineTo(i+S,S);c.stroke();} } else { c.beginPath(); c.arc(S/2,S/2,26*u,0,7); c.fill(); }
    c.fillStyle='#e0b85a'; c.font=`${44*u}px 'Jersey 15',monospace`; c.textAlign='center'; c.textBaseline='middle'; c.fillText('?',S/2,S/2+2*u); return; }
  if(val==='C'||val==='G'){ const gem=val==='G'; if(bg){ c.fillStyle='#2a1a08'; c.globalAlpha=.18; c.fillRect(6*u,6*u,S-12*u,S-12*u); c.globalAlpha=1; }
    c.fillStyle=gem?'#e8455a':'#f0bd4a'; c.strokeStyle=gem?'#3a0008':'#3a2200'; c.lineWidth=3*u; c.lineJoin='round'; c.beginPath();
    c.moveTo(12*u,44*u); c.lineTo(10*u,20*u); c.lineTo(22*u,32*u); c.lineTo(32*u,13*u); c.lineTo(42*u,32*u); c.lineTo(54*u,20*u); c.lineTo(52*u,44*u); c.closePath(); c.fill(); c.stroke();
    c.fillRect(12*u,46*u,40*u,7*u); c.strokeRect(12*u,46*u,40*u,7*u); c.fillStyle=gem?'#ffe08a':'#fff3cf'; [[10,20],[32,13],[54,20]].forEach(([x,y])=>{c.beginPath();c.arc(x*u,y*u,3.6*u,0,7);c.fill();c.stroke()}); return; }
  if(bg && typeof val==='number' && val>=1 && val<=6 && usesPips(type)){ const r=6.4*u; PIPS[val].forEach(([x,y])=>{ const px=S*(.25+.25*x), py=S*(.25+.25*y);
    c.fillStyle=sk.ink; c.beginPath(); c.arc(px,py,r,0,7); c.fill(); c.fillStyle='#ffffff30'; c.beginPath(); c.arc(px-1.6*u,py-1.6*u,r*.35,0,7); c.fill(); }); return; }
  const tx=typeof val==='number'&&val<0?'\u2212'+(-val):String(val);
  const big=bg?(tx.length>1?40:52):(tx.length>1?46:60);
  c.font=`${big*u}px 'Jersey 15',monospace`; c.textAlign='center'; c.textBaseline='middle';
  c.lineWidth=(bg?4:6)*u; c.lineJoin='round'; c.strokeStyle=sk.bg; c.strokeText(tx,S/2,S/2+3*u); c.fillStyle=sk.ink; c.fillText(tx,S/2,S/2+3*u);
  if(val===6||val===9){ c.fillRect(S*.34,S*.84,S*.32,3*u); }
}
const bestFace=type=>DT[type].faces.includes(1)?1:DT[type].faces[0];
// flat menu icon that matches the die's real shape
function iconCanvas(type,val,size=44){ if(DIE_ICON[type]){ const im=new Image(); im.src=DIE_ICON[type]; im.className='px dieimg'; im.width=im.height=size; im.style.width=im.style.height=size+'px'; im.alt=''; return im; } return iconCanvas0(type,val,size); }
function iconCanvas0(type,val,size=44){ const cv=document.createElement('canvas'); cv.width=cv.height=48; const v=val==null?bestFace(type):val; const sh=shapeOf(type), sk=SKINS[DT[type].skin];
  if(sh==='cube'){ const t=document.createElement('canvas'); t.width=t.height=48; drawFace(t,type,v); cv.getContext('2d').drawImage(t,0,0); }
  else { const c=cv.getContext('2d'); const pts={tetra:[[24,3],[46,43],[2,43]],octa:[[24,1],[46,24],[24,47],[2,24]],dodeca:[...Array(10)].map((_,i)=>[24+23*Math.cos(i*Math.PI/5-Math.PI/2),24+23*Math.sin(i*Math.PI/5-Math.PI/2)])}[sh];
    c.fillStyle=sk.bg; c.strokeStyle=sk.edge; c.lineWidth=2;
    if(sh==='coin'){ c.beginPath(); c.arc(24,24,22,0,7); c.fill(); c.stroke(); c.strokeStyle='#ffffff44'; c.beginPath(); c.arc(24,24,18,0,7); c.stroke(); }
    else { c.beginPath(); pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y)); c.closePath(); c.fill(); c.stroke();
      c.strokeStyle='#00000030'; c.lineWidth=1; if(sh==='octa'){ c.beginPath(); c.moveTo(2,24); c.lineTo(46,24); c.stroke(); } if(sh==='dodeca'){ c.beginPath(); for(let i=0;i<5;i++){ const a=i*2*Math.PI/5-Math.PI/2; const x=24+12*Math.cos(a), y=24+12*Math.sin(a); i?c.lineTo(x,y):c.moveTo(x,y);} c.closePath(); c.stroke(); } }
    const g=document.createElement('canvas'); g.width=g.height=64; drawFace(g,type,v,false); const gs=sh==='tetra'?26:30; c.drawImage(g,24-gs/2,(sh==='tetra'?30:24)-gs/2,gs,gs); }
  cv.style.width=cv.style.height=size+'px'; cv.className='px'; return cv; }

/* ================= 3D ENGINE ================= */
let R=null, SCN=null, CAM=null, RT=null, POST=null, PCAM=null, PMAT=null, canvas=$('#scene'), GL_OK=typeof THREE!=='undefined';
let camGoal=null, fogGoal=0, fogNow=0; let PX=2, VW=1,VH=1, camBase=null, camLook=null, shakeAmt=0, swayT=0, lampDim=1, PAUSED=false, TS=1;
function shake(v){ if(SET.shake) shakeAmt=v; }
const ALLDICE=new Set();
const tweens=[]; const frameFns=new Set();
function anim(dur,fn){ return new Promise(res=>{ if(REDUCED) dur=1; tweens.push({t:0,dur,fn,res}); }); }
const lerp=(a,b,k)=>a+(b-a)*k;
const ease={out:k=>1-Math.pow(1-k,3), inout:k=>k<.5?4*k*k*k:1-Math.pow(-2*k+2,3)/2, back:k=>{const c=1.7;return 1+(c+1)*Math.pow(k-1,3)+c*Math.pow(k-1,2)}, in:k=>k*k*k};
function texFromCanvas(cv,nearest=true){ const t=new THREE.CanvasTexture(cv); if(nearest){ t.magFilter=THREE.NearestFilter; t.minFilter=THREE.NearestFilter; t.generateMipmaps=false; } return t; }
function makeCanvas(w,h,draw){ const cv=document.createElement('canvas'); cv.width=w; cv.height=h; draw(cv.getContext('2d'),w,h); return cv; }
let GRAINTEX=null;
function grainTex(){ if(!GRAINTEX){ const cv=makeCanvas(32,32,c=>{ const id=c.createImageData(32,32); for(let i=0;i<id.data.length;i+=4){ const v=196+Math.random()*59; id.data[i]=id.data[i+1]=id.data[i+2]=v; id.data[i+3]=255; } c.putImageData(id,0,0); }); GRAINTEX=texFromCanvas(cv); GRAINTEX.wrapS=GRAINTEX.wrapT=THREE.RepeatWrapping; } return GRAINTEX; }
const lambert=(color,o={})=>new THREE.MeshLambertMaterial({color,map:grainTex(),...o});
let FELT_CV,FELT_TEX,WALL_CV,WALL_TEX,NEON_CV,NEON_TEX,NEONL,CUR_THEME=-1;
let RUG_CV=null, RUG_TEX=null; let smoke=[], lampLight=null, bulb=null, neon=null, debris=[];

function initGL(){
  try{ R=new THREE.WebGLRenderer({canvas,antialias:false,powerPreference:'low-power'}); }catch(e){ GL_OK=false; return; }
  R.setPixelRatio(1); R.shadowMap.enabled=true; R.shadowMap.type=THREE.BasicShadowMap;
  SCN=new THREE.Scene(); SCN.background=new THREE.Color(0x0a0706); SCN.fog=new THREE.Fog(0x0a0706,13,27);
  CAM=new THREE.PerspectiveCamera(40,1,2,60);
  RT=new THREE.WebGLRenderTarget(64,64,{minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter});
  PCAM=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
  PMAT=new THREE.ShaderMaterial({uniforms:{t:{value:RT.texture},res:{value:new THREE.Vector2(64,64)},time:{value:0},hurt:{value:0}},
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader:`uniform sampler2D t;uniform vec2 res;uniform float time;uniform float hurt;varying vec2 vUv;
      float bayer(vec2 p){ vec2 q=mod(p,4.); int i=int(q.x)+int(q.y)*4; float m[16];
        m[0]=0.;m[1]=8.;m[2]=2.;m[3]=10.;m[4]=12.;m[5]=4.;m[6]=14.;m[7]=6.;m[8]=3.;m[9]=11.;m[10]=1.;m[11]=9.;m[12]=15.;m[13]=7.;m[14]=13.;m[15]=5.;
        for(int k=0;k<16;k++){ if(k==i) return m[k]/16.; } return 0.; }
      float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
      void main(){ vec2 px=floor(vUv*res); vec2 uv=(px+.5)/res; vec3 c=texture2D(t,uv).rgb;
        c=pow(c,vec3(.92)); c*=vec3(1.05,1.0,.9);
        float l=dot(c,vec3(.299,.587,.114)); c=mix(vec3(l),c,1.1);
        c+=(h(px+fract(time))-.5)*.025;
        float lv=30.; c=floor(c*lv+bayer(px)*.85+.075)/lv;
        vec2 d=vUv-.5; c*=smoothstep(1.0,.34,length(d*vec2(1.,.92)));
        c=mix(c,c*vec3(1.45,.5,.5),hurt);
        gl_FragColor=vec4(c,1.);}`});
  POST=new THREE.Scene(); POST.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),PMAT));
  buildRoom(); setActTheme(0);
  resize(); addEventListener('resize',resize);
  canvas.addEventListener('pointerdown',onPointer); canvas.addEventListener('pointermove',onHover);
  let last=performance.now();
  const loop=now=>{ if(now-last<15.5){ requestAnimationFrame(loop); return; } const dt=Math.min(.05,(now-last)/1000); last=now; swayT+=dt;
    const tdt=PAUSED?0:dt*TS;
    for(let i=tweens.length-1;i>=0;i--){ const tw=tweens[i]; if(!tw) continue; tw.t+=tdt*1000; const k=Math.min(1,tw.t/tw.dur); try{ tw.fn(k); }catch(e){ console.error(e); tw.t=tw.dur; } if(k>=1||tw.t>=tw.dur){ tweens.splice(i,1); tw.res(); } }
    frameFns.forEach(f=>f(PAUSED?0:dt,now/1000));
    if(camGoal&&camBase){ const k=REDUCED?1:1-Math.exp(-dt*2.6); camBase.lerp(camGoal,k); fogNow+=(fogGoal-fogNow)*k; fogTo(fogNow); if(camBase.distanceToSquared(camGoal)<1e-6){ camBase.copy(camGoal); fogTo(fogGoal); fogNow=fogGoal; camGoal=null; } }
    if(camBase){ const s=REDUCED?0:1; CAM.position.set(camBase.x+Math.sin(swayT*.31)*.07*s+(Math.random()-.5)*shakeAmt, camBase.y+Math.sin(swayT*.47)*.045*s+(Math.random()-.5)*shakeAmt, camBase.z); CAM.lookAt(camLook); shakeAmt*=.86; }
    PMAT.uniforms.time.value=now/1000; PMAT.uniforms.hurt.value*=.93;
    R.setRenderTarget(RT); R.render(SCN,CAM); R.setRenderTarget(null); R.render(POST,PCAM);
    requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
}
function resize(){
  VW=innerWidth; VH=innerHeight;
  R.setSize(VW,VH,false);
  const px=Math.max(2,Math.min(3,Math.round(Math.min(VW,VH)/240))); document.documentElement.style.setProperty('--u',px+'px'); PX=px;
  const lw=Math.round(VW/px), lh=Math.round(VH/px);
  RT.setSize(lw,lh); PMAT.uniforms.res.value.set(lw,lh);
  CAM.aspect=VW/VH; CAM.fov=32; CAM.updateProjectionMatrix();
  const hh=Math.atan(Math.tan(CAM.fov*Math.PI/360)*CAM.aspect); const dist=Math.max(16.7,5.15/Math.tan(hh)); fogTo(dist);
  const el=46*Math.PI/180; camLook=new THREE.Vector3(0,0,-1);
  camBase=new THREE.Vector3(0,camLook.y+Math.sin(el)*dist,camLook.z+Math.cos(el)*dist); CAMF={el,dist,zoom:1}; camGoal=null;
  if(typeof F!=='undefined'&&F) requestAnimationFrame(()=>fitCam(false));
}
let CAMF=null;
function fogTo(d){ SCN.fog.near=d+1.4; SCN.fog.far=d+15.4; }
// glide from where the camera is now to where fitCam just measured, instead of cutting
function glideFrom(from,fromD){ camGoal=camBase.clone(); fogGoal=SCN.fog.near-1.4; camBase.copy(from); fogNow=fromD; fogTo(fromD); CAM.position.copy(from); CAM.lookAt(camLook); CAM.updateMatrixWorld(); }
function buildRoom(){
  SCN.add(new THREE.AmbientLight(0x3a2a44,1.12));
  SCN.add(new THREE.HemisphereLight(0x553a2a,0x0a0608,.35));
  lampLight=new THREE.SpotLight(0xffc27a,1.45,24,.7,.5,1); lampLight.position.set(0,7.5,.2); lampLight.target.position.set(0,0,.2);
  lampLight.castShadow=true; lampLight.shadow.mapSize.set(512,512); lampLight.shadow.camera.near=2; lampLight.shadow.camera.far=14; SCN.add(lampLight); SCN.add(lampLight.target);
  const shade=new THREE.Mesh(new THREE.ConeGeometry(1.1,.75,8,1,true),new THREE.MeshLambertMaterial({color:0x1f4a33,side:THREE.DoubleSide,emissive:0x0b1a12}));
  shade.position.set(0,9.7,.2); SCN.add(shade);
  bulb=new THREE.Mesh(new THREE.SphereGeometry(.22,6,4),new THREE.MeshBasicMaterial({color:0xffe2a8})); bulb.position.set(0,9.42,.2); SCN.add(bulb);
  const cord=new THREE.Mesh(new THREE.CylinderGeometry(.02,.02,6,4),lambert(0x111111)); cord.position.set(0,13,.2); SCN.add(cord);
  frameFns.add((dt,t)=>{ lampLight.intensity=1.2*lampDim; bulb.material.color.setScalar((.9+Math.sin(t*7)*.02)*Math.max(.15,lampDim)); });
  FELT_CV=makeCanvas(256,192,()=>{}); FELT_TEX=texFromCanvas(FELT_CV);
  const fm=new THREE.Mesh(new THREE.PlaneGeometry(9.2,6.9),new THREE.MeshLambertMaterial({map:FELT_TEX})); fm.rotation.x=-Math.PI/2; fm.receiveShadow=true; SCN.add(fm);
  const wood=texFromCanvas(makeCanvas(64,16,(c,w,hh)=>{ c.fillStyle='#4a2614'; c.fillRect(0,0,w,hh); for(let i=0;i<14;i++){ c.strokeStyle=`rgba(${20+rnd(30)},${8+rnd(10)},0,.6)`; c.beginPath(); const y=rnd(hh); c.moveTo(0,y); c.bezierCurveTo(w*.3,y+rnd(4)-2,w*.6,y+rnd(4)-2,w,y+rnd(3)-1); c.stroke(); } c.fillStyle='#ffffff18'; c.fillRect(0,1,w,1); }));
  wood.wrapS=wood.wrapT=THREE.RepeatWrapping;
  const railM=new THREE.MeshLambertMaterial({map:wood});
  [[9.9,.4,.45,0,.12,3.68],[9.9,.4,.45,0,.12,-3.68],[.45,.4,7.8,4.83,.12,0],[.45,.4,7.8,-4.83,.12,0]].forEach(([w,hh,d,x,y,z])=>{ const m=new THREE.Mesh(new THREE.BoxGeometry(w,hh,d),railM); m.position.set(x,y,z); m.receiveShadow=true; m.castShadow=true; SCN.add(m); });
  const skirt=new THREE.Mesh(new THREE.BoxGeometry(10.4,1.6,8.2),lambert(0x241208)); skirt.position.y=-.88; SCN.add(skirt);
  const planks=texFromCanvas(makeCanvas(64,64,(c,w,hh)=>{ for(let r=0;r<8;r++){ const y=r*8, off=(r%2)*24; c.fillStyle=['#24170f','#2a1b11','#21150d','#2d1d12'][r%4]; c.fillRect(0,y,w,8);
      c.fillStyle='#120a06'; c.fillRect(0,y,w,1); for(let x=off;x<w;x+=48) c.fillRect(x,y,1,8);
      c.globalAlpha=.25; for(let i=0;i<5;i++){ c.fillStyle='#000'; c.fillRect(rnd(w),y+2+rnd(5),6+rnd(14),1); } c.globalAlpha=1; } }));
  planks.wrapS=planks.wrapT=THREE.RepeatWrapping; planks.repeat.set(9,9);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(40,40),new THREE.MeshLambertMaterial({map:planks})); floor.rotation.x=-Math.PI/2; floor.position.y=-1.65; floor.receiveShadow=true; SCN.add(floor);
  RUG_CV=makeCanvas(128,96,()=>{}); RUG_TEX=texFromCanvas(RUG_CV);
  const rug=new THREE.Mesh(new THREE.PlaneGeometry(15,11.4),new THREE.MeshLambertMaterial({map:RUG_TEX})); rug.rotation.x=-Math.PI/2; rug.position.set(0,-1.64,.3); rug.receiveShadow=true; SCN.add(rug);
  WALL_CV=makeCanvas(32,32,()=>{}); const wp=texFromCanvas(WALL_CV); WALL_TEX=wp;
  wp.wrapS=wp.wrapT=THREE.RepeatWrapping; wp.repeat.set(14,6);
  const wall=new THREE.Mesh(new THREE.PlaneGeometry(34,14),new THREE.MeshLambertMaterial({map:wp})); wall.position.set(0,4,-8.5); SCN.add(wall);
  const wains=new THREE.Mesh(new THREE.BoxGeometry(34,2.2,.3),railM); wains.position.set(0,-.5,-8.4); SCN.add(wains);
  // (the bottle shelves used to sit here; they only ever showed as half-cut bars at the top edge, so they're gone)
  NEON_CV=makeCanvas(256,64,()=>{}); const nc=NEON_CV;
  NEON_TEX=texFromCanvas(nc); neon=new THREE.Mesh(new THREE.PlaneGeometry(5.2,1.3),new THREE.MeshBasicMaterial({map:NEON_TEX,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));
  neon.position.set(0,6.1,-8.4); SCN.add(neon);
  { const rl=new THREE.PointLight(0xfff0d8,.7,4.2,1.6); rl.position.set(-3.6,1.6,3.2); SCN.add(rl); const rt=new THREE.PointLight(0xfff0d8,.55,4,1.6); rt.position.set(3.2,1.6,-2.4); SCN.add(rt); }
  const neonL=new THREE.PointLight(0xff3a6a,1.1,9,1.5); NEONL=neonL; neonL.position.set(0,5.6,-7.4); SCN.add(neonL);
  frameFns.add((dt,t)=>{ const f=(Math.sin(t*37)>.97||(t%9<.12))?.35:1; neon.material.opacity=f; neonL.intensity=1.1*f; });
  const sm=texFromCanvas(makeCanvas(32,32,(c)=>{ const g=c.createRadialGradient(16,16,0,16,16,16); g.addColorStop(0,'rgba(220,210,200,.9)'); g.addColorStop(1,'rgba(220,210,200,0)'); c.fillStyle=g; c.fillRect(0,0,32,32); }));
  for(let i=0;i<16;i++){ const s=new THREE.Sprite(new THREE.SpriteMaterial({map:sm,transparent:true,opacity:0,depthWrite:false})); s.userData={life:Math.random(),speed:.08+Math.random()*.08,x0:(Math.random()-.5)*8,z0:-3.2-Math.random()*4}; SCN.add(s); smoke.push(s); }
  const tipPos=new THREE.Vector3();
  frameFns.add(dt=>{ const tip=foe&&foe.userData.cigarTip; smoke.forEach((s,i)=>{ const u=s.userData; u.life+=dt*u.speed; if(u.life>1){ u.life=0; if(tip&&i<6){ tip.getWorldPosition(tipPos); u.x0=tipPos.x; u.z0=tipPos.z; u.y0=tipPos.y; } else { u.x0=(Math.random()-.5)*9; u.z0=-3.2-Math.random()*4; u.y0=1+Math.random()*1.5; } }
    s.position.set(u.x0+Math.sin(u.life*6+i)*.3,(u.y0||1.5)+u.life*3,u.z0); const sc=.6+u.life*2.2; s.scale.set(sc,sc,1); s.material.opacity=Math.sin(u.life*Math.PI)*(i<6&&tip?.16:.07); }); });
  // simple physics for loose bits (hats, shards)
  frameFns.add(dt=>{ for(let i=debris.length-1;i>=0;i--){ const d=debris[i]; if(d.rest) continue; d.v.y-=14*dt; d.o.position.addScaledVector(d.v,dt); d.o.rotation.x+=d.w.x*dt; d.o.rotation.z+=d.w.z*dt; d.o.rotation.y+=d.w.y*dt;
    const floorY= (Math.abs(d.o.position.x)<4.6 && Math.abs(d.o.position.z)<3.45) ? d.floor : -1.65+d.floor;
    if(d.o.position.y<floorY){ d.o.position.y=floorY; if(Math.abs(d.v.y)>1.2){ d.v.y*=-.35; d.v.x*=.6; d.v.z*=.6; d.w.multiplyScalar(.5); d.onBounce&&d.onBounce(); } else { d.v.set(0,0,0); d.rest=true; d.settle&&d.settle(d.o); } } } });
  // the room never moves: skip its per-frame matrix updates
  SCN.children.forEach(o=>{ if(o.isMesh){ o.updateMatrix(); o.matrixAutoUpdate=false; } });
}
function clearDebris(){ debris.forEach(d=>{ SCN.remove(d.o); if(d.shard){ d.o.geometry&&d.o.geometry.dispose(); d.o.material&&d.o.material.dispose&&d.o.material.dispose(); } }); debris=[]; }
function disposeFoe(g){ if(!g) return; if(g.parent) g.parent.remove(g); g.traverse(c=>{ if(c.isMesh){ c.geometry&&c.geometry.dispose(); [].concat(c.material).forEach(m=>m&&m.dispose&&m.dispose()); } }); }

// the menus are made of the same felt and wood as the table, at the same pixel size
function uiTextures(a){ const T=ACTS[a].theme, dk=(hex,k)=>{ const c=new THREE.Color(hex); c.multiplyScalar(k); return '#'+c.getHexString(); };
  const felt=makeCanvas(48,48,(c,w,hh)=>{ c.fillStyle=dk(T.felt,.78); c.fillRect(0,0,w,hh); const id=c.getImageData(0,0,w,hh); for(let i=0;i<id.data.length;i+=4){ const n=(Math.random()-.5)*16; id.data[i]+=n; id.data[i+1]+=n; id.data[i+2]+=n; } c.putImageData(id,0,0); });
  const wood=makeCanvas(64,16,(c,w,hh)=>{ c.fillStyle='#3e200f'; c.fillRect(0,0,w,hh); for(let i=0;i<14;i++){ c.strokeStyle=`rgba(${14+rnd(26)},${6+rnd(8)},0,.7)`; c.beginPath(); const y=rnd(hh); c.moveTo(0,y); c.bezierCurveTo(w*.3,y+rnd(4)-2,w*.6,y+rnd(4)-2,w,y+rnd(3)-1); c.stroke(); } c.fillStyle='#ffffff14'; c.fillRect(0,1,w,1); });
  const st=document.documentElement.style; st.setProperty('--tex-felt',`url(${felt.toDataURL()})`); st.setProperty('--tex-wood',`url(${wood.toDataURL()})`); st.setProperty('--felt-c',dk(T.felt,.78)); }
function setActTheme(a){ if(typeof uiTextures==='function') try{ uiTextures(a); }catch(e){}
  if(!GL_OK||!FELT_CV||a===CUR_THEME) return; CUR_THEME=a; const A=ACTS[a], T=A.theme;
  { const c=FELT_CV.getContext('2d'), w=256, hh=192; c.fillStyle=T.felt; c.fillRect(0,0,w,hh); const id=c.getImageData(0,0,w,hh); for(let i=0;i<id.data.length;i+=4){ const n=(Math.random()-.5)*16; id.data[i]+=n; id.data[i+1]+=n; id.data[i+2]+=n; } c.putImageData(id,0,0);
    const cx=x=>(x+4.6)*27.83, cy=z=>(z+3.45)*27.83;
    c.strokeStyle=T.trim; c.globalAlpha=.55; c.lineWidth=1; for(const [bx,bz] of [[4.46,3.31],[4.38,3.24]]) c.strokeRect(cx(-bx),cy(-bz),bx*55.66,bz*55.66);
    for(const [x,y] of [[-4.38,-3.24],[4.38,-3.24],[-4.38,3.24],[4.38,3.24]]) for(let r=8;r<=20;r+=6){ c.beginPath(); c.arc(cx(x),cy(y),r,0,7); c.stroke(); }
    // running stitches bracket each bank zone; four brass tacks pin the tray
    c.globalAlpha=.3; c.setLineDash([3,3]); for(const [x0,x1,z0,z1] of [[1.4,4.42,-3.2,-2.3],[-4.42,-.9,2.35,3.2]]) for(const [x,dx] of [[x0,.4],[x1,-.4]]){ c.beginPath(); c.moveTo(cx(x+dx),cy(z0)); c.lineTo(cx(x),cy(z0)); c.lineTo(cx(x),cy(z1)); c.lineTo(cx(x+dx),cy(z1)); c.stroke(); } c.setLineDash([]);
    c.globalAlpha=.55; c.fillStyle='#c9a14a'; for(const x of [-4.2,4.2]) for(const z of [1.35,2.75]) c.fillRect(Math.round(cx(x))-1,Math.round(cy(z))-1,2,2);
    if(a===2){ c.globalAlpha=.12; c.fillStyle='#000'; for(let i=0;i<9;i++){ c.beginPath(); c.arc(Math.random()*w,Math.random()*hh,4+Math.random()*12,0,7); c.fill(); } }
    c.globalAlpha=.62; c.fillStyle=T.trim; c.font="10px 'Jersey 15',monospace"; c.textAlign='center'; c.fillText('LOWEST SCORE WINS',cx(-2.55),cy(-2.45),60); c.fillText(A.name.toUpperCase(),cx(-2.55),cy(-2.05),60); c.globalAlpha=1; FELT_TEX.needsUpdate=true; }
  { const c=WALL_CV.getContext('2d'), w=32; c.globalAlpha=1; c.fillStyle=T.wall; c.fillRect(0,0,w,w); c.strokeStyle=T.pat; c.fillStyle=T.pat;
    if(T.style==='fan'){ c.globalAlpha=.6; for(let r=4;r<=16;r+=4){ c.beginPath(); c.arc(16,32,r,Math.PI,0); c.stroke(); c.beginPath(); c.arc(0,16,r,-Math.PI/2,Math.PI/2); c.stroke(); c.beginPath(); c.arc(32,16,r,Math.PI/2,Math.PI*1.5); c.stroke(); } }
    if(T.style==='diamond'){ c.globalAlpha=.5; c.beginPath(); c.moveTo(16,1); c.lineTo(31,16); c.lineTo(16,31); c.lineTo(1,16); c.closePath(); c.stroke(); c.globalAlpha=.8; c.fillRect(15,15,2,2); c.globalAlpha=.25; for(let i=0;i<40;i++){ c.fillStyle='#000'; c.fillRect(Math.random()*w,Math.random()*w,1,1); } }
    if(T.style==='brick'){ c.globalAlpha=1; c.fillStyle='#1a1b18'; for(let y=0;y<32;y+=8){ c.fillRect(0,y,32,1); const off=(y/8)%2?0:8; for(let x=off;x<32;x+=16) c.fillRect(x,y,1,8); } c.globalAlpha=.15; c.fillStyle='#000'; c.fillRect(6,10,9,18); c.fillStyle='#4a4a3a'; c.globalAlpha=.3; for(let i=0;i<30;i++) c.fillRect(Math.random()*w,Math.random()*w,1,1); }
    c.globalAlpha=1; WALL_TEX.needsUpdate=true; }
  { const c=NEON_CV.getContext('2d'), w=256, hh=64; c.clearRect(0,0,w,hh); c.font="38px 'Jersey 15',monospace"; c.textAlign='center'; c.textBaseline='middle'; c.shadowColor=T.neonC; c.shadowBlur=14; c.fillStyle=T.neonT; c.fillText(T.neon,w/2,hh/2); c.shadowBlur=4; c.fillStyle='#fff'; c.globalAlpha=.85; c.fillText(T.neon,w/2,hh/2); c.globalAlpha=1; c.shadowBlur=0; NEON_TEX.needsUpdate=true; }
  { const c=RUG_CV.getContext('2d'), w=128, hh=96, base=new THREE.Color(T.felt).multiplyScalar(.32).lerp(new THREE.Color(0x2a0c0e),.55);
    c.fillStyle='#'+base.getHexString(); c.fillRect(0,0,w,hh); const id=c.getImageData(0,0,w,hh); for(let i=0;i<id.data.length;i+=4){ const n=(Math.random()-.5)*10; id.data[i]+=n; id.data[i+1]+=n; id.data[i+2]+=n; } c.putImageData(id,0,0);
    c.strokeStyle=T.trim; c.globalAlpha=.45; c.lineWidth=2; c.strokeRect(5,5,w-10,hh-10); c.lineWidth=1; c.globalAlpha=.3; c.strokeRect(10,10,w-20,hh-20);
    c.globalAlpha=.22; c.fillStyle=T.trim; for(let x=14;x<w-12;x+=8){ c.fillRect(x,7,2,2); c.fillRect(x,hh-9,2,2); } for(let y=14;y<hh-12;y+=8){ c.fillRect(7,y,2,2); c.fillRect(w-9,y,2,2); }
    c.globalAlpha=1; RUG_TEX.needsUpdate=true; }
  NEONL.color.set(T.neonC); lampLight.color.setHex(T.lamp); }
/* ---------- characters ---------- */
let foe=null;
function box(w,hh,d,m){ const x=new THREE.Mesh(new THREE.BoxGeometry(w,hh,d),m); x.castShadow=true; return x; }
// coat fabrics, drawn small like every other texture in the room
const FABRIC={};
function fabric(kind,hex){ const key=kind+hex; if(FABRIC[key]) return FABRIC[key]; const base=new THREE.Color(hex), lite='#'+base.clone().lerp(new THREE.Color(0xffffff),.32).getHexString(), dark='#'+base.clone().multiplyScalar(.62).getHexString(), mid='#'+base.getHexString();
  const cv=makeCanvas(16,16,(c,w,h)=>{ c.fillStyle=mid; c.fillRect(0,0,w,h);
    if(kind==='pin'){ c.fillStyle=lite; for(let x=1;x<w;x+=4) c.fillRect(x,0,1,h); }
    if(kind==='check'){ c.fillStyle=dark; for(let x=0;x<w;x+=8) c.fillRect(x,0,4,h); for(let y=0;y<h;y+=8) c.fillRect(0,y,w,4); c.fillStyle=lite; c.fillRect(0,0,1,h); c.fillRect(0,0,w,1); }
    if(kind==='velvet'){ for(let i=0;i<40;i++){ c.fillStyle=Math.random()<.5?lite:dark; c.globalAlpha=.35; c.fillRect(rnd(w),rnd(h),2,1); } }
    if(kind==='sequin'){ for(let y=0;y<h;y+=2) for(let x=(y/2)%2;x<w;x+=2){ c.fillStyle=Math.random()<.18?'#fff3c0':(Math.random()<.5?lite:mid); c.fillRect(x,y,1,1); } }
    if(kind==='tweed'){ for(let i=0;i<70;i++){ c.fillStyle=Math.random()<.5?lite:dark; c.globalAlpha=.5; c.fillRect(rnd(w),rnd(h),1,1); } } });
  const t=texFromCanvas(cv); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(2,2);
  return FABRIC[key]=new THREE.MeshLambertMaterial({map:t,emissive:kind==='sequin'?new THREE.Color(hex).multiplyScalar(.25):0x000000}); }

/* One rig, a lot of people. Every opponent gets a body, an outfit, a face and the one or two props that make the name make sense. */
let HALO_TEX=null;
function buildFoe(look){
  if(foe){ disposeFoe(foe); foe=null; }
  const g=new THREE.Group(); const L=look;
  const body=L.body||'avg', BODY={slim:[.7,.86,1.85,1],avg:[.82,1.0,1.75,1],stout:[.98,1.22,1.7,1.08],broad:[1.05,1.08,1.8,1.2]}[body]||[.82,1,1.75,1];
  const coat=L.pat?fabric(L.pat,L.coat):lambert(L.coat), coatDk=lambert(new THREE.Color(L.coat).multiplyScalar(.7)), shirt=lambert(L.shirt||0xd8cbb0), tie=lambert(L.tie||0x7a1424),
    skin=lambert(L.skin||0x16100f), dark=lambert(0x0c0909), brass=lambert(0xc9a14a,{emissive:0x2a1a00}), hairM=lambert(L.hairc||0x0c0909), white=lambert(0xe8e0d0,{emissive:0x1a1814}),
    glow=c=>new THREE.MeshBasicMaterial({color:c}), pearl=lambert(0xf2ecdc,{emissive:0x2a2820});
  const add=(par,geo,m,x=0,y=0,z=0,rx=0,ry=0,rz=0)=>{ const o=new THREE.Mesh(geo,m); o.position.set(x,y,z); o.rotation.set(rx,ry,rz); o.castShadow=true; par.add(o); return o; };
  const Bx=(w,h,d)=>new THREE.BoxGeometry(w,h,d), Cy=(a,b,h,s=8)=>new THREE.CylinderGeometry(a,b,h,s), Sp=(r,a=6,b=4)=>new THREE.SphereGeometry(r,a,b);
  const root=new THREE.Group(); g.add(root);
  const outfit=L.outfit||'suit', bare=outfit==='tank', sleeves=outfit==='vest'||outfit==='tank';
  // torso
  const torso=new THREE.Group(); torso.position.y=.95; root.add(torso);
  const [rt,rb,th,sw]=BODY; const FZ=((rt+rb)/2)*.72+.16;
  const chestMat=outfit==='tank'?shirt:coat;
  const chest=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,th,8),chestMat); chest.scale.z=.72; chest.castShadow=true; torso.add(chest);
  if(outfit==='dress'){ const skirt=add(torso,Cy(rb*.95,rb*1.25,.5,10),coat,0,-.95,0); skirt.scale.z=.8; }
  if(outfit==='suit'||outfit==='cape'||outfit==='tux'||outfit==='vest'){
    if(outfit==='tux'){ add(torso,Bx(.36,.95,.08),lambert(0xcfc6b4),0,.3,FZ-.16,-.08); add(torso,Bx(.2,.5,.06),lambert(0xcfc6b4),0,-.35,FZ-.2,-.08); }
    else add(torso,Bx(.62,1.15,.1),shirt,0,.22,FZ-.22+.04,-.08);
    if(L.bowtie||outfit==='tux'){ add(torso,Bx(.26,.09,.05),outfit==='tux'?dark:tie,0,.62,FZ-.12); add(torso,Bx(.08,.1,.08),outfit==='tux'?dark:tie,0,.62,FZ-.1); }
    else if(!L.notie){ add(torso,Bx(.16,.75,.06),tie,0,.18,FZ-.15,-.08); add(torso,Bx(.2,.14,.08),tie,0,.6,FZ-.16); }
    if(outfit!=='vest'){ [-1,1].forEach(s=>add(torso,Bx(.22,1.0,.08),coatDk,s*.3,.28,FZ-.18,-.08,0,s*.32));
      for(let i=0;i<(L.double?6:3);i++){ add(torso,Sp(.035,4,3),brass,L.double?(i%2?.22:-.22):-.4,-.15-Math.floor(L.double?i/2:i)*.2,FZ-.19); }
      add(torso,Bx(.18,.08,.04),lambert(L.square||0xc9a14a),.48,.4,FZ-.22,0,0,-.1); }
    else { for(let i=0;i<4;i++) add(torso,Sp(.035,4,3),brass,0,.3-i*.2,FZ-.12); [-1,1].forEach(s=>add(torso,Bx(.08,1.4,.04),lambert(L.braces||0x5a1a1a),s*.32,.1,FZ-.14)); }
  }
  if(outfit==='turtle'){ add(torso,Cy(.3,.34,.3,8),coat,0,1.0,0); }
  if(outfit==='tank'){ add(torso,Bx(.7,.06,.1),shirt,0,.7,FZ-.12); }
  if(L.flower) { add(torso,Sp(.08,5,4),lambert(L.flower,{emissive:new THREE.Color(L.flower).multiplyScalar(.3)}),.44,.5,FZ-.16); }
  if(L.holster){ [-1,1].forEach(s=>add(torso,Bx(.1,1.3,.04),lambert(0x3a2414),s*.42,.1,FZ-.16,0,0,s*-.25)); add(torso,Bx(.22,.34,.14),lambert(0x2a1a10),-.62,-.1,.36); }
  if(L.tray){ add(torso,Bx(1.0,.08,.5),lambert(0x7a4a24),0,-.62,FZ+.18); for(let i=0;i<6;i++) add(torso,Bx(.12,.08,.2),lambert([0xd8cbb0,0xc0303f,0xf0bd4a][i%3]),-.38+i*.15,-.55,FZ+.18); [-1,1].forEach(s=>add(torso,Bx(.04,1.1,.04),lambert(0x7a4a24),s*.42,.0,FZ+.02,.35)); }
  if(L.chain) add(torso,new THREE.TorusGeometry(.22,.025,4,10,Math.PI),brass,.18,-.35,FZ-.12,0,0,Math.PI);
  const shoulders=add(torso,Bx(2.1*sw*(rt/.82)*.9+.2,.38,.9),bare?skin:(L.cape?dark:coat),0,.78,0);
  const shX=shoulders.geometry.parameters.width/2-.03;
  [-1,1].forEach(s=>add(torso,Sp(.28,6,4),bare?skin:coat,s*shX,.76,0));
  if(L.cape){ const cm=lambert(L.cape); [-1,1].forEach(s=>add(torso,Bx(.9,2.2,.08),cm,s*.55,-.1,-.55,.12,0,s*-.08)); [-1,1].forEach(s=>add(torso,Bx(.5,.7,.06),cm,s*.38,1.15,-.1,-.3,s*.5,0)); }
  if(L.boa){ const bm=lambert(L.boa,{emissive:new THREE.Color(L.boa).multiplyScalar(.2)}); for(let i=0;i<9;i++){ const a=i/8*Math.PI; add(torso,Sp(.17,5,4),bm,Math.cos(a)*.72,.98-Math.sin(a)*.25,.12+Math.sin(a)*.3); } }
  // neck & necklace
  add(torso,Cy(.18,.22,.3,6),skin,0,1.08,0);
  if(outfit!=='dress'&&outfit!=='tank'&&outfit!=='turtle') add(torso,Bx(.5,.14,.4),outfit==='tux'?white:shirt,0,.98,.12);
  if(L.neck==='pearls'||L.neck==='black'){ const pm=L.neck==='black'?lambert(0x1a1a22,{emissive:0x0a0a10}):pearl; for(let i=0;i<11;i++){ const a=(i/10)*Math.PI; add(torso,Sp(.06,5,4),pm,Math.cos(a)*.3,.92-Math.sin(a)*.22,.24+Math.sin(a)*.14); } }
  if(L.neck==='beads'){ for(let i=0;i<14;i++){ const a=(i/13)*Math.PI; add(torso,Sp(.045,4,3),lambert(0xf0bd4a,{emissive:0x3a2400}),Math.cos(a)*.26,.9-Math.sin(a)*.62,.3+Math.sin(a)*.32); } }
  if(L.neck==='ruby'){ add(torso,new THREE.TorusGeometry(.26,.02,4,12,Math.PI),brass,0,.92,.2,0,0,Math.PI); add(torso,new THREE.OctahedronGeometry(.1,0),glow(0xff2a4a),0,.66,.36); }
  if(L.neck==='dice'){ for(let i=0;i<7;i++){ const a=(i/6)*Math.PI; add(torso,Bx(.09,.09,.09),white,Math.cos(a)*.3,.92-Math.sin(a)*.3,.26+Math.sin(a)*.18,i,i,0); } }
  if(L.neck==='scarf'){ const sm=lambert(L.scarf||0xe8e0d0,{emissive:0x111111}); add(torso,Cy(.3,.3,.18,8),sm,0,1.0,.02); add(torso,Bx(.16,.7,.06),sm,.16,.55,FZ-.08,-.1,0,.1); }
  if(L.neck==='cravat'){ add(torso,Sp(.16,6,4),white,0,.82,FZ-.14); }
  // head
  const head=new THREE.Group(); head.position.y=1.5; torso.add(head);
  const HS={round:[.92,1.0,.94],long:[.82,1.18,.9],square:[.98,1.02,.96],egg:[.86,1.12,.92],big:[1.08,1.08,1.02]}[L.headShape||'round'];
  const skull=new THREE.Mesh(new THREE.IcosahedronGeometry(.46,1),skin); skull.scale.set(...HS); skull.castShadow=true; head.add(skull);
  add(head,Bx(L.chin==='double'?.66:L.chin==='narrow'?.42:.56,.26,.5),skin,0,-.3,.05);
  if(L.chin==='double') add(head,Sp(.3,6,4),skin,0,-.46,.12);
  const nose=add(head,Bx(L.nose==='big'?.16:.1,L.nose==='big'?.24:.2,L.nose==='big'?.2:.14),skin,0,-.02,.43);
  if(L.nose==='broken') nose.rotation.z=.35;
  const browM=L.hairc?hairM:dark;
  const brow=L.brow==='sad'?null:add(head,Bx(.62,.07,.1),browM,0,.16,.4);
  if(L.brow==='sad'){ [-1,1].forEach(s=>add(head,Bx(.26,.06,.1),browM,s*.17,.17,.4,0,0,s*.35)); }
  if(L.brow==='angry'&&brow){ brow.visible=false; [-1,1].forEach(s=>add(head,Bx(.28,.08,.1),browM,s*.16,.16,.41,0,0,s*-.4)); }
  [-1,1].forEach(s=>add(head,Bx(.08,.18,.12),skin,s*.42*HS[0]/.92,0,0));
  const eyeM=new THREE.MeshBasicMaterial({color:L.eye}); const eh=L.eyes==='sleepy'?.035:L.eyes==='wide'?.11:L.eyes==='narrow'?.04:.065;
  const eyes=[-1,1].filter(s=>!(L.patch===s)).map(s=>{ const e=new THREE.Mesh(Bx(L.eyes==='wide'?.12:.13,eh,.04),eyeM); e.position.set(s*.17,L.eyes==='sleepy'?.04:.07,.43); head.add(e); return e; });
  if(L.patch){ add(head,Bx(.2,.16,.05),dark,L.patch*.17,.07,.44); add(head,Bx(.9,.03,.05),dark,0,.18,.38,0,0,L.patch*-.25); }
  if(L.glasses){ const gm=lambert(L.glasses==='gold'?0xc9a14a:0x2a2a2a); [-1,1].forEach(s=>add(head,new THREE.TorusGeometry(.1,.02,4,10),gm,s*.17,.07,.46)); add(head,Bx(.12,.02,.02),gm,0,.08,.46); }
  if(L.monocle){ add(head,new THREE.TorusGeometry(.11,.022,4,10),brass,.17,.07,.47); add(head,Cy(.006,.006,.5,3),brass,.26,-.18,.44,0,0,.2); }
  if(L.mustache||L.stache){ const st=L.stache||'plain', hm=L.hairc?hairM:dark;
    if(st==='plain') add(head,Bx(.34,.06,.06),hm,0,-.17,.45);
    if(st==='thin') add(head,Bx(.3,.025,.05),hm,0,-.15,.46);
    if(st==='walrus') add(head,Bx(.44,.12,.1),hm,0,-.19,.45);
    if(st==='handlebar'){ add(head,Bx(.3,.06,.06),hm,0,-.17,.46); [-1,1].forEach(s=>add(head,Bx(.12,.05,.05),hm,s*.2,-.12,.45,0,0,s*.7)); } }
  if(L.beard){ const hm=L.hairc?hairM:dark; if(L.beard==='goatee') add(head,Bx(.16,.2,.08),hm,0,-.42,.3); if(L.beard==='full'){ add(head,Bx(.6,.36,.36),hm,0,-.38,.16); } if(L.beard==='stubble') add(head,Bx(.54,.18,.04),lambert(0x241c18),0,-.34,.3); }
  if(L.grin) add(head,Bx(.24,.05,.04),glow(0xe8e0d0),0,-.26,.45);
  if(L.lips) add(head,Bx(.16,.05,.04),glow(L.lips),0,-.25,.44);
  if(L.scar) add(head,Bx(.03,.26,.03),lambert(0x5a3a3a),-.2,.0,.45,0,0,.3);
  if(L.earrings) [-1,1].forEach(s=>add(head,new THREE.TorusGeometry(.07,.018,4,8),brass,s*.44,-.14,.02,0,Math.PI/2,0));
  // hair
  const H=L.hair, hz=HS[2];
  if(H==='slick'){ const hh=add(head,Sp(.48,8,5),hairM,0,.1,-.04); hh.scale.set(.96,.62,1.02); hh.material=lambert(L.hairc||0x0c0909,{emissive:0x0a0a10}); }
  if(H==='bob'){ const hh=add(head,Sp(.52,8,6),hairM,0,.05,-.06); hh.scale.set(1.02,.95,1.0); [-1,1].forEach(s=>add(head,Bx(.16,.5,.44),hairM,s*.44,-.12,-.02)); add(head,Bx(.8,.14,.12),hairM,0,.28,.32); }
  if(H==='spiky'){ for(let i=0;i<7;i++){ const a=i/6*Math.PI; add(head,new THREE.ConeGeometry(.1,.32,4),hairM,Math.cos(a)*.3,.42+Math.sin(a)*.05,-.05+Math.sin(a)*.12,(Math.random()-.5)*.6,0,(Math.cos(a))*-.6); } }
  if(H==='sides'){ [-1,1].forEach(s=>add(head,Bx(.12,.22,.36),hairM,s*.42,.08,-.08)); }
  if(H==='bun'){ add(head,Sp(.5,8,5),hairM,0,.06,-.06).scale.set(.98,.9,.98); add(head,Sp(.2,6,4),hairM,0,.34,-.42); }
  if(H==='curls'){ for(let i=0;i<10;i++){ const a=i/9*Math.PI*1.2-.1; add(head,Sp(.16,5,4),hairM,Math.cos(a)*.4,.14+Math.sin(a)*.24,-.1); } }
  if(H==='bald') skull.material=lambert(L.skin||0x16100f,{emissive:0x0c0806});
  // hats
  let hat=null; const HAT=L.hat;
  const hatM=lambert(L.hatc||0x0c0909);
  if(HAT==='fedora'){ hat=new THREE.Group(); add(hat,Cy(.82,.86,.05,12),hatM); add(hat,Cy(.4,.48,.48,8),hatM,0,.26,0); add(hat,Bx(.06,.1,.5),lambert(0x050404),0,.5,0); add(hat,Cy(.49,.49,.11,8),lambert(L.band||0x7a1424),0,.08,0); hat.rotation.z=L.tilt||0; }
  if(HAT==='bowler'){ hat=new THREE.Group(); add(hat,Cy(.64,.64,.05,12),hatM); add(hat,new THREE.SphereGeometry(.47,10,5,0,Math.PI*2,0,Math.PI/2),hatM); }
  if(HAT==='cap'){ hat=new THREE.Group(); const cm=lambert(L.hatc||0x3a3428); add(hat,Cy(.52,.5,.24,10),cm,0,.1,0); add(hat,Cy(.56,.52,.08,10),cm,0,.24,0); add(hat,Bx(.6,.04,.36),lambert(0x2a251d),0,0,.48); }
  if(HAT==='cloche'){ hat=new THREE.Group(); add(hat,new THREE.SphereGeometry(.54,10,6,0,Math.PI*2,0,Math.PI*.55),lambert(L.hatc||0x2a1420),0,-.12,0); add(hat,Bx(.24,.12,.06),lambert(0xc9a14a),.32,.12,.36); }
  if(HAT==='top'){ hat=new THREE.Group(); add(hat,Cy(.66,.66,.05,12),hatM); add(hat,Cy(.42,.4,.9,10),hatM,0,.47,0); add(hat,Cy(.43,.43,.12,10),lambert(L.band||0x3a1a1a),0,.1,0); }
  if(HAT==='turban'){ hat=new THREE.Group(); const tm=lambert(L.hatc||0x5a1a6a,{emissive:0x100418}); const t1=add(hat,new THREE.TorusGeometry(.4,.16,6,12),tm,0,.02,0,Math.PI/2); add(hat,Sp(.38,8,5),tm,0,.16,0).scale.set(1,.7,1); add(hat,new THREE.OctahedronGeometry(.09,0),glow(0x6af0ff),0,.12,.52); add(hat,Bx(.03,.3,.03),lambert(0xf0e0c0),.06,.42,.42,-.3); }
  if(HAT==='pillbox'){ hat=new THREE.Group(); add(hat,Cy(.3,.3,.22,10),lambert(L.hatc||0xc0303f),.1,.06,0,0,0,-.15); add(hat,Bx(.06,.24,.06),brass,.36,-.06,0); }
  if(HAT==='visor'){ hat=new THREE.Group(); add(hat,new THREE.TorusGeometry(.46,.03,4,14),dark,0,-.05,0,Math.PI/2); const v=add(hat,new THREE.CylinderGeometry(.5,.62,.06,12,1,true,-.9,1.8),new THREE.MeshLambertMaterial({color:0x2a8a5a,transparent:true,opacity:.75,emissive:0x0a2a1a,side:THREE.DoubleSide}),0,-.06,.08,.25); }
  if(HAT==='tiara'){ hat=new THREE.Group(); add(hat,new THREE.TorusGeometry(.4,.03,4,12,Math.PI),brass,0,-.08,.06,-.3,0,0); for(let i=0;i<5;i++){ const a=.4+i/4*(Math.PI-.8); add(hat,new THREE.ConeGeometry(.04,.16+(i===2?.12:0),4),brass,Math.cos(a)*.4,.02+(i===2?.06:0),Math.sin(a)*.12+.12,-.3); } add(hat,new THREE.OctahedronGeometry(.06,0),glow(0xc070ff),0,.16,.2); }
  if(HAT==='veil'){ hat=new THREE.Group(); add(hat,Cy(.5,.5,.04,12),hatM); add(hat,Cy(.3,.34,.2,10),hatM,0,.12,0); const vm=new THREE.MeshLambertMaterial({color:0x3a3440,transparent:true,opacity:.45,side:THREE.DoubleSide}); const vv=new THREE.Mesh(new THREE.CylinderGeometry(.52,.56,.62,12,1,true,-1.2,2.4),vm); vv.position.set(0,-.3,0); hat.add(vv); }
  if(HAT==='headband'){ hat=new THREE.Group(); add(hat,new THREE.TorusGeometry(.47,.035,4,14),lambert(L.band||0xc9a14a,{emissive:0x2a1a00}),0,-.12,0,Math.PI/2+.12); add(hat,new THREE.ConeGeometry(.07,.6,4),lambert(L.feather||0xf0e8f0,{emissive:0x222222}),.3,.24,-.1,0,0,-.35); add(hat,Sp(.06,5,4),glow(0x9af0ff),.42,-.08,.22); }
  if(HAT==='beret'){ hat=new THREE.Group(); add(hat,Sp(.52,8,4),lambert(L.hatc||0x3a1a2a),.06,0,0).scale.set(1,.32,1); }
  if(hat){ hat.position.y=.38; hat.traverse(o=>{ if(o.isMesh) o.castShadow=true; }); head.add(hat); }
  // arms: shoulder → elbow → hand
  const sleeveM=bare?skin:outfit==='vest'?shirt:coat, handM=L.gloves?lambert(L.gloves):skin;
  const armW=(body==='broad'||body==='stout')?.42:.36;
  const mkArm=s=>{ const sh=new THREE.Group(); sh.position.set(s*shX,.72,0); torso.add(sh);
    const up=box(armW,.9,armW,sleeveM); up.position.y=-.45; sh.add(up);
    const el=new THREE.Group(); el.position.y=-.88; sh.add(el);
    const fo=box(armW-.04,.82,armW-.04,L.gloves&&L.longGloves?handM:sleeveM); fo.position.y=-.41; el.add(fo);
    if(!bare&&!L.longGloves){ const cuff=box(armW-.02,.1,armW-.02,shirt); cuff.position.y=-.8; el.add(cuff); }
    const hand=new THREE.Group(); hand.position.y=-.86; el.add(hand);
    const palm=box(.32,.13,.36,handM); palm.position.set(0,-.05,.05); palm.rotation.x=Math.PI/2; hand.add(palm);
    const fingers=[]; for(let i=0;i<4;i++){ const f=new THREE.Group(); f.position.set(-.11+i*.075,-.08,.22); f.add(box(.06,.06,.2,handM)); hand.add(f); fingers.push(f); }
    if(L.rings) add(hand,Bx(.08,.08,.08),brass,.1,-.06,.24);
    return {sh,el,hand,fingers}; };
  const armL=mkArm(-1), armR=mkArm(1);
  if(L.knuckles) for(let i=0;i<4;i++) add(armL.hand,new THREE.TorusGeometry(.05,.022,4,8),brass,-.11+i*.075,-.1,.3,0,Math.PI/2,0);
  if(L.hold==='ledger'){ add(armL.hand,Bx(.5,.08,.66),lambert(0x1f4a33),0,-.1,.3); add(armL.hand,Bx(.46,.06,.62),white,0,-.04,.3); }
  if(L.hold==='ball'){ add(armL.hand,Sp(.3,10,8),new THREE.MeshLambertMaterial({color:0x9ae8ff,emissive:0x2a5a7a,transparent:true,opacity:.85}),0,-.05,.36); }
  if(L.hold==='holder'){ const h2=add(head,Bx(.03,.03,.55),dark,-.14,-.25,.66,0,.4,0); add(head,Bx(.05,.05,.05),glow(0xff7a2a),-.25,-.25,.92); }
  if(L.hold==='glass'){ add(armL.hand,Cy(.14,.11,.3,8),new THREE.MeshLambertMaterial({color:0xd08a20,emissive:0x5a2a00,transparent:true,opacity:.85}),0,-.1,.3); }
  if(L.pencil) add(head,Bx(.03,.03,.36),lambert(0xf0bd4a),.43,.12,.0,0,0,.2);
  // dice cup in right hand
  const leather=lambert(0x3a1a10);
  const cup=new THREE.Group(); const cupB=new THREE.Mesh(new THREE.CylinderGeometry(.3,.25,.62,10),leather); cupB.castShadow=true; cup.add(cupB);
  const rim=new THREE.Mesh(new THREE.CylinderGeometry(.315,.315,.06,10),brass); rim.position.y=.3; cup.add(rim);
  const rim2=new THREE.Mesh(new THREE.CylinderGeometry(.27,.27,.05,10),brass); rim2.position.y=-.29; cup.add(rim2);
  const mouth=new THREE.Object3D(); mouth.position.y=.36; cup.add(mouth);
  cup.position.set(0,-.14,.28); armR.hand.add(cup);
  let cigarTip=null;
  if(L.cigar){ const cg=box(.09,.09,.5,lambert(0x5a3a1a)); cg.position.set(.14,-.2,.56); cg.rotation.y=-.35; head.add(cg); cigarTip=box(.1,.1,.06,new THREE.MeshBasicMaterial({color:0xff5a1a})); cigarTip.castShadow=false; cigarTip.position.set(.23,-.2,.79); head.add(cigarTip); }
  if(L.cig){ const cg=box(.035,.035,.3,white); cg.position.set(.12,-.24,.56); cg.rotation.y=-.3; head.add(cg); cigarTip=box(.05,.05,.04,new THREE.MeshBasicMaterial({color:0xff6a1a})); cigarTip.castShadow=false; cigarTip.position.set(.16,-.24,.71); head.add(cigarTip); }
  if(L.toothpick) add(head,Bx(.02,.02,.3),lambert(0xd8b070),.12,-.26,.56,0,-.5,.2);
  // the twins (and the cousins) sit with them
  const twinG=[];
  if(L.twins){ const n=L.twins; for(let k=0;k<n;k++){ const s=k%2?1:-1, off=(1.55+Math.floor(k/2)*1.25)*s;
      const tw=new THREE.Group(); twinG.push(tw); tw.position.set(off,-.08-(k>1?.12:0),-.25-(k>1?.35:0)); root.add(tw);
      const tch=new THREE.Mesh(new THREE.CylinderGeometry(rt*.9,rb*.9,th*.9,8),coat); tch.scale.z=.72; tch.position.y=.95; tch.castShadow=true; tw.add(tch);
      add(tw,Bx(.5,1.0,.1),shirt,0,1.12,.52); add(tw,Bx(.14,.6,.06),tie,0,1.1,.56); add(tw,Bx(1.8,.34,.8),coat,0,1.66,0);
      const th2=new THREE.Group(); th2.position.y=2.32; tw.add(th2); const sk2=new THREE.Mesh(new THREE.IcosahedronGeometry(.42,1),skin); sk2.scale.set(.9,1.04,.94); th2.add(sk2);
      [-1,1].forEach(q=>{ const e=new THREE.Mesh(Bx(.12,.06,.04),eyeM); e.position.set(q*.15,.06,.4); th2.add(e); eyes.push(e); });
      if(k<2){ const bh=new THREE.Group(); add(bh,Cy(.58,.58,.05,12),hatM); add(bh,new THREE.SphereGeometry(.43,10,5,0,Math.PI*2,0,Math.PI/2),hatM); bh.position.y=.34; th2.add(bh); }
      else { const ch=new THREE.Group(); const cm=lambert(0x3a3428); add(ch,Cy(.48,.46,.22,10),cm,0,.1,0); add(ch,Bx(.54,.04,.32),cm,0,0,.44); ch.position.y=.34; th2.add(ch); }
      [-1,1].forEach(q=>{
        if(k===0&&q===s){ // the other twin's cup arm: a shoulder pivot so it can scoop, raise, shake and tip like the first twin's
          const sh=new THREE.Group(); sh.position.set(q*.86,1.66,-.18); sh.rotation.x=-.5; tw.add(sh);
          const a=box(.32,1.3,.32,coat); a.position.y=-.65; sh.add(a);
          const c2=cup.clone(true); c2.position.set(0,-1.38,.12); c2.rotation.x=.5; c2.scale.setScalar(.9); sh.add(c2);
          tw.userData={sh,cup:c2,mouth:c2.children.find(c=>c.isObject3D&&!c.isMesh)};
        } else { const a=box(.32,1.3,.32,coat); a.position.set(q*.86,1.1,.12); a.rotation.x=-.5; tw.add(a); } }); } }
  // a soft key light rides with them, so their clothes and props read against the dark room
  const key=new THREE.PointLight(0xffd8a8,1.5,6.5,1.5); key.position.set(.6,3.7,2.4); root.add(key); const fill=new THREE.PointLight(L.eye||0xffffff,.25,3,2); fill.position.set(0,3.1,1.1); root.add(fill);
  { const rim=new THREE.PointLight(0xa8c4ff,1.1,5.5,1.6); rim.position.set(0,3.9,-1.7); root.add(rim); const rim2=new THREE.PointLight(L.eye||0xffd8a8,.55,4,1.8); rim2.position.set(-1.6,3.2,-1.2); root.add(rim2); }
  // a warm glow on the wall behind them, so even a black coat reads against a dark room (stronger for owners)
  { if(!HALO_TEX){ const cv=makeCanvas(64,64,x=>{ const gr=x.createRadialGradient(32,32,2,32,32,32); gr.addColorStop(0,'rgba(255,220,170,1)'); gr.addColorStop(.45,'rgba(255,170,110,.45)'); gr.addColorStop(1,'rgba(255,140,90,0)'); x.fillStyle=gr; x.fillRect(0,0,64,64); }); HALO_TEX=texFromCanvas(cv,false); }
    const hm=new THREE.Mesh(new THREE.PlaneGeometry(5.2,4.6),new THREE.MeshBasicMaterial({map:HALO_TEX,transparent:true,opacity:F&&F.kind==='B'?.42:.24,blending:THREE.AdditiveBlending,depthWrite:false})); hm.position.set(0,3.3,-1.9); hm.userData.noFit=true; root.add(hm); }
  if(L.twins===1) root.children.forEach(c=>c.position.x+=.775); // a pair sits side by side, centered
  const S=1+((L.scale||1)-1)*.55; g.scale.setScalar(S);
  g.userData={twins:twinG,root,torso,head,eyes,eyeM,eyeColor:new THREE.Color(L.eye),hat,armL,armR,cup,mouth,cigarTip,S,
    seatY:-.55, standY:.25, homeZ:-4.55-(S-1)*1.58, lean:0, lookX:0, mode:'idle', breath:1, tapT:0, laugh:0, slump:0, hunch:L.hunch||0, jitter:L.jitter||0, noBlink:!!L.noBlink};
  SCN.add(g); foe=g;
  setRestPose(1);
  return g;
}
// who looks like what. Layered over each opponent's base colors.
const LOOKX={
  'Mopey Earl':   {body:'stout',outfit:'vest',braces:0x3a2a1a,notie:true,hat:'cap',hatc:0x4a3f30,eyes:'sleepy',brow:'sad',beard:'stubble',hunch:.6,hold:'glass'},
  'Twitchy Dee':  {body:'slim',outfit:'vest',braces:0x7a1424,hair:'spiky',hairc:0x2a1a10,eyes:'wide',toothpick:true,jitter:1,bowtie:true,tie:0x2a6a8a},
  'Old Gus':      {body:'avg',outfit:'suit',pat:'tweed',hat:'bowler',hair:'sides',hairc:0xb8b0a0,stache:'walrus',glasses:'gold',hunch:.45,headShape:'long'},
  'Tipsy Tina':{body:'slim',outfit:'dress',pat:'sequin',hat:'headband',band:0xc9a14a,feather:0xff9ac0,hair:'bob',hairc:0x1a0e0a,neck:'beads',lips:0xff4a6a,hold:'glass'},
  'Lefty':        {body:'slim',outfit:'suit',pat:'pin',hat:'fedora',tilt:-.15,stache:'thin',patch:1,toothpick:true},
  'Dutch':        {body:'stout',outfit:'vest',pat:'check',braces:0x2a1a10,hat:'fedora',beard:'full',hairc:0x5a3a1a,chain:true,rings:true,nose:'big'},
  'Knuckles':     {body:'broad',outfit:'tank',shirt:0xe0d8c8,hat:'cap',nose:'broken',scar:true,knuckles:true,brow:'angry',headShape:'square'},
  'Pearl':        {body:'slim',outfit:'dress',hat:'none',hair:'bob',hairc:0xf2ecdc,neck:'pearls',gloves:0xf2ecdc,longGloves:true,hold:'holder',lips:0xff3a5a,noBlink:true},
  'The Twins':    {body:'slim',outfit:'suit',hat:'bowler',twins:1,stache:'thin'},
  'Big Sal':      {body:'stout',outfit:'suit',pat:'pin',double:true,chin:'double',stache:'walrus',rings:true,chain:true,headShape:'big',flower:0xc0303f},
  'Silky Vince': {body:'slim',outfit:'suit',pat:'velvet',hat:'none',hair:'slick',hairc:0x0a0a12,stache:'thin',neck:'scarf',scarf:0xf0e8e0,flower:0xf0f0f0,notie:true},
  'Madame Ora':   {body:'avg',outfit:'dress',hat:'turban',hatc:0x5a1a6a,earrings:true,neck:'beads',hold:'ball',boa:0x6a2a7a},
  'Dot':{body:'slim',outfit:'dress',hat:'pillbox',hatc:0xc0303f,hair:'curls',hairc:0x3a1a0a,tray:true,cig:true,lips:0xff4a5a},
  'The Professor':{body:'slim',outfit:'suit',pat:'tweed',hat:'bowler',glasses:'round',beard:'goatee',bowtie:true,headShape:'egg',pencil:true},
  'Vito':         {body:'broad',outfit:'suit',pat:'pin',hat:'fedora',tilt:.12,grin:true,scar:true,toothpick:true,double:true},
  'Mr. Velvet':   {body:'avg',outfit:'suit',pat:'velvet',hat:'top',band:0x5a1a2a,monocle:true,neck:'cravat',notie:true,stache:'handlebar',flower:0xff6a9a,gloves:0xf0eadc},
  'Lady Chance':  {body:'slim',outfit:'dress',pat:'sequin',hat:'headband',band:0xf0bd4a,feather:0x1a1a1a,hair:'bob',hairc:0x0a0a0a,neck:'dice',gloves:0x1a1a1a,longGloves:true,lips:0xff3a5a},
  'The Doubles':{body:'slim',outfit:'suit',hat:'bowler',twins:1,stache:'thin'},
  'The Countess': {body:'slim',outfit:'dress',pat:'velvet',hat:'tiara',hair:'bun',hairc:0x0a0a10,cape:0x3a0a14,neck:'black',gloves:0x0a0a0a,longGloves:true,lips:0xc01030,headShape:'long'},
  'Specs':{body:'slim',outfit:'vest',braces:0x2a2a2a,hat:'visor',glasses:'round',hair:'sides',hairc:0x3a3a3a,pencil:true,hold:'ledger',stache:'thin',headShape:'egg'},
  'Miss Ruby':    {body:'slim',outfit:'dress',pat:'velvet',hat:'none',hair:'curls',hairc:0x7a1a1a,neck:'ruby',hold:'holder',lips:0xff2a3a,earrings:true,gloves:0x8a1a2a,longGloves:true},
  'Tony Twice':{body:'avg',outfit:'suit',pat:'pin',double:true,hat:'fedora',tilt:-.1,stache:'thin',toothpick:true,chain:true,rings:true},
  'Inky Lou':   {body:'avg',outfit:'vest',braces:0x1a2a3a,hat:'cap',hatc:0x2a2a30,glasses:'round',pencil:true,hold:'ledger',beard:'stubble'},
  'The Widow':    {coat:0x221c26,body:'slim',outfit:'dress',hat:'veil',neck:'black',gloves:0x0a0a0a,longGloves:true,hold:'holder',headShape:'long',noBlink:true},
  'Bruno':        {coat:0x3a3630,body:'broad',outfit:'tank',shirt:0x2a2a2a,hat:'none',hair:'bald',nose:'broken',brow:'angry',chin:'double',headShape:'square',rings:true},
  'The Enforcer': {coat:0x2e2a26,body:'broad',outfit:'turtle',hat:'cap',hatc:0x1a1a1a,holster:true,scar:true,brow:'angry',knuckles:true,patch:-1,headShape:'square'},
  'The Ledger':   {coat:0x2a2a34,body:'avg',outfit:'suit',hat:'top',band:0x1a1a1a,glasses:'gold',hold:'ledger',cape:0x0e0e12,headShape:'long',stache:'thin',noBlink:true},
  'Sleepy Joe':   {body:'stout',outfit:'vest',braces:0x5a4a3a,notie:true,hat:'cap',hatc:0x5a5048,eyes:'sleepy',brow:'sad',hair:'sides',hairc:0x8a7a6a,hunch:.7,hold:'glass',nose:'big'},
  'Kitty': {body:'slim',outfit:'dress',pat:'check',hat:'cloche',hatc:0x8a4a20,hair:'bob',hairc:0xc0602a,neck:'beads',lips:0xff7a4a,earrings:true,jitter:.4},
  'Lenny':{body:'broad',outfit:'suit',pat:'check',hat:'fedora',tilt:.2,grin:true,cigar:true,eyes:'wide',chain:true,flower:0xffd27a,double:true},
  'Mama Rosa':    {body:'stout',outfit:'dress',pat:'check',hat:'none',hair:'bun',hairc:0x4a4a4a,chin:'double',neck:'pearls',earrings:true,lips:0xc0303f,glasses:'round',headShape:'big',hold:'glass'},
  'Dapper Dan':   {body:'slim',outfit:'tux',hat:'top',band:0x2a3a5a,stache:'thin',bowtie:true,tie:0x1a1a1a,gloves:0xf0eadc,flower:0xf0f0f0,monocle:true},
  'Miss Fortune': {body:'slim',outfit:'dress',pat:'sequin',hat:'turban',hatc:0x2a3a8a,earrings:true,neck:'dice',hold:'ball',lips:0xb04aff,noBlink:true,boa:0x3a1a6a},
  'The Magpie':   {body:'slim',outfit:'cape',cape:0x0a0a10,hat:'cloche',hatc:0x0a0a0a,hair:'bob',hairc:0x0a0a0a,neck:'ruby',rings:true,gloves:0x1a1a1a,longGloves:true,lips:0xe0e0f0,eyes:'narrow'},
  'Zambini':{body:'avg',outfit:'tux',hat:'top',band:0x7a1424,cape:0x5a0a1a,stache:'handlebar',beard:'goatee',gloves:0xf0eadc,eyes:'wide',brow:'angry',headShape:'long',rings:true},
  'Officer Kelly':{body:'stout',outfit:'turtle',hat:'cap',hatc:0x1a2a4a,stache:'walrus',nose:'big',holster:true,chin:'double',brow:'angry',hairc:0xc0602a},
  'Lucky Lucy':   {body:'slim',outfit:'dress',pat:'sequin',hat:'headband',band:0x2a8a4a,feather:0xa0ffb0,hair:'curls',hairc:0xe8c060,neck:'beads',lips:0xff4a6a,hold:'holder',earrings:true},
  'Doc': {body:'slim',outfit:'vest',braces:0x3a3a3a,shirt:0xe8e4dc,hat:'none',hair:'bald',glasses:'round',beard:'goatee',hunch:.4,headShape:'egg',pencil:true,gloves:0xe8e4dc},
  'The Chief':{body:'broad',outfit:'suit',pat:'pin',hat:'cap',hatc:0x1a2236,stache:'walrus',chin:'double',chain:true,rings:true,cigar:true,brow:'angry',headShape:'square',flower:0x2a4a8a},
  'Nickels':{body:'avg',outfit:'vest',braces:0x5a2a1a,hat:'cap',hatc:0x4a3a2a,beard:'stubble',nose:'big',grin:true,toothpick:true},
  'Granny Mae':   {body:'stout',outfit:'dress',pat:'check',hat:'none',hair:'bun',hairc:0xd8d4cc,glasses:'round',neck:'pearls',hunch:.5,hold:'glass',headShape:'big'},
  'Slim':     {body:'slim',outfit:'suit',pat:'pin',hat:'fedora',tilt:.18,toothpick:true,eyes:'narrow',chin:'narrow',headShape:'long'},
  'Hattie':{body:'broad',outfit:'tank',shirt:0xe0d8c8,hat:'headband',band:0xc0303f,feather:0xc0303f,hair:'curls',hairc:0x7a2a1a,lips:0xc0303f,knuckles:true,brow:'angry'},
  'The Kid':      {body:'slim',outfit:'vest',braces:0x2a4a6a,hat:'cap',hatc:0x6a3a1a,hair:'spiky',hairc:0xc0802a,eyes:'wide',jitter:.6,bowtie:true,tie:0xc0303f},
  'Smiley':{body:'avg',outfit:'tux',hat:'top',band:0xffd27a,grin:true,eyes:'wide',monocle:true,gloves:0xf0eadc,flower:0xffd27a,noBlink:true},
  'Fingers':{body:'slim',outfit:'suit',pat:'check',hat:'fedora',tilt:-.12,gloves:0x1a1a1a,rings:true,stache:'thin',eyes:'narrow'},
  'Velma':        {body:'slim',outfit:'dress',pat:'sequin',hat:'headband',band:0xffd27a,feather:0xff9ac0,hair:'bob',hairc:0x2a0e0a,neck:'beads',lips:0xff4a8a,earrings:true,gloves:0xf0eadc,longGloves:true},
  'Rocco':        {body:'broad',outfit:'suit',pat:'pin',hat:'fedora',tilt:.08,scar:true,nose:'broken',brow:'angry',chin:'double',knuckles:true,rings:true},
  'Sister Grace': {body:'slim',outfit:'dress',hat:'veil',neck:'black',glasses:'round',gloves:0xf0eadc,hold:'ball',noBlink:true},
  'Iron Pete': {body:'broad',outfit:'turtle',hat:'cap',hatc:0x2a2a2a,chin:'double',scar:true,brow:'angry',nose:'broken',headShape:'square',knuckles:true},
  'Madame Noir':  {body:'slim',outfit:'cape',cape:0x0a0a12,hat:'veil',neck:'ruby',gloves:0x0a0a0a,longGloves:true,lips:0x8a0a2a,hold:'holder',eyes:'narrow'},
  'Benny Blue':   {body:'avg',outfit:'vest',braces:0x1a2a5a,hat:'fedora',tilt:-.2,stache:'thin',bowtie:true,tie:0x2a4a9a,eyes:'sleepy',cig:true},
  'The Judge': {body:'stout',outfit:'cape',cape:0x0e0e10,hat:'none',hair:'sides',hairc:0xd0ccc4,glasses:'gold',brow:'angry',chin:'double',headShape:'big',stache:'walrus'},
  'Lola': {body:'slim',outfit:'dress',pat:'sequin',hat:'headband',band:0xe0f0ff,feather:0xffffff,hair:'bob',hairc:0xf0e0b0,neck:'pearls',rings:true,earrings:true,lips:0xff3a5a,hold:'holder'},
  'Mack':  {body:'avg',outfit:'suit',pat:'pin',hat:'fedora',tilt:.1,grin:true,scar:true,toothpick:true,chain:true,stache:'thin'},
  'The Undertaker':{body:'slim',outfit:'tux',hat:'top',band:0x1a1a1a,cape:0x0a0a0c,headShape:'long',chin:'narrow',brow:'sad',gloves:0x1a1a1a,noBlink:true},
  'Dolores':{body:'stout',outfit:'dress',pat:'velvet',hat:'tiara',hair:'curls',hairc:0xe8e0d0,neck:'pearls',rings:true,earrings:true,lips:0xc01060,gloves:0xf0eadc,longGloves:true,boa:0xf0e8f0},
  'The House':    {coat:0x1e1a20,body:'stout',outfit:'tux',hat:'top',band:0xc9a14a,monocle:true,gloves:0xf0eadc,cape:0x1a0a10,rings:true,chin:'double',stache:'handlebar',headShape:'big'},
};
// arm poses: [shoulderX, shoulderZ, elbowX, handX]
const POSE={ restL:[-.62,.12,-1.0,.55], restR:[-.55,-.12,-1.05,.55], hang:[.08,0,-.15,0], swingA:[.4,0,-.3,0], swingB:[-.4,0,-.3,0],
  raise:[-1.45,-.1,-1.0,.6], tip:[-1.25,-.05,-.55,-1.6], slamUp:[-2.4,0,-.4,0], slamDn:[-.75,0,-.85,.6] };
function setArm(arm,p){ arm.sh.rotation.x=p[0]; arm.sh.rotation.z=p[1]; arm.el.rotation.x=p[2]; arm.hand.rotation.x=p[3]; }
function getArm(arm){ return [arm.sh.rotation.x,arm.sh.rotation.z,arm.el.rotation.x,arm.hand.rotation.x]; }
function poseArm(arm,p,ms,e=ease.inout){ const s=getArm(arm); return anim(ms,k=>{ const q=e(k); setArm(arm,s.map((v,i)=>lerp(v,p[i],q))); }); }
function setRestPose(){ const u=foe.userData; setArm(u.armL,POSE.restL); setArm(u.armR,POSE.restR); }
frameFns.add((dt,t)=>{ if(!foe) return; const u=foe.userData;
  const br=Math.sin(t*1.6)*.025*u.breath; u.torso.scale.set(1+br,1+br*.6,1+br);
  const lx=u.lookX; u.head.rotation.y+= ((Math.max(-.5,Math.min(.5,lx*.12))+Math.sin(t*.5)*.08) - u.head.rotation.y)*Math.min(1,dt*3);
  u.head.rotation.x= -.32 + u.slump*.75 + u.hunch*.28 + Math.sin(t*.9)*.03 - u.laugh*Math.abs(Math.sin(t*14))*.12;
  u.torso.rotation.x= u.lean*.22 + u.slump*.25 + u.hunch*.18; u.root.position.z= u.lean*.35; if(u.jitter){ u.torso.position.x=(Math.random()<.25?(Math.random()-.5)*.05:u.torso.position.x*.6); u.head.rotation.y+=(Math.random()-.5)*.08; }
  u.torso.position.y=.95 + u.laugh*Math.abs(Math.sin(t*14))*.06;
  if(u.mode==='idle'){ u.tapT+=dt; u.armL.fingers.forEach((f,i)=>{ const ph=(u.tapT*7 - i*.6); f.rotation.x= Math.sin(t*.35)>.3 ? Math.max(0,Math.sin(ph))*-.6 : 0; });
    if(Math.sin(t*.35)>.3 && Math.floor(u.tapT*7/Math.PI*.5)!==u._lastTap){ u._lastTap=Math.floor(u.tapT*7/Math.PI*.5); } }
  if(u.cigarTip) u.cigarTip.material.color.setRGB(1,.3+Math.sin(t*3)*.15,.05);
  if(u.eyesOn!==false && !u.noBlink && Math.random()<.005){ u.eyes.forEach(e=>e.scale.y=.1); setTimeout(()=>u.eyes.forEach(e=>e.scale.y=1),110); } });
async function foeWalkIn(){
  const g=foe, u=g.userData; u.mode='walk';
  const side=Math.random()<.5?-1:1; g.position.set(side*10,u.standY,u.homeZ-.4); g.rotation.y=-side*Math.PI/2;
  setArm(u.armL,POSE.hang); setArm(u.armR,POSE.hang);
  let lastStep=0;
  await anim(1700,k=>{ const e=ease.out(k); g.position.x=side*10*(1-e); const ph=k*14; g.position.y=u.standY+Math.abs(Math.sin(ph))*.08;
    g.rotation.z=Math.sin(ph)*.03; setArm(u.armL,Math.sin(ph)>0?POSE.swingA:POSE.swingB); setArm(u.armR,Math.sin(ph)>0?POSE.swingB:POSE.swingA);
    const st=Math.floor(ph/Math.PI); if(st!==lastStep && k<.92){ lastStep=st; SFX.step(); } });
  g.rotation.z=0; const r0=g.rotation.y; await anim(320,k=>{ g.rotation.y=lerp(r0,0,ease.inout(k)); g.position.z=lerp(u.homeZ-.4,u.homeZ,k); });
  // sit
  SFX.step();
  await Promise.all([ anim(420,k=>{ g.position.y=lerp(u.standY,u.seatY,ease.back(k)); }), poseArm(u.armL,POSE.restL,480), poseArm(u.armR,POSE.restR,480) ]);
  SFX.tok(0,.8); u.mode='idle';
}
async function foeWalkOut(){
  const g=foe, u=g.userData; if(!g) return; u.mode='walk';
  // eyes go out like a bulb
  u.eyesOn=false; for(const v of [.2,1,.1,.6,0]){ u.eyeM.color.copy(u.eyeColor).multiplyScalar(v); await sleep(80); }
  await anim(500,k=>u.slump=ease.out(k));
  if(u.hat){ const hat=u.hat; const wp=new THREE.Vector3(); hat.getWorldPosition(wp); SCN.attach(hat); u.hat=null;
    debris.push({o:hat,v:new THREE.Vector3(R_(-1.2,1.2),2.4,3.2),w:new THREE.Vector3(R_(-4,-2),R_(-3,3),R_(-2,2)),floor:.05*u.S,onBounce:()=>SFX.hat(),settle:o=>{ o.rotation.x=0; o.rotation.z=(Math.random()-.5)*.2; }}); }
  await sleep(500);
  await Promise.all([ anim(380,k=>{ g.position.y=lerp(u.seatY,u.standY,ease.out(k)); u.slump=1-k*.6; }), poseArm(u.armL,POSE.hang,400), poseArm(u.armR,POSE.hang,400) ]);
  const side=Math.random()<.5?-1:1; await anim(320,k=>{ g.rotation.y=lerp(0,side*Math.PI/2+(side>0?0:0),ease.inout(k)); g.position.z=lerp(u.homeZ,u.homeZ-.5,k); });
  let lastStep=0; const x0=g.position.x;
  await anim(1500,k=>{ g.position.x=x0+side*10*ease.in(k*.9+.1*k); const ph=k*13; g.position.y=u.standY+Math.abs(Math.sin(ph))*.07; setArm(u.armL,Math.sin(ph)>0?POSE.swingA:POSE.swingB); setArm(u.armR,Math.sin(ph)>0?POSE.swingB:POSE.swingA);
    const st=Math.floor(ph/Math.PI); if(st!==lastStep){ lastStep=st; SFX.step(); } });
  SCN.remove(g); if(foe===g) foe=null;
}
function foeLean(v,ms=300){ if(!foe) return Promise.resolve(); const u=foe.userData, s=u.lean; return anim(ms,k=>u.lean=lerp(s,v,ease.out(k))); }
async function foeRecoil(){ if(!foe) return; const u=foe.userData; u.eyeM.color.copy(u.eyeColor).multiplyScalar(2); const hx=u.head.rotation.x;
  await Promise.all([foeLean(-.9,110), poseArm(u.armL,[-.3,.3,-.6,0],120), poseArm(u.armR,[-.3,-.3,-.6,0],120)]);
  await Promise.all([foeLean(0,600), poseArm(u.armL,POSE.restL,600), poseArm(u.armR,POSE.restR,600)]); u.eyeM.color.copy(u.eyeColor); }
async function foeLaugh(){ if(!foe) return; const u=foe.userData; u.eyeM.color.copy(u.eyeColor).multiplyScalar(1.6); await foeLean(.6,250); await anim(1100,k=>u.laugh=Math.sin(k*Math.PI)); u.laugh=0; await foeLean(0,500); u.eyeM.color.copy(u.eyeColor); }
async function foeSlam(onImpact){ if(!foe) return; const u=foe.userData; u.mode='act';
  await Promise.all([poseArm(u.armL,POSE.slamUp,380), poseArm(u.armR,POSE.slamUp,380), foeLean(-.3,380)]);
  await Promise.all([poseArm(u.armL,POSE.slamDn,120,ease.in), poseArm(u.armR,POSE.slamDn,120,ease.in), foeLean(.7,120)]);
  SFX.slam(); shake(.45); onImpact&&onImpact();
  await sleep(350); await Promise.all([poseArm(u.armL,POSE.restL,500), poseArm(u.armR,POSE.restR,500), foeLean(0,500)]); u.mode='idle'; }
// Two Heads: the other twin throws a full set from their own seat, and the pair keep the lower total
async function secondTwin(simA,shownA,pre){ const simB=pre||aiRound(F.opp.bag,F.opp.t), tw=foe&&foe.userData.twins&&foe.userData.twins[0];
  msg(`The other twin throws. They keep the lower total.`);
  const myF=F, B=F.opp.bag.map(t=>makeDie3D(newDie(t))); B.forEach(o=>{ o.mesh.visible=false; SCN.add(o.mesh); }); let shownB=0;
  const sit=()=>{ $('#sitting').innerHTML=`<span>Twins</span><b>${shownA}</b><em>&nbsp;/&nbsp;</em><b>${shownB}</b>`; };
  for(const th of simB.throws){ if(F!==myF) return simA; const list=th.left.map(i=>B[i]); let from;
    if(tw&&tw.userData.sh&&GL_OK){ if(th!==simB.throws[0]) await twScoop(tw,list); from=await twThrow(tw); }
    await throwDice(list,th.faces,'them',-1,from?{from,dur:800}:{}); if(from) twRest(tw);
    if(foe) foe.userData.lookX=list.reduce((a,o)=>a+o.mesh.position.x,0)/list.length;
    await sleep(240);
    for(const i of th.kept){ if(F!==myF) return simA; const o=B[i]; o.banked=true; const v=effVal(o.face); shownB+=v; SFX.bank(0); floatAt(dieScreen(o),v===0?'0':'+'+v,v===0?'zero':'pts'); moveTo(o,railSlot(F.railN.them++,'them'),BANK_SCALE,380); await sleep(110); }
    sit(); await sleep(320); }
  if(F!==myF) return simA;
  const keepB=simB.total<simA.total, out=keepB?F.them:B;
  out.forEach(o=>{ o.flying=true; const y0=o.mesh.position.y; anim(520,k=>{ o.mesh.position.y=y0+k*.6; o.mesh.scale.setScalar(Math.max(.01,1-k)); }).then(()=>disposeDie(o)); });
  if(keepB){ F.them=B; F.railN.them=0; await sleep(300); if(F!==myF) return simB; B.filter(o=>o.banked).forEach(o=>moveTo(o,railSlot(F.railN.them++,'them'),BANK_SCALE,420)); } SFX.tok&&SFX.tok(0,.5); await sleep(560);
  toast(`<b class="r">Two Heads.</b> They keep <b>${Math.min(simA.total,simB.total)}</b> and drop ${Math.max(simA.total,simB.total)}.`);
  return keepB?simB:simA; }
// cup routines
async function cupScoop(list){ // dice hop into the cup
  if(!foe) return; const u=foe.userData; const mp=new THREE.Vector3();
  await poseArm(u.armR,[-.75,-.12,-1.0,1.5],260);
  for(let i=0;i<list.length;i++){ const o=list[i]; u.mouth.getWorldPosition(mp); const s=o.mesh.position.clone(), sc=o.mesh.scale.x; o.flying=true;
    anim(320,k=>{ o.mesh.position.lerpVectors(s,mp,ease.inout(k)); o.mesh.position.y+=Math.sin(k*Math.PI)*.7; o.mesh.scale.setScalar(lerp(sc,.75,k)); o.mesh.rotation.x+=.2; }).then(()=>{ SFX.tok(0,.7); o.mesh.visible=false; });
    await sleep(70); }
  await sleep(300);
}
// the second twin's cup: same scoop / raise / shake / tip as the first, on a simpler arm (shoulder pivot only)
const TW_REST=-.5;
function twPose(tw,shX,cupX,ms,e=ease.inout){ const u=tw.userData, a=u.sh.rotation.x, c=u.cup.rotation.x; return anim(ms,k=>{ const q=e(k); u.sh.rotation.x=lerp(a,shX,q); u.cup.rotation.x=lerp(c,cupX,q); }); }
async function twScoop(tw,list){ const u=tw.userData, mp=new THREE.Vector3();
  await twPose(tw,-.95,.95,220);
  for(const o of list){ u.mouth.getWorldPosition(mp); const s=o.mesh.position.clone(), sc=o.mesh.scale.x; o.flying=true;
    anim(320,k=>{ o.mesh.position.lerpVectors(s,mp,ease.inout(k)); o.mesh.position.y+=Math.sin(k*Math.PI)*.7; o.mesh.scale.setScalar(lerp(sc,.75,k)); o.mesh.rotation.x+=.2; }).then(()=>{ SFX.tok(0,.7); o.mesh.visible=false; });
    await sleep(70); }
  await sleep(300); }
async function twThrow(tw){ const u=tw.userData;
  await twPose(tw,-1.9,1.9,240); SFX.rattle(420/TS); const a=u.sh.rotation.x, z0=u.sh.rotation.z;
  await anim(420,k=>{ u.sh.rotation.x=a+Math.sin(k*Math.PI*9)*.22; u.sh.rotation.z=z0+Math.sin(k*Math.PI*9+1)*.1; }); u.sh.rotation.z=z0;
  await twPose(tw,-1.55,-.2,170,ease.in);
  const mp=new THREE.Vector3(); u.mouth.getWorldPosition(mp); return mp; }
function twRest(tw){ return twPose(tw,TW_REST,-TW_REST,420); }
async function cupThrow(){ // raise, shake, tip. returns mouth position + direction
  const u=foe.userData; u.mode='act';
  await Promise.all([poseArm(u.armR,POSE.raise,240), foeLean(.35,240)]);
  SFX.rattle(420/TS); const e0=u.armR.el.rotation.x, s0=u.armR.sh.rotation.z;
  await anim(420,k=>{ u.armR.el.rotation.x=e0+Math.sin(k*Math.PI*9)*.32; u.armR.sh.rotation.z=s0+Math.sin(k*Math.PI*9+1)*.12; });
  await poseArm(u.armR,POSE.tip,170,ease.in);
  const mp=new THREE.Vector3(); u.mouth.getWorldPosition(mp); return mp;
}
async function cupRest(){ if(!foe) return; const u=foe.userData; await Promise.all([poseArm(u.armR,POSE.restR,420), foeLean(0,420)]); u.mode='idle'; }

/* ---------- 3D dice ---------- */
const SHAPE={royal:'cube',deuce:'cube',payday:'cube',trick:'cube',bubbly:'cube',viper:'cube',gilded:'cube',bomb:'cube',goose:'cube',boxcar:'cube',devil:'cube',d6:'cube',loaded:'cube',glass:'cube',twin:'cube',d8:'octa',ember:'octa',pebble:'tetra',gamble:'dodeca',coin:'coin'};
const shapeOf=t=>SHAPE[t]||'cube';
const geoCache={};
function basisQuat(n,up){ const z=n.clone().normalize(); const y=up.clone().sub(z.clone().multiplyScalar(up.dot(z))); if(y.lengthSq()<1e-6) y.set(0,1,0).sub(z.clone().multiplyScalar(z.y)); y.normalize(); const x=new THREE.Vector3().crossVectors(y,z); return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,z)); }
function polyFaces(geo){ const pos=geo.attributes.position, faces=[], a=new THREE.Vector3(), b=new THREE.Vector3(), c=new THREE.Vector3(); const tri=geo.index?geo.index.count/3:pos.count/3;
  for(let t=0;t<tri;t++){ const ix=k=>geo.index?geo.index.getX(t*3+k):t*3+k; a.fromBufferAttribute(pos,ix(0)); b.fromBufferAttribute(pos,ix(1)); c.fromBufferAttribute(pos,ix(2));
    const n=new THREE.Vector3().subVectors(b,a).cross(new THREE.Vector3().subVectors(c,a)).normalize(); const cen=a.clone().add(b).add(c); if(n.dot(cen)<0) n.negate();
    let f=faces.find(f=>f.n.dot(n)>.995); if(!f){ f={n:n.clone(),verts:[]}; faces.push(f); }
    [a,b,c].forEach(v=>{ if(!f.verts.some(w=>w.distanceToSquared(v)<1e-6)) f.verts.push(v.clone()); }); }
  faces.forEach(f=>{ f.c=f.verts.reduce((s,v)=>s.add(v),new THREE.Vector3()).multiplyScalar(1/f.verts.length); });
  return faces; }
const SHAPES={
  cube:  ()=>({geo:new THREE.BoxGeometry(.66,.66,.66), restY:.33}),
  octa:  ()=>({geo:new THREE.OctahedronGeometry(.6), restY:.6/Math.sqrt(3), decal:.36}),
  dodeca:()=>({geo:new THREE.DodecahedronGeometry(.5), restY:.5*.7947, decal:.4}),
  tetra: ()=>({geo:new THREE.TetrahedronGeometry(.62), restY:.62/3, decal:.27}),
  coin:  ()=>({geo:new THREE.CylinderGeometry(.4,.4,.14,16), restY:.07}),
};
function shapeData(sh){ if(!geoCache[sh]){ const d=SHAPES[sh](); if(d.decal) d.faces=polyFaces(d.geo); if(sh==='tetra'){ const all=[]; d.faces.forEach(f=>f.verts.forEach(v=>{ if(!all.some(w=>w.distanceToSquared(v)<1e-6)) all.push(v.clone()); })); d.verts=all; } geoCache[sh]=d; } return geoCache[sh]; }
const decalGeo={};
function makeDie3D(inst){
  const type=inst.type, sk=DT[type].skin, sh=shapeOf(type), sd=shapeData(sh), glass=sk==='glass';
  const o={inst,face:1,hidden:false,sel:false,lift:0,shape:sh,restY:sd.restY,size:sd.restY*2,mats:[],cvs:[],decals:[]};
  if(sh==='cube'||sh==='coin'){
    const n=sh==='coin'?3:6;
    for(let i=0;i<n;i++){ const cv=document.createElement('canvas'); cv.width=cv.height=64; const tex=texFromCanvas(cv);
      o.mats.push(new THREE.MeshLambertMaterial({map:tex,emissiveMap:tex,emissive:new THREE.Color(0x262626),transparent:glass,opacity:glass?.85:1})); o.cvs.push(cv); }
    o.topIdx=sh==='coin'?1:2;
    if(sh==='coin'){ const c=o.cvs[0].getContext('2d'); c.fillStyle='#9a6a14'; c.fillRect(0,0,64,64); c.fillStyle='#e8b54a'; for(let i=0;i<64;i+=6) c.fillRect(i,0,3,64); o.mats[0].map.needsUpdate=true; }
    o.mesh=new THREE.Mesh(sd.geo,o.mats); o.size=sh==='coin'?.5:.66;
  } else {
    const body=new THREE.MeshLambertMaterial({color:SKINS[sk].bg,flatShading:true,emissive:new THREE.Color(0x141414)}); o.mats.push(body);
    o.mesh=new THREE.Mesh(sd.geo,body);
    if(!decalGeo[sh]) decalGeo[sh]=new THREE.PlaneGeometry(sd.decal,sd.decal);
    sd.faces.forEach(f=>{ const cv=document.createElement('canvas'); cv.width=cv.height=64; const tex=texFromCanvas(cv);
      const m=new THREE.MeshLambertMaterial({map:tex,emissiveMap:tex,emissive:new THREE.Color(0x303030),transparent:true,polygonOffset:true,polygonOffsetFactor:-2,depthWrite:false});
      const p=new THREE.Mesh(decalGeo[sh],m); p.position.copy(f.c).addScaledVector(f.n,.006); p.quaternion.copy(basisQuat(f.n,f.verts[0].clone().sub(f.c))); o.mesh.add(p);
      o.mats.push(m); o.cvs.push(cv); o.decals.push({p,f}); });
  }
  o.mesh.castShadow=true; o.mesh.userData.die=o; ALLDICE.add(o);
  // a finish shows as a glowing rim in its color
  if(inst.fin&&FINISHES[inst.fin]){ if(!finEdges[sh]) finEdges[sh]=new THREE.EdgesGeometry(sd.geo,30);
    const ln=new THREE.LineSegments(finEdges[sh],new THREE.LineBasicMaterial({color:new THREE.Color(FINISHES[inst.fin].col)})); ln.scale.setScalar(1.015); o.mesh.add(ln); o.finMat=ln.material; }
  setFaces(o,1,false);
  return o;
}
const finEdges={};
function baseEmissive(o,i){ if(o.sel) return 0x6a4a10;
  if(o.decals.length){ if(i===0) return o.inst.type==='ember'?0x3a1404:0x141414; const d=o.decals[i-1]; const top=o.upSet&&o.upSet.has(i-1); return (top&&o.face==='C'&&!o.hidden)?0x5a4418:0x303030; }
  if(i===o.topIdx&&o.face==='C'&&!o.hidden) return 0x4a3810; return 0x1c1c1c; }
function setFaces(o,top,hidden){
  o.face=top; o.hidden=hidden; const type=o.inst.type;
  if(o.decals.length){
    const sd=shapeData(o.shape), nF=sd.faces.length;
    if(o.shape==='tetra'){ const down=rnd(nF); o.upSet=new Set([...Array(nF).keys()].filter(i=>i!==down)); o.restQ=new THREE.Quaternion().setFromUnitVectors(sd.faces[down].n,new THREE.Vector3(0,-1,0));
      const topV=sd.verts.find(v=>!sd.faces[down].verts.some(w=>w.distanceToSquared(v)<1e-6));
      o.decals.forEach(({p,f},i)=>{ if(i===down){ p.position.copy(f.c).addScaledVector(f.n,.006); return; } const up=topV.clone().sub(f.c); p.position.copy(f.c).addScaledVector(up,.3).addScaledVector(f.n,.006); p.quaternion.copy(basisQuat(f.n,up)); }); }
    else { const upI=rnd(nF); o.upSet=new Set([upI]); o.upI=upI; o.restQ=new THREE.Quaternion().setFromUnitVectors(sd.faces[upI].n,new THREE.Vector3(0,1,0)); }
    o.decals.forEach((d,i)=>{ const v=o.upSet.has(i)?(hidden?'?':top):rollInst(o.inst); drawFace(o.cvs[i],type,v,false); o.mats[i+1].map.needsUpdate=true; });
  } else {
    o.restQ=null;
    o.cvs.forEach((cv,i)=>{ if(type==='coin'&&i===0) return; let v; if(i===o.topIdx) v=hidden?'?':top; else if(type==='coin') v=top==='C'?1:'C'; else v=rollInst(o.inst); drawFace(cv,type,v); o.mats[i].map.needsUpdate=true; });
  }
  o.mats.forEach((m,i)=>m.emissive.setHex(baseEmissive(o,i)));
}
// once a polyhedron settles, turn its top number so it reads upright from your seat
function uprightTop(o){ if(o.shape==='tetra'||!o.decals.length) return; const d=o.decals[o.upI]; const inv=o.mesh.quaternion.clone().invert(); const hint=new THREE.Vector3(0,0,-1).applyQuaternion(inv); d.p.quaternion.copy(basisQuat(d.f.n,hint)); }
function setSel(o,on){ o.sel=on; o.mats.forEach((m,i)=>m.emissive.setHex(baseEmissive(o,i))); }
function disposeDie(o){ ALLDICE.delete(o); if(o.mesh.parent) o.mesh.parent.remove(o.mesh); o.mats.forEach(m=>{ if(m.map) m.map.dispose(); m.dispose(); }); if(o.finMat) o.finMat.dispose(); if(o.label){ o.label.remove(); o.label=null; } }
const restY=o=>o.restY;
const _ts=new THREE.Vector3();
function toScreen(v){ const p=_ts.copy(v).project(CAM); return {x:(p.x+1)/2*VW, y:(1-p.y)/2*VH}; }
function dieScreen(o){ return toScreen(o.mesh.position.clone().add(new THREE.Vector3(0,.35,0))); }
// your tray slides back until every value plate clears the slip, whatever the screen shape
// how wide the table looks at depth z, in world units from the centre line
function visHalfW(z){ const a=toScreen(new THREE.Vector3(0,0,z)), b=toScreen(new THREE.Vector3(1,0,z)); const px=Math.abs(b.x-a.x)||1; return (VW/2)/px; }
// The table has fixed zones so dice never meet:
//   back right   their banked dice in one tight row, from the cup out to the corner
//   middle       where their throws land (empty again by the time you throw)
//   front left   your banked dice in one tight row from the corner; the next throw re-slots your tray clear of it
//   front        your tray, value plates in front of it
// Every position stays inside the felt (x within 4.5, z within 3.35).
// The camera (fitCam) zooms to fit the zones to the screen; dice never move to make room.
const TRAY_Z=1.9, THEIR_Z=.15, MY_BANK_Z=2.85, THEIR_BANK_Z=-2.75, BANK_SP=.46, BANK_SCALE=.7, BANK_YAW=[.2,-.16,.1,-.22,.14,-.1];
function traySlots(n,side){ const out=[], you=side==='you', z0=you?TRAY_Z:THEIR_Z, sp=n>1?Math.min(you?1.18:1.15,(you?7.8:7.4)/(n-1)):0, jit=n>=8?.03:.08;
  for(let i=0;i<n;i++) out.push(new THREE.Vector3((i-(n-1)/2)*sp+(Math.random()-.5)*jit,0,z0+(Math.random()-.5)*jit));
  return out; }
// Banked dice sit in tight rows that overlap a little, each turned slightly so no two faces line up.
// Only Twins pass 6, and only while the second twin throws: those run the other way from the cup.
function railSlot(k,side){ const x=side==='you'?-4.1+k*BANK_SP:k<6?1.8+k*BANK_SP:.35-(k-6)*BANK_SP, p=new THREE.Vector3(x,0,side==='you'?MY_BANK_Z:THEIR_BANK_Z); p.yaw=BANK_YAW[k%6]; return p; }
// Fit the camera to this screen: zoom out until your dice, their labels and your banked row all sit above the
// message and the slip, the felt fits across at your tray, and the opponent's hat stays on screen.
function fitCam(smooth=true){ if(!CAM||!CAMF||!camLook) return;
  if(camGoal){ camBase.copy(camGoal); fogTo(fogGoal); camGoal=null; } const from=camBase.clone(), fromD=SCN.fog.near-1.4;
  const apply=zoom=>{ const d=CAMF.dist*zoom; fogTo(d); camBase.set(0,camLook.y+Math.sin(CAMF.el)*d,camLook.z+Math.cos(CAMF.el)*d); CAM.position.copy(camBase); CAM.lookAt(camLook); CAM.updateMatrixWorld(); };
  const yt=document.querySelector('.yourtab');
  if(!F||!yt||!yt.getBoundingClientRect().height){ apply(1); CAMF.zoom=1; if(smooth) glideFrom(from,fromD); return; }
  const mg=document.querySelector('#ui .msg'), u=foe&&foe.userData;
  // the opponent's bounding box as seated (all 8 corners: the back of a big hat sits higher on screen than its middle)
  let hatPts=[], hatMin=Math.max(30,VH*.04); if(u){ const bx=new THREE.Box3(); foe.updateMatrixWorld(true); foe.traverse(c=>{ if(c.isMesh&&!c.userData.noFit) bx.expandByObject(c); }); const dy=u.seatY-foe.position.y+.1;
    for(const x of [bx.min.x,bx.max.x]) for(const z of [bx.min.z,bx.max.z]) hatPts.push(new THREE.Vector3(x,bx.max.y+dy,z-foe.position.z+u.homeZ));
    { const h=document.querySelector('#ui .hud'); if(h) hatMin=Math.max(hatMin,[...h.querySelectorAll('.plate,.rack,.coat')].reduce((m,e)=>Math.max(m,e.getBoundingClientRect().bottom),0)+(u.twins.length?2:-26)); } }
  let zoom=1;
  for(let i=0;i<90;i++){ apply(zoom);
    let floor=yt.getBoundingClientRect().top; const m=mg&&mg.getBoundingClientRect(); if(m&&m.height&&m.right>VW*.25&&m.left<VW*.75) floor=Math.min(floor,m.top);
    const lab=toScreen(new THREE.Vector3(0,0,TRAY_Z+.68)).y+16;
    let cornerFloor=VH; for(const e of [mg]){ const b=e&&e.getBoundingClientRect(); if(b&&b.height) cornerFloor=Math.min(cornerFloor,b.top); }
    const corner=toScreen(new THREE.Vector3(-4.1,0,MY_BANK_Z+.45)).y<=cornerFloor-4;
    const wide=visHalfW(TRAY_Z)>=5.05, hat=hatPts.every(v=>toScreen(v).y>=hatMin), pl=document.querySelector('#plate'), plR=pl&&pl.getBoundingClientRect(), railEnd=toScreen(railSlot(5,'them')), railOk=!plR||!plR.height||railEnd.x<plR.left-6||railEnd.y>plR.bottom+4;
    if((lab>floor-8||!wide||!hat||!corner||!railOk)&&zoom<1.8) zoom*=1.02; else break; }
  CAMF.zoom=zoom; if(smooth) glideFrom(from,fromD); }
// a throw with three settling bounces; landings make the thocks
async function throwDice(list,finals,side,hiddenIdx=-1,opts={}){ const hidSet=Array.isArray(hiddenIdx)?hiddenIdx:[hiddenIdx];
  const slots=opts.slots||traySlots(list.length,side); const dur=opts.dur||(side==='you'?1000:820);
  const ps=list.map((o,i)=>{
    setFaces(o,finals[i],hidSet.includes(i));
    const m=o.mesh; if(!m.parent) SCN.add(m); m.visible=!opts.from; o.flying=true; o.banked=false;
    const start= opts.from ? opts.from.clone().add(new THREE.Vector3((Math.random()-.5)*.2,0,(Math.random()-.5)*.2)) : new THREE.Vector3((i-(list.length-1)/2)*.95+(Math.random()-.5)*.15,1.7+Math.random()*.6, side==='you'?6:-3.6);
    const end=slots[i]; end.y=restY(o); o.home=end.clone(); o.lift=0; setSel(o,false);
    const av=new THREE.Vector3(R_(-8,8),R_(-8,8),R_(-8,8));
    if(!opts.from) m.quaternion.setFromEuler(new THREE.Euler(Math.random()*6,Math.random()*6,Math.random()*6));
    const qEnd=new THREE.Quaternion().setFromEuler(new THREE.Euler(0,(Math.random()-.5)*.8,0)); if(o.restQ) qEnd.multiply(o.restQ); o.qEnd=qEnd; const qTmp=new THREE.Quaternion();
    const peak=opts.from?Math.max(.6,start.y):start.y; let lastK=0; const played=[0,0,0];
    const bounces=[.42,.72,.9];
    m.position.copy(start); m.scale.setScalar(opts.from?.3:1);
    return sleep(i*(opts.from?95:55)).then(()=>{ m.visible=true; return anim(dur,k=>{
      if(opts.from) m.scale.setScalar(k<.3?lerp(.3,1,k/.3):1);
      const dk=Math.max(0,k-lastK); lastK=k; const e=ease.out(k);
      m.position.x=lerp(start.x,end.x,e); m.position.z=lerp(start.z,end.z,e);
      // piecewise bounce: a falling arc then two smaller hops
      let hgt; if(k<bounces[0]){ const q=k/bounces[0]; hgt=lerp(start.y-end.y,0,q*q)+(opts.from?Math.sin(q*Math.PI)*.6:0); }
      else if(k<bounces[1]){ const q=(k-bounces[0])/(bounces[1]-bounces[0]); hgt=Math.sin(q*Math.PI)*.42; }
      else if(k<bounces[2]){ const q=(k-bounces[1])/(bounces[2]-bounces[1]); hgt=Math.sin(q*Math.PI)*.12; } else hgt=0;
      m.position.y=end.y+Math.max(0,hgt)+.25*Math.min(1,(1-k)/.25); // corners clear the felt while it's still tumbling
      const spin=Math.pow(1-k,1.3)*dk*(dur/1000); qTmp.setFromEuler(new THREE.Euler(av.x*spin,av.y*spin,av.z*spin)); m.quaternion.premultiply(qTmp);
      if(k>.6){ const s=Math.pow((k-.6)/.4,1.6); m.quaternion.slerp(qEnd,Math.min(1,s*1.1+.04)); }
      bounces.forEach((b,j)=>{ if(!played[j] && k>=b){ played[j]=1; SFX.land(1-j*.35); } });
    }); });
  });
  await Promise.all(ps);
  list.forEach(o=>{ o.flying=false; o.mesh.visible=true; o.mesh.scale.setScalar(1); o.mesh.quaternion.copy(o.qEnd); uprightTop(o); });
  if(finals.some((f,i)=>f==='C'&&!hidSet.includes(i))) SFX.crown();
}
async function moveTo(o,target,scale=1,dur=420){ const m=o.mesh, s=m.position.clone(), s0=m.scale.x; const t=target.clone(); t.y=restY(o)*scale; o.flying=true; const q0=m.quaternion.clone(), qT=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),target.yaw||0); if(o.restQ) qT.multiply(o.restQ);
  await anim(dur,k=>{ const e=ease.inout(k); m.position.lerpVectors(s,t,e); m.position.y+=Math.sin(k*Math.PI)*.9; m.scale.setScalar(lerp(s0,scale,e)); m.quaternion.copy(q0).slerp(qT,e); });
  m.quaternion.copy(qT); o.qEnd=qT; uprightTop(o); SFX.land(.55); await anim(160,k=>{ m.position.y=t.y+Math.sin(k*Math.PI)*.12; }); o.flying=false; }
// you scoop your dice back up toward you (they leave the frame, no fading)
async function gatherYours(list){ await Promise.all(list.map((o,i)=>{ const m=o.mesh, s=m.position.clone(); o.flying=true; if(o.label){o.label.remove();o.label=null;}
  const t=new THREE.Vector3(lerp(s.x,0,.6),3.2,7.5);
  return sleep(i*40).then(()=>anim(560,k=>{ const e=ease.in(k); m.position.lerpVectors(s,t,e); m.position.y+=Math.sin(k*Math.PI)*.6; m.rotation.x+=.12; m.rotation.z+=.08; })).then(()=>disposeDie(o)); })); }
function shatter(o){ const p=o.mesh.position.clone(); disposeDie(o); SFX.shatter();
  const mat=new THREE.MeshLambertMaterial({color:0xa6e2f2,emissive:0x1a3a44,transparent:true,opacity:.85});
  for(let i=0;i<9;i++){ const sh=new THREE.Mesh(new THREE.TetrahedronGeometry(R_(.06,.13)),mat); sh.position.copy(p); sh.castShadow=true; SCN.add(sh);
    debris.push({o:sh,v:new THREE.Vector3(R_(-2.5,2.5),R_(2,4.5),R_(-2.5,2.5)),w:new THREE.Vector3(R_(-9,9),R_(-9,9),R_(-9,9)),floor:.04,shard:true}); }
  // the shards fade off the felt once they've landed
  const mine=debris.filter(d=>d.o.material===mat);
  sleep(1300).then(()=>anim(700,k=>{ mat.opacity=.85*(1-k); })).then(()=>{ mine.forEach(d=>{ SCN.remove(d.o); d.o.geometry.dispose(); }); debris=debris.filter(d=>!mine.includes(d)); mat.dispose(); }); }
frameFns.add((dt,t)=>{ if(!F||!F.you) return; F.you.forEach(o=>{ if(!o.home||o.banked||o.flying) return; const target=o.sel?.45:(o.hover?.12:0); o.lift+=(target-o.lift)*Math.min(1,dt*14);
  o.mesh.position.y=o.home.y+o.lift+(o.sel?Math.sin(t*5+o.inst.uid)*.04:0); o.pop=(o.pop||0)*Math.max(0,1-dt*6); o.mesh.scale.setScalar(1+Math.sin((1-o.pop)*Math.PI*3)*o.pop*.08); }); });
// value plates under each die in your tray
const _lp=new THREE.Vector3();
frameFns.add(()=>{ if(!F||!F.you||!F.labelsOn) return; const c=ctx(); F.you.forEach(o=>{ const show=!o.banked&&!o.flying&&o.mesh.visible;
  if(!show){ if(o.label&&o.label._op!==0){ o.label.style.opacity=0; o.label._op=0; } return; }
  if(!o.label){ o.label=h('<div class="vp"></div>'); labels.appendChild(o.label); }
  const v=finVal(effVal(o.face,c),o.inst.fin), txt=o.hidden?'?':v<0?'\u2212'+(-v):String(v), cls='vp'+(o.hidden?' hid':v<0?' neg':v===0?' zero':v>=4?' hi':'')+(o.sel?' sel':'');
  if(o.label._t!==txt){ o.label.textContent=txt; o.label._t=txt; } if(o.label._c!==cls){ o.label.className=cls; o.label._c=cls; }
  _lp.copy(o.mesh.position); _lp.y-=o.size/2; _lp.z+=o.size*.62+.12; const p=toScreen(_lp), x=Math.round(p.x), y=Math.round(p.y);
  if(o.label._x!==x||o.label._y!==y){ o.label.style.left=x+'px'; o.label.style.top=y+'px'; o.label._x=x; o.label._y=y; }
  if(o.label._op!==1){ o.label.style.opacity=1; o.label._op=1; } }); });

/* pointer */
const ray=new THREE.Raycaster(), ndc=new THREE.Vector2();
function pickDie(ev){ if(!F||!F.you) return null; const r=canvas.getBoundingClientRect(); ndc.set(((ev.clientX-r.left)/r.width)*2-1,-((ev.clientY-r.top)/r.height)*2+1); ray.setFromCamera(ndc,CAM);
  const hit=ray.intersectObjects(F.you.filter(o=>!o.banked&&!o.flying).map(o=>o.mesh),false)[0]; return hit?hit.object.userData.die:null; }
function onPointer(ev){ const o=pickDie(ev); if(o) toggleSel(o); }
function onHover(ev){ if(ev.pointerType!=='mouse') return; const o=pickDie(ev); if(o&&!o.hover&&!busy){ SFX.hover(); o.pop=1; } if(F&&F.you) F.you.forEach(x=>x.hover=(x===o)); canvas.style.cursor=o&&!busy?'pointer':'default'; }

/* ================= GAME STATE ================= */
let G=null, F=null, busy=false;
function best(){ try{return +localStorage.getItem('lr-best')||0}catch(e){return 0} }
function saveBest(n){ try{ if(n>best()) localStorage.setItem('lr-best',n);}catch(e){} }
function newRun(mode,lv,pk){ lv=lv||0; pk=pk||'regular'; const P=pocketStart(pk), hp0=P.hp+limitMods(lv).startHp; G={grow:{},mode,limit:lv,pocket:pk,bossIx:[rnd(2),rnd(2),rnd(2)],act:0,tab:0,lap:0,floor:0,path:[],map:genMap(),trail:[],hp:hp0,maxHp:hp0,gold:P.gold,rep:0,tally:0,filePrice:5,gildPrice:P.gild,bag:P.bag.map(newDie),charms:P.charms.slice(),won:0,used:{},stats:{rounds:0,won:0,lost:0,push:0,dealt:0,taken:0,best:0,bestWho:'',low:50,rich:10,bosses:[],crowns:0,banked:0,earned:0,spent:0,t0:Date.now()}}; if(P.ruby) gildDie(G.bag[0]); (P.fins||[]).forEach((f,i)=>{ if(G.bag[i]) G.bag[i].fin=f; }); G.fix=(P.fix||[]).slice(); G.drinks=(P.drinks||[]).slice(); G.deeds=[]; if(limitMods(lv).lead){ const i=G.bag.findIndex(d=>d.type==='d6'); if(i>=0) G.bag[i]=newDie('lead'); } }
// a Jinx switches one charm off for the round: has() and live() both skip it
const has=c=>G.charms.includes(c)&&!(F&&F.jinx===c);
const live=()=>F&&F.jinx?G.charms.filter(c=>c!==F.jinx):G.charms;
const LIM=()=>limitMods(G&&G.limit);
const BOSS=()=>bossOf(G.act,(G.bossIx||[])[G.act]||0);
function store(k,v){ try{ if(v===undefined) return JSON.parse(localStorage.getItem(k)||'null'); localStorage.setItem(k,JSON.stringify(v)); }catch(e){ return null; } }
// the limit ladder grew from 8 rungs to 12: move saved progress to the same rung on the new ladder, once
(function(){ try{ const v=localStorage.getItem('lr-limv'); if(v==='3') return; const map=x=>{ x=x||0; return v?LIMIT_V2[Math.min(11,x)]:LIMIT_V1[Math.min(7,x)]; };
  const t=store('lr-limit'); if(t) store('lr-limit',map(t)); const pk=store('lr-pick'); if(pk&&pk.lim) store('lr-pick',{...pk,lim:map(pk.lim)});
  const sv=JSON.parse(localStorage.getItem('lr-save')||'null'); if(sv&&sv.limit){ sv.limit=map(sv.limit); localStorage.setItem('lr-save',JSON.stringify(sv)); } localStorage.setItem('lr-limv','3'); }catch(e){} })();
const limitTop=()=>Math.min(LIMITS.length-1,store('lr-limit')||0);
const bossTotal=()=>store('lr-bossn')||0;
function floorLabel(){ return (G.mode==='endless'?`Lap ${G.lap+1} · `:'')+`Act ${ROMAN[G.act]} · ${G.floor+1}/${FLOORS.length}`; }

/* ================= UI PIECES ================= */
const ROMAN=['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
function soundBtns(){ return `<div class="tabs pe">${G?`<button class="tab" id="bagbtn" aria-label="Your bag">Bag<span class="tc">${G.bag.length}</span></button>`:''}<button class="tab" id="menubtn">Menu</button></div>`; }
function hud(){ return `<div class="hud pe">
  <div class="tabcard plate"><div class="statb"><span class="sc">Nerve</span><div class="inkbar ${G.hp<=G.maxHp*.25?'low':''}" id="hpw"><i id="hpbar" style="width:${100*G.hp/G.maxHp}%"></i></div><span class="tabnum" id="hptxt">${G.hp}<small>/${G.maxHp}</small></span></div>
    <div class="statb"><span class="cash" id="cash">$${G.gold}</span><span class="chits" id="chits">${chitsHTML()}</span><button class="tabnum owe" id="owe" aria-label="What is the tab?">${G.tab?`tab $${G.tab}`:''}</button></div></div>
  ${rackHTML()}${coatHTML()}<div class="spacer"></div><div class="where">${floorLabel()}</div>${soundBtns()}</div>`; }
function wireSound(){ const m=$('#menubtn'), b=$('#bagbtn'); if(m) m.onclick=()=>openMenu(); if(b) b.onclick=()=>openMenu('bag'); }
function updTop(){ if(G&&G.stats) G.stats.rich=Math.max(G.stats.rich||0,G.gold); const b=$('#hpbar'); if(b){ b.style.width=Math.max(0,100*G.hp/G.maxHp)+'%'; $('#hptxt').innerHTML=`${Math.max(0,G.hp)}<small>/${G.maxHp}</small>`; const w=$('#hpw'); if(w) w.classList.toggle('low',G.hp<=G.maxHp*.25); } const c=$('#cash'); if(c) c.textContent='$'+G.gold; const o=$('#owe'); if(o) o.textContent=G.tab?`tab $${G.tab}`:''; }
function heal(n,el){ const b=G.hp; G.hp=Math.min(G.maxHp,G.hp+n); if(G.hp>b&&el) floatEl(el,'+'+(G.hp-b),'heal'); updTop(); }
function addGold(n,el){ G.gold=Math.max(0,G.gold+n); if(n>0) G.stats.earned+=n; if(el&&n) floatEl(el,(n>0?'+$':'−$')+Math.abs(n),'gold'); if(n>0) SFX.coin(); updTop(); }
function wireChips(root=document){ root.querySelectorAll('[data-q]').forEach(el=>el.onclick=(e)=>{ e.stopPropagation(); SFX.pick(); if(popEl&&popEl._for===el){ closePop(); return; } anchorPop(el,tipHTML(el)); }); }
// a small card pinned to whatever you tapped: below it if there's room, otherwise above, always on screen
// One card for every hover and click: hover shows it, clicking a charm adds Sell/Keep. Always straight, never on top of its anchor.
function tipHTML(el){
  if(el.dataset.q&&QUIRKS[el.dataset.q]){ const q=QUIRKS[el.dataset.q]; return `<div class="pn r">${q.name}</div><div class="pd">${kw(q.desc)}</div>`; }
  if(el.dataset.c&&CHARMS[el.dataset.c]){ const c=el.dataset.c, d=CHARMS[c]; return `<div class="phead">${chipHTML(c)}<div><span class="tier ${d.tier}">${TIER_NAME[d.tier]}</span><div class="pn">${d.name}</div></div></div><div class="pd">${kw(charmDesc(c))}${G&&offbook(G,c)?'<br><b class="obk">Off the Books: doesn\u2019t take a charm slot.</b>':''}</div>`; }
  const s=el.dataset.tip||'', i=s.indexOf(': ');
  return i>0&&i<28?`<div class="pn">${s.slice(0,i)}</div><div class="pd">${kw(s.slice(i+2))}</div>`:`<div class="pd" style="margin:0">${kw(s)}</div>`; }
function placePop(p,anchor){ const r=anchor.getBoundingClientRect(), w=p.offsetWidth, hh=p.offsetHeight;
  let top=r.bottom+10; if(top+hh>innerHeight-10) top=Math.max(10,r.top-hh-10);
  p.style.left=Math.max(10,Math.min(innerWidth-w-10,r.left+r.width/2-w/2))+'px'; p.style.top=top+'px'; }
function anchorPop(anchor,html){ closePop(); hideTip(); SFX.paper();
  popEl=h(`<div class="pop paper pe qpop">${html}</div>`); document.body.appendChild(popEl); popEl._for=anchor; placePop(popEl,anchor); }
let tipEl=null;
function hideTip(){ if(tipEl){ tipEl.remove(); tipEl=null; } }
document.addEventListener('pointerover',e=>{ if(e.pointerType!=='mouse') return; const t=e.target.closest('[data-tip]');
  if(!t){ hideTip(); return; } if(tipEl&&tipEl._for===t) return; hideTip(); if(popEl) return;
  tipEl=h(`<div class="pop paper qpop htip">${tipHTML(t)}</div>`); tipEl._for=t; document.body.appendChild(tipEl); placePop(tipEl,t); });
document.addEventListener('pointerdown',hideTip,true);
function screen(html){ if(CAMF&&(CAMF.zoom!==1||camGoal)){ CAMF.zoom=1; camGoal=new THREE.Vector3(0,camLook.y+Math.sin(CAMF.el)*CAMF.dist,camLook.z+Math.cos(CAMF.el)*CAMF.dist); fogNow=SCN.fog.near-1.4; fogGoal=CAMF.dist; } document.querySelectorAll('.toast').forEach(t=>t.remove()); closePop&&closePop(); const old=ui.querySelector('.modal,.title,.newspaper'); if(old&&!REDUCED){ const r=old.getBoundingClientRect(); const c=old.cloneNode(true); c.removeAttribute('id'); Object.assign(c.style,{position:'fixed',left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px',margin:'0',zIndex:30,pointerEvents:'none',boxSizing:'border-box'}); c.classList.add('leaving'); document.body.appendChild(c); setTimeout(()=>c.remove(),420); SFX.paper(); } ui.innerHTML=html; ui.className=html.includes('id="plate"')?'':'page'; ui.scrollTop=0; wireSound(); wireRack(); closePop(); }
function clearLabels(){ labels.innerHTML=''; }
function bagCounts(arr){ const m=new Map(); arr.forEach(t=>m.set(t,(m.get(t)||0)+1)); return [...m.entries()]; }
function dieKey(d){ return d.type+'|'+facesOf(d).join(',')+'|'+(d.fin||''); }
const finTag=d=>(d&&d.fin&&seen('f',d.fin),d&&d.fin)?` <span class="fintag" style="--fc:${FINISHES[d.fin].col}" data-tip="${FINISHES[d.fin].name}: ${FINISHES[d.fin].desc}">${FINISHES[d.fin].name}</span>`:'';
function diceList(){ const w=h('<div class="list cols2"></div>'); const groups=new Map(); G.bag.forEach(d=>{ const k=dieKey(d); if(!groups.has(k)) groups.set(k,[]); groups.get(k).push(d); });
  groups.forEach(list=>{ const d0=list[0], t=d0.type, d=DT[t]; const cr=list.filter(x=>d.breaks).map(x=>x.cracks); const mod=!!d0.f;
  const el=h(`<div class="item"><span class="dico"></span><div><div class="iname">${d.name}${finTag(d0)}${mod?' <span class="tier u">worked</span>':''}<span class="q">\u00d7${list.length}</span></div><div class="idesc">${kw(d.desc)}${cr.length?` Cracks ${cr.join(', ')}/${d.breaks}.`:''}</div><div class="ifaces">${facesHTML(d0)}</div></div></div>`);
  el.querySelector('.dico').appendChild(iconCanvas(t,'C',38)); w.appendChild(el); }); return w; }
// compact bag strip for the bar: one chip per kind of die, hover for the details
function bagStrip(){ const w=h('<div class="bagstrip"></div>'); const groups=new Map(); G.bag.forEach(d=>{ const k=dieKey(d); if(!groups.has(k)) groups.set(k,[]); groups.get(k).push(d); });
  groups.forEach(list=>{ const d0=list[0], d=DT[d0.type]; const tipT=`${d.name}${d0.fin?' ('+FINISHES[d0.fin].name+')':''}: ${d.desc} Faces ${facesOf(d0).map(faceTxt).join(' ')}`.replace(/"/g,'&quot;').replace(/<[^>]+>/g,'');
    const el=h(`<span class="bchip ${d0.fin?'fin':''}" data-tip="${tipT}"><span class="q">\u00d7${list.length}</span></span>`); el.prepend(iconCanvas(d0.type,'C',30)); w.appendChild(el); }); return w; }
function facesHTML(d){ const base=DT[d.type].faces, f=facesOf(d); return '<span class="faces">'+f.map((x,i)=>`<span class="f1 ${x!==base[i]?'chg':''} ${x==='C'||x==='G'?'cr':''}">${faceTxt(x)}</span>`).join('')+'</span>'; }
function charmList(sell){ const w=h('<div class="list cols2"></div>'); if(!G.charms.length){ w.innerHTML='<div class="empty">No charms yet. Every table offers one.</div>'; return w; }
  G.charms.forEach(c=>{ const d=CHARMS[c]; const el=h(`<div class="item">${chipHTML(c)}<div><div class="iname">${d.name} <span class="tier ${d.tier}">${TIER_NAME[d.tier]}</span></div><div class="idesc">${kw(charmDesc(c))}</div>${sell?`<button class="btn ghost small sell">Sell $${Math.floor(d.price/2)}</button>`:''}</div></div>`);
    if(sell) el.querySelector('.sell').onclick=()=>sell(c); w.appendChild(el); }); return w; }
function charmDesc(c){ const d=CHARMS[c].desc, gr=G&&G.grow||{}; if(!G||!G.charms.includes(c)) return d;
  if(c==='tally') return `${d} <b class="tier u">${G.tally} notch${G.tally===1?'':'es'}</b>`;
  if(c==='piggy') return `${d} <b class="tier u">Now +${gr.piggy||0} odds</b>`;
  if(c==='moonshine') return `${d} <b class="tier u">Now \u00d7${fmtOdds(1+.05*(gr.moon||0))} odds</b>`;
  return d; }

/* ================= CHARM ICONS: little 3D props, rendered once in the room's own light and pixel grid ================= */
const CHARM_ICON={}, SVC_ICON={}, DIE_ICON={}; const ICON_PX=36;
function buildCharmIcons(){ if(!GL_OK||!R) return; try{
  const S=ICON_PX, rt=new THREE.WebGLRenderTarget(S,S,{minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter,format:THREE.RGBAFormat});
  const scn=new THREE.Scene();
  scn.add(new THREE.AmbientLight(0x6a4a5a,.85));
  const key=new THREE.DirectionalLight(0xffd29a,1.25); key.position.set(1.6,3.2,2.2); scn.add(key);
  const rim=new THREE.DirectionalLight(0x7a9cff,.55); rim.position.set(-2.2,1.2,-1.8); scn.add(rim);
  const cam=new THREE.PerspectiveCamera(30,1,.1,20); cam.position.set(0,1.75,2.9); cam.lookAt(0,.66,0);
  const M=(c,o={})=>lambert(c,o), E=(c,i=.9)=>new THREE.MeshLambertMaterial({color:c,emissive:c,emissiveIntensity:i});
  const glass=new THREE.MeshLambertMaterial({color:0xbfe6f0,transparent:true,opacity:.45,emissive:0x1a3a44});
  const add=(g,geo,m,x=0,y=0,z=0,rx=0,ry=0,rz=0,sx=1,sy=1,sz=1)=>{ const o=new THREE.Mesh(geo,m); o.position.set(x,y,z); o.rotation.set(rx,ry,rz); o.scale.set(sx,sy,sz); g.add(o); return o; };
  const Bx=(w,h,d)=>new THREE.BoxGeometry(w,h,d), Cy=(a,b,h,s=10)=>new THREE.CylinderGeometry(a,b,h,s), Sp=(r,s=8)=>new THREE.SphereGeometry(r,s,Math.max(4,s-2)), Co=(r,h,s=8)=>new THREE.ConeGeometry(r,h,s), To=(r,t,s=12)=>new THREE.TorusGeometry(r,t,5,s);
  const GOLD=M(0xf0bd4a,{emissive:0x3a2400}), CREAM=M(0xf4ead2,{emissive:0x2a2418}), RED=M(0xc0303f), BLACK=M(0x1a1414), WOOD=M(0x7a4a24), SILVER=M(0xc8ccd4,{emissive:0x15171a}), BROWN=M(0x6a3a1c), AMBER=new THREE.MeshLambertMaterial({color:0xd08a20,emissive:0x7a3a00});
  const card=(g,x,y,z,rz,ry,pip)=>{ add(g,Bx(.5,.72,.04),CREAM,x,y,z,0,ry,rz); add(g,Bx(.14,.2,.02),pip,x+Math.cos(rz+Math.PI/2)*0+0,y,z+.03,0,ry,rz); };
  const die=(g,x,y,z,ry)=>{ add(g,Bx(.44,.44,.44),CREAM,x,y,z,0,ry,0); add(g,Bx(.15,.03,.15),RED,x,y+.225,z,0,ry,0); };
  const B={
    flask(g){ add(g,Bx(.5,.66,.16),SILVER,0,.42,0); add(g,Cy(.08,.08,.18,6),SILVER,0,.84,0); add(g,Cy(.1,.1,.06,6),BLACK,0,.95,0); add(g,Bx(.36,.3,.02),M(0x5a3a22),0,.42,.09); },
    bulldog(g){ add(g,Sp(.34,8),M(0xc8a878),0,.46,0,0,0,0,1.2,.9,1); add(g,Sp(.16,6),M(0xb89868),0,.4,.3); add(g,Bx(.22,.06,.04),BLACK,0,.36,.44); for(const x of [-.24,.24]) add(g,Sp(.1,5),M(0x8a6a48),x,.76,0); add(g,Bx(.5,.08,.5),RED,0,.14,0); },
    haymaker(g){ add(g,Sp(.3,8),RED,0,.52,0,0,0,0,1.2,1,1); add(g,Bx(.34,.16,.34),M(0xf4ead2),-.02,.22,0); add(g,Co(.06,.2,5),E(0xfff0a0,.8),.44,.66,0,0,0,-1); add(g,Co(.06,.2,5),E(0xfff0a0,.8),.42,.36,0,0,0,-2); },
    mimic(g){ add(g,Bx(.5,.72,.04),CREAM,-.16,.5,0,0,0,.2); add(g,Bx(.5,.72,.04),M(0xc9c2d8,{transparent:true,opacity:.7}),.16,.5,.06,0,0,-.2); add(g,Sp(.08,6),BLACK,-.2,.6,.04); add(g,Sp(.08,6),BLACK,.12,.6,.1); add(g,Bx(.18,.04,.02),RED,-.16,.4,.04,0,0,.2); },
    thumb(g){ add(g,Cy(.16,.18,.5,8),M(0xe8b890),0,.42,0,0,0,.35); add(g,Sp(.17,8),M(0xe8b890),-.1,.66,0); add(g,Bx(.14,.06,.1),M(0xf4d8c8),-.15,.74,.08,0,0,.35); die(g,.28,.24,.05,.4); },
    echo(g){ add(g,Cy(.24,.24,.14,10,true),GOLD,-.16,.42,0); for(let k=0;k<3;k++) add(g,Co(.06,.16,5),GOLD,-.16+(k-1)*.15,.56,0); add(g,Cy(.24,.24,.14,10,true),M(0xf0bd4a,{transparent:true,opacity:.45,emissive:0x3a2400}),.2,.5,-.12); for(let k=0;k<3;k++) add(g,Co(.06,.16,5),M(0xf0bd4a,{transparent:true,opacity:.45}),.2+(k-1)*.15,.64,-.12); },
    doubletake(g){ add(g,To(.18,.05,12),SILVER,-.2,.5,0); add(g,To(.18,.05,12),SILVER,.2,.5,0); add(g,Bx(.14,.04,.04),SILVER,0,.52,0); add(g,Sp(.12,6),M(0x9fe8ff,{transparent:true,opacity:.6}),-.2,.5,0); add(g,Sp(.12,6),M(0x9fe8ff,{transparent:true,opacity:.6}),.2,.5,0); },
    sleight(g){ add(g,Bx(.5,.72,.04),CREAM,0,.52,0,0,0,.3); add(g,Bx(.18,.24,.02),RED,0,.52,.03,0,0,.3); add(g,Cy(.36,.44,.5,10),BLACK,-.06,.22,0,0,0,-.3); add(g,Cy(.36,.36,.06,10),WOOD,-.06,.48,0,0,0,-.3); },
    bump(g){ add(g,Bx(.9,.12,.5),WOOD,0,.22,0,0,0,-.12); for(const x of [-.36,.36]) add(g,Bx(.08,.24,.08),WOOD,x,.06,0); die(g,-.12,.62,0,.5); add(g,Co(.06,.18,5),E(0xfff0a0,.8),.24,.66,0,0,0,-.6); add(g,Co(.06,.18,5),E(0xfff0a0,.8),-.4,.7,0,0,0,.6); },
    bodyguard(g){ add(g,Bx(.6,.66,.26),BLACK,0,.42,0); add(g,Sp(.18,8),M(0xd8a880),0,.9,0); add(g,Bx(.3,.06,.06),BLACK,0,.92,.16); add(g,Bx(.08,.36,.04),RED,0,.5,.14); add(g,Bx(.66,.06,.28),GOLD,0,.14,0); },
    shoeshine(g){ add(g,Bx(.7,.22,.3),BROWN,0,.3,0); add(g,Bx(.5,.08,.24),M(0x9fe8ff),0,.46,0); add(g,Cy(.04,.04,.4,6),WOOD,.2,.62,0,0,0,.6); },
    curator(g){ add(g,Bx(.8,.62,.06),M(0x5a3a1a),0,.5,0); add(g,Bx(.6,.44,.07),M(0x2a1a10),0,.5,0); add(g,Bx(.24,.24,.24),CREAM,0,.5,.12); add(g,Bx(.26,.04,.26),M(0x9fe8ff),0,.64,.12); },
    restless(g){ add(g,To(.3,.07,14),GOLD,0,.5,0); add(g,Co(.1,.18,5),GOLD,.3,.66,0,0,0,-1.2); add(g,Co(.1,.18,5),GOLD,-.3,.34,0,0,0,1.9); },
    craterat(g){ add(g,Bx(.7,.5,.5),WOOD,0,.3,0); add(g,Bx(.72,.06,.52),BROWN,0,.4,0); add(g,Sp(.18,8),M(0x8a8a90),.18,.66,.1,0,0,0,1.3,1,1); add(g,Cy(.02,.02,.4,4),M(0xd0a0a0),-.15,.62,.1,0,0,1.2); },
    stub(g){ add(g,Bx(.86,.42,.04),M(0xd8c07a),0,.5,0,0,0,.15); add(g,Bx(.03,.42,.05),M(0x7a5a1a),.2,.5,0,0,0,.15); add(g,Bx(.3,.06,.05),RED,-.12,.54,.01,0,0,.15); },
    rabbitp(g){ add(g,Sp(.3,10),M(0xf0e8e0),0,.45,0); add(g,Cy(.07,.09,.4,6),M(0xf0e8e0),-.1,.82,0,0,0,.2); add(g,Cy(.07,.09,.4,6),M(0xf0e8e0),.1,.82,0,0,0,-.2); add(g,To(.2,.07,10),GOLD,0,.36,.18); },
    collection(g){ for(let k=0;k<3;k++) add(g,Bx(.5,.62,.06),k===1?GOLD:CREAM,(k-1)*.28,.42+k*.02,-k*.08,0,0,(k-1)*.22); add(g,Bx(.16,.16,.02),RED,0,.48,.04); },
    consolation(g){ add(g,Sp(.24,8),RED,-.15,.5,0); add(g,Sp(.24,8),RED,.15,.5,0); add(g,Co(.34,.42,8),RED,0,.22,0,Math.PI); },
    savings(g){ add(g,Bx(.86,.5,.04),M(0xd8e8c0),0,.44,0); add(g,Bx(.7,.36,.05),M(0x3a7a4a),0,.44,0); add(g,Cy(.12,.12,.06,10),GOLD,0,.44,.04,Math.PI/2); },
    shiner(g){ add(g,Sp(.34,10),M(0xe8c0a0),0,.5,0); add(g,To(.16,.06,10),M(0x4a2a6a),.12,.56,.28); add(g,Sp(.11,6),M(0x2a1a3a),.12,.56,.3); },
    evens(g){ die(g,-.26,.3,0,.3); die(g,.26,.3,.05,-.3); add(g,Bx(.15,.03,.15),M(0x2a6a3a),-.26,.53,0,0,.3,0); },
    deuces(g){ card(g,-.18,.45,0,.2,0,M(0x2a6a3a)); card(g,.18,.45,.05,-.2,0,M(0x2a6a3a)); },
    piggy(g){ add(g,Sp(.4,10),M(0xf0a0b0),0,.42,0,0,0,0,1.2,1,1); add(g,Cy(.12,.12,.12,8),M(0xe08a9a),.5,.44,0,0,0,Math.PI/2); for(const x of [-.25,.25]) add(g,Cy(.07,.07,.2,6),M(0xe08a9a),x,.1,0); add(g,Bx(.18,.03,.06),BLACK,0,.82,0); },
    tommy(g){ add(g,Bx(1.1,.16,.16),BLACK,0,.5,0); add(g,Cy(.22,.22,.12,14),BLACK,-.05,.3,0,Math.PI/2); add(g,Bx(.34,.2,.14),WOOD,-.5,.45,0); add(g,Bx(.14,.24,.12),WOOD,.18,.32,0); },
    jackpot(g){ for(let k=0;k<3;k++){ add(g,Bx(.3,.44,.1),CREAM,(k-1)*.32,.46,0); add(g,Bx(.14,.24,.02),RED,(k-1)*.32,.46,.06); } add(g,Bx(1.06,.08,.12),GOLD,0,.72,0); },
    longshot(g){ add(g,Cy(.03,.03,1.1,6),SILVER,0,.5,0,0,0,.9); add(g,To(.22,.04,12),RED,.32,.72,0); add(g,Sp(.06,6),RED,.32,.72,0); },
    finisher(g){ add(g,Bx(.6,.12,.12),SILVER,0,.5,0); add(g,Bx(.18,.4,.18),BLACK,-.36,.42,0); add(g,Co(.08,.2,6),SILVER,.38,.5,0,0,0,-Math.PI/2); },
    moonshine(g){ add(g,Cy(.32,.38,.6,10),M(0xc8b48a),0,.36,0); add(g,Cy(.1,.12,.16,8),M(0xc8b48a),0,.74,0); add(g,To(.12,.04,8),BROWN,.36,.5,0,0,Math.PI/2); add(g,Bx(.3,.12,.02),BLACK,0,.4,.36); },
    crownroom(g){ add(g,Bx(.8,.7,.06),M(0x5a1a2a),0,.44,0); add(g,Cy(.28,.28,.16,10,true),GOLD,0,.5,.08); for(let k=0;k<3;k++) add(g,Co(.07,.2,5),GOLD,(k-1)*.18,.66,.08); },
    straight(g){ for(let k=0;k<3;k++){ add(g,Bx(.34,.34,.34),CREAM,(k-1)*.36,.24+k*.14,0); add(g,Bx(.1,.02,.1),RED,(k-1)*.36,.42+k*.14,0); } },
    ringer(g){ add(g,Cy(.28,.28,.16,10,true),GOLD,0,.4,0); for(let k=0;k<3;k++) add(g,Co(.07,.2,5),GOLD,(k-1)*.18,.56,0); add(g,Bx(.7,.08,.08),RED,0,.46,.2,0,0,.7); },
    bigshot(g){ add(g,Cy(.22,.3,.44,10),BLACK,0,.5,0); add(g,Cy(.5,.5,.04,14),BLACK,0,.28,0); add(g,Cy(.23,.23,.08,10),RED,0,.34,0); add(g,Co(.08,.16,5),GOLD,0,.84,0); },
    jewels(g){ add(g,Cy(.42,.42,.26,12,true),GOLD,0,.34,0); for(let k=0;k<5;k++){ const an=k*Math.PI*2/5; add(g,Co(.1,.28,5),GOLD,Math.cos(an)*.38,.6,Math.sin(an)*.38); add(g,Sp(.05,5),GOLD,Math.cos(an)*.38,.76,Math.sin(an)*.38); } add(g,Sp(.11,6),E(0xe8455a,.5),0,.36,.42); },
    slowburn(g){ add(g,Cy(.17,.19,.72),CREAM,0,.46,0); add(g,Cy(.02,.02,.1,4),BLACK,0,.86,0); add(g,Co(.09,.26,6),E(0xffa030),0,1.02,0); add(g,Sp(.06,5),E(0xfff0a0),0,.95,0); add(g,Cy(.3,.34,.08),GOLD,0,.13,0); },
    cut(g){ add(g,Bx(.52,.74,.04),CREAM,-.14,.5,0,0,0,.28); add(g,Bx(.52,.74,.04),CREAM,.14,.5,.05,0,0,-.22); add(g,Sp(.1,6),RED,.16,.52,.08); add(g,Bx(.05,.32,.02),BLACK,.16,.52,.09,0,0,.8); },
    bouncer(g){ for(let k=0;k<4;k++) add(g,To(.11,.05,10),GOLD,-.36+k*.24,.62,0); add(g,Bx(1.0,.14,.12),GOLD,0,.44,0); add(g,Sp(.16,6),GOLD,0,.34,0,0,0,0,2.4,1,.8); },
    thick(g){ add(g,Sp(.36,8),M(0x8a2a24),0,.58,0,0,0,0,1,1.1,.9); add(g,Sp(.16,6),M(0x8a2a24),-.3,.6,.12); add(g,Cy(.26,.28,.24),CREAM,0,.18,0); },
    tip(g){ add(g,Cy(.34,.3,.66,12),glass,0,.44,0); for(let k=0;k<5;k++) add(g,Cy(.12,.12,.04,8),GOLD,(k%2-.5)*.16,.16+k*.06,(k%3-1)*.08,.3*k,0,.2*k); add(g,Bx(.24,.14,.02),M(0x6fb06a),.05,.36,.12,0,0,.3); add(g,To(.33,.04,12),SILVER,0,.78,0,Math.PI/2); },
    goldcrown(g){ add(g,Bx(.42,.36,.36),GOLD,0,.68,0); add(g,Bx(.14,.42,.14),CREAM,-.12,.3,0,0,0,.12); add(g,Bx(.14,.42,.14),CREAM,.12,.3,0,0,0,-.12); add(g,Sp(.05,5),E(0xffffff,.6),.12,.8,.19); },
    hothand(g){ add(g,Co(.34,.8,7),E(0xff5a20,.8),0,.5,0); add(g,Co(.22,.6,7),E(0xffa030,.9),.04,.46,.08); add(g,Co(.12,.36,6),E(0xfff0a0,1),.02,.36,.16); },
    liver(g){ add(g,Bx(.6,.7,.2),SILVER,0,.45,0); add(g,Cy(.3,.3,.2,12),SILVER,0,.8,0,Math.PI/2,0,0,1,1,.6); add(g,Cy(.09,.09,.14,8),GOLD,0,.94,0); add(g,Bx(.36,.3,.02),M(0x5a3a22),0,.42,.11); },
    cigar(g){ add(g,Cy(.12,.12,1.15,8),BROWN,0,.32,0,0,0,Math.PI/2+.25); add(g,Cy(.13,.13,.12,8),RED,-.24,.38,0,0,0,Math.PI/2+.25); add(g,Cy(.12,.12,.06,8),E(0xff6a20,1),.56,.46,0,0,0,Math.PI/2+.25); add(g,Sp(.07,5),E(0xffd0a0,.6),.64,.52,0); },
    penny(g){ add(g,Cy(.46,.46,.1,16),M(0xc07a3a,{emissive:0x2a1200}),0,.56,0,Math.PI/2); add(g,Bx(.08,.42,.04),M(0x6a3a14),0,.56,.07); add(g,Bx(.14,.06,.04),M(0x6a3a14),-.04,.73,.07); },
    spoon(g){ add(g,Sp(.24,8),SILVER,-.24,.36,0,0,0,0,1.3,.35,1); add(g,Bx(.6,.07,.1),SILVER,.18,.5,0,0,0,.5); add(g,Bx(.36,.07,.1),SILVER,.52,.8,0,0,0,-.4); },
    lastcall(g){ add(g,Cy(.16,.42,.56,12),GOLD,0,.42,0); add(g,To(.42,.05,12),GOLD,0,.15,0,Math.PI/2); add(g,Cy(.05,.05,.24,6),WOOD,0,.8,0); add(g,Sp(.1,6),WOOD,0,.96,0); },
    jacks(g){ add(g,Bx(.5,.72,.04),CREAM,-.16,.52,0,0,0,.25); add(g,Bx(.5,.72,.04),CREAM,.16,.52,.05,0,0,-.2); add(g,Bx(.2,.36,.03),RED,-.18,.54,.03,0,0,.25); add(g,Bx(.2,.36,.03),BLACK,.18,.54,.08,0,0,-.2); add(g,Bx(.18,.06,.02),GOLD,.18,.74,.08,0,0,-.2); },
    snake(g){ die(g,-.26,.32,0,.3); die(g,.26,.32,.06,-.4); add(g,To(.3,.06,12),M(0x3a8a3a),0,.6,0,Math.PI/2.4); add(g,Sp(.1,6),M(0x3a8a3a),.3,.72,.1); },
    patience(g){ add(g,Co(.3,.4,10),glass,0,.66,0,Math.PI); add(g,Co(.3,.4,10),glass,0,.26,0); add(g,Co(.16,.18,8),M(0xe8c070),0,.18,0); add(g,Cy(.36,.36,.06,10),WOOD,0,.04,0); add(g,Cy(.36,.36,.06,10),WOOD,0,.88,0); for(const x of [-.3,.3]) add(g,Cy(.03,.03,.84,4),WOOD,x,.46,.1); },
    barfly(g){ add(g,Cy(.24,.2,.44,10),glass,0,.3,0); add(g,Cy(.2,.17,.26,10),AMBER,0,.22,0); add(g,Sp(.08,5),BLACK,.16,.6,.12); add(g,Bx(.16,.02,.08),M(0xffffff,{transparent:true,opacity:.6}),.12,.66,.12,0,0,.5); },
    tally(g){ add(g,Bx(.8,.62,.06),M(0x1e2a24),0,.5,0,-.15); add(g,Bx(.88,.7,.04),WOOD,0,.5,-.04,-.15); for(let k=0;k<4;k++) add(g,Bx(.04,.32,.02),CREAM,-.24+k*.12,.52,.05,-.15); add(g,Bx(.58,.04,.02),CREAM,-.06,.52,.06,-.15,0,-.5); },
    rabbit(g){ add(g,Sp(.24,8),CREAM,0,.38,0,0,0,0,1,1.5,1); add(g,Sp(.14,6),CREAM,.06,.72,.06); add(g,Cy(.1,.1,.1,8),GOLD,0,.82,0); add(g,To(.12,.03,10),GOLD,0,.98,0); },
    closer(g){ add(g,Cy(.16,.16,.6,10),WOOD,0,.66,0,0,0,Math.PI/2); add(g,Cy(.18,.18,.08,10),GOLD,-.22,.66,0,0,0,Math.PI/2); add(g,Cy(.18,.18,.08,10),GOLD,.22,.66,0,0,0,Math.PI/2); add(g,Cy(.05,.05,.62,6),WOOD,.16,.32,0,0,0,-.5); },
    kingpin(g){ add(g,Cy(.34,.38,.14,12),BLACK,0,.14,0); add(g,Cy(.16,.28,.5,10),BLACK,0,.44,0); add(g,Cy(.24,.18,.12,10),BLACK,0,.72,0); add(g,Bx(.06,.26,.06),GOLD,0,.92,0); add(g,Bx(.2,.06,.06),GOLD,0,.95,0); add(g,To(.2,.03,10),GOLD,0,.66,0,Math.PI/2); },
    lowball(g){ add(g,Cy(.36,.32,.5,12),glass,0,.33,0); add(g,Cy(.32,.29,.28,12),AMBER,0,.24,0); add(g,Bx(.2,.2,.2),M(0xe0f4ff,{transparent:true,opacity:.8}),.06,.42,0,.4,.6,.2); },
    highstakes(g){ [RED,BLACK,RED,BLACK,RED].forEach((m,k)=>add(g,Cy(.34,.34,.1,12),m,(k%2)*.04-.02,.14+k*.11,0)); add(g,Cy(.34,.34,.1,12),BLACK,.46,.4,.2,0,0,1.1); },
    opener(g){ add(g,Bx(1.1,.1,.2),GOLD,0,1.0,0); add(g,Bx(.42,.9,.12),RED,-.3,.52,0,0,0,.08); add(g,Bx(.42,.9,.12),RED,.3,.52,0,0,0,-.08); add(g,Bx(.18,.9,.02),M(0x7a1424),-.3,.52,.07,0,0,.08); add(g,Sp(.08,6),E(0xfff0c0,.8),0,.3,.1); },
    packed(g){ add(g,Sp(.42,8),M(0x6a4a2a),0,.42,0,0,0,0,1,1.05,1); add(g,Cy(.12,.2,.2,8),M(0x6a4a2a),0,.86,0); add(g,To(.14,.04,10),GOLD,0,.8,0,Math.PI/2); die(g,.36,.7,.22,.5); },
    stack(g){ add(g,Cy(.4,.4,.12,14),M(0x2f9e90),0,.1,0); add(g,Cy(.4,.4,.12,14),M(0xe8dcc0),0,.23,0); add(g,Cy(.18,.18,.02,10),M(0xa3303f),0,.3,0); add(g,Co(.16,.3,8),RED,0,.72,0,Math.PI); add(g,Cy(.06,.06,.3,6),RED,0,.98,0); },
    allin(g){ [[-.34,0,2,RED],[.02,-.12,3,BLACK],[.36,.04,4,GOLD]].forEach(([x,z,n,m])=>{ for(let j=0;j<n;j++){ add(g,Cy(.24,.24,.11,14),m,x+(j%2)*.02,.06+j*.12,z); add(g,Cy(.25,.25,.03,14),CREAM,x+(j%2)*.02,.06+j*.12,z); } }); },
    glassblower(g){ add(g,Cy(.04,.04,1.0,6),SILVER,-.2,.66,0,0,0,.9); add(g,Sp(.32,8),glass,.24,.42,0); add(g,Sp(.12,6),E(0xff8a3a,.9),.24,.42,0); },
    nearmiss(g){ add(g,Cy(.5,.5,.06,16),CREAM,0,.55,0,Math.PI/2); add(g,Cy(.34,.34,.07,16),RED,0,.55,.01,Math.PI/2); add(g,Cy(.16,.16,.08,14),CREAM,0,.55,.02,Math.PI/2); add(g,Cy(.03,.03,.6,5),WOOD,.14,.78,.24,1.2,0,.5); add(g,Co(.07,.14,4),RED,.24,.86,.5,1.2,0,.5); },
    blood(g){ add(g,Sp(.3,8),M(0xb01828,{emissive:0x3a0006}),0,.38,0,0,0,0,1,1.05,1); add(g,Co(.21,.42,8),M(0xb01828,{emissive:0x3a0006}),0,.78,0); add(g,Cy(.22,.22,.06,12),GOLD,.32,.12,.2,Math.PI/2.3); },
    threes(g){ die(g,-.28,.24,.1,.2); die(g,.28,.24,.1,-.3); die(g,0,.7,0,.1); },
    regular(g){ add(g,Cy(.38,.34,.1,12),M(0x8a1c2a),0,.92,0); add(g,Cy(.08,.08,.8,6),SILVER,0,.48,0); add(g,To(.24,.03,10),SILVER,0,.32,0,Math.PI/2); add(g,Cy(.3,.34,.06,12),SILVER,0,.06,0); },
    heckler(g){ add(g,Co(.36,.8,10,true),M(0xd8b25c,{emissive:0x2a1a00}),.06,.6,0,0,0,Math.PI/2); add(g,Cy(.08,.08,.24,6),BLACK,-.42,.6,0,0,0,Math.PI/2); add(g,Bx(.08,.26,.08),BLACK,-.3,.42,0); },
    doubledown(g){ add(g,Bx(.5,.72,.04),M(0xf0c040,{emissive:0x3a2400}),-.14,.52,0,0,0,.18); add(g,Bx(.5,.72,.04),M(0xf0c040,{emissive:0x3a2400}),.14,.52,.06,0,0,-.18); add(g,Bx(.08,.36,.02),RED,.16,.52,.09,0,0,.6); add(g,Bx(.08,.36,.02),RED,.16,.52,.09,0,0,-.6); },
    bookie(g){ add(g,Bx(.76,.14,.56),M(0x1f4a33),0,.18,0,0,.3); add(g,Bx(.7,.1,.5),CREAM,0,.29,0,0,.3); add(g,Bx(.76,.06,.56),M(0x1f4a33),0,.37,0,0,.3); add(g,Bx(.06,.02,.7),RED,.12,.41,0,0,.3); add(g,Cy(.04,.04,.6,6),GOLD,.2,.52,0,0,.3,1.1); },
  };
  R.setClearColor(0x000000,0);
  const bay=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
  const _v=new THREE.Vector3(); const pbox=g=>{ const b=new THREE.Box3(); g.updateMatrixWorld(true); g.traverse(o=>{ if(!o.isMesh||o.material.transparent&&o.material.opacity===0) return; const pos=o.geometry.attributes.position; for(let i=0;i<pos.count;i++){ _v.fromBufferAttribute(pos,i).applyMatrix4(o.matrixWorld); b.expandByPoint(_v); } }); return b; };
  const snap=(g,rx=0)=>{ g.rotation.set(rx,-.45,0); scn.add(g);
    { const bb=pbox(g), sz=bb.getSize(new THREE.Vector3()), k=1.5/Math.max(sz.x,sz.y*1.1,sz.z*.9); g.scale.multiplyScalar(k); const b2=pbox(g), cc=b2.getCenter(new THREE.Vector3()); g.position.set(-cc.x,.66-cc.y,-cc.z); }
    R.setRenderTarget(rt); R.clear(); R.render(scn,cam); const px=new Uint8Array(S*S*4); R.readRenderTargetPixels(rt,0,0,S,S,px); scn.remove(g);
    const cv=document.createElement('canvas'); cv.width=cv.height=S; const cx=cv.getContext('2d'), id=cx.createImageData(S,S);
    for(let y=0;y<S;y++) for(let x=0;x<S;x++){ const si=((S-1-y)*S+x)*4, di=(y*S+x)*4, d=(bay[(x%4)+(y%4)*4]/16-.5)*10;
      for(let k=0;k<3;k++){ let v=Math.pow(px[si+k]/255,.92)*255*1.06; v=Math.round((v+d)/14)*14; id.data[di+k]=Math.max(0,Math.min(255,v)); } id.data[di+3]=px[si+3]>40?255:0; }
    // dark outline so the prop reads on any panel
    const out=new Uint8ClampedArray(id.data); for(let y=0;y<S;y++) for(let x=0;x<S;x++){ const i=(y*S+x)*4; if(id.data[i+3]) continue; let n=false; for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){ const X=x+dx,Y=y+dy; if(X>=0&&Y>=0&&X<S&&Y<S&&id.data[(Y*S+X)*4+3]) n=true; } if(n){ out[i]=14; out[i+1]=9; out[i+2]=8; out[i+3]=255; } }
    id.data.set(out); cx.putImageData(id,0,0); return cv.toDataURL(); };
  const propG=fn=>{ const g=new THREE.Group(), prop=new THREE.Group(); fn(prop); g.add(prop); return g; };
  Object.keys(CHARMS).forEach(c=>{ CHARM_ICON[c]=snap(propG(B[c]||B.jewels)); });
  // services and map stops
  const SV={
    back(g){ add(g,Bx(.7,1.2,.1),WOOD,0,.6,0,0,-.5); add(g,Bx(.8,1.3,.06),M(0x2a160c),.05,.62,-.12); add(g,Sp(.06,6),GOLD,-.2,.58,.12); add(g,Bx(.08,1.2,.02),E(0xffd08a,.9),.38,.6,-.08); },
    heal(g){ add(g,Co(.42,.46,10),glass,0,.92,0,Math.PI); add(g,Co(.36,.36,10),AMBER,0,.86,0,Math.PI); add(g,Cy(.03,.03,.5,5),glass,0,.46,0); add(g,Cy(.26,.28,.04,10),glass,0,.2,0); add(g,Sp(.07,6),M(0x6a9a2a),.1,.96,.08); add(g,Bx(.02,.5,.02),M(0x8a5a2a),.06,1.02,.06,0,0,.5); },
    remove(g){ add(g,Cy(.42,.34,.7,12),SILVER,0,.35,0); add(g,To(.42,.04,12),SILVER,0,.7,0,Math.PI/2); add(g,Bx(.36,.36,.36),CREAM,.1,.78,0,.5,.3,.4); add(g,Bx(.1,.03,.1),RED,.13,.97,.02,.5,.3,.4); },
    file(g){ add(g,Bx(.14,1.05,.04),SILVER,.06,.75,0,0,0,-.5); for(let k=0;k<6;k++) add(g,Bx(.15,.02,.05),M(0x6a6e76),.06+Math.sin(.5)*(-.35+k*.13),.6+Math.cos(.5)*(-.35+k*.13)+.2,0,0,0,-.5+1.2); add(g,Cy(.08,.08,.4,8),WOOD,-.24,.24,0,0,0,-.5); },
    gild(g){ add(g,new THREE.OctahedronGeometry(.42,0),E(0xd8304a,.35),0,.6,0,0,.4,0,1,1.25,1); add(g,To(.34,.06,12),GOLD,0,.22,0,Math.PI/2); for(let k=0;k<5;k++){ const an=k*Math.PI*2/5; add(g,Co(.06,.18,5),GOLD,Math.cos(an)*.34,.34,Math.sin(an)*.34); } },
    bar(g){ add(g,Cy(.24,.26,.8,10),M(0x3d6b2a,{emissive:0x0a1a06}),0,.4,0); add(g,Cy(.1,.22,.2,10),M(0x3d6b2a),0,.9,0); add(g,Cy(.08,.08,.26,8),M(0x3d6b2a),0,1.12,0); add(g,Cy(.09,.09,.06,8),GOLD,0,1.27,0); add(g,Bx(.3,.3,.02),CREAM,0,.42,.25); },
    alley(g){ add(g,Cy(.4,.36,.8,12),M(0x5a5e66),0,.4,0); add(g,Cy(.44,.44,.08,12),M(0x6a6e76),0,.86,0); add(g,Cy(.06,.06,.1,6),M(0x6a6e76),0,.96,0); for(const y of [.25,.55]) add(g,To(.39,.025,12),M(0x4a4e56),0,y,0,Math.PI/2); add(g,Sp(.14,6),E(0xfff0c0,.8),.5,1.25,-.2); },
    stranger(g){ add(g,Cy(.62,.62,.05,14),M(0x2a2a30),0,.3,0); add(g,Cy(.34,.4,.4,12),M(0x2a2a30),0,.52,0); add(g,Cy(.41,.41,.1,12),M(0x7a1424),0,.4,0); add(g,Bx(.5,.06,.2),M(0x2a2a30),0,.73,0); },
  };
  Object.keys(SV).forEach(k=>{ SVC_ICON[k]=snap(propG(SV[k])); });
  // every die, crown up, in its own skin and shape
  Object.keys(DT).forEach(t=>{ try{ const o=makeDie3D({type:t,uid:-1}); setFaces(o,'C',false); ALLDICE.delete(o); o.mats.forEach((m,i)=>m.emissive.setHex(baseEmissive(o,i))); if(o.restQ) o.mesh.quaternion.copy(o.restQ);
    const g=new THREE.Group(); g.add(o.mesh); DIE_ICON[t]=snap(g,.42); }catch(e){ console.warn('dieicon',t,e); } });
  R.setRenderTarget(null); R.setClearColor(0x0a0706,1); rt.dispose();
 }catch(e){ console.warn('icons',e); } }

/* ================= TITLE ================= */
// neon drawn small then scaled up by whole pixels, so it shares the 3D room's pixel grid
function neonSign(text,color='#ff4f86'){ const u=PX||2, W=Math.min(innerWidth-24,560), H=Math.round(W*.36); const w=Math.round(W/u), hh=Math.round(H/u);
  const cv=makeCanvas(w,hh,(c)=>{ const fs=Math.round(hh*.5); c.font=`${fs}px Yellowtail,cursive`; c.textAlign='center'; c.textBaseline='middle'; c.translate(w/2,hh*.52); c.rotate(-.06);
    for(const [b,a] of [[10,.5],[5,.7],[2,.9]]){ c.shadowColor=color; c.shadowBlur=b; c.fillStyle=color; c.globalAlpha=a; c.fillText(text,0,0); }
    c.shadowBlur=0; c.globalAlpha=1; c.fillStyle='#ffe3ec'; c.fillText(text,0,0); });
  // quantize alpha so the glow steps instead of blurring
  const c=cv.getContext('2d'), id=c.getImageData(0,0,w,hh); for(let i=3;i<id.data.length;i+=4){ const a=id.data[i]; id.data[i]=a<30?0:a<90?90:a<170?170:255; } c.putImageData(id,0,0);
  cv.className='neonimg'; cv.style.width=w*u+'px'; cv.style.height=hh*u+'px'; cv.style.animation='blink 7s steps(1) infinite'; return cv; }
let decoDice=[], decoTimer=null;
function clearDeco(){ clearInterval(decoTimer); decoTimer=null; const d=decoDice; decoDice=[]; if(d.length) gatherYours(d); }
function renderTitle(){
  G=null; F=null; setActTheme(0); const SAVED=loadRun(); clearLabels(); lampDim=1;
  if(foe) foeWalkOut();
  screen(`<div class="hud pe"><div class="spacer"></div>${soundBtns()}</div>
  <div class="title pe">
    <div><div id="neonslot"></div><div class="est" style="margin-top:8px">The Rusty Nail \u00b7 Est. 1926</div></div>
    <div class="tmid"><div class="rules paper"><div class="secthead">House rules</div>
      <ol><li data-i="1"><span>Throw six dice. Bank at least one, rethrow the rest.</span></li>
      <li data-i="2"><span>Lowest total wins. A <span class="kw crown">\u265B</span> crown is 0.</span></li>
      <li data-i="3"><span>You hit for the gap <b class="kw mult">\u00d7 your odds</b>.</span></li>
      <li data-i="4"><span>Charms, finishes and drinks raise your odds. Build fast.</span></li></ol></div>
    ${SAVED?`<div class="menu"><button class="btn go" id="cont0">Continue the night</button></div><div class="best" style="margin-top:-8px">${ACTS[SAVED.act].name}, floor ${ROMAN[SAVED.floor]} · ${SAVED.hp} nerve · $${SAVED.gold}${SAVED.at==='fight'&&SAVED.fight&&SAVED.fight.opp?` · at the table with ${SAVED.fight.opp.n}`:''}</div>`:''}
    <div class="picker paper" id="picker"></div></div>
    <div class="menu"><button class="btn ${SAVED?'ghost':'go hand'}" id="go">${SAVED?'New run':'Take a seat'}</button><button class="btn ghost" id="endless">Stay all night</button></div>
    <div class="best">${bestScore()?`House record: ${bestScore().toLocaleString()}`:''}${bestScore()&&best()?' · ':''}${best()?`Longest night: ${best()} tables`:''}${!bestScore()&&!best()?'Stay all night is endless mode.':''}</div>
  </div>`);
  $('#neonslot').appendChild(neonSign('Low Roller'));
  if(SAVED) $('#cont0').onclick=()=>{ ac(); SFX.ui(); clearDeco(); G=loadRun(); if(G) resumeRun(); else renderTitle(); };
  const pk=store('lr-pick')||{lim:0,pk:'regular'}; const top=limitTop(), nb=bossTotal(); const okP=POCKETS.filter(x=>nb>=x.need);
  const LOCK='<svg class="lk" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 7V5a4 4 0 0 1 8 0v2" fill="none" stroke="currentColor" stroke-width="2"/><rect x="2.5" y="7" width="11" height="8" rx="2" fill="currentColor"/></svg>';
  let lim=Math.min(pk.lim||0,top), pi=Math.max(0,POCKETS.findIndex(x=>x.k===pk.pk&&nb>=x.need));
  const paint=()=>{ const L=LIMITS[lim], P=POCKETS[pi], lL=lim>top, lP=nb<P.need;
    $('#picker').innerHTML=`<div class="pk ${lL?'locked':''}"><button class="pa" id="lm" aria-label="Lower limit" ${lim>0?'':'disabled'}>‹</button><div class="pv"><small>Limit ${lim+1}/${LIMITS.length}</small><b>${lL?LOCK:''}${L.n}</b><i>${L.d}${lim>1?' Plus everything below.':''}</i>${lL?`<em>Win a run at ${LIMITS[lim-1].n} to unlock</em>`:top<LIMITS.length-1&&lim===top?`<em>Win a run here to raise the limit</em>`:''}</div><button class="pa" id="lp" aria-label="Raise limit" ${lim<LIMITS.length-1?'':'disabled'}>›</button></div>
      <div class="pk ${lP?'locked':''}"><button class="pa" id="pm" aria-label="Previous">‹</button><div class="pv"><small>Walk in as ${pi+1}/${POCKETS.length}</small><b>${lP?LOCK:''}${P.n}</b><i>${P.d}</i>${lP?`<em>Beat ${P.need} boss${P.need>1?'es':''} to unlock (${nb}/${P.need})</em>`:''}</div><button class="pa" id="pp" aria-label="Next">›</button></div>`;
    const off=lL||lP; ['#go','#endless'].forEach(q=>{ const b=$(q); if(b){ b.disabled=off; b.classList.toggle('lockedbtn',off); } });
    const g=$('#go'); if(g){ if(!g.dataset.t) g.dataset.t=g.textContent; g.textContent=off?'Locked':g.dataset.t; }
    const sv=()=>{ if(!off) store('lr-pick',{lim,pk:P.k}); }; sv(); const go=(f)=>()=>{ SFX.ui(); f(); paint(); };
    $('#lm').onclick=go(()=>lim=Math.max(0,lim-1)); $('#lp').onclick=go(()=>lim=Math.min(LIMITS.length-1,lim+1));
    $('#pm').onclick=go(()=>pi=(pi+POCKETS.length-1)%POCKETS.length); $('#pp').onclick=go(()=>pi=(pi+1)%POCKETS.length); };
  paint();
  setTimeout(()=>{ if(!$('#picker')) return; (top>0?tip('limit'):Promise.resolve()).then(()=>{ if(okP.length>1&&$('#picker')) tip('pocket'); }); },1600);
  const start=mode=>()=>{ if(lim>top||nb<POCKETS[pi].need) return; ac(); SFX.ui(); clearDeco(); clearSave(); newRun(mode,lim,POCKETS[pi].k); renderMap(true); };
  $('#go').onclick=start('run'); $('#endless').onclick=start('endless');
  if(GL_OK){ clearInterval(decoTimer); const types=['d6','loaded','pebble','ember','gamble','coin'];
    const toss=async()=>{ if(decoTimer===null) return; const old=decoDice; decoDice=types.map(t=>makeDie3D(newDie(t))); if(old.length) gatherYours(old); await sleep(old.length?300:0); if(decoTimer===null){ gatherYours(decoDice); decoDice=[]; return; } await throwDice(decoDice,decoDice.map(o=>rollFace(o.inst.type)),'you'); };
    decoTimer=setInterval(()=>{ if(!document.hidden&&!PAUSED) toss(); },4600); toss(); }
}

/* ================= MAP: the bill of fare ================= */
const NODE={
  F:{t:'Table',d:'',pay:'$5 + pick'},
  E:{t:'Shark',d:'',pay:'$10 + charm'},
  S:{t:'The bar',d:'Dice and charms for sale. Sell charms you’re done with. A stiff drink.',pay:'you spend'},
  R:{t:'Back alley',d:'Rest, or get a die worked on.',pay:'free',ico:'\u263E'},
  '?':{t:'A stranger',d:'Someone wants something.',pay:'?',ico:'?'},
  B:{t:'Big Sal',d:'The owner. Beat her and the Nail is yours.',pay:'the keys'}};
const STYLE={1:'Tight. Only keeps 1s and crowns.',2:'Loose. Keeps anything 2 or under.'}, STYLE_S={1:'Tight',2:'Loose'};
function ensureMap(){ if(!G.map){ G.map=genMap(); G.trail=G.trail||[]; G.preview={}; } G.trail=G.trail||[]; }
function preview(){ ensureMap(); G.preview=G.preview||{}; const pv=G.preview[G.floor];
  if(!pv||pv.some(p=>p.x==null)) G.preview[G.floor]=mapReach(G.map,G.floor,G.trail).map(x=>{ const n=G.map[G.floor].find(o=>o.x===x).n; const nd=G.map[G.floor].find(o=>o.x===x), op='FEB'.includes(n)?chooseFoe(n):null; if(op&&nd.hot){ op.hp=Math.round(op.hp*1.4); op.odds+=1; op.hot=true; } return {n,x,hot:!!nd.hot,opp:op}; });
  return G.preview[G.floor]; }
// the whole act as a floor plan: climb from the bottom row to the owner at the top, one row at a time along the lines
const MAPI={F:'<svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="6.6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-dasharray="3.2 2.0"/><circle cx="10" cy="10" r="2.4" fill="currentColor"/></svg>',
  E:'<svg viewBox="0 0 20 20"><path d="M2.5 15.5 Q9 14 10.5 3 Q13 11 17.5 15.5 Z" fill="currentColor"/></svg>',
  B:'<svg viewBox="0 0 20 20"><path d="M2.5 15.5 L3.5 5.5 L7.5 10 L10 3.5 L12.5 10 L16.5 5.5 L17.5 15.5 Z" fill="currentColor"/></svg>',
  S:'<svg viewBox="0 0 20 20"><path d="M3.5 3.5 H16.5 L10.8 10.6 V15.6 H13.6 V17 H6.4 V15.6 H9.2 V10.6 Z" fill="currentColor"/></svg>',
  R:'<svg viewBox="0 0 20 20"><path d="M12.2 2.8 A7.4 7.4 0 1 0 17.4 13.4 A5.8 5.8 0 1 1 12.2 2.8 Z" fill="currentColor"/></svg>',
  '?':'<svg viewBox="0 0 20 20"><path d="M6.6 7.2 Q6.6 3.4 10 3.4 Q13.6 3.4 13.6 6.8 Q13.6 9 11 10.2 V12.2 H9 V9.2 Q11.6 8.2 11.6 6.8 Q11.6 5.3 10 5.3 Q8.6 5.3 8.6 7.2 Z M9 13.6 H11 V15.8 H9 Z" fill="currentColor"/></svg>'};
const MAPN={F:'Table',E:'Shark',B:'The owner',S:'The bar',R:'Back alley','?':'A stranger'};
function mapHTML(){ ensureMap(); const M=G.map, rows=M.length, rh=49, lx=x=>34+x*74, ly=r=>22+(rows-1-r)*rh, reach=mapReach(M,G.floor,G.trail);
  let ln='', nd='';
  M.forEach((row,r)=>row.forEach(o=>(o.to||[]).forEach(t=>{ const nx=M[r+1]&&M[r+1].find(n=>n.x===t); if(!nx) return; const done=G.trail[r]===o.x&&(G.trail[r+1]===nx.x||(r+1===G.floor&&false)); const open=r+1===G.floor&&G.trail[r]===o.x;
    ln+=`<line x1="${lx(o.x)}" y1="${ly(r)}" x2="${lx(nx.x)}" y2="${ly(r+1)}" class="${done?'done':open?'open':''}" ${open?`data-to="${nx.x}"`:''}/>`; })));
  M.forEach((row,r)=>row.forEach(o=>{ const here=G.trail[r]===o.x&&r<G.floor, can=r===G.floor&&reach.includes(o.x), gone=r<G.floor&&!here;
    nd+=`<button class="mn n-${o.n==='?'?'q':o.n} ${o.hot?'hot':''} ${here?'here':''} ${can?'can':''} ${gone?'gone':''} ${r>G.floor?'ahead':''}" data-x="${o.x}" data-r="${r}" style="left:${lx(o.x)}px;top:${ly(r)}px"  data-tip="${o.hot?'High-stakes room':MAPN[o.n]}${r===rows-1?'':' \u00b7 floor '+(r+1)}" ${can?'':'tabindex="-1"'}>${MAPI[o.n]}</button>`; }));
  return `<div class="plan" style="width:${lx(2)+36}px;height:${ly(0)+24}px"><svg class="planlines" width="${lx(2)+36}" height="${ly(0)+24}">${ln}</svg>${nd}</div>
    <div class="legend">${['F','E','?','S','R'].map(k=>`<span><i class="mn n-${k==='?'?'q':k}">${MAPI[k]}</i>${MAPN[k]}</span>`).join('')}</div>`; }
function entry(p,i){
  const boss=p.n==='B', nd=boss?{t:'Boss',pay:G.act===2&&G.mode==='run'?'the whole joint':'$20 + rare'}:p.hot?{t:'High stakes',pay:'$15 + rare'}:NODE[p.n];
  const el=h(`<button class="entry ${boss?'boss':''} ${p.hot?'hotroom':''} ${p.opp?'':'simple'}" style="animation-delay:${.08+i*.09}s"></button>`);
  if(p.opp){ const o=p.opp;
    el.innerHTML=`<div class="e-head"><span class="kind ${p.n}">${nd.t}</span><span class="pay">${nd.pay}</span></div>
      <div class="who">${o.n}</div><div class="whos">${o.s}</div>
      <div class="estats"><span class="stat n"><i>Nerve</i><b>${o.hp}</b></span><span class="stat h" data-tip="When they win a round, they hit you for the gap times this."><i>Hits</i><b>\u00d7${fmtOdds(o.odds)}</b></span><span class="stat" data-tip="${STYLE[o.t]}"><i>Plays</i><b>${STYLE_S[o.t]}</b></span></div>
      <div class="tags">${o.q.map(q=>`<span class="stamp" data-q="${q}" data-tip="${QUIRKS[q].desc}">${QUIRKS[q].name}</span>`).join('')}</div>
      <div class="dicerow"></div>
      ${(()=>{ const bad=Math.ceil(o.odds*(o.sig==='trick'?8:6)); return bad>=G.hp*.3||o.sig==='trick'?`<div class="warn" data-tip="A typical lost round here: about 6 behind \u00d7 their Hits${o.sig==='trick'?', more with your dice face down':''}.">Hits hard: one bad round can cost you ~${bad} nerve</div>`:''; })()}
      <div class="sig">${boss?`<b>Signature</b>${BOSS().sigT}`:''}</div>
      <span class="take">${boss?'Face them':'Take this seat'}</span>`;
    const dr=el.querySelector('.dicerow'); bagCounts(o.bag).forEach(([t,n])=>{ const k=h(`<span class="dk" data-tip="${DT[t].name}: ${DT[t].desc}"></span>`); k.appendChild(iconCanvas(t,null,26)); if(n>1) k.appendChild(h(`<span>\u00d7${n}</span>`)); dr.appendChild(k); });
    wireChips(el); }
  else el.innerHTML=`${svcIcon(nd.ico||'$',p.n==='?'?'stranger':null)}<div class="txt"><div class="ename">${nd.t}</div><div class="edesc">${nd.d}</div></div><span class="take">${p.n==='S'?'Walk up':p.n==='R'?'Step out':'Hear them out'}</span>`;
  el.dataset.x=p.x; el._go=()=>act(el,()=>{ G.path[G.floor]=p.n; G.trail[G.floor]=p.x; enterNode(p.n,p.opp); }); el.onclick=()=>pickStop(el);
  if(p.n==='F'&&p.opp&&G.floor>0){ const wp=h('<button class="walkpast" data-tip="Skip this table: no fight, no pay, no spoils. You pick up a chit instead.">Walk past for a chit</button>'); wp.onclick=e=>{ e.stopPropagation(); SFX.ui(); if(G.used) delete G.used[p.opp.n]; G.path[G.floor]=p.n; G.trail[G.floor]=p.x; gainChit(pick(CHIT_KEYS)); saveRun(); setTimeout(advance,600); }; el.appendChild(wp); }
  return el;
}
function routeLine(){ return `<div class="route">${FLOORS.map((_,i)=>{ const done=i<G.floor, now=i===G.floor, boss=i===FLOORS.length-1;
  return `<span class="rn ${done?'done':''} ${now?'now':''} ${boss?'boss':''}" data-tip="${boss?'Boss':'Floor '+(i+1)}"></span>`; }).join('')}</div>`; }
// picking a stop: the first tap shows which card is which spot on the plan (and the line you'd walk), the second goes
function pickStop(el){ const all=[...document.querySelectorAll('#stops .entry')];
  if(all.length<=1||el.classList.contains('sel')) return el._go();
  SFX.ui(); all.forEach(e=>{ e.classList.toggle('sel',e===el); e.classList.toggle('unsel',e!==el); const t=e.querySelector('.take'); if(t){ t.dataset.t0=t.dataset.t0||t.textContent; t.textContent=e===el?'Tap again to go':t.dataset.t0; } });
  const x=el.dataset.x; document.querySelectorAll('#plan .mn.can').forEach(b=>b.classList.toggle('sel',b.dataset.x===x));
  document.querySelectorAll('#plan line[data-to]').forEach(l=>l.classList.toggle('pick',l.dataset.to===x));
  if(el.scrollIntoView) el.scrollIntoView({block:'nearest',behavior:REDUCED?'auto':'smooth'}); }
function renderMap(fresh){
  F=null; clearLabels(); setActTheme(G.act); G.at='map'; G.fight=G.rw=G.shop=G.ev=null;
  const opts=preview(); saveRun();
  screen(`${hud()}<div class="modal mapm paper pe">
    <div class="mhead"><div class="sc">Act ${ROMAN[G.act]}${G.mode==='endless'?` \u00b7 Lap ${G.lap+1}`:''} \u00b7 Floor ${G.floor+1} of ${FLOORS.length}</div>
      <div class="mtitle">${ACTS[G.act].name}</div>
      ${G.rep||G.limit?`<div style="margin-top:8px;display:flex;gap:6px;justify-content:center;flex-wrap:wrap">${G.limit?`<span class="kw mult">${LIMITS[G.limit].n}</span>`:''}${G.rep?`<span class="kw odds">Reputation +${G.rep} odds</span>`:''}</div>`:''}</div>
    <div class="mapcols"><div class="floorplan" id="plan">${mapHTML()}</div>
    <div class="mapside"><div class="secthead">${opts.length>1?'Pick one':'Next up'}</div><div class="entries" id="stops"></div></div></div></div>`);
  opts.forEach((p,i)=>$('#stops').appendChild(entry(p,i)));
  const plan=$('#plan'); plan.querySelectorAll('.mn.can').forEach(b=>{ const e=()=>$(`#stops .entry[data-x="${b.dataset.x}"]`);
    b.onmouseenter=()=>{ const x=e(); if(x) x.classList.add('hl'); }; b.onmouseleave=()=>{ const x=e(); if(x) x.classList.remove('hl'); }; b.onclick=()=>{ const x=e(); if(x) pickStop(x); }; });
  $('#stops').querySelectorAll('.entry').forEach(en=>{ const b=()=>plan.querySelector(`.mn.can[data-x="${en.dataset.x}"]`); en.addEventListener('mouseenter',()=>{ const x=b(); if(x) x.classList.add('hl'); }); en.addEventListener('mouseleave',()=>{ const x=b(); if(x) x.classList.remove('hl'); }); });
  setTimeout(()=>{ if(G&&$('#stops')) tip('map').then(()=>{ if(G&&opts.some(p=>p.hot)) tip('hot'); }); },fresh?2300:400);
  if(fresh){ const t=$('.mtitle'); if(t) t.classList.add('lightup'); SFX.fanfare&&G.floor===0&&G.act>0&&SFX.fanfare(); }
}
// Continue: back to exactly where the save left off. Old saves have no `at` and land on the map.
function resumeRun(){ setActTheme(G.act); const a=G.at;
  if(a==='fight'&&G.fight&&G.fight.opp) return startFight(G.fight.kind,null,G.fight);
  if(a==='reward'&&G.rw) return renderReward(G.rw.kind);
  if(a==='bar') return renderShop();
  if(a==='rest') return renderRest();
  if(a==='event') return renderEvent();
  if(a==='victory') return renderVictory();
  renderMap(true); }
function enterNode(n,opp){ clearDebris(); { const pv=G.preview&&G.preview[G.floor]; if(pv) pv.forEach(p=>{ if(p.opp&&p.opp!==opp&&G.used) delete G.used[p.opp.n]; }); } if(n==='S') return renderShop(); if(n==='R') return renderRest(); if(n==='?') return renderEvent(); startFight(n,opp); }
function advance(){ G.floor++; if(G.floor<FLOORS.length) return renderMap();
  if(G.mode==='run'&&G.act===2) return renderVictory();
  if(G.mode==='endless'&&G.act===2) G.lap++;
  G.act=(G.act+1)%3; G.floor=0; G.path=[]; G.map=genMap(); G.trail=[]; G.used={}; G.preview={};
  const b=G.hp; G.hp=Math.min(G.maxHp,G.hp+Math.ceil(G.maxHp*LIM().stairs)); renderMap(true); if(G.hp>b) toast(`You catch your breath on the stairs. <b>+${G.hp-b}</b> nerve.`); }

/* ================= FIGHT ================= */
function chooseFoe(kind){ let def; const A=ACTS[G.act].foes;
  // nobody sits down twice in the same room (sharks included); if a pool runs dry, anyone but the last face you saw
  const fresh=pool=>{ const un=pool.filter(p=>!G.used[p.n]); const d=pick(un.length?un:pool.filter(p=>p.n!==G.lastFoe).length?pool.filter(p=>p.n!==G.lastFoe):pool); G.used[d.n]=1; return d; };
  if(kind==='B') def=BOSS();
  else if(kind==='E') def=fresh(G.floor<=3?A.e1:A.e2);
  else { let pool=G.floor<=3?A.t1:A.t2; if(G.floor<2&&G.lap===0&&G.act===0) pool=pool.filter(p=>!(p.q||[]).some(q=>!QUIRKS[q].help)); def=fresh(pool); }
  return makeOpp(def,kind,G.act,G.floor,G.lap,kind==='F'&&G.act===0&&G.floor<2&&G.lap===0,G.limit,hasDeed(G,'badrep')?1.15:1); }
// a new round starts on a clean table: anything still sitting there (not mid-flight off the table) goes
function sweepDice(){ ALLDICE.forEach(o=>{ if(!o.flying) disposeDie(o); }); decoDice=decoDice.filter(o=>ALLDICE.has(o)); }
let _fightAt=0;
// what a fight carries from round to round (startRound resets everything else). Saved as G.fight:
// at the fight's start and between rounds (no sim), at each round start (+ their pre-rolled throw and
// the seed for your draw and throws), and when the round ends (+ end: the result, replayed on reload)
const FIGHT_KEYS=['oppHp','oppMax','round','wins','streak','heavy','phase2','rabbitUsed','wonOnce','thumb','bumped','wall','gated'];
function saveFight(x){ if(!G||!F) return; const s={kind:F.kind,opp:F.opp}; FIGHT_KEYS.forEach(k=>{ if(F[k]!==undefined) s[k]=F[k]; }); G.at='fight'; G.fight={...s,...(x||{})}; saveRun(); }
// your draw and throws come off a per-round seeded stream, so reloading can't reroll them
function mkRng(a){ a=a>>>0; return ()=>{ a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
function seeded(fn){ if(!F||!F.rng) return fn(); const m=Math.random; Math.random=F.rng; try{ return fn(); } finally{ Math.random=m; } }
async function startFight(kind,pre,snap){
  if(!snap&&performance.now()-_fightAt<1500) return; _fightAt=performance.now();
  clearDeco(); ALLDICE.forEach(o=>disposeDie(o));
  const opp=snap?snap.opp:(pre||chooseFoe(kind)); if(G) G.lastFoe=opp.n;
  F={kind,opp,oppHp:opp.hp,oppMax:opp.hp,round:0,you:[],them:[],phase2:false,labelsOn:false,thumb:2,wall:(G.charms.includes('flask')?6:0)+(G.charms.includes('haymaker')?4:0)};
  if(snap) FIGHT_KEYS.forEach(k=>{ if(snap[k]!==undefined) F[k]=snap[k]; }); else saveFight();
  screen(`${hud()}
    <div class="nameplate paper pe" id="plate">
      <div class="np-top"><span class="np-kind">${kind==='B'?'Boss':kind==='E'?'Shark':'Table'}</span><span class="foe-name">${opp.n}</span></div>
      <div class="np-bar"><div class="inkbar foe"><i id="obar" style="width:100%"></i></div><span class="tabnum" id="otxt">${opp.hp}</span></div>
      <div class="stamps" id="quirks">${quirkChips()}</div>
      <div class="sitting" id="sitting"><span>Taking a seat</span></div>
    </div>
    <div class="bottom">
      <div class="msg" id="msg"></div>
      <div class="slipcol"><div class="oddsline" id="oddsline"></div>
      <div class="yourtab paper pe">
        <div class="duel"><div class="figure" id="pscore">0<small>You</small></div><span class="vs">vs</span><div class="figure them" id="vs">–<small>Them</small></div><div class="guard" id="guard" data-tip="Guard soaks hits before your nerve, and it stays between rounds at this table."></div></div>
        <button class="eq" id="eq" aria-label="How hits work">
          <span class="cell gap" id="eqgap"><b>–</b><small>Ahead by</small></span><span class="op">\u00d7</span>
          <span class="cell odds" id="odds"><b>1</b><small>Your odds</small></span><span class="op">=</span>
          <span class="cell pays" id="pays"><b>–</b><small>They lose</small></span>
        </button>
        <div class="acts" id="acts"></div>
      </div></div>
    </div>`);
  wireChips(ui); F.target=null; updOpp(); updOdds(); updGuard(); $('#eq').onclick=()=>{ SFX.ui(); oddsHelp(); };
  busy=true;
  if(GL_OK){ buildFoe({...opp.look,...(LOOKX[opp.n]||{})}); if(kind==='B'&&!snap){ for(const v of [.3,1,.2,1]){ lampDim=v; await sleep(90); } } await foeWalkIn(); }
  if(snap){ if(!F||F.opp!==opp) return; if(snap.end) return resumeEnd(snap.end); return startRound(snap.sim?snap:null); }
  if(kind==='B'){ banner(opp.n,opp.sigT||'Signature: see the bill of fare',true); await foeSlam(); }
  seen('o',opp.n); opp.q.forEach(q=>seen('q',q)); if(opp.q.length) await tip('quirk'); if(opp.q.some(q=>RULE_Q.includes(q))) await tip('counter'); if(kind==='B'){ await tip('boss'); if(opp!==ACTS[G.act].foes.boss&&ACTS[G.act].foes.bosses.some(b=>b.n===opp.n&&b!==ACTS[G.act].foes.boss)) await tip('altboss'); }
  startRound();
}
const quirkChips=()=>`<span class="stamp odds" data-tip="When the opponent wins a round, they hit you for the gap times this.">Hits \u00d7${fmtOdds(theirOdds(F.opp,{intent:F.intent,round:F.round||1}))}</span>`+(F.intent?`<span class="stamp intent i-${F.intent}" data-tip="This round: ${INTENTS[F.intent].desc}">${INTENTS[F.intent].name}</span><span class="stamp next" data-tip="Next round: ${INTENTS[F.next].desc}">Next: ${INTENTS[F.next].name}</span>`:'')+F.opp.q.map(q=>`<button class="stamp" data-q="${q}" data-tip="${QUIRKS[q].desc}">${QUIRKS[q].name}</button>`).join('');
function msg(x){ const m=$('#msg'); if(m) m.innerHTML=x; }
function acts(x){ const a=$('#acts'); if(a) a.innerHTML=x; }
function setP(v){ const e=$('#pscore'); if(e) e.innerHTML=`${v<0?'\u2212'+(-v):v}<small>You</small>`; }
function setVs(v){ const e=$('#vs'); if(e) e.innerHTML=`${v}<small>Them</small>`; }
function updOpp(){ const b=$('#obar'); if(!b) return; b.style.width=Math.max(0,100*F.oppHp/F.oppMax)+'%'; $('#otxt').textContent=`${Math.max(0,F.oppHp)}`; }
function finsOf(list){ return list.map(o=>{ const f=o.inst.fin; if(f!=='lucky') return f||null; return has('rabbitp')||luckyHit(F.pre?F.pre.seed:0,o.inst.uid)?'lucky':null; }); }
function ctx(){ const q=F.opp.q; return {cold:(q.includes('cold')||F.intent==='crowns')&&F.throwNo<=1,penny:has('penny')&&F.throwNo<=1,deuces:has('deuces'),ringer:has('ringer'),crownless:q.includes('crownless'),snakebit:q.includes('snakebit')&&F.throwNo<=1}; }
const tray=()=>F.you.filter(o=>!o.banked);
function minBank(){ return F.opp.q.includes('fuse')&&F.throwNo===1?Math.min(2,tray().length):1; }

async function startRound(pre){
  if(!F) return; const myF=F; sweepDice(); fitCam(); busy=true; if(!pre) F.round++; F.pScore=0; F.oScore=0; F.target=null; F._shownT=null; F._prevR=null; F.R=newRound(); F.spoonUsed=false; F.throwNo=0; F.railN={you:0,them:0}; F.labelsOn=false;
  setP(0); setVs('–'); acts(''); updOdds(); $('#sitting').innerHTML='<span>Shaking the cup</span>';
  msg(`Round ${F.round}. <b>${F.opp.n}</b> throws first.`);
  if(!pre){ const intent=F.next||rollIntent(F.kind), next=rollIntent(F.kind), tt=intentT(F.opp,intent); pre={intent,next,sim:aiRound(F.opp.bag,tt),simB:F.opp.q.includes('pair')?aiRound(F.opp.bag,tt):null,seed:(Math.random()*4294967296)>>>0,jinx:jinxPick(G.charms,F.opp.q)}; }
  F.intent=pre.intent||'steady'; F.next=pre.next||'steady'; F.raise=false; F.folded=false; F.shakes=shakesFor(G.charms,G); F.shook=0; F.freeShake=has('spoon');
  { const qz=$('#quirks'); if(qz){ qz.innerHTML=quirkChips(); wireChips(qz); } } if(F.intent!=='steady') tip('intent');
  F.jinx=pre.jinx||null; F.drink={}; refreshRack(); if(F.jinx) toast(`<b class="r">Jinx.</b> ${CHARMS[F.jinx].name} sits this round out.`);
  F.pre={sim:pre.sim,simB:pre.simB||null,seed:pre.seed>>>0,intent:F.intent,next:F.next}; F.rng=mkRng(F.pre.seed); saveFight(F.pre);
  let sim=F.pre.sim;
  await tip('theirs');
  TS=SET.speed;
  F.them=F.opp.bag.map(t=>makeDie3D(newDie(t)));
  F.them.forEach(o=>{ o.mesh.visible=false; SCN.add(o.mesh); });
  let shown=0; F.theirTurn=true;
  const dm=(G.stats&&G.stats.rounds>0)?(SET.deal||'quick'):'full';
  if(dm!=='full'&&!F.opp.q.includes('pair')&&F.opp.sig!=='trick'){
    const fin=[], ord=[]; sim.throws.forEach(th=>th.kept.forEach(i=>{ fin[i]=th.faces[th.left.indexOf(i)]; ord.push(i); }));
    if(dm==='quick'&&GL_OK&&foe){ const mp=await cupThrow(); await throwDice(F.them,fin,'them',-1,{from:mp,dur:700}); cupRest(); await sleep(200); }
    else if(dm==='quick') await throwDice(F.them,fin,'them');
    if(F!==myF) return;
    for(const i of ord){ if(F!==myF) return; const o=F.them[i]; o.banked=true; const v=effVal(o.face); shown+=v;
      if(dm==='instant'){ setFaces(o,fin[i],false); o.mesh.visible=true; const t=railSlot(F.railN.them++,'them'); o.mesh.position.set(t.x,3,t.z); moveTo(o,t,BANK_SCALE,260); SFX.bank(0); await sleep(50); }
      else { SFX.bank(0); moveTo(o,railSlot(F.railN.them++,'them'),BANK_SCALE,320); await sleep(70); } }
    $('#sitting').innerHTML=`<span>Sitting on</span><b>${shown}</b>`; await sleep(dm==='instant'?380:300);
  } else
  for(const th of sim.throws){
    if(F!==myF) return;
    const list=th.left.map(i=>F.them[i]);
    if(GL_OK&&foe){ if(th!==sim.throws[0]) await cupScoop(list); const mp=await cupThrow(); await throwDice(list,th.faces,'them',-1,{from:mp,dur:800}); cupRest(); }
    else await throwDice(list,th.faces,'them');
    if(foe) foe.userData.lookX=list.reduce((a,o)=>a+o.mesh.position.x,0)/list.length;
    await sleep(240); if(F!==myF) return;
    for(const i of th.kept){ const o=F.them[i]; o.banked=true; const v=effVal(o.face); shown+=v; SFX.bank(0); floatAt(dieScreen(o),v===0?'0':'+'+v,v===0?'zero':'pts'); moveTo(o,railSlot(F.railN.them++,'them'),BANK_SCALE,380); await sleep(110); }
    $('#sitting').innerHTML=`<span>Sitting on</span><b>${shown}</b>`;
    await sleep(320);
  }
  if(F!==myF) return; F.theirTurn=false;
  if(F.opp.q.includes('pair')){ sim=await secondTwin(sim,shown,F.pre.simB); if(F!==myF) return; }
  F.oScore=sim.total; F._shownT=null;
  const adj=tAdj();
  F.target=Math.max(0,F.oScore+adj); { const t=tgt(newRound()); if(t!==F.target&&F.intent==='tired') F.target=t; }
  $('#sitting').innerHTML=`<span>Sitting on</span><b>${F.target}</b>${adj?`<em>(${F.oScore} ${adj>0?'+':'\u2212'} ${Math.abs(adj)})</em>`:''}`;
  F.tHid=null;
  if(LIM().hideE&&F.kind==='E'&&!F.opp.q.includes('pair')){ const th=sim.throws[sim.throws.length-1], i=th&&th.kept[th.kept.length-1], o=i!=null&&F.them[i]; if(o){ F.tHid={i}; setFaces(o,o.face,true); const v=effVal(o.face); $('#sitting').innerHTML=`<span>Sitting on</span><b>${F.target-v}+?</b>`; } }
  setVs(F.tHid?'?':F.target); updOdds();
  msg(F.tHid?`One of their dice is face-down. You'll see it after your first bank.`:`Get under <b>${F.target}</b>. Click the dice you want to keep, then bank them.`);
  if(foe) foe.userData.lookX=0;
  TS=1;
  if(F.opp.q.includes('tax')&&G.gold>0){ addGold(-1,$('#cash')); toast('<b class="r">Cover Charge.</b> A dollar for the seat.'); }
  const draw=Math.min(G.bag.length,handSize(G)+(F.heavy?1:0)); if(F.heavy&&G.bag.length<=handSize(G)) F.heavy=false; if(F.heavy){ toast('<b class="r">Heavy Hand.</b> You draw an extra die this round.'); F.heavy=false; }
  if(isRaid(F.opp,F.round,F.phase2)){ banner('Raid!','Your odds are 1 this round',true); SFX.lose&&SFX.lose(); }
  const hand=seeded(()=>shuffle(G.bag)).slice(0,draw);
  F.hand=hand; F.you=hand.map(makeDie3D);
  if(F.opp.sig==='gift'){ const n=F.phase2?2:1; const idx=seeded(()=>shuffle([...F.you.keys()])).slice(0,n); idx.forEach(i=>{ disposeDie(F.you[i]); F.you[i]=makeDie3D(newDie('d8')); F.hand[i]=null; }); F.hand=F.hand.filter(Boolean); msg(`The Countess swaps ${n===1?'one of your dice':'two of your dice'} for her <b>Octo</b>${n===1?'':'s'}.`); SFX.coin(); }
  F.hand.forEach(d=>{ if(DT[d.type].breaks) d.cracks++; });
  await sleep(150);
  await playerThrow();
}
function updGuard(){ const g=$('#guard'); if(!g||!F) return; g.textContent=F.wall?`Guard ${F.wall}`:''; g.classList.toggle('on',!!F.wall); }
function tAdj(){ return (has('bouncer')?1:0)-(F.opp.q.includes('edge')?1:0)+(F.opp.q.includes('sloppy')?1:0); }
async function playerThrow(){
  const myF=F; busy=true; F.throwNo++;
  const list=tray(); list.forEach(o=>setSel(o,false));
  const finals=seeded(()=>list.map(o=>rollInst(o.inst)));
  const nh=Math.min(list.length-1,F.opp.sig==='trick'?(F.phase2?2:1):(F.opp.q.includes('haze')&&F.throwNo===1?1:0)), hid=seeded(()=>shuffle([...list.keys()])).slice(0,Math.max(0,nh));
  list.forEach((o,i)=>{ if(o.inst.type==='twin'&&!hid.includes(i)){ let b=null; list.forEach((x,j)=>{ if(j!==i&&x.inst.type!=='twin'&&!hid.includes(j)){ if(b===null||effVal(finals[j],ctx())<effVal(b,ctx())) b=finals[j]; } }); if(b!==null) finals[i]=b; } });
  await throwDice(list,finals,'you',hid); if(F!==myF) return;
  F.labelsOn=true;
  list.forEach((o,i)=>{ if(finals[i]==='C'&&!hid.includes(i)) sparksAt(dieScreen(o)); });
  if(foe) foe.userData.lookX=0;
  if(F.throwNo===1&&has('sleight')){ const hi=tray().filter(o=>!o.hidden&&typeof o.face==='number'&&effVal(o.face,ctx())>=4); if(hi.length){ msg('<b>Sleight of Hand.</b> The high ones go again.'); trigFx('Sleight of Hand','\u21bb',0); await hopDice(hi); } }
  if(F.opp.sig==='slam'&&F.phase2&&F.throwNo===1&&foe){ await foeSlam(); const best=tray().filter(o=>!o.hidden).sort((a,b)=>effVal(a.face,ctx())-effVal(b.face,ctx())).slice(0,2); if(best.length){ msg('Sal slams the table. Your two best dice jump.'); await hopDice(best); } }
  busy=false; refreshActs(); if(F.throwNo===1) tip('yours');
}
async function hopDice(list){ F.labelsOn=false; await Promise.all(list.map((o,i)=>{ const f=seeded(()=>rollInst(o.inst)); const m=o.mesh, h0=o.home.clone(); o.flying=true; setFaces(o,f,false); const q0=m.quaternion.clone(); const qEnd=new THREE.Quaternion().setFromEuler(new THREE.Euler(0,(Math.random()-.5)*.8,0)); if(o.restQ) qEnd.multiply(o.restQ); o.qEnd=qEnd; const ax=new THREE.Vector3(Math.random()-.5,0,Math.random()-.5).normalize();
    return sleep(i*60).then(()=>anim(620,k=>{ m.position.set(h0.x,h0.y+Math.sin(k*Math.PI)*1.1,h0.z); const qs=q0.clone().premultiply(new THREE.Quaternion().setFromAxisAngle(ax,k*Math.PI*3)); m.quaternion.copy(k<.7?qs:qs.slerp(qEnd,(k-.7)/.3)); })).then(()=>{ m.quaternion.copy(qEnd); uprightTop(o); o.flying=false; SFX.land(.8); if(f==='C') sparksAt(dieScreen(o)); }); })); F.labelsOn=true; }
function toggleSel(o){ if(busy||o.banked||o.flying) return; setSel(o,!o.sel); if(o.sel){ dustAt(toScreen(o.mesh.position)); const m=o.mesh; let last=0; anim(320,k=>{ const e=ease.out(k); m.rotateOnWorldAxis(new THREE.Vector3(0,1,0),(e-last)*Math.PI*2); last=e; }); } o.pop=1; o.sel?SFX.pick():SFX.unpick(); refreshActs(); }
function refreshActs(){
  if(!F) return; const sel=tray().filter(o=>o.sel), need=minBank();
  const proj=bankVals(sel.map(o=>o.face),ctx(),live(),sel.length===tray().length,sel.map(o=>o.inst.fin)).reduce((a,b)=>a+b,0); updOdds(false,sel);
  const pre1=F.throwNo===1&&F.R.throws===0&&!F.folded, B=[], fd=foldDmg(F.opp,F.intent);
  if(F.shakes>0){ const cup=hasDeed(G,'loadedcup'), free=F.freeShake; B.push(`<button class="btn ghost small" id="shake" ${sel.length?'':'disabled'} data-tip="Rethrow the dice you picked without banking them. ${free?'This one is free (Bent Spoon).':'Costs you: their score counts 1 lower this round.'}${cup?' Loaded Cup: also costs 1 nerve.':` ${F.shakes} left this round.`}">Shake${cup||F.shakes<2?'':` \u00d7${F.shakes}`}</button>`); }
  if(has('thumb')&&F.thumb>0) B.push(`<button class="btn ghost small" id="nudge" ${sel.length===1&&typeof sel[0].face==='number'&&sel[0].face>=2&&!sel[0].hidden?'':'disabled'} data-tip="Turn the one die you picked down by 1. ${F.thumb} left at this table.">Nudge \u00b7 ${F.thumb}</button>`);
  if(has('bump')&&!F.bumped&&F.R.throws===0&&!F.opp.q.includes('pair')) B.push(`<button class="btn ghost small" id="bump" data-tip="Once per table: their lowest die gets thrown again.">Bump</button>`);
  if(pre1&&!F.raise) B.push(`<button class="btn ghost small raise" id="raise" data-tip="Before your first bank: double the stakes. Whoever wins this round hits twice as hard.">Raise</button>`,`<button class="btn ghost small fold" id="fold" data-tip="Before your first bank: give up the round and take ${fd} instead of whatever you'd lose.">Fold \u00b7 ${fd}</button>`);
  acts(`${B.length?`<div class="minis">${B.join('')}</div>`:''}<button class="btn go" id="bank" ${sel.length>=need?'':'disabled'}>${sel.length?`Bank ${sel.length}${sel.some(o=>o.hidden)?'':` \u00b7 +${proj}`}`:need>1?'Pick two':'Pick dice'}</button>`);
  $('#bank').onclick=bank;
  const sh=$('#shake'); if(sh) sh.onclick=async()=>{ if(busy) return; const s=tray().filter(x=>x.sel); if(!s.length) return; F.shakes--; if(F.freeShake) F.freeShake=false; else { F.shook=(F.shook||0)+1; const T=tgt(); setVs(T); F._shownT=T; floatEl($('#vs'),'\u22121','dmg'); const sb=$('#sitting b'); if(sb&&!F.tHid) sb.textContent=T; } if(hasDeed(G,'loadedcup')&&G.hp>1){ G.hp--; G.stats.taken++; updTop(); floatEl($('#hpbar'),'\u22121','dmg'); } busy=true; acts(''); s.forEach(o=>setSel(o,false)); SFX.rattle(350);
    const fin=seeded(()=>s.map(o=>rollInst(o.inst))); await throwDice(s,fin,'you',s.map((o,i)=>o.hidden?i:-1).filter(i=>i>=0),{slots:s.map(o=>o.home.clone())}); s.forEach(o=>{ if(o.face==='C') sparksAt(dieScreen(o)); }); busy=false; refreshActs(); tip('shake'); };
  const nu=$('#nudge'); if(nu) nu.onclick=()=>{ if(busy) return; const o=tray().find(x=>x.sel); if(!o||typeof o.face!=='number'||o.face<2) return; F.thumb--; setFaces(o,o.face-1,false); uprightTop(o); setSel(o,false); SFX.tok(); floatAt(dieScreen(o),'\u22121','zero'); trigFx('Loaded Thumb','\u22121',0); refreshActs(); };
  const bu=$('#bump'); if(bu) bu.onclick=async()=>{ if(busy) return; F.bumped=true; const b=seeded(()=>bumpLowest(F.pre.sim,F.opp.bag)); if(!b){ refreshActs(); return; } busy=true; acts(''); const o=F.them[b.i];
    SFX.slam(); shake(.12); trigFx('Bump the Table','!',0); if(o){ const y0=o.mesh.position.y; await anim(380,k=>{ o.mesh.position.y=y0+Math.sin(k*Math.PI)*.9; o.mesh.rotation.x+=.35; o.mesh.rotation.z+=.2; }); setFaces(o,b.face,false); o.mesh.position.y=y0; uprightTop(o); SFX.land(.7); floatAt(dieScreen(o),(b.delta>=0?'+':'\u2212')+Math.abs(b.delta),b.delta>0?'pts':'zero'); }
    F.oScore+=b.delta; const adj=tAdj(); F.target=Math.max(0,F.oScore+adj); F._shownT=null;
    $('#sitting').innerHTML=`<span>Sitting on</span><b>${F.target}</b>${adj?`<em>(${F.oScore} ${adj>0?'+':'\u2212'} ${Math.abs(adj)})</em>`:''}`; setVs(F.target);
    msg(b.delta>0?`The table jumps. They're sitting on <b>${F.target}</b> now.`:b.delta<0?`Bad luck: it landed lower. <b>${F.target}</b>.`:'The table jumps. Same number.'); busy=false; refreshActs(); };
  const ra=$('#raise'); if(ra) ra.onclick=()=>{ if(busy) return; F.raise=true; SFX.stamp(); shake(.08); banner('Raise','Stakes \u00d72 this round'); refreshActs(); tip('raise'); };
  const fo=$('#fold'); if(fo) fo.onclick=()=>{ if(busy) return; if(!fo.dataset.sure){ fo.dataset.sure=1; fo.textContent='Sure? Fold'; SFX.ui(); return; } F.folded=true; busy=true; acts(''); endRound(); };
}
async function bank(){
  if(busy||!F) return; const sel=tray().filter(o=>o.sel); if(sel.length<minBank()) return;
  busy=true; acts('');
  if(F.tHid){ const o=F.them[F.tHid.i]; F.tHid=null; if(o){ setFaces(o,o.face,false); uprightTop(o); sparksAt(dieScreen(o)); } const adj=tAdj(); $('#sitting').innerHTML=`<span>Sitting on</span><b>${F.target}</b>${adj?`<em>(${F.oScore} ${adj>0?'+':'\u2212'} ${Math.abs(adj)})</em>`:''}`; setVs(F.target); SFX.paper(); }
  const faces=sel.map(o=>o.face), oddsBefore=curOdds().odds, partsBefore=curOdds().parts;
  const fins=finsOf(sel), vals=bankVals(faces,ctx(),live(),sel.length===tray().length,sel.map(o=>o.inst.fin));
  const ph0=playsHit(F.R,{}), ones0=F.R.ones||0; noteBank(F.R,faces,sel.map(o=>o.inst.type),live(),fins);
  if(has('bulldog')&&(F.R.ones||0)>ones0){ F.wall=(F.wall||0)+(F.R.ones-ones0); updGuard(); trigFx('The Bulldog','+'+(F.R.ones-ones0),0); }
  playsHit(F.R,{}).filter(k=>!ph0.includes(k)).forEach((k,i)=>setTimeout(()=>{ const lv=playLv(G.plays,k); floatEl($('#eq'),`${PLAYS[k].name}!`,'odds play'); SFX.ding(4+i); tip('plays'); },350+i*300));
  { const gl=sel.filter(o=>o.inst.fin==='goldleaf'&&(o.face===1||o.face==='C'||o.face==='G')).length; if(gl) setTimeout(()=>addGold(gl,$('#cash')),300); if(fins.includes('lucky')) setTimeout(()=>toast('<b class="g">Lucky.</b> +4 odds.'),200); }
  for(let i=0;i<sel.length;i++){ const o=sel[i]; o.banked=true; setSel(o,false); if(o.label) o.label.style.opacity=0;
    if(o.hidden) setFaces(o,o.face,false);
    SFX.bank(i); floatAt(dieScreen(o),vals[i]<0?'\u2212'+(-vals[i]):vals[i]===0?'0':'+'+vals[i],vals[i]<=0?'zero':'pts');
    if(o.face==='C'||o.face==='G') crownFx(o);
    moveTo(o,railSlot(F.railN.you++,'you'),BANK_SCALE,400); await sleep(120); }
  G.stats.banked+=sel.length; G.stats.crowns+=sel.filter(o=>o.face==='C'||o.face==='G').length;
  const before=F.pScore; F.pScore+=vals.reduce((a,b)=>a+b,0); { const T=tgt(), T0=F._shownT??F.target; if(T!==T0){ F._shownT=T; setVs(T); floatEl($('#vs'),(T>T0?'+':'\u2212')+Math.abs(T-T0),T>T0?'heal':'dmg'); } }
  await anim(320,k=>setP(Math.round(lerp(before,F.pScore,k))));
  { const after=curOdds().parts, bmap={}; partsBefore.forEach(([l,v])=>bmap[l]=v); let i=0; after.forEach(([l,v])=>{ if(bmap[l]!==v&&CHARM_BY_NAME[l]) setTimeout(()=>trigFx(l,v,i),80+i*110), i++; }); }
  const oa=curOdds().odds; updOdds(oa>oddsBefore); if(oa>oddsBefore){ SFX.odds(); tip('odds'); }
  const left=tray().length;
  if(left){ const T=tgt(); msg(F.pScore>T?`Over by <b>${F.pScore-T}</b>. Every die from here still counts.`:`<b>${F.pScore}</b> against <b>${T}</b>. ${left} ${left===1?'die':'dice'} left.`); F.labelsOn=false; await sleep(260); await tip('again'); await playerThrow(); }
  else { const T=tgt(); msg(`You finished on <b>${F.pScore}</b> against <b>${T}</b>.`); await sleep(420); await endRound(); }
}
function crownFx(o){ const p=dieScreen(o); sparksAt(p, o.face==='G'?'#ff5c6f':null);
  const tag=t=>floatAt({x:p.x,y:p.y-34},t,'odds');
  if(o.face==='G') tag('+1 odds');
  if(o.face==='C'&&o.inst.type==='ember'){ tag('+2 odds'); sparksAt(p,'#ff7a2a'); }
  if(o.face==='C'&&o.inst.type==='gamble'){ tag('\u00d72 odds'); addGold(3,$('#cash')); }
  if(o.face==='C'&&o.inst.type==='gilded'){ tag('+$2'); addGold(2,$('#cash')); }
  if(o.face==='C'&&o.inst.type==='bomb'&&F&&F.oppHp>1){ const d=Math.min(F.oppHp-1,bombDmg(F.oppMax)); F.oppHp-=d; G.stats.dealt+=d; updOpp(); floatEl($('#obar'),'\u2212'+d,'dmg'); sparksAt(p,'#ff5a2a'); shake(.18); SFX.hit&&SFX.hit(); }
  if(has('hothand')) heal(1,$('#hpbar'));
  if(has('goldcrown')) addGold(1,$('#cash')); }
// what you'd be paid right now, if the round ended on your current score
const tgt=(R)=>F.target==null?null:targetOf(F.oScore,R||F.R||newRound(),live(),F.opp.q,{drink:F.drink,intent:F.intent,shook:F.shook||0});
function oddsEnv(done){ return {rack:G.charms,shook:F.shook||0,guard:F.wall||0,deeds:G.deeds||[],intent:F.intent,raise:F.raise?1:0,plays:G.plays||{},drink:F.drink||{},finished:G.bag.filter(d=>d.fin).length,fixOdds:hasFix(G,'felt')?1:0,bag:G.bag.length,round:F.round,q:F.opp.q,raid:isRaid(F.opp,F.round,F.phase2),gold:G.gold,rep:G.rep,tally:G.tally,wins:F.wins||0,margin:F.target!=null?tgt()-F.pScore-(has('bouncer')?1:0):0,score:F.pScore,done,grow:G.grow||{},oppHalf:F.oppHp<=F.oppMax/2,wonOnce:!!F.wonOnce}; }
function curOdds(done,R){ return oddsOf(R||F.R||newRound(),live(),oddsEnv(done)); }
function updOdds(bump,sel){ if(!F) return; let R2=null, add=0; if(sel&&sel.length&&!sel.some(o=>o.hidden)){ R2={...(F.R||newRound())}; noteBank(R2,sel.map(o=>o.face),sel.map(o=>o.inst.type),live(),finsOf(sel)); add=bankVals(sel.map(o=>o.face),ctx(),live(),sel.length===tray().length,sel.map(o=>o.inst.fin)).reduce((a,b)=>a+b,0); }
  const full=!!(sel&&sel.length&&sel.length===tray().length); F._prevR=R2; const O=curOdds(full,R2), eq=$('#eq'); if(!eq) return;
  const set=(id,v,l)=>{ const e=$('#'+id); e.innerHTML=`<b>${v}</b><small>${l}</small>`; };
  const known=F.target!=null&&F.target!=='–'&&!F.tHid;
  const r=known?settle(F.pScore+add,F.oScore,R2||F.R||newRound(),live(),F.opp,{...oddsEnv(true),preview:!full,lossStreak:F.streak||0,oppHalf:F.oppHp<=F.oppMax/2}):null, st=stakesOf(oddsEnv(true));
  eq.classList.toggle('raised',st>1);
  eq.classList.toggle('bad',!!r&&r.winner==='them'); eq.classList.toggle('even',!!r&&r.winner==='push');
  if(!known){ set('eqgap','?','Ahead by'); set('odds',fmtOdds(O.odds),'Your odds'); set('pays','?','They lose'); }
  else if(r.winner==='you'){ set('eqgap',r.margin,has('cut')?'Ahead +2 cut':'Ahead by'); set('odds',fmtOdds(r.odds),r.raid?'Raid odds':'Your odds'); set('pays',r.dmg,r.armor?'Vest stops it':r.capped?'Iron Jaw cap':st>1?`They lose \u00d7${st}`:r.pot?`They lose (+${r.pot} margin)`:'They lose'); }
  else if(r.winner==='them'){ const free=has('rabbit')&&!F.rabbitUsed; set('eqgap',r.gap,r.house?'House tie':r.sharp?'Sharp tie':'Behind by'); set('odds',fmtOdds(r.odds),'Their odds'); set('pays',free?0:r.dmg,free?'Rabbit\u2019s Foot':st>1?`You lose \u00d7${st}`:'You lose'); }
  else { set('eqgap',r.near?1:0,r.near?'Near miss':'Tied'); set('odds',fmtOdds(O.odds),'Your odds'); set('pays',0,'Push'); }
  if(bump){ const oe=$('#odds'); oe.classList.remove('bump'); void oe.offsetWidth; oe.classList.add('bump'); } }
// "how does this work?" — your odds, piece by piece, with the real numbers
function oddsHelp(){ if(!F) return; const O=curOdds(false,F._prevR), parts=[['Everyone starts at','1'],...O.parts];
  const rows=parts.map(([l,v])=>`<div class="hrow"><span>${l}</span><span class="kw ${v[0]==='\u00d7'?'mult':'odds'}">${v}</span></div>`).join('');
  const el=h(`<div class="overlay tipov pe"><div class="napkin paper"><div class="sc">How hits work</div>
    <div class="nt">Lowest total wins the round</div>
    <div class="formula"><span><b>Ahead by</b></span><span class="op">\u00d7</span><span><b class="o">Odds</b></span><span class="op">=</span><span><b class="g">Hit</b></span></div>
    <div class="nb">Finish 4 under them with odds 3 and they lose <b class="kw nerve">12 nerve</b>. If they finish under you, it flips: their lead \u00d7 <i>their</i> odds comes off yours.</div>
    <div class="secthead" style="margin-top:14px">${F._prevR?'Your odds if you bank these':'Your odds right now'}</div><div class="hrows">${rows}<div class="hrow tot"><span>Total</span><span class="kw odds">${fmtOdds(O.odds)}</span></div></div>
    <div class="nb" style="margin-top:8px">Pluses add up first, then \u00d7 charms multiply the total. Their odds: <b class="kw mult">\u00d7${fmtOdds(F.opp.odds)}</b>, and it rises every act.</div>
    <div class="nrow" style="justify-content:flex-end"><button class="btn small" id="ok">Got it</button></div></div></div>`);
  document.body.appendChild(el); const close=()=>{ el.classList.add('closing'); setTimeout(()=>el.remove(),180); };
  el.querySelector('#ok').onclick=close; el.onclick=e=>{ if(e.target===el) close(); }; }
// payout: every piece of your odds fires in order, its charm jumps in the rack, the brass climbs a step
const CHARM_BY_NAME={}; Object.keys(CHARMS).forEach(k=>CHARM_BY_NAME[CHARMS[k].name]=k);
function trigFx(label,val,i){ const k=CHARM_BY_NAME[label], tk=k&&$(`#rack .token[data-c="${k}"]`);
  if(tk){ tk.classList.remove('trig'); void tk.offsetWidth; tk.classList.add('trig'); const r=tk.getBoundingClientRect(); floatAt({x:r.left+r.width/2,y:r.bottom+16},val,val[0]==='\u00d7'||val[0]==='\u00f7'?'mult small':'odds small'); }
  SFX.ding(i); }
SFX.ding=(i=0)=>{ if(!AC||!sfxOn) return; const st=[0,2,4,7,9,12,14,16,19,21,24,26,28,31][Math.min(13,i)], f=523*Math.pow(2,st/12), t=AC.currentTime; osc('triangle',f,t,.32,.06,null,sfxBus,.003); osc('sine',f*2,t,.22,.025,null,sfxBus,.003); thock(420+st*14,.14,0,.04,.3); };
async function payOut(r){ const big=r.dmg>=40||r.odds>=5; document.body.classList.add('paying'); setTimeout(()=>document.body.classList.remove('paying'),2600+(r.parts||[]).length*260);
  const el=h(`<div class="payout"><div class="pv">${r.margin}</div><div class="pm">under by ${r.gap}${has('cut')?' +2 cut':''}${r.pot?` +${r.pot} margin`:''}</div></div>`); document.body.appendChild(el);
  const pv=el.querySelector('.pv'), pm=el.querySelector('.pm'); SFX.win(); await sleep(420);
  if(r.odds!==1){ const parts=r.parts||[], ord=p=>{ const k=CHARM_BY_NAME[p[0]]; return k?G.charms.indexOf(k):-1; }, isAdd=p=>p[1][0]==='+'||p[1][0]==='\u2212', seq=[...parts.filter(isAdd).sort((a,b)=>ord(a)-ord(b)),...parts.filter(p=>!isAdd(p)).sort((a,b)=>ord(a)-ord(b))];
    pv.innerHTML=`${r.margin} <span class="x">\u00d7 <b class="ov">1</b></span>`; const ov=pv.querySelector('.ov'); let o=1;
    const per=Math.max(90,Math.min(260,2200/Math.max(1,seq.length)));
    for(let i=0;i<seq.length;i++){ const [l,v,raw]=seq[i], n=typeof raw==='number'?Math.abs(raw):parseFloat(v.slice(1));
      if(v[0]==='+') o+=n; else if(v[0]==='\u2212') o-=n; else if(v[0]==='\u00d7'&&!isNaN(n)) o*=n; else if(v[0]==='\u00f7') o/=n;
      ov.textContent=fmtOdds(Math.max(1,o)); pm.innerHTML=`<b>${l}</b> ${v}`; ov.classList.remove('bump'); void ov.offsetWidth; ov.classList.add('bump'); trigFx(l,v,i); await sleep(per); }
    ov.textContent=fmtOdds(r.odds); pm.textContent=`\u00d7 ${fmtOdds(r.odds)} odds`; SFX.odds(); await sleep(380);
    const steps=Math.min(14,Math.max(4,Math.round(Math.log2(r.dmg+1)*2))); for(let i=1;i<=steps;i++){ pv.textContent=Math.round(r.dmg*i/steps); SFX.tick(i); await sleep(40); } }
  pv.textContent=r.dmg; el.classList.add('hit'); pm.textContent=r.capped?'Iron Jaw cap':stakesOf(oddsEnv(true))>1?`hit \u00d7${stakesOf(oddsEnv(true))} stakes`:r.pot?`hit \u00b7 +${r.pot} margin`:'hit'; SFX.ching(big); setTimeout(SFX.hit,120);
  { const st=stakesOf(oddsEnv(true)); msg(`<span class="big win">Hit for ${r.dmg}</span><span class="math">${r.margin}${r.odds!==1?` \u00d7 ${fmtOdds(r.odds)} odds`:''}${st>1?` \u00d7 ${st} stakes`:''} \u00b7 you ${F.pScore} vs ${r.oFinal}</span>`); }
  setTimeout(()=>el.remove(),900); }
// reloaded after the last bank: the result is already decided, so skip straight to settling it
async function resumeEnd(e){ sweepDice(); fitCam(); busy=true;
  Object.assign(F,{raise:!!e.raise,folded:!!e.folded,intent:e.intent||'steady',next:e.next||'steady',pScore:e.pScore,oScore:e.oScore,target:e.target,R:e.R,throwNo:e.throwNo||1,_shownT:null,_prevR:null,spoonUsed:true,railN:{you:0,them:0},labelsOn:false,you:[],them:[],hand:(e.hand||[]).map(i=>G.bag[i]).filter(Boolean)});
  setP(F.pScore); setVs(F.target); updOdds(); $('#sitting').innerHTML=`<span>Sitting on</span><b>${F.target}</b>`;
  msg(`Round ${F.round}. You finished on <b>${F.pScore}</b> against <b>${F.target}</b>.`);
  await sleep(500); if(F) await endRound(); }
async function endRound(){
  busy=true; F.labelsOn=false;
  saveFight({end:{pScore:F.pScore,oScore:F.oScore,target:F.target,R:F.R,throwNo:F.throwNo,raise:F.raise,folded:F.folded,intent:F.intent,next:F.next,hand:F.hand.map(d=>G.bag.indexOf(d)).filter(i=>i>=0)}});
  const r=F.folded?{winner:'them',dmg:foldDmg(F.opp,F.intent),gap:0,odds:theirOdds(F.opp,{intent:F.intent}),oFinal:F.target,fold:true}:settle(F.pScore,F.oScore,F.R,live(),F.opp,{...oddsEnv(true),lossStreak:F.streak||0,oppHalf:F.oppHp<=F.oppMax/2});
  if(r.house) toast('<b class="r">Ties go to the house.</b>');
  if(r.sharp) toast('<b class="r">Sharp.</b> Ties go to them.');
  if(r.near) toast('<b>Near Miss.</b> Lost by one. Nobody bleeds.');
  if(r.raid) toast('<b class="r">Raid.</b> Your odds were 1 this round.');
  if(r.armor) toast('<b class="r">Bulletproof Vest.</b> Your first win here bounced off.');
  else if(r.capped) toast('<b class="r">Iron Jaw.</b> No round takes more than a third of their nerve.');
  if(r.winner==='you') F.wonOnce=true;
  if(r.winner==='you'&&has('bookie')) addGold(Math.min(8,r.margin),$('#cash'));
  if(r.winner==='them'&&has('rabbit')&&!F.rabbitUsed){ F.rabbitUsed=true; r.dmg=0; r.free=true; toast('<b>Rabbit\u2019s Foot</b> takes the hit.'); }
  if(r.winner==='them'&&F.wall&&r.dmg>0){ const sk=soak(F.wall,r.dmg); r.dmg=sk.dmg; F.wall=sk.guard; toast(`<b>Guard</b> soaks ${sk.soaked}.${F.wall?` ${F.wall} left.`:''}`); updGuard(); refreshRack(); }
  if(r.winner==='you'&&has('bodyguard')){ F.wall=(F.wall||0)+3; trigFx('The Bodyguard','+3',0); updGuard(); refreshRack(); }
  if(!r.fold){ const up=notePlays(G,F.R,{...oddsEnv(true),score:F.pScore}); up.forEach((k,i)=>setTimeout(()=>toast(`<b>${PLAYS[k].name}</b> is level ${playLv(G.plays,k)} now. Word gets around.`),1400+i*700)); if(up.length) tip('plays'); }
  if(r.winner==='them'&&!r.free){ F.streak=(F.streak||0)+1; F.wins=0; if(F.opp.q.includes('heavy')) F.heavy=true; }
  else if(r.winner==='you'){ F.streak=0; F.wins=(F.wins||0)+1; }
  G.stats.rounds++;
  { const pay=(F.R&&F.R.payday||0)+afterRound(G,r.winner,!!r.free); if(pay) addGold(pay,$('#cash')); if(r.winner==='them'&&has('piggy')&&!r.free) refreshRack(); }
  if(r.winner==='you'){ G.stats.won++; G.stats.dealt+=r.dmg; if(r.dmg>G.stats.best){ G.stats.best=r.dmg; G.stats.bestWho=F.opp.n; }
    await payOut(r);
    const gd=gateDmg(F.opp,F.oppHp,F.oppMax,F.phase2,r.dmg), hpB=F.oppHp; if(gd<r.dmg){ F.gated=true; setTimeout(()=>toast(`<b class="r">${F.opp.n}</b> isn\u2019t going down in one round.`),300); }
    else if(r.dmg>=hpB){ const ok=overkillPay(r.dmg,hpB); if(ok) setTimeout(()=>{ addGold(ok,$('#cash')); toast(`<b class="g">Overkill.</b> +$${ok} for showing off.`); },700); }
    F.oppHp-=gd; G.stats.dealt+=gd-r.dmg;
    updOpp(); floatEl($('#obar'),'−'+gd,'dmg'+(gd>=F.oppMax*.5?' big':'')); shake(Math.min(.4,.1+.3*r.dmg/F.oppMax)); foeRecoil();
    if(has('tip')) addGold(2,$('#cash'));
    if(r.recoil&&G.hp>1){ const k=Math.min(r.recoil,G.hp-1); G.hp-=k; G.stats.taken+=k; updTop(); setTimeout(()=>floatEl($('#hpbar'),'\u2212'+k,'dmg'),400); toast(`<b class="r">Brass Knuckles.</b> ${k} came back at you.`); }
  } else if(r.winner==='them'){ G.stats.lost++; G.stats.taken+=r.dmg;
    msg(r.fold?`<span class="big lose">Folded. Took ${r.dmg}</span><span class="math">2 \u00d7 their odds ${fmtOdds(r.odds)}</span>`:`<span class="big lose">Took ${r.dmg}</span><span class="math">over by ${r.gap} \u00d7 their odds ${fmtOdds(r.odds)}${stakesOf(oddsEnv(true))>1?' \u00d7 '+stakesOf(oddsEnv(true))+' stakes':''}${F.opp.q.includes('hot')&&F.streak>1?' + hot streak':''}</span>`); SFX.lose(); setTimeout(SFX.hurt,130);
    G.hp-=r.dmg; G.stats.low=Math.min(G.stats.low??50,G.hp); updTop(); floatEl($('#hpbar'),'−'+r.dmg,'dmg'); shake(.3); if(PMAT) PMAT.uniforms.hurt.value=.6; foeLaugh();
    if(!r.free&&F.opp.q.includes('steal')&&G.gold>0) addGold(-Math.min(3,G.gold),$('#cash'));
    if(F.opp.sig==='feed'&&r.dmg>0&&F.oppHp<F.oppMax){ const hl=Math.min(F.oppMax-F.oppHp,r.dmg); F.oppHp+=hl; setTimeout(()=>{ if(!F) return; updOpp(); floatEl($('#obar'),'+'+hl,'heal'); toast(`<b class="r">Mama Rosa</b> eats well. +${hl} nerve.`); },500); }
  } else { G.stats.push++; F.wins=0; msg(`<span class="big push">Push</span>Both on ${F.pScore}. Nobody bleeds.`); SFX.push(); }
  if(has('blood')&&G.hp>1){ G.hp-=1; G.stats.taken+=1; updTop(); floatEl($('#hpbar'),'\u22121','dmg'); }
  { const rg=regenOf(F.opp); if(rg&&F.oppHp>0&&F.oppHp<F.oppMax){ const hl=Math.min(rg,F.oppMax-F.oppHp); F.oppHp+=hl; updOpp(); floatEl($('#obar'),'+'+hl,'heal'); } }
  if(F.opp.q.includes('nervous')&&F.oppHp>0){ await sleep(500); F.oppHp-=1; G.stats.dealt+=1; updOpp(); floatEl($('#obar'),'−1','dmg'); toast('<b>Nervous Wreck.</b> Their hands are shaking.'); }
  await sleep(1100); await tip('result');
  const broke=F.hand.filter(d=>DT[d.type].breaks&&d.cracks>=breaksAt(d.type,G.charms));
  for(const d of broke){ const o=F.you.find(x=>x.inst===d); if(o){ shatter(o); F.you=F.you.filter(x=>x!==o); } G.bag=G.bag.filter(x=>x!==d); }
  if(broke.length){ toast('Your <b>Glass Die</b> shattered.'); await sleep(700); }
  const yours=F.you, theirs=F.them; F.you=[]; F.them=[];
  const g1=gatherYours(yours);
  const g2= GL_OK&&foe&&F.oppHp>0 ? cupScoop(theirs).then(()=>{ theirs.forEach(disposeDie); return cupRest(); }) : Promise.resolve(theirs.forEach(o=>{ o.mesh.visible=true; })).then(()=>gatherTheirs(theirs));
  await Promise.all([g1,g2]);
  if(G.hp<=0) return renderOver();
  if(F.oppHp<=0) return fightWon();
  if(F.opp.boss&&!F.phase2&&(F.oppHp<=F.oppMax/2||F.gated)){ const H=F.opp.half||ACTS[G.act].half; F.phase2=true; H.add.forEach(q=>{ if(!F.opp.q.includes(q)) F.opp.q.push(q); }); F.opp.t=H.t; $('#quirks').innerHTML=quirkChips(); wireChips($('#quirks'));
    banner(H.big,H.small,true); for(const v of [.4,1,.3,1]){ lampDim=v; await sleep(80); } await foeSlam(); }
  saveFight(); busy=false; acts(`<button class="btn go" id="again">Next round</button>`);
  const myF=F; let gone=false; const go=()=>{ if(gone||F!==myF||busy) return; gone=true; SFX.ui(); startRound(); };
  $('#again').onclick=go;
  if(SET.auto){ const b=$('#again'); b.classList.add('autogo'); setTimeout(()=>{ if($('#again')===b&&!menuEl&&!tipOpen&&!popEl) go(); else if($('#again')===b) b.classList.remove('autogo'); },1500); }
}
// when they're beaten, their dice lift over the side rails, outermost first, clear of the opponent
async function gatherTheirs(list){ await Promise.all(list.map((o,i)=>{ const m=o.mesh, s=m.position.clone(); const t=new THREE.Vector3((s.x>0?1:-1)*8,-.8,s.z);
  return sleep(Math.max(0,4.2-Math.abs(s.x))*70).then(()=>anim(620,k=>{ m.position.x=lerp(s.x,t.x,ease.in(k)); m.position.y=k<.9?s.y+.7*Math.min(1,k/.4):lerp(s.y+.7,t.y,(k-.9)/.1); m.rotation.z-=.08*k; })).then(()=>disposeDie(o)); })); }
async function fightWon(){ const F0kind=F.kind;
  G.won++; if(F.kind==='B'){ (G.stats.bosses=G.stats.bosses||[]).push(F.opp.n); G.rep++; store('lr-bossn',bossTotal()+1); } if(has('tally')) G.tally++; if(G.mode==='endless') saveBest(G.won); if(has('cigar')) heal(6,$('#hpbar')); { const i=afterFight(G); if(i) addGold(i,$('#cash')); }
  G._quick=F.round<=QUICK_WIN; G._hot=!!F.opp.hot;
  { const last=F.kind==='B'&&G.mode==='run'&&G.act===2&&!(LIM().double&&!G.dbl); G.fight=null; G.rw=last?null:{kind:F.kind}; G.at=last?'victory':'reward'; saveRun(); }
  SFX.fanfare(); banner(F.kind==='B'?`${F.opp.short||ACTS[G.act].short} folds`:'Cleaned out',F.opp.n);
  if(foe) await foeWalkOut(); else await sleep(800);
  if(F.kind==='B'&&G.mode==='run'&&G.act===2&&LIM().double&&!G.dbl){ G.dbl=1; G.bossIx[2]=1-(G.bossIx[2]||0); G.at='map'; saveRun(); banner('Double Down','The other owner wants a word',true); await sleep(1400); _fightAt=0; const o2=chooseFoe('B'); o2.hp=Math.round(o2.hp*.75); return startFight('B',o2); }
  if(F.kind==='B'&&G.mode==='run'&&G.act===2){ clearSave(); return renderVictory(); }
  renderReward(F.kind);
  if(F0kind==='B') setTimeout(()=>toast(`<b>Reputation +1.</b><br><i>Word gets around. +1 odds for the rest of the night (now +${G.rep}).</i>`),1200);
}

/* ================= REWARD ================= */
function dieCard(type,price){ seen('d',type); const d=DT[type]; const el=h(`<button class="card k-die t-${d.tier}"><span class="k">${TIER_NAME[d.tier]} die</span><span class="art"><span class="slot"></span></span><span class="mid"><span class="n">${d.name}</span><span class="d">${kw(d.desc)}</span><span class="f">${facesHTML({type})}</span></span>${price!=null?`<span class="p">$${price}</span>`:''}</button>`); el.querySelector('.slot').replaceWith(iconCanvas(type,'C',46)); return el; }
function charmCard(c,price,off){ seen('c',c); const d=CHARMS[c]; return h(`<button class="card t-${d.tier}${off?' offbook':''}"><span class="k">${off?'Off the Books \u00b7 ':''}${TIER_NAME[d.tier]}</span><span class="art">${chipHTML(c)}</span><span class="mid"><span class="n">${d.name}</span><span class="d">${kw(d.desc)}${off?'<br><b class="obk">Doesn\u2019t take a charm slot.</b>':''}</span></span>${price!=null?`<span class="p">$${price}</span>`:''}</button>`); }
const SVC_OF={'?':'back','+':'heal','W':'heal','\u2715':'remove','1':'file','$':'bar','\u263E':'alley'};
function svcIcon(ico,key){ const k=key||(String(ico).includes('ruby')?'gild':SVC_OF[ico]); return SVC_ICON[k]?`<span class="cicon sv"><img src="${SVC_ICON[k]}" alt=""></span>`:`<span class="pchip plain"><span>${ico}</span></span>`; }
// ---- chits: small favors you pick up; the ones that wait for the next bar or table show next to your cash
function gainChit(k){ G.grow=G.grow||{}; G.grow.chits=(G.grow.chits||0)+1; const c=CHITS[k]; let extra='';
  if(k==='cash') addGold(5,$('#cash'));
  else if(k==='stiff') heal(10,$('#hpbar'));
  else if(k==='finish'){ const un=G.bag.filter(d=>!d.fin); if(un.length){ const d=pick(un); d.fin=pick(FIN_KEYS); extra=` Your <b>${DT[d.type].name}</b> is ${FINISHES[d.fin].name} now.`; } }
  else { G.nb=G.nb||{}; G.nb[k]=true; }
  SFX.coin(); toast(`<b class="g">Chit: ${c.name}.</b> ${c.desc}${extra}`); refreshChits(); setTimeout(()=>tip('chit'),900); }
function chitsHTML(){ const nb=G&&G.nb||{}; return (G&&G.deeds||[]).map(k=>`<span class="chit deed" data-tip="Deed \u00b7 ${DEEDS[k].name}: ${DEEDS[k].desc}">${DEEDS[k].name}</span>`).join('')+Object.keys(nb).filter(k=>nb[k]).map(k=>`<span class="chit" data-tip="${CHITS[k].name}: ${CHITS[k].desc}">${CHITS[k].name}</span>`).join(''); }
function refreshChits(){ const e=$('#chits'); if(e) e.innerHTML=chitsHTML(); }
// ---- the collection book: everything you've laid eyes on, kept across runs (synced like your save)
let BOOK=(()=>{ try{ return JSON.parse(localStorage.getItem('lr-book')||'{}'); }catch(e){ return {}; } })(), bookT=0;
function seen(cat,key){ if(key==null) return; const b=BOOK[cat]||(BOOK[cat]={}); if(b[key]) return; b[key]=1; clearTimeout(bookT); bookT=setTimeout(()=>{ try{ localStorage.setItem('lr-book',JSON.stringify(BOOK)); }catch(e){} },400); }
const ALL_FOES=()=>{ const out=[]; ACTS.forEach(A=>{ const f=A.foes; [...f.t1,...f.t2,...f.e1,...f.e2,f.boss,...(f.bosses||[])].forEach(d=>{ if(d&&!out.some(x=>x.n===d.n)) out.push(d); }); }); return out; };
function bookHTML(){ const cats=[['c','Charms',Object.keys(CHARMS).map(k=>[k,CHARMS[k].name,CHARMS[k].desc])],['d','Dice',Object.keys(DT).map(k=>[k,DT[k].name,DT[k].desc])],
    ['f','Finishes',FIN_KEYS.map(k=>[k,FINISHES[k].name,FINISHES[k].desc])],['x','Fixtures',FIX_KEYS.map(k=>[k,FIXTURES[k].name,FIXTURES[k].desc])],['k','Drinks',DRINK_KEYS.map(k=>[k,DRINKS[k].name,DRINKS[k].desc])],
    ['o','Faces at the table',ALL_FOES().map(d=>[d.n,d.n,d.s])],['q','Tags',Object.keys(QUIRKS).map(k=>[k,QUIRKS[k].name,QUIRKS[k].desc])]];
  const all=cats.reduce((a,c)=>a+c[2].length,0), got=cats.reduce((a,[k,,L])=>a+L.filter(([id])=>BOOK[k]&&BOOK[k][id]).length,0);
  return `<div class="secthead">The Collection<small>${got} of ${all} found. Kept across every night you play.</small></div>`+cats.map(([k,n,L])=>{ const have=L.filter(([id])=>BOOK[k]&&BOOK[k][id]).length;
    return `<div class="secthead" style="margin-top:12px">${n}<small>${have}/${L.length}</small></div><div class="bookgrid">${L.map(([id,nm,d])=>BOOK[k]&&BOOK[k][id]?`<span class="bk" data-tip="${nm}: ${String(d).replace(/"/g,'&quot;')}">${nm}</span>`:'<span class="bk unk">???</span>').join('')}</div>`; }).join(''); }
function drinkCard(k,price){ seen('k',k); return h(`<button class="card k-drink"><span class="k">Drink</span><span class="art">${drinkIco(k).replace('width="18" height="26"','width="40" height="58"')}</span><span class="mid"><span class="n">${DRINKS[k].name}</span><span class="d">${kw(DRINKS[k].desc)}</span></span>${price!=null?`<span class="p">$${price}</span>`:''}</button>`); }
function plainCard(k,ico,n,d,price){ return h(`<button class="card"><span class="k">${k}</span><span class="art">${svcIcon(ico)}</span><span class="mid"><span class="n">${n}</span><span class="d">${kw(d)}</span></span>${price!=null?`<span class="p">$${price}</span>`:''}</button>`); }
const charmPool=(tier)=>Object.keys(CHARMS).filter(c=>!G.charms.includes(c)&&(!tier||CHARMS[c].tier===tier));
const rarePool=()=>[...charmPool('r').map(c=>({k:'charm',c,price:CHARMS[c].price,rare:1})),{k:'die',t:'shaved',price:DT.shaved.price,rare:1}];
function stockCharms(n,taste){ const out=[]; for(let i=0;i<n;i++){ let t=rollTier(G.act,null,taste), pool=charmPool(t).filter(c=>!out.includes(c)); if(!pool.length) pool=charmPool().filter(c=>!out.includes(c)); if(pool.length) out.push(pick(pool)); } return out; }
function gainCharm(c,off){ if(G.charms.includes(c)) return; G.charms.push(c); if(off) (G.offbook=G.offbook||[]).push(c); G._newCharm=c; setTimeout(refreshRack,0); if(c==='liver'){ G.maxHp+=12; G.hp=Math.min(G.maxHp,G.hp+12); } if(c==='tally') G.tally=0; updTop(); toast(`<b>${CHARMS[c].name}</b><br><i>${kw(CHARMS[c].desc)}</i>`); }
function loseCharm(c){ G.charms=G.charms.filter(x=>x!==c); if(G.offbook) G.offbook=G.offbook.filter(x=>x!==c); setTimeout(refreshRack,0); if(c==='liver'){ G.maxHp-=12; G.hp=Math.min(G.hp,G.maxHp); } updTop(); }
function offerCharm(c,done,cancel,off){
  if(off||slotsUsed(G)<charmSlots(G)){ gainCharm(c,off); done&&done(); return; }
  const ov=h(`<div class="overlay pe"><div class="modal paper"><div class="mhead"><div class="sc">Your pockets are full</div><div class="mtitle sm">Trade for ${CHARMS[c].name}?</div></div>
    <div class="prose it">${kw(CHARMS[c].desc)}</div><div class="mrule"></div><div class="secthead">Give one up</div><div id="swapt" class="list"></div><div class="row"><button class="btn ghost" id="nvm">Keep what I have</button></div></div></div>`);
  document.body.appendChild(ov);
  G.charms.filter(x=>!offbook(G,x)).forEach(x=>{ const d=CHARMS[x]; const el=h(`<div class="item tile">${chipHTML(x)}<div><div class="iname">${d.name}</div><div class="idesc">${kw(d.desc)}</div><button class="btn small sell">Give this up</button></div></div>`);
    el.querySelector('button').onclick=()=>{ SFX.bank(0); loseCharm(x); gainCharm(c); ov.remove(); done&&done(); }; ov.querySelector('#swapt').appendChild(el); });
  ov.querySelector('#nvm').onclick=()=>{ SFX.ui(); ov.remove(); cancel&&cancel(); };
}
function renderReward(kind){
  F=null; clearLabels(); clearDebris();
  let W=G.rw&&G.rw.choices?G.rw:null;
  if(W) kind=W.kind; else {
  const quick=kind==='F'&&G._quick, hotW=kind==='E'&&G._hot; G._hot=false; let gold=kind==='B'?20:hotW?15:kind==='E'?10:Math.max(1,5+(quick?3:0)+LIM().pay); if(G.nb&&G.nb.double){ gold*=2; G.nb.double=false; } G.gold+=gold; G.stats.earned+=gold;
  if(kind==='E'&&G._quick) setTimeout(()=>{ if(!G) return; gainChit(pick(CHIT_KEYS)); saveRun(); },700);
  if(G.tab>0){ const pay=Math.min(G.gold,G.tab); G.gold-=pay; G.tab-=pay; setTimeout(()=>toast(`The bartender takes <b>$${pay}</b> off your tab.${G.tab?` You still owe $${G.tab}.`:' You\u2019re square.'}`),900); }
  const choices=[];
  if(kind==='B'){ const r=pick(rarePool()); choices.push(r.k==='die'?{k:'die',t:r.t}:{k:'charm',c:r.c}); shuffle(charmPool('u')).slice(0,2).forEach(c=>choices.push({k:'charm',c})); }
  else if(kind==='E'&&hotW){ const rp=shuffle(charmPool('r')); if(rp.length) choices.push({k:'charm',c:rp[0]}); shuffle(charmPool('u')).slice(0,2).forEach(c=>choices.push({k:'charm',c})); }
  else if(kind==='E') shuffle(charmPool('u')).slice(0,3).forEach(c=>choices.push({k:'charm',c}));
  else { choices.push({k:'die',t:shopDie(G.act)}); shuffle(charmPool('c')).slice(0,2).forEach(c=>choices.push({k:'charm',c})); }
  while(choices.length<3) choices.push({k:'heal'});
  W={kind,quick,gold,choices,corner:{d:pick(DRINK_KEYS)},deeds:kind==='B'?shuffle(DEED_KEYS.filter(k=>!hasDeed(G,k))).slice(0,3):null}; }
  G.rw=W; G.at='reward'; G.shop=null; saveRun();
  const {quick,gold,choices}=W, C=W.corner||(W.corner={d:pick(DRINK_KEYS)}), up=LIM().price, bp=p=>barPrice(G,p+up);
  screen(`${hud()}<div class="modal wide paper pe">
    <div class="mhead"><div class="sc">The table is yours${quick?' \u00b7 quick work +$3':''}</div><div class="mtitle">You won $${gold}</div></div>
    <div class="secthead">${W.taken?'Spoils':'Take one'}</div><div class="cards picks ${W.taken?'decided':''}" id="cards"></div>
    ${W.deeds&&W.deeds.length?`<div class="secthead" style="margin-top:4px">The deed to the joint<small>Take one racket, or none. Each one costs you something.</small></div><div class="cards picks deeds ${W.deedT?'decided':''}" id="deeds"></div>`:''}
    ${kind==='B'?'':`<div class="secthead" style="margin-top:4px">Last call<small>The bartender leans over</small></div><div class="svc rows lastcall" id="corner"></div>`}
    <div class="row"><button class="btn go" id="leave">Back to the floor</button></div></div>`);
  SFX.coin();
  const done=(el)=>{ W.taken=1; saveRun(); const cs=$('#cards'); if(cs){ cs.classList.add('decided'); cs.dataset.busy=1; } if(el) el.classList.add('taken'); };
  choices.forEach((c,i)=>{ const el=c.k==='die'?dieCard(c.t):c.k==='charm'?charmCard(c.c):plainCard('A drink','W','Tall glass of water','Restores 12 nerve.');
    el.style.animationDelay=(.15+i*.12)+'s'; if(W.taken===1&&W.pickI===i) el.classList.add('taken');
    el.onclick=()=>{ if(W.taken||(el.parentElement&&el.parentElement.dataset.busy)) return;
      if(c.k==='charm'&&slotsUsed(G)>=charmSlots(G)){ offerCharm(c.c,()=>{ W.pickI=i; done(el); refreshRack(); }); return; }
      W.pickI=i; if(c.k==='die'){ G.bag.push(newDie(c.t)); toast(`<b>${DT[c.t].name}</b> goes in the bag.`); refreshTabs(); } else if(c.k==='charm'){ gainCharm(c.c); refreshRack(); } else heal(12,el);
      SFX.stamp(); done(el); };
    $('#cards').appendChild(el); });
  if(W.deeds&&W.deeds.length) W.deeds.forEach((k,i)=>{ const el=plainCard('Deed','\u00a7',DEEDS[k].name,DEEDS[k].desc); el.classList.add('deed'); if(W.deedT===k) el.classList.add('taken'); el.style.animationDelay=(.5+i*.12)+'s';
    el.onclick=()=>{ if(W.deedT) return; W.deedT=k; takeDeed(G,k); SFX.crown(); el.classList.add('taken'); $('#deeds').classList.add('decided'); updTop(); refreshRack(); refreshChits(); saveRun(); toast(`<b>${DEEDS[k].name}</b> is yours. ${DEEDS[k].desc}`); tip('deed'); };
    $('#deeds').appendChild(el); });
  // Last call: one drink and a stiff one, so a table without a bar after it still lets you patch up
  const cn=$('#corner'), items=!cn?[]:[{k:'drink',d:C.d,price:bp(DRINKS[C.d].price)},{k:'heal',price:bp(6)}];
  items.forEach((c,i)=>{ const sold=c.k==='drink'?C.dsold:C.hsold; const el=c.k==='drink'?drinkCard(c.d,c.price):plainCard('Drink','+','A stiff one','+12 nerve',c.price); if(sold){ el.classList.add('sold'); el.dataset.busy=1; }
    el.onclick=()=>{ if(el.dataset.busy) return;
      if(c.k==='drink'&&(G.drinks||[]).length>=DRINK_MAX&&c.d!=='sidecar'){ toast('Your coat\u2019s full. Drink something first.'); return; }
      if(c.k==='heal'&&G.hp>=G.maxHp){ toast('You\u2019re steady already.'); return; }
      if(G.gold<c.price){ SFX.unpick(); toast('Not enough cash.'); return; }
      G.gold-=c.price; G.stats.spent+=c.price; SFX.coin(); el.classList.add('sold'); el.dataset.busy=1;
      if(c.k==='drink'){ C.dsold=1; if(c.d==='sidecar'){ addGold(6,$('#cash')); toast('<b>Sidecar.</b> $6, right now.'); } else { (G.drinks=G.drinks||[]).push(c.d); refreshCoat(); toast(`<b>${DRINKS[c.d].name}</b> goes in your coat.`); tip('drinks'); } }
      else { C.hsold=1; heal(12,el); }
      updTop(); saveRun(); };
    cn.appendChild(el); });
  $('#leave').onclick=()=>{ SFX.ui(); G.rw=null; saveRun(); advance(); };
  setTimeout(()=>{ if($('#cards')) tip('reward'); },900);
}

/* ================= SHOP ================= */
const TAB_LIMIT=15;
const tabText=()=>`<span><b class="tbh">Running a tab.</b> Short? Click a price <b>twice</b>: he covers it for <b class="kw cash">$2</b>, up to <b class="kw cash">$${TAB_LIMIT}</b>, and takes it out of your next winnings.</span>${G&&G.tab?`<span class="owe">You owe <b>$${G.tab}</b> of $${TAB_LIMIT}.</span>`:''}`;
const canTab=price=>G&&(price-G.gold+2+G.tab)<=TAB_LIMIT+2&&(price-G.gold)<=TAB_LIMIT-G.tab;
// open a crate: pick one of a few. Charms go through offerCharm; dice into the bag; finishes go on a die you pick
function openCrate(kind,S,done){ const n=crateSize(G), taste=hasFix(G,'taste'); let picks;
  if(kind==='charm') picks=stockCharms(n,taste).map(c=>({k:'charm',c}));
  else if(kind==='dice') picks=shopDice(G.act,n,taste).map(t=>({k:'die',t,fin:Math.random()<.35?pick(FIN_KEYS):null}));
  else picks=shuffle(FIN_KEYS.slice()).slice(0,n).map(f=>({k:'fin',f}));
  SFX.paper(); const ov=h(`<div class="overlay tipov pe"><div class="modal wide paper"><div class="mhead"><div class="sc">Crowbar</div><div class="mtitle">${CRATES[kind].name}</div></div><div class="secthead">Keep one</div><div class="cards picks" id="cpicks"></div><div class="row"><button class="btn ghost small" id="cskip">Leave it</button></div></div></div>`);
  document.body.appendChild(ov); const close=()=>{ ov.remove(); done&&done(); };
  picks.forEach((p,i)=>{ const el=p.k==='charm'?charmCard(p.c,null):p.k==='die'?dieCard(p.t,null):plainCard('Finish','\u2726',FINISHES[p.f].name,FINISHES[p.f].desc,null);
    if(p.k==='die'&&p.fin) el.querySelector('.n').insertAdjacentHTML('beforeend',finTag({fin:p.fin}));
    if(p.k==='fin') el.style.setProperty('--fc',FINISHES[p.f].col), el.classList.add('finish');
    el.style.animationDelay=(.05+i*.06)+'s';
    el.onclick=()=>{ SFX.stamp();
      if(p.k==='charm'){ ov.remove(); offerCharm(p.c,()=>{ toast(`<b>${CHARMS[p.c].name}</b> is yours.`); done&&done(); },()=>done&&done()); return; }
      if(p.k==='die'){ const d=newDie(p.t); if(p.fin) d.fin=p.fin; G.bag.push(d); toast(`<b>${DT[p.t].name}</b>${p.fin?' ('+FINISHES[p.fin].name+')':''} goes in the bag.`); refreshTabs(); close(); if(p.fin) tip('finish'); return; }
      S.finish=p.f; S.pick='finish'; close(); if(window.__pickFinish) window.__pickFinish(); tip('finish'); };
    ov.querySelector('#cpicks').appendChild(el); });
  ov.querySelector('#cskip').onclick=()=>{ SFX.ui(); close(); }; }
function renderShop(){
  F=null; clearLabels();
  let pickMode=null; const els=[];
  const up=LIM().price, bp=p=>barPrice(G,p+up), taste=hasFix(G,'taste'), nb=G.nb||(G.nb={});
  const stockFor=first=>{ const ch=stockCharms((hasFix(G,'shelf')?4:3)-(LIM().lastOrders?1:0),taste);
      if(first&&nb.rare){ const rp=charmPool('r').filter(c=>!ch.includes(c)); if(rp.length) ch[ch.length-1]=pick(rp); nb.rare=false; }
      return [...shopDice(G.act,2,taste).map(t=>({k:'die',t,price:bp(DT[t].price)})),(dk=>({k:'drink',d:dk,price:bp(DRINKS[dk].price)}))(pick(DRINK_KEYS)),...ch.map((c,i)=>{ const under=first&&i===0&&nb.offbook, off=under||Math.random()<offbookP(G); return {k:'charm',c,off,price:bp(CHARMS[c].price+(off&&!under?OFFBOOK_FEE:0)),rare:CHARMS[c].tier==='r'}; })]; };
  const fixed=()=>[{k:'back',price:bp(4)},{k:'heal',price:bp(6)},{k:'remove',price:bp(tossPrice(G))},{k:'file',price:bp(G.filePrice)},{k:'gild',price:bp(G.gildPrice)}];
  const extras=()=>{ const cr=shuffle(Object.keys(CRATES)).slice(0,2).map(c=>({k:'crate',c,price:bp(CRATES[c].price)})); if(nb.crate){ cr.unshift({k:'crate',c:'charm',price:0,free:true}); nb.crate=false; }
      const f=fixOffer(G); return f?[...cr,{k:'fix',f,price:bp(FIXTURES[f].price)}]:cr; };
  let S=G.shop; if(!S){ S=G.shop={stock:stockFor(true),fixed:fixed(),extra:extras(),pick:null,restocks:0}; nb.offbook=false; }
  if(!S.extra) S.extra=extras();
  pickMode=S.pick||null; G.rw=null; G.at='bar'; saveRun();
  screen(`${hud()}<div class="modal barm paper pe">
    <div class="mhead"><div class="sc">Between tables</div><div class="mtitle">The Bar</div></div>
    <div class="barcols"><div class="bmain">
      <div class="secthead shelfhead">For sale <button class="btn ghost small" id="restock"></button></div>
      <div class="cards picks" id="shelf"></div>
      <div class="secthead" style="margin-top:14px" id="baglbl"></div><div id="bagt"></div>
      <div class="bfoot"><div class="tabbox" id="tabbox">${tabText()}</div><button class="btn go" id="leave">Back to the floor</button></div></div>
    <div class="bside">
      <div class="secthead">Crates &amp; fixtures</div><div class="svc rows" id="crates"></div>
      <div class="secthead" style="margin-top:8px">Services</div><div class="svc rows" id="counter"></div></div></div></div>`);
  const PICK={remove:['Which one goes?','Click a die. It stays on the bar for good.',d=>d.type!=='lead'],
    file:['Which one gets filed?','Its highest face becomes a 1.',d=>canFile(d)],
    gild:['Which one gets a ruby?','Its highest face becomes a ruby crown: worth 0, and +1 odds when you bank it.',d=>canGild(d)],
    finish:['Which one wears it?','Click a die without a finish.',d=>!d.fin]};
  const paint=()=>{ updTop(); els.forEach(({el,c})=>{ const blocked=(c.k==='remove'&&G.bag.length<=HAND)||(c.k==='file'&&!G.bag.some(canFile))||(c.k==='gild'&&!G.bag.some(canGild)); const short=G.gold<c.price; const cred=short&&canTab(c.price); el.classList.toggle('poor',(short&&!cred)||blocked); el.classList.toggle('credit',cred&&!blocked);
      if(c.k==='remove'){ c.price=bp(tossPrice(G)); const pe=el.querySelector('.p'); if(pe) pe.textContent='$'+c.price; }
      if(c.k==='file'||c.k==='gild'){ c.price=(c.k==='file'?G.filePrice:G.gildPrice)+LIM().price; const pe=el.querySelector('.p'); if(pe&&!el.classList.contains('sold')) pe.textContent='$'+c.price; } });
    const P=pickMode&&PICK[pickMode];
    $('#baglbl').innerHTML=P?`${P[0]}`:`Your dice \u00b7 ${G.bag.length}`;
    const bt=$('#bagt'); bt.innerHTML=''; bt.classList.toggle('picking',!!P);
    if(P){ const w=h('<div class="bag"></div>'); G.bag.forEach(inst=>{ if(!P[2](inst)) return; const b=h(`<button class="mini" aria-label="${DT[inst.type].name}"><span class="tg">${DT[inst.type].short}</span></button>`); b.prepend(iconCanvas(inst.type,null,38));
      b.onclick=()=>{ const m=pickMode; pickMode=null; SFX.bank(0);
        if(m==='remove'){ G.bag=G.bag.filter(x=>x!==inst); G.tossed=(G.tossed||0)+1; b.classList.add('gone'); toast(`<b>${DT[inst.type].name}</b> left on the bar.`); }
        if(m==='file'){ fileDie(inst); G.filePrice+=2; toast(`<b>${DT[inst.type].name}</b> filed down.<br><i>${facesHTML(inst)}</i>`); }
        if(m==='gild'){ gildDie(inst); G.gildPrice+=4; SFX.crown(); toast(`<b>${DT[inst.type].name}</b> wears a ruby now.<br><i>${facesHTML(inst)}</i>`); }
        if(m==='finish'){ inst.fin=S.finish; S.finish=null; SFX.crown(); toast(`<b>${DT[inst.type].name}</b> is ${FINISHES[inst.fin].name} now. ${FINISHES[inst.fin].desc}`); }
        S.pick=null; saveRun(); setTimeout(()=>{ if($('#bagt')) paint(); },m==='remove'?400:0); }; w.appendChild(b); }); bt.appendChild(w); }
    else bt.appendChild(bagStrip()); };
  window.__pickFinish=()=>{ if(!G.bag.some(d=>!d.fin)){ toast('Every die you own already has a finish.'); S.pick=null; S.finish=null; return; } pickMode='finish'; toast(PICK.finish[1]); paint(); };
  window.__paint=paint; const tb=$('#tabbox'); if(tb){ const _p=paint; window.__paint=()=>{ _p(); tb.innerHTML=tabText(); }; }
  const buyCard=(c,i,where)=>{
    const el=c.k==='back'?plainCard('Rare','?','Back room','Reveals one rare item.',c.price)
      :c.k==='die'?dieCard(c.t,c.price):c.k==='drink'?drinkCard(c.d,c.price):c.k==='charm'?charmCard(c.c,c.price,c.off)
      :c.k==='heal'?plainCard('Drink','+','A stiff one','+12 nerve',c.price)
      :c.k==='remove'?plainCard('Service','\u2715','Toss a die',`Bag can\u2019t go under ${HAND}. Costs $3 more each time.`,c.price)
      :c.k==='tip'?(()=>{ const lv=playLv(G.plays,c.p), P=PLAYS[c.p]; const e=plainCard('Hot Tip','!',P.name,`${P.desc} Level ${lv} \u2192 ${lv+1}: worth +${P.per*(lv+1)} odds.`,c.price); e.classList.add('hottip'); return e; })()
      :c.k==='file'?plainCard('Service','1','File a face','Highest face becomes a 1.',c.price)
      :c.k==='crate'?plainCard(c.free?'Chit':'Crate','\u25A3',(c.free?'Free ':'')+CRATES[c.c].name,CRATES[c.c].desc.replace('3',crateSize(G)),c.price)
      :c.k==='fix'?(seen('x',c.f),plainCard('Fixture \u00b7 for good','\u2302',FIXTURES[c.f].name,FIXTURES[c.f].desc,c.price))
      :plainCard('Service','<i class="ruby">\u265B</i>','Ruby crown','Highest face: 0 and +1 odds.',c.price);
    if(c.k==='fix') el.classList.add('fixture'); if(c.k==='crate') el.classList.add('crate');
    el.style.animationDelay=(.04+i*.05)+'s';
    if(c.rare) el.classList.add('rare');
    if(c.sold){ el.dataset.busy=1; el.classList.add('sold'); }
    el.onclick=()=>{ if(el.dataset.busy) return; let onTab=0;
      if(c.k==='remove'&&G.bag.length<=HAND){ toast(`Your bag is already down to <b>${HAND}</b>.`); return; }
      if(c.k==='drink'&&(G.drinks||[]).length>=DRINK_MAX){ toast('Your coat’s full. Drink something first.'); return; }
      if(c.k==='heal'&&G.hp>=G.maxHp){ toast('You\u2019re steady already.'); return; }
      if(pickMode){ toast('Pick a die below first.'); return; }
      if(G.gold<c.price){ if(!canTab(c.price)){ SFX.unpick(); toast('Not enough cash, and your tab is maxed.'); return; } if(!el.dataset.credit){ el.dataset.credit=1; SFX.ui(); toast(`Click again to put <b>$${c.price-G.gold+2}</b> on your tab.`); return; } onTab=c.price-G.gold; }
      const pay=()=>{ if(onTab){ G.tab+=onTab+2; G.gold=0; toast(`On the tab. You owe <b>$${G.tab}</b>. It comes out of your next winnings.`); const tb=$('#tabbox'); if(tb) tb.innerHTML=tabText(); } else G.gold-=c.price; G.stats.spent+=c.price; SFX.stamp(); SFX.coin(); };
      const sold=()=>{ c.sold=1; el.dataset.busy=1; el.classList.add('sold'); };
      if(c.k==='charm'&&nb.comp&&!c.sold){ c.price=0; nb.comp=false; refreshChits(); toast('<b class="g">Comp.</b> On the house.'); }
      if(c.k==='charm'){ offerCharm(c.c,()=>{ pay(); sold(); paint(); saveRun(); },null,c.off); return; }
      pay();
      if(c.k==='die'){ sold(); G.bag.push(newDie(c.t)); toast(`<b>${DT[c.t].name}</b> goes in the bag.`); refreshTabs(); }
      if(c.k==='back'){ sold(); const onShelf=els.map(e=>e.c&&e.c.c).filter(Boolean); const pool=rarePool().filter(x=>!(x.c&&(onShelf.includes(x.c)||G.charms.includes(x.c)))); const r=pick(pool.length?pool:rarePool().filter(x=>x.k==='die')); const nc={...r,price:r.price+up}; S.stock.push(nc); buyCard(nc,0,'#shelf'); toast('He comes back with something wrapped in a bar towel.'); }
      if(c.k==='heal'){ heal(12,el); }
      if(c.k==='tip'){ sold(); G.plays=G.plays||{}; G.plays[c.p]=(G.plays[c.p]||0)+1; SFX.crown(); toast(`<b>${PLAYS[c.p].name}</b> is level ${playLv(G.plays,c.p)} now.`); tip('plays'); }
      if(c.k==='drink'){ sold(); (G.drinks=G.drinks||[]).push(c.d); refreshCoat(); toast(`<b>${DRINKS[c.d].name}</b> goes in your coat.`); tip('drinks'); }
      if(c.k==='fix'){ sold(); (G.fix=G.fix||[]).push(c.f); if(c.f==='rope'){ G.maxHp+=8; heal(8,el); } SFX.crown(); toast(`<b>${FIXTURES[c.f].name}</b> is yours for the rest of the night.`); G.grow=G.grow||{}; saveRun(); setTimeout(renderShop,500); return; }
      if(c.k==='crate'){ sold(); G.grow=G.grow||{}; if(G.charms.includes('craterat')) G.grow.crates=(G.grow.crates||0)+1; saveRun(); openCrate(c.c,S,()=>{ paint(); saveRun(); }); return; }
      if(c.k==='remove'||c.k==='file'||c.k==='gild'){ pickMode=c.k; toast(PICK[c.k][1]); setTimeout(()=>{ const b=$('#baglbl'); if(b) b.scrollIntoView({behavior:REDUCED?'auto':'smooth',block:'center'}); },60); }
      paint(); S.pick=pickMode; saveRun(); };
    $(where).appendChild(el); els.push({el,c}); };
  S.stock.forEach((c,i)=>buyCard(c,i,'#shelf')); S.fixed.forEach((c,i)=>buyCard(c,i,'#counter')); S.extra.forEach((c,i)=>buyCard(c,i,'#crates'));
  // restock the shelf (keeps anything already bought)
  const rs=$('#restock'), rsp=()=>{ const p=restockPrice(G); rs.textContent=p?`Restock \u00b7 $${p}`:'Restock \u00b7 free'; rs.classList.toggle('poor',G.gold<p); };
  rsp(); rs.onclick=()=>{ if(pickMode) return; const p=restockPrice(G); if(G.gold<p){ SFX.unpick(); toast('Not enough cash to restock.'); return; }
    G.gold-=p; G.stats.spent+=p; G.restocks=(G.restocks||0)+1; G.grow=G.grow||{}; if(G.charms.includes('restless')) G.grow.restock=(G.grow.restock||0)+1; SFX.paper();
    S.stock=stockFor(false); saveRun(); renderShop(); };
  paint();
  setTimeout(()=>{ if($('#shelf')) tip('bar').then(()=>tip('extras')).then(()=>{ if(G&&G.shop&&G.shop.stock.some(s=>s.off&&!s.sold)) return tip('offbook'); }).then(()=>{ if(G&&G.charms.length) tip('rack'); }); },900);
  $('#leave').onclick=()=>{ if(pickMode){ pickMode=null; paint(); } window.__paint=null; G.restocks=0; SFX.ui(); advance(); };
}

/* ---- the charm rack: always up top, hover to read, tap to sell ---- */
function rackHTML(){ if(!G) return ''; const tok=c=>`<button class="token ${G._newCharm===c?'new':''}${offbook(G,c)?' offbook':''}${F&&F.jinx===c?' jinxed':''}" data-c="${c}" data-tip="${CHARMS[c].name}: ${CHARMS[c].desc.replace(/"/g,'&quot;')}" aria-label="${CHARMS[c].name}">${chipHTML(c)}${c==='tally'?`<span class="notch">${G.tally}</span>`:''}${c==='bodyguard'&&F&&F.wall?`<span class="notch">${F.wall}</span>`:''}${c==='piggy'&&G.grow&&G.grow.piggy?`<span class="notch">${G.grow.piggy}</span>`:''}</button>`;
  const on=G.charms.filter(c=>!offbook(G,c)), off=G.charms.filter(c=>offbook(G,c)), slots=[];
  for(let i=0;i<charmSlots(G);i++) slots.push(on[i]?tok(on[i]):'<span class="token empty"></span>'); off.forEach(c=>slots.push(tok(c)));
  return `<div class="rack plate pe" id="rack"><div class="sc">Charms</div><div class="tokens">${slots.join('')}</div></div>`; }
function wireRack(){ document.querySelectorAll('#rack .token[data-c]').forEach(t=>t.onclick=e=>{ e.stopPropagation(); charmPop(t); }); G&&(G._newCharm=null); }
function refreshRack(){ const r=$('#rack'); if(r){ const n=h(rackHTML()); r.replaceWith(n); wireRack(); } refreshCoat(); }
// your coat: up to two drinks. Drink one on your turn; it lasts the round (Bourbon and a Sidecar work any time)
function coatHTML(){ if(!G) return ''; const d=G.drinks||[]; let s=''; for(let i=0;i<DRINK_MAX;i++){ const k=d[i]; s+=k?`<button class="drink" data-dk="${k}" data-tip="${DRINKS[k].name}: ${DRINKS[k].desc} Click to drink.">${drinkIco(k)}</button>`:'<span class="drink empty"></span>'; }
  return `<div class="coat plate pe" id="coat" data-tip="Your coat: room for ${DRINK_MAX} drinks.">${s}</div>`; }
function drinkIco(k){ const C={gin:'#c8e8ff',absinthe:'#7ad04a',soda:'#e8f4ff',bitters:'#a0402a',bourbon:'#c07a2a',sidecar:'#f0c040'}[k]||'#ccc';
  return `<svg viewBox="0 0 20 28" width="18" height="26"><rect x="7" y="1" width="6" height="6" rx="1" fill="#3a2a1a"/><path d="M5 9 Q5 7 7 7 H13 Q15 7 15 9 V25 Q15 27 13 27 H7 Q5 27 5 25 Z" fill="${C}" opacity=".9"/><rect x="6" y="14" width="8" height="6" fill="#f4ead2" opacity=".85"/></svg>`; }
function refreshCoat(){ const c=$('#coat'); if(c){ c.replaceWith(h(coatHTML())); } }
function drink(k){ if(!G||!(G.drinks||[]).includes(k)) return;
  const inFight=F&&!busy&&tray().length&&F.target!=null;
  if(!['bourbon','sidecar'].includes(k)&&!inFight){ toast('Save that for your turn at the table.'); return; }
  if(inFight&&F.drink&&F.drink[k]){ toast('One of those a round is plenty.'); return; }
  G.drinks.splice(G.drinks.indexOf(k),1); SFX.coin();
  if(k==='bourbon') heal(10,$('#hpbar')); else if(k==='sidecar') addGold(6,$('#cash')); else { F.drink[k]=1; updOdds(true); }
  toast(`<b class="g">${DRINKS[k].name}.</b> ${DRINKS[k].desc}`); refreshCoat(); saveRun(); }
document.addEventListener('click',e=>{ const b=e.target.closest('.drink[data-dk]'); if(b){ e.stopPropagation(); drink(b.dataset.dk); } });
function refreshTabs(){ const b=$('#bagbtn .tc'); if(b&&G) b.textContent=G.bag.length; }
let popEl=null;
function closePop(){ if(popEl){ popEl.remove(); popEl=null; } hideTip(); }
function charmPop(t){ if(popEl&&popEl._for===t){ closePop(); return; } closePop(); hideTip(); SFX.paper(); const c=t.dataset.c, d=CHARMS[c], v=Math.floor(d.price/2);
  popEl=h(`<div class="pop paper pe qpop">${tipHTML(t)}<div class="row" style="margin-top:12px;justify-content:flex-start"><button class="btn ghost small" id="pleft" aria-label="Move left">\u25c0</button><button class="btn ghost small" id="pright" aria-label="Move right">\u25b6</button><button class="btn small" id="psell">Sell for $${v}</button><button class="btn ghost small" id="pclose">Keep it</button></div><div class="pd" style="margin-top:6px;font-size:12px;opacity:.8">Order only matters for The Mimic: it copies the charm to its right.</div></div>`);
  document.body.appendChild(popEl); popEl._for=t; placePop(popEl,t);
  popEl.querySelector('#pclose').onclick=closePop;
  const mv=dir=>{ const i=G.charms.indexOf(c), j=i+dir; if(i<0||j<0||j>=G.charms.length||offbook(G,G.charms[j])!==offbook(G,c)) return; [G.charms[i],G.charms[j]]=[G.charms[j],G.charms[i]]; SFX.tok(); closePop(); refreshRack(); saveRun(); if(F) updOdds(); const nt=$(`#rack .token[data-c="${c}"]`); if(nt) charmPop(nt); };
  popEl.querySelector('#pleft').onclick=()=>mv(-1); popEl.querySelector('#pright').onclick=()=>mv(1);
  popEl.querySelector('#psell').onclick=()=>{ loseCharm(c); G.gold+=v; G.stats.earned+=v; SFX.stamp(); SFX.coin(); updTop(); toast(`Sold <b>${d.name}</b> for $${v}.`); closePop(); if(window.__paint) window.__paint(); if(!F) saveRun(); }; }
document.addEventListener('pointerdown',e=>{ if(popEl&&!popEl.contains(e.target)&&!e.target.closest('.token,#owe,[data-q]')) closePop(); });
document.addEventListener('click',e=>{ const o=e.target.closest('#owe'); if(!o||!G||!G.tab) return; e.stopPropagation(); anchorPop(o,`<div class="pn">Your tab: $${G.tab}</div><div class="pd">You owe the bartender. It comes out of your next winnings automatically, before you see them. He won\u2019t front more than $${TAB_LIMIT} total.</div>`); });

/* ================= REST ================= */
function choiceEntry(t,d,ok,label,i){ return h(`<button class="entry simple" ${ok?'':'disabled style="opacity:.4;cursor:default"'} style="animation-delay:${.1+i*.1}s"><div class="txt"><div class="ename">${t}</div><div class="edesc">${kw(d)}</div></div>${ok?`<span class="take">${label}</span>`:''}</button>`); }
const bestPlay=()=>{ const h=G.playHits||{}; return PLAY_KEYS.slice().sort((a,b)=>(h[b]||0)-(h[a]||0))[0]; };
function renderRest(){
  F=null; clearLabels(); G.at='rest'; saveRun();
  const opts=[{t:'Catch your breath',d:`Restore ${Math.ceil(G.maxHp*LIM().rest)} nerve.`,ok:G.hp<G.maxHp,go:()=>{ heal(Math.ceil(G.maxHp*LIM().rest)); toast('The cold air helps.'); }},
    {t:'Have a die loaded',d:'He drills a House Die and weights it. It becomes a Loaded Die: never shows a 5.',ok:G.bag.some(d=>d.type==='d6'&&!d.f),go:()=>{ G.bag.find(x=>x.type==='d6'&&!x.f).type='loaded'; toast('A House Die is now <b>loaded</b>.'); }},
    {t:'Run the numbers',d:(()=>{ const k=bestPlay(); return `Practice your ${PLAYS[k].name}: it goes up a level for good (now Lv ${playLv(G.plays,k)}).`; })(),ok:true,go:()=>{ const k=bestPlay(); G.plays=G.plays||{}; G.plays[k]=(G.plays[k]||0)+1; toast(`<b>${PLAYS[k].name}</b> is level ${playLv(G.plays,k)} now.`); }},
    {t:'Get a die marked',d:'He nicks a die so the table counts it twice: one die without a finish becomes Marked. It costs you 5 max nerve.',ok:G.bag.some(d=>!d.fin)&&G.maxHp>20,go:()=>{ const d=G.bag.find(x=>!x.fin&&x.type==='d6')||G.bag.find(x=>!x.fin); d.fin='marked'; G.maxHp-=5; G.hp=Math.min(G.hp,G.maxHp); toast(`Your <b>${DT[d.type].name}</b> is <b>Marked</b>. ${FINISHES.marked.desc}`); }},
    {t:'Sand down an Octo',d:'He files an eight-sider down into an honest House Die.',ok:G.bag.some(d=>d.type==='d8'),go:()=>{ { const x=G.bag.find(x=>x.type==='d8'); x.type='d6'; delete x.f; } toast('The Octo is a <b>House Die</b> now.'); }}];
  screen(`${hud()}<div class="modal paper pe">
    <div class="mhead"><div class="sc">Floor ${ROMAN[G.floor]}</div><div class="mtitle">The Back Alley</div></div>
    <div class="prose it">Rain on the bins. A man with a file and a jeweler’s loupe works under a bare bulb. You get one thing before you go back in.</div>
    <div class="mrule"></div><div class="entries" id="choices"></div></div>`);
  opts.forEach((o,i)=>{ const b=choiceEntry(o.t,o.d,o.ok,'This one',i); b.classList.add('choice'); if(o.ok) b.onclick=()=>act(b,()=>{ o.go(); advance(); }); $('#choices').appendChild(b); });
}

/* ================= EVENTS ================= */
const EVENTS=[
  {t:'The Piano Player',p:'He\u2019s been playing the same sad tune all night. He looks up at you like you might be the one to change it.',
   o:[{t:'Tip him six bucks',d:'Heal 10 and +4 max nerve.',ok:()=>G.gold>=6,go:()=>{ G.gold-=6; G.maxHp+=4; G.hp=Math.min(G.maxHp,G.hp+10); return 'He plays something you didn\u2019t know you needed.'; }},{t:'Keep walking',d:'Nothing happens.',go:()=>'The sad tune follows you to the table.'}]},
  {t:'A Raid',p:'Whistles out front. Somebody kills the lights. You\u2019ve got about ten seconds before the coppers come down those stairs.',
   o:[{t:'Grease a palm',d:'Pay $10 and walk out clean.',ok:()=>G.gold>=10,go:()=>{ G.gold-=10; return 'The sergeant pockets it and looks the other way.'; }},{t:'Ditch a die and run',d:'Lose a random die from your bag (never below six).',ok:()=>G.bag.length>HAND,go:()=>{ const d=pick(G.bag); G.bag=G.bag.filter(x=>x!==d); return `You leave your ${DT[d.type].name} in a spittoon. Worth it.`; }}]},
  {t:'The Card Sharp',p:'A man with too many rings offers to trade dice. \u201cSight unseen. Live a little.\u201d',
   o:[{t:'Trade a House Die',d:'Give up one House Die, get a mystery die.',ok:()=>G.bag.some(d=>d.type==='d6'),go:()=>{ const d=G.bag.find(x=>x.type==='d6'); const t=pick(['loaded','pebble','ember','twin','gamble','coin','devil','d8','gilded','bomb','goose','boxcar']); d.type=t; d.cracks=0; delete d.f; return `You get ${/^[AEIOU]/.test(DT[t].name)?'an':'a'} ${DT[t].name}. ${['loaded','pebble','coin'].includes(t)?'Not bad.':'Hm.'}`; }},{t:'No thanks',d:'Keep your dice.',go:()=>'He shrugs and finds another mark.'}]},
  {t:'Spilled Drink',p:'A drunk knocks a whole gin fizz down your front. He\u2019s apologizing with his wallet half out.',
   o:[{t:'Take the five',d:'+$5, no fuss.',go:()=>{ G.gold+=5; SFX.coin(); return 'He presses it into your hand and staggers off. +$5.'; }},{t:'Make a scene',d:'Half the time +$12, half the time you lose 5 nerve.',go:()=>{ if(Math.random()<.5){ G.gold+=12; SFX.coin(); return 'He pays double to make you stop. +$12.'; } G.hp=Math.max(1,G.hp-5); return 'His friends are bigger than he is. You lose 5 nerve.'; }}]},
  {t:'The Office Safe',p:'The back office door is open a crack. The safe inside isn\u2019t locked either. Nobody\u2019s watching. Probably.',
   o:[{t:'Help yourself',d:'Lose 8 nerve to the fright, gain $20.',ok:()=>G.hp>8,go:()=>{ G.hp-=8; G.gold+=20; SFX.coin(); return 'Your hands shake the whole way back. +$20.'; }},{t:'Close the door',d:'Nothing happens.',go:()=>'Some doors are better left shut.'}]},

  {t:'The Man in the Wet Coat',p:'He slides a glass die across the bar. It catches the light like ice. “Costs you a little nerve,” he says, and doesn’t blink.',
   o:[{t:'Take it',d:'Lose 6 nerve. Gain a Glass Die.',ok:()=>G.hp>6,go:()=>{ G.hp-=6; G.bag.push(newDie('glass')); return 'It’s cold in your hand. He’s already gone.'; }},{t:'Walk away',d:'Nothing happens.',go:()=>'You keep your nerve.'}]},
  {t:'Coat Check',p:'The coat check girl flips a silver dollar between her knuckles. “Double or nothing, sugar?”',
   o:[{t:'Flip for eight bucks',d:'Win $8 or lose $8.',ok:()=>G.gold>=8,go:()=>{ if(Math.random()<.5){ G.gold+=8; SFX.coin(); return 'Heads. She pays up with a wink. +$8.'; } G.gold-=8; return 'Tails. She pockets your eight bucks.'; }},{t:'Pass',d:'Keep your money.',go:()=>'She shrugs and goes back to her magazine.'}]},
  {t:'The Jukebox',p:'A dented jukebox glows in the corner. One nickel left in your pocket.',
   o:[{t:'A slow number',d:'+6 max nerve, and heal 6.',go:()=>{ G.maxHp+=6; G.hp=Math.min(G.maxHp,G.hp+6); return 'The room slows down with you.'; }},{t:'Something hot',d:'+$14 from the crowd.',go:()=>{ G.gold+=14; SFX.coin(); return 'A drunk tips you for the song. +$14.'; }}]},
  {t:'The Fixer',p:'A little man with a jeweler\u2019s file and no eyebrows. \u201cSeven bucks. I make your worst die behave.\u201d',
   o:[{t:'Pay him seven',d:'Your worst die gets filed: its highest face becomes a 1.',ok:()=>G.gold>=7&&G.bag.some(canFile),go:()=>{ G.gold-=7; const d=G.bag.filter(canFile).sort((a,b)=>facesOf(b).reduce((x,y)=>x+effVal(y),0)-facesOf(a).reduce((x,y)=>x+effVal(y),0))[0]; fileDie(d); return `He works your ${DT[d.type].name} over. It comes back meaner.`; }},{t:'Not today',d:'Nothing happens.',go:()=>'He tips an invisible hat.'}]},
  {t:'The Fortune Teller',p:'A woman with a cracked crystal ball waves you over. \u201cThe cards want something from you. A little of your nerve.\u201d',
   o:[{t:'Let her read you',d:'Lose 8 nerve. Gain a random Uncommon charm.',ok:()=>G.hp>8&&slotsUsed(G)<charmSlots(G)&&charmPool('u').length>0,go:()=>{ G.hp-=8; const c=pick(charmPool('u')); gainCharm(c); return `She presses <b>${CHARMS[c].name}</b> into your palm and closes your fingers.`; }},{t:'Ask about love',d:'Heal 8.',go:()=>{ G.hp=Math.min(G.maxHp,G.hp+8); return 'She says somebody\u2019s waiting. It helps more than it should.'; }}]},
  {t:'The Bootlegger',p:'A truck idles in the alley. The driver lifts a tarp: crates of dice, still smelling of the factory.',
   o:[{t:'Buy a crate',d:'Pay $9 for two random dice.',ok:()=>G.gold>=9,go:()=>{ G.gold-=9; const [a,b]=shopDice(G.act,2); G.bag.push(newDie(a),newDie(b)); return `Inside: ${DT[a].name} and ${DT[b].name}.`; }},{t:'Rat him out',d:'+$6 from the bartender.',go:()=>{ G.gold+=6; SFX.coin(); return 'The bartender slides you six and a look. +$6.'; }}]},
  {t:'Arm Wrestle',p:'A dockworker slams his elbow on the bar. \u201cBeat me and the shaved one\u2019s yours.\u201d He has a die you\u2019d kill for.',
   o:[{t:'Lock hands',d:'Half the time: a Shaved Die. Half: lose 10 nerve.',ok:()=>G.hp>10,go:()=>{ if(Math.random()<.5){ G.bag.push(newDie('shaved')); return 'His wrist gives. The <b>Shaved Die</b> is yours.'; } G.hp-=10; return 'Your arm hits the bar like a dropped plank. \u221210 nerve.'; }},{t:'Buy him a beer instead',d:'Pay $3, heal 5.',ok:()=>G.gold>=3,go:()=>{ G.gold-=3; G.hp=Math.min(G.maxHp,G.hp+5); return 'He tells you about his mother. You feel better somehow.'; }}]},
  {t:'The Photographer',p:'Flashbulb. A man from the Herald wants a picture of the hot hand in the room. Fifteen bucks for the front page.',
   o:[{t:'Smile',d:'Pay $15. Reputation +1: +1 odds all night.',ok:()=>G.gold>=15,go:()=>{ G.gold-=15; G.rep++; return 'Tomorrow, everybody knows your face. <b>+1 odds.</b>'; }},{t:'Cover your face',d:'Nothing happens.',go:()=>'Better nobody knows you were here.'}]},
  {t:'Under the Table',p:'Someone left a dice bag under a stool. It’s heavier than it looks.',
   o:[{t:'Open it',d:'Get a random die. Might be good.',go:()=>{ const t=pick(['loaded','pebble','ember','gamble','d8','twin','devil','gilded','bomb','goose','boxcar']); G.bag.push(newDie(t)); return `${/^[AEIOU]/.test(DT[t].name)?'An':'A'} ${DT[t].name}. Into the bag it goes.`; }},{t:'Hand it to the bartender',d:'+$10 finder’s fee.',go:()=>{ G.gold+=10; SFX.coin(); return 'He nods and slips you ten. +$10.'; }}]},
];
function renderEvent(){
  F=null; clearLabels();
  // which stranger, and how it went, are saved: a reload can't reroll either
  const E=G.ev&&EVENTS[G.ev.i]?G.ev:(G.ev={i:rnd(EVENTS.length)}); const ev=EVENTS[E.i]; G.at='event'; saveRun();
  screen(`${hud()}<div class="modal paper pe">
    <div class="mhead"><div class="sc">Floor ${ROMAN[G.floor]} · A stranger</div><div class="mtitle">${ev.t}</div></div>
    <div class="prose it">${ev.p}</div><div class="mrule"></div><div class="entries" id="choices"></div></div>`);
  const done=res=>{ $('#choices').outerHTML=`<div class="result">${res}</div><div class="row"><button class="btn" id="cont">Carry on</button></div>`; $('#cont').onclick=()=>{ SFX.ui(); advance(); }; };
  ev.o.forEach((o,i)=>{ const ok=!o.ok||o.ok(); const b=choiceEntry(o.t,o.d,ok,i?'Do that':'Do it',i); b.classList.add('choice');
    if(ok) b.onclick=()=>act(b,()=>{ const res=o.go(); E.res=res; saveRun(); updTop(); done(res); });
    $('#choices').appendChild(b); });
  if(E.res!=null) done(E.res);
}

/* ================= END: the morning edition ================= */
function runScore(won){ const st=G.stats; return G.won*100+Math.round(Math.sqrt(st.dealt||0)*25)+(st.bosses||[]).length*400+(st.crowns||0)*5+(won?2000:0)+(G.mode==='endless'?G.lap*600:0); }
const limBonus=()=>1+.15*(G.limit||0);
const runScoreL=won=>Math.round(runScore(won)*limBonus());
function bestScore(){ try{return +localStorage.getItem('lr-bestscore')||0}catch(e){return 0} }
function snapshot(){ try{ if(!GL_OK||!R) return ''; R.setRenderTarget(RT); R.render(SCN,CAM); R.setRenderTarget(null); R.render(POST,PCAM); return canvas.toDataURL('image/jpeg',.72); }catch(e){ return ''; } }
const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
function renderPaper(won,pre){
  clearSave(); if(G.mode==='endless') saveBest(G.won);
  const st=G.stats, A=ACTS[G.act], nem=F&&F.opp?F.opp.n:'The House', bosses=st.bosses||[];
  const score=runScoreL(won), prev=bestScore(), record=score>prev; try{ if(record) localStorage.setItem('lr-bestscore',score); }catch(e){}
  const shot=pre||snapshot(); const d=new Date(); const dateline=`${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}, 1926`;
  const head= won?'Roller Breaks the House': (F&&F.kind==='B')?`${nem} Sends Roller Packing`:`Roller Tapped Out at ${A.name}`;
  const sub= won?'Three rooms, three bosses, and nobody left at the table to deal': `Went home on floor ${ROMAN[G.floor]} after ${G.won} ${G.won===1?'table':'tables'}${G.mode==='endless'?`, lap ${G.lap+1}`:''}`;
  const lead= won
    ? `The stranger walked into the Rusty Nail as ${(POCKETS.find(x=>x.k===G.pocket)||POCKETS[0]).n.replace('The ','a ').toLowerCase()} at the ${LIMITS[G.limit||0].n} table. By closing time ${bosses.slice(0,-1).join(' and ')||'the first owner'} had folded, and ${bosses[bosses.length-1]||'the last'} had nothing left to deal. Regulars say they won ${st.won} of ${st.rounds} rounds and banked ${st.crowns} crowns doing it.`
    : `Witnesses at ${A.name} say the stranger won ${G.won} ${G.won===1?'table':'tables'} before ${nem} finally broke their nerve on floor ${ROMAN[G.floor]}. ${st.best?`The biggest blow of the night was a ${st.best}-point hit${st.bestWho?` against ${st.bestWho}`:''}.`:'They never landed a real blow.'} Nobody has seen them since.`;
  const hl=[];
  hl.push(`Sat at the <b>${LIMITS[G.limit||0].n}</b> limit as <b>${(POCKETS.find(x=>x.k===G.pocket)||POCKETS[0]).n}</b>.`);
  bosses.forEach(b=>hl.push(`Beat <b>${b}</b>.`));
  if(st.best) hl.push(`Hit <b>${st.bestWho||'someone'}</b> for ${st.best} in a single round.`);
  if(st.low!=null&&st.low<20&&(won||G.hp>0)) hl.push(`Got down to <b>${Math.max(0,st.low)} nerve</b> and kept playing.`);
  if(st.rich) hl.push(`Had <b>$${st.rich}</b> in pocket at the high point.`);
  if(st.crowns) hl.push(`Banked <b>${st.crowns}</b> crowns.`);
  if(!hl.length) hl.push('A quiet night. Tomorrow will be louder.');
  const charms=G.charms.length?G.charms.map(c=>CHARMS[c].name).join(', '):'none';
  screen(`<div class="hud pe"><div class="spacer"></div>${soundBtns()}</div>
  <article class="newspaper pe">
    <div class="mast"><span class="ear">${won?'Extra':'Late City'}</span><h1>The Evening Roller</h1><span class="ear">2¢</span></div>
    <div class="dateline"><span>Vol. ${ROMAN[Math.min(11,G.lap)]||'I'} · No. ${G.won+1}</span><span>${dateline}</span><span>${LIMITS[G.limit||0].n} ${G.mode==='endless'?'All Night':'City'} Edition</span></div>
    <h2 class="headline ${won?'win':''}">${head}</h2>
    <div class="dek">${sub}</div>
    <div class="cols">
      <div class="col">
        ${shot?`<figure class="photo"><img src="${shot}" alt="The table at the end of the night"><figcaption>The table where it ${won?'ended':'happened'}. ${won?'':nem+' is pictured.'}</figcaption></figure>`:''}
        <p class="lede">${lead}</p>
      </div>
      <div class="col">
        <div class="box"><div class="boxh">Tonight’s Take</div><div class="score">${score.toLocaleString()}</div><div class="scoresub">${record?'A new house record.':`House record: ${prev.toLocaleString()}`}${G.limit?`<br>${LIMITS[G.limit].n} bonus \u00d7${limBonus().toFixed(2)}`:''}</div></div>
        <div class="boxh" style="margin-top:14px">Highlights</div><ul class="hl">${hl.map(x=>`<li>${x}</li>`).join('')}</ul>
        <div class="boxh" style="margin-top:14px">By the Numbers</div>
        <div class="stats">${srow('Tables won',G.won)}${srow('Rounds won',`${st.won} of ${st.rounds}`)}${srow('Nerve broken',st.dealt)}${srow('Nerve lost',st.taken)}${srow('Cash earned',`$${st.earned}`)}${srow('Time at the tables',fmtTime(Date.now()-st.t0))}</div>
        <div class="boxh" style="margin-top:14px">In Their Pockets</div><div class="fine">${G.bag.length} dice. Charms: ${charms}.</div>
      </div>
    </div>
    <div class="classified"><div class="boxh">Classifieds</div><div class="fine">WANTED: One more round. Inquire within.</div>
      <div class="row">${won?'<button class="btn go" id="cont">Stay all night</button>':'<button class="btn go" id="again2">Run it back</button>'}<button class="btn ghost" id="home">Out the front door</button></div></div>
  </article>`);
  SFX.stamp();
  const mode=G.mode;
  const reset=()=>{ lampDim=1; F=null; if(foe) foeWalkOut(); };
  const ag=$('#again2'); if(ag) ag.onclick=()=>{ SFX.ui(); const lv=G.limit||0, pk=G.pocket||'regular'; reset(); newRun(mode,lv,pk); renderMap(true); };
  const ct=$('#cont'); if(ct) ct.onclick=()=>{ SFX.ui(); reset(); G.mode='endless'; G.lap=1; G.act=0; G.floor=0; G.path=[]; G.map=genMap(); G.trail=[]; G.used={}; G.preview={}; G.hp=G.maxHp; renderMap(true); };
  $('#home').onclick=()=>{ SFX.ui(); reset(); renderTitle(); };
}
async function renderOver(){
  if(F) F.labelsOn=false; clearLabels(); busy=true;
  SFX.lose(); if(foe) foeLaugh(); await sleep(450); const shot=snapshot();
  for(const v of [.5,1,.2,.6,.15]){ lampDim=v; await sleep(140); }
  await sleep(500); renderPaper(false,shot); busy=false;
}
function renderVictory(){ clearLabels(); SFX.fanfare(); const lv=G.limit||0, up=lv>=limitTop()&&lv<LIMITS.length-1; if(up) store('lr-limit',lv+1); renderPaper(true);
  if(up) setTimeout(()=>toast(`<b>The limit goes up.</b><br><i>${LIMITS[lv+1].n} is open: ${LIMITS[lv+1].d}</i>`),1400); }

/* ================= THE BARTENDER'S NOTES (first-run tutorial) ================= */
const TIPS={
  map:['The floor plan','Climb from the bottom row to the owner at the top, one row at a time along the lines. Glowing stops are the ones you can take. Tap one to see which card it is, tap again (or Take) to go. Everything else is in Menu, House Rules.'],
  quirk:['Read their tags','Their tags are on their nameplate, top right. Hover one (or click it) to read it. “Hits ×” is how hard their wins land on you.'],
  counter:['House rules','Bosses and the sharks upstairs draw a house rule at random every night. Maybe your × odds don’t count, maybe one of your charms sits out each round. Same face, different trick, so read their tags every time.'],
  boss:['The owner','Bosses have a signature move, printed on their door before you sit down, and it gets worse once they’re at half nerve. No boss goes down in one round: the first big hit stops at half, and then the gloves come off.'],
  shake:['Shakes','A Shake rethrows the dice you picked without banking them. You get one every round (Bent Spoon gives another, free). It costs you: their score counts 1 lower for the round. Worth it on a 5 or a 6; think twice on a 3.'],
  raise:['Raised','Stakes are doubled this round: whatever the winner hits for, it lands twice. Raise when they finished high and your throw looks good. Fold when it looks hopeless: you eat a small fixed hit instead of a big one.'],
  intent:['Read the table','The tag next to their Hits is what they’re up to this round, and the one after it is next round. Leaning in hits harder and Counting crowns makes your first-throw crowns score 1. Sweating, Getting tired and On tilt are your openings: that’s when to Raise.'],
  deed:['Deeds','A deed is yours for the rest of the night: strong, with a catch. Your deeds sit next to your cash; hover one to read it again.'],
  plays:['Plays','Some banks are Plays: two 1s at once, three of a kind, a 1-2-3 ladder, three crowns, or finishing on 3 or less. Each one you make widens your win by its level and adds odds. Every 4th time you make a Play, it levels up for the rest of the night.'],
  guard:['Guard','Guard soaks hits before your nerve does, and unlike a drink it stays between rounds at this table. Hip Flask, The Bulldog and The Bodyguard build it; Haymaker turns it into bigger wins.'],
  hot:['High-stakes room','The burning door is the room’s high-stakes game: a shark with 40% more nerve who hits 1 harder. Beat them for a rare charm and extra cash.'],
  theirs:['They throw first','Watch their total. Whatever they end on is the number you have to get under.'],
  yours:['Your throw','Click the dice you want to keep, then press Bank. Lowest total wins. A crown scores 0, so it’s almost always worth keeping.'],
  again:['Throw again','Whatever you didn’t bank gets thrown again. Each throw you bank at least one, until every die is on your rail.'],
  result:['Who bleeds','Lower total takes the round. The winner hits for how far ahead they finished, times their odds. Your odds start at 1, so finishing 3 under is a 3 hit. Charms raise your odds. The sum on your slip shows the hit live. Click it any time for the breakdown.'],
  odds:['Your odds went up','Every point you finish under them is now worth more. Your slip shows it: ahead by \u00d7 odds = what they lose. Click the sum for where your odds come from.'],
  reward:['Spoils','Take one. Charms go on your rack up top and are always working. Dice go in your bag. The rarer the card, the more it tends to multiply your odds.'],
  bar:['The bar','Bars are stops on the floor plan, two or three a room, so plan your route to hit one when your pockets are full. Short on cash? Click a price twice and he’ll front you the rest for $2. That’s your tab: it comes out of your next winnings automatically.'],
  extras:['Crates and fixtures','Crates are a pick of charms, dice or finishes: open one, keep one. A fixture is a permanent upgrade for the rest of the night, and each room offers one. Don’t like the shelf? Restock it (the price climbs each time you do).'],
  finish:['Finishes','A die can wear one finish, shown as a glowing rim and a colored tag in your bag. Polished, Lucky and Chrome raise your odds when you bank that die, Gold Leaf pays, and Featherweight makes its 1s score 0.'],
  chit:['Chits','Chits are small favors. Some pay out on the spot. The rest wait for the next bar or table and sit next to your cash until they do. Beat a shark in 2 rounds or less, or walk past a table, to earn one.'],
  drinks:['Drinks','Drinks ride in your coat, next to your charms (room for two). On your turn, click one to drink it: it lasts the round. Bourbon and a Sidecar work any time.'],
  offbook:['Off the books','That silver card is off the books. It works like any other charm, but it doesn’t take one of your five slots. They don’t come around often.'],
  rack:['Your charms','Hover a charm up top to read it. Click it to sell it back for half if you need the room. You can hold five.'],
  limit:['The limit went up','You beat the house, so now you can raise the limit. Each one makes the night meaner, and stacks on every limit below it. Click the arrows on Limit to pick. You can always drop back to Penny Ante.'],
  pocket:['Walk in as someone else','Beating bosses opens new ways to start: more cash, more nerve, different dice. Click the arrows on Walk in as to pick who you are tonight.'],
  altboss:['Not who you expected','Each room has two possible owners, picked at random every night. Read the signature on their door before you sit down.'],
};
function tipsSeen(){ try{ return JSON.parse(localStorage.getItem('lr-tips')||'{}'); }catch(e){ return {}; } }
let tipOpen=0;
// Balatro-light: only two notes ever pop up (how to bank, how the map works). Everything else lives in House Rules.
const TIP_ON=['yours','map'];
function tip(id){
  if(!SET.tips||!TIP_ON.includes(id)) return Promise.resolve(); const seen=tipsSeen(); if(seen[id]) return Promise.resolve();
  seen[id]=1; try{ localStorage.setItem('lr-tips',JSON.stringify(seen)); }catch(e){}
  return new Promise(res=>{ const [t,b]=TIPS[id]; tipOpen++; PAUSED=true; SFX.paper();
    const el=h(`<div class="overlay tipov pe" role="dialog" aria-label="${t}"><div class="napkin paper"><div class="sc">The bartender leans over</div><div class="nt">${t}</div><div class="nb">${kw(b)}</div>
      <div class="nrow"><button class="linkish" id="notips">No more notes</button><button class="btn small" id="gotit">Got it</button></div></div></div>`);
    document.body.appendChild(el);
    let shut=0; const done=()=>{ if(shut) return; shut=1; SFX.ui(); el.classList.add('closing'); setTimeout(()=>{ el.remove(); tipOpen=Math.max(0,tipOpen-1); if(!tipOpen&&!menuEl) PAUSED=false; res(); },REDUCED?0:220); };
    el.querySelector('#gotit').onclick=done;
    el.querySelector('#notips').onclick=()=>{ SET.tips=false; saveSet(); done(); };
  });
}

/* ================= PAUSE MENU: the booklet ================= */
let menuEl=null, menuTab='night';
const SPEEDS=[[1,'Unhurried'],[1.6,'Brisk'],[2.4,'Quick']];
function fmtTime(ms){ const s=Math.floor(ms/1000), m=Math.floor(s/60); return `${m}:${String(s%60).padStart(2,'0')}`; }
function srow(l,v){ return `<div class="srow"><span class="sl">${l}</span><span class="leader"></span><span class="sv">${v}</span></div>`; }
function menuPage(tab){
  if(tab==='night'){ if(!G) return '<div class="empty">No run in progress. Take a seat first.</div>'; const st=G.stats;
    return `<div class="secthead">Your Night So Far<small>${G.mode==='endless'?'Stay all night':`Act ${ROMAN[G.act]}`} at ${ACTS[G.act].name}</small></div>
      <div class="stats">${srow('Floor',`${ROMAN[G.act]} \u00b7 ${G.floor+1}/${FLOORS.length}${G.mode==='endless'?` \u00b7 lap ${G.lap+1}`:''}`)}${srow('Tables won',G.won)}${srow('Rounds won',`${st.won} of ${st.rounds}`)}${srow('Rounds lost',st.lost)}${srow('Pushes',st.push)}
      ${srow('Nerve broken',st.dealt)}${srow('Nerve lost',st.taken)}${srow('Biggest hit',st.best)}${srow('Crowns banked',st.crowns)}${srow('Dice banked',st.banked)}${srow('Cash earned',`$${st.earned}`)}${srow('Cash spent',`$${st.spent}`)}${srow('Time at the tables',fmtTime(Date.now()-st.t0))}
      ${best()?srow('Longest night ever',`${best()} tables`):''}</div>
      <div class="secthead" style="margin-top:12px">Your Plays<small>Each one you make adds its level to your margin and its odds. Every 4th time you make one, it levels up.</small></div>
      <div class="stats">${PLAY_KEYS.map(k=>{ const lv=playLv(G.plays,k); return srow(`${PLAYS[k].name} <small style="opacity:.7">${PLAYS[k].desc} Made ${(G.playHits||{})[k]||0}\u00d7.</small>`,`Lv ${lv} \u00b7 +${lv} margin, +${PLAYS[k].per*lv} odds`); }).join('')}</div>
      ${(G.deeds||[]).length?`<div class="secthead" style="margin-top:12px">Your Deeds</div><div class="stats">${G.deeds.map(k=>srow(DEEDS[k].name,DEEDS[k].desc)).join('')}</div>`:''}`; }
  if(tab==='bag'){ if(!G) return '<div class="empty">No run in progress.</div>'; return `<div class="secthead">Your Dice<small>${G.bag.length} in the bag. Six come out each round.</small></div><div id="mb1"></div><div class="mrule"></div><div class="secthead">Your Charms<small>Always working. You carry ${slotsUsed(G)} of ${charmSlots(G)}${G.charms.length>slotsUsed(G)?`, plus ${G.charms.length-slotsUsed(G)} off the books`:''}.</small></div><div id="mb2"></div>${(G.fix||[]).length?`<div class="mrule"></div><div class="secthead">Fixtures<small>Yours for the night.</small></div><div class="list">${G.fix.map(f=>`<div class="item"><div><div class="iname">${FIXTURES[f].name}</div><div class="idesc">${kw(FIXTURES[f].desc)}</div></div></div>`).join('')}</div>`:''}${chitsHTML()?`<div class="mrule"></div><div class="secthead">Chits waiting<small>They spend themselves.</small></div><div class="chitrow">${chitsHTML()}</div>`:''}`; }
  if(tab==='book') return bookHTML();
  if(tab==='settings') return `<div class="secthead">Settings<small>Saved on this device.</small></div>
    <div class="set"><label for="volm">Music</label><input class="dial" id="volm" type="range" min="0" max="10" step="1" value="${Math.round(SET.music*10)}"><span class="sv" id="volmv">${Math.round(SET.music*10)}</span></div>
    <div class="set"><label for="vols">Sound</label><input class="dial" id="vols" type="range" min="0" max="10" step="1" value="${Math.round(SET.sfx*10)}"><span class="sv" id="volsv">${Math.round(SET.sfx*10)}</span></div>
    <div class="set"><span class="lab">Their turn</span><div class="opts" data-k="speed">${SPEEDS.map(([v,n])=>`<button class="opt ${SET.speed===v?'on':''}" data-v="${v}">${n}</button>`).join('')}</div></div>
    <div class="set"><span class="lab">Their throws</span><div class="opts" data-k="deal">${[['full','Every throw'],['quick','One toss'],['instant','Instant']].map(([v,n])=>`<button class="opt ${SET.deal===v?'on':''}" data-v="${v}">${n}</button>`).join('')}</div></div>
    <div class="set"><span class="lab">Next round</span><div class="opts" data-k="auto"><button class="opt ${SET.auto?'on':''}" data-v="1">Deals itself</button><button class="opt ${!SET.auto?'on':''}" data-v="0">I click</button></div></div>
    <div class="set"><span class="lab">Film grain</span><div class="opts" data-k="grain"><button class="opt ${SET.grain?'on':''}" data-v="1">On</button><button class="opt ${!SET.grain?'on':''}" data-v="0">Off</button></div></div>
    <div class="set"><span class="lab">Bartender’s notes</span><div class="opts" data-k="tips"><button class="opt ${SET.tips?'on':''}" data-v="1">On</button><button class="opt ${!SET.tips?'on':''}" data-v="0">Off</button><button class="opt" id="tipreset">Show again</button></div></div>
    <div class="set"><span class="lab">Screen shake</span><div class="opts" data-k="shake"><button class="opt ${SET.shake?'on':''}" data-v="1">On</button><button class="opt ${!SET.shake?'on':''}" data-v="0">Off</button></div></div>`;
  return `<div class="secthead">House Rules</div><ol class="hr">
    <li data-i="1"><span>Each round you draw six dice from your bag. Your opponent throws first and sets the number to beat.</span></li>
    <li data-i="2"><span>Throw your dice. Bank at least one, then throw the rest again. Keep going until every die is banked. Once a round you can <b>Shake</b>: rethrow the dice you picked without banking them, but their score counts 1 lower for it.</span></li>
    <li data-i="3"><span>After your first throw, before you bank: <b>Raise</b> to double the stakes, or <b>Fold</b> to take a small fixed hit and skip the round.</span></li>
    <li data-i="4"><span>Banked dice add up. Lowest total wins the round. A <span class="kw crown">\u265B</span> crown counts for nothing.</span></li>
    <li data-i="5"><span>Win and you hit for the gap <b>\u00d7 your odds</b>. Your odds start at 1. Charms, finishes and drinks add to them (+) or multiply them (\u00d7). Every boss you beat adds +1 for good.</span></li>
    <li data-i="6"><span>Lose and they hit you for the gap \u00d7 <i>their</i> odds, which climb every act.</span></li>
    <li data-i="7"><span>Their nameplate shows what they’re up to this round and next (Leaning in, Sweating, Raises…). Bosses can’t lose more than half their nerve in one round.</span></li>
    <li data-i="8"><span><b>Guard</b> soaks hits before your nerve and stays between rounds at a table. Hit for more than they had left and the overkill pays $1 per 10.</span></li>
    <li data-i="9"><span><b>Plays</b>: two 1s at once, three of a kind, a 1-2-3, three crowns, or finishing on 3 or less. Each adds its level to your winning margin, plus odds. Every 4th time you make one, it levels up.</span></li>
    <li data-i="10"><span>Read their tags. Bosses and the sharks upstairs draw a random house rule each night that works against your build.</span></li>
    <li data-i="11"><span>Charms are always working; you hold five. A silver Off the Books charm doesn’t take a slot.</span></li>
    <li data-i="12"><span>Dice only matter when they come out of the bag. A die can wear one finish (Polished, Lucky, Chrome, Gold Leaf or Featherweight).</span></li>
    <li data-i="13"><span>Each room is a floor plan: climb from the bottom to the owner, one row at a time along the lines. Bars and back alleys are stops on it, so plan your route. After every table the bartender offers a <b>Last call</b>: a drink or a stiff one.</span></li>
    <li data-i="14"><span>The bar: buy dice, charms and drinks, restock the shelf, crack open crates, and buy one fixture a room for good. Tossing a die costs $3 more each time.</span></li>
    <li data-i="15"><span>Drinks ride in your coat, two at most. Drink one on your turn; it lasts the round.</span></li>
    <li data-i="16"><span>Chits are favors: beat a shark in two rounds or walk past a table to earn one. Beat an owner and you can take a <b>deed</b>: a strong racket with a catch, for the rest of the night.</span></li>
    <li data-i="17"><span>Each act is a new league, and Stay all night never stops climbing. Your build has to grow faster than they do.</span></li></ol>
    <div class="prose it" style="margin-top:12px;font-size:13px">Esc opens this booklet. Enter banks.</div>`;
}
function openMenu(tab){ ac(); if(menuEl){ setMenuTab(tab||menuTab); return; } PAUSED=true; SFX.paper();
  menuEl=h(`<div class="overlay pause pe"><div class="booklet paper">
    <div class="mhead"><div class="sc">Intermission</div><div class="mtitle sm">The Booklet</div></div>
    <nav class="ptabs">${[['night','Your Night'],['bag','Your Bag'],['book','Collection'],['settings','Settings'],['rules','House Rules']].map(([k,n])=>`<button class="ptab" data-t="${k}">${n}</button>`).join('')}</nav>
    <div class="pbody" id="pbody"></div>
    <div class="row"><button class="btn go" id="resume">Back to the table</button>${G?'<button class="btn ghost" id="quit">Quit the run</button>':''}</div></div></div>`);
  document.body.appendChild(menuEl);
  menuEl.querySelectorAll('.ptab').forEach(b=>b.onclick=()=>{ SFX.paper(); setMenuTab(b.dataset.t); });
  menuEl.querySelector('#resume').onclick=closeMenu;
  menuEl.addEventListener('pointerdown',e=>{ if(e.target===menuEl) closeMenu(); });
  const q=menuEl.querySelector('#quit'); if(q) q.onclick=()=>{ if(q.dataset.sure){ quitRun(); return; } q.dataset.sure=1; q.textContent='Really? Click again'; SFX.stamp(); };
  setMenuTab(tab||(G?'night':'settings'));
}
function setMenuTab(tab){ menuTab=tab; const body=menuEl.querySelector('#pbody'); menuEl.querySelectorAll('.ptab').forEach(b=>b.classList.toggle('on',b.dataset.t===tab));
  body.innerHTML=menuPage(tab); body.classList.remove('turn'); void body.offsetWidth; body.classList.add('turn');
  if(tab==='bag'&&G){ body.querySelector('#mb1').appendChild(diceList()); body.querySelector('#mb2').appendChild(charmList()); }
  if(tab==='settings'){ const wire=(id,key)=>{ const r=body.querySelector('#'+id); r.oninput=()=>{ SET[key]=r.value/10; body.querySelector('#'+id+'v').textContent=r.value; saveSet(); if(key==='sfx') SFX.bank(0); }; }; wire('volm','music'); wire('vols','sfx');
    const tr=body.querySelector('#tipreset'); if(tr) tr.onclick=e=>{ e.stopPropagation(); try{ localStorage.removeItem('lr-tips'); }catch(x){} SET.tips=true; saveSet(); SFX.stamp(); tr.textContent='Will do'; body.querySelectorAll('[data-k=tips] .opt[data-v]').forEach(x=>x.classList.toggle('on',x.dataset.v==='1')); };
    body.querySelectorAll('.opts').forEach(g=>g.querySelectorAll('.opt[data-v]').forEach(b=>b.onclick=()=>{ const k=g.dataset.k; SET[k]=k==='speed'?+b.dataset.v:k==='deal'?b.dataset.v:b.dataset.v==='1'; saveSet(); SFX.stamp(); g.querySelectorAll('.opt').forEach(x=>x.classList.toggle('on',x===b)); })); } }
function closeMenu(){ if(!menuEl) return; const m=menuEl; menuEl=null; SFX.paper(); m.classList.add('closing'); setTimeout(()=>{ m.remove(); PAUSED=tipOpen>0||!!menuEl; },REDUCED?0:260); }
function quitRun(){ clearSave(); if(menuEl){ menuEl.remove(); menuEl=null; } document.querySelectorAll('.overlay,.payout,.banner,.toast').forEach(e=>e.remove()); closePop(); tipOpen=0; PAUSED=false; tweens.length=0; TS=1; busy=false;
  ALLDICE.forEach(o=>disposeDie(o)); ALLDICE.clear(); decoDice=[]; if(foe){ disposeFoe(foe); foe=null; } clearDebris(); clearLabels(); lampDim=1; F=null; G=null; renderTitle(); }
addEventListener('pointerdown',e=>{ if(F&&F.theirTurn&&TS<6&&!menuEl&&!tipOpen&&!e.target.closest('button,input,.modal,.overlay')){ TS=6; } },true);
addEventListener('keydown',e=>{ if(e.key==='Escape'){ menuEl?closeMenu():openMenu(); return; }
  if(menuEl||tipOpen) return; if(e.key==='Enter'||e.key===' '){ const b=$('#bank:not([disabled])')||$('#again'); if(b){ e.preventDefault(); b.click(); } } });

/* ================= INTERACTION FEEL ================= */
function act(el,fn,delay=300){ const g=el.parentElement; if(el.dataset.busy||(g&&g.dataset.busy)) return; el.dataset.busy=1; if(g) g.dataset.busy=1; el.classList.add('picked'); SFX.punch(); setTimeout(fn,REDUCED?0:delay); }
function stampCard(el,word,fn){ const g=el.parentElement; if(el.dataset.busy||(g&&g.dataset.busy)) return; el.dataset.busy=1; if(g) g.dataset.busy=1; el.dataset.stamp=word; el.classList.add('taken'); el.parentElement&&el.parentElement.classList.add('decided'); SFX.stamp(); if(SET.shake) shakeAmt=.06; setTimeout(fn,REDUCED?0:560); }
let lastHover=0, hoverEl=null;
document.addEventListener('pointerover',e=>{ if(e.pointerType!=='mouse') return; const t=e.target.closest('.btn:not([disabled]),.entry:not([disabled]),.card,.tab,.ptab,.opt,.stamp'); if(t&&t!==hoverEl){ hoverEl=t; const n=performance.now(); if(n-lastHover>70){ lastHover=n; SFX.hover(); } } if(!t) hoverEl=null; });
document.addEventListener('pointerdown',e=>{ const b=e.target.closest('.btn,.tab'); if(b&&!b.disabled){ b.classList.remove('press'); void b.offsetWidth; b.classList.add('press'); SFX.punch(); } });
document.addEventListener('pointermove',e=>{ const c=e.target.closest&&e.target.closest('.card'); if(!c) return; const r=c.getBoundingClientRect(); const x=(e.clientX-r.left)/r.width-.5, y=(e.clientY-r.top)/r.height-.5; c.style.setProperty('--ry',(x*14)+'deg'); c.style.setProperty('--rx',(-y*12)+'deg'); c.style.setProperty('--gx',(50+x*80)+'%'); });
document.addEventListener('pointerout',e=>{ const c=e.target.closest&&e.target.closest('.card'); if(c&&!c.contains(e.relatedTarget)){ c.style.setProperty('--ry','0deg'); c.style.setProperty('--rx','0deg'); } });
function dustAt(p){ if(REDUCED) return; for(let i=0;i<10;i++){ const s=h('<i class="dust"></i>'); s.style.left=p.x+'px'; s.style.top=p.y+'px'; fx.appendChild(s); const a=Math.PI+Math.random()*Math.PI, r=20+Math.random()*30;
  s.animate([{transform:'translate(-50%,-50%) scale(1)',opacity:.8},{transform:`translate(${Math.cos(a)*r}px,${Math.sin(a)*r*.5-10}px) scale(2.2)`,opacity:0}],{duration:500+Math.random()*300,easing:'cubic-bezier(.2,.8,.2,1)'}).onfinish=()=>s.remove(); } }

function saveRun(){ if(!G) return; try{ const o={...G,bag:G.bag.map(d=>({type:d.type,cracks:d.cracks,f:d.f})),stats:{...G.stats,el:Date.now()-G.stats.t0}}; delete o._newCharm; localStorage.setItem('lr-save',JSON.stringify(o)); }catch(e){} }
function loadRun(){ try{ const o=JSON.parse(localStorage.getItem('lr-save')||'null'); if(!o||!o.bag) return null; o.bag=o.bag.map(d=>({uid:uidN++,type:d.type,cracks:d.cracks||0,...(d.f?{f:d.f}:{})})); o.rep=o.rep||0; o.tally=o.tally||0; o.tab=o.tab||0; o.limit=o.limit||0; o.pocket=o.pocket||'regular'; o.filePrice=o.filePrice||5; o.gildPrice=o.gildPrice||8; o.stats.t0=Date.now()-(o.stats.el||0); return o; }catch(e){ return null; } }
function clearSave(){ try{ localStorage.removeItem('lr-save'); }catch(e){} }
/* ================= BOOT ================= */
applySet();
let booted=false; function boot(){ if(booted) return; booted=true;
  if(GL_OK){ initGL(); buildCharmIcons(); }
  try{ uiTextures(0); }catch(e){}
  if(!GL_OK){ canvas.style.display='none'; document.body.style.background='#0d0a09'; }
  renderTitle(); }
try{ Promise.all(["44px 'Jersey 15'","40px Yellowtail","38px Limelight","18px 'Lilita One'","700 16px Nunito"].map(f=>document.fonts.load(f))).then(boot,boot); }catch(e){ boot(); }
setTimeout(boot,2500);
