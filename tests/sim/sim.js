// Balance simulator for Low Roller. Plays whole runs with the game's own rules (src/js/logic.js).
// It mirrors the fight flow in src/js/game.js (rewards, bar, events, rests, boss phase 2, signatures,
// quirks): any rule change in game.js that the sim doesn't know about makes the balance numbers lie.
//   node tests/sim/sim.js n=600 skill=good [lim=0..7] [pocket=regular|hustler|gambler|jeweler|heavy] [sharks=1]
// Bots: pro (rollout search + build eval, slow), good (solid human), mid (random shopping), casual.
const path=require('path'); const L=require(process.env.LOGIC||path.join(__dirname,'..','..','src','js','logic.js')); const {DT,CHARMS,ACTS,FLOORS}=L;
const A=Object.fromEntries(process.argv.slice(2).map(a=>a.split('=')));
const LV=+(A.lim||0), POCKET=A.pocket||'regular', LM=L.limitMods(LV); const N=+(A.n||300), ROLL=+(A.roll||14), EVALK=+(A.k||120), SKILL=A.skill||'pro';
function seeded(seed){ let s=seed>>>0; return ()=>{ s=(s+0x6D2B79F5)>>>0; let t=s; t=Math.imul(t^(t>>>15),t|1); t^=t+Math.imul(t^(t>>>7),t|61); return ((t^(t>>>14))>>>0)/4294967296; }; }
const has=(G,c)=>G.charms.includes(c);

// ---------- one round ----------
function faceSet(left,ctx){ const f=left.map(L.rollInst);
  left.forEach((d,i)=>{ if(d.type==='twin'){ let b=null; f.forEach((x,j)=>{ if(j!==i&&left[j].type!=='twin'&&(b===null||L.effVal(x,ctx)<L.effVal(b,ctx))) b=x; }); if(b!==null) f[i]=b; } }); return f; }
const isCrown=f=>f==='C'||f==='G';
function payoff(p,T,R,G,o,env,lam){ const r=L.settle(p,T,R,G.charms,o,{...env}); if(r.winner==='you') return r.dmg; if(r.winner==='them') return -lam*r.dmg*(has(G,'highstakes')?1:1); return 0; }
// cheap policy used inside rollouts and for build evaluation
function greedyKeep(faces,left,ctx,G,need){ const ev=faces.map(f=>L.effVal(f,ctx)); const ord=ev.map((e,i)=>[e-(isCrown(faces[i])?.01:0),i]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);
  const th=left.length>=3?1:2; let k=ord.filter(i=>ev[i]<=th); if(has(G,'patience')&&!k.length) k=[ord[0]]; if(has(G,'patience')) k=[ord[0]]; if(!k.length) k=[ord[0]]; for(const i of ord){ if(k.length>=need) break; if(!k.includes(i)) k.push(i); } return k; }
function finishRound(left,p,R,G,o,first,ctxOf,policy){ while(left.length){ const ctx=ctxOf(first); const faces=faceSet(left,ctx); const need=o.q.includes('fuse')&&first?Math.min(2,left.length):1;
    const keep=policy(faces,left,ctx,G,need,p,R); const kf=keep.map(i=>faces[i]), kt=keep.map(i=>left[i].type);
    p+=L.bankVals(kf,ctx,G.charms,keep.length===left.length).reduce((a,b)=>a+b,0); L.noteBank(R,kf,kt,G.charms); left=left.filter((_,i)=>!keep.includes(i)); first=false; } return p; }
