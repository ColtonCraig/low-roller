# Layout audit: on every screen at every desktop size, checks that headings aren't under the top bar,
# the nameplate doesn't cover the HUD or slip, dice labels and the message don't sit on the slip,
# no text is clipped and nothing scrolls sideways.
#   python3 tests/e2e/audit.py [deck,fhd,...] [shots]
import asyncio, sys, json, os
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from harness import *
DEV=DESKTOP
names=sys.argv[1].split(',') if len(sys.argv)>1 and sys.argv[1] else list(DEV)
SHOT='shots' in sys.argv
SCREENS=[('title',None),('map',"G.charms=['tip','hothand','penny','cut']; G.gold=40; renderMap()"),
 ('reward',"F={opp:{n:'Mopey Earl'},kind:'F'}; renderReward('F')"),('shop',"G.gold=2; renderShop()"),('rest',"renderRest()"),('event',"renderEvent()"),
 ('menu',"openMenu('night')"),('bag',"setMenuTab('bag')"),('settings',"setMenuTab('settings')"),
 ('over',"document.querySelectorAll('.overlay').forEach(o=>o.remove()); closeMenu&&closeMenu(); G.stats.bosses=['Big Sal']; F={opp:{n:'Lefty'},labelsOn:false,kind:'F'}; renderOver()")]
AUD=r"""(()=>{ const P=[]; const R=e=>e.getBoundingClientRect(); const vis=e=>{const b=R(e); const s=getComputedStyle(e); return b.width>2&&b.height>2&&s.visibility!=='hidden'&&+s.opacity>0.05};
 const ov=(a,b)=>{ const x=Math.min(a.right,b.right)-Math.max(a.left,b.left), y=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top); return x>3&&y>3?Math.round(x)+'x'+Math.round(y):0; };
 const hudEls=[...document.querySelectorAll('#ui .hud > *, #ui .hud .plate, #ui .hud .rack')].filter(vis);
 const sc=document.querySelector('.overlay')||document.querySelector('#ui'); const st=sc?sc.scrollTop:0;
 const heads=[...document.querySelectorAll('.mhead,.mtitle,.modal .secthead:first-of-type,.neon,#neonslot,.title .est,.picker,.rules')].filter(vis);
 heads.forEach(hd=>hudEls.forEach(he=>{ const a=R(hd), b=R(he), o=ov(a,b); if(!o) return; const cx=(Math.max(a.left,b.left)+Math.min(a.right,b.right))/2, cy=(Math.max(a.top,b.top)+Math.min(a.bottom,b.bottom))/2; const top=document.elementFromPoint(cx,cy); if(top&&he.contains(top)) P.push(`${hd.className.split(' ')[0]||hd.id} under HUD ${he.className.split(' ')[0]} ${o}`); }));
 const plate=document.querySelector('#plate'); if(plate&&vis(plate)){ hudEls.forEach(he=>{ const o=ov(R(plate),R(he)); if(o) P.push('plate on HUD '+he.className.split(' ')[0]+' '+o); });
   const yt=document.querySelector('.yourtab'); if(yt){ const o=ov(R(plate),R(yt)); if(o) P.push('plate on slip '+o); } }
 const yt=document.querySelector('.yourtab'); if(yt&&vis(yt)){ [...document.querySelectorAll('.vp')].filter(vis).forEach(v=>{ const o=ov(R(v),R(yt)); if(o) P.push('die label on slip '+v.textContent+' '+o); });
   const m=document.querySelector('.msg'); if(m&&vis(m)){ const o=ov(R(m),R(yt)); if(o) P.push('msg on slip '+o); [...document.querySelectorAll('.vp')].filter(vis).forEach(v=>{ const o2=ov(R(v),R(m)); if(o2) P.push('die label on msg '+o2); }); } }
 [...document.querySelectorAll('.mtitle,.pn,.pv b,.np-name,.btn,.card .n,.entry .n,.secthead,.figure,.eq .cell b,.eq small,.tabnum,.cash')].filter(vis).forEach(e=>{ if(e.scrollWidth>e.clientWidth+2&&getComputedStyle(e).overflow!=='visible') P.push('clipped text: '+e.textContent.trim().slice(0,24)); const b=R(e); if(b.right>innerWidth+1||b.left<-1) P.push('offscreen: '+e.textContent.trim().slice(0,20)); });
 const hs=document.documentElement.scrollWidth>innerWidth+1; if(hs) P.push('horizontal scroll');
 return P; })()"""
async def fight(pg,setup):
  await pg.evaluate("document.querySelectorAll('.overlay').forEach(o=>o.remove()); SET.tips=false; tipOpen=0; PAUSED=false; newRun('run'); G.charms=['tip','penny']; "+setup+"; renderMap()"); await pg.wait_for_timeout(600)
  await pg.click('#stops .entry')
  for i in range(40):
    await pg.wait_for_timeout(500)
    if await pg.query_selector('#bank') and not await pg.evaluate('busy'): break
  await pg.wait_for_timeout(500)
async def run(p,name):
  w,h=DEV[name]; b,pg,errs=await open_game(p,w,h); rep=[]
  await pg.evaluate("SET.tips=false")
  for scr,js in SCREENS:
    if scr=='map': await pg.click('#go'); await pg.wait_for_timeout(500)
    if js: await pg.evaluate(js)
    await pg.wait_for_timeout({'over':2900}.get(scr,900))
    pr=await pg.evaluate(AUD)
    if pr or SHOT: await pg.screenshot(path=f'A_{name}_{scr}.png')
    if pr: rep.append(f"{scr:8} "+' | '.join(sorted(set(pr))[:6]))
  for tag,setup in [('fight',''),('fightB',"G.act=0; G.floor=8")]:
    await fight(pg,setup)
    # select two dice so the slip shows a live sum
    await pg.evaluate("tray().slice(0,2).forEach(o=>toggleSel(o)); 0"); await pg.wait_for_timeout(500)
    pr=await pg.evaluate(AUD)
    if pr or SHOT: await pg.screenshot(path=f'A_{name}_{tag}.png')
    if pr: rep.append(f"{tag:8} "+' | '.join(sorted(set(pr))[:6]))
  BAD.append(bool(rep) or bool(errs)); print(f"== {name} {w}x{h}: {'OK' if not rep else str(len(rep))+' screens with problems'}"+('\n  '+'\n  '.join(rep) if rep else '')+(f"\n  errors: {errs[:3]}" if errs else ''),flush=True)
  await b.close()
async def main():
  async with async_playwright() as p:
    for n in names: await run(p,n)
BAD=[]
asyncio.run(main())
sys.exit(1 if any(BAD) else 0)
