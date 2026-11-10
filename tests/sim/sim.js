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
const finsRes=(G,dice)=>dice.map(d=>d.fin==='lucky'?((has(G,'rabbitp')||d._luck)?'lucky':null):(d.fin||null));
function payoff(p,T,R,G,o,env,lam){ const r=L.settle(p,T,R,G.charms,o,{...env}); if(r.winner==='you') return r.dmg; if(r.winner==='them') return -lam*r.dmg*(has(G,'highstakes')?1:1); return 0; }
// cheap policy used inside rollouts and for build evaluation
function greedyKeep(faces,left,ctx,G,need){ const ev=faces.map(f=>L.effVal(f,ctx)); const ord=ev.map((e,i)=>[e-(isCrown(faces[i])?.01:0),i]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);
  const th=left.length>=3?1:2; let k=ord.filter(i=>ev[i]<=th); if(has(G,'patience')&&!k.length) k=[ord[0]]; if(has(G,'patience')) k=[ord[0]]; if(!k.length) k=[ord[0]]; for(const i of ord){ if(k.length>=need) break; if(!k.includes(i)) k.push(i); } return k; }
function finishRound(left,p,R,G,o,first,ctxOf,policy){ while(left.length){ const ctx=ctxOf(first); const faces=faceSet(left,ctx); const need=o.q.includes('fuse')&&first?Math.min(2,left.length):1;
    const keep=policy(faces,left,ctx,G,need,p,R); const kf=keep.map(i=>faces[i]), kt=keep.map(i=>left[i].type), kd=keep.map(i=>left[i]);
    p+=L.bankVals(kf,ctx,G.charms,keep.length===left.length,kd.map(d=>d.fin)).reduce((a,b)=>a+b,0); L.noteBank(R,kf,kt,G.charms,finsRes(G,kd)); left=left.filter((_,i)=>!keep.includes(i)); first=false; } return p; }
function playRound(hand,G,o,F,T,env,lam,smart){
  let left=hand.map(d=>({...d,_luck:Math.random()<1/3})), p=0, R=L.newRound(), first=true, shakes=A.noshake?0:L.shakesFor(G.charms,G), shook=0, freeShake=has(G,'spoon'), gl=0, decided=!!F.noinfo, raise=false, fold=false, cup=L.hasDeed(G,'loadedcup');
  if(o.sig==='gift'){ const n=F.p2?2:1; for(let i=0;i<n&&i<left.length;i++) left[i]={type:'d8'}; }
  const ctxOf=fst=>({cold:(o.q.includes('cold')||env.intent==='crowns')&&fst,penny:has(G,'penny')&&fst,deuces:has(G,'deuces'),ringer:has(G,'ringer'),crownless:o.q.includes('crownless'),snakebit:o.q.includes('snakebit')&&fst});
  const crowns=[];
  while(left.length){ const ctx=ctxOf(first); let faces=faceSet(left,ctx);
    if(o.sig==='slam'&&F.p2&&first&&left.length>2){ const ord=faces.map((f,i)=>[L.effVal(f,ctx),i]).sort((a,b)=>a[0]-b[0]); ord.slice(0,2).forEach(([,i])=>faces[i]=L.rollInst(left[i])); }
    const nh=Math.min(left.length-1,(o.q.includes('haze')&&first?1:0)+(o.sig==='trick'?(F.p2?2:1):0)); const H=L.shuffle([...left.keys()]).slice(0,Math.max(0,nh));
    let ev=faces.map((f,i)=>H.includes(i)?9:L.effVal(f,ctx));
    if(first&&has(G,'sleight')) ev.forEach((e,i)=>{ if(!H.includes(i)&&e>=4){ faces[i]=L.rollInst(left[i]); ev[i]=L.effVal(faces[i],ctx); } });
    for(let tries=0;tries<(cup?3:1)&&shakes>0&&SKILL!=='casual';tries++){ const bad=ev.map((e,i)=>e>=3&&!H.includes(i)?i:-1).filter(i=>i>=0), big=bad.filter(i=>ev[i]>=4); if(!(big.length||bad.length>=2)) break; if(cup&&G.hp<=3) break;
      bad.forEach(i=>{ faces[i]=L.rollInst(left[i]); ev[i]=L.effVal(faces[i],ctx); }); shakes--; if(freeShake) freeShake=false; else shook++; if(cup&&G.hp>1) G.hp--; }
    if(has(G,'thumb')&&F.thumb>0){ const i=ev.findIndex((e,j)=>!H.includes(j)&&typeof faces[j]==='number'&&e===2); if(i>=0){ faces[i]=faces[i]-1; ev[i]=L.effVal(faces[i],ctx); F.thumb--; } }
    if(!decided){ decided=true; if(SKILL!=='casual'&&!A.noraise){ const est=ev.reduce((a,e,i)=>a+(H.includes(i)?2.4:e<=1?e:2.3),0); const good=['sweat','tilted','tired'].includes(env.intent), bad=env.intent==='lean'||env.intent==='raise'; if(T-est>=(good?2:bad?7:5)) raise=true; else if(T-est<=(bad?-3:-5)&&lam>=1) fold=true; } if(fold) return {p:0,R,crowns,gl,fold:true,shook}; }
    const need=o.q.includes('fuse')&&first?Math.min(2,left.length):1;
    let keep;
    if(smart&&left.length>1){ // rollout search over "keep the k best" (and crowns-first variants)
      const ord=ev.map((e,i)=>[e-(isCrown(faces[i])&&!H.includes(i)?.01:0),i]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);
      const cands=[]; for(let k=Math.max(1,need);k<=left.length;k++) cands.push(ord.slice(0,k));
      let best=null, bv=-1e9;
      for(const c of cands){ let tot=0; const kf=c.map(i=>faces[i]), kt=c.map(i=>left[i].type), kd=c.map(i=>left[i]);
        const p1=p+L.bankVals(kf,ctx,G.charms,c.length===left.length,kd.map(d=>d.fin)).reduce((a,b)=>a+b,0);
        for(let r=0;r<ROLL;r++){ const R2={...R}; L.noteBank(R2,kf,kt,G.charms,finsRes(G,kd)); const rest=left.filter((_,i)=>!c.includes(i));
          const pf=finishRound(rest,p1,R2,G,o,false,ctxOf,greedyKeep); tot+=payoff(pf,T,R2,G,o,env,lam); }
        if(tot>bv){ bv=tot; best=c; } }
      keep=best; }
    else keep=greedyKeep(faces.map((f,i)=>H.includes(i)?9:f),left,ctx,G,need);
    const kf=keep.map(i=>faces[i]), kt=keep.map(i=>left[i].type), kd=keep.map(i=>left[i]);
    p+=L.bankVals(kf,ctx,G.charms,keep.length===left.length,kd.map(d=>d.fin)).reduce((a,b)=>a+b,0); L.noteBank(R,kf,kt,G.charms,finsRes(G,kd)); gl+=kd.filter((d,j)=>d.fin==='goldleaf'&&(kf[j]===1||isCrown(kf[j]))).length;
    kf.forEach((f,j)=>{ if(isCrown(f)) crowns.push(kt[j]); });
    left=left.filter((_,i)=>!keep.includes(i)); first=false; }
  return {p,R,crowns,gl,raise,shook}; }