function playRound(hand,G,o,F,T,env,lam,smart){
  let left=hand.slice(), p=0, R=L.newRound(), first=true, spoon=has(G,'spoon');
  if(o.sig==='gift'){ const n=F.p2?2:1; for(let i=0;i<n&&i<left.length;i++) left[i]={type:'d8'}; }
  const ctxOf=fst=>({cold:o.q.includes('cold')&&fst,penny:has(G,'penny')&&fst,deuces:has(G,'deuces'),ringer:has(G,'ringer')});
  const crowns=[];
  while(left.length){ const ctx=ctxOf(first); let faces=faceSet(left,ctx);
    if(o.sig==='slam'&&F.p2&&first&&left.length>2){ const ord=faces.map((f,i)=>[L.effVal(f,ctx),i]).sort((a,b)=>a[0]-b[0]); ord.slice(0,2).forEach(([,i])=>faces[i]=L.rollInst(left[i])); }
    const nh=Math.min(left.length-1,(o.q.includes('haze')&&first?1:0)+(o.sig==='trick'?(F.p2?3:2):0)); const H=L.shuffle([...left.keys()]).slice(0,Math.max(0,nh));
    let ev=faces.map((f,i)=>H.includes(i)?9:L.effVal(f,ctx));
    if(spoon){ let w=0; ev.forEach((e,i)=>{ if(e>ev[w]&&!H.includes(i)) w=i; }); if(ev[w]>=3&&!H.includes(w)){ faces[w]=L.rollInst(left[w]); ev[w]=L.effVal(faces[w],ctx); spoon=false; } }
    const need=o.q.includes('fuse')&&first?Math.min(2,left.length):1;
    let keep;
    if(smart&&left.length>1){ // rollout search over "keep the k best" (and crowns-first variants)
      const ord=ev.map((e,i)=>[e-(isCrown(faces[i])&&!H.includes(i)?.01:0),i]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);
      const cands=[]; for(let k=Math.max(1,need);k<=left.length;k++) cands.push(ord.slice(0,k));
      let best=null, bv=-1e9;
      for(const c of cands){ let tot=0; const kf=c.map(i=>faces[i]), kt=c.map(i=>left[i].type);
        const p1=p+L.bankVals(kf,ctx,G.charms,c.length===left.length).reduce((a,b)=>a+b,0);
        for(let r=0;r<ROLL;r++){ const R2={...R}; L.noteBank(R2,kf,kt,G.charms); const rest=left.filter((_,i)=>!c.includes(i));
          const pf=finishRound(rest,p1,R2,G,o,false,ctxOf,greedyKeep); tot+=payoff(pf,T,R2,G,o,env,lam); }
        if(tot>bv){ bv=tot; best=c; } }
      keep=best; }
    else keep=greedyKeep(faces.map((f,i)=>H.includes(i)?9:f),left,ctx,G,need);
    const kf=keep.map(i=>faces[i]), kt=keep.map(i=>left[i].type);
    p+=L.bankVals(kf,ctx,G.charms,keep.length===left.length).reduce((a,b)=>a+b,0); L.noteBank(R,kf,kt,G.charms);
    kf.forEach((f,j)=>{ if(isCrown(f)) crowns.push(kt[j]); });
    left=left.filter((_,i)=>!keep.includes(i)); first=false; }
  return {p,R,crowns}; }

// ---------- a table ----------
function pickFoe(G,kind,act,floor){ const Af=ACTS[act].foes; if(kind==='B') return L.bossOf(act,G.bossIx[act]);
  const used=G.used=G.used||{}, fresh=pool=>{ const un=pool.filter(p=>!used[act+p.n]), nl=pool.filter(p=>p.n!==G.lastFoe); const d=L.pick(un.length?un:nl.length?nl:pool); used[act+d.n]=1; G.lastFoe=d.n; return d; }; // like chooseFoe: no repeats in a room
  if(kind==='E') return fresh(floor<=3?Af.e1:Af.e2);
  let pool=floor<=3?Af.t1:Af.t2; if(floor<2&&act===0&&G.lap===0) pool=pool.filter(p=>!(p.q||[]).some(q=>!L.QUIRKS[q].help)); return fresh(pool); }
