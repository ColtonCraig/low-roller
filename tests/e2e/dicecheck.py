# Dice check: plays real throws and measures every die's true on-screen outline. Fails if dice touch,
# a value label sits on another die / the message / the slip, a die hides under a panel, or the
# opponent's face is under the nameplate. Covers a normal hand, a 7-die hand, The Twins (12 dice) and a boss.
#   python3 tests/e2e/dicecheck.py [deck,fhd,...] [shots] [v]
import asyncio,sys,json,os
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from harness import *
SIZES=DESKTOP
names=sys.argv[1].split(',') if len(sys.argv)>1 and sys.argv[1] else list(SIZES)
CHECK=r"""(()=>{ const P=[]; const own=new Map(); const ds=[...ALLDICE].filter(o=>o.mesh.parent&&o.mesh.visible&&!o.flying);
 const _v=new THREE.Vector3(); const rectOf=o=>{ let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9; o.mesh.updateMatrixWorld(true); o.mesh.traverse(m=>{ if(!m.isMesh||(m.material&&m.material.transparent)) return; const pa=m.geometry.attributes.position; for(let i=0;i<pa.count;i++){ _v.fromBufferAttribute(pa,i).applyMatrix4(m.matrixWorld); const p=toScreen(_v); x0=Math.min(x0,p.x); y0=Math.min(y0,p.y); x1=Math.max(x1,p.x); y1=Math.max(y1,p.y); } }); return {left:x0,top:y0,right:x1,bottom:y1}; };
 const ov=(a,b)=>{ const x=Math.min(a.right,b.right)-Math.max(a.left,b.left), y=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top); return x>0&&y>0?x*y:0; };
 const area=a=>(a.right-a.left)*(a.bottom-a.top);
 const kind=o=>F.you.includes(o)?(o.banked?'myRail':'myTray'):(F.them.includes(o)?(o.banked?'theirRail':'theirTray'):'stray');
 const R=ds.map(o=>({o,k:kind(o),r:rectOf(o)}));
 // every resting die must be fully on the felt and not sunk into it
 R.forEach(a=>{ let bad=''; a.o.mesh.updateMatrixWorld(true); a.o.mesh.traverse(m=>{ if(!m.isMesh||(m.material&&m.material.transparent)) return; const pa=m.geometry.attributes.position; for(let i=0;i<pa.count;i++){ _v.fromBufferAttribute(pa,i).applyMatrix4(m.matrixWorld); if(Math.abs(_v.x)>4.6||Math.abs(_v.z)>3.45) bad='off the felt'; else if(_v.y<-.03) bad=bad||'through the felt'; } }); if(bad) P.push(`${a.k} ${bad}`); });
 // the fullest rows the rules allow must stay on the felt and clear of each other
 const row=L=>{ for(let i=0;i<L.length;i++){ if(Math.abs(L[i].x)>4.15||Math.abs(L[i].z)>3.3) P.push('slot off the felt'); for(let j=i+1;j<L.length;j++) if(L[i].distanceTo(L[j])<.8) P.push('slots too close'); } };
 row([...Array(12).keys()].map(k=>railSlot(k,'them'))); row([...Array(9).keys()].map(k=>railSlot(k,'you'))); row(traySlots(9,'you')); row(traySlots(9,'them'));
 R.forEach(a=>{ if(a.k==='stray') P.push('stray die'); });
 for(let i=0;i<R.length;i++) for(let j=i+1;j<R.length;j++){ const o=ov(R[i].r,R[j].r); if(o>.06*Math.min(area(R[i].r),area(R[j].r))) P.push(`dice touch ${R[i].k}/${R[j].k} ${Math.round(o)}`); }
 const box=s=>{ const e=document.querySelector(s); if(!e) return null; const b=e.getBoundingClientRect(); return b.height?b:null; };
 const ui={slip:box('.yourtab'),msg:box('#ui .msg'),plate:box('#plate'),hud:box('#ui .hud')};
 R.forEach(a=>{ for(const [n,b] of Object.entries(ui)) if(b){ const o=ov(a.r,b); if(o>.15*area(a.r)) P.push(`${a.k} under ${n}`); } });
 const msgEl=document.querySelector('#ui .msg'); const textR=msgEl&&msgEl.textContent.trim()?(()=>{ const rg=document.createRange(); rg.selectNodeContents(msgEl); return rg.getBoundingClientRect(); })():null;
 [...document.querySelectorAll('.vp')].filter(v=>v.getBoundingClientRect().height&&getComputedStyle(v).opacity>.1).forEach(v=>{ const b=v.getBoundingClientRect();
   R.forEach(a=>{ if(a.o.label===v) return; const o=ov(b,a.r); if(o>60) P.push(`label on ${a.k}`); });
   if(ui.slip&&ov(b,ui.slip)>4) P.push('label on slip'); if(textR&&ov(b,textR)>4) P.push('label on message'); });
 if(foe&&ui.plate){ const u=foe.userData, hp=new THREE.Vector3(); u.head.getWorldPosition(hp); const s=toScreen(hp); if(s.x>ui.plate.left&&s.x<ui.plate.right&&s.y>ui.plate.top&&s.y<ui.plate.bottom) P.push('face under nameplate'); }
 return {P:[...new Set(P)], n:R.length, zoom:+(CAMF.zoom||1).toFixed(2)}; })()"""
