# Save/reload: start a fight, finish a round, reload the page mid-fight, hit Continue,
# and check you're back in the same fight with the same nerve on both sides (no dodging a fight by reloading).
#   python3 tests/e2e/save_reload.py
import asyncio, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from harness import *
async def turn(pg):
    for _ in range(400):
        await pg.wait_for_timeout(300)
        if await pg.query_selector('#bank') and not await pg.evaluate('busy'): return True
    return False
async def main():
    async with async_playwright() as p:
        b, pg, errs = await open_game(p, 1280, 800)
        await pg.click('#go'); await pg.wait_for_timeout(400)
        await pg.evaluate("SET.tips=false; SET.auto=false; SET.deal='full'; SET.speed=2.4; 0")
        await pg.click('#stops .entry'); await pg.wait_for_timeout(150); await pg.evaluate("(()=>{ const e=document.querySelector('#stops .entry.sel'); if(e) e.click(); })()"); assert await turn(pg), 'never reached your turn'
        # keep both sides alive so the round always ends on 'Next round', the checkpoint this test reloads from
        await pg.evaluate("F.oppHp=9999; G.hp=9999; tray().forEach(o=>toggleSel(o)); document.querySelector('#bank').click(); 0")
        await pg.wait_for_selector('#again', timeout=120000)
        saved = await pg.evaluate("(JSON.parse(localStorage.getItem('lr-save')||'{}')).at")
        before = await pg.evaluate("({hp:G.hp, ohp:F.oppHp, n:F.opp.n})")
        await pg.reload(); await pg.wait_for_timeout(2500)
        await pg.evaluate("SET.tips=false; 0"); await pg.click('#cont0'); r=await turn(pg)
        if not r: await pg.screenshot(path='sr_fail.png'); print('DEBUG', errs, await pg.evaluate("[!!F, F&&F.round, typeof busy!=='undefined'&&busy, document.querySelector('#ui').className, (document.querySelector('.msg')||{}).textContent]"))
        assert r, 'resume never reached your turn'
        after = await pg.evaluate("({hp:G.hp, ohp:F.oppHp, n:F.opp.n})")
        ok = saved == 'fight' and before == after and not errs
        print('save at:', saved); print('before:', before); print('after: ', after); print('errors:', errs)
        print('PASS' if ok else 'FAIL'); await b.close()
        sys.exit(0 if ok else 1)
asyncio.run(main())