function fight(G,kind,act,floor,smart,stats){ const def=pickFoe(G,kind,act,floor);
  const o=L.makeOpp(def,kind,act,floor,G.lap,kind==='F'&&act===0&&floor<2&&G.lap===0,LV); let oh=o.hp; const F={p2:false,wins:0,loss:0,rabbit:false,heavy:false,rounds:0};
  while(G.hp>0&&oh>0&&F.rounds<80){ F.rounds++; const T=o.q.includes('pair')?Math.min(L.aiRound(o.bag,o.t).total,L.aiRound(o.bag,o.t).total):L.aiRound(o.bag,o.t).total;
    if(o.q.includes('tax')) G.gold=Math.max(0,G.gold-1);
    const hand=L.shuffle(G.bag).slice(0,6+(F.heavy?1:0)); F.heavy=false; hand.forEach(d=>{ if(DT[d.type].breaks) d.cracks=(d.cracks||0)+1; });
    const env={bag:G.bag.length,round:F.rounds,q:o.q,raid:L.isRaid(o,F.rounds,F.p2),gold:G.gold,rep:G.rep,tally:G.tally,wins:F.wins,lossStreak:F.loss,oppHalf:oh<=o.hp/2,grow:G.grow||{}};
    const lam=Math.max(.6,Math.min(6,oh/Math.max(8,G.hp)));
    const {p,R,crowns}=playRound(hand,G,o,F,T,env,lam,smart);
    crowns.forEach(t=>{ if(has(G,'hothand')) G.hp=Math.min(G.maxHp,G.hp+1); if(has(G,'goldcrown')) G.gold++; if(t==='gamble') G.gold+=3; if(t==='gilded') G.gold+=2; });
    if(R.bomb) oh=Math.max(1,oh-R.bomb*L.bombDmg(o.hp));
    const r=L.settle(p,T,R,G.charms,o,env);
    if(stats){ stats.rounds++; if(r.winner==='you'){ stats.w++; stats.odds+=r.odds; stats.hit+=r.dmg; stats.best=Math.max(stats.best,r.dmg); } else if(r.winner==='them'){ stats.l++; stats.taken+=r.dmg; } }
    G.gold+=R.payday||0; let free=false;
    if(r.winner==='you'){ oh-=r.dmg; F.wins++; F.loss=0; if(has(G,'tip')) G.gold+=2; if(has(G,'bookie')) G.gold+=Math.min(8,r.margin); }
    else if(r.winner==='them'){ let d=r.dmg; if(has(G,'rabbit')&&!F.rabbit){F.rabbit=true;d=0;free=true;} G.hp-=d; if(o.sig==='feed') oh=Math.min(o.hp,oh+d); if(!free){ F.wins=0; F.loss++; if(o.q.includes('steal')) G.gold=Math.max(0,G.gold-3); if(o.q.includes('heavy')) F.heavy=true; } }
    else F.wins=0;
    G.gold+=L.afterRound(G,r.winner,free);
    if(o.q.includes('nervous')) oh-=1;
    if(has(G,'blood')&&G.hp>1) G.hp-=1;
    G.bag=G.bag.filter(d=>!(DT[d.type].breaks&&d.cracks>=L.breaksAt(d.type,G.charms)));
    if(def.boss&&!F.p2&&oh<=o.hp/2){ F.p2=true; const H=def.half||ACTS[act].half; H.add.forEach(q=>{ if(!o.q.includes(q)) o.q.push(q); }); o.t=H.t; } }
  if(oh<=0) G.gold+=L.afterFight(G);
  return {won:oh<=0,rounds:F.rounds,hp:o.hp,name:def.n}; }

// ---------- judging a build: play sample rounds against this act's regulars ----------
function evalBuild(G,act,floor){ const save=Math.random; Math.random=seeded(1234+act*77+floor);
  try{ const Af=ACTS[act].foes, pool=[...Af.t2,...Af.e1]; let dealt=0, taken=0;
    for(let k=0;k<EVALK;k++){ const def=pool[k%pool.length]; const o=L.makeOpp(def,'F',act,Math.max(floor,4),G.lap,false); const T=L.aiRound(o.bag,o.t).total;
      const hand=L.shuffle(G.bag).slice(0,6); const env={bag:G.bag.length,round:1+k%5,q:o.q,gold:G.gold,rep:G.rep,tally:G.tally,wins:k%3,lossStreak:0,oppHalf:false,grow:G.grow||{}};
      const {p,R}=playRound(hand,{...G,hp:99},o,{p2:false},T,env,1,false); const r=L.settle(p,T,R,G.charms,o,env);
      dealt+=(R.bomb||0)*L.bombDmg(L.ACT_HP[act].F*1.6)+(has(G,'blood')?-.4:0);
      if(r.winner==='you') dealt+=r.dmg; else if(r.winner==='them') taken+=r.dmg*(has(G,'rabbit')?.8:1); }
    dealt/=EVALK; taken/=EVALK; const hp=L.ACT_HP[act].F*1.6; // a typical table later in the act
    return taken*(hp/Math.max(.3,dealt)); // nerve this build expects to lose per table
  } finally { Math.random=save; } }
const cloneG=G=>({...G,bag:G.bag.map(d=>({...d,f:d.f?d.f.slice():undefined})),charms:G.charms.slice(),offbook:(G.offbook||[]).slice()});
function takeOff(G,c){ G.charms.push(c); (G.offbook=G.offbook||[]).push(c); if(c==='liver'){ G.maxHp+=12; G.hp+=12; } if(c==='tally') G.tally=0; }
function applyCharm(G,c,dropIdx){ if(dropIdx!=null){ const w=G.charms[dropIdx]; G.charms.splice(dropIdx,1); G.gold+=Math.floor(CHARMS[w].price/2); if(w==='liver'){ G.maxHp-=12; G.hp=Math.min(G.hp,G.maxHp); } } G.charms.push(c); if(c==='liver'){ G.maxHp+=12; G.hp+=12; } if(c==='tally') G.tally=0; }
// best way to take a charm (maybe replacing one); returns {cost,drop}
function charmOption(G,c,act,floor){ if(G.charms.includes(c)) return null;
  if(L.slotsUsed(G)<5){ const g=cloneG(G); applyCharm(g,c); return {cost:evalBuild(g,act,floor)-(c==='liver'?6:0)-(c==='cigar'?4:0),drop:null}; }
  let best=null; G.charms.forEach((x,i)=>{ if(L.offbook(G,x)) return; const g=cloneG(G); applyCharm(g,c,i); const v=evalBuild(g,act,floor); if(!best||v<best.cost) best={cost:v,drop:i}; }); return best; }