// ---------- a table ----------
function pickFoe(G,kind,act,floor){ const Af=ACTS[act].foes; if(kind==='B') return L.bossOf(act,G.bossIx[act]);
  const used=G.used=G.used||{}, fresh=pool=>{ const un=pool.filter(p=>!used[act+p.n]), nl=pool.filter(p=>p.n!==G.lastFoe); const d=L.pick(un.length?un:nl.length?nl:pool); used[act+d.n]=1; G.lastFoe=d.n; return d; }; // like chooseFoe: no repeats in a room
  if(kind==='E') return fresh(floor<=3?Af.e1:Af.e2);
  let pool=floor<=3?Af.t1:Af.t2; if(floor<2&&act===0&&G.lap===0) pool=pool.filter(p=>!(p.q||[]).some(q=>!L.QUIRKS[q].help)); return fresh(pool); }
if(A.rule){ const r=A.rule==='none'?[]:[A.rule]; L.BOSS_RULES.forEach(p=>p.splice(0,p.length,...r)); L.SHARK_RULES.splice(0,L.SHARK_RULES.length,...r); }
function fight(G,kind,act,floor,smart,stats,hpK,hot){ const def=pickFoe(G,kind,act,floor);
  const o=L.makeOpp(def,kind,act,floor,G.lap,kind==='F'&&act===0&&floor<2&&G.lap===0,LV,(L.hasDeed(G,'badrep')?1.15:1)*(hpK||1)*(hot?1.4:1)); if(hot) o.odds+=1; let oh=o.hp; const F={noinfo:LM.hideE&&kind==='E',p2:false,wins:0,loss:0,rabbit:false,heavy:false,rounds:0,thumb:2,bump:has(G,'bump'),wall:(has(G,'flask')?6:0)+(has(G,'haymaker')?4:0),next:A.nointent?'steady':L.rollIntent(kind)};
  while(G.hp>0&&oh>0&&F.rounds<80){ F.rounds++; const intent=F.next; F.next=A.nointent?'steady':L.rollIntent(kind); const tt=L.intentT(o,intent);
    let T; { const s1=L.aiRound(o.bag,o.t); let sim=s1; if(o.q.includes('pair')){ const s2=L.aiRound(o.bag,tt); if(s2.total<s1.total) sim=s2; } T=sim.total;
      if(F.bump&&T<=5){ const b=L.bumpLowest(sim,o.bag); if(b){ T+=b.delta; F.bump=false; } } }
    if(intent==='tired') T+=0; // counted by targetOf in settle
    if(o.q.includes('tax')) G.gold=Math.max(0,G.gold-1);
    const hand=L.shuffle(G.bag).slice(0,L.handSize(G)+(F.heavy?1:0)); F.heavy=false; hand.forEach(d=>{ if(DT[d.type].breaks) d.cracks=(d.cracks||0)+1; });
    // Jinx: one charm sits the round out (the game's has()/live() skip it; afterRound still sees the full set)
    const allCh=G.charms, jx=L.jinxPick(G.charms,o.q); if(jx) G.charms=G.charms.filter(c=>c!==jx);
    const dr={}; G.drinks=G.drinks||[];
    if(G.drinks.includes('bourbon')&&G.hp<G.maxHp*.4){ G.drinks.splice(G.drinks.indexOf('bourbon'),1); G.hp=Math.min(G.maxHp,G.hp+10); }
    if(kind!=='F'||G.hp<G.maxHp*.35){ const k=['absinthe','gin','soda','bitters'].find(x=>G.drinks.includes(x)); if(k){ G.drinks.splice(G.drinks.indexOf(k),1); dr[k]=1; } }
    const env={guard:F.wall,intent,deeds:G.deeds||[],plays:G.plays||{},drink:dr,finished:G.bag.filter(d=>d.fin).length,fixOdds:L.hasFix(G,'felt')?1:0,bag:G.bag.length,round:F.rounds,q:o.q,raid:L.isRaid(o,F.rounds,F.p2),gold:G.gold,rep:G.rep,tally:G.tally,wins:F.wins,lossStreak:F.loss,oppHalf:oh<=o.hp/2,grow:G.grow||{},wonOnce:F.won1};
    const lam=Math.max(.6,Math.min(6,oh/Math.max(8,G.hp)));
    const pr=playRound(hand,G,o,F,T,env,lam,smart), {p,R,crowns,gl}=pr; G.gold+=gl;
    if(pr.fold){ const d=L.foldDmg(o,intent); G.hp-=d; F.wins=0; F.loss++; if(stats){ stats.rounds++; stats.l++; stats.taken+=d; stats.folds=(stats.folds||0)+1; } G.charms=allCh; G.gold+=L.afterRound(G,'them',false); if(oh>0) oh=Math.min(o.hp,oh+L.regenOf(o)); continue; }
    if(pr.raise){ env.raise=1; if(stats) stats.raises=(stats.raises||0)+1; } env.shook=pr.shook||0;
    if(has(G,'bulldog')) F.wall+=R.ones||0;
    crowns.forEach(t=>{ if(has(G,'hothand')) G.hp=Math.min(G.maxHp,G.hp+1); if(has(G,'goldcrown')) G.gold++; if(t==='gamble') G.gold+=3; if(t==='gilded') G.gold+=2; });
    if(R.bomb) oh=Math.max(1,oh-R.bomb*L.bombDmg(o.hp));
    const r=L.settle(p,T,R,G.charms,o,env); if(!A.noplaylv) L.notePlays(G,R,{...env,score:p,done:true});
    if(stats){ stats.rounds++; if(r.winner==='you'){ stats.w++; stats.odds+=r.odds; stats.hit+=r.dmg; stats.best=Math.max(stats.best,r.dmg); } else if(r.winner==='them'){ stats.l++; stats.taken+=r.dmg; } }
    G.gold+=R.payday||0; let free=false;
    if(r.winner==='you'){ { const gd=L.gateDmg(o,oh,o.hp,F.p2,r.dmg); if(gd<r.dmg) F.gated=true; if(gd>=oh) G.gold+=L.overkillPay(gd,oh); oh-=gd; } F.wins++; F.loss=0; F.won1=true; if(has(G,'bodyguard')) F.wall+=3; if(has(G,'tip')) G.gold+=2; if(has(G,'bookie')) G.gold+=Math.min(8,r.margin); if(r.recoil&&G.hp>1) G.hp-=Math.min(r.recoil,G.hp-1); }
    else if(r.winner==='them'){ let d=r.dmg; if(has(G,'rabbit')&&!F.rabbit){F.rabbit=true;d=0;free=true;} if(F.wall&&d>0){ const sk=L.soak(F.wall,d); d=sk.dmg; F.wall=sk.guard; } G.hp-=d; if(o.sig==='feed') oh=Math.min(o.hp,oh+d); if(!free){ F.wins=0; F.loss++; if(o.q.includes('steal')) G.gold=Math.max(0,G.gold-3); if(o.q.includes('heavy')) F.heavy=true; } }
    else F.wins=0;
    const blood=has(G,'blood'); G.charms=allCh; G.gold+=L.afterRound(G,r.winner,free);
    if(oh>0) oh=Math.min(o.hp,oh+L.regenOf(o));
    if(o.q.includes('nervous')) oh-=1;
    if(blood&&G.hp>1) G.hp-=1;
    G.bag=G.bag.filter(d=>!(DT[d.type].breaks&&d.cracks>=L.breaksAt(d.type,G.charms)));
    if(def.boss&&!F.p2&&(oh<=o.hp/2||F.gated)){ F.p2=true; const H=def.half||ACTS[act].half; H.add.forEach(q=>{ if(!o.q.includes(q)) o.q.push(q); }); o.t=H.t; } }
  if(oh<=0) G.gold+=L.afterFight(G);
  return {won:oh<=0,rounds:F.rounds,hp:o.hp,name:def.n}; }