async def toTurn(pg):
  for i in range(80):
    await pg.wait_for_timeout(250)
    if await pg.query_selector('#bank') and not await pg.evaluate('busy'): return True
  return False
async def run(p,name):
  w,h=SIZES[name]; b,pg,errs=await open_game(p,w,h); out=[]
  await pg.evaluate("SET.tips=false; SET.speed=2.4; 0")
  for sc,setup,opp in [('normal',"",None),('7dice',"G.bag=['d6','d6','d6','d6','d6','d6','d8','d8','coin'].map(newDie)","heavy"),('twins',"","twins"),('boss',"","boss")]:
    await pg.evaluate("document.querySelectorAll('.overlay').forEach(o=>o.remove()); F=null; newRun('run'); "+setup+"; renderMap(); 0"); await pg.wait_for_timeout(500)
    if opp=='twins': await pg.evaluate("startFight('E',makeOpp([...ACTS[1].foes.e1,...ACTS[1].foes.e2].find(f=>f.n==='The Twins Again'),'E',1,3,0,false,0)); 0")
    elif opp=='boss': await pg.evaluate("startFight('B',makeOpp(ACTS[2].foes.boss,'B',2,8,0,false,0)); 0")
    else: await pg.click('#stops .entry')
    if opp=='heavy':
      await toTurn(pg); await pg.evaluate("F.heavy=true; F.oppHp=9999; G.hp=9999; tray().forEach(o=>toggleSel(o)); const b=document.querySelector('#bank'); b&&b.click(); 0")
      await pg.wait_for_selector('#again',timeout=40000); await pg.click('#again')
    ok=await toTurn(pg); await pg.wait_for_timeout(500)
    if not ok: out.append(f"{sc}: never reached your turn")
    r=await pg.evaluate(CHECK); tag=f"{sc}:t1"
    if r['P']: out.append(f"{tag} {r['P']}"); await pg.screenshot(path=f'dc_{name}_{sc}_1.png')
    z=(r['zoom'],r['n'])
    await pg.evaluate("tray().filter(o=>!o.hidden).slice(0,2).forEach(o=>toggleSel(o)); document.querySelector('#bank')&&document.querySelector('#bank').click(); 0"); await pg.wait_for_timeout(600)
    await toTurn(pg); await pg.wait_for_timeout(500)
    r=await pg.evaluate(CHECK)
    if r['P']: out.append(f"{sc}:t2 {r['P']}"); await pg.screenshot(path=f'dc_{name}_{sc}_2.png')
    if 'shots' in sys.argv: await pg.screenshot(path=f'dc_{name}_{sc}.png')
    out.append(f"  ({sc} zoom {z[0]} dice {z[1]})") if 'v' in sys.argv else None
  bad=[o for o in out if not o.startswith('  ')]
  BAD.append(bool(bad) or bool(errs)); print(f"== {name} {w}x{h}: {'OK' if not bad else 'PROBLEMS'}"+''.join('\n  '+o for o in out)+(f"\n  errors {errs[:2]}" if errs else ''),flush=True)
  await b.close()
async def main():
  async with async_playwright() as p:
    for n in names: await run(p,n)
BAD=[]
asyncio.run(main())
sys.exit(1 if any(BAD) else 0)