const poolT=(G,t)=>Object.keys(CHARMS).filter(c=>!G.charms.includes(c)&&CHARMS[c].tier===t);
const remaining=(act,floor)=> (2-act)*6+Math.max(1,(8-floor)*.66);
const PAY=(kind,fast)=>kind==='B'?20:kind==='E'?10:Math.max(1,5+(fast?3:0)+LM.pay);
function reward(G,kind,fast,act,floor,smart){ G.gold+=PAY(kind,fast);
  let ch=[]; if(kind==='B'){ const r=L.pick([...poolT(G,'r').map(c=>({c})),{t:'shaved'}]); ch.push(r); L.shuffle(poolT(G,'u')).slice(0,2).forEach(c=>ch.push({c})); }
  else if(kind==='E') L.shuffle(poolT(G,'u')).slice(0,3).forEach(c=>ch.push({c}));
  else { ch.push({t:L.shopDie(act)}); L.shuffle(poolT(G,'c')).slice(0,2).forEach(c=>ch.push({c})); }
  if(!smart){ const c=ch.find(x=>x.c&&!G.charms.includes(x.c)); if(c&&L.slotsUsed(G)<5) applyCharm(G,c.c); return; }
  const base=evalBuild(G,act,floor); let best=null;
  ch.forEach(x=>{ if(x.c){ const o=charmOption(G,x.c,act,floor); if(o&&(!best||o.cost<best.cost)) best={...o,x}; } else { const g=cloneG(G); g.bag.push({type:x.t}); const v=evalBuild(g,act,floor); if(!best||v<best.cost) best={cost:v,x}; } });
  if(best&&best.cost<base){ if(best.x.c) applyCharm(G,best.x.c,best.drop); else G.bag.push({type:best.x.t}); }
  else if(G.hp<G.maxHp) G.hp=Math.min(G.maxHp,G.hp+12); }
function shop(G,act,floor,smart){
  const up=LM.price; const stock=L.shopDice(act,2).map(t=>({t,price:DT[t].price+up})); for(let i=0;i<3;i++){ const c=L.pick(poolT(G,L.rollTier(act)).filter(c=>!stock.some(s=>s.c===c))); if(c){ const off=Math.random()<L.OFFBOOK_P; stock.push({c,off,price:CHARMS[c].price+up+(off?L.OFFBOOK_FEE:0)}); } }
  if(!smart){ stock.filter(s=>s.c).forEach(s=>{ if(G.gold>=s.price&&(s.off||L.slotsUsed(G)<5)&&Math.random()<.6){ G.gold-=s.price; s.off?takeOff(G,s.c):applyCharm(G,s.c); } }); if(G.hp<G.maxHp*.5&&G.gold>=6){ G.gold-=6; G.hp=Math.min(G.maxHp,G.hp+12); } return; }
  let backUsed=false;
  for(let guard=0;guard<6;guard++){ const base=evalBuild(G,act,floor), fights=remaining(act,floor); const opts=[];
    // value of nerve: a point now is worth about a point, more when low
    const nerveVal=G.hp<G.maxHp*.4?1.6:G.hp<G.maxHp*.7?1:.5;
    stock.forEach(s=>{ if(s.sold||G.gold<s.price) return; if(s.c&&s.off&&!G.charms.includes(s.c)){ const g=cloneG(G); takeOff(g,s.c); opts.push({s,gain:(base-evalBuild(g,act,floor))*fights,price:s.price,do:()=>{ takeOff(G,s.c); s.sold=1; }}); }
      else if(s.c){ const o=charmOption(G,s.c,act,floor); if(o) opts.push({s,gain:(base-o.cost)*fights,price:s.price,do:()=>{ applyCharm(G,s.c,o.drop); s.sold=1; }}); }
      else { const g=cloneG(G); g.bag.push({type:s.t}); opts.push({s,gain:(base-evalBuild(g,act,floor))*fights,price:s.price,do:()=>{ G.bag.push({type:s.t}); s.sold=1; }}); } });
    if(G.gold>=6+up&&G.hp<G.maxHp) opts.push({gain:Math.min(12,G.maxHp-G.hp)*nerveVal,price:6+up,do:()=>{ G.hp=Math.min(G.maxHp,G.hp+12); }});
    if(G.gold>=6&&G.bag.length>6){ let bi=null,bv=1e9; G.bag.forEach((d,i)=>{ const g=cloneG(G); g.bag.splice(i,1); const v=evalBuild(g,act,floor); if(v<bv){bv=v;bi=i;} }); opts.push({gain:(base-bv)*fights,price:6+up,do:()=>{ G.bag.splice(bi,1); }}); }
    const tryMod=(fn,can,price,key)=>{ if(G.gold<price) return; let bi=null,bv=1e9; G.bag.forEach((d,i)=>{ if(!can(d)) return; const g=cloneG(G); fn(g.bag[i]); const v=evalBuild(g,act,floor); if(v<bv){bv=v;bi=i;} }); if(bi!=null) opts.push({gain:(base-bv)*fights,price,do:()=>{ fn(G.bag[bi]); G[key]+=key==='filePrice'?2:4; }}); };
    tryMod(L.fileDie,L.canFile,G.filePrice+up,'filePrice'); tryMod(L.gildDie,L.canGild,G.gildPrice+up,'gildPrice');
    if(!backUsed&&G.gold>=4+15){ opts.push({gain:3,price:4,do:()=>{ backUsed=true; const r=L.pick(poolT(G,'r')); if(r) stock.push({c:r,price:CHARMS[r].price}); }}); }
    const bestO=opts.filter(o=>o.gain>0.5).sort((a,b)=>b.gain/b.price-a.gain/a.price)[0]; if(!bestO) break;
    G.gold-=bestO.price; bestO.do(); } }