// ---------- judging a build: play sample rounds against this act's regulars ----------
function evalBuild(G,act,floor){ const save=Math.random; Math.random=seeded(1234+act*77+floor);
  try{ const Af=ACTS[act].foes, pool=[...Af.t2,...Af.e1]; let dealt=0, taken=0;
    for(let k=0;k<EVALK;k++){ const def=pool[k%pool.length]; const o=L.makeOpp(def,'F',act,Math.max(floor,4),G.lap,false); const T=L.aiRound(o.bag,o.t).total;
      const hand=L.shuffle(G.bag).slice(0,6); const env={plays:G.plays||{},deeds:G.deeds||[],finished:G.bag.filter(d=>d.fin).length,fixOdds:L.hasFix(G,'felt')?1:0,bag:G.bag.length,round:1+k%5,q:o.q,gold:G.gold,rep:G.rep,tally:G.tally,wins:k%3,lossStreak:0,oppHalf:false,grow:G.grow||{}};
      const pr=playRound(hand,{...G,hp:99},o,{p2:false,thumb:2},T,env,1,false); if(pr.fold){ taken+=L.foldDmg(o); continue; } const {p,R}=pr; if(pr.raise) env.raise=1; const r=L.settle(p,T,R,G.charms,o,env);
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
  if(L.slotsUsed(G)<L.charmSlots(G)){ const g=cloneG(G); applyCharm(g,c); return {cost:evalBuild(g,act,floor)-(c==='liver'?6:0)-(c==='cigar'?4:0),drop:null}; }
  let best=null; G.charms.forEach((x,i)=>{ if(L.offbook(G,x)) return; const g=cloneG(G); applyCharm(g,c,i); const v=evalBuild(g,act,floor); if(!best||v<best.cost) best={cost:v,drop:i}; }); return best; }

const poolT=(G,t)=>Object.keys(CHARMS).filter(c=>!G.charms.includes(c)&&CHARMS[c].tier===t);
const remaining=(act,floor)=> (2-act)*6+Math.max(1,(8-floor)*.66);
const PAY0=(kind,fast)=>kind==='B'?20:kind==='E'?10:Math.max(1,5+(fast?3:0)+LM.pay);
let PAYG=null; const PAY=(kind,fast)=>{ let g=PAY0(kind,fast); if(PAYG&&PAYG.nb&&PAYG.nb.double){ g*=2; PAYG.nb.double=false; } return g; };
// chits (game: gainChit). Effects that land at the next bar are approximated by their cash worth.
function simChit(G){ const k=A.chit||L.pick(L.CHIT_KEYS); G.grow=G.grow||{}; G.grow.chits=(G.grow.chits||0)+1; G.nb=G.nb||{};
  if(k==='cash') G.gold+=5; else if(k==='stiff') G.hp=Math.min(G.maxHp,G.hp+10);
  else if(k==='finish'){ const un=G.bag.filter(d=>!d.fin); if(un.length) L.pick(un).fin=L.pick(L.FIN_KEYS); }
  else if(k==='crate') G.nb.crate=true; else if(k==='double') G.nb.double=true; else G.gold+=4; }
// fixtures and crates at the bar (game: renderShop extras)
const FIXPREF=['felt','booth','discount','shelf','taste','vault','rope','crates','ledger','restock'];
const FINPREF=['chrome','marked','lucky','polished','goldleaf','feather'];
function openCrateSim(G,kind,act,smart){ const n=L.crateSize(G), tst=L.hasFix(G,'taste');
  if(kind==='charm'){ const ch=[]; for(let i=0;i<n;i++){ const c=L.pick(poolT(G,L.rollTier(act,null,tst)).filter(x=>!ch.includes(x))); if(c) ch.push(c); }
    if(!ch.length) return; const c=SKILL==='good'||smart?ch.sort((a,b)=>VAL[b]-VAL[a])[0]:L.pick(ch); if(L.slotsUsed(G)<L.charmSlots(G)) applyCharm(G,c); else if(SKILL==='good'&&VAL[c]>VAL[worstOf(G)]) applyCharm(G,c,G.charms.indexOf(worstOf(G))); }
  else if(kind==='dice'){ const ds=L.shopDice(act,n,tst); const t=SKILL==='good'||smart?ds.sort((a,b)=>(DVAL[b]||0)-(DVAL[a]||0))[0]:L.pick(ds); G.bag.push({type:t,fin:Math.random()<.35?L.pick(L.FIN_KEYS):undefined}); }
  else { const fs=L.shuffle(L.FIN_KEYS.slice()).slice(0,n); const f=SKILL==='good'||smart?FINPREF.find(x=>fs.includes(x)):L.pick(fs); const un=G.bag.filter(d=>!d.fin); if(un.length){ const d=un.find(x=>x.type==='d6')||L.pick(un); d.fin=f; } } }
function barExtras(G,act,smart){ G.act=act; const keen=SKILL==='good'||smart;
  if(A.drink!=='none'){ const dk=A.drink||L.pick(L.DRINK_KEYS), pr=L.barPrice(G,L.DRINKS[dk].price+LM.price); G.drinks=G.drinks||[];
    if(dk==='sidecar'){ if(G.gold>=pr){ G.gold+=6-pr; } }
    else if(G.drinks.length<L.DRINK_MAX&&G.gold>=pr+(keen?8:3)&&Math.random()<(keen?.8:.4)){ G.gold-=pr; G.drinks.push(dk); } }
  if(G.nb&&G.nb.crate){ G.nb.crate=false; openCrateSim(G,'charm',act,smart); }

  const f=A.nofix?null:L.fixOffer(G); if(f){ const pr=L.barPrice(G,L.FIXTURES[f].price+LM.price); const want=keen?FIXPREF.indexOf(f)<6:Math.random()<.4;
    if(want&&G.gold>=pr+(keen?6:0)){ G.gold-=pr; (G.fix=G.fix||[]).push(f); if(f==='rope'){ G.maxHp+=8; G.hp=Math.min(G.maxHp,G.hp+8); } } }
  if(!A.nocrate) L.shuffle(Object.keys(L.CRATES)).slice(0,2).forEach(k=>{ const pr=L.barPrice(G,L.CRATES[k].price+LM.price); if(G.gold>=pr+(keen?10:4)&&Math.random()<(keen?.7:.4)){ G.gold-=pr; openCrateSim(G,k,act,smart); } }); }
function reward(G,kind,fast,act,floor,smart){ G.gold+=PAY(kind,fast);
  let ch=[]; if(kind==='B'){ const r=L.pick([...poolT(G,'r').map(c=>({c})),{t:'shaved'}]); ch.push(r); L.shuffle(poolT(G,'u')).slice(0,2).forEach(c=>ch.push({c})); }
  else if(kind==='E') L.shuffle(poolT(G,'u')).slice(0,3).forEach(c=>ch.push({c}));
  else { ch.push({t:L.shopDie(act)}); L.shuffle(poolT(G,'c')).slice(0,2).forEach(c=>ch.push({c})); }
  if(!smart){ const c=ch.find(x=>x.c&&!G.charms.includes(x.c)); if(c&&L.slotsUsed(G)<L.charmSlots(G)) applyCharm(G,c.c); return; }
  const base=evalBuild(G,act,floor); let best=null;
  ch.forEach(x=>{ if(x.c){ const o=charmOption(G,x.c,act,floor); if(o&&(!best||o.cost<best.cost)) best={...o,x}; } else { const g=cloneG(G); g.bag.push({type:x.t}); const v=evalBuild(g,act,floor); if(!best||v<best.cost) best={cost:v,x}; } });
  if(best&&best.cost<base){ if(best.x.c) applyCharm(G,best.x.c,best.drop); else G.bag.push({type:best.x.t}); }
  else if(G.hp<G.maxHp) G.hp=Math.min(G.maxHp,G.hp+12); }
function shop(G,act,floor,smart){
  const up=LM.price; const tst=L.hasFix(G,'taste'), stock=L.shopDice(act,2,tst).map(t=>({t,price:L.barPrice(G,DT[t].price+up)})); for(let i=0;i<(L.hasFix(G,'shelf')?4:3)-(LM.lastOrders?1:0);i++){ const c=L.pick(poolT(G,L.rollTier(act,null,tst)).filter(c=>!stock.some(s=>s.c===c))); if(c){ const off=Math.random()<L.offbookP(G); stock.push({c,off,price:L.barPrice(G,CHARMS[c].price+up+(off?L.OFFBOOK_FEE:0))}); } }
  if(!smart){ stock.filter(s=>s.c).forEach(s=>{ if(G.gold>=s.price&&(s.off||L.slotsUsed(G)<L.charmSlots(G))&&Math.random()<.6){ G.gold-=s.price; s.off?takeOff(G,s.c):applyCharm(G,s.c); } }); if(G.hp<G.maxHp*.5&&G.gold>=6){ G.gold-=6; G.hp=Math.min(G.maxHp,G.hp+12); } return; }
  let backUsed=false;
  for(let guard=0;guard<6;guard++){ const base=evalBuild(G,act,floor), fights=remaining(act,floor); const opts=[];
    // value of nerve: a point now is worth about a point, more when low
    const nerveVal=G.hp<G.maxHp*.4?1.6:G.hp<G.maxHp*.7?1:.5;
    stock.forEach(s=>{ if(s.sold||G.gold<s.price) return; if(s.c&&s.off&&!G.charms.includes(s.c)){ const g=cloneG(G); takeOff(g,s.c); opts.push({s,gain:(base-evalBuild(g,act,floor))*fights,price:s.price,do:()=>{ takeOff(G,s.c); s.sold=1; }}); }
      else if(s.c){ const o=charmOption(G,s.c,act,floor); if(o) opts.push({s,gain:(base-o.cost)*fights,price:s.price,do:()=>{ applyCharm(G,s.c,o.drop); s.sold=1; }}); }
      else { const g=cloneG(G); g.bag.push({type:s.t}); opts.push({s,gain:(base-evalBuild(g,act,floor))*fights,price:s.price,do:()=>{ G.bag.push({type:s.t}); s.sold=1; }}); } });
    if(G.gold>=6+up&&G.hp<G.maxHp) opts.push({gain:Math.min(12,G.maxHp-G.hp)*nerveVal,price:6+up,do:()=>{ G.hp=Math.min(G.maxHp,G.hp+12); }});
    { const tp=L.tossPrice(G)+up; if(G.gold>=tp&&G.bag.length>6){ let bi=null,bv=1e9; G.bag.forEach((d,i)=>{ if(d.type==='lead') return; const g=cloneG(G); g.bag.splice(i,1); const v=evalBuild(g,act,floor); if(v<bv){bv=v;bi=i;} }); if(bi!=null) opts.push({gain:(base-bv)*fights,price:tp,do:()=>{ G.bag.splice(bi,1); G.tossed=(G.tossed||0)+1; }}); } }
    const tryMod=(fn,can,price,key)=>{ if(G.gold<price) return; let bi=null,bv=1e9; G.bag.forEach((d,i)=>{ if(!can(d)) return; const g=cloneG(G); fn(g.bag[i]); const v=evalBuild(g,act,floor); if(v<bv){bv=v;bi=i;} }); if(bi!=null) opts.push({gain:(base-bv)*fights,price,do:()=>{ fn(G.bag[bi]); G[key]+=key==='filePrice'?2:4; }}); };
    tryMod(L.fileDie,L.canFile,G.filePrice+up,'filePrice'); tryMod(L.gildDie,L.canGild,G.gildPrice+up,'gildPrice');
    if(!backUsed&&G.gold>=4+15){ opts.push({gain:3,price:4,do:()=>{ backUsed=true; const r=L.pick(poolT(G,'r')); if(r) stock.push({c:r,price:CHARMS[r].price}); }}); }
    const bestO=opts.filter(o=>o.gain>0.5).sort((a,b)=>b.gain/b.price-a.gain/a.price)[0]; if(!bestO) break;
    G.gold-=bestO.price; bestO.do(); } }

// "good": reads the charms like a decent human (fixed priorities), plays the dice well
const VAL={flask:4,bulldog:5,haymaker:7,mimic:8,thumb:5,echo:6,doubletake:4,sleight:8,bump:5,bodyguard:6,opener:5,packed:5,stack:6,allin:3,glassblower:3,nearmiss:5,blood:6,threes:3,regular:6,heckler:6,doubledown:8,tally:6,jewels:6,slowburn:6,cut:4,bouncer:6,thick:4,tip:2,goldcrown:2,hothand:3,liver:3,cigar:3,penny:9,spoon:5,lastcall:7,jacks:6,snake:5,patience:4,barfly:5,rabbit:4,closer:7,kingpin:9,lowball:8,highstakes:8,bookie:4,collection:5,consolation:2,savings:3,shiner:4,evens:3,deuces:6,piggy:7,tommy:6,jackpot:5,longshot:5,finisher:7,moonshine:9,crownroom:7,straight:7,ringer:9,bigshot:9};
const DVAL={lead:-6,gilded:0,bomb:1,goose:1,boxcar:2,d8:-3,d6:0,pebble:2,glass:2,gamble:-1,ember:1,twin:1,loaded:3,devil:3,coin:4,shaved:6,royal:2,deuce:1,payday:1,trick:0,bubbly:3,viper:4};
const worstOf=G=>G.charms.filter(x=>!L.offbook(G,x)).reduce((m,x)=>VAL[x]<VAL[m]?x:m);
const wantC=(G,c)=>!G.charms.includes(c)&&(L.slotsUsed(G)<L.charmSlots(G)||VAL[c]>VAL[worstOf(G)]+1);
const takeC=(G,c)=>applyCharm(G,c,L.slotsUsed(G)>=L.charmSlots(G)?G.charms.indexOf(worstOf(G)):null);
function rewardGood(G,kind,fast,act){ G.gold+=PAY(kind,fast);
  let ch=[]; if(kind==='B'){ ch.push(L.pick([...poolT(G,'r').map(c=>({c})),{t:'shaved'}])); L.shuffle(poolT(G,'u')).slice(0,2).forEach(c=>ch.push({c})); }
  else if(kind==='E') L.shuffle(poolT(G,'u')).slice(0,3).forEach(c=>ch.push({c})); else { ch.push({t:L.shopDie(act)}); L.shuffle(poolT(G,'c')).slice(0,2).forEach(c=>ch.push({c})); }
  const b=ch.filter(x=>x.c&&wantC(G,x.c)).sort((a,b)=>VAL[b.c]-VAL[a.c])[0]; if(b) takeC(G,b.c); else { const d=ch.find(x=>x.t&&DVAL[x.t]>=2); if(d) G.bag.push({type:d.t}); else G.hp=Math.min(G.maxHp,G.hp+12); } }
function shopGood(G,act){ const up=LM.price; const tst=L.hasFix(G,'taste'), stock=L.shopDice(act,2,tst).map(t=>({t,price:L.barPrice(G,DT[t].price+up)})); for(let i=0;i<(L.hasFix(G,'shelf')?4:3)-(LM.lastOrders?1:0);i++){ const c=L.pick(poolT(G,L.rollTier(act,null,tst)).filter(c=>!stock.some(s=>s.c===c))); if(c){ const off=Math.random()<L.offbookP(G); stock.push({c,off,price:L.barPrice(G,CHARMS[c].price+up+(off?L.OFFBOOK_FEE:0))}); } }
  if(G.hp<G.maxHp*.5&&G.gold>=6+up){ G.gold-=6+up; G.hp=Math.min(G.maxHp,G.hp+12); }
  stock.filter(s=>s.c).sort((a,b)=>VAL[b.c]-VAL[a.c]).forEach(s=>{ if(s.off&&G.gold>=s.price&&!G.charms.includes(s.c)){ G.gold-=s.price; takeOff(G,s.c); } else if(!s.off&&G.gold>=s.price&&wantC(G,s.c)){ G.gold-=s.price; takeC(G,s.c); } });
  const w=G.bag.filter(d=>d.type!=='lead').reduce((m,d)=>DVAL[d.type]<DVAL[m.type]?d:m), tp=L.tossPrice(G)+up; if(G.bag.length>6&&DVAL[w.type]<0&&G.gold>=tp){ G.gold-=tp; G.tossed=(G.tossed||0)+1; G.bag=G.bag.filter(d=>d!==w); }
  stock.filter(s=>s.t).forEach(s=>{ if(G.gold>=s.price&&DVAL[s.t]>=3){ G.gold-=s.price; G.bag.push({type:s.t}); } });
  const gl=G.bag.filter(L.canGild).sort((a,b)=>DVAL[b.type]-DVAL[a.type]); if(G.gold>=G.gildPrice+up+3&&gl.length){ G.gold-=G.gildPrice+up; G.gildPrice+=4; L.gildDie(gl[0]); }
  const fl=G.bag.filter(L.canFile).sort((a,b)=>DVAL[b.type]-DVAL[a.type]); if(G.gold>=G.filePrice+up+3&&fl.length){ G.gold-=G.filePrice+up; G.filePrice+=2; L.fileDie(fl[0]); } }
function event(G,act){ const e=L.rnd(14);
  if(e===9){ const fl=G.bag.filter(L.canFile); if(G.gold>=7&&fl.length){ G.gold-=7; L.fileDie(fl.sort((a,b)=>(DVAL[a.type]||0)-(DVAL[b.type]||0))[0]); } }
  if(e===10){ const pool=poolT(G,'u'); if(G.hp>G.maxHp*.5&&L.slotsUsed(G)<L.charmSlots(G)&&pool.length){ G.hp-=8; applyCharm(G,SKILL==='good'?pool.sort((a,b)=>VAL[b]-VAL[a])[0]:L.pick(pool)); } else G.hp=Math.min(G.maxHp,G.hp+8); }
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
function rest(G){ if(G.hp<G.maxHp*.75) G.hp=Math.min(G.maxHp,G.hp+Math.ceil(G.maxHp*LM.rest)); else if(G.hp>=G.maxHp*.9&&G.maxHp>30&&G.bag.some(d=>!d.fin)&&Math.random()<.5){ const d=G.bag.find(x=>!x.fin&&x.type==='d6')||G.bag.find(x=>!x.fin); d.fin='marked'; G.maxHp-=5; G.hp=Math.min(G.hp,G.maxHp); } else if(G.playHits&&Math.random()<.5){ const h=G.playHits, k=L.PLAY_KEYS.slice().sort((a,b)=>(h[b]||0)-(h[a]||0))[0]; G.plays=G.plays||{}; G.plays[k]=(G.plays[k]||0)+1; } else { const d8=G.bag.find(x=>x.type==='d8'); const d6=G.bag.find(x=>x.type==='d6'&&!x.f); if(d8) d8.type='d6'; else if(d6) d6.type='loaded'; else G.hp=Math.min(G.maxHp,G.hp+Math.ceil(G.maxHp*LM.rest)); } }
function choose(G,opts,act,floor,smart){
  if(SKILL==='good'){ if(opts.includes('B')) return 'B'; if(opts.includes('R')&&G.hp<G.maxHp*.6) return 'R'; if(opts.includes('S')&&G.gold>=16) return 'S'; if(opts.includes('E')&&G.hp>G.maxHp*.7) return 'E'; if(opts.includes('F')) return 'F'; return opts.includes('S')?'S':opts.includes('R')?'R':opts[0]; }
  if(!smart){ const o=opts.filter(x=>x==='F'||x==='S'||x==='B'); return o.length?L.pick(o):L.pick(opts); }
  if(opts.includes('B')) return 'B';
  const cost=evalBuild(G,act,floor);
  if(opts.includes('R')&&G.hp<G.maxHp*.55) return 'R';
  if(opts.includes('S')&&G.gold>=16) return 'S';
  if(opts.includes('E')&&G.hp-cost*1.9>G.maxHp*.45) return 'E';
  if(opts.includes('?')&&G.hp<G.maxHp*.5&&!opts.includes('R')) return '?';
  if(opts.includes('F')) return 'F';
  if(opts.includes('R')&&G.hp<G.maxHp*.85) return 'R';
  return opts.includes('S')?'S':opts.includes('?')?'?':opts[0]; }
// after a table: the bartender leans over (a stiff one or a drink) — game: renderReward's Last call
function corner(G,act,smart){ const keen=SKILL==='good'||smart, up=LM.price; G.drinks=G.drinks||[];
  if(G.hp<G.maxHp*.5&&G.gold>=6+up){ G.gold-=6+up; G.hp=Math.min(G.maxHp,G.hp+12); }
  if(A.drink!=='none'){ const dk=A.drink||L.pick(L.DRINK_KEYS), pr=L.barPrice(G,L.DRINKS[dk].price+up);
    if(dk==='sidecar'){ if(G.gold>=pr) G.gold+=6-pr; } else if(G.drinks.length<L.DRINK_MAX&&G.gold>=pr+(keen?10:4)&&Math.random()<(keen?.6:.3)){ G.gold-=pr; G.drinks.push(dk); } } }

let tuned=false;
function run(smart){ if(A.tune&&!tuned){ require(path.resolve(A.tune))(L); tuned=true; } const P=L.pocketStart(POCKET), hp0=P.hp+LM.startHp;
  const G={limit:LV,deeds:[],hp:hp0,maxHp:hp0,gold:P.gold,lap:0,rep:0,tally:0,filePrice:5,gildPrice:P.gild,bag:P.bag.map(type=>({type})),charms:P.charms.slice(),bossIx:[L.rnd(2),L.rnd(2),L.rnd(2)],fix:(P.fix||[]).slice(),drinks:(P.drinks||[]).slice()}; if(P.ruby) L.gildDie(G.bag[0]); (P.fins||[]).forEach((f,i)=>{ if(G.bag[i]) G.bag[i].fin=f; });
  // give=charm[,charm] / givedie=type: start every run holding it (to measure a card's power without pick bias)
  if(LM.lead){ const i=G.bag.findIndex(d=>d.type==='d6'); if(i>=0) G.bag[i]={type:'lead'}; else G.bag.push({type:'lead'}); }
  if(A.give) A.give.split(',').forEach(c=>{ if(!G.charms.includes(c)) G.charms.push(c); if(c==='liver'){ G.maxHp+=12; G.hp+=12; } });
  if(A.givefix){ G.fix=A.givefix.split(','); if(G.fix.includes('rope')){ G.maxHp+=8; G.hp+=8; } }
  if(A.givefin) G.bag.filter(d=>d.type==='d6').slice(0,2).forEach(d=>d.fin=A.givefin);
  if(A.givedie) for(let k=0;k<2;k++){ const d=G.bag.find(x=>x.type==='d6'); if(d) d.type=A.givedie; }
  const out={acts:0,fights:[],stats:{rounds:0,w:0,l:0,odds:0,hit:0,taken:0,best:0}};
  for(let act=0;act<3;act++){ const M=L.genMap(), trail=[];
    for(let f=0;f<FLOORS.length;f++){ const reach=L.mapReach(M,f,trail).map(x=>M[f].find(o=>o.x===x)); const n=choose(G,[...new Set(reach.map(o=>o.n))],act,f,smart); const node=L.pick(reach.filter(o=>o.n===n)); trail[f]=node.x; const hot=!!node.hot&&!(SKILL==='good'&&G.hp<G.maxHp*.75);
      if(n==='R'){ rest(G); continue; } if(n==="?"){ event(G,act); if(G.hp<=0){ out.died={act,f,kind:'?'}; out.G=G; return out; } continue; }
      if(n==='S'){ PAYG=G; if(!A.noextra) barExtras(G,act,smart); if(SKILL==='good') shopGood(G,act); else shop(G,act,f,smart); (out.bars=out.bars||[0,0,0])[act]++; continue; }
      const hpb=G.hp; const r=fight(G,n,act,f,playSmart,out.stats,1,hot&&n==='E'); out.fights.push({act,kind:n,rounds:r.rounds,lost:hpb-Math.max(0,G.hp),won:r.won,hp:r.hp,name:r.name});
      if(!r.won){ out.died={act,f,kind:n,name:r.name}; out.G=G; return out; }
      if(n==='B'&&act===2&&LM.double&&G.lap===0){ G.bossIx[2]=1-G.bossIx[2]; const hb=G.hp; const r2=fight(G,'B',act,f,playSmart,out.stats,.75); out.fights.push({act,kind:'B',rounds:r2.rounds,lost:hb-Math.max(0,G.hp),won:r2.won,hp:r2.hp,name:r2.name}); if(!r2.won){ out.died={act,f,kind:'B2',name:r2.name}; out.G=G; return out; } }
      if(n==='B'&&act<2&&!A.nodeed){ const opts=L.shuffle(L.DEED_KEYS.slice()).slice(0,3), pref=['still','blackbook','loadedcup','badrep','brass','pockets']; const k=SKILL==='good'||smart?pref.find(x=>opts.includes(x)):L.pick(opts); if(SKILL!=='casual'||Math.random()<.5) L.takeDeed(G,k); }
      if(n==='B') G.rep++; if(has(G,'tally')) G.tally++; if(has(G,'cigar')) G.hp=Math.min(G.maxHp,G.hp+6);
      PAYG=G; if(!A.nochit&&n==='E'&&r.rounds<=L.QUICK_WIN) simChit(G);
      if(hot&&n==='E'){ G.gold+=5; const rp=poolT(G,'r'); if(rp.length&&SKILL!=='casual'){ const c=rp.sort((a,b)=>VAL[b]-VAL[a])[0]; if(wantC(G,c)) takeC(G,c); } }
      if(SKILL==='good') rewardGood(G,n,r.rounds<=3,act); else reward(G,n,r.rounds<=3,act,f,smart); corner(G,act,smart); }
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
{ const b=res.filter(r=>r.bars); if(b.length) console.log('  bars visited per act',[0,1,2].map(a=>(b.reduce((x,r)=>x+r.bars[a],0)/b.length).toFixed(1)).join(' / ')); }
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