// "good": reads the charms like a decent human (fixed priorities), plays the dice well
const VAL={opener:5,packed:5,stack:6,allin:3,glassblower:3,nearmiss:5,blood:6,threes:3,regular:6,heckler:6,doubledown:8,tally:6,jewels:6,slowburn:6,cut:4,bouncer:6,thick:4,tip:2,goldcrown:2,hothand:3,liver:3,cigar:3,penny:9,spoon:5,lastcall:7,jacks:6,snake:5,patience:4,barfly:5,rabbit:4,closer:7,kingpin:9,lowball:8,highstakes:8,bookie:4,collection:5,consolation:2,savings:3,shiner:4,evens:3,deuces:6,piggy:7,tommy:6,jackpot:5,longshot:5,finisher:7,moonshine:9,crownroom:7,straight:7,ringer:9,bigshot:9};
const DVAL={gilded:0,bomb:1,goose:1,boxcar:2,d8:-3,d6:0,pebble:2,glass:2,gamble:-1,ember:1,twin:1,loaded:3,devil:3,coin:4,shaved:6,royal:2,deuce:1,payday:1,trick:0,bubbly:3,viper:4};
const worstOf=G=>G.charms.filter(x=>!L.offbook(G,x)).reduce((m,x)=>VAL[x]<VAL[m]?x:m);
const wantC=(G,c)=>!G.charms.includes(c)&&(L.slotsUsed(G)<5||VAL[c]>VAL[worstOf(G)]+1);
const takeC=(G,c)=>applyCharm(G,c,L.slotsUsed(G)>=5?G.charms.indexOf(worstOf(G)):null);
function rewardGood(G,kind,fast,act){ G.gold+=PAY(kind,fast);
  let ch=[]; if(kind==='B'){ ch.push(L.pick([...poolT(G,'r').map(c=>({c})),{t:'shaved'}])); L.shuffle(poolT(G,'u')).slice(0,2).forEach(c=>ch.push({c})); }
  else if(kind==='E') L.shuffle(poolT(G,'u')).slice(0,3).forEach(c=>ch.push({c})); else { ch.push({t:L.shopDie(act)}); L.shuffle(poolT(G,'c')).slice(0,2).forEach(c=>ch.push({c})); }
  const b=ch.filter(x=>x.c&&wantC(G,x.c)).sort((a,b)=>VAL[b.c]-VAL[a.c])[0]; if(b) takeC(G,b.c); else { const d=ch.find(x=>x.t&&DVAL[x.t]>=2); if(d) G.bag.push({type:d.t}); else G.hp=Math.min(G.maxHp,G.hp+12); } }
function shopGood(G,act){ const up=LM.price; const stock=L.shopDice(act,2).map(t=>({t,price:DT[t].price+up})); for(let i=0;i<3;i++){ const c=L.pick(poolT(G,L.rollTier(act)).filter(c=>!stock.some(s=>s.c===c))); if(c){ const off=Math.random()<L.OFFBOOK_P; stock.push({c,off,price:CHARMS[c].price+up+(off?L.OFFBOOK_FEE:0)}); } }
  if(G.hp<G.maxHp*.5&&G.gold>=6+up){ G.gold-=6+up; G.hp=Math.min(G.maxHp,G.hp+12); }
  stock.filter(s=>s.c).sort((a,b)=>VAL[b.c]-VAL[a.c]).forEach(s=>{ if(s.off&&G.gold>=s.price&&!G.charms.includes(s.c)){ G.gold-=s.price; takeOff(G,s.c); } else if(!s.off&&G.gold>=s.price&&wantC(G,s.c)){ G.gold-=s.price; takeC(G,s.c); } });
  const w=G.bag.reduce((m,d)=>DVAL[d.type]<DVAL[m.type]?d:m); if(G.bag.length>6&&DVAL[w.type]<0&&G.gold>=6+up){ G.gold-=6+up; G.bag=G.bag.filter(d=>d!==w); }
  stock.filter(s=>s.t).forEach(s=>{ if(G.gold>=s.price&&DVAL[s.t]>=3){ G.gold-=s.price; G.bag.push({type:s.t}); } });
  const gl=G.bag.filter(L.canGild).sort((a,b)=>DVAL[b.type]-DVAL[a.type]); if(G.gold>=G.gildPrice+up+3&&gl.length){ G.gold-=G.gildPrice+up; G.gildPrice+=4; L.gildDie(gl[0]); }
  const fl=G.bag.filter(L.canFile).sort((a,b)=>DVAL[b.type]-DVAL[a.type]); if(G.gold>=G.filePrice+up+3&&fl.length){ G.gold-=G.filePrice+up; G.filePrice+=2; L.fileDie(fl[0]); } }
function event(G,act){ const e=L.rnd(14);
  if(e===9){ const fl=G.bag.filter(L.canFile); if(G.gold>=7&&fl.length){ G.gold-=7; L.fileDie(fl.sort((a,b)=>(DVAL[a.type]||0)-(DVAL[b.type]||0))[0]); } }
  if(e===10){ const pool=poolT(G,'u'); if(G.hp>G.maxHp*.5&&L.slotsUsed(G)<5&&pool.length){ G.hp-=8; applyCharm(G,SKILL==='good'?pool.sort((a,b)=>VAL[b]-VAL[a])[0]:L.pick(pool)); } else G.hp=Math.min(G.maxHp,G.hp+8); }
  if(e===11){ if(G.gold>=9){ G.gold-=9; G.bag.push(...L.shopDice(act,2).map(type=>({type}))); } else G.gold+=6; }
  if(e===12){ if(G.hp>G.maxHp*.6){ if(Math.random()<.5) G.bag.push({type:'shaved'}); else G.hp-=10; } else if(G.gold>=3){ G.gold-=3; G.hp=Math.min(G.maxHp,G.hp+5); } }
  if(e===13){ if(G.gold>=15){ G.gold-=15; G.rep++; } }
  if(e===0){ if(G.gold>=6&&G.hp<G.maxHp*.85){ G.gold-=6; G.maxHp+=4; G.hp=Math.min(G.maxHp,G.hp+10); } }
  if(e===1){ if(G.gold>=10) G.gold-=10; else if(G.bag.length>6){ const i=G.bag.findIndex(d=>d.type==='d8'); G.bag.splice(i>=0?i:0,1); } }
  if(e===2){ const d=G.bag.find(x=>x.type==='d6'&&!x.f); if(d) d.type=L.pick(['loaded','pebble','ember','twin','gamble','coin','devil','d8']); }
  if(e===3) G.gold+=5;
  if(e===4){ if(G.hp>24){ G.hp-=8; G.gold+=20; } }
  if(e===5){ if(G.hp>20){ G.hp-=6; G.bag.push({type:'glass'}); } }
  if(e===6){ if(Math.random()<.5) G.gold+=8; else G.gold=Math.max(0,G.gold-8); }
  if(e===7){ if(G.gold<15) G.gold+=14; else { G.maxHp+=6; G.hp+=6; } }
  if(e===8) G.gold+=10; }
function rest(G){ if(G.hp<G.maxHp*.75) G.hp=Math.min(G.maxHp,G.hp+Math.ceil(G.maxHp*LM.rest)); else { const d8=G.bag.find(x=>x.type==='d8'); const d6=G.bag.find(x=>x.type==='d6'&&!x.f); if(d8) d8.type='d6'; else if(d6) d6.type='loaded'; else G.hp=Math.min(G.maxHp,G.hp+Math.ceil(G.maxHp*LM.rest)); } }
function choose(G,opts,act,floor,smart){
  if(SKILL==='good'){ if(opts.includes('B')) return 'B'; if(opts.includes('R')&&G.hp<G.maxHp*.6) return 'R'; if(opts.includes('E')&&G.hp>G.maxHp*.7) return 'E'; if(opts.includes('F')) return 'F'; return opts.includes('R')?'R':opts[0]; }
  if(!smart) return opts.includes('F')?'F':opts.includes('B')?'B':opts[0];
  if(opts.includes('B')) return 'B';
  const cost=evalBuild(G,act,floor);
  if(opts.includes('R')&&G.hp<G.maxHp*.55) return 'R';
  if(opts.includes('E')&&G.hp-cost*1.9>G.maxHp*.45) return 'E';
  if(opts.includes('?')&&G.hp<G.maxHp*.5&&!opts.includes('R')) return '?';
  if(opts.includes('F')) return 'F';
  if(opts.includes('R')&&G.hp<G.maxHp*.85) return 'R';
  return opts.includes('?')?'?':opts[0]; }

let tuned=false;
function run(smart){ if(A.tune&&!tuned){ require(path.resolve(A.tune))(L); tuned=true; } const P=L.pocketStart(POCKET), hp0=P.hp+LM.startHp;
  const G={hp:hp0,maxHp:hp0,gold:P.gold,lap:0,rep:0,tally:0,filePrice:5,gildPrice:P.gild,bag:P.bag.map(type=>({type})),charms:P.charms.slice(),bossIx:[L.rnd(2),L.rnd(2),L.rnd(2)]}; if(P.ruby) L.gildDie(G.bag[0]);
  // give=charm[,charm] / givedie=type: start every run holding it (to measure a card's power without pick bias)
  if(A.give) A.give.split(',').forEach(c=>{ if(!G.charms.includes(c)) G.charms.push(c); if(c==='liver'){ G.maxHp+=12; G.hp+=12; } });
  if(A.givedie) for(let k=0;k<2;k++){ const d=G.bag.find(x=>x.type==='d6'); if(d) d.type=A.givedie; }
  const out={acts:0,fights:[],stats:{rounds:0,w:0,l:0,odds:0,hit:0,taken:0,best:0}};
  for(let act=0;act<3;act++){ const floors=L.genFloors();
    for(let f=0;f<FLOORS.length;f++){ const n=choose(G,floors[f],act,f,smart);
      if(n==='R'){ rest(G); continue; } if(n==="?"){ event(G,act); if(G.hp<=0){ out.died={act,f,kind:'?'}; out.G=G; return out; } continue; }
      const hpb=G.hp; const r=fight(G,n,act,f,playSmart,out.stats); out.fights.push({act,kind:n,rounds:r.rounds,lost:hpb-Math.max(0,G.hp),won:r.won,hp:r.hp,name:r.name});
      if(!r.won){ out.died={act,f,kind:n,name:r.name}; out.G=G; return out; }
      if(n==='B') G.rep++; if(has(G,'tally')) G.tally++; if(has(G,'cigar')) G.hp=Math.min(G.maxHp,G.hp+6);
      if(SKILL==='good'){ rewardGood(G,n,r.rounds<=3,act); shopGood(G,act); } else { reward(G,n,r.rounds<=3,act,f,smart); shop(G,act,f,smart); } }
    out.acts=act+1; (out.snap=out.snap||[])[act]={charms:G.charms.slice(),bag:G.bag.map(d=>d.type)}; G.hp=Math.min(G.maxHp,G.hp+Math.ceil(G.maxHp*LM.stairs)); }
  out.G=G; out.won=true; return out; }

const smart=SKILL==='pro'; const playSmart=SKILL!=='casual'; const res=[]; const t0=Date.now();
for(let i=0;i<N;i++){ res.push(run(smart)); if(A.progress&&i%25===24) console.error(i+1,((Date.now()-t0)/1000|0)+'s'); }
const pct=x=>(100*x).toFixed(0)+'%';
console.log(`lim=${LV} ${L.LIMITS[LV].n} pocket=${POCKET} bot=${SKILL} runs=${N}  WIN ${pct(res.filter(r=>r.won).length/N)}  | clear A1 ${pct(res.filter(r=>r.acts>=1).length/N)} · A2 ${pct(res.filter(r=>r.acts>=2).length/N)} · A3 ${pct(res.filter(r=>r.acts>=3).length/N)}`);
const by={}; res.forEach(r=>r.fights.forEach(f=>{ const k=`A${f.act+1}${f.kind}`; (by[k]=by[k]||[]).push(f); }));
Object.keys(by).sort().forEach(k=>{ const B=by[k]; const avg=f=>(B.reduce((a,x)=>a+f(x),0)/B.length).toFixed(1); console.log(`  ${k.padEnd(4)} n=${String(B.length).padStart(4)}  nerve ${avg(x=>x.hp).padStart(5)}  rounds ${avg(x=>x.rounds).padStart(4)}  you lose ${avg(x=>x.lost).padStart(4)}  survive ${pct(B.filter(x=>x.won).length/B.length)}`); });
const bb={}; res.forEach(r=>r.fights.filter(f=>f.kind==='B').forEach(f=>{ (bb[f.name]=bb[f.name]||[0,0])[0]++; if(f.won) bb[f.name][1]++; })); console.log('  bosses',Object.entries(bb).map(([k,v])=>`${k} ${pct(v[1]/v[0])} of ${v[0]}`).join(' · '));
const bn={}; res.forEach(r=>r.fights.filter(f=>f.kind==='E').forEach(f=>{ const k=`A${f.act+1} ${f.name}`; (bn[k]=bn[k]||[0,0,0])[0]++; if(f.won) bn[k][1]++; bn[k][2]+=f.lost; })); if(A.sharks) console.log('  sharks',Object.entries(bn).sort().map(([k,v])=>`${k} ${pct(v[1]/v[0])} (-${(v[2]/v[0]).toFixed(0)})`).join(' · '));
const deaths={}; res.filter(r=>r.died).forEach(r=>{ const k=`A${r.died.act+1}${r.died.kind}`; deaths[k]=(deaths[k]||0)+1; }); console.log('  deaths',JSON.stringify(deaths));
const S=res.reduce((a,r)=>{ for(const k in r.stats) a[k]=(a[k]||0)+(k==='best'?0:r.stats[k]); a.best=(a.best||0)+r.stats.best; return a; },{});
console.log(`  rounds won ${pct(S.w/S.rounds)} lost ${pct(S.l/S.rounds)} · avg odds on wins ${(S.odds/S.w).toFixed(2)} · avg hit ${(S.hit/S.w).toFixed(1)} · avg hit taken ${(S.taken/Math.max(1,S.l)).toFixed(1)} · best hit/run ${(S.best/N).toFixed(0)}`);
const win=res.filter(r=>r.won), cc={}; win.forEach(r=>r.G.charms.forEach(c=>cc[c]=(cc[c]||0)+1));
if(win.length) console.log('  winning builds use:',Object.entries(cc).sort((a,b)=>b[1]-a[1]).slice(0,12).map(([c,n])=>c+' '+pct(n/win.length)).join(', '));
// report=1: what's pulling its weight. Opponents by how often they end runs; charms and dice by the win rate of runs
// that held them after Act I (vs runs that didn't). Use a random-shopping bot (mid/casual) so picks don't skew it.
if(A.report){
  const opp={}; res.forEach(r=>r.fights.forEach(f=>{ const k=`A${f.act+1}${f.kind} ${f.name}`; const o=opp[k]=opp[k]||{n:0,lost:0,dead:0,rounds:0}; o.n++; o.lost+=f.lost; o.rounds+=f.rounds; if(!f.won) o.dead++; }));
  console.log('  OPPONENTS  (encounters · avg nerve you lost · avg rounds · % of encounters that ended the run)');
  Object.entries(opp).sort().forEach(([k,o])=>console.log(`    ${k.padEnd(26)} n=${String(o.n).padStart(5)}  lost ${(o.lost/o.n).toFixed(1).padStart(5)}  rounds ${(o.rounds/o.n).toFixed(1).padStart(4)}  ended ${(100*o.dead/o.n).toFixed(1).padStart(5)}%`));
  const base=res.filter(r=>r.snap&&r.snap[0]); const bw=base.filter(r=>r.won).length/Math.max(1,base.length);
  const impact=(get,keys,label)=>{ console.log(`  ${label}  (runs that reached Act II holding it · their win rate · vs without)  baseline ${pct(bw)}`);
    keys.map(k=>{ const w=base.filter(r=>get(r).includes(k)), wo=base.filter(r=>!get(r).includes(k)); return [k,w.length,w.filter(r=>r.won).length/Math.max(1,w.length),wo.filter(r=>r.won).length/Math.max(1,wo.length)]; })
      .sort((a,b)=>(b[2]-b[3])-(a[2]-a[3])).forEach(([k,n,a,b])=>console.log(`    ${k.padEnd(12)} n=${String(n).padStart(5)}  win ${pct(a).padStart(4)}  without ${pct(b).padStart(4)}  ${(a-b>=0?'+':'')+((a-b)*100).toFixed(0)}`)); };
  impact(r=>r.snap[0].charms,Object.keys(CHARMS),'CHARMS');
  impact(r=>r.snap[0].bag,Object.keys(DT),'DICE');
}
console.log(`  time ${((Date.now()-t0)/1000).toFixed(0)}s`);
